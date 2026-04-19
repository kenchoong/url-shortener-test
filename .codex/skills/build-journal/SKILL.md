---
name: build-journal
description: Use for Courtside Backend implementation work. Before making changes, read the existing product and implementation docs so work starts from the current state. After completing implementation, update the status doc and add a new dated markdown build note that records what was built, verified, and what gaps remain.
---

# Build Journal

Use this skill for feature work in the Courtside Backend repo.

## Before you build

Read these files first:

1. `docs/product-context.md`
2. `docs/implementation-status.md`
3. The latest file in `docs/build-notes/`
4. `docs/api/README.md` when the work adds or changes API routes

Your implementation should start from those documents, not from assumptions.

## During the build

- Keep `docs/implementation-status.md` as the canonical summary of the current backend state.
- If the implementation changes routes, auth behavior, storage behavior, redirect behavior, shutdown behavior, or validation rules, reflect that in the status doc.
- If the implementation adds or changes an API endpoint, update the API generation workflow and regenerate the artifacts in `docs/api/`.
- Keep the status doc concise and current.
- Keep `diagrams/` as the canonical ordered flow documentation for the backend.
- When a new flow is added, or an existing flow materially changes, add or update a Mermaid diagram in `diagrams/`.
- Keep diagram filenames numerically prefixed like `1-...`, `2-...`, `3-...` so the folder reflects dependency order from first flow to later flow.
- If a new flow changes that order, renumber the affected diagram files and update the overall diagram so the numbering still matches how the app works.

## After the build

Create a new markdown file in `docs/build-notes/`.

Use a filename like:

- `YYYY-MM-DD-short-build-name.md`

Every new build note should contain:

- the date
- what was built
- API routes or modules added or changed
- data/storage changes
- verification commands that were run
- remaining gaps or next likely steps

Also update `docs/implementation-status.md` so it reflects the repo after the new build, not before it.
If the work added or changed a flow, also update the matching numbered diagram in `diagrams/` and the overall diagram.
If API routes changed, also regenerate the API artifacts in `docs/api/`, including the full OpenAPI spec, any per-module specs, and any checked-in API client or Postman outputs the repo maintains.

## Guardrails

- Do not delete older build notes.
- Prefer updating the existing status file plus adding one new dated build note.
- If no code changed, do not create a fake build note.
- If the build was partial or blocked, say so directly in the new note.
- Do not leave route changes undocumented in `docs/api/`.

## Expected workflow

1. Read the product context and implementation docs.
2. Implement the requested feature.
3. Run the relevant verification commands.
4. Update `docs/implementation-status.md`.
5. Regenerate `docs/api/` artifacts when routes changed.
6. Add or update the affected numbered Mermaid diagram files in `diagrams/`, including the overall app diagram when flow order changes.
7. Add a new dated file in `docs/build-notes/`.
