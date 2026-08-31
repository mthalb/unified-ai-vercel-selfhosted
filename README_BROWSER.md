# In‑browser (WASM/WebGPU) model integration — README_BROWSER.md

This document explains how to run a quantized 2.7B model in the browser so your website can provide AI features at no server cost.

Important limitations
- A 2.7B quantized model is large (often 100s of MB) and must be downloaded by the user once; expect slow first load on mobile or slow networks.
- Not all browsers/devices can run such models. Desktop Chrome/Edge on modern machines is best.
- The repo includes a small UI at /local that expects a client runtime script at /web/llama.js and a hosted model URL.

Overview of steps
1) Choose a runtime (WASM/WebGPU) and get the runtime script
2) Obtain a quantized 2.7B model (GGUF/GGML) and host it publicly (Hugging Face, GitHub, or CDN)
3) Place the runtime script in your Next.js public/web folder (or host it on a CDN)
4) Configure MODEL_URL in the /local page field and click "Load model" → then run inference

Recommended runtimes
- llama.cpp web builds (ggml/wasm): https://github.com/ggerganov/llama.cpp/tree/master/web
- ggml.js / community web runtimes: search for "llama web" or "ggml web" projects
- gpt4all-web and other community web UIs that expose a browser runtime

What the frontend expects
- A global object window.LocalModelRuntime with two async functions:
  - loadModel(modelUrl, onProgress) — downloads & initializes the model (call onProgress with 0..1)
  - infer(prompt, options) — runs inference and returns the text output

You can adapt any runtime to expose this tiny API as a shim. Example shim (pseudo):

  // in public/web/llama.js
  window.LocalModelRuntime = {
    async loadModel(url, onProgress) {
      // runtime-specific model loading
      await Runtime.load(url, { onProgress });
    },
    async infer(prompt, opts) {
      return await Runtime.generate(prompt, opts);
    }
  }

How to host model binaries
- Hugging Face: create a public repo and upload the quantized GGUF/GGML file, then use the raw file URL (note: large files may need git-lfs or HF model storage support).
- Static CDN: upload the binary to a performant static host / S3 bucket + CDN and paste the URL into the UI.

Where to get a quantized 2.7B model
- Search Hugging Face for 2.7B models that provide GGUF/GGML/GPTQ checkpoints. Example search terms: "2.7B gguf" or the model name plus "gguf".
- If you only have transformer weights, you may need to convert and quantize them to GGUF/GGML using community tools — conversion is non-trivial.

Fallbacks and hybrid design
- Many users/devices will not be able to run a 2.7B model locally. The app includes server-side inference proxy routes (/api/infer/*) which you can enable to handle heavy jobs or low-capability devices.
- Implement device capability detection and offer "Run locally" (fast, private) or "Run on server" (higher quality) options to users.

Security and licensing
- Respect model licenses. Some model weights are commercial/restricted and must not be redistributed publicly.
- Hosting models publicly on HF makes them downloadable by anyone — ensure you have the right to host the chosen weights.

Troubleshooting
- If the runtime fails to load, check browser console for CORS or MIME type issues when serving the runtime script or model files.
- If inference fails, try a smaller model (1.3B) to confirm the runtime works before scaling up to 2.7B.

If you'd like, I can:
- Add a small example shim for a specific runtime (e.g., llama.cpp web) if you tell me which runtime you plan to use, or
- Provide step-by-step commands to convert and upload a particular HF 2.7B model into GGUF and host it on Hugging Face so the browser UI can load it.
