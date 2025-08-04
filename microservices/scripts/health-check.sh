#!/bin/bash

# Health check script for autonomous agent microservices
set -e

echo "🏥 Checking health of autonomous agent microservices..."

services=("gateway:8080" "security:8081" "heartbeat:8082" "reflection:8083" "optimization:8084" "analytics:8085")
healthy_count=0
total_count=${#services[@]}

for service in "${services[@]}"; do
    name=$(echo $service | cut -d':' -f1)
    port=$(echo $service | cut -d':' -f2)
    
    echo -n "Checking $name... "
    
    if response=$(curl -s http://localhost:$port/health 2>/dev/null); then
        status=$(echo $response | jq -r '.status' 2>/dev/null || echo "unknown")
        if [ "$status" = "healthy" ]; then
            echo "✅ healthy"
            healthy_count=$((healthy_count + 1))
        else
            echo "⚠️  degraded ($status)"
        fi
    else
        echo "❌ unreachable"
    fi
done

echo ""
echo "Health Summary: $healthy_count/$total_count services healthy"

if [ $healthy_count -eq $total_count ]; then
    echo "🎉 All services are healthy!"
    exit 0
else
    echo "⚠️  Some services need attention"
    exit 1
fi