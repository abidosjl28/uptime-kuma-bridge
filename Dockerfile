FROM node:22-alpine

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    sqlite-dev

WORKDIR /app

COPY package*.json ./

# Install dependencies (better-sqlite3 needs to be compiled)
RUN npm install --production=false

COPY server.js ./

ENV PORT=3003
ENV DB_PATH=/app/data/kuma.db
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 3003

CMD ["node", "server.js"]
