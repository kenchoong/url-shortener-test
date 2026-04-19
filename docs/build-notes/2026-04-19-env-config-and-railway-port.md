# 2026-04-19 Env Config And Railway Port

## Date

2026-04-19

## What was built

- Added Nest `ConfigModule` so `.env` values are loaded into runtime configuration during normal app startup
- Wired application port binding to configured `PORT`, with a fallback to `3001`
- Wired storage persistence interval and data file path to config-backed `PERSIST_INTERVAL` and `DATA_FILE_PATH`
- Bound the HTTP listener to `0.0.0.0` so container and platform deployments can accept forwarded traffic correctly
- Documented the difference between local port access and Railway's public-domain proxy model

## API routes or modules added or changed

- No API route changes
- No OpenAPI regeneration was required

## Data or storage changes

- No storage schema changes
- Periodic flush timing now reliably follows `.env` in normal local runs instead of depending on the shell environment alone

## Verification commands run

```bash
npm run build
npm run test:e2e
```

## Remaining gaps or next likely steps

- Add URL reachability validation from the PRD
- Add more defensive handling for corrupted JSON persistence files
- Expand observability around persistence failures and startup configuration
