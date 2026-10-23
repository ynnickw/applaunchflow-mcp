import assert from "node:assert/strict";
import test from "node:test";
import { McpServer } from "@modelcontextprotocol/server";
import { AppLaunchFlowApiError, type AppLaunchFlowClient } from "./client/api.js";
import {
  parsePromoFormat,
  registerPromoVideoTools,
  resolvePromoExportOptions,
} from "./tools/promovideo.js";

type Handler = (args: Record<string, unknown>, ctx: unknown) => Promise<any>;

function setup(overrides: Record<string, unknown>) {
  const server = new McpServer({ name: "promo-test", version: "1" });
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const record =
    (name: string, result: unknown = {}) =>
    async (...args: unknown[]) => {
      calls.push({ name, args });
      return typeof result === "function" ? (result as Function)(...args) : result;
    };
  const client = {
    credentials: { token: "t", baseUrl: "http://localhost:3011" },
    getPromoVideo: record("getPromoVideo", {
      project: {
        id: "p",
        remotion_code: { previewFormat: "social:9:16", scenes: [] },
      },
      language: "en",
      sourceLanguage: "en",
      availableLanguages: ["en", "de"],
    }),
    updatePromoVideo: record("updatePromoVideo", {
      durationInFrames: 300,
      filledDefaults: ["version"],
      derived: ["phoneId"],
    }),
    ...Object.fromEntries(
      Object.entries(overrides).map(([key, value]) => [key, record(key, value)]),
    ),
  } as unknown as AppLaunchFlowClient;
  registerPromoVideoTools(server, client);
  const handlers = (
    server as unknown as { _registeredTools: Record<string, { handler: Handler }> }
  )._registeredTools;
  const call = (name: string, args: Record<string, unknown>) =>
    handlers[name].handler(args, { mcpReq: {} });
  return { calls, call };
}

const projectId = "00000000-0000-4000-8000-000000000001";

test("export options follow the editor dialog rules and the video's format", () => {
  assert.deepEqual(parsePromoFormat("ipad:11"), { category: "ipad", size: "11" });
  assert.deepEqual(parsePromoFormat("social:9:16"), {
    category: "social",
    size: "9:16",
  });
  assert.deepEqual(parsePromoFormat("bogus"), {
    category: "appStore",
    size: "default",
  });
  assert.deepEqual(resolvePromoExportOptions({}, "social:1:1"), {
    category: "social",
    size: "1:1",
    format: "mp4",
    quality: "1080p",
  });
  // A different category starts at its first size, not the video's.
  assert.equal(
    resolvePromoExportOptions({ category: "ipad" }, "social:1:1").size,
    "12.9",
  );
  assert.throws(
    () => resolvePromoExportOptions({ category: "ipad", size: "6.9" }, null),
    /not valid for category "ipad"/,
  );
  assert.throws(
    () =>
      resolvePromoExportOptions(
        { category: "creative", size: "header", quality: "720p" },
        null,
      ),
    /mp4 at 1080p only/,
  );
});

test("get returns the config as `config` and receipts are scoped per language", async () => {
  const { call, calls } = setup({});
  const read = await call("get_promo_video", {
    generationId: projectId,
    language: "de",
  });
  assert.equal(read.structuredContent.data.config.previewFormat, "social:9:16");
  assert.equal(read.structuredContent.data.project.remotion_code, undefined);
  assert.deepEqual(read.structuredContent.data.availableLanguages, ["en", "de"]);
  assert.deepEqual(calls[0].args, [projectId, undefined, "de"]);

  // A read of "de" does not unlock a write to the source language.
  const blocked = await call("update_promo_video", {
    projectId,
    config: { scenes: [] },
  });
  assert.equal(blocked.isError, true);
  assert.match(blocked.content[0].text, /get_promo_video first/);

  const saved = await call("update_promo_video", {
    projectId,
    language: "de",
    config: { scenes: [] },
  });
  assert.equal(saved.isError, undefined);
  const body = calls.find((c) => c.name === "updatePromoVideo")!.args[0] as Record<
    string,
    unknown
  >;
  assert.equal(body.language, "de");
  assert.deepEqual(saved.structuredContent.data.filledDefaults, ["version"]);
  assert.match(saved.content[0].text, /Derived: phoneId/);
});

