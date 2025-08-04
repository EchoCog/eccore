#!/bin/bash

# Autonomous Agents Microservices Deployment Script
set -e

echo "🚀 Deploying Autonomous Agents Microservices..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed"
    exit 1
fi

if ! command -v docker compose version &> /dev/null; then
    echo "❌ Docker Compose is required but not installed"
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs certs data

# Generate environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment configuration..."
    cat > .env << EOF
# Security Configuration
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "default-jwt-secret")
ENCRYPTION_KEY=$(openssl rand -base64 32 2>/dev/null || echo "default-encryption-key")
REDIS_PASSWORD=$(openssl rand -base64 16 2>/dev/null || echo "default-redis-password")
POSTGRES_PASSWORD=$(openssl rand -base64 16 2>/dev/null || echo "default-postgres-password")
GRAFANA_PASSWORD=admin123

# Service Configuration
NODE_ENV=production
REFLECTION_INTERVAL=60000
MAX_REFLECTION_DEPTH=5
CONFIDENCE_THRESHOLD=0.7
LEARNING_RATE=0.1

# Network Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
EOF
    echo "✅ Environment configuration created"
fi

# Build all services
echo "🔨 Building microservices..."
docker compose build

# Start infrastructure services first
echo "🛠️ Starting infrastructure services..."
docker compose up -d redis postgres prometheus grafana

# Wait for infrastructure to be ready
echo "⏳ Waiting for infrastructure services to be ready..."
sleep 10

# Start autonomous agent services
echo "🤖 Starting autonomous agent services..."
docker compose up -d security heartbeat reflection optimization analytics

# Wait for services to start
echo "⏳ Waiting for agent services to initialize..."
sleep 15

# Start the gateway last
echo "🌐 Starting API gateway..."
docker compose up -d gateway

# Final wait for full system readiness
echo "⏳ Waiting for full system initialization..."
sleep 10

# Health check
echo "🏥 Performing health checks..."

services=("gateway:8080" "security:8081" "heartbeat:8082" "reflection:8083" "optimization:8084" "analytics:8085")
all_healthy=true

for service in "${services[@]}"; do
    name=$(echo $service | cut -d':' -f1)
    port=$(echo $service | cut -d':' -f2)
    
    if curl -f http://localhost:$port/health > /dev/null 2>&1; then
        echo "✅ $name service is healthy"
    else
        echo "❌ $name service is not responding"
        all_healthy=false
    fi
done

if $all_healthy; then
    echo ""
    echo "🎉 All autonomous agent microservices are deployed and healthy!"
    echo ""
    echo "📊 Access Points:"
    echo "  API Gateway:     http://localhost:8080"
    echo "  Security:        http://localhost:8081"
    echo "  Heartbeat:       http://localhost:8082"
    echo "  Reflection:      http://localhost:8083"
    echo "  Optimization:    http://localhost:8084"
    echo "  Analytics:       http://localhost:8085"
    echo "  Grafana:         http://localhost:3000 (admin/admin123)"
    echo "  Prometheus:      http://localhost:9090"
    echo ""
    echo "🔐 Security Notes:"
    echo "  - All services use JWT authentication"
    echo "  - Inter-service communication is encrypted"
    echo "  - Zero-knowledge data processing enabled"
    echo "  - Default credentials are in .env file"
    echo ""
    echo "📝 Next Steps:"
    echo "  1. Review logs: docker compose logs -f"
    echo "  2. Test endpoints: ./scripts/test-endpoints.sh"
    echo "  3. Monitor health: ./scripts/health-check.sh"
    echo "  4. Scale services: docker compose up -d --scale reflection=3"
else
    echo "❌ Some services failed to start properly"
    echo "📋 Check logs with: docker compose logs"
    exit 1
fi