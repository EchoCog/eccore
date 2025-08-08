FROM node:20-alpine

# Security hardening
RUN addgroup -g 1001 -S bridge && \
    adduser -S bridge -u 1001 -G bridge

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove source code and dev dependencies for security
RUN rm -rf src/ node_modules/ && \
    npm ci --only=production && \
    npm cache clean --force

# Create certificates directory
RUN mkdir -p /app/certs && \
    chown -R bridge:bridge /app

# Switch to non-root user
USER bridge

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8086/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Expose port
EXPOSE 8086

# Start the service
CMD ["node", "dist/index.js"]