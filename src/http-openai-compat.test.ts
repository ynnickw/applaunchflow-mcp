import assert from "node:assert/strict";
import test, { mock } from "node:test";
import type { AddressInfo } from "node:net";
import { createServer as createNodeServer } from "node:http";
import { createHttpServer } from "./http.js";

test("OpenAI discovery aliases and redacted MCP request logs are available", async () => {
  const info = mock.method(console, "info", () => undefined);
  const introspectionServer = createNodeServer((_request, response) => {
    response.writeHead(401).end();
  });
  await new Promise<void>((resolve) =>
    introspectionServer.listen(0, "127.0.0.1", resolve),
  );
  const introspectionAddress = introspectionServer.address() as AddressInfo;
  const previousDashboard = process.env.APPLAUNCHFLOW_BASE_URL;
  process.env.APPLAUNCHFLOW_BASE_URL = `http://127.0.0.1:${introspectionAddress.port}`;
  const server = createHttpServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    for (const path of [
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-protected-resource/mcp",
    ]) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).resource, `${baseUrl}/mcp`);
    }

    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        authorization: "Bearer must-not-appear-in-logs",
        "x-request-id": "openai-review-request",
        "user-agent": "OpenAI-Review-Test/1.0",
      },
    });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("x-request-id"), "openai-review-request");

    const entries = info.mock.calls
      .map((call) => call.arguments[0])
      .filter((value): value is string => typeof value === "string")
      .map((value) => JSON.parse(value) as Record<string, unknown>)
      .filter((value) => value.event === "mcp_http_request");
    assert.equal(entries.length, 1);
    assert.deepEqual(entries[0], {
      event: "mcp_http_request",
      requestId: "openai-review-request",
      method: "POST",
      path: "/mcp",
      status: 401,
      auth: "invalid",
      durationMs: entries[0]?.durationMs,
      userAgent: "OpenAI-Review-Test/1.0",
    });
    assert.equal(typeof entries[0]?.durationMs, "number");
    assert.equal(
      JSON.stringify(entries).includes("must-not-appear-in-logs"),
      false,
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      introspectionServer.close((error) => (error ? reject(error) : resolve())),
    );
    if (previousDashboard === undefined) {
      delete process.env.APPLAUNCHFLOW_BASE_URL;
    } else {
      process.env.APPLAUNCHFLOW_BASE_URL = previousDashboard;
    }
    info.mock.restore();
  }
});
