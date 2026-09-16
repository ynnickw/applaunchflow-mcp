import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";

export function registerReviewSnapshotTools(server: McpServer, client: AppLaunchFlowClient) {
  server.registerTool("store_review_snapshot", {
    title: "Send Rendered Preview for Review",
    description: "App-only: temporarily store the PNG rendered by the edit-result widget after the user clicks Review. Does not render on the server or modify any design or library asset.",
    inputSchema: z.object({ projectId: z.string().uuid(), png: z.string().max(4_000_000) }).strict(),
    _meta: { ui: { visibility: ["app"] }, "openai/widgetAccessible": true, "openai/visibility": "private" },
  }, async ({ projectId, png }) => {
    try {
      const data = await client.requestJson<{ snapshotId: string }>("/api/mcp/review-snapshot", { method: "POST", body: { action: "store", projectId, png } });
      return ok({ projectId, snapshotId: z.string().uuid().parse(data.snapshotId) }, "Rendered preview ready for image review");
    } catch {
      return fail(new Error("Could not send the rendered preview. Check project access and retry Review."));
    }
  });
  server.registerTool("view_review_snapshot", {
    title: "View Rendered Edit",
    description: "Retrieve actual PNG image pixels rendered by the user's edit-result widget. Call this when the widget's review message provides projectId and snapshotId; inspect the returned image, not layout JSON. Snapshots expire after 15 minutes and only the uploading user can read them. This does not modify the design.",
    inputSchema: z.object({ projectId: z.string().uuid(), snapshotId: z.string().uuid() }).strict(),
  }, async ({ projectId, snapshotId }) => {
    try {
      const data = await client.requestJson<{ png: string; mimeType: string }>("/api/mcp/review-snapshot", { method: "POST", body: { action: "read", projectId, snapshotId } });
      if (data.mimeType !== "image/png" || !data.png || data.png.length > 4_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.png)) throw new Error("Invalid snapshot");
      return { content: [{ type: "image" as const, data: data.png, mimeType: "image/png" }], structuredContent: { success: true, data: { projectId, snapshotId }, message: "Rendered edit image" } };
    } catch {
      return fail(new Error("Snapshot unavailable or expired. Ask the user to click Review this result again."));
    }
  });
}
