import assert from "node:assert/strict";
import test from "node:test";
import { McpServer } from "@modelcontextprotocol/server";
import type { AppLaunchFlowClient } from "./client/api.js";
import { registerLayoutTools } from "./tools/layouts.js";
import { registerScreenshotExtraTools } from "./tools/screenshot-extras.js";
import { registerStockPhotoTools } from "./tools/stock-photos.js";
import { registerAssetTools } from "./tools/assets.js";
import {
  registerLocalizationTools,
  SUPPORTED_LANGUAGE_CODES,
} from "./tools/localization.js";
import { SUPPORTED_DEVICES, TRANSFORM_SCHEMA_RESOURCE } from "./resources/data.js";
import { TOOL_ANNOTATIONS } from "./tool-metadata.js";
import contracts from "./resources/editor-contracts.generated.json" with { type: "json" };

type Handler = (args: Record<string, unknown>, ctx: unknown) => Promise<any>;
const credentials = { token: "synthetic", baseUrl: "http://localhost:3000" };
const project = "00000000-0000-4000-8000-000000000001";
const variant = "00000000-0000-4000-8000-000000000002";

function handlers(
  register: (server: McpServer, client: AppLaunchFlowClient) => void,
  client: Record<string, unknown>,
) {
  const server = new McpServer({ name: "test", version: "1" });
  register(server, { credentials, ...client } as unknown as AppLaunchFlowClient);
  return (server as unknown as { _registeredTools: Record<string, { handler: Handler }> })
    ._registeredTools;
}

const ctx = { mcpReq: {} };
const text = (result: { content: Array<{ type: string; text?: string }> }) =>
  result.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");

test("transform_layout defaults to the phone layout and surfaces server warnings", async () => {
  const bodies: Record<string, unknown>[] = [];
  const tools = handlers(registerLayoutTools, {
    getLayout: async () => ({ mobileLayout: { screens: [] } }),
    transformLayout: async (body: Record<string, unknown>) => {
      bodies.push(body);
      return { success: true, warnings: ["phoneId has no visible effect"] };
    },
  });
  const target = { generationId: project, language: "en" };
  const operations = [
    {
      type: "update_node",
      target: { nodeType: "layout" },
      changes: { themeColors: { primary: "#111111" }, backgroundGradient: null },
    },
  ];
  await tools.get_layout.handler(target, {});
  const result = await tools.transform_layout.handler({ ...target, operations }, {});
  assert.notEqual(result.isError, true);
  assert.deepEqual(bodies[0].layouts, ["mobile"]);
  assert.match(text(result), /Warnings: phoneId has no visible effect/);
  assert.match(text(result), /preview_screenshots/);
  await tools.get_layout.handler(target, {});
  await tools.transform_layout.handler(
    { ...target, layouts: ["mobile", "tablet"], operations },
    {},
  );
  assert.deepEqual(bodies[1].layouts, ["mobile", "tablet"]);
  await tools.get_layout.handler(target, {});
  await tools.transform_layout.handler(
    { ...target, formatId: "ios-6.5", operations },
    {},
  );
  assert.equal("layouts" in bodies[2], false);
});

