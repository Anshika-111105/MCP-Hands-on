// File: src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as dotenv from "dotenv";

// Initialize local environmental configurations
dotenv.config();

/**
 * Initialize the base Model Context Protocol server node runtime container.
 */
const server = new Server(
  {
    name: "openai-bootcamp-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {}, // Advertise functional tool calling abilities up standard client pipelines
    },
  }
);

/**
 * STEP 1: Discovery Interface Registration
 * Exposes structural function schemas to connecting AI clients on initial interface handshakes.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "compute_revenue_projection",
        description: "Performs standard compounded enterprise revenue modeling computations over local systems calculation blocks. Ideal for building custom projections based on historical growth variables.",
        inputSchema: {
          type: "object",
          properties: {
            baseRevenue: {
              type: "number",
              description: "The starting financial baseline revenue value (e.g., 1000000)."
            },
            annualGrowthRate: {
              type: "number",
              description: "The growth multiplier coefficient formatted as a decimal fraction (e.g., 0.15 for 15%)."
            },
            projectionYears: {
              type: "number",
              description: "The duration profile length expressed as an integer count of years (e.g., 5)."
            }
          },
          required: ["baseRevenue", "annualGrowthRate", "projectionYears"]
        }
      }
    ]
  };
});

/**
 * STEP 2: Execution Router Matrix
 * Catches validated tool triggers, extracts input variables, and computes calculation streams locally.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== "compute_revenue_projection") {
    throw new Error(`Target function engine could not be resolved inside this server node: ${name}`);
  }

  // Safe variable parsing and validation mapping routines
  const baseRev = Number(args?.baseRevenue);
  const growthRate = Number(args?.annualGrowthRate);
  const years = Number(args?.projectionYears);

  if (isNaN(baseRev) || isNaN(growthRate) || isNaN(years)) {
    return {
      content: [{ type: "text", text: "Validation Failure: Arguments must evaluate to valid operational numbers." }],
      isError: true
    };
  }

  try {
    console.error(`[Bootcamp MCP] Running compounded growth matrices locally over ${years} sequential intervals.`);
    
    // Execute local mathematical formula array tracking structures
    const compoundingFactor = Math.pow(1 + growthRate, years);
    const finalProjectedValue = baseRev * compoundingFactor;
    const absoluteNetGrowthDelta = finalProjectedValue - baseRev;

    // Construct and return structured data payload results straight back to the client
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            initialBaseline: baseRev,
            compoundedRateApplied: `${growthRate * 100}%`,
            timelineYears: years,
            modeledProjectedRevenue: Number(finalProjectedValue.toFixed(2)),
            netGrowthCalculated: Number(absoluteNetGrowthDelta.toFixed(2))
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (err: any) {
    console.error(`[Bootcamp Exception] Local logic module broke down:`, err.message);
    return {
      content: [{ type: "text", text: `Execution Exception encountered: ${err.message}` }],
      isError: true
    };
  }
});

/**
 * STEP 3: Transport Initialization Pipeline
 */
async function startBootcampServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenAI Bootcamp MCP Server active, listening for pipeline payloads across stdio hooks.");
}

startBootcampServer().catch((error) => {
  console.error("Fatal application loop crash on main orchestration logic thread:", error);
  process.exit(1);
});