import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createHttpServer } from "./http.js";
import { captureMcpTool } from "./mcp-analytics.js";
import {
  runWithRequestTelemetry,
  requestTelemetry,
} from "./request-context.js";

const analyticsHost = "https://eu.i.posthog.com";
const keys = [
  "APPLAUNCHFLOW_MCP_POSTHOG_KEY",
  "APPLAUNCHFLOW_MCP_POSTHOG_HOST",
  "APPLAUNCHFLOW_BASE_URL",
  "APPLAUNCHFLOW_MCP_REMOTE",
  "APPLAUNCHFLOW_MCP_PUBLIC_URL",
] as const;
function restoreEnv() {
  const previous = keys.map((key) => [key, process.env[key]] as const);
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

test("opt-in hosted tool analytics use verified identity and metadata only across concurrent requests", async (t) => {
  const restore = restoreEnv();
  const events: Array<Record<string, any>> = [];
  const nativeFetch = globalThis.fetch;
  const logs: string[] = [];
  for (const level of ["info", "log", "warn", "error"] as const)
    t.mock.method(console, level, (line: unknown) => {
      logs.push(String(line));
    });
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).startsWith(analyticsHost)) {
        assert.equal(String(input), `${analyticsHost}/i/v0/e/`);
        assert.equal(init?.redirect, "error");
        events.push(JSON.parse(String(init?.body)));
        return new Response(null, { status: 200 });
      }
      return nativeFetch(input, init);
    },
  );
  const api = createServer((req, res) => {
    if (req.url === "/api/auth/mcp/introspect")
      return res.end(
        JSON.stringify({
          active: true,
          userId: req.headers.authorization?.endsWith("a")
            ? "user-a"
            : "user-b",
          scopes: [
            "projects:read",
            "projects:write",
            "assets:write",
            "generations:write",
          ],
        }),
      );
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        projects: [{ id: "private-project-id", name: "private-project-name" }],
      }),
    );
  });
  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  process.env.APPLAUNCHFLOW_BASE_URL = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
  delete process.env.APPLAUNCHFLOW_MCP_PUBLIC_URL;
  process.env.APPLAUNCHFLOW_MCP_POSTHOG_KEY = "fixture-project-token";
  process.env.APPLAUNCHFLOW_MCP_POSTHOG_HOST = analyticsHost;
  const hosted = createHttpServer();
  await new Promise<void>((resolve) => hosted.listen(0, "127.0.0.1", resolve));
  try {
    const url = `http://127.0.0.1:${(hosted.address() as AddressInfo).port}/mcp`;
    await Promise.all(
      ["a", "b"].map(async (account) => {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            authorization: `Bearer private-token-${account}`,
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
            "user-agent": "Cursor/3.0 private-header",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: account,
            method: "tools/call",
            params: { name: "list_projects", arguments: {} },
          }),
        });
        assert.equal(response.status, 200);
        assert.match(await response.text(), /private-project-name/);
      }),
    );
    assert.equal(events.length, 2);
    assert.deepEqual(events.map((e) => e.distinct_id).sort(), [
      "user-a",
      "user-b",
    ]);
    for (const event of events) {
      assert.equal(event.event, "$mcp_tool_call");
      assert.equal(event.properties.$mcp_tool_name, "list_projects");
      assert.equal(event.properties.$mcp_is_error, false);
      assert.equal(event.properties.$mcp_client_name, "Cursor");
      assert.equal(typeof event.properties.$mcp_duration_ms, "number");
    }
    assert.doesNotMatch(
      JSON.stringify(events),
      /private-|arguments|result|authorization|requestId/,
    );
    assert.doesNotMatch(logs.join("\n"), /user-a|user-b|fixture-project-token/);
    assert.deepEqual(
      runWithRequestTelemetry("request", () => requestTelemetry(), {
        userId: "user",
        clientName: "Other",
      }),
      { requestId: "request" },
    );
  } finally {
    hosted.closeAllConnections();
    api.closeAllConnections();
    await Promise.all([
      new Promise<void>((resolve) => hosted.close(() => resolve())),
      new Promise<void>((resolve) => api.close(() => resolve())),
    ]);
    restore();
  }
});

test("analytics are disabled without configuration or verified hosted identity and failures do not escape", async (t) => {
  const restore = restoreEnv();
  let calls = 0;
  t.mock.method(console, "warn", () => undefined);
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw new Error("private-api-key-or-response");
  });
  const identity = { userId: "user-a", clientName: "Claude" };
  const args = {
    tool: "upload_asset",
    outcome: "error" as const,
    durationMs: 10,
    category: "forbidden",
  };
  try {
    delete process.env.APPLAUNCHFLOW_MCP_POSTHOG_KEY;
    delete process.env.APPLAUNCHFLOW_MCP_POSTHOG_HOST;
    await runWithRequestTelemetry(
      "request",
      () => captureMcpTool(args),
      identity,
    );
    assert.equal(calls, 0);
    process.env.APPLAUNCHFLOW_MCP_POSTHOG_KEY = "fixture-project-token";
    process.env.APPLAUNCHFLOW_MCP_POSTHOG_HOST = analyticsHost;
    await captureMcpTool(args); // stdio/local: no verified account identity
    assert.equal(calls, 0);
    await runWithRequestTelemetry(
      "request",
      () => captureMcpTool(args),
      identity,
    );
    assert.equal(calls, 1);
    process.env.APPLAUNCHFLOW_MCP_POSTHOG_HOST =
      "https://secret@eu.i.posthog.com";
    await runWithRequestTelemetry(
      "request",
      () => captureMcpTool(args),
      identity,
    );
    assert.equal(calls, 1);
  } finally {
    restore();
  }
});
