#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
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
      const headers = createHeaders({
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-With-Links-Summary": withLinks ? "true" : "false",
        "X-With-Images-Summary": withImages ? "true" : "false",
        "X-Return-Format": format.toLowerCase()
      });

      const response = await fetch("https://r.jina.ai/", {
        method: "POST",
        headers,
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jina Reader API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return {
        content: [{ 
          type: "text", 
          text: data.data && data.data.content ? data.data.content : JSON.stringify(data, null, 2)
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
      .default("\n---\n")
      .describe("Delimiter to separate results from different URLs")
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

      // Process each URL
      for (const url of urls) {
        try {
          const headers = createHeaders({
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-With-Links-Summary": withLinks ? "true" : "false",
            "X-With-Images-Summary": withImages ? "true" : "false",
            "X-Return-Format": format.toLowerCase()
          });

          const response = await fetch("https://r.jina.ai/", {
            method: "POST",
            headers,
            body: JSON.stringify({ url })
          });

          if (!response.ok) {
            const errorText = await response.text();
            allResults.push(`ERROR processing ${url}: ${response.status} - ${errorText}`);
          } else {
            const data = await response.json();
            const content = data.data && data.data.content ? data.data.content : JSON.stringify(data, null, 2);
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

// SEARCH TOOL
server.tool(
  "jina_search",
  "Search the web for information using Jina AI's semantic search engine",
  {
    query: z.string().nonempty().describe("Search query to find information on the web"),
    count: z.number()
      .optional()
      .default(5)
      .describe("Number of search results to return"),
    returnFormat: z.enum(["markdown", "text", "html"])
      .optional()
      .default("markdown")
      .describe("Format of the returned search results")
  },
  async ({ query, count, returnFormat }) => {
    try {
      const encodedQuery = encodeURIComponent(query);
      const headers = createHeaders({
        "Accept": "application/json",
        "X-Respond-With": "no-content"
      });

      const response = await fetch(`https://s.jina.ai/?q=${encodedQuery}`, {
        method: "GET",
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jina Search API error (${response.status}): ${errorText}`);
      }

      const text = await response.text();
      
      // Parse the JSON response
      const data = JSON.parse(text);
      
      // Extract just the search results
      let results = data.data || [];
      
      // Limit to the requested count
      if (count && count > 0 && results.length > count) {
        results = results.slice(0, count);
      }
      
      // Clean up the results to remove unnecessary token information
      results = results.map(result => {
        // Remove the usage information
        if (result.usage) {
          delete result.usage;
        }
        return result;
      });
      
      // Format the output based on returnFormat
      let formattedOutput;
      if (returnFormat === 'markdown') {
        formattedOutput = results.map((result, index) => {
          return `${index + 1}. **${result.title || 'Untitled'}**\n   ${result.url || ''}\n   ${result.description || ''}\n   ${result.date ? `Date: ${result.date}` : ''}\n`;
        }).join('\n');
      } else if (returnFormat === 'html') {
        formattedOutput = `<ol>${results.map(result => 
          `<li><strong>${result.title || 'Untitled'}</strong><br>
           <a href="${result.url || ''}">${result.url || ''}</a><br>
           ${result.description || ''}<br>
           ${result.date ? `Date: ${result.date}` : ''}</li>`
        ).join('')}</ol>`;
      } else {
        // Default to text format
        formattedOutput = results.map((result, index) => {
          return `${index + 1}. ${result.title || 'Untitled'}\n   ${result.url || ''}\n   ${result.description || ''}\n   ${result.date ? `Date: ${result.date}` : ''}`;
        }).join('\n\n');
      }
      
      return {
        content: [{ 
          type: "text", 
          text: formattedOutput
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

// FACT-CHECK TOOL
server.tool(
  "jina_fact_check",
  "Verify the factuality of statements using Jina AI's fact-checking capability",
  {
    statement: z.string().nonempty().describe("Statement to fact-check for accuracy"),
    deepdive: z.boolean()
      .optional()
      .default(false)
      .describe("Enable deep analysis with more comprehensive research")
  },
  async ({ statement, deepdive }) => {
    try {
      const headers = createHeaders({
        "Content-Type": "application/json",
        "Accept": "application/json"
      });

      const response = await fetch("https://g.jina.ai/", {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          statement,
          deepdive
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jina Fact-Check API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(data, null, 2)
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

// READ LOCAL FILE TOOL
server.tool(
  "jina_reader_list",
  "Read and list content from a local file",
  {
    filePath: z.string().describe("Path to the local file to read"),
    encoding: z.string()
      .optional()
      .default("utf-8")
      .describe("File encoding")
  },
  async ({ filePath, encoding }) => {
    try {
      const fullPath = path.resolve(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, encoding);
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
    // Check for API key (now optional)
    const apiKey = getJinaApiKey();
    if (apiKey) {
      console.error(`Jina AI API key found with length ${apiKey.length}`);
      if (apiKey.length < 10) {
        console.warn("Warning: JINA_API_KEY seems too short. Please verify your API key.");
      }
    } else {
      console.error("No Jina AI API key found. Some features may be limited.");
    }

    // Connect the server to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
  } catch (error) {
    console.error("Server error:", error);
    process.exit(1);
  }
}

// Execute the main function
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});