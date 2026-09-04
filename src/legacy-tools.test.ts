import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createAppLaunchFlowServer } from "./index.js";

test("legacy direct-generation tools are not exposed to MCP clients", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createAppLaunchFlowServer({
    baseUrl: "https://dashboard.applaunchflow.com",
    token: "test-token",
  });
  const client = new Client({ name: "legacy-tools-test", version: "1.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const { tools } = await client.listTools();
    const toolNames = new Set(tools.map((tool) => tool.name));

    assert.equal(toolNames.has("generate_layouts"), false);
    assert.equal(toolNames.has("generate_graphics"), false);
    assert.equal(toolNames.has("prepare_screenshot_styles"), true);
    assert.equal(toolNames.has("render_screenshot_picker"), true);
    assert.equal(toolNames.has("prepare_social_graphics_styles"), true);
    assert.equal(toolNames.has("render_social_graphics_picker"), true);
  } finally {
    await client.close();
    await server.close();
  }
});
