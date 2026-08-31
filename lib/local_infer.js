// lib/local_infer.js
// Lightweight client helpers for local (browser) inference. These functions expect a
// runtime to be available on window.LocalModelRuntime with the following async API:
//   - loadModel(url, onProgress) -> loads model into browser context
//   - infer(prompt, options) -> returns string output
// The repo does not ship a runtime binary. See README_BROWSER.md for popular runtimes
// (llama.cpp web builds / ggml.js / gpt4all web) and how to host them at /web/llama.js

export function hasWebAssembly() {
  return typeof WebAssembly === 'object';
}

export function hasWebGPU() {
  return !!(navigator && (navigator.gpu || window.navigator && window.navigator.gpu));
}

export async function tryLoadRuntimeScript(path = '/web/llama.js') {
  if (window._local_runtime_loaded) return true;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = path;
    s.onload = () => { window._local_runtime_loaded = true; resolve(true); };
    s.onerror = (e) => reject(new Error('Failed to load runtime script: ' + path));
    document.head.appendChild(s);
  });
}

export async function loadModel(modelUrl, onProgress = null) {
  if (!window.LocalModelRuntime || typeof window.LocalModelRuntime.loadModel !== 'function') {
    throw new Error('LocalModelRuntime not available. Include a WASM runtime per README_BROWSER.md');
  }
  return await window.LocalModelRuntime.loadModel(modelUrl, onProgress);
}

export async function infer(prompt, options = {}) {
  if (!window.LocalModelRuntime || typeof window.LocalModelRuntime.infer !== 'function') {
    throw new Error('LocalModelRuntime not available.');
  }
  return await window.LocalModelRuntime.infer(prompt, options);
}
