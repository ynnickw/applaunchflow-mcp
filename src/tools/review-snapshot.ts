import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";

export function registerReviewSnapshotTools(
  server: McpServer,
  client: AppLaunchFlowClient,
) {
  server.registerTool(
    "store_review_snapshot",
    {
      title: "Send Rendered Preview for Review",
      description:
        "App-only: temporarily stores a PNG rendered by the edit-result widget for visual review. Does not render on the server or modify a design or library asset.",
      inputSchema: z
        .object({
          projectId: z.string().uuid(),
          png: z.string().max(4_000_000),
        })
        .strict(),
      _meta: {
        ui: { visibility: ["app"] },
        "openai/widgetAccessible": true,
        "openai/visibility": "private",
      },
    },
    async ({ projectId, png }) => {
      try {
        const data = await client.requestJson<{ snapshotId: string }>(
          "/api/mcp/review-snapshot",
          { method: "POST", body: { action: "store", projectId, png } },
        );
        return ok(
          { projectId, snapshotId: z.string().uuid().parse(data.snapshotId) },
          "Rendered preview ready for image review",
        );
      } catch {
        return fail(
          new Error(
            "Could not send the rendered preview. Check project access and retry Review.",
          ),
        );
      }
    },
  );
  server.registerTool(
    "view_review_snapshot",
    {
      title: "View Rendered Edit",
      description:
        "Returns actual PNG pixels previously uploaded by the edit-result widget for the specified project and snapshot ID. Only the uploading user can access the snapshot, which expires after fifteen minutes. Does not modify a design.",
      inputSchema: z
        .object({ projectId: z.string().uuid(), snapshotId: z.string().uuid() })
        .strict(),
    },
    async ({ projectId, snapshotId }) => {
      try {
        const data = await client.requestJson<{
          png: string;
          mimeType: string;
        }>("/api/mcp/review-snapshot", {
          method: "POST",
          body: { action: "read", projectId, snapshotId },
        });
        if (
          data.mimeType !== "image/png" ||
          !data.png ||
          data.png.length > 4_000_000 ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(data.png)
        )
          throw new Error("Invalid snapshot");
        // Return the pixels as the result, not a competing JSON success envelope.
        return {
          content: [
            { type: "image" as const, data: data.png, mimeType: "image/png" },
          ],
        };
      } catch {
        return fail(
          new Error(
            "Snapshot unavailable or expired. Ask the user to click Review this result again.",
          ),
        );
      }
    },
  );
}
