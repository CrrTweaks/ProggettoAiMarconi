# ─────────────────────────────────────────────────────
#  Node.js Backend · build context = project root
#  Build: docker build -f docker/node.Dockerfile .
# ─────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install deps first for layer caching
COPY backend-node/package.json backend-node/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy source
COPY backend-node/ ./

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget --quiet --spider http://localhost:${NODE_PORT:-4000}/health || exit 1

EXPOSE 4000
CMD ["node", "src/server.js"]
