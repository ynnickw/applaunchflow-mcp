import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createHttpServer } from "./http.js";
import { openUrl, fail } from "./tools/utils.js";
import { errorCategory, protocolErrorCategory, safeRpcMethod, ToolInputError, toolErrorCategory } from "./telemetry.js";

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test("URL opening skips stateless hosted elicitation but preserves local behavior", async (t) => {
  const previous = process.env.APPLAUNCHFLOW_MCP_REMOTE;
  const server = new McpServer({ name: "url-test", version: "1.0.0" });
  const request = t.mock.method(server.server, "request", async () => ({ action: "accept" }));
  try {
    process.env.APPLAUNCHFLOW_MCP_REMOTE = "1";
    assert.equal(await openUrl(server, "https://example.com/editor", "Open editor"), false);
    assert.equal(request.mock.callCount(), 0);
    delete process.env.APPLAUNCHFLOW_MCP_REMOTE;
    assert.equal(await openUrl(server, "https://example.com/editor", "Open editor"), true);
    assert.equal(request.mock.callCount(), 1);
    request.mock.mockImplementation(async () => { throw new Error("unsupported"); });
    assert.equal(await openUrl(server, "https://example.com/editor", "Open editor"), false);
  } finally {
    if (previous === undefined) delete process.env.APPLAUNCHFLOW_MCP_REMOTE;
    else process.env.APPLAUNCHFLOW_MCP_REMOTE = previous;
    await server.close();
  }
});

test("diagnostic categories never echo arbitrary errors or method names", () => {
  const secret = "secret-body-or-token";
  assert.equal(errorCategory({ name: secret, code: secret, message: secret }), "unknown");
  assert.equal(errorCategory({ status: 503, message: secret }), "upstream_error");
  assert.equal(errorCategory({ status: 429 }), "rate_limited");
  assert.equal(errorCategory(new DOMException(secret, "AbortError")), "cancelled");
  assert.equal(toolErrorCategory(fail(new DOMException(secret, "AbortError"))), "cancelled");
  assert.equal(toolErrorCategory(fail(new DOMException(secret, "TimeoutError"))), "timeout");
  assert.equal(protocolErrorCategory(new Error(`Bad Request: Unsupported protocol version: ${secret}`)), "unsupported_protocol_version");
  assert.equal(protocolErrorCategory(new Error(secret)), "transport_error");
  assert.equal(safeRpcMethod(secret), "other");
  assert.equal(safeRpcMethod("tools/call"), "tools/call");
  for (const [code, category] of [
    ["READ_BEFORE_EDIT_REQUIRED", "read_before_edit_required"],
    ["HOSTED_FILE_PATH_UNSUPPORTED", "hosted_file_path_unsupported"],
  ] as const) {
    const result = fail(new ToolInputError(code, "Actionable user guidance"));
    assert.equal(result.structuredContent.error.code, code);
    assert.equal(result.structuredContent.error.type, "validation");
    assert.equal(toolErrorCategory(result), category);
  }
});

