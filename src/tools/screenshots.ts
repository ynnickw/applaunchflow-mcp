import { Buffer } from "node:buffer";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";

export function registerScreenshotTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "generate_layouts",
    {
      title: "Generate Layouts",
      description:
        "Generate screenshot layouts for a project. " +
        "For existing projects, pass generationId (same as projectId) — the API fetches screenshots from storage automatically. " +
        "Do NOT pass screenshots when using generationId. " +
        "Only pass metadata + screenshots (without generationId) for the ephemeral upload flow. " +
        "Do NOT pass variantId — omit it so a new variant is always created. Never overwrite an existing variant. " +
        "Do not use this tool for small edits to an existing layout; use transform_layout instead.",
      inputSchema: {
        generationId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "The project/generation UUID. When provided, the API loads screenshots from storage and saves results to DB. This is the primary way to call this tool for existing projects.",
          ),
        projectId: z
          .string()
          .uuid()
          .optional()
          .describe("Only needed for the upload flow (without generationId) to sign screenshot paths."),
        metadata: z
          .record(z.any())
          .optional()
          .describe("App metadata. Required only when generationId is NOT provided (upload flow)."),
        screenshots: z
          .array(
            z.object({
              path: z.string().optional(),
              url: z.string().optional(),
              filename: z.string().optional(),
            }),
          )
          .optional()
          .describe(
            "Screenshot list. Required only when generationId is NOT provided. Do NOT send when using generationId.",
          ),
        templateId: z.string().optional(),
        deviceType: z.enum(["phone", "tablet", "desktop"]).optional(),
        variantId: z
          .string()
          .uuid()
          .optional()
          .describe("DO NOT pass this. Always omit so a new variant is created. Never overwrite existing variants."),
      },
    },
    async (args) => {
      try {
        return ok(await client.generateLayouts(args), "Generated layouts");
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "list_screenshots",
    {
      title: "List Screenshots",
      description: "List uploaded screenshot paths for a project",
      inputSchema: {
        projectId: z.string().uuid(),
        deviceType: z.enum(["mobile", "tablet", "desktop"]).optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ projectId, deviceType, platform }) => {
      try {
        return ok(
          await client.listScreenshots({ projectId, deviceType, platform }),
          "Listed screenshots",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "view_screenshot",
    {
      title: "View Screenshot",
      description:
        "Fetch a screenshot image and return it for visual analysis. " +
        "Use this to inspect screenshots — extract colors, read UI text, understand layout context, or identify visual elements. " +
        "Pass projectId and the relative path from list_screenshots or get_layout (e.g. 'mobile/ios/1234-image.PNG').",
      inputSchema: {
        projectId: z.string().uuid().describe("The project UUID."),
        path: z
          .string()
          .describe("Relative screenshot path (e.g. 'mobile/ios/1234-IMG.PNG') from list_screenshots or the layout's screenshot.path field."),
      },
    },
    async ({ projectId, path }) => {
      try {
        const fullPath = `${projectId}/${path}`;
        const previewUrl = `${client.credentials.baseUrl}/api/preview?path=${encodeURIComponent(fullPath)}&w=320`;

        const headers = new Headers();
        headers.set(
          "Cookie",
          `${client.credentials.cookieName}=${client.credentials.token}`,
        );
        headers.set("Authorization", `Bearer ${client.credentials.token}`);

        const response = await fetch(previewUrl, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const mimeType = response.headers.get("content-type") || "image/png";
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        return {
          content: [
            {
              type: "image" as const,
              data: base64,
              mimeType,
            },
          ],
        };
      } catch (error) {
        return fail(error);
      }
    },
  );
}
