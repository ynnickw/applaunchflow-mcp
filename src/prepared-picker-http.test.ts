import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { gunzipSync } from "node:zlib";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createAppLaunchFlowServer } from "./index.js";

for (const social of [false, true]) {
  test(`legacy HTTP ${social ? "social" : "screenshot"} preparation and read-only display remain separate`, async () => {
    const project = "00000000-0000-4000-8000-000000000001";
    const catalogKey = "a".repeat(64);
    const templateId = social ? "social-clean" : "default";
    const writes: string[] = [];
    const api = createServer((req, res) => {
      const url = new URL(req.url!, "http://fixture.local");
      if (req.method === "POST") writes.push(url.pathname);
      res.setHeader("content-type", "application/json");
      const data = url.pathname.endsWith("/generate")
        ? { catalogKey, cacheHit: true, templatePayloads: { [templateId]: {} } }
        : url.pathname.endsWith("/template-catalog")
          ? {
              [social ? "templateLayoutsByFormat" : "templateLayoutsByDevice"]:
                {
                  [social ? "og" : "phone"]: {
                    [templateId]: {
                      screens: [],
                      privateAsset: "signed-fixture",
                    },
                  },
                },
            }
          : url.pathname.endsWith("/templates") ||
              url.pathname.endsWith("/social-templates")
            ? { templates: [{ id: templateId, name: "Fixture" }] }
            : { id: project };
      res.end(JSON.stringify(data));
    });
    await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
    const baseUrl = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
    const previousRemote = process.env.APPLAUNCHFLOW_MCP_REMOTE;
    process.env.APPLAUNCHFLOW_MCP_REMOTE = "1";
    const hosted = createServer(async (req, res) => {
      const handler = createMcpHandler(
        () =>
          createAppLaunchFlowServer(
            { baseUrl, token: "synthetic-token" },
            { hosted: true },
          ),
        { legacy: "stateless" },
      );
      try {
        await toNodeHandler(handler)(req, res);
      } finally {
        await handler.close();
      }
    });
    await new Promise<void>((resolve) =>
      hosted.listen(0, "127.0.0.1", resolve),
    );
    const endpoint = `http://127.0.0.1:${(hosted.address() as AddressInfo).port}/mcp`;
    async function call(name: string, args: Record<string, unknown>) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "2025-06-18",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name,
            arguments: args,
            _meta: { progressToken: "synthetic-progress" },
          },
        }),
      });
      assert.equal(response.status, 200);
      const body = await response.text();
      const packets = body.startsWith("{")
        ? [JSON.parse(body)]
        : body
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => JSON.parse(line.slice(5)));
      return {
        packets,
        result: packets.find((packet) => packet.id === 1)?.result,
      };
    }
    try {
      const prepared = await call(
        social ? "prepare_social_graphics_styles" : "prepare_screenshot_styles",
        {
          generationId: project,
          selectedScreenshotPaths: ["one.png", "two.png", "three.png"],
        },
      );
      assert.ok(
        prepared.packets.some(
          (packet) => packet.method === "notifications/progress",
        ),
      );
      assert.equal(
        prepared.result.structuredContent.data.catalogKey,
        catalogKey,
      );
      assert.equal(
        prepared.result._meta?.[social ? "socialGraphicsPicker" : "picker"],
        undefined,
      );
      for (let i = 0; i < 2; i++) {
        const displayed = await call(
          social ? "browse_social_templates" : "browse_templates",
          { generationId: project, catalogKey },
        );
        assert.equal(displayed.result.isError, undefined);
        assert.deepEqual(displayed.result.content.map((item: { type: string }) => item.type), ["text"]);
        assert.ok(displayed.result.content[0].text.includes(displayed.result.structuredContent.data.galleryUrl));
        assert.equal(
          displayed.packets.some(
            (packet) => packet.method === "notifications/progress",
          ),
          false,
        );
        assert.ok(
          gunzipSync(
            Buffer.from(
              displayed.result._meta[social ? "socialGraphicsPicker" : "picker"]
                .payloadGzipBase64,
              "base64",
            ),
          )
            .toString("utf8")
            .includes("signed-fixture"),
        );
        assert.equal(
          JSON.stringify(displayed.result.structuredContent).includes(
            "signed-fixture",
          ),
          false,
        );
      }
      assert.deepEqual(writes, [
        social ? "/api/v1/graphics/generate" : "/api/v1/screenshots/generate",
      ]);
    } finally {
      if (previousRemote === undefined)
        delete process.env.APPLAUNCHFLOW_MCP_REMOTE;
      else process.env.APPLAUNCHFLOW_MCP_REMOTE = previousRemote;
      hosted.closeAllConnections();
      api.closeAllConnections();
      await Promise.all([
        new Promise<void>((resolve) => hosted.close(() => resolve())),
        new Promise<void>((resolve) => api.close(() => resolve())),
      ]);
    }
  });
}
