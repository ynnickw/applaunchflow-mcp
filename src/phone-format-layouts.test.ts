import assert from "node:assert/strict";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createAppLaunchFlowServer } from "./index.js";

const project = "00000000-0000-4000-8000-000000000001";
test("format editing, reset and full-map saves survive real MCP schema validation and receipt checks", async (t) => {
  const writes: Record<string, unknown>[] = [];
  t.mock.method(globalThis, "fetch", async (_input: unknown, init?: RequestInit) => {
    if (!init?.method || init.method === "GET") return Response.json({mobile_layout: {screens: []}, format_layouts: {"ios-duo-inner": {screens: []}}});
    const body = JSON.parse(String(init.body));
    writes.push(body);
    return Response.json({success: true});
  });
  const server = createAppLaunchFlowServer({baseUrl: "https://dashboard.applaunchflow.com", token: "synthetic-local-test"}, {hosted: true});
  const client = new Client({name: "phone-format-test", version: "1"});
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
  try {
    const tools = (await client.listTools()).tools;
    assert.match(JSON.stringify(tools.find(x=>x.name === "transform_layout")?.inputSchema), /formatId/);
    const target = {generationId: project, language: "en"};
    const unread = await client.callTool({name: "transform_layout", arguments: {...target, formatId: "ios-duo-inner", resetFormat: true}});
    assert.equal(unread.isError, true);
    assert.equal(writes.length, 0);
    for (const input of [
      {formatId: "ios-duo-inner", operations: [{type: "update_node", target: {nodeType: "screen"}, changes: {backgroundColor: "#ffffff"}}]},
      {formatId: "ios-duo-inner", resetFormat: true},
    ]) {
      const read = await client.callTool({name: "get_layout", arguments: target});
      const data = (read.structuredContent as {data: {readReceipt?: string}}).data;
      const result = await client.callTool({name: "transform_layout", arguments: {...target, ...input, readReceipt: data.readReceipt}});
      assert.notEqual(result.isError, true);
      assert.equal(writes.at(-1)?.formatId, "ios-duo-inner");
      assert.match(JSON.stringify(result.structuredContent), /format=ios-duo-inner/);
    }
    const saved = await client.callTool({name: "save_layout", arguments: {...target, mobileLayout: {screens: []}, tabletLayout: {screens: []}, formatLayouts: {}}});
    assert.notEqual(saved.isError, true);
    assert.deepEqual(writes.at(-1)?.formatLayouts, {});
    const bad = await client.callTool({name: "transform_layout", arguments: {...target, formatId: "arbitrary-column", operations: []}});
    assert.equal(bad.isError, true);
  } finally {await client.close(); await server.close();}
});
