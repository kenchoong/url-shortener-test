# URL Shortener Backend

This repo is a small NestJS URL shortener service built for interview discussion and technical review. It focuses on a clean backend shape: short URL creation, redirect handling, in-memory storage, JSON persistence, Swagger/OpenAPI docs, Docker support, and test coverage around the important behaviors.

## Quick Start With Docker

If you want the fastest way to run it:

```bash
docker-compose up
```

That starts the app on:

- API base URL: `http://localhost:3352`
- Swagger UI: `http://localhost:3352/api-docs`

If you prefer Postman, use the checked-in OpenAPI files:

- `docs/api/openapi.json`
- `docs/api/openapi.yaml`

You can import either one into Postman to inspect the endpoints and example schemas.

## Development

If you want to run it locally without Docker:

```bash
npm install
cp .env.example .env
npm run dev
```

Useful commands:

```bash
npm run build
npm run start:prod
npm run generate:api
npm run test:e2e
```

Notes:

- `.env.example` uses port `3352`, so local development matches the Docker host port.
- The app now loads `.env` automatically through Nest config, so `PORT`, `PERSIST_INTERVAL`, and `DATA_FILE_PATH` affect both `npm run dev` and `npm run start:prod`.
- If you skip `.env`, the Nest app defaults to port `3001`.
- `npm run generate:api` refreshes the checked-in OpenAPI artifacts in `docs/api/`.

## API Overview

### `POST /shorten_url`

Creates a short URL entry if the submitted URL is new, or returns the existing entry if that URL was already shortened before.

Request body:

```json
{
  "url": "https://example.com/articles/123"
}
```

Example response:

```json
{
  "key": "abc123",
  "short_url": "http://localhost:3352/shorten_url/abc123"
}
```

The `short_url` is ready to use directly.
If the URL already exists in storage, the service returns the same `key` and `short_url` instead of creating a second record.

Status codes:

- `201 Created`: a new mapping was inserted
- `200 OK`: the URL already existed and the existing mapping was returned

### `GET /shorten_url/:key`

Looks up the short key and redirects to the original URL with `302 Found`.

If the key does not exist, the service returns `404`.

Example:

1. Create a short URL:

```bash
curl -X POST http://localhost:3352/shorten_url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/articles/123"}'
```

2. Open the returned short URL in your browser, or request it directly:

```bash
curl -i http://localhost:3352/shorten_url/abc123
```

Expected behavior:

- valid key: `302` redirect to the original URL
- missing key: `404`
- invalid create payload: `400`

## Storage Mechanism

The service keeps URL records in an in-memory `Map` for fast lookup during runtime.
It also maintains a URL-to-key index so each original URL maps to exactly one short key.

Persistence works in three steps:

1. On application startup, it loads `data/store.json` into memory.
2. While the app is running, it flushes memory back to the JSON file every `PERSIST_INTERVAL` seconds. The default is `10`.
3. On graceful shutdown, it writes one final snapshot to disk.

If `data/store.json` already contains duplicate entries for the same original URL, startup loading collapses them into one canonical key before the next flush. The kept record preserves the earliest `createdAt` and combines visit counts from duplicates.

`PERSIST_INTERVAL` is read from `.env` for normal local runs and from injected environment variables in container or platform deployments.

Current JSON shape:

```json
{
  "urls": {
    "abc123": {
      "url": "https://example.com/articles/123",
      "createdAt": "2026-04-19T07:00:00.000Z",
      "visits": 2
    }
  }
}
```

## Logging

There is a global logging interceptor in `src/common/interceptors/logging.interceptor.ts`.

It logs:

- request method
- request path
- response status code
- response payload for successful requests
- error message for failed requests

For a real production system, this matters because it gives you a first place to look when troubleshooting behavior in the API.

## Tests

The e2e suite covers the main product behaviors from the current implementation:

- create short URL successfully
- return the existing key for a repeated URL instead of inserting a duplicate
- reject invalid URL input with `400`
- redirect valid short key with `302`
- return `404` for a missing key
- build `short_url` correctly behind forwarded headers
- log successful and failed requests through the interceptor
- flush records to disk periodically
- collapse duplicate persisted URLs into one stored key
- flush records to disk on shutdown

Run it with:

```bash
npm run test:e2e
```

## Docker Compose Notes

`docker-compose.yml` is configured so that:

- host port `3352` maps to container port `3000`
- the Nest app listens on port `3000` inside the container
- `./data` is mounted into `/app/data`
- the persisted file is `/app/data/store.json` inside the container, which means it ends up in the repo's local `data/` folder on the host machine

## Railway Port Behavior

Railway and local Docker expose ports differently:

- Local development: if `.env` sets `PORT=3352`, the app listens on `http://localhost:3352`
- Docker Compose: the container still listens on `3000`, but Docker maps host `3352` to container `3000`
- Railway: the platform injects its own `PORT` value for the container to listen on internally, but the public app URL is still the generated Railway domain, not `:<PORT>` on that domain

That means two separate things need to be true on Railway:

1. The Nest app must listen on `process.env.PORT`
2. You must open the Railway-provided public domain, usually without appending the internal container port

If Railway injects `PORT=3352`, that does not mean `https://your-service.up.railway.app:3352` becomes reachable. It means the container should bind to port `3352` internally so Railway's proxy can forward traffic to it.

## Documentation Options

You can review the API in two ways:

1. Live Swagger UI at `http://localhost:3352/api-docs`
2. Static OpenAPI files in `docs/api/`, which can be imported into Postman

Related project docs:

- `docs/product-context.md`
- `docs/implementation-status.md`
- `docs/build-notes/`
- `diagrams/`

## LLM-Assisted Development Workflow

This repo was developed with an LLM-assisted workflow, currently using Codex. The process is intentionally documented so the interviewer can see how the work was managed, not just the final code.

Main workflow pieces:

- `AGENTS.md`
  Explains repo-level rules for AI contributors and points them to the required docs.
- `.codex/skills/build-journal/SKILL.md`
  Enforces a read -> build -> document workflow before and after implementation.
- `docs/product-context.md`
  Acts as the current product/requirements reference.
- `docs/implementation-status.md`
  Summarizes what is actually implemented right now.
- `docs/build-notes/`
  Records each meaningful implementation step and verification result.
- `docs/api/`
  Keeps the generated API artifacts checked into the repo.
- `diagrams/`
  Keeps the backend flow visible in a quick-to-review format.

Why this matters in practice:

- it reduces context loss between coding sessions
- it keeps requirements, implementation, and docs closer together
- it makes it easier for one engineer to cover both execution and product clarification work
- it lowers the cost of onboarding, review, and handoff
- the workflow is not specific to Codex; the same structure can be reused with other LLM tools

In other words, one engineer can work more like an engineer plus lightweight product owner, because the planning, implementation trail, and project memory are kept explicit instead of living only in chat history or personal notes.
