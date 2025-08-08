# Autonomous Agents Microservices

This directory contains the microservices implementation of the DeepTreeEcho autonomous agents, deployed as secure, independent services according to the SKZ Integration Strategy.

## Architecture

The autonomous agents are deployed as the following microservices:

1. **Agent Gateway Service** (`gateway/`) - API gateway and authentication
2. **Heartbeat Service** (`heartbeat/`) - System health monitoring
3. **Reflection Service** (`reflection/`) - Meta-cognitive analysis
4. **Optimization Service** (`optimization/`) - Performance optimization
5. **Analytics Service** (`analytics/`) - Metrics collection and analysis
6. **Security Service** (`security/`) - Authentication and encryption

## Security Features

- **Zero-knowledge architecture**: Services process encrypted data without access to plaintext
- **mTLS authentication**: All inter-service communication uses mutual TLS
- **JWT tokens**: Secure authentication and authorization
- **Network isolation**: Services run in isolated Docker networks
- **Encryption at rest**: All persistent data is encrypted

## Deployment

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# Scale specific services
docker-compose up -d --scale reflection=3

# View logs
docker-compose logs -f
```

## Service Communication

Services communicate through:
- **HTTP REST APIs** for synchronous requests
- **Message queues** for asynchronous processing
- **gRPC** for high-performance inter-service communication

## Monitoring

- **Health checks**: Each service exposes `/health` endpoint
- **Metrics**: Prometheus metrics at `/metrics` endpoint
- **Distributed tracing**: OpenTelemetry integration
- **Centralized logging**: JSON structured logs