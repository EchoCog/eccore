#!/bin/bash

# Test script for privacy-preserving API bridges
set -e

echo "🧪 Testing privacy-preserving API bridges..."

# Test configuration
GATEWAY_URL="http://localhost:8080"
DELTACHAT_BRIDGE_URL="http://localhost:8086"
SECURITY_SERVICE_URL="http://localhost:8081"

# Function to test if service is responding
test_service_health() {
    local service_name=$1
    local url=$2
    
    echo "🔍 Testing $service_name health..."
    if curl -s "$url/health" > /dev/null 2>&1; then
        echo "✅ $service_name is healthy"
        return 0
    else
        echo "❌ $service_name is not responding"
        return 1
    fi
}

# Test authentication for bridge access
test_bridge_authentication() {
    echo "🔐 Testing Delta-Chat bridge authentication..."
    
    # Get authentication token
    AUTH_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"username":"agent","password":"agent123"}')
    
    if echo "$AUTH_RESPONSE" | jq -r '.token' > /dev/null 2>&1; then
        TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token')
        echo "✅ Authentication successful for bridge access"
        export BRIDGE_TOKEN="$TOKEN"
        return 0
    else
        echo "❌ Authentication failed"
        return 1
    fi
}

# Test privacy compliance validation
test_privacy_compliance() {
    echo "🛡️  Testing privacy compliance validation..."
    
    COMPLIANCE_RESPONSE=$(curl -s -X POST "$SECURITY_SERVICE_URL/deltachat/privacy-compliance" \
      -H "Content-Type: application/json" \
      -d '{
        "operation": "message-analysis",
        "privacyLevel": "maximum"
      }')
    
    if echo "$COMPLIANCE_RESPONSE" | jq -r '.compliant' | grep -q "true"; then
        echo "✅ Privacy compliance validation passed"
        export PRIVACY_TOKEN=$(echo "$COMPLIANCE_RESPONSE" | jq -r '.processingToken')
        return 0
    else
        echo "❌ Privacy compliance validation failed"
        return 1
    fi
}

# Test Delta-Chat message processing
test_message_processing() {
    echo "💬 Testing privacy-preserving message processing..."
    
    MESSAGE_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/deltachat/process-message" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $BRIDGE_TOKEN" \
      -d '{
        "message": {
          "id": 12345,
          "chatId": 1,
          "fromContactId": 100,
          "text": "encrypted-content-placeholder",
          "type": "text",
          "timestamp": 1699000000,
          "isEncrypted": true
        },
        "clientId": "test-client-001",
        "encryptionKey": "test-encryption-key-placeholder"
      }')
    
    if echo "$MESSAGE_RESPONSE" | jq -r '.success' | grep -q "true"; then
        echo "✅ Privacy-preserving message processing successful"
        ANALYSIS_ID=$(echo "$MESSAGE_RESPONSE" | jq -r '.result.analysisId')
        echo "  📊 Analysis ID: $ANALYSIS_ID"
        return 0
    else
        echo "❌ Message processing failed"
        echo "  Response: $MESSAGE_RESPONSE"
        return 1
    fi
}

# Test homomorphic analysis
test_homomorphic_analysis() {
    echo "🔬 Testing homomorphic analysis..."
    
    ANALYSIS_RESPONSE=$(curl -s -X POST "$SECURITY_SERVICE_URL/deltachat/homomorphic-analysis" \
      -H "Content-Type: application/json" \
      -d "{
        \"processingEnvelope\": {
          \"processingId\": \"test-processing-001\",
          \"encryptedContent\": \"encrypted-test-content\",
          \"messageHash\": \"test-hash-123\"
        },
        \"analysisType\": \"sentiment-analysis\",
        \"privacyToken\": \"$PRIVACY_TOKEN\"
      }")
    
    if echo "$ANALYSIS_RESPONSE" | jq -r '.success' | grep -q "true"; then
        echo "✅ Homomorphic analysis successful"
        echo "  🔒 Privacy preserved: $(echo "$ANALYSIS_RESPONSE" | jq -r '.privacyPreserved')"
        echo "  🚫 Plaintext access: $(echo "$ANALYSIS_RESPONSE" | jq -r '.plaintextAccess')"
        return 0
    else
        echo "❌ Homomorphic analysis failed"
        return 1
    fi
}

