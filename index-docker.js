#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import fetch from "node-fetch";
import http from "http";
import url from "url";
import fs from "fs";
import path from "path";

// Get Jina API key from environment (optional)
const getJinaApiKey = () => {
  return process.env.JINA_API_KEY || null;
};

// Helper to create headers with or without API key
const createHeaders = (baseHeaders = {}) => {
  const headers = { ...baseHeaders };
  const apiKey = getJinaApiKey();
  
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  
  return headers;
};

// Create MCP server for Jina AI tools
const server = new McpServer({
  name: "jina-mcp-tools",
  version: "1.1.0",
  description: "Jina AI tools for web reading, search, fact-checking, and batch processing"
});

// WEB READER TOOL
server.tool(
  "jina_reader",
  "Read and extract content from web pages using Jina AI's powerful web reader",
  {
    url: z.string().url().describe("URL of the webpage to read and extract content from"),
    format: z.enum(["Default", "Markdown", "HTML", "Text", "Screenshot", "Pageshot"])
      .optional()
      .default("Markdown")
      .describe("Output format for the extracted content"),
    withLinks: z.boolean()
      .optional()
      .default(false)
      .describe("Include links in the extracted content"),
    withImages: z.boolean()
      .optional()
      .default(false)
      .describe("Include images in the extracted content")
  },
  async ({ url, format, withLinks, withImages }) => {
    try {
      // Build the Jina Reader URL
      const jinaUrl = new URL(url, "https://r.jina.ai/");
      
      // Add query parameters based on options
      const searchParams = new URLSearchParams();
      
      if (format && format !== "Default") {
        if (format === "Markdown") {
          // Default is markdown, no parameter needed
        } else if (format === "HTML") {
          searchParams.append("htmlContent", "true");
        } else if (format === "Text") {
          searchParams.append("textContent", "true");
        } else if (format === "Screenshot") {
          searchParams.append("screenshot", "true");
        } else if (format === "Pageshot") {
          searchParams.append("pageshot", "true");
        }
      }
      
      if (withLinks) {
        searchParams.append("withLinks", "true");
      }
      
      if (withImages) {
        searchParams.append("withImages", "true");
      }
      
      // Add parameters to URL if any
      if (searchParams.toString()) {
        jinaUrl.search = searchParams.toString();
      }
      
      const response = await fetch(jinaUrl.toString(), {
        headers: createHeaders({
          "Accept": "text/plain",
          "User-Agent": "JinaMCP/1.0.3"
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const content = await response.text();
      
      return {
        content: [{
          type: "text",
          text: content
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error reading URL: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// WEB READER LIST TOOL
server.tool(
  "jina_reader_list",
  "Read links from a file and process each one with Jina Reader, saving results to an output file",
  {
    inputFile: z.string().describe("Path to the file containing URLs (one per line)"),
    outputFile: z.string().describe("Path where the processed results will be saved"),
    format: z.enum(["Default", "Markdown", "HTML", "Text", "Screenshot", "Pageshot"])
      .optional()
      .default("Markdown")
      .describe("Output format for the extracted content"),
    withLinks: z.boolean()
      .optional()
      .default(false)
      .describe("Include links in the extracted content"),
    withImages: z.boolean()
      .optional()
      .default(false)
      .describe("Include images in the extracted content"),
    delimiter: z.string()
      .optional()
      .default("###SEPARATOR###")
      .describe("Delimiter to separate results from different URLs (hardcoded for database indexing compatibility)")
  },
  async ({ inputFile, outputFile, format, withLinks, withImages, delimiter }) => {
    try {
      // Read the input file
      let fileContent;
      try {
        fileContent = fs.readFileSync(inputFile, 'utf8');
      } catch (fileError) {
        throw new Error(`Could not read input file: ${fileError.message}`);
      }

      // Extract URLs from the file (one per line, skip empty lines)
      const urls = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.startsWith('http'));

      if (urls.length === 0) {
        throw new Error("No valid URLs found in the input file");
      }

      let allResults = [];
      let processedCount = 0;

      // Process each URL using the same logic as the jina_reader tool
      for (const url of urls) {
        try {
          // Build the Jina URL
          const jinaUrl = new URL(`https://r.jina.ai/${url}`);
          const searchParams = new URLSearchParams();
          
          if (format && format !== "Default") {
            searchParams.append("format", format.toLowerCase());
          }
          
          if (withLinks) {
            searchParams.append("withLinks", "true");
          }
          
          if (withImages) {
            searchParams.append("withImages", "true");
          }
          
          // Add parameters to URL if any
          if (searchParams.toString()) {
            jinaUrl.search = searchParams.toString();
          }
          
          const response = await fetch(jinaUrl.toString(), {
            headers: createHeaders({
              "Accept": "text/plain",
              "User-Agent": "JinaMCP/1.0.3"
            })
          });
          
          if (!response.ok) {
            allResults.push(`ERROR processing ${url}: ${response.status} - ${response.statusText}`);
          } else {
            const content = await response.text();
            allResults.push(`URL: ${url}\n${content}`);
            processedCount++;
          }
        } catch (urlError) {
          allResults.push(`ERROR processing ${url}: ${urlError.message}`);
        }

        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Combine all results
      const finalOutput = allResults.join(delimiter);

      // Write to output file
      try {
        // Ensure output directory exists
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputFile, finalOutput, 'utf8');
      } catch (writeError) {
        throw new Error(`Could not write to output file: ${writeError.message}`);
      }

      return {
        content: [{ 
          type: "text", 
          text: `Successfully processed ${processedCount} out of ${urls.length} URLs.\nResults saved to: ${outputFile}\nOutput file size: ${finalOutput.length} characters`
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// WEB SEARCH TOOL
server.tool(
  "jina_search",
  "Search the web using Jina AI's search capabilities",
  {
    query: z.string().describe("Search query to find relevant web content"),
    count: z.number()
      .min(1)
      .max(20)
      .optional()
      .default(10)
      .describe("Number of search results to return (1-20)"),
    site: z.string()
      .optional()
      .describe("Limit search to specific website (e.g., 'github.com')")
  },
  async ({ query, count, site }) => {
    try {
      // Build the search URL
      const searchUrl = new URL("https://s.jina.ai/");
      
      let searchQuery = query;
      if (site) {
        searchQuery = `site:${site} ${query}`;
      }
      
      searchUrl.searchParams.append("q", searchQuery);
      if (count && count !== 10) {
        searchUrl.searchParams.append("count", count.toString());
      }
      
      const response = await fetch(searchUrl.toString(), {
        headers: createHeaders({
          "Accept": "application/json",
          "User-Agent": "JinaMCP/1.0.3"
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const results = await response.json();
      
      let formattedResults = "# Search Results\n\n";
      
      if (results.data && Array.isArray(results.data)) {
        results.data.forEach((item, index) => {
          formattedResults += `## ${index + 1}. ${item.title || 'No Title'}\n`;
          formattedResults += `**URL**: ${item.url || 'No URL'}\n`;
          if (item.description) {
            formattedResults += `**Description**: ${item.description}\n`;
          }
          formattedResults += '\n';
        });
      } else {
        formattedResults += "No search results found or unexpected response format.";
      }
      
      return {
        content: [{
          type: "text",
          text: formattedResults
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error performing search: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// FACT-CHECK TOOL
server.tool(
  "jina_fact_check",
  "Verify factual statements using Jina AI's fact-checking capabilities",
  {
    statement: z.string().describe("Statement or claim to fact-check")
  },
  async ({ statement }) => {
    try {
      const factCheckUrl = new URL("https://g.jina.ai/");
      factCheckUrl.searchParams.append("q", statement);
      
      const response = await fetch(factCheckUrl.toString(), {
        headers: createHeaders({
          "Accept": "text/plain",
          "User-Agent": "JinaMCP/1.0.3"
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.text();
      
      return {
        content: [{
          type: "text",
          text: `# Fact-Check Result\n\n**Statement**: ${statement}\n\n**Verification**:\n${result}`
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error fact-checking statement: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Main function to start the server
async function main() {
  try {
    // Log startup information
    console.error("🚀 Starting Jina AI MCP Tools Server v1.0.3");
    
    const apiKey = getJinaApiKey();
    if (apiKey) {
      console.error(`✅ Jina AI API key found with length ${apiKey.length}`);
      if (apiKey.length < 10) {
        console.warn("⚠️  Warning: JINA_API_KEY seems too short. Please verify your API key.");
      }
    } else {
      console.error("⚠️  No Jina AI API key found. Some features may be limited.");
    }

    // Check if we should run in HTTP mode (for Docker)
    const mode = process.env.MCP_MODE || 'stdio';
    const port = process.env.PORT || 3000;

    if (mode === 'http') {
      // HTTP mode for Docker deployment
      console.error(`🌐 Starting HTTP server on port ${port}`);
      
      const httpServer = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url, true);
        
        if (parsedUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'healthy', version: '1.0.3' }));
          return;
        }
        
        if (parsedUrl.pathname === '/sse') {
          const transport = new SSEServerTransport("/sse", res);
          await server.connect(transport);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      });
      
      httpServer.listen(port, () => {
        console.error(`✅ HTTP server listening on port ${port}`);
        console.error(`🔗 Health check: http://localhost:${port}/health`);
        console.error(`🔗 MCP endpoint: http://localhost:${port}/sse`);
      });
    } else {
      // Default stdio mode
      console.error("📡 Starting in stdio mode");
      const transport = new StdioServerTransport();
      await server.connect(transport);
    }
    
  } catch (error) {
    console.error("❌ Server error:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('📴 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('📴 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Execute the main function
main().catch((error) => {
  console.error("💥 Fatal error in main():", error);
  process.exit(1);
});
