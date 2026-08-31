// pages/api/infer/image.js
const IMAGE_HOST = process.env.IMAGE_MODEL_HOST;
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const payload = req.body;

    if (!IMAGE_HOST) return res.status(500).json({ error: 'IMAGE_MODEL_HOST not configured' });

    const r = await fetch(IMAGE_HOST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(INTERNAL_TOKEN ? { 'x-internal-key': INTERNAL_TOKEN } : {})
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) return res.status(r.status).send(await r.text());
    const j = await r.json();
    return res.status(200).json(j);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
