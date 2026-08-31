import { useState } from 'react';

export default function Local() {
  // Prefill model URL from NEXT_PUBLIC_MODEL_URL if provided (set in Vercel or .env)
  const defaultModelUrl = process.env.NEXT_PUBLIC_MODEL_URL || '';
  const [modelUrl, setModelUrl] = useState(defaultModelUrl);
  const [status, setStatus] = useState('idle');
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');

  async function tryLoadRuntime() {
    setStatus('loading-runtime');
    // Try to load a runtime script at /web/llama.js (you must place it there or set up your own)
    if (!window._local_runtime_loaded) {
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = '/web/llama.js';
          s.onload = () => { window._local_runtime_loaded = true; resolve(); };
          s.onerror = (e) => reject(new Error('Failed to load runtime /web/llama.js'));
          document.head.appendChild(s);
        });
      } catch (err) {
        setStatus('runtime-missing');
        console.error(err);
        return false;
      }
    }
    setStatus('runtime-loaded');
    return true;
  }

  async function loadModel() {
    setStatus('checking');
    if (!modelUrl) {
      setStatus('no-url');
      return;
    }
    const ok = await tryLoadRuntime();
    if (!ok) return;

    if (!window.LocalModelRuntime || typeof window.LocalModelRuntime.loadModel !== 'function') {
      setStatus('runtime-api-missing');
      return;
    }

    try {
      setStatus('downloading');
      await window.LocalModelRuntime.loadModel(modelUrl, (progress) => {
        setStatus(`downloading ${Math.round(progress * 100)}%`);
      });
      setStatus('model-loaded');
    } catch (err) {
      console.error(err);
      setStatus('load-failed');
    }
  }

  async function run() {
    if (!window.LocalModelRuntime || typeof window.LocalModelRuntime.infer !== 'function') {
      setOutput('Local runtime not available.');
      return;
    }
    setOutput('Running...');
    try {
      const out = await window.LocalModelRuntime.infer(prompt, { max_tokens: 512 });
      setOutput(out);
    } catch (err) {
      console.error(err);
      setOutput('Inference failed: ' + err.message);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Local (in-browser) Model — 2.7B target</h1>
      <p>This page runs a quantized 2.7B model in the browser using a WebAssembly/WebGPU runtime. You must host a small runtime script at <code>/web/llama.js</code> (see README_BROWSER.md) and provide a public URL for the quantized model binary.</p>

      <div style={{ marginBottom: 12 }}>
        <label>Model URL (GGUF/GGML hosted on a CDN or Hugging Face):</label>
        <input style={{ width: '100%' }} value={modelUrl} onChange={e => setModelUrl(e.target.value)} placeholder="https://.../model.gguf" />
        <div style={{ marginTop: 8 }}>
          <button onClick={loadModel}>Load model into browser</button>
        </div>
        {defaultModelUrl && (
          <div style={{ marginTop: 8, color: '#444' }}>
            Using default model URL from configuration. To override, paste a different URL above.
          </div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>Status:</strong> {status}
      </div>

      <div>
        <textarea rows={6} style={{ width: '100%' }} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Enter prompt to run locally" />
        <div style={{ marginTop: 8 }}>
          <button onClick={run}>Run local inference</button>
        </div>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f6f6', padding: 12, marginTop: 12 }}>{output}</pre>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Notes</h3>
        <ul>
          <li>Model binaries are large — expect tens to hundreds of MB to download for a 2.7B quantized model.</li>
          <li>Not all browsers / devices are capable — desktop Chrome/Edge with sufficient memory works best.</li>
          <li>See README_BROWSER.md for detailed steps to prepare model binaries and the runtime.</li>
        </ul>
      </div>
    </div>
  );
}
