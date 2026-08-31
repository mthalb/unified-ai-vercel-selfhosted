// pages/api/infer/chat.js
import redis from '../../lib/redis.js';
import { countTokens } from '../../lib/tokenizer.js';

const LONG_HOST = process.env.LONG_CONTEXT_HOST;
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN;
const MODEL_TOTAL_WINDOW = parseInt(process.env.MODEL_TOTAL_WINDOW || '262144', 10);
const RESERVED_FOR_RESPONSE = parseInt(process.env.RESERVED_FOR_RESPONSE || '32768', 10);
const RESERVED_FOR_SYS = parseInt(process.env.RESERVED_FOR_SYS || '2048', 10);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { chatId, userInput, extraContext } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';

    // Load chat messages (hot) or archived fallback handled in other route
    let chat = null;
    if (chatId) {
      const val = await redis.get(`chat:${chatId}`);
      if (val) chat = JSON.parse(val);
    }

    // Build prompt pieces: system, messages (newest-first), extraContext, userInput
    const systemPrompt = process.env.SYSTEM_PROMPT || 'You are a helpful assistant.';

    const availableForHistory = MODEL_TOTAL_WINDOW - RESERVED_FOR_RESPONSE - RESERVED_FOR_SYS;

    // Start counting
    let tokensUsed = countTokens(systemPrompt);
    const pieces = [systemPrompt];

    // include extraContext first if provided (like code/file snippets)
    if (extraContext) {
      const t = countTokens(extraContext);
      if (tokensUsed + t <= availableForHistory) {
        pieces.push(extraContext);
        tokensUsed += t;
      }
    }

    // include chat messages newest-first until budget
    if (chat && Array.isArray(chat.messages)) {
      // iterate from newest to oldest
      for (let i = chat.messages.length - 1; i >= 0; i--) {
        const m = chat.messages[i];
        const txt = `${m.role}: ${m.content}`;
        const t = countTokens(txt);
        if (tokensUsed + t > availableForHistory) break;
        pieces.push(txt);
        tokensUsed += t;
      }
      // reverse pieces added from messages to keep chronological order after system + extraContext
      // We will assemble final prompt below accordingly
    }

    // Add the user input
    const userTok = countTokens(userInput || '');
    if (tokensUsed + userTok > availableForHistory) {
      // if user input alone doesn't fit, truncate it (simple truncation)
      const allowed = Math.max(0, availableForHistory - tokensUsed);
      // crude truncation by characters
      const approxChars = allowed * 4;
      userInput = (userInput || '').slice(-approxChars);
    }

    // assemble final prompt: system, extraContext (if present), messages oldest->newest, user
    // pieces currently: [system, extraContext?, m_newest, m_older, ...]
    const systemAndContext = [pieces[0]];
    if (pieces.length > 1) {
      // find index where messages start: simplest approach: include all after index 0
      for (let i = 1; i < pieces.length; i++) systemAndContext.push(pieces[i]);
    }

    // To maintain chronological order, rebuild messages part from chat.messages with limit
    const messagesToInclude = [];
    if (chat && Array.isArray(chat.messages)) {
      // include from oldest to newest but only those that we allowed earlier
      let acc = countTokens(systemAndContext.join('\n'));
      for (let i = 0; i < chat.messages.length; i++) {
        const m = chat.messages[i];
        const txt = `${m.role}: ${m.content}`;
        const t = countTokens(txt);
        if (acc + t > availableForHistory) break;
        messagesToInclude.push(txt);
        acc += t;
      }
    }

    const finalPrompt = [systemPrompt, ...messagesToInclude, `user: ${userInput}`].join('\n\n');

    const payload = { prompt: finalPrompt, max_new_tokens: RESERVED_FOR_RESPONSE };

    // Proxy request to long-context host
    if (!LONG_HOST) return res.status(500).json({ error: 'LONG_CONTEXT_HOST not configured' });

    const r = await fetch(LONG_HOST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(INTERNAL_TOKEN ? { 'x-internal-key': INTERNAL_TOKEN } : {})
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).send(txt);
    }

    const j = await r.json();
    // append assistant message to chat hot store if chatId present
    if (chatId) {
      try {
        const assistantText = j.text || j.output || JSON.stringify(j);
        if (chat) {
          chat.messages.push({ role: 'assistant', content: assistantText, ts: Date.now() });
          chat.tokenEstimate = (chat.tokenEstimate || 0) + countTokens(assistantText);
          await redis.set(`chat:${chatId}`, JSON.stringify(chat));
        }
      } catch (e) {
        console.error('failed to append assistant message', e);
      }
    }

    return res.status(200).json(j);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