test("update surfaces every server validation issue to the agent", async () => {
  const { call } = setup({
    updatePromoVideo: () => {
      throw new AppLaunchFlowApiError("Invalid video config", 400, {
        error: "Invalid video config: scenes.1.content.title: Invalid input",
        code: "VALIDATION_ERROR",
        details: [
          {
            path: ["scenes", 1, "content", "title"],
            message: "Invalid input: expected string, received undefined",
          },
        ],
      });
    },
  });
  await call("get_promo_video", { generationId: projectId });
  const result = await call("update_promo_video", {
    projectId,
    config: { scenes: [] },
  });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /scenes\.1\.content\.title/);
});

test("preview returns the PNG as image content with its timing", async () => {
  const png = Buffer.from("png").toString("base64");
  const { call, calls } = setup({
    previewPromoVideo: {
      mimeType: "image/png",
      png,
      frame: 135,
      timeSeconds: 4.5,
      durationInFrames: 450,
      fps: 30,
      sceneIndex: 2,
      sceneType: "feature",
      format: "appStore:default",
      width: 443,
      height: 960,
      language: "en",
    },
  });
  const result = await call("preview_promo_video", {
    projectId,
    sceneIndex: 2,
  });
  assert.equal(result.content[0].type, "image");
  assert.equal(result.content[0].data, png);
  assert.match(result.content[1].text, /frame 135 \(4\.50 s of 15\.00 s\), scene 2/);
  assert.equal(result.structuredContent, undefined);
  assert.deepEqual(calls[0].args[0], { projectId, sceneIndex: 2 });

  const bad = setup({ previewPromoVideo: { mimeType: "image/png", png: "" } });
  assert.equal(
    (await bad.call("preview_promo_video", { projectId })).isError,
    true,
  );
});

test("export defaults to the video's format and polling resolves a download URL", async () => {
  const { call, calls } = setup({
    exportPromoVideo: {
      status: "queued",
      exportJobId: "11111111-1111-4111-8111-111111111111",
    },
    getExport: {
      export: { status: "completed", progress: 1 },
      downloadUrl: "/api/v1/export-history/h1/download",
    },
    getDownloadLink: { url: "https://s3.test/video.mp4", expiresAt: "soon" },
  });
  const queued = await call("export_promo_video", {
    projectId,
    language: "de",
    quality: "720p",
    idempotencyKey: "export-key-1",
  });
  assert.equal(
    queued.structuredContent.data.exportId,
    "11111111-1111-4111-8111-111111111111",
  );
  const exportCall = calls.find((c) => c.name === "exportPromoVideo")!;
  assert.deepEqual(exportCall.args, [
    {
      projectId,
      variantId: undefined,
      language: "de",
      options: {
        category: "social",
        size: "9:16",
        format: "mp4",
        quality: "720p",
      },
    },
    "export-key-1",
  ]);

  const done = await call("get_promo_video_export", {
    exportId: "11111111-1111-4111-8111-111111111111",
  });
  assert.equal(done.structuredContent.data.status, "completed");
  assert.equal(done.structuredContent.data.downloadUrl, "https://s3.test/video.mp4");
  assert.deepEqual(
    calls.find((c) => c.name === "getDownloadLink")!.args,
    ["/api/v1/export-history/h1/download"],
  );
});

test("translate sends the batch request and generate accepts device type and 1-10 screenshots", async () => {
  const { call, calls } = setup({
    translatePromoVideo: {
      variantId: "v",
      sourceLanguage: "en",
      availableLanguages: ["en", "de"],
      results: [{ language: "de", success: true }],
    },
  });
  const result = await call("translate_promo_video", {
    projectId,
    targetLanguages: ["de"],
  });
  assert.equal(result.structuredContent.data.availableLanguages[1], "de");
  assert.deepEqual(calls[0].args[0], {
    generationId: projectId,
    variantId: undefined,
    targetLanguages: ["de"],
  });

  const server = new McpServer({ name: "schema", version: "1" });
  registerPromoVideoTools(server, {
    credentials: { token: "t", baseUrl: "http://x" },
  } as unknown as AppLaunchFlowClient);
  const generate = (
    server as unknown as {
      _registeredTools: Record<string, { inputSchema: { safeParse(v: unknown): { success: boolean } } }>;
    }
  )._registeredTools.generate_promo_video;
  const parse = (value: unknown) => generate.inputSchema.safeParse(value).success;
  assert.equal(
    parse({ projectId, deviceType: "tablet", selectedScreenshotPaths: ["tablet/ios/a.png"] }),
    true,
  );
  assert.equal(
    parse({ projectId, selectedScreenshotPaths: Array.from({ length: 11 }, (_, i) => `${i}.png`) }),
    false,
  );
  assert.equal(parse({ projectId, deviceType: "watch" }), false);
});
