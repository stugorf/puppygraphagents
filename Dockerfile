# Multi-stage build for optimal image size
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install Python for DSPy agents
RUN apk add --no-cache python3 py3-pip python3-dev gcc musl-dev curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Install Python dependencies using pyproject.toml
COPY pyproject.toml uv.lock ./
RUN pip3 install uv && uv pip install --system --no-cache .

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./public

# Copy server source files (needed for TypeScript execution)
COPY server ./server
COPY shared ./shared
COPY drizzle.config.ts ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./

# Copy graph schema configuration for PuppyGraph
COPY puppygraph-config/graph-schema.json ./puppygraph-config/

# Create attached_assets directory
RUN mkdir -p attached_assets

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S temporal-kg -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R temporal-kg:nodejs /app

# Switch to non-root user
USER temporal-kg

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npm", "run", "start"]