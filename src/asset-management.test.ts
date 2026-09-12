import assert from "node:assert/strict";
import test from "node:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppLaunchFlowClient } from "./client/api.js";
import { registerAssetManagementTools } from "./tools/asset-management.js";

test("asset tools use the shared API, do not expose signed previews, and forward exact replacement paths", async () => {
  const handlers = new Map<
    string,
    (args: Record<string, unknown>) => Promise<any>
  >();
  const calls: unknown[] = [];
  const projectId = "00000000-0000-4000-8000-000000000001";
  registerAssetManagementTools(
    {
      registerTool: (
        name: string,
        _meta: unknown,
        handler: (args: Record<string, unknown>) => Promise<any>,
      ) => handlers.set(name, handler),
    } as unknown as McpServer,
    {
      requestJson: async (path: string, options: { method?: string }) => {
        calls.push({ path, options });
        return options.method
          ? { success: true }
          : {
              projectId,
              assets: [
                {
                  path: "illustrations/a.png",
                  previewUrl: "https://private.test?token=secret",
                },
              ],
              organization: { folders: [] },
              nextOffset: null,
            };
      },
    } as unknown as AppLaunchFlowClient,
  );
  const listing = await handlers.get("list_asset_folders")!({ projectId });
  assert.ok(!JSON.stringify(listing.structuredContent).includes("secret"));
  assert.ok(JSON.stringify(listing._meta).includes("secret"));
  await handlers.get("replace_asset")!({
    projectId,
    path: "illustrations/a.png",
    replacementPath: "illustrations/b.png",
  });
  assert.deepEqual((calls[1] as any).options.body.paths, [
    "illustrations/a.png",
  ]);
  assert.equal(
    (calls[1] as any).options.body.replacementPath,
    "illustrations/b.png",
  );
  assert.equal(handlers.size, 9);
});
