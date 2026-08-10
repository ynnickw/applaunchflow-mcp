import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createAppLaunchFlowServer } from "./index.js";
import { TOOL_ANNOTATIONS } from "./tool-metadata.js";

test("all registered tools expose submission safety metadata and output schemas", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createAppLaunchFlowServer(
    {
      baseUrl: "https://dashboard.applaunchflow.com",
      token: "test-token",
      cookieName: "",
      authMode: "bearer",
      createdAt: new Date(0).toISOString(),
    },
    { localInteractive: false },
  );
  const client = new Client({ name: "metadata-test", version: "1.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 43);
    assert.deepEqual(
      tools.map((tool) => tool.name).sort(),
      Object.keys(TOOL_ANNOTATIONS).sort(),
    );

    for (const tool of tools) {
      assert.deepEqual(tool.annotations, TOOL_ANNOTATIONS[tool.name]);
      assert.equal(tool.outputSchema?.type, "object");
      assert.ok(tool.title, `${tool.name} must have a title`);
      assert.ok(tool.description, `${tool.name} must have a description`);
      assert.deepEqual(
        (tool._meta?.securitySchemes as Array<{ type: string }> | undefined)?.map(
          (scheme) => scheme.type,
        ),
        ["oauth2"],
      );
    }
  } finally {
    await client.close();
    await server.close();
  }
});
