# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

RUN npm ci

# Copy frontend source and build
COPY frontend ./frontend
RUN npm run build -w frontend

# Stage 2: Runtime stage
FROM nginx:alpine AS runner

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
