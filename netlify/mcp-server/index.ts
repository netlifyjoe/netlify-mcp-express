import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolResult,
  GetPromptResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";


import {createClient} from 'contentful-management'


export const setupMCPServer = (): McpServer => {

  const server = new McpServer(
    {
      name: "stateless-server",
      version: "1.0.0",
    },
    { capabilities: { logging: {} } }
  );

  const client = createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN!
  })

  server.tool(
    "update-contentful-entry",
    "Updates a specific entry in contentful",
    {
      content: z
        .string()
        .describe("The new content for the entry"),
      entryId: z
        .string()
        .describe("The contentful entry ID"),
      field: z.
        string()
        .describe("The contentful field"),
    },
    async (
      { content, entryId, field },
      _ctx
    ): Promise<CallToolResult> => {
      const spaceId = process.env.CONTENTFUL_SPACE_ID;
      const environmentId = process.env.CONTENTFUL_ENVIRONMENT_ID || "master";
      
      if (!spaceId || !environmentId) {
        throw new Error("Missing Contentful credentials: check CONTENTFUL_SPACE_ID and CONTENTFUL_ENVIRONMENT_ID");
      }

      try {
        const space = await client.getSpace(spaceId);
        const environment = await space.getEnvironment(environmentId);
        const entry = await environment.getEntry(entryId);
        entry.fields[field] = { 'en-US': content };
        const updatedEntry = await entry.update();
        await updatedEntry.publish();
        return {
          content: [
            {
              type: "text",
              text: `Entry ${entryId} field '${field}' updated and published successfully.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to update entry: ${error.message}`,
            },
          ],
        };
      }
    }
  );


  return server;
};
