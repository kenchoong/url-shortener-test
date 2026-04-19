# 2026-04-19 Production Entrypoint Fix

## Date

2026-04-19

## What was built

- Fixed the production runtime entrypoint to match the actual Nest build output path
- Updated the Docker runtime command to execute `dist/src/main.js`
- Updated `npm run start:prod` to execute `dist/src/main.js`

## API routes or modules added or changed

- No API routes changed
- No Nest modules changed

## Data or storage changes

- No storage changes

## Verification commands run

```bash
npm run build
npm run start:prod
```

## Remaining gaps or next likely steps

- Rebuild the image before rerunning Compose so the fixed Dockerfile is used
- Add periodic persistence flushes from the PRD instead of shutdown-only writes
