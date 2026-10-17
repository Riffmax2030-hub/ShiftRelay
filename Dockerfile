# ShiftRelay Production Multi-Region Frontline Engine
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# Copy application source
COPY . .

# Ensure upload directory exists and is writable
RUN mkdir -p uploads data && chown -R node:node /app

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "server.mjs"]
