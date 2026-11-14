FROM docker.io/library/node:22-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
# These values become public page content. Never pass API keys as build arguments.
ARG PUBLIC_BASE_URL=http://localhost:3000
ARG NEXT_PUBLIC_BOT_USERNAME=""
ARG NEXT_PUBLIC_SAMPLE_CASE_ID=""
ARG NEXT_PUBLIC_REPO_URL=""
ENV KAVERI_STANDALONE=1
RUN pnpm lint && pnpm typecheck && pnpm build

FROM docker.io/library/node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# A new named volume inherits this directory's ownership, allowing non-root writes.
RUN mkdir -p .data/cases && chown -R node:node .data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
