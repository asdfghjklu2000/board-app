# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install backend dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server source
COPY server.js ./

# Copy built frontend from stage 1
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3001

CMD ["node", "server.js"]
