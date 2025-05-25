# Docker Setup Guide for Jina MCP Tools

This guide will help you run your Jina MCP server in Docker for better scalability and deployment.

## Prerequisites

1. **Docker** and **Docker Compose** installed on your system
2. **Jina AI API Key** - Get it from [https://jina.ai/?sui=apikey](https://jina.ai/?sui=apikey)

## Important: Environment Configuration

**For Docker deployments**: Use `.env` files (this guide)
**For direct MCP integration**: Use the `env` section in your `.cursor/mcp.json` file

The `.env` file approach is specifically for Docker containerized deployments. For standard MCP usage with Cursor or other clients, configure the environment variables directly in your MCP client configuration file.

## Quick Start

### 1. Set up environment variables

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Edit the `.env` file and replace `your_jina_api_key_here` with your actual Jina API key:

```
JINA_API_KEY=your_actual_api_key_here
NODE_ENV=production
```

### 2. Build and run with Docker Compose

```bash
# Build and start the container
docker-compose up --build -d

# Check if the container is running
docker-compose ps

# View logs
docker-compose logs -f jina-mcp-server
```

### 3. Test the deployment

The server will be available at `http://localhost:3000`. You can test it with:

```bash
# Health check
curl http://localhost:3000/health

# This should return: {"status":"healthy","version":"1.0.3"}
```

## Alternative Docker Commands

### Build and run manually

```bash
# Build the image
docker build -t jina-mcp-tools .

# Run the container
docker run -d \
  --name jina-mcp-server \
  -p 3000:3000 \
  -e JINA_API_KEY=your_api_key_here \
  -e MCP_MODE=http \
  jina-mcp-tools
```

### Run in stdio mode (for direct MCP integration)

```bash
docker run -it \
  -e JINA_API_KEY=your_api_key_here \
  jina-mcp-tools npm run start:docker
```

## Integration Options

### Option 1: HTTP Mode (Recommended for Docker)

The Docker version runs in HTTP mode by default, exposing an SSE endpoint at `/sse`. This is more suitable for containerized environments and allows for:

- Health checks at `/health`
- Better container orchestration
- Load balancing capabilities
- Easier monitoring and logging

### Option 2: Stdio Mode (Traditional MCP)

For traditional MCP integration, you can run the container in stdio mode:

```bash
docker run -it \
  -e JINA_API_KEY=your_api_key_here \
  -e MCP_MODE=stdio \
  jina-mcp-tools
```

## Cursor Integration with Docker

### Option 1: Docker in Stdio Mode (Recommended for MCP)
To use the Dockerized version with Cursor in traditional MCP stdio mode, update your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "jina-mcp-tools": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "jina-mcp-tools",
        "npm", "run", "start:docker"
      ],
      "env": {
        "JINA_API_KEY": "your_jina_api_key_here"
      }
    }
  }
}
```

### Option 2: HTTP Endpoint (For Advanced Use Cases)
If you prefer to use the HTTP endpoint (requires the container to be running separately):

```json
{
  "mcpServers": {
    "jina-mcp-tools": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

**Note**: For Option 2, you'll need to first start the container with your API key:
```bash
docker-compose up -d
```

## Management Commands

```bash
# Start the service
docker-compose up -d

# Stop the service
docker-compose down

# Restart the service
docker-compose restart

# View logs
docker-compose logs -f

# Update the container
docker-compose down
docker-compose up --build -d

# Remove everything (including volumes)
docker-compose down -v
```

## Scaling and Production

### Multiple Instances

For better scalability, you can run multiple instances:

```yaml
# In docker-compose.yml
services:
  jina-mcp-server:
    # ... existing config ...
    deploy:
      replicas: 3
```

### Behind a Load Balancer

You can put the service behind nginx or another load balancer:

```nginx
upstream jina_mcp {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://jina_mcp;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Environment-specific Configurations

Create different compose files for different environments:

- `docker-compose.yml` (base)
- `docker-compose.prod.yml` (production overrides)
- `docker-compose.dev.yml` (development overrides)

```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Check container status
```bash
docker-compose ps
docker-compose logs jina-mcp-server
```

### Debug inside container
```bash
docker-compose exec jina-mcp-server sh
```

### Test API key
```bash
docker-compose exec jina-mcp-server node -e "console.log(process.env.JINA_API_KEY)"
```

## Security Notes

1. **Never commit your `.env` file** - it's already in `.gitignore`
2. **Use secrets management** in production (Docker Swarm secrets, Kubernetes secrets, etc.)
3. **Run as non-root user** (already configured in Dockerfile)
4. **Keep the container updated** regularly rebuild with latest base images

## Monitoring

The HTTP mode provides a health endpoint for monitoring:

```bash
# Add to your monitoring system
curl -f http://localhost:3000/health || exit 1
```

You can also monitor Docker container metrics:

```bash
docker stats jina-mcp-tools
```
