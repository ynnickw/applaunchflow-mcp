import assert from "node:assert/strict";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createAppLaunchFlowServer } from "./index.js";
import { SOCIAL_FORMATS, isSocialFormat } from "./social-template-previews.js";

const project = "00000000-0000-4000-8000-000000000001";
const variant = "00000000-0000-4000-8000-000000000002";

test("App Store creatives support scoped full-layout edits and result previews through MCP", async (t) => {
  const writes: Record<string, unknown>[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: unknown, init?: RequestInit) => {
      if (init?.method === "POST") {
        writes.push(JSON.parse(String(init.body)));
        if (String(input).includes("/generate"))
          return Response.json({
            catalogKey: "test-catalog",
            templatePayloads: { "social-clean": {} },
          });
        return Response.json({ success: true, variantId: variant });
      }
      if (String(input).includes("template-catalog"))
        return Response.json({
          templateLayoutsByFormat: {
            app_store_header: { "social-clean": { screens: [] } },
          },
        });
      const format = new URL(String(input)).searchParams.get("format")!;
      return Response.json({
        variantId: variant,
        language: "en",
        graphics: [{ format, layout: { screens: [{ id: "screen-1" }] } }],
      });
    },
  );
  const server = createAppLaunchFlowServer(
    { baseUrl: "https://dashboard.applaunchflow.com", token: "synthetic-test" },
    { hosted: true },
  );
  const client = new Client({ name: "store-creatives-test", version: "1" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
  try {
    const tools = (await client.listTools()).tools;
    for (const format of ["app_store_header", "app_store_search"] as const) {
      assert.ok(isSocialFormat(format));
      assert.ok(SOCIAL_FORMATS.includes(format));
      for (const name of [
        "prepare_social_graphics_styles",
        "browse_social_templates",
        "apply_social_graphics_style",
        "get_graphics_format",
        "save_graphics_format",
        "save_graphics",
      ]) {
        assert.ok(
          JSON.stringify(
            tools.find((tool) => tool.name === name)?.inputSchema,
          ).includes(format),
          `${name} must accept ${format}`,
        );
      }
      const target = { generationId: project, variantId: variant, format };
      const layout = {
        canvasWidth: format === "app_store_header" ? 3840 : 1920,
        canvasHeight: format === "app_store_header" ? 1646 : 1280,
        screens: [
          {
            id: "screen-1",
            texts: [{ id: "title", text: "Edited headline" }],
            screenshots: [{ id: "device", image: "mobile/source.png" }],
          },
        ],
      };
      const blocked = await client.callTool({
        name: "save_graphics_format",
        arguments: { ...target, layout },
      });
      assert.equal(blocked.isError, true);
      const read = await client.callTool({
        name: "get_graphics_format",
        arguments: target,
      });
      const { readReceipt } = (
        read.structuredContent as { data: { readReceipt: string } }
      ).data;
      const result = await client.callTool({
        name: "save_graphics_format",
        arguments: { ...target, layout, readReceipt },
      });
      assert.notEqual(result.isError, true);
      assert.deepEqual(writes.at(-1), { ...target, layout });
      assert.ok(
        JSON.stringify(result._meta).includes(format),
        "saved creative must reach the result widget",
      );
    }
    assert.equal(writes.length, 2);
    const before = writes.length;
    const invalid = await client.callTool({
      name: "prepare_social_graphics_styles",
      arguments: {
        generationId: project,
        primaryFormat: "app_store_search",
        selectedScreenshotPaths: ["one.png"],
      },
    });
    assert.equal(invalid.isError, true);
    assert.equal(writes.length, before);
    const header = await client.callTool({
      name: "prepare_social_graphics_styles",
      arguments: {
        generationId: project,
        primaryFormat: "app_store_header",
        selectedScreenshotPaths: ["one.png"],
      },
    });
    assert.notEqual(header.isError, true);
    assert.deepEqual(writes.at(-1)?.selectedScreenshotPaths, ["one.png"]);
    assert.equal(header._meta?.socialGraphicsPicker, undefined);
    assert.equal(
      (header.structuredContent as any).data.primaryFormat,
      "app_store_header",
    );
    assert.equal(
      (header.structuredContent as any).data.displayTool,
      "browse_social_templates",
    );
  } finally {
    await client.close();
    await server.close();
  }
});
