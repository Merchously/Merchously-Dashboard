FROM node:20-alpine AS base

# Install dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Create public dir if it doesn't exist (Next.js expects it)
RUN mkdir -p public

# Build Next.js
RUN npm run build

# Production image
FROM node:20-alpine AS runner
RUN apk add --no-cache python3 make g++

WORKDIR /app

ENV NODE_ENV=production

# Copy built application and dependencies
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/server.js ./server.js
COPY --from=base /app/public ./public
COPY --from=base /app/db/schema.sql ./db/schema.sql

# Ensure db directory exists for SQLite at runtime
RUN mkdir -p db

EXPOSE 3000

CMD ["node", "server.js"]