test("hosted reliability regressions over real HTTP", async (t) => {
  const entries: Array<Record<string, unknown>> = [];
  const rawLogs: string[] = [];
  let onAborted: (() => void) | undefined;
  let onProjectRequest: (() => void) | undefined;
  for (const level of ["info", "log", "warn", "error"] as const) {
    t.mock.method(console, level, (line: unknown) => {
      rawLogs.push(String(line));
      if (typeof line === "string" && line.startsWith("{")) {
        const entry = { ...JSON.parse(line), level };
        entries.push(entry);
        if (entry.event === "mcp_http_request" && entry.completion === "aborted") onAborted?.();
      }
    });
  }
  let authStatus = 200;
  let authPayload: unknown = {
    active: true, userId: "test-user",
    scopes: ["projects:read", "projects:write", "assets:write", "generations:write"],
  };
  const api = createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url === "/api/auth/mcp/introspect") {
      response.writeHead(authStatus).end(JSON.stringify(authPayload));
    } else if (request.url === "/api/screenshots/apply-template") {
      response.end(JSON.stringify({ variantId: "test-variant", detectedLanguage: "en" }));
    } else if (request.url === "/api/projects") {
      onProjectRequest?.();
      setTimeout(() => response.end(JSON.stringify({ projects: [] })), 20);
    } else if (request.url?.startsWith("/api/app/")) {
      response.writeHead(500).end(JSON.stringify({ error: { message: "secret-upstream-body", code: "secret-upstream-code" } }));
    } else response.writeHead(404).end();
  });
  const previous = {
    baseUrl: process.env.APPLAUNCHFLOW_BASE_URL,
    publicUrl: process.env.APPLAUNCHFLOW_MCP_PUBLIC_URL,
    remote: process.env.APPLAUNCHFLOW_MCP_REMOTE,
  };
  process.env.APPLAUNCHFLOW_BASE_URL = await listen(api);
  delete process.env.APPLAUNCHFLOW_MCP_PUBLIC_URL;
  const hosted = createHttpServer();
  const baseUrl = await listen(hosted);
  const headers = {
    authorization: "Bearer secret-access-token",
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  const post = (body: unknown, requestId: string, extraHeaders = {}) => fetch(`${baseUrl}/mcp`, {
    method: "POST", headers: { ...headers, "x-request-id": requestId, ...extraHeaders },
    body: JSON.stringify(body),
  });
  const call = (name: string, requestId: string, args = {}) => post({
    jsonrpc: "2.0", id: requestId, method: "tools/call", params: { name, arguments: args },
  }, requestId);
  try {
    await t.test("auth outages return retryable 503 without a credential challenge", async () => {
      for (const status of [401, 403, 429, 500, 502, 503]) {
        authStatus = status;
        const response = await post({ jsonrpc: "2.0", id: 1, method: "ping" }, `auth-${status}`);
        const unavailable = status !== 401 && status !== 403;
        assert.equal(response.status, unavailable ? 503 : 401);
        assert.equal(response.headers.has("www-authenticate"), !unavailable);
        assert.equal(response.headers.get("retry-after"), unavailable ? "5" : null);
        await response.text();
        const entry = entries.find((entry) => entry.event === "mcp_http_request" && entry.requestId === `auth-${status}`)!;
        assert.equal(entry.auth, unavailable ? "unavailable" : "invalid");
        assert.equal(entry.authUpstreamStatus, status);
        assert.equal(typeof entry.authDurationMs, "number");
      }
      authStatus = 200;
      const valid = authPayload;
      for (const [payload, expected] of [[null, 503], [{ active: true }, 503], [{ active: false }, 401]] as const) {
        authPayload = payload;
        const response = await post({ jsonrpc: "2.0", id: 1, method: "ping" }, "auth-payload");
        assert.equal(response.status, expected);
        await response.text();
      }
      authPayload = valid;
    });

    await t.test("an elicitation-capable client receives the editor URL without a browser-opening timeout", async () => {
      const client = new Client({ name: "reliability-test", version: "1.0.0" }, { capabilities: { elicitation: { url: {} } } });
      let elicitations = 0;
      client.setRequestHandler(ElicitRequestSchema, async () => {
        elicitations += 1;
        return { action: "accept" };
      });
      const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), { requestInit: { headers } });
      try {
        await client.connect(transport);
        const result = await client.callTool({ name: "apply_screenshot_style", arguments: {
          generationId: "00000000-0000-4000-8000-000000000001", catalogKey: "test", templateId: "style",
        } }, undefined, { timeout: 2000 });
        assert.equal(result.isError, undefined);
        const structured = result.structuredContent as { success: boolean; data: { editorUrl: string } };
        assert.equal(structured.success, true);
        const data = structured.data;
        assert.match(data.editorUrl, /\/editor\?.*variantId=test-variant/);
        assert.equal(elicitations, 0);
      } finally { await client.close(); }
    });

    await t.test("protocol failures have safe distinct categories", async () => {
      const unsupported = await post({ jsonrpc: "2.0", id: 1, method: "ping" }, "bad-version", { "mcp-protocol-version": "2099-01-01" });
      assert.equal(unsupported.status, 400);
      await unsupported.text();
      const invalid = await post({ wrong: "secret-request-body" }, "bad-jsonrpc");
      assert.equal(invalid.status, 400);
      await invalid.text();
      assert.equal(entries.find((entry) => entry.event === "mcp_http_request" && entry.requestId === "bad-version")?.errorCategory, "unsupported_protocol_version");
      assert.equal(entries.find((entry) => entry.event === "mcp_http_request" && entry.requestId === "bad-version")?.protocolVersion, "2099-01-01");
      assert.equal(entries.find((entry) => entry.event === "mcp_http_request" && entry.requestId === "bad-jsonrpc")?.errorCategory, "invalid_jsonrpc");
    });

    await t.test("guard rejections return stable correctable error codes", async () => {
      for (const [name, args, category] of [
        ["transform_layout", { generationId: "00000000-0000-4000-8000-000000000001", language: "en", operations: [{ type: "update_node", target: { nodeType: "text" }, changes: { text: "test" } }] }, "read_before_edit_required"],
        ["upload_screenshots", { projectId: "00000000-0000-4000-8000-000000000001", deviceType: "mobile", platform: "ios", sources: [{ path: "/secret-local-file.png" }] }, "hosted_file_path_unsupported"],
      ] as const) {
        const response = await call(name, `guard-${name}`, args);
        assert.equal(response.status, 200);
        assert.match(await response.text(), /"isError":true/);
        assert.equal(entries.find((entry) => entry.event === "mcp_tool" && entry.requestId === `guard-${name}`)?.errorCategory, category);
      }
    });

    await t.test("concurrent tool logs retain their own HTTP request IDs", async () => {
      const responses = await Promise.all([
        call("list_projects", "correlation-success"),
        call("get_project", "correlation-error", { projectId: "00000000-0000-4000-8000-000000000001" }),
      ]);
      for (const response of responses) { assert.equal(response.status, 200); await response.text(); }
      for (const [requestId, tool, outcome, level] of [
        ["correlation-success", "list_projects", "success", "log"],
        ["correlation-error", "get_project", "error", "warn"],
      ]) {
        const matching = entries.filter((entry) => entry.event === "mcp_tool" && entry.requestId === requestId);
        assert.equal(matching.length, 1);
        assert.equal(matching[0].tool, tool);
        assert.equal(matching[0].outcome, outcome);
        assert.equal(matching[0].level, level);
        const http = entries.filter((entry) => entry.event === "mcp_http_request" && entry.requestId === requestId);
        assert.equal(http.length, 1);
        assert.equal(http[0].rpcMethod, "tools/call");
      }
      assert.equal(entries.find((entry) => entry.event === "mcp_tool" && entry.requestId === "correlation-error")?.errorCategory, "upstream_error");
    });

    await t.test("disconnected requests produce one aborted access log", { timeout: 2000 }, async () => {
      const started = new Promise<void>((resolve) => { onProjectRequest = resolve; });
      const logged = new Promise<void>((resolve) => { onAborted = resolve; });
      const controller = new AbortController();
      const request = fetch(`${baseUrl}/mcp`, {
        method: "POST", headers: { ...headers, "x-request-id": "aborted-request" },
        signal: controller.signal,
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_projects", arguments: {} } }),
      });
      // SSE headers arrive before the tool finishes; abort the response body too.
      const rejected = assert.rejects(request.then((response) => response.text()), { name: "AbortError" });
      await started;
      controller.abort();
      await rejected;
      await logged;
      onProjectRequest = undefined;
      onAborted = undefined;
      const matching = entries.filter((entry) => entry.event === "mcp_http_request" && entry.requestId === "aborted-request");
      assert.equal(matching.length, 1);
      assert.equal(matching[0].status, 499);
    });
    assert.equal(JSON.stringify(entries).includes("secret-"), false);
    assert.equal(rawLogs.some((line) => line.includes("secret-")), false);
  } finally {
    await close(hosted);
    await close(api);
    for (const [key, value] of Object.entries({
      APPLAUNCHFLOW_BASE_URL: previous.baseUrl,
      APPLAUNCHFLOW_MCP_PUBLIC_URL: previous.publicUrl,
      APPLAUNCHFLOW_MCP_REMOTE: previous.remote,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
