# Use Node.js 18 Alpine as base image for smaller size
FROM node:18-alpine AS base

# Install dependencies needed for node-gyp, native dependencies, and OpenSSL
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Create a builder stage
FROM base AS builder

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Create production stage
FROM base AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["node", "dist/server.js"] 