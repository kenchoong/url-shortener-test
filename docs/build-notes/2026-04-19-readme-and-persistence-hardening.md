# 2026-04-19 README And Persistence Hardening

## Date

2026-04-19

## What was built

- Added periodic persistence flushes so in-memory URL data is written back to disk every `PERSIST_INTERVAL` seconds
- Kept the graceful shutdown flush and documented the storage lifecycle more clearly across the repo docs
- Expanded the e2e suite to cover invalid URL input, missing-key `404` responses, interceptor logging, periodic persistence, and shutdown persistence
- Rewrote `README.md` as an interviewer-facing guide covering Docker startup, Swagger/OpenAPI usage, development commands, API behavior, storage, tests, Docker Compose details, and the LLM-assisted workflow

## API routes or modules added or changed

- No route paths changed
- Documented the `400` validation response for `POST /shorten_url`
- Regenerated `docs/api/openapi.json` and `docs/api/openapi.yaml`

## Data or storage changes

- Storage still uses the same `data/store.json` schema
- Added periodic flush behavior on top of startup load and shutdown flush
- Added `PERSIST_INTERVAL=10` to the Docker/runtime example configuration

## Verification commands run

```bash
npm run build
npm run test:e2e
npm run generate:api
docker-compose config
```

## Remaining gaps or next likely steps

- Add URL reachability validation if strict PRD compliance is required
- Improve corrupted JSON handling so bad storage data is preserved or quarantined instead of being replaced with an empty store
- Add a fuller observability stack beyond console logging if this moves closer to production use
