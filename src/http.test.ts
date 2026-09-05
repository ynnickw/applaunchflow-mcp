import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";
import { createServer as createNodeServer } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHttpServer } from "./http.js";

async function withServer(
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createHttpServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("HTTP server exposes health and protected-resource metadata", async () => {
  await withServer(async (baseUrl) => {
    const health = await fetch(`${baseUrl}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      ok: true,
      service: "applaunchflow-mcp",
      version: "0.3.34",
    });

    const metadata = await fetch(
      `${baseUrl}/.well-known/oauth-protected-resource`,
    );
    assert.equal(metadata.status, 200);
    const payload = (await metadata.json()) as {
      resource: string;
      authorization_servers: string[];
    };
    assert.equal(payload.resource, `${baseUrl}/mcp`);
    assert.deepEqual(payload.authorization_servers, [
      "https://dashboard.applaunchflow.com",
    ]);
  });
});

test("HTTP server exposes the configured OpenAI domain challenge", async () => {
  const previousToken = process.env.OPENAI_APPS_CHALLENGE_TOKEN;
  process.env.OPENAI_APPS_CHALLENGE_TOKEN = "openai-domain-challenge";

  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/.well-known/openai-apps-challenge`,
      );
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("content-type"),
        "text/plain; charset=utf-8",
      );
      assert.equal(await response.text(), "openai-domain-challenge");
    });
  } finally {
    if (previousToken === undefined) {
      delete process.env.OPENAI_APPS_CHALLENGE_TOKEN;
    } else {
      process.env.OPENAI_APPS_CHALLENGE_TOKEN = previousToken;
    }
  }
});

test("OpenAI domain challenge returns 404 when it is not configured", async () => {
  const previousToken = process.env.OPENAI_APPS_CHALLENGE_TOKEN;
  delete process.env.OPENAI_APPS_CHALLENGE_TOKEN;

  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/.well-known/openai-apps-challenge`,
      );
      assert.equal(response.status, 404);
    });
  } finally {
    if (previousToken !== undefined) {
      process.env.OPENAI_APPS_CHALLENGE_TOKEN = previousToken;
    }
  }
});

test("MCP endpoint challenges unauthenticated callers with resource metadata", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      }),
    });
    assert.equal(response.status, 401);
    assert.equal(
      response.headers.get("www-authenticate"),
      `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
    );
  });
});

test("authenticated Streamable HTTP clients can initialize and discover tools", async () => {
  const introspectionServer = createNodeServer((request, response) => {
    if (
      request.url === "/api/auth/mcp/introspect" &&
      request.headers.authorization === "Bearer test-access-token"
    ) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          active: true,
          userId: "00000000-0000-4000-8000-000000000001",
          clientId: "test-client",
          scopes: [
            "projects:read",
            "projects:write",
            "assets:write",
            "generations:write",
          ],
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        }),
      );
      return;
    }
    response.writeHead(401).end();
  });
  await new Promise<void>((resolve) =>
    introspectionServer.listen(0, "127.0.0.1", resolve),
  );
  const introspectionAddress = introspectionServer.address() as AddressInfo;

  const previousDashboard = process.env.APPLAUNCHFLOW_BASE_URL;
  const previousPublicUrl = process.env.APPLAUNCHFLOW_MCP_PUBLIC_URL;
  process.env.APPLAUNCHFLOW_BASE_URL = `http://127.0.0.1:${introspectionAddress.port}`;

  try {
    await withServer(async (baseUrl) => {
      process.env.APPLAUNCHFLOW_MCP_PUBLIC_URL = `${baseUrl}/mcp`;
      for (const method of ["GET", "DELETE"]) {
        const response = await fetch(`${baseUrl}/mcp`, {
          method,
          headers: { authorization: "Bearer test-access-token" },
        });
        assert.equal(response.status, 405);
        assert.equal(response.headers.get("allow"), "POST");
        assert.deepEqual(await response.json(), {
          jsonrpc: "2.0",
          error: { code: -32000, message: "Method not allowed" },
          id: null,
        });
      }

      const transport = new StreamableHTTPClientTransport(
        new URL(`${baseUrl}/mcp`),
        {
          requestInit: {
            headers: { authorization: "Bearer test-access-token" },
          },
        },
      );
      const client = new Client({ name: "http-test", version: "1.0.0" });
      await client.connect(transport);
      try {
        const { tools } = await client.listTools();
        assert.equal(tools.length, 45);
      } finally {
        await client.close();
      }
    });
  } finally {
    if (previousDashboard === undefined) delete process.env.APPLAUNCHFLOW_BASE_URL;
    else process.env.APPLAUNCHFLOW_BASE_URL = previousDashboard;
    if (previousPublicUrl === undefined) delete process.env.APPLAUNCHFLOW_MCP_PUBLIC_URL;
    else process.env.APPLAUNCHFLOW_MCP_PUBLIC_URL = previousPublicUrl;
    await new Promise<void>((resolve, reject) =>
      introspectionServer.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
