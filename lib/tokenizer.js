// lib/tokenizer.js
// Tries to use tiktoken for accurate token counts, falls back to a naive estimate.

let usingTiktoken = false;
let enc = null;

try {
  // tiktoken has different exports depending on version; try common helpers
  // eslint-disable-next-line no-undef, no-unused-vars
  const tk = require('tiktoken');
  if (tk && typeof tk.encoding_for_model === 'function') {
    enc = tk.encoding_for_model('gpt-4o') || tk.get_encoding('cl100k_base');
  } else if (tk && typeof tk.get_encoding === 'function') {
    enc = tk.get_encoding('cl100k_base');
  }
  if (enc) usingTiktoken = true;
} catch (err) {
  // tiktoken not available; we'll use naive counting
  // console.warn('tiktoken not available, falling back to approximate token counts');
}

export function countTokens(text) {
  if (!text) return 0;
  if (usingTiktoken && enc) {
    try {
      const toks = enc.encode(text);
      return toks.length;
    } catch (e) {
      // fallback to naive
    }
  }
  // naive approx: 1 token per 4 characters
  return Math.ceil(text.length / 4);
}