test("preview_screenshots returns the rendered images as image content", async () => {
  const requests: Record<string, unknown>[] = [];
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => {
    assert.match(String(url), /^https:\/\/storage\.test\/screen-/);
    return new Response(png, { headers: { "content-type": "image/jpeg" } });
  }) as typeof fetch;
  try {
    const tools = handlers(registerScreenshotExtraTools, {
      previewScreenshots: async (body: Record<string, unknown>) => {
        requests.push(body);
        return {
          projectId: project,
          variantId: variant,
          language: "en",
          platform: "ios",
          device: "phone",
          size: "6.9",
          renderedWidth: 1320,
          renderedHeight: 2868,
          screenCount: 5,
          renderMs: 1234,
          images: [0, 2].map((screenIndex) => ({
            screenIndex,
            width: 471,
            height: 1024,
            mimeType: "image/jpeg",
            url: `https://storage.test/screen-${screenIndex}.jpg`,
            expiresAt: "2026-10-23T12:00:00Z",
          })),
        };
      },
    });
    const result = await tools.preview_screenshots.handler(
      { projectId: project, screens: [0, 2] },
      ctx,
    );
    assert.equal(requests[0].format, "jpeg");
    assert.deepEqual(requests[0].screens, [0, 2]);
    const images = result.content.filter((c: { type: string }) => c.type === "image");
    assert.equal(images.length, 2);
    assert.equal(images[0].data, png.toString("base64"));
    assert.equal(images[0].mimeType, "image/jpeg");
    assert.match(text(result), /Rendered 2 of 5 screens/);
    assert.equal(result.structuredContent, undefined);
    assert.doesNotMatch(JSON.stringify(result), /storage\.test/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("locale screenshots, layout sync and fonts call the dashboard operations", async () => {
  const calls: Array<[string, unknown]> = [];
  const tools = handlers(registerScreenshotExtraTools, {
    bulkApplyScreenshots: async (body: unknown) => {
      calls.push(["bulk", body]);
      return (body as { preview: boolean }).preview
        ? {
            previews: [
              {
                language: "de",
                layout: { huge: true },
                assets: [{ path: "mobile/ios/de-1.png", signedUrl: "x" }],
                assignments: { shot: "mobile/ios/de-1.png" },
              },
            ],
          }
        : { success: true, translationsUpdated: 1, results: [] };
    },
    syncLayoutTranslations: async (body: unknown) => {
      calls.push(["sync", body]);
      return { success: true, translationsSynced: 3 };
    },
    listFonts: async (query: unknown) => {
      calls.push(["fonts", query]);
      return { fonts: [{ family: "Inter" }] };
    },
  });
  const folder = "00000000-0000-4000-8000-000000000003";
  const preview = await tools.apply_locale_screenshots.handler(
    {
      projectId: project,
      variantId: variant,
      deviceType: "mobile",
      platform: "both",
      localeFolders: { de: folder },
      preview: true,
    },
    {},
  );
  assert.deepEqual(calls[0][1], {
    projectId: project,
    targets: [{ variantId: variant }],
    deviceType: "mobile",
    platform: "both",
    localeFolders: { de: folder },
    preview: true,
  });
  assert.doesNotMatch(text(preview), /huge/);
  assert.match(text(preview), /"shot": "mobile\/ios\/de-1.png"/);
  const ambiguous = await tools.apply_locale_screenshots.handler(
    {
      projectId: project,
      variantId: variant,
      deviceType: "mobile",
      platform: "both",
      localeFolders: { de: folder },
      screenshotPaths: ["mobile/ios/a.png"],
    },
    {},
  );
  assert.equal(ambiguous.isError, true);
  await tools.sync_layout.handler(
    { generationId: project, variantId: variant, fillMissingImages: true },
    ctx,
  );
  assert.deepEqual(calls[1], [
    "sync",
    { generationId: project, variantId: variant, fillMissingImages: true },
  ]);
  await tools.list_fonts.handler({ projectId: project, query: "int" }, {});
  assert.deepEqual(calls[2], ["fonts", { projectId: project, query: "int", limit: undefined }]);
});

test("stock photo search returns import inputs that import_stock_photo forwards", async () => {
  const imports: Array<[string, Record<string, unknown>]> = [];
  const tools = handlers(registerStockPhotoTools, {
    searchStockPhotos: async (provider: string, query: Record<string, unknown>) => {
      assert.equal(provider, "unsplash");
      assert.equal(query.orientation, "squarish");
      return {
        total: 1,
        page: 1,
        hasMore: false,
        photos: [
          {
            id: "abc",
            width: 4000,
            height: 3000,
            photographer: "Ada",
            photographerUrl: "https://unsplash.com/@ada",
            unsplashUrl: "https://unsplash.com/photos/abc",
            downloadLocation: "https://api.unsplash.com/photos/abc/download",
            src: { original: "https://images.unsplash.com/abc", small: "https://images.unsplash.com/abc?w=400" },
          },
        ],
      };
    },
    importStockPhoto: async (provider: string, body: Record<string, unknown>) => {
      imports.push([provider, body]);
      return { url: "https://signed", path: "panorama/unsplash-abc-1.jpg", attribution: { source: "unsplash" } };
    },
  });
  const found = await tools.search_stock_photos.handler(
    { provider: "unsplash", query: "mountains", orientation: "square" },
    {},
  );
  const photo = found.structuredContent.data.photos[0];
  assert.equal(photo.previewUrl, "https://images.unsplash.com/abc?w=400");
  const imported = await tools.import_stock_photo.handler(
    { projectId: project, provider: "unsplash", importInput: photo.importInput },
    {},
  );
  assert.deepEqual(imports[0], [
    "unsplash",
    {
      imageUrl: "https://images.unsplash.com/abc",
      unsplashId: "abc",
      photographer: "Ada",
      photographerUrl: "https://unsplash.com/@ada",
      unsplashUrl: "https://unsplash.com/photos/abc",
      downloadLocation: "https://api.unsplash.com/photos/abc/download",
      projectId: project,
    },
  ]);
  assert.equal(imported.structuredContent.data.path, "panorama/unsplash-abc-1.jpg");
  assert.match(text(imported), /storagePath/);
});

test("font uploads register a project font family unless disabled", async () => {
  const registered: unknown[] = [];
  const tools = handlers(
    (server, client) => registerAssetTools(server, client, { hosted: false }),
    {
      createSignedUpload: async (body: { filename: string }) => ({
        uploadUrl: "https://upload.test",
        path: `fonts/1-${body.filename}`,
        filename: `1-${body.filename}`,
        subfolder: "fonts",
      }),
      uploadBinary: async () => undefined,
      registerCustomFont: async (body: unknown) => {
        registered.push(body);
        return { family: "Brand", font: { name: "Brand" } };
      },
    },
  );
  const source = {
    base64: Buffer.from("font-bytes").toString("base64"),
    filename: "Brand-Bold.ttf",
  };
  const result = await tools.upload_asset.handler(
    { projectId: project, fileType: "font", source },
    {},
  );
  assert.notEqual(result.isError, true, text(result));
  assert.match(String((registered[0] as { path: string }).path), /^fonts\/1-.*Brand-Bold\.ttf$/);
  assert.equal(result.structuredContent.data.fontFamily, "Brand");
  await tools.upload_asset.handler(
    { projectId: project, fileType: "font", source, registerFont: false },
    {},
  );
  assert.equal(registered.length, 1);
});

test("translate_layouts accepts all 51 dashboard languages and is marked destructive", async () => {
  assert.equal(SUPPORTED_LANGUAGE_CODES.length, 51);
  for (const code of ["bn", "gu", "kn", "ml", "mr", "or", "pa", "sl", "ta", "te", "ur"])
    assert.ok((SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code), code);
  assert.equal(TOOL_ANNOTATIONS.translate_layouts.destructiveHint, true);
  const tools = handlers(registerLocalizationTools, {
    translateLayouts: async (body: unknown) => body,
  });
  const result = await tools.translate_layouts.handler(
    { generationId: project, targetLanguages: ["ta", "ur"] },
    {},
  );
  assert.notEqual(result.isError, true);
});

test("device and transform resources match the editor contracts", () => {
  const configSource = contracts.documents.find((doc) =>
    doc.path.endsWith("src/features/mockups/config.ts"),
  )!.declarations as unknown as Record<string, string>;
  const finishes = (name: string) =>
    [...configSource[name].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
  const byModel = Object.fromEntries(
    SUPPORTED_DEVICES.models3D.map((model) => [model.modelId, model.finishes]),
  );
  assert.deepEqual(byModel["iphone-17-pro"], [
    ...finishes("IPHONE_18_FINISH_KEYS"),
    ...finishes("IPHONE_17_FINISH_KEYS"),
  ]);
  assert.deepEqual(byModel["google-pixel-10-pro"], finishes("PIXEL_FINISH_KEYS"));
  assert.deepEqual(byModel["iphone-duo"], finishes("IPHONE_DUO_FINISH_KEYS"));
  assert.ok(SUPPORTED_DEVICES.watch.length === 3);
  assert.ok(TRANSFORM_SCHEMA_RESOURCE.nodeTypes.includes("magnifier"));
  assert.ok(TRANSFORM_SCHEMA_RESOURCE.nodeTypes.includes("layout"));
  assert.ok(TRANSFORM_SCHEMA_RESOURCE.operations.includes("bring_to_front"));
});
