// File: src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const PHANTOMBUSTER_API_KEY = process.env.PHANTOMBUSTER_API_KEY;
if (!PHANTOMBUSTER_API_KEY) {
  console.error("CRITICAL SETUP EXCEPTION: PHANTOMBUSTER_API_KEY environment variable is missing.");
  process.exit(1);
}

// Instantiate the base MCP runtime container metadata layer
const server = new Server(
  {
    name: "phantombuster-automation-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {}, // Signal tool-calling orchestration capacity to matching AI clients
    },
  }
);

/**
 * Discovery Interface Definition: Registering Cloud Automation Actions
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "launch_phantom_automation",
        description: "Asynchronously triggers a cloud-hosted Phantombuster browser automation pipeline or data extraction script (Phantom) and monitors execution progress to return clean datasets.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The unique target ID profile of the cloud Phantom agent routine to initiate (e.g., '1234567890123456')."
            },
            argument: {
              type: "object",
              description: "The runtime JSON options mapping passed directly into the browser instance (e.g., { spreadsheetUrl: 'https://docs.google.com/...' })."
            }
          },
          required: ["id"]
        }
      }
    ]
  };
});

/**
 * Execution Routing Matrix: Cloud Trigger and Polling Hooks
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== "launch_phantom_automation") {
    throw new Error(`Requested tool handler logic cannot be located: ${name}`);
  }

  const phantomId = args?.id as string;
  const targetPayload = args?.argument as Record<string, any> || {};

  try {
    console.error(`[Phantombuster MCP] Activating remote cloud browser container instance ID: ${phantomId}`);
    
    // 1. Fire the initialization trigger to start processing
    const launchResponse = await axios.post(
      "https://api.phantombuster.com/v1/agent/launch",
      { id: phantomId, argument: targetPayload },
      { headers: { "X-Phantombuster-Key": PHANTOMBUSTER_API_KEY, "Content-Type": "application/json" } }
    );

    const containerRunId = launchResponse.data?.containerId;
    if (!containerRunId) {
      return {
        content: [{ type: "text", text: "Cloud routing anomaly: Remote execution framework failed to return a container reference identifier." }],
        isError: true
      };
    }

    console.error(`[Phantombuster MCP] Container run active. Handshake ID: ${containerRunId}. Starting status polling matrix...`);

    // 2. Perform a safe tracking loop to intercept job completion frames status
    let executionComplete = false;
    let failureCounter = 0;
    let statusTrackingData: any = null;

    while (!executionComplete && failureCounter < 12) {
      // Block and pause processing for 10 seconds between API status query intervals
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const statusCheck = await axios.get(
        `https://api.phantombuster.com/v1/container/fetch?id=${containerRunId}`,
        { headers: { "X-Phantombuster-Key": PHANTOMBUSTER_API_KEY } }
      );

      statusTrackingData = statusCheck.data;
      const numericStatusValue = Number(statusTrackingData?.status);

      // Phantombuster Status Codes: 1: Inactive, 2: Active, 3: Success, 4: Error, 5: Aborted
      if (numericStatusValue === 3) {
        executionComplete = true;
      } else if (numericStatusValue === 4 || numericStatusValue === 5) {
        return {
          content: [{ type: "text", text: `Cloud execution context terminated abruptly with status code flag: ${numericStatusValue}` }],
          isError: true
        };
      }
      
      failureCounter++;
    }

    if (!executionComplete) {
      return {
        content: [{ type: "text", text: "Timeout Threshold Exceeded: Cloud execution monitoring processing time window expired before completion." }],
        isError: true
      };
    }

    console.error(`[Phantombuster MCP] Job finished. Pulling structured file storage tables...`);

    // 3. Fetch final extracted files out from the completed storage context records
    const resultDownloadJson = await axios.get(
      `https://api.phantombuster.com/v1/container/fetch-resultObject?id=${containerRunId}`,
      { headers: { "X-Phantombuster-Key": PHANTOMBUSTER_API_KEY } }
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            phantomAgentId: phantomId,
            jobContainerId: containerRunId,
            outputDataset: resultDownloadJson.data?.resultObject || "No data objects returned by the script processing layer."
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error: any) {
    console.error(`[Phantombuster MCP Exception] Protocol gateway processing failed:`, error?.response?.data || error.message);
    return {
      content: [{ type: "text", text: `Cloud network exception: ${error?.response?.data?.message || error.message}` }],
      isError: true
    };
  }
});

async function initializeMcpPipe() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Phantombuster Cloud Automation MCP Server online, listening for workflow directives.");
}

initializeMcpPipe().catch((err) => {
  console.error("Fatal application lifecycle break down on main worker loop:", err);
  process.exit(1);
});