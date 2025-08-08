FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build
RUN addgroup -g 1001 -S nodejs && adduser -S analytics -u 1001
RUN mkdir -p /app/logs && chown -R analytics:nodejs /app
USER analytics
EXPOSE 8085
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8085/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
CMD ["npm", "start"]