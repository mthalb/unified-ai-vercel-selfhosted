// pages/index.js
import { useState, useEffect } from 'react';

export default function Home() {
  const [tab, setTab] = useState('chat');
  const [chatId, setChatId] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatOutput, setChatOutput] = useState('');
  const [chats, setChats] = useState([]);

  const [codePrompt, setCodePrompt] = useState('');
  const [codeOutput, setCodeOutput] = useState('');

  const [imgPrompt, setImgPrompt] = useState('');
  const [imgSrc, setImgSrc] = useState(null);

  async function createChat() {
    const r = await fetch('/api/chat/create', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: '{}' });
    const j = await r.json();
    setChatId(j.chatId);
    await loadChats();
  }

  async function loadChats() {
    const r = await fetch('/api/chat/list');
    const j = await r.json();
    setChats(j.chats || []);
    if (!chatId && j.chats && j.chats.length) setChatId(j.chats[0].id);
  }

  useEffect(() => { loadChats(); }, []);

  async function sendChat() {
    setChatOutput('Thinking...');
    const r = await fetch('/api/infer/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ chatId, userInput: chatInput })
    });
    const j = await r.json();
    setChatOutput(j.text || JSON.stringify(j));
    await loadChats();
  }

  async function sendCode() {
    setCodeOutput('Generating...');
    const r = await fetch('/api/infer/code', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ prompt: codePrompt, chatId }) });
    const j = await r.json();
    setCodeOutput(j.text || JSON.stringify(j));
  }

  async function genImage() {
    setImgSrc(null);
    const r = await fetch('/api/infer/image', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ prompt: imgPrompt }) });
    const j = await r.json();
    if (j.image_base64) setImgSrc('data:image/png;base64,' + j.image_base64);
    else if (j.image_url) setImgSrc(j.image_url);
    else setImgSrc(JSON.stringify(j));
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Unified AI — Chat / Code / Image</h1>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setTab('chat')}>Chat</button>
        <button onClick={() => setTab('code')}>Code</button>
        <button onClick={() => setTab('image')}>Image</button>
      </div>

      {tab === 'chat' && (
        <div>
          <h2>Chat</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <button onClick={createChat}>New Chat</button>
              <ul>
                {chats.map(c => (
                  <li key={c.id} style={{ marginTop: 6 }}>
                    <button onClick={() => setChatId(c.id)}>{c.id}{c.archived? ' (archived)':''}</button>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: 3 }}>
              <div>Active chat: {chatId}</div>
              <textarea rows={6} style={{ width: '100%' }} value={chatInput} onChange={e => setChatInput(e.target.value)} />
              <div>
                <button onClick={sendChat}>Send</button>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f6f6', padding: 12 }}>{chatOutput}</pre>
            </div>
          </div>
        </div>
      )}

      {tab === 'code' && (
        <div>
          <h2>Code</h2>
          <textarea rows={8} style={{ width: '100%' }} value={codePrompt} onChange={e => setCodePrompt(e.target.value)} />
          <div>
            <button onClick={sendCode}>Generate</button>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f6f6', padding: 12 }}>{codeOutput}</pre>
        </div>
      )}

      {tab === 'image' && (
        <div>
          <h2>Image</h2>
          <textarea rows={4} style={{ width: '100%' }} value={imgPrompt} onChange={e => setImgPrompt(e.target.value)} />
          <div>
            <button onClick={genImage}>Generate</button>
          </div>
          {imgSrc && <div style={{ marginTop: 12 }}><img src={imgSrc} alt="generated" style={{maxWidth:'100%'}}/></div>}
        </div>
      )}
    </div>
  );
}
