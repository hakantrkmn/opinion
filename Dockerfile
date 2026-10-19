# syntax=docker/dockerfile:1.7
# Production image: multi-stage build of the Next.js standalone server.
# Migrations run on every container start (scripts/migrate.mjs, idempotent).

ARG NODE_VERSION=22-bookworm-slim

# --- deps: full install (incl. dev deps needed for the build) ---------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# --- build -------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runtime -----------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/storage/uploads

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs \
 && mkdir -p /app/storage/uploads \
 && chown -R nextjs:nodejs /app/storage

# Standalone server (traced node_modules incl. sharp's native binaries).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Migrations + runtime migrator. The migrator imports
# drizzle-orm/postgres-js/migrator, which the app itself never imports, so
# ship the complete drizzle-orm and postgres packages next to the trace.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres

USER nextjs
VOLUME ["/app/storage/uploads"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/auth/ok').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Same as `npm start` (node scripts/migrate.mjs && next start) but using the
# standalone server.js, which doesn't need the next CLI.
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node server.js"]
