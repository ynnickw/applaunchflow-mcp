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
        "Lists screenshot folders with explicit device, platform and optional locale bindings. Folder names do not imply language. Read-only.",
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
        "Globally replaces an asset, updates its saved-design references and permanently deletes the old storage object. The replacement affects every referenced design and cannot be undone.",
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
        "Permanently removes the specified asset records and storage objects. Saved-design references block deletion. This action cannot be undone.",
      schema: { projectId, paths },
    },
    {
      tool: "create_asset_folder",
      action: "create_folder",
      description:
        "Creates a screenshot folder for an explicit device and platform, optionally bound to a locale. A caller-supplied UUID folderId makes retries reuse the same folder. Storage paths and saved designs are unchanged.",
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
        "Sets a screenshot folder's explicit language code, or clears its locale binding with null. Does not infer language from the folder name or alter saved designs.",
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
        "Renames a screenshot folder. Its ID, locale binding, asset storage paths and saved designs are unchanged.",
      schema: { projectId, folderId, name },
    },
    {
      tool: "delete_asset_folder",
      action: "delete_folder",
      description:
        "Deletes a screenshot folder and ungroups its files. Does not delete asset files, storage objects or saved-design references.",
      schema: { projectId, folderId },
    },
    {
      tool: "move_assets",
      action: "move",
      description:
        "Groups screenshot assets in a folder with the same device and platform, or ungroups them when folderId is null. Storage paths and saved designs are unchanged.",
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
