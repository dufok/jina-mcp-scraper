# Jina AI MCP Tools

A Model Context Protocol (MCP) server that integrates with [Jina AI Search Foundation APIs](https://docs.jina.ai/).

## Features

This MCP server provides access to the following Jina AI APIs:

- **Web Reader** - Extract content from web pages using r.jina.ai
- **Web Search** - Search the web using s.jina.ai
- **Fact-Check** - Verify factual statements using g.jina.ai

## Prerequisites

1. **Jina AI API Key** - Get a free API key from [https://jina.ai/?sui=apikey](https://jina.ai/?sui=apikey)
2. **Node.js** - Version 16 or higher

## Cursor Editor Configuration

You can integrate this MCP server with Cursor to enhance your coding experience.

### Configuration File Setup

Create a `.cursor/mcp.json` file in your project or in your home directory (`~/.cursor/mcp.json` for global access) with the following structure:

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

### Using the Tools

Once configured, Cursor's Agent will automatically use the Jina AI tools when appropriate. You can also explicitly instruct Agent to use specific tools:

- "Search the web for quantum computing using Jina tools"
- "Extract content from https://example.com using the jina_reader tool"
- "Use jina_fact_check to verify if the Earth is flat"

When a tool is called, Cursor will display the response in the chat. By default, you'll need to approve each tool usage.

For unattended operation, you can enable Yolo mode in Cursor settings, which allows tools to run without approval (similar to terminal commands).

## Available Tools

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

## License

MIT

## Links

- GitHub: [https://github.com/PsychArch/jina-mcp-tools](https://github.com/PsychArch/jina-mcp-tools)
- Issues: [https://github.com/PsychArch/jina-mcp-tools/issues](https://github.com/PsychArch/jina-mcp-tools/issues) 