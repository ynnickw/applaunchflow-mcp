import assert from "node:assert/strict";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createAppLaunchFlowServer } from "./index.js";

test("review snapshots expose an app-only upload and return image content to the model", async (t) => {
  const projectId = "00000000-0000-4000-8000-000000000001";
  const snapshotId = "00000000-0000-4000-8000-000000000099";
  let denied = false;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(input), "https://dashboard.applaunchflow.com/api/mcp/review-snapshot");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer snapshot-user");
    if (denied) return Response.json({ error: "private diagnostic" }, { status: 403 });
    const body = JSON.parse(String(init?.body));
    assert.equal(body.projectId, projectId);
    if (body.action === "store") return Response.json({ snapshotId });
    assert.equal(body.snapshotId, snapshotId);
    return Response.json({ png: "iVBORw0KGgo=", mimeType: "image/png" });
  });
  const server = createAppLaunchFlowServer({ baseUrl: "https://dashboard.applaunchflow.com", token: "snapshot-user" }, { hosted: true });
  const client = new Client({ name: "snapshot-test", version: "1" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
  try {
    const { tools } = await client.listTools();
    const upload = tools.find((tool) => tool.name === "store_review_snapshot")!;
    assert.deepEqual((upload._meta?.ui as { visibility: string[] }).visibility, ["app"]);
    assert.equal(tools.find((tool) => tool.name === "view_review_snapshot")?.annotations?.readOnlyHint, true);
    const stored = await client.callTool({ name: "store_review_snapshot", arguments: { projectId, png: "iVBORw0KGgo=" } });
    assert.equal(stored.isError, undefined);
    assert.doesNotMatch(JSON.stringify(stored), /iVBORw0KGgo/);
    const read = await client.callTool({ name: "view_review_snapshot", arguments: { projectId, snapshotId } });
    assert.deepEqual(read.content, [{ type: "image", data: "iVBORw0KGgo=", mimeType: "image/png" }]);
    denied = true;
    const failed = await client.callTool({ name: "view_review_snapshot", arguments: { projectId, snapshotId } });
    assert.equal(failed.isError, true);
    assert.doesNotMatch(JSON.stringify(failed), /private diagnostic/);
  } finally {
    await client.close();
    await server.close();
  }
});
