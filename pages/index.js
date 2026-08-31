diff --git a/pages/index.js b/pages/index.js
index 9f5f0d9..b1c5f3a 100644
--- a/pages/index.js
+++ b/pages/index.js
@@
   return (
     <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
       <h1>Unified AI — Chat / Code / Image</h1>
       <div style={{ marginBottom: 12 }}>
         <button onClick={() => setTab('chat')}>Chat</button>
         <button onClick={() => setTab('code')}>Code</button>
         <button onClick={() => setTab('image')}>Image</button>
+        <button onClick={() => window.location.href = '/local'}>Local model (browser)</button>
       </div>
