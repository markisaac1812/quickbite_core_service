FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci
# installs all dependencies including devDependencies (typescript), needed for the build.

COPY . .

RUN npm run build

# stage 2

FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /app

# tini runs as PID 1: forwards SIGTERM (ECS stop / docker stop) to node so the
# graceful shutdown in server.ts / worker.ts runs, and reaps zombie processes.
RUN apk add --no-cache tini

COPY package*.json ./

# Production deps only: migrations are compiled to dist/migrations, so the
# migrate task runs `npm run migrate:prod` (compiled knexfile) — no ts-node needed.
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

USER node

ENTRYPOINT ["/sbin/tini", "--"]

# Same image, three roles (ECS task definitions / compose override the command):
#   server  -> node dist/server.js        (default)
#   worker  -> node dist/worker.js
#   migrate -> npm run migrate:prod
CMD ["node","dist/server.js"]
