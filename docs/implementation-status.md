# Courtside Backend Implementation Status

Last updated: 2026-04-19

## Overall status

The repo now has a working NestJS URL shortener backend with create and redirect routes, query-or-insert creation semantics, clickable short URL responses, in-memory storage with JSON persistence, `.env`-driven periodic flushes and graceful shutdown writes, Swagger plus checked-in OpenAPI artifacts, interviewer-friendly Docker Compose startup, and e2e coverage for the main happy paths and failure paths.

## Present in the repo

- NestJS application bootstrap with `AppModule` and `main.ts`
- `url` module with `POST /shorten_url` creation and `GET /shorten_url/:key` redirect routes
- `storage` module with in-memory map storage, startup load, `.env`-controlled periodic file flush, and shutdown flush
- global logging interceptor for request/response and error logging
- Nest `ConfigModule` loading `.env` into runtime configuration for local and production starts
- Swagger runtime setup at `/api-docs`
- OpenAPI generation script for `docs/api/openapi.json` and `docs/api/openapi.yaml`
- Jest and Supertest e2e coverage for creation, validation errors, redirects, 404s, forwarded headers, logging, periodic persistence, and shutdown persistence
- TypeScript compiler settings that explicitly load Node and Jest types without catch-all path aliases, using explicit Node/CommonJS module resolution
- Dockerfile, environment example, and initial data store scaffold
- `docker-compose.yml` that builds the existing image, exposes host port `3352` to container port `3000`, and mounts `./data` into the container for persistence
- production startup commands aligned to Nest's emitted `dist/src/main.js` entrypoint for both local prod runs and Docker runtime
- local Codex build-journal skill in `.codex/skills/build-journal/SKILL.md`
- repo instructions in `AGENTS.md`
- project documentation in `docs/` and `diagrams/`

## Implemented routes

- `POST /shorten_url`
  Returns the existing `key` for a previously shortened URL or creates a new one, then includes a fully qualified `short_url` pointing at the redirect route.
- `GET /shorten_url/:key`
  Looks up the key, increments visits, and responds with a `302` redirect to the stored destination URL.

## Current redirect behavior

- The create response builds `short_url` from the incoming request origin
- `x-forwarded-proto` and `x-forwarded-host` are honored so the returned link matches reverse-proxy deployments
- Opening the returned `short_url` hits `GET /shorten_url/:key` and redirects the client to the original URL

## Current storage behavior

- Short URLs are stored in an in-memory `Map`
- Original URLs are indexed in memory so one destination URL maps to one short key
- Storage is loaded from `data/store.json` on startup when present
- Startup loading collapses duplicate persisted URLs into one canonical key, preserving the earliest `createdAt` and summing visits
- Storage is flushed back to `data/store.json` every `PERSIST_INTERVAL` seconds from runtime configuration, defaulting to `10`
- Storage is written back to `data/store.json` again during application shutdown
- The JSON file shape is:

```ts
{
  urls: Record<string, {
    url: string
    createdAt: string
    visits: number
  }>
}
```

## Deferred PRD details

- Reachability validation for submitted URLs
- More defensive corrupted JSON recovery than reinitializing an empty store
- Production-grade collision strategy, observability, and configuration handling
