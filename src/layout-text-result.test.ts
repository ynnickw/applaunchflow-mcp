import assert from "node:assert/strict";
import test from "node:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppLaunchFlowClient } from "./client/api.js";
import { registerLayoutTools } from "./tools/layouts.js";
import { registerGraphicsTools } from "./tools/graphics.js";
import { registerPromoVideoTools } from "./tools/promovideo.js";
import { registerMockupTools } from "./tools/mockups.js";

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
    const listing = await handlers.get_layout.handler({ generationId: target.generationId }, {});
    assert.equal(listing.structuredContent.data.readBeforeEditSatisfied, false);
    assert.equal(listing.structuredContent.data.readReceipt, undefined);
    assert.match(listing.structuredContent.data.nextStep, /call get_layout again/);
    await server.close();
  } finally {
    if (previous === undefined) delete process.env.APPLAUNCHFLOW_MCP_REMOTE;
    else process.env.APPLAUNCHFLOW_MCP_REMOTE = previous;
  }
});

test("all guarded reads expose identical edit state to text-only clients", async () => {
  const previous = process.env.APPLAUNCHFLOW_MCP_REMOTE;
  process.env.APPLAUNCHFLOW_MCP_REMOTE = "1";
  const server = new McpServer({ name: "receipt-test", version: "1" });
  try {
    const fixture = { config: { headline: "Synthetic fixture" } };
    const client = {
      credentials: { token: "synthetic-test-token", baseUrl: "http://localhost:3000" },
      getGraphicsFormat: async () => fixture,
      getPromoVideo: async () => fixture,
      getMockupAnimation: async () => fixture,
      getLayout: async () => null,
    } as unknown as AppLaunchFlowClient;
    registerGraphicsTools(server, client);
    registerPromoVideoTools(server, client);
    registerMockupTools(server, client);
    registerLayoutTools(server, client);
    const handlers = (server as unknown as {
      _registeredTools: Record<string, { handler: Function }>;
    })._registeredTools;
    for (const tool of ["get_graphics_format", "get_promo_video", "get_mockup_animation"]) {
      const result = await handlers[tool].handler({
        generationId: "00000000-0000-4000-8000-000000000001", format: "og",
      }, {});
      const text = result.content.map((c: { text: string }) => c.text).join("\n");
      const data = JSON.parse(text.slice(text.indexOf("{\n")));
      assert.deepEqual(data, result.structuredContent.data, tool);
      assert.ok(data.readReceipt, tool);
      assert.deepEqual(data.config, fixture.config);
      assert.equal(text.includes("synthetic-test-token"), false);
    }
    const missing = await handlers.get_layout.handler({
      generationId: "00000000-0000-4000-8000-000000000001", language: "en",
    }, {});
    assert.equal(missing.structuredContent.data.readReceipt, undefined);
    assert.equal(missing.structuredContent.data.readBeforeEditSatisfied, false);
  } finally {
    await server.close();
    if (previous === undefined) delete process.env.APPLAUNCHFLOW_MCP_REMOTE;
    else process.env.APPLAUNCHFLOW_MCP_REMOTE = previous;
  }
});
