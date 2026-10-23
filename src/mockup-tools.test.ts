import assert from "node:assert/strict";
import test from "node:test";
import { McpServer } from "@modelcontextprotocol/server";
import { AppLaunchFlowApiError } from "./client/api.js";
import type { AppLaunchFlowClient } from "./client/api.js";
import { registerMockupTools } from "./tools/mockups.js";

const projectId = "00000000-0000-4000-8000-000000000001";
const variantId = "00000000-0000-4000-8000-000000000002";
type Handler = (args: Record<string, unknown>, extra: unknown) => Promise<any>;

function setup(overrides: Record<string, unknown>) {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const record =
    (name: string, result: unknown) =>
    async (...args: unknown[]) => {
      calls.push({ name, args });
      if (result instanceof Error) throw result;
      return typeof result === "function" ? result(...args) : result;
    };
  const base: Record<string, unknown> = {
    credentials: { token: "t", baseUrl: "http://localhost:3014" },
  };
  for (const [name, result] of Object.entries(overrides))
    base[name] = record(name, result);
  const server = new McpServer({ name: "mockup-test", version: "1" });
  registerMockupTools(server, base as unknown as AppLaunchFlowClient);
  const handlers = (
    server as unknown as {
      _registeredTools: Record<string, { handler: Handler }>;
    }
  )._registeredTools;
  const call = (name: string, args: Record<string, unknown>) =>
    handlers[name].handler(args, { mcpReq: { signal: undefined } });
  return { calls, call };
}
const text = (result: { content: Array<{ text?: string }> }) =>
  result.content.map((c) => c.text ?? "").join("\n");

test("create forwards device and platform so presets are fitted server-side", async () => {
  const { calls, call } = setup({
    createMockupAnimation: {
      variantId,
      deviceModelId: "macbook-pro-14",
      motionDurationSeconds: 6,
    },
  });
  const result = await call("create_mockup_animation", {
    projectId,
    screenshotPath: "desktop/mac.png",
    presetId: "hero-launch",
    device: "laptop",
  });
  assert.equal(result.isError, undefined);
  assert.deepEqual(calls[0].args[0], {
    generationId: projectId,
    screenshotPath: "desktop/mac.png",
    presetId: "hero-launch",
    device: "laptop",
    platform: undefined,
    outputRatio: undefined,
    motionDurationSeconds: undefined,
    label: undefined,
  });
  assert.match(text(result), /macbook-pro-14, 6s/);
});

test("get resolves the active variant; update needs it and surfaces server notes", async () => {
  const { calls, call } = setup({
    getMockupAnimation: { project: { state: {} }, variantId },
    updateMockupAnimation: {
      project: {},
      ignoredFields: ["state.cameraHole"],
      warnings: ['"Device 1" changed from phone to MacBook'],
    },
  });
  const read = await call("get_mockup_animation", { generationId: projectId });
  assert.equal(read.structuredContent.data.variantId, variantId);
  assert.match(read.structuredContent.data.editorUrl, new RegExp(variantId));

  const update = await call("update_mockup_animation", {
    projectId,
    variantId,
    state: { motionDuration: 5 },
    fitMotionToDevice: true,
  });
  assert.equal(update.isError, undefined, text(update));
  assert.deepEqual(calls.at(-1)!.args[0], {
    generationId: projectId,
    variantId,
    state: { motionDuration: 5 },
    fitMotionToDevice: true,
  });
  assert.match(text(update), /Ignored unknown fields \(not saved\): state\.cameraHole/);
  assert.match(text(update), /Note: "Device 1" changed/);

  // The receipt was consumed.
  const again = await call("update_mockup_animation", {
    projectId,
    variantId,
    state: {},
    fitMotionToDevice: true,
  });
  assert.equal(again.isError, true);
});

