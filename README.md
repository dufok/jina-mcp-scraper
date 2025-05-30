# Jina AI MCP Tools - Complete Documentation

> **Attribution**: This project is based on [jina-mcp-tools](https://github.com/PsychArch/jina-mcp-tools) by PsychArch. Thank you for the excellent foundation!

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Core Features](#core-features)
- [Web Tools](#web-tools)
- [Document Indexing System](#document-indexing-system)
- [Configuration](#configuration)
- [Docker Setup](#docker-setup)
- [Batch Processing](#batch-processing)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This MCP server provides comprehensive web content analysis and research capabilities through Jina AI's powerful APIs, enhanced with a complete document indexing and search system. It offers tools for extracting content from web pages, searching the web, fact-checking statements, batch processing multiple URLs, and intelligent document management.

### Key Capabilities

- **🔍 Web Search & Reading** - Search the web and extract content from any webpage
- **📋 Batch Processing** - Process multiple URLs from files with hardcoded separators
- **✅ Fact Checking** - Verify factual statements using Jina AI
- **📚 Document Indexing** - Index files into vector database with semantic chunking
- **🔎 Intelligent Search** - Full-text search through indexed documents
- **🐳 Docker Support** - Easy deployment with Docker containers
- **🛠️ URL Validation** - Python script to check URL accessibility

## 🚀 Quick Start

### Prerequisites

1. **Jina AI API Key** - Get a free API key from [https://jina.ai/?sui=apikey](https://jina.ai/?sui=apikey)
2. **Node.js** - Version 16 or higher

### Option 1: Docker (Recommended)
```bash
# Build the Docker image
docker build -t mcp/jinatool .

# Configure in VS Code settings (settings.json)
{
  "servers": {
    "jina-mcp-tools": {
        "command": "docker",
        "args": [
            "run",
            "-i",
            "--rm",
            "-v",
            "/Users/dufok/Desktop/JinaMCPTool/data:/workspace/data",
            "-v",
            "/Users/dufok/Desktop/JinaMCPTool/links_for_cr_data:/workspace/links_for_cr_data",
            "-e",
            "JINA_API_KEY=API_KEY",
            "mcp/jinatool",
        ],
    }
}
```

### Option 2: Direct Node.js
```bash
npm install
node index.js
```

### Option 3: MCP Client Integration
Configure in your MCP client (Cursor, Claude Desktop):

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

## 🔧 Core Features

### Web Tools

#### 🌐 jina_reader
Extract content from any webpage in LLM-optimized format:
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

#### 🔍 jina_search
Search the web for information:
```json
{
  "name": "jina_search", 
  "arguments": {
    "query": "How does quantum computing work?",
    "count": 5
  }
}
```

#### ✅ jina_fact_check
Verify factual statements:
```json
{
  "name": "jina_fact_check",
  "arguments": {
    "statement": "The Earth is flat"
  }
}
```

#### 📋 jina_reader_list (Enhanced with Hardcoded Separators)
Process multiple URLs from a file with automatic separator handling:
```json
{
  "name": "jina_reader_list",
  "arguments": {
    "inputFile": "/path/to/urls.txt",
    "outputFile": "/path/to/results.md",
    "format": "Markdown"
  }
}
```

**Key Enhancement**: Now uses hardcoded `###SEPARATOR###` delimiter for seamless integration with document indexing system.

### Document Indexing System

#### 📚 Three Core Indexing Tools

1. **index_file_to_db** - Index files into vector database
2. **list_indexed_docs** - View indexed documents and libraries  
3. **search_indexed_docs** - Search through indexed content

#### Index a File
```json
{
  "name": "index_file_to_db",
  "arguments": {
    "filePath": "./data/documentation.md",
    "library": "project-docs",
    "version": "v1.0",
    "separator": "###SEPARATOR###"
  }
}
```

**Auto-Detection**: The tool automatically detects if files contain the hardcoded separator from `jina_reader_list` and splits accordingly.

#### List Indexed Documents
```json
{
  "name": "list_indexed_docs",
  "arguments": {
    "library": "project-docs"
  }
}
```

#### Search Documents
```json
{
  "name": "search_indexed_docs", 
  "arguments": {
    "query": "installation guide",
    "library": "project-docs",
    "limit": 5
  }
}
```

**Important Notes about Searching:**

- **`library` parameter is OPTIONAL** - If not specified, searches ALL indexed libraries
- **Always searches LOCAL content** - Never returns web links, only your indexed documents
- **URLs in results are metadata** - From original scraping, but content searched is local

```json
// Search specific library
{
  "name": "search_indexed_docs",
  "arguments": {
    "query": "API routes",
    "library": "solidjs-complete"
  }
}

// Search ALL libraries (library parameter omitted)
{
  "name": "search_indexed_docs", 
  "arguments": {
    "query": "API routes"
  }
}
```

**⚠️ Don't confuse with web search:**
- `search_indexed_docs` = Search your LOCAL database
- `jina_search` = Search the web

### Seamless Workflow

1. **Scrape Multiple URLs**: Use `jina_reader_list` to scrape URLs from file
2. **Automatic Separation**: Content is separated with `###SEPARATOR###`
3. **Auto-Index**: Use `index_file_to_db` on scraped file - automatically detects separator
4. **Intelligent Search**: Search through all indexed content with `search_indexed_docs`

## ⚙️ Configuration

### Environment Variables Configuration

**Important**: Configure environment variables in your MCP client configuration file, NOT in separate `.env` files (except for Docker deployments).

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

#### Claude Desktop Configuration
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

### Docker Configuration Options

#### Option A: Docker with MCP Client Environment
```json
{
    "servers": {
        "jina-mcp-tools": {
            "command": "docker",
            "args": [
                "run",
                "-i",
                "--rm",
                "-v",
                "/Users/dufok/Desktop/JinaMCPTool/data:/workspace/data",
                "-v",
                "/Users/dufok/Desktop/JinaMCPTool/links_for_cr_data:/workspace/links_for_cr_data",
                "-e",
                "JINA_API_KEY=",
                "mcp/jinatool",
            ],
        }
    }
}

```

### Testing Docker Deployment
```bash
# Health check
curl http://localhost:3000/health
# Should return: {"status":"healthy","version":"1.0.3"}
```

### Docker Integration Modes

1. **HTTP Mode** (Default for Docker): Exposes SSE endpoint at `/sse`
2. **Stdio Mode** (Traditional MCP): Direct MCP protocol communication

### Volume Mounting for File Processing
```bash
# For batch processing with files
docker run -it --rm \
  -v /path/to/your/data:/data \
  -e JINA_API_KEY=your_api_key \
  jina-mcp-tools
```

## 📋 Batch Processing

### Enhanced Separator Handling

The `jina_reader_list` tool now uses a hardcoded separator `###SEPARATOR###` for consistent document splitting:

#### Input File Format
```
https://docs.example.com/guide1
https://docs.example.com/guide2
https://docs.example.com/guide3
```

#### Output Format (with hardcoded separator)
```markdown
# Content from https://docs.example.com/guide1
[Extracted content here...]

###SEPARATOR###

# Content from https://docs.example.com/guide2
[More extracted content...]

###SEPARATOR###

# Content from https://docs.example.com/guide3
[Additional content...]
```

#### Seamless Indexing
```bash
# 1. Scrape URLs to file
jina_reader_list --inputFile "urls.txt" --outputFile "scraped-docs.md"

# 2. Index automatically detects separator and splits into individual documents
index_file_to_db --filePath "scraped-docs.md" --library "docs"
```

### URL Validation
Before processing large batches:
```bash
python check_urls.py data/urls.txt
```

## 🗂️ Architecture

### Database Schema (SQLite)
```sql
documents (id, title, library, version, file_path, indexed_at)
chunks (id, document_id, content, chunk_index, heading_path)  
chunks_fts (FTS5 full-text search index)
```

### Processing Pipeline
1. **File Reading** → Read content from file or direct input
2. **Separator Detection** → Auto-detect `###SEPARATOR###` for splitting
3. **Text Splitting** → Split into semantic chunks (~1000 chars)
4. **Database Storage** → Store document metadata + chunks
5. **FTS Indexing** → Create full-text search index

### File Structure
```
src/
├── database/
│   ├── DatabaseManager.js           # SQLite operations
│   └── schema.sql                  # Database schema
├── indexing/
│   └── DocumentIndexingService.js  # Main indexing service
├── splitter/
│   └── SimpleTextSplitter.js      # Text chunking logic
└── embeddings/
    └── MockEmbeddingsService.js    # Placeholder for embeddings
```

## 🔍 Use Cases

### 1. Documentation Research & Indexing
```bash
# Scrape documentation URLs
jina_reader_list --inputFile "doc-urls.txt" --outputFile "docs.md"

# Index with auto-separator detection
index_file_to_db --filePath "docs.md" --library "project-docs"

# Search indexed docs
search_indexed_docs --query "installation guide" --library "project-docs"
```

### 2. Multi-Version Documentation
```bash
index_file_to_db --filePath "./v1-docs.md" --library "docs" --version "v1.0"
index_file_to_db --filePath "./v2-docs.md" --library "docs" --version "v2.0"
```

### 3. API Documentation Processing
```bash
index_file_to_db --filePath "./api-docs.md" --library "api" --separator "## "
```

## 🛠️ Development

### Dependencies
```bash
npm install
```

Key dependencies:
- `better-sqlite3` - SQLite database
- `jsdom` - HTML parsing  
- `turndown` - HTML to Markdown conversion
- `@anthropic-ai/mcp` - MCP protocol

### Testing
```bash
# Test the indexing system
node test-indexing.js

# Test URL validation
python check_urls.py data/sample-urls.txt
```

## 🔧 Troubleshooting

### Common Issues

#### "No Jina AI API key found"
**Solution**: Ensure API key is set in your MCP configuration:
```json
{
  "env": {
    "JINA_API_KEY": "your_key_here"
  }
}
```

#### Server not starting
**Check**:
1. API key format (no extra spaces)
2. Command path is correct
3. Dependencies installed

#### Docker issues
```bash
# Check container status
docker-compose ps
docker-compose logs jina-mcp-server

# Debug inside container
docker-compose exec jina-mcp-server sh

# Test API key
docker-compose exec jina-mcp-server node -e "console.log(process.env.JINA_API_KEY)"
```

#### Document indexing issues
- Verify file paths are correct
- Check if separator exists in file content
- Ensure database permissions
- Review chunk size and overlap settings

### Best Practices

1. **Security**
   - Never commit API keys to version control
   - Use MCP client's secure environment variable configuration
   - For production Docker, use Docker secrets

2. **File Organization**
   - Use descriptive library names
   - Version your documentation appropriately
   - Organize files by logical groupings

3. **Performance**
   - Use separators for large multi-document files
   - Batch process multiple URLs rather than individual requests
   - Monitor database size for large indexing operations

## 📊 Quick Reference

| Use Case | Tool | Configuration |
|----------|------|---------------|
| Single webpage | `jina_reader` | URL + format options |
| Web search | `jina_search` | Query + result count |
| Fact checking | `jina_fact_check` | Statement to verify |
| Batch URLs | `jina_reader_list` | Input file + output file |
| Index file | `index_file_to_db` | File path + library |
| List docs | `list_indexed_docs` | Optional library filter |
| Search docs | `search_indexed_docs` | Query + optional filters |

## 🔮 Future Enhancements

The system is designed to easily add:
- **Vector embeddings** (TxtAI integration)
- **Semantic search** (combining FTS + vector similarity)  
- **More file formats** (PDF, DOCX, etc.)
- **Batch file processing** (index entire directories)
- **Advanced analytics** (usage tracking, performance metrics)

## 📄 License

MIT

## 🔗 Links

- Original Project: [https://github.com/PsychArch/jina-mcp-tools](https://github.com/PsychArch/jina-mcp-tools)
- Jina AI: [https://jina.ai](https://jina.ai)
- Issues: Report bugs and feature requests in the issues section

---

This comprehensive documentation covers all aspects of the Jina AI MCP Tools with enhanced document indexing capabilities. The system provides a seamless workflow from web content extraction to intelligent document search, making it a powerful tool for research, documentation management, and content analysis.
