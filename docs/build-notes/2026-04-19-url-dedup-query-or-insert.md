# 2026-04-19 URL Dedup Query Or Insert

## Date

2026-04-19

## What was built

- Changed `POST /shorten_url` to query-or-insert behavior so repeated submissions of the same original URL return the existing short key instead of creating a duplicate record
- Added in-memory URL indexing to enforce one short key per original URL during runtime
- Hardened startup loading so duplicate URLs already present in `data/store.json` are collapsed into one canonical record before the next persistence flush
- Preserved duplicate-load data by keeping the earliest `createdAt` and summing `visits` when duplicate persisted URLs are merged
- Updated README, implementation status, product context, API docs guidance, and the overall flow diagram to reflect the new semantics

## API routes or modules added or changed

- Updated `POST /shorten_url` behavior:
  returns `201 Created` for a new mapping
  returns `200 OK` when the submitted URL already exists and its existing mapping is returned
- Regenerated `docs/api/openapi.json` and `docs/api/openapi.yaml` so the checked-in OpenAPI artifacts include both `200` and `201` responses for the create route

## Data or storage changes

- Added a URL-to-key index in the storage service alongside the existing key-to-record map
- Prevented duplicate original URLs from being inserted under different keys
- Collapsed duplicate persisted URLs on startup into a single stored record
- Updated the checked-in sample `data/store.json` to a deduplicated state

## Verification commands run

```bash
npm run build
npm run test:e2e
npm run generate:api
```

## Remaining gaps or next likely steps

- Reachability validation from the PRD is still not implemented
- Corrupted JSON recovery still resets to an empty store instead of attempting structured repair
- The checked-in OpenAPI generation path still boots the full Nest app, which means sample persistence files should stay valid before generating artifacts
