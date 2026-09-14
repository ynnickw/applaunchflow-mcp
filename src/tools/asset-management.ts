import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";
import { assetSummary } from "./asset-summary.js";

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
        "List device/platform-scoped screenshot folders, their explicit locales and memberships. Shared by the dashboard and MCP. Does not modify anything.",
      inputSchema: z.object({
        projectId,
        offset: z.number().int().min(0).max(100000).optional(),
      }),
      _meta: { "openai/widgetAccessible": true },
    },
    async ({ projectId, offset }) => {
      try {
        const data = await client.requestJson<{
          projectId: string;
          assets: Array<Record<string, unknown>>;
          organization: unknown;
          nextOffset: number | null;
        }>("/api/assets/folders", { query: { projectId, offset } });
        return {
          ...ok(
            {
              projectId,
              organization: assetSummary(data.organization),
              nextOffset: data.nextOffset,
              assets: assetSummary(data.assets),
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
      tool: "replace_asset",
      action: "replace",
      description:
        "Replace an asset with an already uploaded file in the same category/device/platform. Explicitly updates all saved-design references and preserves folder membership, then permanently deletes the old file from storage. No restore. Upload the new file first. On partial failure both files are retained until cleanup succeeds; inspect the result and retry the same paths.",
      schema: {
        projectId,
        path: z.string().min(1).max(1024),
        replacementPath: z.string().min(1).max(1024),
      },
    },
    {
      tool: "delete_assets",
      action: "delete",
      description:
        "Permanently delete explicitly selected unused assets from storage. Files referenced by any saved design are blocked. There is no restore.",
      schema: { projectId, paths },
    },
    {
      tool: "create_asset_folder",
      action: "create_folder",
      description:
        "Create a screenshot folder within the specified device and platform. Optionally bind it to an explicit locale. Supply a new UUID folderId and reuse it for retries. Storage paths do not change.",
      schema: {
        projectId,
        folderId,
        name,
        deviceType: z.enum(["mobile", "tablet", "desktop", "watch"]),
        platform: z.enum(["ios", "android"]),
        locale: z
          .string()
          .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
          .nullable()
          .optional(),
      },
    },
    {
      tool: "set_asset_folder_locale",
      action: "set_locale",
      description:
        "Bind a screenshot folder to an explicit language code, or pass null to clear the binding. Folder names do not determine language.",
      schema: {
        projectId,
        folderId,
        locale: z
          .string()
          .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
          .nullable(),
      },
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
        "Move screenshot assets into a folder with the same device and platform, or pass null to ungroup them. Never changes storage paths or saved designs.",
      schema: { projectId, paths, folderId: folderId.nullable() },
    },
  ];
  for (const operation of operations) {
    server.registerTool(
      operation.tool,
      {
        title: operation.tool.replaceAll("_", " "),
        description: operation.description,
        inputSchema: z.object(operation.schema),
      },
      async (args) => {
        try {
          const body = {
            ...args,
            action: operation.action,
          };
          return ok(
            await client.requestJson("/api/assets/folders", {
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
}
