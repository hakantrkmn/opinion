# droPINion

Drop opinions on a map: users create pins at real places, comment with
photos, vote, follow and block each other. Web app + JSON API used by the
(upcoming) native mobile app.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript, Tailwind CSS v4, TanStack Query)
- **PostgreSQL 17 + PostGIS** (self-hosted, Docker) via **Drizzle ORM** (`postgres` driver)
- **better-auth** — email + password, email OTP (password reset, email
  verification, email change), bearer tokens + `@better-auth/expo` for mobile
- **MapLibre GL** with free, key-less **OpenFreeMap** vector basemaps;
  pins render as GL layers (server-side grid clusters below zoom 12,
  client clustering above), **sharp** for image re-encoding,
  **Resend** for email, **Expo push** for notifications

## Local setup

Requirements: Node 22+, Docker.

```bash
cp .env.example .env          # defaults work with docker compose
npm install
docker compose up -d          # PostGIS on localhost:5432
npm run db:migrate            # apply drizzle/ migrations
npm run db:seed               # optional demo data
npm run dev                   # http://localhost:3000
```

Seeded logins: `user1@example.test` … `user39@example.test`,
`admin@example.test` — password `password1234`.

Without `RESEND_API_KEY`, one-time codes (password reset, email
verification) are printed to the dev server console.

## Environment variables

See [`.env.example`](.env.example) for the full, commented list.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `BETTER_AUTH_SECRET` | prod | ≥ 32 random chars (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | prod | Public base URL (cookies, CSRF) |
| `NEXT_PUBLIC_SITE_URL` | prod | Canonical URL, inlined at build time |
| `TRUSTED_PROXY_HOPS` | – | Proxies appending to `X-Forwarded-For` (default 1) |
| `UPLOAD_DIR` | – | Upload storage dir (default `./storage/uploads`) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | – | Transactional email |
| `EXPO_ACCESS_TOKEN` | – | Expo push (only with enhanced push security) |
| `BETTER_AUTH_TRUSTED_ORIGINS` | – | Extra trusted origins (comma separated) |
| `DATABASE_POOL_MAX` | – | DB pool size (default 10) |

## Scripts

| Script | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / migrate + start |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (vitest) |
| `npm run test:e2e` / `npm run test:e2e:ui` | Playwright E2E (reuses a running server on `E2E_BASE_URL`, default `http://localhost:3000`; needs the seeded DB) |
| `npm run db:migrate` | Apply migrations (`scripts/migrate.mjs`, drizzle runtime migrator) |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:seed` / `npm run db:reset` | Seed demo data / drop, migrate, seed |
| `npm run db:studio` | Drizzle Studio |

## Deployment

The `Dockerfile` builds a standalone Next.js server (multi-stage,
non-root, `node:22-bookworm-slim`). On start the container runs
`node scripts/migrate.mjs` and then `node server.js`.

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://example.com -t dropinion .
docker run -p 3000:3000 --env-file .env -v dropinion-uploads:/app/storage/uploads dropinion
```

Run the container behind a reverse proxy (Traefik/Dokploy) that sets
`X-Forwarded-For`/`X-Real-IP`: rate limiting trusts the rightmost
`TRUSTED_PROXY_HOPS` entries of `X-Forwarded-For`.

Production runs on Dokploy behind Traefik (TLS terminated at the proxy, one
container). Mount a persistent volume at `/app/storage/uploads` and keep
`TRUSTED_PROXY_HOPS=1`. Rate limits are kept in process memory, which is
correct for a single instance; move them to Redis/Postgres before scaling
out.

## Project structure

```
drizzle/                 SQL migrations (+ meta) — applied by scripts/migrate.mjs
scripts/                 migrate.mjs, seed.ts, db-reset.ts
src/app/                 routes (pages + /api route handlers)
  api/                   JSON API (pins, comments, users, profile, admin, auth, …)
  uploads/[...path]      serves user uploads from UPLOAD_DIR
src/server/              server-only code
  auth/                  better-auth config, session helpers, admin guard
  db/                    drizzle client + schema
  http/                  api helpers (errors, CSRF, sessions), rate limiting, pagination
  services/              domain logic (pins, users, admin, push, images, email, …)
  uploads.ts, storage.ts safe upload path helpers
src/features/            map / pin / comment feature modules (client)
src/components/          UI (profile, admin, moderation, auth, ui primitives)
src/hooks/               TanStack Query hooks and client state hooks
src/types/api.ts         shared HTTP contract (snake_case JSON, Paginated<T>, ApiError)
src/types/userTypes.ts   users / profile / social / admin contract
```

### API conventions

- JSON is snake_case; timestamps are ISO-8601 UTC.
- Errors: non-2xx status with `{ message, code, status, issues? }`.
- Lists: `?limit=&offset=` → `{ items, has_more, next_offset }`.
- Auth: session cookie (web) or `Authorization: Bearer <token>` (mobile;
  the token is returned in the `set-auth-token` header on sign-in).
  Cookie-authenticated mutations must send a same-site `Origin`.
