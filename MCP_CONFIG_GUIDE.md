# MCP Configuration Guide

This guide explains how to properly configure environment variables for the Jina MCP Tools server in different deployment scenarios.

## 🎯 Key Principle

**Environment variables should be configured in your MCP client configuration file, NOT in separate `.env` files** (except for Docker deployments).

## 📋 Configuration Methods

### 1. Standard MCP Integration (Recommended)

For Cursor, Claude Desktop, or other MCP clients, configure environment variables directly in the MCP configuration file:

#### Cursor Configuration (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "jina-mcp-tools": {
      "command": "npx",
      "args": ["jina-mcp-tools"],
      "env": {
        "JINA_API_KEY": "your_actual_jina_api_key_here"
      }
    }
  }
}
```

#### Claude Desktop Configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "jina-mcp-tools": {
      "command": "npx",
      "args": ["jina-mcp-tools"],
      "env": {
        "JINA_API_KEY": "your_actual_jina_api_key_here"
      }
    }
  }
}
```

### 2. Local Development (Node.js directly)

If you're running the server directly with Node.js:

```json
{
  "mcpServers": {
    "jina-mcp-tools": {
      "command": "node",
      "args": ["/path/to/your/project/index.js"],
      "env": {
        "JINA_API_KEY": "your_actual_jina_api_key_here"
      }
    }
  }
}
```

### 3. Docker Integration

#### Option A: Docker with MCP Client Environment
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
        "JINA_API_KEY": "your_actual_jina_api_key_here"
      }
    }
  }
}
```

#### Option B: Docker Compose (uses .env file)
Only when using Docker Compose for standalone deployment:

1. Create `.env` file:
```bash
JINA_API_KEY=your_actual_jina_api_key_here
NODE_ENV=production
```

2. Run with Docker Compose:
```bash
docker-compose up -d
```

## ✅ Best Practices

### 1. Security
- **Never commit API keys** to version control
- Use your MCP client's secure environment variable configuration
- For Docker production, use Docker secrets or external secret management

### 2. Organization
- **Global configuration**: `~/.cursor/mcp.json` for system-wide access
- **Project-specific**: `.cursor/mcp.json` in your project root
- **Team sharing**: Document the required environment variables without exposing actual keys

### 3. Validation
Your MCP client will show connection status and any environment variable issues. Check the logs if the server fails to start.

## 🔧 Troubleshooting

### Problem: "No Jina AI API key found"

**Solution**: Ensure your API key is properly set in your MCP configuration:

```json
{
  "mcpServers": {
    "jina-mcp-tools": {
      "command": "npx",
      "args": ["jina-mcp-tools"],
      "env": {
        "JINA_API_KEY": "your_key_here"  // ← Make sure this is set
      }
    }
  }
}
```

### Problem: Server not starting

**Check**:
1. API key is correctly formatted (no extra spaces)
2. Command path is correct
3. Dependencies are installed (`npm install -g jina-mcp-tools` for npx)

### Problem: Tools not working even with API key

**Verify**:
1. API key is valid (test at https://jina.ai)
2. Network connectivity to Jina AI services
3. Check MCP client logs for detailed error messages

## 📂 File Structure Summary

```
For MCP Integration:
~/.cursor/mcp.json              ← Environment variables here
└── or project/.cursor/mcp.json

For Docker Only:
project/
├── .env                        ← Only for Docker deployments
├── docker-compose.yml          
└── Dockerfile
```

## 🎯 Quick Reference

| Use Case | Configuration Method | File Location |
|----------|---------------------|---------------|
| Cursor/Claude Desktop | MCP config `env` section | `~/.cursor/mcp.json` |
| Local development | MCP config `env` section | Project or global config |
| Docker standalone | `.env` file | Project root |
| Docker with MCP | MCP config `env` section | MCP config file |

Remember: **MCP clients handle environment variables through their configuration files, not through separate `.env` files.**
