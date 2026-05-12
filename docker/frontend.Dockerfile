# ─────────────────────────────────────────────────────
#  React + Vite Frontend · build context = project root
#  Build: docker build -f docker/frontend.Dockerfile --target prod .
# ─────────────────────────────────────────────────────

# ── Build stage ──
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY frontend/ ./
RUN npm run build

# ── Dev stage (used by docker-compose for HMR) ──
FROM node:20-alpine AS dev
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY frontend/ ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Prod stage (Nginx serving the static build) ──
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
