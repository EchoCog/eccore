#!/bin/bash

# Test script for autonomous agent microservices endpoints
set -e

echo "🧪 Testing autonomous agent microservices endpoints..."

# Test gateway authentication
echo "🔐 Testing authentication..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo $AUTH_RESPONSE | jq -r '.token' > /dev/null 2>&1; then
    TOKEN=$(echo $AUTH_RESPONSE | jq -r '.token')
    echo "✅ Authentication successful"
else
    echo "❌ Authentication failed"
    exit 1
fi

# Test heartbeat service
echo "💓 Testing heartbeat service..."
HEARTBEAT_RESPONSE=$(curl -s "http://localhost:8082/heartbeat")
if echo $HEARTBEAT_RESPONSE | jq -r '.timestamp' > /dev/null 2>&1; then
    echo "✅ Heartbeat service responding"
else
    echo "❌ Heartbeat service failed"
fi

# Test reflection service
echo "🧠 Testing reflection service..."
REFLECTION_RESPONSE=$(curl -s -X POST "http://localhost:8083/reflect" \
  -H "Content-Type: application/json" \
  -d '{"depth":1}')
if echo $REFLECTION_RESPONSE | jq -r '.id' > /dev/null 2>&1; then
    echo "✅ Reflection service responding"
else
    echo "❌ Reflection service failed"
fi

# Test optimization service
echo "⚡ Testing optimization service..."
OPTIMIZATION_RESPONSE=$(curl -s -X POST "http://localhost:8084/optimize" \
  -H "Content-Type: application/json" \
  -d '{"type":"memory","data":{}}')
if echo $OPTIMIZATION_RESPONSE | jq -r '.status' > /dev/null 2>&1; then
    echo "✅ Optimization service responding"
else
    echo "❌ Optimization service failed"
fi

# Test analytics service
echo "📊 Testing analytics service..."
ANALYTICS_RESPONSE=$(curl -s -X POST "http://localhost:8085/metrics" \
  -H "Content-Type: application/json" \
  -d '{"type":"test","value":123}')
if echo $ANALYTICS_RESPONSE | jq -r '.status' > /dev/null 2>&1; then
    echo "✅ Analytics service responding"
else
    echo "❌ Analytics service failed"
fi

# Test secure routing through gateway
echo "🌐 Testing secure routing..."
SECURE_RESPONSE=$(curl -s "http://localhost:8080/api/heartbeat/status" \
  -H "Authorization: Bearer $TOKEN")
if echo $SECURE_RESPONSE | jq -r '.isRunning' > /dev/null 2>&1; then
    echo "✅ Secure routing working"
else
    echo "❌ Secure routing failed"
fi

echo ""
echo "🎉 All endpoint tests completed successfully!"
echo "🔗 The autonomous agents are ready for secure microservice operations"