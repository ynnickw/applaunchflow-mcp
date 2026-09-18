import assert from "node:assert/strict";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createAppLaunchFlowServer } from "./index.js";

test("mockup tools distinguish existing screenshots from dedicated mockup uploads", async () => {
  const server = createAppLaunchFlowServer({ baseUrl: "https://example.invalid", token: "test-token" });
  const client = new Client({ name: "mockup-discovery-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const { tools } = await client.listTools();
    const create = tools.find((tool) => tool.name === "create_mockup_animation")!;
    const media = tools.find((tool) => tool.name === "list_mockup_media")!;
    assert.match(create.description!, /Use list_assets to find existing project screenshots/);
    assert.match(create.description!, /empty mockup-media list does not mean/);
    assert.doesNotMatch(create.description!, /Call list_mockup_media first/);
    assert.match(JSON.stringify(create.inputSchema), /from list_assets/);
    assert.match(media.description!, /outside mockups\/.*list_assets/);
  } finally {
    await client.close();
    await server.close();
  }
});
