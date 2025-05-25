# Jina AI MCP Tools

> **Attribution**: This project is based on [jina-mcp-tools](https://github.com/PsychArch/jina-mcp-tools) by PsychArch. Thank you for the excellent foundation!

## Summary

This MCP server provides comprehensive web content analysis and research capabilities through Jina AI's powerful APIs. It offers tools for extracting content from web pages, searching the web, fact-checking statements, and batch processing multiple URLs from files.

## Key Features

- **🔍 Web Search** - Search the web using Jina's s.jina.ai service
- **📄 Web Reader** - Extract and format content from any webpage using r.jina.ai
- **📋 Batch Processing** - Process multiple URLs from files with the new reader list tool
- **✅ Fact Checking** - Verify factual statements using g.jina.ai
- **🐳 Docker Support** - Easy deployment with Docker containers
- **🛠️ URL Validation** - Python script to check URL accessibility before processing

## Quick Start

### Option 1: Docker (Recommended)
```bash
# Build the Docker image
docker build -t mcp/jinatool .

# Configure in VS Code settings (settings.json)
{
  "servers": {
    "jina-mcp-tools": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "mcp/jinatool"],
      "env": {
        "JINA_API_KEY": "your_jina_api_key_here"
      }
    }
  }
}
```

### Option 2: Direct Node.js
```bash
npm install
node index.js
```

### URL Validation Tool
Before processing URLs, validate them using the included Python script:
```bash
python check_urls.py data/solidjs-links.md
```

## Tools Overview

## Prerequisites

1. **Jina AI API Key** - Get a free API key from [https://jina.ai/?sui=apikey](https://jina.ai/?sui=apikey)
2. **Node.js** - Version 16 or higher

## Cursor Editor Configuration

You can integrate this MCP server with Cursor to enhance your coding experience.

### Configuration File Setup

Create a `.cursor/mcp.json` file in your project or in your home directory (`~/.cursor/mcp.json` for global access) with the following structure:

#### Option 1: Using NPX (Recommended)
```json
{
  "mcpServers": {
    "jina-mcp-tools": {
      "command": "npx",
      "args": ["jina-mcp-tools"],
      "env": {
        "JINA_API_KEY": "your_jina_api_key_here"
      }
    }
  }
}
```

#### Option 2: Using Local Installation
```json
{
  "mcpServers": {
    "jina-mcp-tools": {
      "command": "node",
      "args": ["/Users/dufok/Desktop/JinaMCPTool/index.js"],
      "env": {
        "JINA_API_KEY": "your_jina_api_key_here"
      }
    }
  }
}
```

#### Option 3: Using Docker (Stdio Mode)
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

### Using the Tools

Once configured, Cursor's Agent will automatically use the Jina AI tools when appropriate. You can also explicitly instruct Agent to use specific tools:

- "Search the web for quantum computing using Jina tools"
- "Extract content from https://example.com using the jina_reader tool"
- "Use jina_fact_check to verify if the Earth is flat"

When a tool is called, Cursor will display the response in the chat. By default, you'll need to approve each tool usage.

For unattended operation, you can enable Yolo mode in Cursor settings, which allows tools to run without approval (similar to terminal commands).

## Available Tools

### 🆕 jina_reader_list - NEW Batch Processing Tool

**Process multiple URLs from a file and save results to output file**

This powerful new tool allows you to batch process multiple URLs from a text file, making it perfect for research projects, content analysis, and documentation generation.

```json
{
  "name": "jina_reader_list",
  "arguments": {
    "inputFile": "/path/to/urls.txt",
    "outputFile": "/path/to/results.md",
    "format": "Markdown",
    "withLinks": false,
    "withImages": false,
    "delimiter": "\n---\n"
  }
}
```

**Features:**
- ✅ Processes one URL per line from input file
- ✅ Supports all Jina Reader output formats (Markdown, HTML, Text, etc.)
- ✅ Customizable delimiter between results
- ✅ Optional link and image extraction
- ✅ Docker support with volume mounting
- ✅ Error handling for invalid URLs

**Input File Format:**
```
https://example1.com
https://example2.com
https://example3.com
```

**Important Note on File Paths:**
When using the Jina tools for scraping links, always specify file paths with the `/workspace/` prefix. For example:
- Use: `/workspace/data/filename` 
- Not: `workspace/data/filename` or absolute paths
- Example: `/workspace/data/solidjs-links.md`

**Output Example:**
```markdown
# Content from https://example1.com
Extracted content here...

---

# Content from https://example2.com
More extracted content...
```

For detailed usage instructions, see [BATCH_PROCESSING.md](BATCH_PROCESSING.md).

### jina_reader

Extract content from a webpage in a format optimized for LLMs.

```json
{
  "name": "jina_reader",
  "arguments": {
    "url": "https://example.com",
    "format": "Markdown",
    "withLinks": false,
    "withImages": false
  }
}
```

Options for `format` include: "Default", "Markdown", "HTML", "Text", "Screenshot", "Pageshot"

### jina_search

Search the web for information.

```json
{
  "name": "jina_search",
  "arguments": {
    "query": "How does quantum computing work?",
    "count": 5,
    "returnFormat": "markdown"
  }
}
```

Options for `returnFormat` include: "markdown", "text", "html"

### jina_fact_check

Verify factual statements.

```json
{
  "name": "jina_fact_check",
  "arguments": {
    "statement": "The Earth is flat",
    "deepdive": false
  }
}
```

## Prompt Templates

### jina_web_search

A prompt template for searching the web.

```json
{
  "name": "jina_web_search",
  "arguments": {
    "query": "Recent advances in fusion energy"
  }
}
```

### jina_research

A prompt template for conducting research.

```json
{
  "name": "jina_research",
  "arguments": {
    "topic": "Climate change solutions",
    "depth": "detailed"
  }
}
```

Options for `depth` include: "basic", "detailed", "comprehensive"

## Additional Utilities

### URL Validation Script

Before processing large batches of URLs, use the included Python script to validate URL accessibility:

```bash
python check_urls.py data/NAMEFILE
```

**Features:**
- ✅ Checks URL accessibility and response codes
- ✅ Identifies broken or inaccessible links
- ✅ Reports processing time and success rates
- ✅ Supports various file formats containing URLs

### Docker Setup

For detailed Docker configuration and usage instructions, see [DOCKER_SETUP.md](DOCKER_SETUP.md).

### MCP Configuration

For comprehensive MCP setup instructions across different editors and environments, see [MCP_CONFIG_GUIDE.md](MCP_CONFIG_GUIDE.md).

## Sample Data

The repository includes sample data in the `data/` directory:
- `solidjs-links.md` - Example file with SolidJS related links for testing batch processing

## License

MIT

## Links

- GitHub: [https://github.com/PsychArch/jina-mcp-tools](https://github.com/PsychArch/jina-mcp-tools)
- Issues: [https://github.com/PsychArch/jina-mcp-tools/issues](https://github.com/PsychArch/jina-mcp-tools/issues)