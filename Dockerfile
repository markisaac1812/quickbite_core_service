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

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

USER node

CMD ["node","dist/server.js"]
