#!/usr/bin/env node

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createAppLaunchFlowServer } from "./index.js";
import { runWithRequestTelemetry, upstreamSignal } from "./request-context.js";
import { errorCategory, protocolErrorCategory, safeRpcMethod } from "./telemetry.js";

const DEFAULT_PORT = 8787;
const INTROSPECTION_TIMEOUT_MS = 10_000;
const DEFAULT_DASHBOARD_URL = "https://dashboard.applaunchflow.com";
const REQUIRED_SCOPES = [
  "projects:read",
  "projects:write",
  "assets:write",
  "generations:write",
] as const;

type IntrospectionPayload = {
  active: boolean;
  clientId?: string;
  scopes?: string[];
  expiresAt?: number;
  userId?: string;
  resource?: string;
};

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function dashboardBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.APPLAUNCHFLOW_BASE_URL || DEFAULT_DASHBOARD_URL,
  );
}

function publicBaseUrl(request?: IncomingMessage): string {
  const configured = process.env.APPLAUNCHFLOW_MCP_PUBLIC_URL;
  if (configured) {
    const parsed = new URL(configured);
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      throw new Error(
        "APPLAUNCHFLOW_MCP_PUBLIC_URL must use HTTPS in production",
      );
    }
    parsed.pathname = parsed.pathname.replace(/\/mcp\/?$/, "");
    parsed.search = "";
    parsed.hash = "";
    return normalizeBaseUrl(parsed.toString());
  }

  const host = request?.headers.host || `127.0.0.1:${DEFAULT_PORT}`;
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${host}`;
}

function resourceIdentifier(request?: IncomingMessage): string {
  return `${publicBaseUrl(request)}/mcp`;
}

function resourceMetadataUrl(request?: IncomingMessage): string {
  return `${publicBaseUrl(request)}/.well-known/oauth-protected-resource`;
}

function json(
  response: ServerResponse,
  status: number,
  payload: unknown,
  headers: Record<string, string> = {},
): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function bearerToken(request: IncomingMessage): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || null;
}

function unauthorized(
  request: IncomingMessage,
  response: ServerResponse,
): void {
  json(
    response,
    401,
    {
      jsonrpc: "2.0",
      error: { code: -32001, message: "Authorization required" },
      id: null,
    },
    {
      "www-authenticate": `Bearer resource_metadata="${resourceMetadataUrl(request)}"`,
    },
  );
}

function methodNotAllowed(response: ServerResponse): void {
  json(
    response,
    405,
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed" },
      id: null,
    },
    { allow: "POST" },
  );
}

async function introspectToken(
  request: IncomingMessage,
  token: string,
  onStatus: (status: number) => void,
): Promise<AuthInfo | null> {
  const response = await fetch(
    `${dashboardBaseUrl()}/api/auth/mcp/introspect`,
    {
      signal: upstreamSignal(INTROSPECTION_TIMEOUT_MS),
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    },
  );

  onStatus(response.status);
  if (!response.ok) {
    // An unavailable introspection service must not trigger credential refresh.
    await response.body?.cancel();
    if (response.status === 401 || response.status === 403) return null;
    throw new Error("Authorization service unavailable");
  }
  const payload = (await response.json()) as IntrospectionPayload;
  if (payload?.active === false) return null;
  if (
    payload?.active !== true ||
    typeof payload.userId !== "string" ||
    !Array.isArray(payload.scopes) ||
    !payload.scopes.every((scope) => typeof scope === "string") ||
    (payload.clientId !== undefined && typeof payload.clientId !== "string") ||
    (payload.resource !== undefined && typeof payload.resource !== "string") ||
    (payload.expiresAt !== undefined && !Number.isFinite(payload.expiresAt))
  ) {
    throw new Error("Invalid introspection response");
  }
  if (
    !payload.active ||
    !payload.userId ||
    REQUIRED_SCOPES.some((scope) => !payload.scopes?.includes(scope))
  ) {
    return null;
  }

  const expectedResource = resourceIdentifier(request);
  if (payload.resource && payload.resource !== expectedResource) return null;

  return {
    token,
    clientId: payload.clientId || "applaunchflow-mcp",
    scopes: payload.scopes || [],
    expiresAt: payload.expiresAt,
    resource: new URL(expectedResource),
    extra: { userId: payload.userId },
  };
}

async function handleMcp(request: IncomingMessage, response: ServerResponse) {
  const startedAt = Date.now();
  const requestId =
    (typeof request.headers["x-request-id"] === "string" &&
      request.headers["x-request-id"].slice(0, 128)) ||
    randomUUID();
  let authStatus: "missing" | "pending" | "invalid" | "valid" | "unavailable" =
    "missing";
  const diagnostics: {
    authUpstreamStatus?: number;
    authDurationMs?: number;
    protocolVersion?: string;
    rpcMethod?: string;
    errorCategory?: string;
  } = {};
  const protocolVersion = request.headers["mcp-protocol-version"];
  if (protocolVersion !== undefined) {
    diagnostics.protocolVersion = typeof protocolVersion === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(protocolVersion) ? protocolVersion : "invalid";
  }
  response.setHeader("x-request-id", requestId);
  let logged = false;
  const logRequest = (aborted = false) => {
    if (logged) return;
    logged = true;
    console.info(
      JSON.stringify({
        event: "mcp_http_request",
        requestId,
        method: request.method || "UNKNOWN",
        path: request.url?.split("?", 1)[0] || "/mcp",
        status: aborted ? 499 : response.statusCode,
        auth: authStatus,
        durationMs: Date.now() - startedAt,
        userAgent: request.headers["user-agent"]?.slice(0, 256) || null,
        ...diagnostics,
        ...(aborted ? { completion: "aborted" } : {}),
      }),
    );
  };
  response.once("finish", () => logRequest());
  response.once("close", () => logRequest(!response.writableFinished));

  const token = bearerToken(request);
  if (!token) {
    unauthorized(request, response);
    return;
  }
  authStatus = "pending";

  let auth: AuthInfo | null = null;
  const authStartedAt = Date.now();
  try {
    auth = await introspectToken(request, token, (status) => {
      diagnostics.authUpstreamStatus = status;
    });
  } catch (error) {
    authStatus = "unavailable";
    diagnostics.errorCategory = "authorization_service_unavailable";
    console.error(JSON.stringify({
      event: "mcp_auth_error", requestId,
      errorCategory: errorCategory(error),
      ...(diagnostics.authUpstreamStatus !== undefined
        ? { upstreamStatus: diagnostics.authUpstreamStatus } : {}),
    }));
    json(response, 503, {
      jsonrpc: "2.0",
      error: { code: -32002, message: "Authorization service unavailable" },
      id: null,
    }, { "retry-after": "5" });
    return;
  } finally {
    diagnostics.authDurationMs = Date.now() - authStartedAt;
  }

  if (!auth) {
    authStatus = "invalid";
    unauthorized(request, response);
    return;
  }
  authStatus = "valid";

  if (request.method !== "POST") {
    methodNotAllowed(response);
    return;
  }

  const server = createAppLaunchFlowServer({
    baseUrl: dashboardBaseUrl(),
    token,
  });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  (request as IncomingMessage & { auth?: AuthInfo }).auth = auth;

  await runWithRequestTelemetry(requestId, async () => {
    try {
      await server.connect(transport);
      // Observe only fixed protocol metadata, never request params or error text.
      const onmessage = transport.onmessage;
      transport.onmessage = (message, extra) => {
        const method = safeRpcMethod("method" in message ? message.method : undefined);
        if (method) diagnostics.rpcMethod = method;
        onmessage?.(message, extra);
      };
      server.server.onerror = (error) => {
        diagnostics.errorCategory = protocolErrorCategory(error);
      };
      await transport.handleRequest(request, response);
    } catch (error) {
      diagnostics.errorCategory = protocolErrorCategory(error);
      console.error(JSON.stringify({
        event: "mcp_transport_error", requestId,
        errorCategory: diagnostics.errorCategory,
      }));
      if (!response.headersSent) {
        json(response, 500, {
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    } finally {
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    }
  });
}

export function createHttpServer() {
  process.env.APPLAUNCHFLOW_MCP_REMOTE = "1";

  return createServer(async (request, response) => {
    const url = new URL(request.url || "/", publicBaseUrl(request));

    if (request.method === "GET" && url.pathname === "/healthz") {
      json(response, 200, { ok: true, service: "applaunchflow-mcp" });
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === "/.well-known/openai-apps-challenge"
    ) {
      const token = process.env.OPENAI_APPS_CHALLENGE_TOKEN?.trim();
      if (!token) {
        json(response, 404, { error: "Challenge token not configured" });
        return;
      }

      response.writeHead(200, {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end(token);
      return;
    }

    if (
      request.method === "GET" &&
      (url.pathname === "/.well-known/oauth-protected-resource" ||
        url.pathname === "/.well-known/oauth-protected-resource/mcp")
    ) {
      json(response, 200, {
        resource: resourceIdentifier(request),
        authorization_servers: [dashboardBaseUrl()],
        scopes_supported: REQUIRED_SCOPES,
        bearer_methods_supported: ["header"],
        resource_documentation: `${dashboardBaseUrl()}/docs/mcp`,
      });
      return;
    }

    if (url.pathname === "/mcp") {
      await handleMcp(request, response);
      return;
    }

    json(response, 404, { error: "Not found" });
  });
}

async function main() {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const server = createHttpServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(`AppLaunchFlow MCP HTTP server listening on port ${port}`);
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void main();
}
