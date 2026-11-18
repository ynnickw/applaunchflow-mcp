import assert from "node:assert/strict";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createAppLaunchFlowServer } from "./index.js";

const baseUrl = "https://dashboard.example";
const projectId = "3c22fb9b-979f-4e9c-941a-78fe5324c424";
const variantId = "2a0f2e59-45fe-4b01-b5b4-45c5fec08316";
const exportId = "a44cf8e1-6b0b-4976-8963-44dfd89c955f";
const recordings = [{ storagePath: "mockups/sample.mp4", durationSeconds: 5 }];
const motion = {
  label: "Open the lid",
  description: "MacBook lid motion.",
  keyframes: [0, 1].map((time) => ({
    id: String(time),
    time,
    x: 0,
    y: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 1,
    lidOpen: time,
    easing: "linear",
  })),
};

test("hosted MCP drives device-only creation, preview and transparent export through the versioned API", async (t) => {
  const requests: Array<{
    url: URL;
    body: Record<string, unknown>;
    key: string | null;
  }> = [];
  t.mock.method(globalThis, "fetch", async (input: URL, init?: RequestInit) => {
    const url = new URL(input);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const key = new Headers(init?.headers).get("Idempotency-Key");
    requests.push({ url, body, key });
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer test-token",
    );
    const envelope = (data: unknown) =>
      Response.json({ data, meta: { requestId: "test" } });
    switch (url.pathname) {
      case "/api/v1/assets/recordings":
        assert.equal(url.searchParams.get("projectId"), projectId);
        assert.equal(url.searchParams.get("includeMetadata"), "true");
        return envelope({
          media: [
            { kind: "image", path: "mockups/screen.png" },
            {
              kind: "video",
              path: recordings[0].storagePath,
              durationSeconds: 5,
              exportSafe: true,
              signedUrl: "https://storage.example/private?token=secret",
            },
          ],
        });
      case "/api/v1/promovideo/generate-motion":
        assert.deepEqual(body, {
          generationId: projectId,
          prompt: "Open the lid",
          deviceKind: "laptop",
        });
        return envelope({ motion: { ...motion, duration: 5 } });
      case "/api/v1/promovideo/create-device-only":
        assert.equal(key, "device-video-run-1");
        assert.deepEqual(body, {
          projectId,
          deviceType: "desktop",
          deviceModelId: "macbook-pro-14",
          recordings,
          customMotion: motion,
          previewFormat: "social:4:3",
        });
        return envelope({ variantId, durationInFrames: 150 });
      case "/api/v1/promovideo/preview":
        assert.deepEqual(body, {
          projectId,
          variantId,
          sceneIndex: 0,
          at: 0.5,
        });
        return envelope({
          mimeType: "image/png",
          png: "YWJj",
          frame: 75,
          durationInFrames: 150,
          fps: 30,
        });
      case "/api/v1/promovideo/load":
        assert.equal(url.searchParams.get("variantId"), variantId);
        return envelope({
          project: {
            variant_id: variantId,
            remotion_code: { previewFormat: "social:4:3" },
          },
        });
      case "/api/v1/promovideo/export":
        assert.equal(key, "device-export-run-1");
        assert.deepEqual(body, {
          projectId,
          variantId,
          transparentBackground: true,
          options: {
            category: "social",
            size: "4:3",
            format: "webm",
            quality: "1080p",
          },
        });
        return envelope({ exportJobId: exportId, status: "queued" });
      case `/api/v1/exports/${exportId}`:
        return envelope({
          export: { status: "completed", progress: 100 },
          downloadUrl: "/api/v1/exports/test/download",
        });
      case "/api/v1/exports/test/download":
        return envelope({ url: "https://download.example/video.webm" });
      default:
        throw new Error(`Unexpected API path ${url.pathname}`);
    }
  });

  const server = createAppLaunchFlowServer(
    { baseUrl, token: "test-token" },
    { hosted: true },
  );
  const client = new Client({ name: "device-video-test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  try {
    const names = (await client.listTools()).tools.map(({ name }) => name);
    assert.ok(!names.some((name) => name.includes("mockup")));
    const call = async (name: string, args: Record<string, unknown>) => {
      const result = await client.callTool({ name, arguments: args });
      assert.notEqual(result.isError, true, JSON.stringify(result));
      return result;
    };

    const clips = await call("list_video_recordings", {
      projectId,
      includeMetadata: true,
    });
    assert.match(JSON.stringify(clips), /durationSeconds/);
    assert.doesNotMatch(JSON.stringify(clips), /signedUrl|screen\.png|secret/);
    const draft = await call("generate_promo_video_motion", {
      projectId,
      prompt: "Open the lid",
      deviceKind: "laptop",
    });
    const draftData = (draft.structuredContent as { data: { motion: unknown } })
      .data;
    const result = await call("create_device_video", {
      projectId,
      deviceType: "desktop",
      deviceModelId: "macbook-pro-14",
      recordings,
      customMotion: draftData.motion,
      previewFormat: "social:4:3",
      idempotencyKey: "device-video-run-1",
    });
    assert.deepEqual((result.structuredContent as { data: unknown }).data, {
      projectId,
      variantId,
      durationInFrames: 150,
      editorUrl: `${baseUrl}/promovideo?projectId=${projectId}&variantId=${variantId}`,
    });
    const preview = await call("preview_promo_video", {
      projectId,
      variantId,
      sceneIndex: 0,
      at: 0.5,
    });
    assert.match(JSON.stringify(preview), /image\/png/);
    await call("export_promo_video", {
      projectId,
      variantId,
      format: "webm",
      transparentBackground: true,
      idempotencyKey: "device-export-run-1",
    });
    const exported = await call("get_promo_video_export", { exportId });
    assert.match(JSON.stringify(exported), /video\.webm/);

    const before = requests.length;
    for (const args of [
      { deviceModelId: "macbook-pro-14" },
      { selectedScreenshotPaths: ["mobile/../screen.png"] },
      {
        selectedScreenshotPaths: Array.from(
          { length: 10 },
          (_, i) => `mobile/ios/${i}.png`,
        ),
        recordings,
      },
      { motion: "float", customMotion: motion },
    ]) {
      const invalid = await client.callTool({
        name: "create_device_video",
        arguments: { projectId, ...args },
      });
      assert.equal(invalid.isError, true);
    }
    assert.equal(requests.length, before);
  } finally {
    await client.close();
    await server.close();
  }
});
