import assert from "node:assert/strict";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createAppLaunchFlowServer } from "./index.js";

const projectId = "00000000-0000-4000-8000-000000000001";
const variantId = "00000000-0000-4000-8000-000000000002";
const layout = { template: "social-clean", canvasWidth: 3840, canvasHeight: 1646, screens: [{ id: "s" }] };

type Call = { method: string; path: string; query: Record<string, string>; body?: any };

async function withServer(
  t: test.TestContext,
  respond: (call: Call) => Response | Promise<Response>,
  run: (client: Client, calls: Call[]) => Promise<void>,
) {
  const calls: Call[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const call: Call = {
      method: init?.method ?? "GET",
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    return respond(call);
  });
  const server = createAppLaunchFlowServer({ baseUrl: "https://dashboard.applaunchflow.com", token: "test" });
  const client = new Client({ name: "graphics-tools-test", version: "1" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
  try {
    await run(client, calls);
  } finally {
    await client.close();
    await server.close();
  }
}

test("graphics reads are language-scoped, flag derived formats and bind the receipt to the language", async (t) => {
  await withServer(
    t,
    (call) =>
      call.method === "GET"
        ? Response.json({ variantId, language: "de", graphics: [{ format: "app_store_header", layout }], derivedFormats: ["app_store_header"] })
        : Response.json({ success: true, variantId }),
    async (client, calls) => {
      const read = await client.callTool({
        name: "get_graphics_format",
        arguments: { generationId: projectId, variantId, language: "de", format: "app_store_header" },
      });
      assert.equal(read.isError, undefined);
      assert.deepEqual(calls[0].query, { projectId, variantId, format: "app_store_header", language: "de" });
      assert.equal((read.structuredContent as any).data.derived, true);
      assert.match(JSON.stringify(read.content), /never saved on this variant/);

      const otherLanguage = await client.callTool({
        name: "save_graphics_format",
        arguments: { generationId: projectId, variantId, format: "app_store_header", layout },
      });
      assert.equal(otherLanguage.isError, true, "a German read does not unlock a source-language save");

      const saved = await client.callTool({
        name: "save_graphics_format",
        arguments: { generationId: projectId, variantId, language: "de", format: "app_store_header", layout },
      });
      assert.equal(saved.isError, undefined);
      const post = calls.find((call) => call.method === "POST")!;
      assert.equal(post.path, "/api/v1/graphics/format");
      assert.equal(post.body.language, "de");
    },
  );
});

test("transform_graphics posts multi-format operations and returns a summary without layouts", async (t) => {
  await withServer(
    t,
    () =>
      Response.json({
        success: true,
        variantId,
        language: "en",
        updatedFormats: ["og", "x_post"],
        derivedFormats: [],
        syncedFormats: ["x_post"],
        graphics: [
          { format: "og", layout },
          { format: "x_post", layout },
          { format: "instagram_story", layout },
        ],
      }),
    async (client, calls) => {
      const invalid = await client.callTool({ name: "transform_graphics", arguments: { generationId: projectId } });
      assert.equal(invalid.isError, true);
      assert.equal(calls.length, 0);

      const result = await client.callTool({
        name: "transform_graphics",
        arguments: { generationId: projectId, variantId, syncFrom: "og", formats: ["x_post"] },
      });
      assert.equal(result.isError, undefined);
      assert.equal(calls[0].path, "/api/v1/graphics/transform");
      assert.deepEqual(calls[0].body.operations, []);
      assert.equal(calls[0].body.syncFrom, "og");
      const data = (result.structuredContent as any).data;
      assert.equal(data.graphics, undefined);
      assert.deepEqual(data.updatedFormats, ["og", "x_post"]);
      assert.deepEqual(Object.keys((result._meta?.layoutResult as any).layouts), ["og", "x_post"]);
      assert.match(data.editorUrl, /format=og/);
    },
  );
});

test("render_graphics returns inline previews and delivery URLs", async (t) => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  await withServer(
    t,
    (call) => {
      if (call.path.startsWith("/preview/")) return new Response(jpeg);
      return Response.json({
        renderId: "00000000-0000-4000-8000-000000000003",
        mode: call.path.endsWith("/export") ? "export" : "preview",
        variantId,
        platform: "ios",
        languages: ["en"],
        expiresAt: "2026-10-23T08:30:00.000Z",
        graphics: [
          {
            format: "app_store_header",
            language: "en",
            width: 3840,
            height: 1646,
            derived: false,
            preview: { url: "https://dashboard.applaunchflow.com/preview/header.jpg", width: 1024, height: 439 },
            ...(call.path.endsWith("/export")
              ? { file: { path: "app-header.png", contentType: "image/png", sizeInBytes: 10, url: "https://s3.example/app-header.png" } }
              : {}),
          },
        ],
        ...(call.path.endsWith("/export") ? { zip: { fileName: "all.zip", sizeInBytes: 20, url: "https://s3.example/all.zip" } } : {}),
      });
    },
    async (client, calls) => {
      const preview = await client.callTool({
        name: "render_graphics",
        arguments: { generationId: projectId, formats: ["app_store_header"] },
      });
      assert.equal(preview.isError, undefined);
      assert.equal(calls[0].path, "/api/v1/graphics/preview");
      const image = (preview.content as any[]).find((item) => item.type === "image");
      assert.equal(image.mimeType, "image/jpeg");
      assert.equal(image.data, jpeg.toString("base64"));

      const exported = await client.callTool({
        name: "render_graphics",
        arguments: { generationId: projectId, formats: ["app_store_header"], languages: ["en"], mode: "export" },
      });
      assert.equal(calls.find((call) => call.path === "/api/v1/graphics/export")?.body.languages[0], "en");
      const text = (exported.content as any[])[0].text as string;
      assert.match(text, /app-header\.png https:\/\/s3\.example\/app-header\.png/);
      assert.match(text, /ZIP: all\.zip https:\/\/s3\.example\/all\.zip/);
    },
  );
});

test("translation, language listing and settings tools call their v1 operations", async (t) => {
  await withServer(
    t,
    (call) =>
      Response.json(
        call.path.endsWith("/translations")
          ? { variantId, sourceLanguage: "en", availableLanguages: ["en", "de"] }
          : { success: true, variantId, results: [] },
      ),
    async (client, calls) => {
      await client.callTool({ name: "translate_graphics", arguments: { generationId: projectId, targetLanguages: ["de"] } });
      await client.callTool({ name: "list_graphics_translations", arguments: { generationId: projectId } });
      const missing = await client.callTool({ name: "update_graphics_settings", arguments: { generationId: projectId } });
      assert.equal(missing.isError, true);
      await client.callTool({ name: "update_graphics_settings", arguments: { generationId: projectId, platform: "android", primaryFormat: "app_store_header" } });
      assert.deepEqual(
        calls.map((call) => `${call.method} ${call.path}`),
        ["POST /api/v1/graphics/translate", "GET /api/v1/graphics/translations", "POST /api/v1/graphics/settings"],
      );
      assert.deepEqual(calls[0].body.targetLanguages, ["de"]);
      assert.deepEqual(calls[2].body, { generationId: projectId, platform: "android", primaryFormat: "app_store_header" });
    },
  );
});

test("browse_social_templates returns template names and format export rules", async (t) => {
  await withServer(
    t,
    () =>
      Response.json({
        templates: [
          {
            id: "social-clean",
            name: "Clean",
            description: "Minimal",
            formats: [
              { id: "app_store_header", label: "Product Page Header", width: 3840, height: 1646, groups: ["app_store"], opaqueExport: "png" },
              { id: "play_store_feature", label: "Feature Graphic", width: 1024, height: 500, groups: ["app_store"], opaqueExport: "jpeg" },
            ],
          },
        ],
      }),
    async (client) => {
      const result = await client.callTool({ name: "browse_social_templates", arguments: {} });
      const data = (result.structuredContent as any).data;
      assert.deepEqual(data.templates, [{ id: "social-clean", name: "Clean", description: "Minimal" }]);
      assert.equal(data.formats[0].opaqueExport, "png");
      assert.match(JSON.stringify(result.content), /app_store_header 3840x1646 PNG only, no alpha/);
    },
  );
});
