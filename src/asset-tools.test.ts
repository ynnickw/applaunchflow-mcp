import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createAppLaunchFlowServer } from "./index.js";
import { ASSET_LIST_URI } from "./tools/assets.js";

const projectId = "00000000-0000-4000-8000-000000000001";
const origin = "https://dashboard.applaunchflow.com";
async function connect(token = "user-a") {
  const server = createAppLaunchFlowServer({ baseUrl: origin, token });
  const client = new Client({ name: "assets-test", version: "1" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

test("list_assets isolates account data, strips private preview URLs from model output and exposes read-only UI", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      assert.equal(
        String(input),
        `${origin}/api/assets/list?projectId=${projectId}`,
      );
      const token = new Headers(init?.headers).get("authorization");
      return Response.json({
        projectId,
        truncated: false,
        assets: [
          {
            path: "illustrations/sticker.svg",
            name: "sticker.svg",
            kind: "illustrations",
            mediaType: "image",
            previewUrl: `https://ubvbpgodmmitzutgshzu.supabase.co/file?token=${token?.endsWith("a") ? "private-a" : "private-b"}`,
          },
        ],
      });
    },
  );
  for (const token of ["user-a", "user-b"]) {
    const { client, close } = await connect(token);
    try {
      const tool = (await client.listTools()).tools.find(
        (tool) => tool.name === "list_assets",
      )!;
      assert.equal(tool.annotations?.readOnlyHint, true);
      assert.equal(tool._meta?.["openai/outputTemplate"], ASSET_LIST_URI);
      const result = await client.callTool({
        name: "list_assets",
        arguments: { projectId },
      });
      assert.notEqual(result.isError, true);
      assert.doesNotMatch(
        JSON.stringify({
          content: result.content,
          structuredContent: result.structuredContent,
        }),
        /private-|previewUrl/,
      );
      assert.match(
        JSON.stringify(result._meta),
        token === "user-a" ? /private-a/ : /private-b/,
      );
      assert.doesNotMatch(
        JSON.stringify(await client.readResource({ uri: ASSET_LIST_URI })),
        /private-a|private-b/,
      );
    } finally {
      await close();
    }
  }
});

test("upload_asset supports image/media/font categories and rejects wrong media before creating a signed upload", async (t) => {
  const requests: Array<{ url: string; body?: Record<string, string> }> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === `${origin}/api/assets/upload/signed-url`) {
        const body = JSON.parse(String(init?.body));
        requests.push({ url, body });
        return Response.json({
          uploadUrl: "https://upload.test/signed",
          path: `${body.fileType}/file`,
          filename: body.filename,
          subfolder: body.fileType,
          fullPath: `${projectId}/${body.fileType}/file`,
        });
      }
      assert.equal(url, "https://upload.test/signed");
      assert.equal(init?.method, "PUT");
      requests.push({ url });
      return new Response(null, { status: 200 });
    },
  );
  const { client, close } = await connect();
  try {
    for (const [fileType, filename, contentType] of [
      ["illustration", "sticker.svg", "image/svg+xml"],
      ["logo", "logo.png", "image/png"],
      ["background", "background.webp", "image/webp"],
      ["panorama", "panorama.jpg", "image/jpeg"],
      ["mockup-media", "recording.mp4", "video/mp4"],
      ["promo-media", "music.mp3", "audio/mpeg"],
      ["font", "brand.woff2", "font/woff2"],
    ]) {
      const result = await client.callTool({
        name: "upload_asset",
        arguments: {
          projectId,
          fileType,
          source: {
            filename,
            base64: Buffer.from("fixture-bytes").toString("base64"),
          },
        },
      });
      assert.notEqual(result.isError, true, JSON.stringify(result));
      assert.equal(requests.at(-2)?.body?.contentType, contentType);
      assert.equal(requests.at(-2)?.body?.fileType, fileType);
    }
    const before = requests.length;
    const rejected = await client.callTool({
      name: "upload_asset",
      arguments: {
        projectId,
        fileType: "illustration",
        source: { filename: "video.mp4", base64: "YWJj" },
      },
    });
    assert.equal(rejected.isError, true);
    assert.equal(requests.length, before);
    const screenshot = await client.callTool({
      name: "upload_screenshots",
      arguments: {
        projectId,
        deviceType: "tablet",
        platform: "android",
        sources: [{ filename: "shot.png", base64: "YWJj" }],
      },
    });
    assert.notEqual(screenshot.isError, true);
    assert.equal(requests.at(-2)?.body?.platform, "android");
    assert.equal(requests.at(-2)?.body?.deviceType, "tablet");
  } finally {
    await close();
  }
});

test("list_assets does not display forbidden or wrong-project results", async (t) => {
  let response = Response.json({ error: "Forbidden" }, { status: 403 });
  t.mock.method(globalThis, "fetch", async () => response.clone());
  const { client, close } = await connect();
  try {
    assert.equal(
      (await client.callTool({ name: "list_assets", arguments: { projectId } }))
        .isError,
      true,
    );
    response = Response.json({
      projectId: "00000000-0000-4000-8000-000000000002",
      assets: [],
      truncated: false,
    });
    assert.equal(
      (await client.callTool({ name: "list_assets", arguments: { projectId } }))
        .isError,
      true,
    );
  } finally {
    await close();
  }
});
