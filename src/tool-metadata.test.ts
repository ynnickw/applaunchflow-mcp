import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
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
    },
  );
  const client = new Client({ name: "metadata-test", version: "1.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 47);
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
    assert.equal(
      client.getServerVersion()?.version,
      (createRequire(import.meta.url)("../package.json") as { version: string })
        .version,
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("hosted tools emit privacy-safe structured outcome logs", async () => {
  const api = createServer((request, response) => {
    if (request.url === "/api/projects") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ projects: [] }));
      return;
    }
    if (request.url?.startsWith("/api/app/")) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "synthetic backend failure" }));
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  const address = api.address() as AddressInfo;
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createAppLaunchFlowServer({
    baseUrl: `http://127.0.0.1:${address.port}`,
    token: "secret-test-token",
  });
  const client = new Client({ name: "logging-test", version: "1.0.0" });
  const logs: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  console.warn = console.log;

  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.callTool({ name: "list_projects", arguments: {} });
    assert.equal(result.isError, undefined);
    const failed = await client.callTool({
      name: "get_project",
      arguments: { projectId: "00000000-0000-4000-8000-000000000001" },
    });
    assert.equal(failed.isError, true);

    assert.equal(logs.length, 2);
    const entries = logs.map(
      (line) => JSON.parse(line) as Record<string, unknown>,
    );
    assert.deepEqual(
      entries.map(({ event, tool, outcome }) => ({ event, tool, outcome })),
      [
        { event: "mcp_tool", tool: "list_projects", outcome: "success" },
        { event: "mcp_tool", tool: "get_project", outcome: "error" },
      ],
    );
    assert.equal(entries.every((entry) => typeof entry.durationMs === "number"), true);
    assert.equal(logs.some((line) => line.includes("secret-test-token")), false);
    assert.equal(logs.some((line) => line.includes("synthetic backend failure")), false);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    await client.close();
    await server.close();
    await new Promise<void>((resolve, reject) =>
      api.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
