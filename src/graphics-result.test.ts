import assert from "node:assert/strict";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createAppLaunchFlowServer } from "./index.js";

test("social saves attach saved signed layouts privately, with failure isolated from save", async (t) => {
  const projectId = "00000000-0000-4000-8000-000000000001";
  const variantId = "00000000-0000-4000-8000-000000000002";
  const layout = {
    screens: [{ id: "saved" }],
    image: "https://example.com/private-signed-image",
  };
  let previewFails = false;
  let saves = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (init?.method === "POST") {
        saves++;
        return Response.json({ success: true, variantId });
      }
      if (previewFails)
        return Response.json({ error: "unavailable" }, { status: 403 });
      assert.equal(url.pathname, "/api/v1/graphics");
      return Response.json({
        variantId,
        language: "de",
        graphics: [
          { format: "og", layout },
          { format: "instagram_story", layout },
        ],
      });
    },
  );
  const server = createAppLaunchFlowServer({
    baseUrl: "https://dashboard.applaunchflow.com",
    token: "test",
  });
  const client = new Client({ name: "graphics-result-test", version: "1" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
  try {
    const listed = await client.listTools();
    for (const name of ["save_graphics", "save_graphics_format"]) {
      assert.equal(
        (listed.tools.find((tool) => tool.name === name)?._meta?.ui as any)
          ?.resourceUri,
        "ui://applaunchflow/layout-result-v1.html",
      );
    }
    await client.callTool({
      name: "get_graphics_format",
      arguments: { generationId: projectId, variantId, format: "og" },
    });
    const single = await client.callTool({
      name: "save_graphics_format",
      arguments: {
        generationId: projectId,
        variantId,
        format: "og",
        layout: { screens: [] },
      },
    });
    assert.equal(single.isError, undefined);
    assert.deepEqual(Object.keys((single._meta?.layoutResult as any).layouts), [
      "og",
    ]);
    assert.deepEqual((single._meta?.layoutResult as any).layouts.og, layout);
    assert.doesNotMatch(
      JSON.stringify(single.structuredContent) + JSON.stringify(single.content),
      /private-signed-image/,
    );
    const args = {
      generationId: projectId,
      variantId,
      socialTemplateId: "social-bold",
      socialPrimaryFormat: "instagram_story",
      graphics: [
        { format: "og", layout: {} },
        { format: "instagram_story", layout: {} },
      ],
    };
    const full = await client.callTool({
      name: "save_graphics",
      arguments: args,
    });
    assert.deepEqual(Object.keys((full._meta?.layoutResult as any).layouts), [
      "instagram_story",
      "og",
    ]);
    assert.equal((full._meta?.layoutResult as any).language, "de");
    previewFails = true;
    const failedPreview = await client.callTool({
      name: "save_graphics",
      arguments: args,
    });
    assert.equal(failedPreview.isError, undefined);
    assert.equal(failedPreview._meta?.layoutResult, undefined);
    assert.equal(saves, 3);
  } finally {
    await client.close();
    await server.close();
  }
});
