import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { z } from "zod";
import { startProgressHeartbeat, ok } from "./tools/utils.js";

test("HTTP progress keeps an opted-in client alive during slow generation; no token cannot reset a client deadline", async () => {
  const hosted = createServer(async (req, res) => {
    const handler = createMcpHandler(
      () => {
        const server = new McpServer({
          name: "slow-generation-fixture",
          version: "1",
        });
        server.registerTool(
          "slow_generation",
          { inputSchema: z.object({}) },
          async (_input, ctx) => {
            const stop = startProgressHeartbeat(
              ctx,
              "Preparing fixture styles",
              15,
            );
            try {
              await delay(1400, undefined, { signal: ctx.mcpReq.signal });
              return ok({ ready: true });
            } finally {
              stop();
            }
          },
        );
        return server;
      },
      { legacy: "stateless" },
    );
    try {
      await toNodeHandler(handler)(req, res);
    } finally {
      await handler.close();
    }
  });
  await new Promise<void>((resolve) => hosted.listen(0, "127.0.0.1", resolve));
  const client = new Client({ name: "progress-test", version: "1" });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(
        new URL(
          `http://127.0.0.1:${(hosted.address() as AddressInfo).port}/mcp`,
        ),
      ),
    );
    const progress: number[] = [];
    const result = await client.callTool(
      { name: "slow_generation", arguments: {} },
      {
        timeout: 500,
        maxTotalTimeout: 5000,
        resetTimeoutOnProgress: true,
        onprogress: (notification) => {
          progress.push(notification.progress);
        },
      },
    );
    assert.notEqual(result.isError, true);
    assert.ok(
      progress.length >= 3,
      "Client received periodic progress over HTTP",
    );
    assert.ok(
      progress.every(
        (value, index) => index === 0 || value > progress[index - 1],
      ),
    );
    await assert.rejects(
      client.callTool(
        { name: "slow_generation", arguments: {} },
        {
          timeout: 500,
          maxTotalTimeout: 5000,
          resetTimeoutOnProgress: true,
        },
      ),
      /timed out/i,
    );
  } finally {
    await client.close();
    hosted.closeAllConnections();
    await new Promise<void>((resolve) => hosted.close(() => resolve()));
  }
});
