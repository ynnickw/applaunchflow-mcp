import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createAppLaunchFlowServer } from "./index.js";

const removedPickerTools = [
  "render_screenshot_picker",
  "render_social_graphics_picker",
  "render_promo_video_picker",
] as const;

test("only prepare-and-show tools are exposed for content pickers", async () => {
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
    assert.equal(toolNames.has("prepare_social_graphics_styles"), true);
    assert.equal(toolNames.has("generate_promo_video"), true);
    assert.equal(toolNames.has("apply_screenshot_style"), true);
    assert.equal(toolNames.has("apply_social_graphics_style"), true);
    assert.equal(toolNames.has("apply_promo_video_candidate"), true);
    const instructions = client.getInstructions() || "";
    for (const name of removedPickerTools) {
      assert.equal(toolNames.has(name), false, `${name} must not be advertised`);
      assert.equal(instructions.includes(name), false);
      const result = await client.callTool({ name, arguments: {} });
      assert.equal(result.isError, true, `${name} must not remain callable`);
      assert.match(JSON.stringify(result.content), /not found/i);
    }
    assert.match(instructions, /galleryUrl from the previous result/);
    assert.match(instructions, /pickerUrl from the previous result/);
  } finally {
    await client.close();
    await server.close();
  }
});
