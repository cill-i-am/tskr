FROM node:22.18.0-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV PNPM_STORE_DIR=/pnpm/store

RUN corepack enable && npm install --global turbo@2.8.17

WORKDIR /workspace

FROM base AS dev

CMD ["pnpm", "exec", "turbo", "run", "dev:sandbox", "--filter=auth"]

FROM base AS pruner

COPY . .

RUN turbo prune auth --docker

FROM base AS installer

COPY --from=pruner /workspace/out/json/ .
COPY --from=pruner /workspace/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY tsconfig.json ./tsconfig.json

RUN pnpm install --frozen-lockfile

FROM installer AS builder

COPY --from=pruner /workspace/out/full/ .

RUN pnpm exec turbo run build --filter=auth

FROM base AS runtime

COPY --from=builder /workspace/ .

ENV NODE_ENV=production
ENV PORT=3002

CMD ["pnpm", "--filter", "auth", "start"]
