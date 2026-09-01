# Stage 1: Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json and workspace configurations
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install dependencies and generate Prisma client
RUN npm ci
RUN npx prisma generate --schema=backend/prisma/schema.prisma

# Copy source files and build TypeScript
COPY backend ./backend
RUN npm run build -w backend

# Stage 2: Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install production dependencies only
RUN npm ci --only=production
RUN npx prisma generate --schema=backend/prisma/schema.prisma

COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 5000

CMD ["node", "backend/dist/server.js"]
