# URL Shortener Service – Product Requirements Document (PRD)

## 1. Overview

### Objective
Build a URL Shortener Web Service using **NestJS (TypeScript)** that:
- Generates short URLs
- Redirects users to original URLs
- Uses **in-memory storage (primary)**
- Persists data to **JSON file**
- Supports **graceful shutdown**
- Includes **OpenAPI (Swagger)**
- Is fully **Dockerized**

---

## 2. Tech Stack

- Framework: NestJS
- Language: TypeScript
- Runtime: Node.js
- Testing: Jest
- API Docs: Swagger (@nestjs/swagger)
- Containerization: Docker

---

## 3. Core Architecture

Startup:
  Load JSON → In-memory Map

Request:
  Controller → Service → Memory → Response

Cross-cutting:
  Global Interceptor → Console log response payload and errors

Persistence:
  Memory → Periodic write → JSON file

Shutdown:
  Memory → Final write → JSON file

---

## 4. Project Structure

/src
  /url
    url.controller.ts
    url.service.ts
    url.module.ts

  /storage
    storage.service.ts

  /common
    /dto
    /validators
    /filters
    /interceptors
      logging.interceptor.ts

  main.ts

/data
  store.json

/test

Dockerfile
README.md
openapi.yaml

---

## 5. Data Model

Map<string, {
  url: string;
  createdAt: string;
  visits: number;
}>

---

## 6. API Requirements

### POST /shorten_url/

Request:
{
  "url": "https://example.com"
}

Behavior:
- Validate URL format
- Validate URL is reachable
- If the URL already exists, return the existing key
- Otherwise generate a unique key, store the new record, and return it

Response:
{
  "key": "abc123"
}

---

### GET /shorten_url/{key}

Behavior:
- Lookup key in memory
- If found:
  - Increment visits
  - Redirect (302)
- If not found:
  - Return 404

---

## 7. Storage Strategy

### In-Memory
- Use Map for O(1) lookup

### JSON Persistence

File:
./data/store.json

Behavior:
- On startup → load JSON
- On startup → collapse duplicate records for the same original URL into one canonical key
- Every 10s → persist memory
- On shutdown → final write

---

## 8. Graceful Shutdown

Handle:
- SIGINT
- SIGTERM

Behavior:
- Stop requests
- Save memory to file
- Exit cleanly

---

## 9. Logging

Log:
- API requests
- API responses via global interceptor
- URL creation
- Redirects
- Persistence events
- Errors

Interceptor Behavior:
- Add a global NestJS interceptor
- For successful requests, console log the response payload
- Include useful request metadata where applicable (method, path, status code)
- If any error occurs, console log the error details before rethrowing

---

## 10. Testing

- POST valid URL
- POST existing URL returns existing key
- POST invalid URL
- GET valid key
- GET invalid key
- Interceptor logs successful responses
- Interceptor logs errors
- Persistence works
- Shutdown writes file

---

## 11. OpenAPI

- Use @nestjs/swagger
- Endpoint: /api-docs

---

## 12. Configuration

.env:

PORT=3000
PERSIST_INTERVAL=10
DATA_FILE_PATH=/app/data/store.json

---

## 13. Docker

Build:
docker build -t url-shortener .

Run:
docker run -p 3000:3000 -v $(pwd)/data:/app/data url-shortener

---

## 14. Edge Cases

- Invalid URL
- Key collision
- Missing JSON
- Corrupted JSON
- Concurrent writes

---

## 15. Deliverables

- NestJS app
- Dockerized
- Tests
- OpenAPI spec
- README

---

## 16. Success Criteria

- API works
- Data persists
- Shutdown safe
- Docker runs
- Clean code
