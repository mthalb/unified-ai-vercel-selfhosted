## What I changed / added

I implemented the three steps you requested:

1) Wire model inference endpoints (API proxy routes):
   - pages/api/infer/chat.js — builds a token-budgeted prompt from an active chat and proxies to LONG_CONTEXT_HOST
   - pages/api/infer/code.js — similar proxy for your code model (CODE_MODEL_HOST), allows larger responses
   - pages/api/infer/image.js — proxies image generation calls to IMAGE_MODEL_HOST

2) Tokenizer integration:
   - lib/tokenizer.js — attempts to use the `tiktoken` package for accurate token counting, falls back to a naive estimate if tiktoken isn't installed.
   - package.json updated to include `tiktoken` dependency.

3) Simple frontend UI:
   - pages/index.js — minimal Next.js UI with tabs for Chat / Code / Image that calls the API routes and demonstrates the 5-chat cap behavior.

## Next steps for you (what to run locally)

1) Start local infra for testing:
   - `docker-compose up -d` (this brings up Redis and MinIO for local testing)

2) Install dependencies and run the Next.js dev server:
   - `npm install`
   - `npm run dev`
   - Open http://localhost:3000

3) Configure env vars (create a `.env` from `.env.example`):
   - REDIS_URL (default `redis://127.0.0.1:6379`)
   - MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
   - MAX_CHATS (default 5)
   - INTERNAL_API_TOKEN (shared secret for Vercel -> backend proxy)
   - LONG_CONTEXT_HOST, CODE_MODEL_HOST, IMAGE_MODEL_HOST (set later to your GPU model endpoints)
   - MODEL_TOTAL_WINDOW, RESERVED_FOR_RESPONSE, RESERVED_FOR_SYS (tune for your model)

4) Test the 5-chat eviction locally using the UI or curl (see README in repo).

## Next actions I can take for you (pick order)

A) Deploy / wire actual model backends:
   - I can add example vLLM / TGI Docker Compose pieces (comments included) and a how-to to deploy them on a GPU VM.
   - Or I can write a deployment guide for a recommended cloud provider (Lambda Labs / Vast.ai / CoreWeave / AWS) including exact instance types and commands.

B) Replace naive token counting with server-side tiktoken usage (I already added the package, but you must `npm install` and ensure the environment supports it). If you'd like, I can also add a small Python microservice that uses tiktoken (if Node-native tiktoken causes issues).

C) Improve the UI design and add stateful session handling, streaming responses, and user opt-in authentication.

Tell me which of A/B/C to do next, or if you want me to proceed to all three in sequence. I'm ready to push more changes into the repo and to provide step-by-step deploy instructions for your GPU backend once you tell me which cloud/provider you'd like to use.