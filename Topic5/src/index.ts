// File: src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
if (!SERPAPI_API_KEY) {
  console.error("CRITICAL ERROR: The SERPAPI_API_KEY environment variable is mandatory.");
  process.exit(1);
}

// Instantiate the base Model Context Protocol tracking container infrastructure
const server = new Server(
  {
    name: "serpapi-realtime-search-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {}, // Advertise real-time tool calling capability up connection pipelines
    },
  }
);

/**
 * Step 1: Tool Interface Declaration (Dynamic Discovery)
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "google_live_search",
        description: "Queries Google via SerpApi to extract real-time web results, organic search snippets, and fresh informational data maps.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The raw text search parameters query string to execute (e.g., 'AAPL stock price today' or 'MCP protocol releases')."
            },
            numResults: {
              type: "number",
              description: "The maximum number of organic snippet items to return (Default 5, Max cap 10)."
            }
          },
          required: ["query"]
        }
      }
    ]
  };
});

/**
 * Step 2: Tool Execution Matrix (Parsing Search Results)
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== "google_live_search") {
    throw new Error(`The requested tool execution logic cannot be matched: ${name}`);
  }

  const searchString = args?.query as string;
  const maxItems = (args?.numResults as number) || 5;

  if (!searchString) {
    return {
      content: [{ type: "text", text: "Validation Failure: The search query string parameter is missing." }],
      isError: true
    };
  }

  try {
    console.error(`[SerpApi MCP] Querying live search index for parameters: [${searchString}]`);
    
    // Direct query routing payload out to the SerpApi REST endpoint
    const response = await axios.get("https://serpapi.com/search", {
      params: {
        q: searchString,
        engine: "google",
        api_key: SERPAPI_API_KEY
      }
    });

    // Extract organic data result lists, slicing entries down to protect memory bounds
    const organicResults = response.data?.organic_results || [];
    const truncatedResults = organicResults.slice(0, Math.min(maxItems, 10)).map((item: any) => ({
      position: item.position,
      title: item.title,
      sourceUrl: item.link,
      snippetSummary: item.snippet || "No summary description text returned by index layer."
    }));

    // package up sanitized string array objects and return straight to the agent context pool
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            executedQueryString: searchString,
            totalOrganicMatches: organicResults.length,
            extractedResults: truncatedResults
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error: any) {
    console.error(`[SerpApi Exception] Live search index transaction failed:`, error?.response?.data || error.message);
    return {
      content: [{ type: "text", text: `Search API routing exception: ${error?.response?.data?.error || error.message}` }],
      isError: true
    };
  }
});

/**
 * Step 3: Run the Server via Stdio Transport
 */
async function startSearchMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SerpApi Real-Time Search MCP Server online, monitoring stdio streams safely.");
}

startSearchMcpServer().catch((err) => {
  console.error("Fatal error encountered inside master framework execution loop:", err);
  process.exit(1);
});