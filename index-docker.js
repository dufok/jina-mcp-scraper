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

// Import document indexing services
import DatabaseManager from "./src/database/DatabaseManager.js";
import MockEmbeddingsService from "./src/embeddings/MockEmbeddingsService.js";
import DocumentIndexingService from "./src/indexing/DocumentIndexingService.js";

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
  description: "Jina AI tools for web reading, search, fact-checking, batch processing, and document indexing"
});

// Initialize document indexing services
let documentIndexingService;

async function initializeIndexingServices() {
  try {
    console.log("🚀 Initializing document indexing services...");
    
    const databaseManager = new DatabaseManager('/workspace/jina_data/jina-docs.db');
    await databaseManager.initialize();
    
    const embeddingsService = new MockEmbeddingsService();
    
    documentIndexingService = new DocumentIndexingService(databaseManager, embeddingsService);
    
    console.log("✅ Document indexing services initialized");
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize indexing services:", error);
    console.log("📝 Document indexing features will be disabled");
    return false;
  }
}

// Initialize services
initializeIndexingServices();

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

// DOCUMENTATION DISCOVERY TOOL
server.tool(
  "discover_documentation_pages",
  "Automatically discover and list all documentation pages under a specific URL path using web crawling",
  {
    baseUrl: z.string().url().describe("Base URL to start discovery from (e.g., https://docs.solidjs.com/solid-start/)"),
    maxDepth: z.number()
      .optional()
      .default(3)
      .describe("Maximum depth to crawl (default: 3)"),
    delay: z.number()
      .optional()
      .default(0.5)
      .describe("Delay between requests in seconds (default: 0.5)"),
    outputFile: z.string()
      .optional()
      .describe("Optional output file path to save discovered URLs")
  },
  async ({ baseUrl, maxDepth = 3, delay = 0.5, outputFile }) => {
    try {
      console.log(`🔍 Starting documentation discovery for: ${baseUrl}`);
      
      const visited = new Set();
      const foundUrls = new Set();
      const queue = [];
      
      // Helper function to check if URL is valid for discovery
      const isValidUrl = (url) => {
        try {
          const parsed = new URL(url);
          const baseParsed = new URL(baseUrl);
          
          // Must be from the same domain
          if (parsed.hostname !== baseParsed.hostname) return false;
          
          // Must start with our base path
          if (!url.startsWith(baseUrl.replace(/\/$/, ''))) return false;
          
          // Skip common non-documentation URLs
          const skipPatterns = [
            '#', 'javascript:', 'mailto:', 'tel:',
            '.pdf', '.zip', '.tar.gz', '.json',
            '/api/', '/search', '?', '/edit'
          ];
          
          return !skipPatterns.some(pattern => url.includes(pattern));
        } catch {
          return false;
        }
      };
      
      // Helper function to extract links from a page
      const getPageLinks = async (url) => {
        try {
          console.log(`  📄 Scanning: ${url}`);
          
          const response = await fetch(url, {
            headers: createHeaders({
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }),
            timeout: 10000
          });
          
          if (!response.ok) {
            console.log(`  ⚠️  Failed to fetch ${url}: ${response.status}`);
            return [];
          }
          
          const html = await response.text();
          const links = [];
          
          // Simple regex to extract href attributes (avoiding dependencies)
          const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
          let match;
          
          while ((match = hrefRegex.exec(html)) !== null) {
            try {
              const href = match[1];
              const fullUrl = new URL(href, url).href;
              
              if (isValidUrl(fullUrl)) {
                links.push(fullUrl);
              }
            } catch {
              // Skip invalid URLs
            }
          }
          
          return [...new Set(links)]; // Remove duplicates
        } catch (error) {
          console.log(`  ❌ Error scanning ${url}: ${error.message}`);
          return [];
        }
      };
      
      // BFS crawling
      queue.push({ url: baseUrl, depth: 0 });
      visited.add(baseUrl);
      
      while (queue.length > 0) {
        const { url: currentUrl, depth } = queue.shift();
        
        if (depth > maxDepth) continue;
        
        foundUrls.add(currentUrl);
        
        const links = await getPageLinks(currentUrl);
        
        for (const link of links) {
          if (!visited.has(link)) {
            visited.add(link);
            queue.push({ url: link, depth: depth + 1 });
          }
        }
        
        // Respectful delay
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
      }
      
      const sortedUrls = Array.from(foundUrls).sort();
      
      // Save to file if requested
      if (outputFile) {
        try {
          const outputPath = path.resolve('/workspace', outputFile);
          const outputDir = path.dirname(outputPath);
          
          // Ensure directory exists
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          fs.writeFileSync(outputPath, sortedUrls.join('\n') + '\n');
          console.log(`💾 Saved ${sortedUrls.length} URLs to: ${outputPath}`);
        } catch (fileError) {
          console.error(`⚠️  Could not save to file: ${fileError.message}`);
        }
      }
      
      console.log(`✅ Discovery complete! Found ${sortedUrls.length} URLs`);
      
      return {
        content: [{
          type: "text",
          text: `🔍 **Documentation Discovery Results**

**Base URL**: ${baseUrl}
**Total URLs Found**: ${sortedUrls.length}
**Pages Scanned**: ${visited.size}
**Max Depth**: ${maxDepth}

**📋 Discovered URLs:**

${sortedUrls.join('\n')}

${outputFile ? `\n💾 **Saved to file**: ${outputFile}` : ''}

**💡 Next Steps:**
- Copy these URLs to a file for batch processing
- Use \`jina_reader_list\` to scrape all pages at once
- Use \`index_file_to_db\` to index the scraped content

**Example usage:**
\`\`\`
jina_reader_list --inputFile urls.txt --outputFile docs.md
index_file_to_db --filePath docs.md --library "${baseUrl.split('/').filter(Boolean).slice(-1)[0]}"
\`\`\``
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error discovering documentation: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// INDEX FILE TO DATABASE TOOL
server.tool(
  "index_file_to_db",
  "Index a file into the vector database with semantic chunking and embeddings. Auto-detects content from jina scraping tool and splits accordingly.",
  {
    filePath: z.string().describe("Path to the file to index (supports markdown, text, etc.)"),
    library: z.string().describe("Library name to organize this document under"),
    version: z.string()
      .optional()
      .default("latest")
      .describe("Version identifier for this document"),
    title: z.string()
      .optional()
      .describe("Custom title for the document (defaults to filename)"),
    separator: z.string()
      .optional()
      .describe("Separator to split file into multiple documents. Use '###SEPARATOR###' for files created by jina scraping tool")
  },
  async ({ filePath, library, version, title, separator }) => {
    try {
      if (!documentIndexingService) {
        throw new Error("Document indexing services not initialized. Please check the database setup.");
      }

      // Auto-detect if file contains our standard separator
      const STANDARD_SEPARATOR = "###SEPARATOR###";
      let actualSeparator = separator;
      
      if (!separator) {
        try {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          if (fileContent.includes(STANDARD_SEPARATOR)) {
            actualSeparator = STANDARD_SEPARATOR;
            console.log(`📋 Auto-detected separator "${STANDARD_SEPARATOR}" in file`);
          }
        } catch (readError) {
          // File might not exist yet, continue without separator
        }
      }

      const result = await documentIndexingService.indexFile(filePath, {
        library,
        version,
        title,
        separator: actualSeparator
      });

      if (result.success) {
        return {
          content: [{ 
            type: "text", 
            text: `✅ Successfully indexed file!\n\n` +
                  `📁 File: ${filePath}\n` +
                  `📚 Library: ${library} (${version})\n` +
                  `📄 Documents: ${result.documentsIndexed}\n` +
                  `🧩 Total chunks: ${result.totalChunks}\n\n` +
                  `${actualSeparator ? `Split by separator: "${actualSeparator}"\n\n` : ''}` +
                  `The file has been processed with semantic chunking and vector embeddings. ` +
                  `You can now search it using the 'search_indexed_docs' tool.`
          }]
        };
      } else {
        return {
          content: [{ 
            type: "text", 
            text: `❌ Failed to index file:\n${result.error}`
          }],
          isError: true
        };
      }
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

// LIST INDEXED DOCS TOOL
server.tool(
  "list_indexed_docs",
  "Show all indexed document libraries and their contents in the vector database",
  {
    library: z.string()
      .optional()
      .describe("Filter by specific library name"),
    version: z.string()
      .optional()
      .describe("Filter by specific version")
  },
  async ({ library, version }) => {
    try {
      if (!documentIndexingService) {
        throw new Error("Document indexing services not initialized. Please check the database setup.");
      }

      if (library) {
        // Show documents in specific library
        const documents = documentIndexingService.getDocuments(library, version);
        
        if (documents.length === 0) {
          return {
            content: [{ 
              type: "text", 
              text: `📚 No documents found in library "${library}"${version ? ` version "${version}"` : ''}.\n\n` +
                    `Use the 'index_file_to_db' tool to add documents.`
            }]
          };
        }

        const formattedDocs = documents.map(doc => {
          return `📄 **${doc.title}**\n` +
                 `   🆔 ID: ${doc.id}\n` +
                 `   📚 Library: ${doc.library} (${doc.version})\n` +
                 `   🧩 Chunks: ${doc.chunk_count}\n` +
                 `   🔗 Source: ${doc.url || 'N/A'}\n` +
                 `   📅 Indexed: ${doc.indexed_at}\n`;
        }).join('\n');

        return {
          content: [{ 
            type: "text", 
            text: `📚 Documents in "${library}"${version ? ` (${version})` : ''}:\n\n${formattedDocs}`
          }]
        };
      } else {
        // Show all libraries
        const libraries = documentIndexingService.getIndexedLibraries();
        
        if (libraries.length === 0) {
          return {
            content: [{ 
              type: "text", 
              text: `📚 No documents indexed yet.\n\n` +
                    `Use the 'index_file_to_db' tool to start indexing files.`
            }]
          };
        }

        const formattedLibraries = libraries.map(lib => {
          return `📚 **${lib.library}** (${lib.version})\n` +
                 `   📄 Documents: ${lib.document_count}\n` +
                 `   📅 Last indexed: ${lib.last_indexed}\n`;
        }).join('\n');

        return {
          content: [{ 
            type: "text", 
            text: `📚 Indexed Libraries:\n\n${formattedLibraries}\n\n` +
                  `Use 'list_indexed_docs --library <name>' to see documents in a specific library.`
          }]
        };
      }
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

// SEARCH INDEXED DOCS TOOL
server.tool(
  "search_indexed_docs",
  "Search through indexed documents using full-text search and semantic similarity",
  {
    query: z.string().nonempty().describe("Search query to find relevant content"),
    library: z.string()
      .optional()
      .describe("Limit search to specific library"),
    version: z.string()
      .optional()
      .describe("Limit search to specific version"),
    limit: z.number()
      .optional()
      .default(10)
      .describe("Maximum number of results to return")
  },
  async ({ query, library, version, limit }) => {
    try {
      if (!documentIndexingService) {
        throw new Error("Document indexing services not initialized. Please check the database setup.");
      }

      const result = await documentIndexingService.searchDocuments(query, {
        library,
        version,
        limit
      });

      if (result.success) {
        if (result.results.length === 0) {
          return {
            content: [{ 
              type: "text", 
              text: `🔍 No results found for "${query}"\n\n` +
                    `Try:\n` +
                    `• Different keywords\n` +
                    `• Broader search terms\n` +
                    `• Check if documents are indexed using 'list_indexed_docs'`
            }]
          };
        }

        const formattedResults = result.results.map((result, index) => {
          const headingInfo = result.headingPath ? ` > ${result.headingPath}` : '';
          
          return `${index + 1}. **${result.title}**${headingInfo}\n` +
                 `   📚 ${result.library} (${result.version})\n` +
                 `   🔗 ${result.url}\n` +
                 `   📊 Score: ${result.score.toFixed(3)}\n` +
                 `   📝 ${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}\n`;
        }).join('\n');

        return {
          content: [{ 
            type: "text", 
            text: `🔍 Found ${result.results.length} results for "${query}":\n\n${formattedResults}`
          }]
        };
      } else {
        return {
          content: [{ 
            type: "text", 
            text: `❌ Search failed:\n${result.error}`
          }],
          isError: true
        };
      }
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