test("preview returns server-rendered PNG frames as image content", async (t) => {
  const png = Buffer.from("png-bytes");
  t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.match(String(url), /^https:\/\/s3\.test\/still-/);
    return new Response(png, { headers: { "content-type": "image/png" } });
  });
  const { calls, call } = setup({
    previewMockupAnimation: {
      variantId,
      width: 720,
      height: 540,
      motionDurationSeconds: 6,
      frames: [
        { timeSeconds: 0, frame: 0, url: "https://s3.test/still-0.png" },
        { timeSeconds: 3, frame: 90, url: "https://s3.test/still-90.png" },
      ],
    },
  });
  const result = await call("preview_mockup_animation", {
    projectId,
    times: [0, 3],
    scale: 0.5,
  });
  assert.deepEqual(calls[0].args[0], {
    generationId: projectId,
    variantId: undefined,
    times: [0, 3],
    scale: 0.5,
  });
  const images = result.content.filter((c: { type: string }) => c.type === "image");
  assert.equal(images.length, 2);
  assert.equal(images[0].mimeType, "image/png");
  assert.equal(images[0].data, png.toString("base64"));
  assert.equal(result.structuredContent, undefined);
  assert.match(result.content[0].text, /t=0s, t=3s/);
});

test("export errors carry a concrete next step", async () => {
  for (const [code, pattern] of [
    ["EXPORT_TOO_LONG", /strictly under 30 seconds/],
    ["transparent_server_export", /Set a background/],
    ["api_export_quota_exhausted", /Do not retry/],
  ] as const) {
    const { call } = setup({
      exportMockupAnimation: new AppLaunchFlowApiError("Rejected", 400, {
        code,
      }),
    });
    const result = await call("export_mockup_animation", {
      projectId,
      format: "mp4",
      quality: "1080p",
      fps: 30,
    });
    assert.equal(result.isError, true);
    assert.match(text(result), pattern);
  }
  const { calls, call } = setup({
    exportMockupAnimation: { status: "queued", exportJobId: variantId },
  });
  const queued = await call("export_mockup_animation", {
    projectId,
    format: "webm",
    quality: "720p",
    fps: 60,
    idempotencyKey: "retry-key-123",
  });
  assert.equal(queued.structuredContent.data.exportJobId, variantId);
  assert.deepEqual(calls[0].args, [
    {
      projectId,
      variantId: undefined,
      options: { format: "webm", quality: "720p", fps: 60 },
    },
    "retry-key-123",
  ]);
});

test("export status resolves the finished file to a download URL", async () => {
  const { call } = setup({
    getExportJob: {
      export: { status: "completed", fileName: "app-animation.mp4", fileSize: 10 },
      downloadUrl: "/api/v1/export-history/h1/download",
    },
    getExportDownload: (path: string) => {
      assert.equal(path, "/api/v1/export-history/h1/download");
      return { url: "https://s3.test/app.mp4", expiresAt: "soon" };
    },
  });
  const result = await call("get_mockup_animation_export", {
    exportJobId: variantId,
    waitSeconds: 0,
  });
  assert.equal(result.structuredContent.data.downloadUrl, "https://s3.test/app.mp4");

  const failed = setup({
    getExportJob: {
      export: { status: "failed", errorMessage: "Lambda timeout", progress: 40 },
    },
  });
  const failure = await failed.call("get_mockup_animation_export", {
    exportJobId: variantId,
    waitSeconds: 0,
  });
  assert.match(text(failure), /failed: Lambda timeout.*refunded/);
});

test("presets come from the server catalog; AI motion maps the Duo to phone", async () => {
  const catalog = { deviceModels: [{ id: "iphone-duo" }], finishes: [] };
  const presets = setup({
    getMockupPresets: catalog,
    getMockupThemeColors: new Error("no screenshots"),
  });
  const result = await presets.call("list_mockup_presets", { projectId });
  assert.deepEqual(result.structuredContent.data.deviceModels, catalog.deviceModels);
  assert.equal(result.structuredContent.data.themeColors, null);

  const motion = setup({ generateMockupMotion: { motion: { keyframes: [] } } });
  await motion.call("generate_mockup_motion", {
    projectId,
    prompt: "slow spin",
    deviceKind: "duo",
  });
  assert.deepEqual(motion.calls[0].args[0], {
    generationId: projectId,
    prompt: "slow spin",
    deviceKind: "phone",
  });
});

test("media listing asks for video metadata by default", async () => {
  const { calls, call } = setup({ listMockupMedia: { media: [] } });
  await call("list_mockup_media", { projectId, includeMetadata: true });
  assert.deepEqual(calls[0].args, [projectId, { includeMetadata: true }]);
});
