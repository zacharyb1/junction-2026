# syntax=docker/dockerfile:1
# Production image. Separate from the devcontainer on purpose; they share only the Node version (.nvmrc).
ARG NODE_VERSION=26.13.1

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
# Node 25+ no longer bundles corepack. Install a pinned one; it then provides the pnpm version
# named in package.json's "packageManager" field.
RUN npm install -g corepack@0.36.0 && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# All dependencies, then bundle src/ into one file with esbuild.
FROM base AS build
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# Runtime dependencies only.
FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=4111
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY fixtures ./fixtures
RUN mkdir -p data && chown node:node data
USER node
EXPOSE 4111
# Secrets are passed as environment variables at run time (see docker-compose.yml), never baked in.
CMD ["node", "dist/server.mjs"]
