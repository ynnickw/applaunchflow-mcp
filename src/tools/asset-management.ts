import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";

const projectId = z.string().uuid();
const paths = z.array(z.string().min(1).max(1024)).min(1).max(50);
const folderId = z.string().uuid();
const name = z.string().trim().min(1).max(60);
export function registerAssetManagementTools(
  server: McpServer,
  client: AppLaunchFlowClient,
) {
  server.registerTool(
    "list_asset_folders",
    {
      title: "List Asset Folders",
      description:
        "List logical asset folders, membership and recoverable removed files. Shared by the dashboard and MCP. Does not modify anything.",
      inputSchema: {
        projectId,
        offset: z.number().int().min(0).max(100000).optional(),
      },
      _meta: { "openai/widgetAccessible": true },
    },
    async ({ projectId, offset }) => {
      try {
        const data = await client.requestJson<{
          projectId: string;
          assets: Array<Record<string, unknown>>;
          organization: unknown;
          nextOffset: number | null;
        }>("/api/assets/manage", { query: { projectId, offset } });
        return {
          ...ok(
            {
              projectId,
              organization: data.organization,
              nextOffset: data.nextOffset,
              assets: data.assets.map(({ previewUrl, ...asset }) => asset),
            },
            "Fetched asset folders",
          ),
          _meta: { assetLibrary: data },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );
  const operations: Array<{
    tool: string;
    action: string;
    description: string;
    schema: z.ZodRawShape;
  }> = [
    {
      tool: "delete_assets",
      action: "delete",
      description:
        "Remove explicitly selected unused assets from the library. In-use files are blocked. Recoverable: bytes remain in storage; this does not reclaim storage space.",
      schema: { projectId, paths },
    },
    {
      tool: "restore_assets",
      action: "restore",
      description:
        "Restore files previously removed from the asset library. Does not change any saved design.",
      schema: { projectId, paths },
    },
    {
      tool: "replace_asset",
      action: "replace",
      description:
        "Replace one library asset with an already uploaded file in the same category. Upload the new file first and use its returned path. Keeps folder membership and preserves the original in existing designs. This does NOT overwrite bytes or update existing designs. Retry using the same paths after an uncertain response.",
      schema: { projectId, path: z.string(), replacementPath: z.string() },
    },
    {
      tool: "create_asset_folder",
      action: "create_folder",
      description:
        "Create a logical folder across asset types. Supply a new UUID folderId and reuse it for retries. Storage paths do not change.",
      schema: { projectId, folderId, name },
    },
    {
      tool: "rename_asset_folder",
      action: "rename_folder",
      description:
        "Rename an existing logical asset folder. Does not rename or modify files.",
      schema: { projectId, folderId, name },
    },
    {
      tool: "delete_asset_folder",
      action: "delete_folder",
      description:
        "Remove an explicitly selected folder. Its files become ungrouped; no files are deleted.",
      schema: { projectId, folderId },
    },
    {
      tool: "move_assets",
      action: "move",
      description:
        "Move assets into a logical folder, or pass null to ungroup them. Never changes storage paths or saved designs.",
      schema: { projectId, paths, folderId: folderId.nullable() },
    },
  ];
  for (const operation of operations) {
    server.registerTool(
      operation.tool,
      {
        title: operation.tool.replaceAll("_", " "),
        description: operation.description,
        inputSchema: operation.schema,
      },
      async (args) => {
        try {
          const body = {
            ...args,
            action: operation.action,
            ...(operation.action === "replace" ? { paths: [args.path] } : {}),
          };
          return ok(
            await client.requestJson("/api/assets/manage", {
              method: "POST",
              body,
            }),
            "Asset library updated",
          );
        } catch (error) {
          return fail(error);
        }
      },
    );
  }
  server.registerTool(
    "manage_asset_library",
    {
      title: "Manage Asset Library",
      description:
        "App-only asset library actions after an explicit user interaction. Never updates existing designs or destroys stored bytes.",
      inputSchema: {
        projectId,
        action: z.enum([
          "create_folder",
          "rename_folder",
          "delete_folder",
          "move",
          "delete",
          "restore",
          "replace",
        ]),
        paths: paths.optional(),
        folderId: folderId.nullable().optional(),
        name: name.optional(),
        replacementPath: z.string().optional(),
      },
      _meta: {
        ui: { visibility: ["app"] },
        "openai/widgetAccessible": true,
        "openai/visibility": "private",
      },
    },
    async (body) => {
      try {
        return ok(
          await client.requestJson("/api/assets/manage", {
            method: "POST",
            body,
          }),
          "Asset library updated",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
