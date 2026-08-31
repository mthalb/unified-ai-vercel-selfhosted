// pages/api/infer/code.js
import redis from '../../lib/redis.js';
import { countTokens } from '../../lib/tokenizer.js';

const CODE_HOST = process.env.CODE_MODEL_HOST;
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN;
const CODE_MAX_RESPONSE = parseInt(process.env.CODE_MAX_RESPONSE || '32768', 10);
const MODEL_TOTAL_WINDOW = parseInt(process.env.MODEL_TOTAL_WINDOW || '262144', 10);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { chatId, prompt } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';

    // Build payload for code model. For code we may allow a larger response but still respect window.
    const reservedForSys = parseInt(process.env.RESERVED_FOR_SYS || '2048', 10);
    const available = MODEL_TOTAL_WINDOW - CODE_MAX_RESPONSE - reservedForSys;

    let contextParts = [];
    let tokensUsed = 0;

    // If chatId provided, include recent messages as context (newest-first until budget)
    if (chatId) {
      const val = await redis.get(`chat:${chatId}`);
      if (val) {
        const chat = JSON.parse(val);
        for (let i = chat.messages.length - 1; i >= 0; i--) {
          const m = chat.messages[i];
          const txt = `${m.role}: ${m.content}`;
          const t = countTokens(txt);
          if (tokensUsed + t > available) break;
          contextParts.push(txt);
          tokensUsed += t;
        }
      }
    }

    // include user prompt last
    const promptTok = countTokens(prompt || '');
    if (tokensUsed + promptTok > available) {
      // truncate prompt from the front if too large
      const allowed = Math.max(0, available - tokensUsed);
      const approxChars = allowed * 4;
      // keep tail of prompt (likely the most relevant)
      const truncated = (prompt || '').slice(-approxChars);
      contextParts.unshift(truncated);
    } else {
      contextParts.unshift(prompt);
    }

    // assemble final prompt
    const finalPrompt = contextParts.reverse().join('\n\n');

    const payload = { prompt: finalPrompt, max_new_tokens: CODE_MAX_RESPONSE };

    if (!CODE_HOST) return res.status(500).json({ error: 'CODE_MODEL_HOST not configured' });

    const r = await fetch(CODE_HOST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(INTERNAL_TOKEN ? { 'x-internal-key': INTERNAL_TOKEN } : {})
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) return res.status(r.status).send(await r.text());
    const j = await r.json();

    // Optionally append assistant response to chat
    if (chatId && j.text) {
      try {
        const val = await redis.get(`chat:${chatId}`);
        if (val) {
          const chat = JSON.parse(val);
          chat.messages.push({ role: 'assistant', content: j.text, ts: Date.now() });
          chat.tokenEstimate = (chat.tokenEstimate || 0) + countTokens(j.text);
          await redis.set(`chat:${chatId}`, JSON.stringify(chat));
        }
      } catch (e) {
        console.error('failed to append code assistant message', e);
      }
    }

    return res.status(200).json(j);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
