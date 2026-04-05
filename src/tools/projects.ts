import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

export function registerProjectTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "list_projects",
    {
      title: "List Projects",
      description: "List AppLaunchFlow projects for the authenticated user",
    },
    async () => {
      try {
        return ok(await client.listProjects(), "Fetched projects");
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_project",
    {
      title: "Get Project",
      description: "Get the full hub state for a project",
      inputSchema: {
        projectId: z.string().uuid(),
      },
    },
    async ({ projectId }) => {
      try {
        return ok(await client.getProject(projectId), "Fetched project");
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "create_project",
    {
      title: "Create Project",
      description:
        "Create a new AppLaunchFlow project. Only app name and platform are required. " +
        "Autofill category and description from context when possible — do not ask the user for these unless genuinely ambiguous.",
      inputSchema: {
        appName: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .describe("The app name."),
        platform: z
          .enum(["ios", "android", "both"])
          .optional()
          .describe("Target platform. Defaults to iOS."),
        category: z
          .string()
          .trim()
          .max(120)
          .optional()
          .describe(
            "App category. Infer from the app name/context when possible (e.g. 'Travel' for a flight app).",
          ),
        appDescription: z
          .string()
          .trim()
          .max(4000)
          .optional()
          .describe(
            "Brief app description. Infer from context when possible.",
          ),
        defaultDeviceType: z
          .enum(["phone", "tablet", "desktop", "watch"])
          .optional()
          .describe("Defaults to phone. Only set if the user explicitly asks."),
        logoPath: z
          .string()
          .optional()
          .describe(
            "Optional stored logo path from upload_screenshots when fileType=logo.",
          ),
        metadata: z
          .record(z.any())
          .optional()
          .describe("Advanced escape hatch for extra metadata fields."),
      },
    },
    async (args) => {
      try {
        const platform = args.platform || "ios";

        const metadata = stripUndefined({
          ...(args.metadata || {}),
          appName: args.appName,
          platform,
          category: args.category,
          appDescription: args.appDescription,
          defaultDeviceType: args.defaultDeviceType || "phone",
          logoPath: args.logoPath,
        });

        const requestBody = stripUndefined({
          name: args.appName,
          platform,
          metadata,
        });

        const created = await client.createProject(requestBody);

        return ok(
          {
            project: created.project,
            nextRecommendedStep: "upload_screenshots",
          },
          "Created project",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "delete_project",
    {
      title: "Delete Project",
      description: "Delete a project",
      inputSchema: {
        projectId: z.string().uuid(),
      },
    },
    async ({ projectId }) => {
      try {
        return ok(await client.deleteProject(projectId), "Deleted project");
      } catch (error) {
        return fail(error);
      }
    },
  );
}
