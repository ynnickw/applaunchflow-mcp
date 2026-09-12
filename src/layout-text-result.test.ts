import assert from "node:assert/strict";
import test from "node:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppLaunchFlowClient } from "./client/api.js";
import { registerLayoutTools } from "./tools/layouts.js";

test("text-only hosted clients can read a layout and pass its receipt to a matching edit", async () => {
  const previous = process.env.APPLAUNCHFLOW_MCP_REMOTE;
  process.env.APPLAUNCHFLOW_MCP_REMOTE = "1";
  try {
    const server = new McpServer({ name: "layout-test", version: "1" });
    let writes = 0;
    const layout = {
      mobileLayout: { screens: [{ id: "screen-one", children: [] }] },
    };
    registerLayoutTools(server, {
      credentials: {
        token: "synthetic-test-token",
        baseUrl: "http://localhost:3000",
      },
      getLayout: async () => layout,
      transformLayout: async () => {
        writes++;
        return { success: true };
      },
    } as unknown as AppLaunchFlowClient);
    // Model a host exposing only text blocks, not structuredContent, to its agent.
    const handlers = (
      server as unknown as {
        _registeredTools: Record<string, { handler: Function }>;
      }
    )._registeredTools;
    const target = {
      generationId: "00000000-0000-4000-8000-000000000001",
      language: "en",
    };
    const read = await handlers.get_layout.handler(target, {});
    const text = read.content.map((c: { text: string }) => c.text).join("\n");
    const start = text.indexOf("{\n");
    assert.notEqual(
      start,
      -1,
      "layout and receipt must be available in text fallback",
    );
    const data = JSON.parse(text.slice(start));
    assert.deepEqual(data.layout, layout);
    assert.equal(data.readReceipt, read.structuredContent.data.readReceipt);
    assert.equal(text.includes("synthetic-test-token"), false);
    const edit = {
      ...target,
      operations: [
        {
          type: "update_node",
          target: { nodeType: "screenshot", screens: [0] },
          changes: { path: "library/screen.png" },
        },
      ],
      readReceipt: data.readReceipt,
    };
    const wrong = await handlers.transform_layout.handler(
      { ...edit, language: "de" },
      {},
    );
    assert.equal(wrong.isError, true);
    assert.equal(writes, 0);
    const result = await handlers.transform_layout.handler(edit, {});
    assert.notEqual(result.isError, true);
    assert.equal(writes, 1);
    await server.close();
  } finally {
    if (previous === undefined) delete process.env.APPLAUNCHFLOW_MCP_REMOTE;
    else process.env.APPLAUNCHFLOW_MCP_REMOTE = previous;
  }
});