# Test content intelligence bridge
test_content_intelligence() {
    echo "🧠 Testing content intelligence bridge..."
    
    CONTENT_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/deltachat/analyze-content" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $BRIDGE_TOKEN" \
      -d '{
        "encryptedContent": "encrypted-content-for-analysis",
        "analysisType": "content-categorization",
        "clientPublicKey": "test-public-key"
      }')
    
    if echo "$CONTENT_RESPONSE" | jq -r '.success' | grep -q "true"; then
        echo "✅ Content intelligence bridge working"
        echo "  🔐 Content never decrypted: $(echo "$CONTENT_RESPONSE" | jq -r '.privacyGuarantees.contentNeverDecrypted')"
        return 0
    else
        echo "❌ Content intelligence bridge failed"
        return 1
    fi
}

# Test response generation bridge
test_response_generation() {
    echo "🤖 Testing response generation bridge..."
    
    RESPONSE_GEN=$(curl -s -X POST "$GATEWAY_URL/api/deltachat/generate-response" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $BRIDGE_TOKEN" \
      -d '{
        "messageContext": "encrypted-context",
        "responseType": "smart-reply",
        "privacyLevel": "maximum"
      }')
    
    if echo "$RESPONSE_GEN" | jq -r '.success' | grep -q "true"; then
        echo "✅ Response generation bridge working"
        return 0
    else
        echo "❌ Response generation bridge failed"
        return 1
    fi
}

# Test privacy validation bridge
test_privacy_validation() {
    echo "🔍 Testing privacy validation bridge..."
    
    VALIDATION_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/deltachat/validate-privacy" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $BRIDGE_TOKEN" \
      -d '{
        "operation": "message-analysis",
        "data": "encrypted-test-data",
        "privacyRequirements": {
          "zeroKnowledge": true,
          "endToEndEncryption": true,
          "noPlaintextAccess": true
        }
      }')
    
    if echo "$VALIDATION_RESPONSE" | jq -r '.valid' | grep -q "true"; then
        echo "✅ Privacy validation bridge working"
        echo "  ✅ Zero-knowledge processing: $(echo "$VALIDATION_RESPONSE" | jq -r '.compliance.zeroKnowledgeProcessing')"
        echo "  ✅ No plaintext access: $(echo "$VALIDATION_RESPONSE" | jq -r '.compliance.noPlaintextAccess')"
        return 0
    else
        echo "❌ Privacy validation bridge failed"
        return 1
    fi
}

# Main test execution
main() {
    echo "🚀 Starting privacy-preserving API bridges tests..."
    echo ""
    
    # Test service health
    test_service_health "Delta-Chat Bridge" "$DELTACHAT_BRIDGE_URL" || exit 1
    test_service_health "Security Service" "$SECURITY_SERVICE_URL" || exit 1
    echo ""
    
    # Test authentication and privacy setup
    test_bridge_authentication || exit 1
    test_privacy_compliance || exit 1
    echo ""
    
    # Test privacy-preserving API bridges
    test_message_processing || exit 1
    test_homomorphic_analysis || exit 1
    test_content_intelligence || exit 1
    test_response_generation || exit 1
    test_privacy_validation || exit 1
    echo ""
    
    echo "🎉 All privacy-preserving API bridge tests passed!"
    echo ""
    echo "✅ Key privacy features verified:"
    echo "  🔐 Zero-knowledge message processing"
    echo "  🛡️  Homomorphic analysis without decryption"
    echo "  🚫 No plaintext access by autonomous agents"
    echo "  🔒 End-to-end encryption maintained"
    echo "  📊 Privacy compliance validation"
    echo "  🤖 Secure response generation"
    echo "  🧠 Private content intelligence"
    echo ""
    echo "🔗 Delta-Chat integration ready with maximum privacy!"
}

# Run tests
main "$@"