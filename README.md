# News RAG Chat Backend

A TypeScript/Node.js backend that powers a retrieval‑augmented chat experience over news content. It ingests news articles, chunks and embeds them with Jina embeddings, indexes vectors in Qdrant, and answers queries using Google's Gemini models. Sessions and chat history are stored in Redis.

### Features
- Express 5 API with CORS, JSON, and logging
- Chat sessions with history persisted in Redis
- RAG query flow: Jina embeddings → Qdrant similarity search → Gemini generation
- Ingestion pipeline: fetch news feeds, extract article text (Python helper), chunk, embed, upsert to Qdrant

## Getting Started

### Prerequisites
- Node.js 18+
- Redis (local or hosted)
- Qdrant (local docker or cloud)
- Python 3 (for the ingestion article extractor)

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file in the project root with:

```
# Server
PORT=5000
CLIENT_URL=http://localhost:3000

# Redis
REDIS_URL=redis://localhost:6379

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=           # if using Qdrant Cloud
QDRANT_COLLECTION=news_chunks

# Jina Embeddings
JINA_API_URL=https://api.jina.ai/v1/embeddings
JINA_API_KEY=
JINA_MODEL=jina-embeddings-v3

# Gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# Ingestion
RSS_FEEDS=https://www.reuters.com/arc/outboundfeeds/sitemap-index/?outputType=xml
INGEST_MAX_ARTICLES=50
EMBED_BATCH_SIZE=32
```

Notes:
- `CLIENT_URL` controls which origin can call the API.
- Qdrant API key is optional for local deployments.
- Gemini key is required for answering queries.

### Scripts
```bash
# Start in dev with live reload	npm run dev
# Build TypeScript to dist		npm run build
# Start compiled server			npm start
# Run ingestion pipeline		npm run ingest
# Lint code				npm run lint
```

## Run the API
1. Ensure Redis and Qdrant are running and reachable via your `.env`.
2. Start the server:
```bash
npm run dev
```
The API will be available at `http://localhost:5000/api` (unless `PORT` differs).

## API Endpoints
Base path: `/api`

- POST `/chat/session` — Create a new chat session
  - Response: `{ sessionId: string }`

- POST `/chat/query` — Ask a question within a session
  - Body: `{ sessionId: string, query: string }`
  - Response: `{ sessionId: string, response: string }`

- GET `/chat/:sessionId/history` — Get chat history for a session
  - Response: `{ sessionId: string, history: ChatMessage[] }`

- POST `/chat/:sessionId/reset` — Clear a session's history
  - Response: `{ sessionId: string, reset: true }`

`ChatMessage` shape:
```ts
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO date string
}
```

## RAG Query Flow
1. Save user message in Redis (`SessionService`).
2. Embed query with Jina (`embedTexts`, task `retrieval.query`).
3. Search similar chunks in Qdrant (`QdrantRepository.search`).
4. Build prompt with top passages (`buildPrompt`).
5. Generate answer with Gemini (`callGeminiNonStreaming`).
6. Save assistant reply in Redis and return.

## Ingestion Pipeline
Command: `npm run ingest` → runs `src/ingestion/runIngestion.ts`

Steps (`IngestionService`):
- Read feeds from `RSS_FEEDS` (CSV) and discover article URLs (`fetchFeedUrls`).
- For each URL, extract article content using Python helper `news_ingest.py` (`fetchArticle`).
- Chunk text (`chunkArticleText`, default ~500 chars with overlap).
- Embed chunks in batches with Jina (`embedTexts`, task `retrieval.passage`).
- Ensure Qdrant collection exists and upsert points (`ensureCollection`, `upsertPoints`).

Requirements:
- Python 3 available as `python3` on PATH (used by `news_ingest.py`).

## Local Qdrant and Redis via Docker (optional)
```bash
# Qdrant
docker run -p 6333:6333 -p 6334:6334 -v qdrant_storage:/qdrant/storage qdrant/qdrant
# Redis
docker run -p 6379:6379 redis:7-alpine
```

## Project Structure
```
src/
  app.ts              # Express app setup
  server.ts           # Entrypoint
  routes/             # API routes
  controllers/        # Chat handlers
  services/           # session, prompt, genAI, ingestion
  repositories/       # Qdrant and Redis access
  ingestion/          # fetch, chunk, embed, run script, python helper
  config/redis.ts     # Redis client
  utils/              # logger, appError
  types/              # Type definitions
```

## Tech Stack
- Express 5, TypeScript, ts-node
- Redis (session storage)
- Qdrant (vector DB)
- Jina Embeddings
- Google Gemini
- Axios, Cheerio, xml2js, Winston, Morgan

## Troubleshooting
- 502 from `/chat/query`: verify `GEMINI_API_KEY` and network egress.
- Empty search results: ensure ingestion ran and Qdrant has points; check `QDRANT_URL`.
- Redis errors: confirm `REDIS_URL` and connectivity.
- Python not found: install Python 3 and ensure `python3` is on PATH.

## License
MIT

