# =============================================================================
# Multi-stage Dockerfile for Driver App (Vite + React + TypeScript)
# Stage 1: Build static files with Node.js
# Stage 2: Serve with Nginx
# =============================================================================

# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .

# Accept build-time environment variables
ARG VITE_API_URL=""
ARG VITE_SOCKET_URL=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# ── Stage 2: Serve with Nginx ──────────────────────────────────────────────
FROM nginx:alpine

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
