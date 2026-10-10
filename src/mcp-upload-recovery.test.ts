import assert from "node:assert/strict";
import test from "node:test";
import { promises as dns } from "node:dns";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createAppLaunchFlowServer } from "./index.js";
import { errorCategory } from "./telemetry.js";
import { captureMcpTool } from "./mcp-analytics.js";
import { runWithRequestTelemetry } from "./request-context.js";

const projectId = "00000000-0000-4000-8000-000000000001";
const folderId = "00000000-0000-4000-8000-000000000002";
const sources = ["one.png", "two.png", "three.png"].map((filename) => ({
  filename,
  base64: "YWJj",
}));
async function connect() {
  const server = createAppLaunchFlowServer({
    baseUrl: "https://dashboard.test",
    token: "fixture",
  });
  const client = new Client({ name: "recovery-test", version: "1" });
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

test("quota exhaustion is classified as a payment rejection in logs and analytics", async (t) => {
  assert.equal(errorCategory({ status: 402 }), "payment_required");
  const events: any[] = [];
  const previousEnv = process.env;
  process.env = {
    ...process.env,
    APPLAUNCHFLOW_MCP_POSTHOG_KEY: "fixture",
    APPLAUNCHFLOW_MCP_POSTHOG_HOST: "https://eu.i.posthog.com",
  };
  t.after(() => {
    process.env = previousEnv;
  });
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: unknown, init?: RequestInit) => {
      events.push(JSON.parse(String(init?.body)));
      return new Response(null);
    },
  );
  await runWithRequestTelemetry(
    "quota-test",
    () =>
      captureMcpTool({
        tool: "render_screenshots",
        outcome: "error",
        durationMs: 10,
        category: errorCategory({ status: 402 }),
      }),
    { userId: "fixture", clientName: "Claude" },
  );
  assert.equal(events[0].properties.$mcp_error_type, "api_4xx");
  assert.equal(events[0].properties.error_category, "payment_required");
});

test("screenshot batch assigns its folder once instead of spending one mutation per file", async (t) => {
  const moves: string[][] = [];
  let grants = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/assets/folders?"))
        return Response.json({
          organization: {
            folders: [{ id: folderId, device_type: "mobile", platform: "ios" }],
          },
        });
      if (url.endsWith("/signed-url")) {
        grants++;
        return Response.json({
          uploadUrl: "https://upload.test/secret",
          path: `mobile/ios/${grants}.png`,
          filename: `${grants}.png`,
          subfolder: "mobile/ios",
        });
      }
      if (url.startsWith("https://upload.test")) return new Response(null);
      moves.push(JSON.parse(String(init?.body)).paths);
      return Response.json({ success: true });
    },
  );
  const { client, close } = await connect();
  try {
    const result = await client.callTool({
      name: "upload_screenshots",
      arguments: {
        projectId,
        folderId,
        deviceType: "mobile",
        platform: "ios",
        sources,
      },
    });
    assert.notEqual(result.isError, true);
    assert.deepEqual(moves, [
      ["mobile/ios/1.png", "mobile/ios/2.png", "mobile/ios/3.png"],
    ]);
    moves.length = 0;
    grants = 0;
    const large = await client.callTool({
      name: "upload_screenshots",
      arguments: {
        projectId,
        folderId,
        deviceType: "mobile",
        platform: "ios",
        sources: Array.from({ length: 51 }, (_, index) => ({
          filename: `${index}.png`,
          base64: "YWJj",
        })),
      },
    });
    assert.notEqual(large.isError, true);
    assert.deepEqual(
      moves.map((paths) => paths.length),
      [50, 1],
    );
    assert.equal(
      (large.structuredContent as any).data.uploads.every(
        (upload: any) => upload.folderAssigned,
      ),
      true,
    );
  } finally {
    await close();
  }
});

test("partial batch identifies the failed source and preserves successful uploads without replaying writes", async (t) => {
  let grants = 0,
    puts = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    const url = String(input);
    if (url.endsWith("/signed-url")) {
      grants++;
      if (grants === 2)
        return Response.json({ detail: "secret" }, { status: 503 });
      return Response.json({
        uploadUrl: "https://upload.test/secret",
        path: "mobile/ios/one.png",
        filename: "one.png",
        subfolder: "mobile/ios",
      });
    }
    puts++;
    return new Response(null);
  });
  const { client, close } = await connect();
  try {
    const result = await client.callTool({
      name: "upload_screenshots",
      arguments: { projectId, deviceType: "mobile", platform: "ios", sources },
    });
    assert.equal(result.isError, true);
    const data = (result.structuredContent as any).data;
    assert.equal(data.uploads.length, 1);
    assert.equal(data.uploads[0].sourceIndex, 0);
    assert.equal(data.uploads[0].sourceFilename, "one.png");
    assert.equal(data.recovery.sourceIndex, 1);
    assert.equal(data.recovery.fileIndex, 0);
    assert.equal(puts, 1);
    assert.equal(grants, 2);
    assert.doesNotMatch(JSON.stringify(result), /secret|uploadUrl/);
  } finally {
    await close();
  }
});

test("source timeout preserves completed files and retrying only remaining sources avoids duplicates", async (t) => {
  let failSource = true,
    grants = 0;
  t.mock.method(dns, "lookup", async () => [
    { address: "93.184.216.34", family: 4 },
  ]);
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    const url = String(input);
    if (url === "https://source.test/two.png?token=secret") {
      if (failSource) throw new DOMException("secret", "TimeoutError");
      return new Response("abc", { headers: { "content-type": "image/png" } });
    }
    if (url.endsWith("/signed-url")) {
      grants++;
      return Response.json({
        uploadUrl: "https://upload.test/secret",
        path: `mobile/ios/${grants}.png`,
        filename: `${grants}.png`,
        subfolder: "mobile/ios",
      });
    }
    return new Response(null);
  });
  const batch = [
    sources[0],
    { filename: "two.png", url: "https://source.test/two.png?token=secret" },
    sources[2],
  ];
  const { client, close } = await connect();
  try {
    const args = {
      projectId,
      deviceType: "mobile",
      platform: "ios",
      sources: batch,
    };
    const failed = await client.callTool({
      name: "upload_screenshots",
      arguments: args,
    });
    assert.equal(failed.isError, true);
    assert.equal((failed.structuredContent as any).error.category, "timeout");
    const data = (failed.structuredContent as any).data;
    assert.equal(data.recovery.phase, "source_download");
    assert.equal(data.recovery.sourceIndex, 1);
    assert.equal(data.uploads.length, 1);
    assert.equal(grants, 1);
    assert.doesNotMatch(
      JSON.stringify(failed),
      /secret|source\.test|uploadUrl/,
    );
    failSource = false;
    const resumed = await client.callTool({
      name: "upload_screenshots",
      arguments: { ...args, sources: batch.slice(data.recovery.sourceIndex) },
    });
    assert.notEqual(resumed.isError, true);
    assert.equal(grants, 3);
  } finally {
    await close();
  }
});

test("an uncertain binary upload exposes its pending path without automatically repeating a PUT", async (t) => {
  let puts = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    if (String(input).endsWith("/signed-url"))
      return Response.json({
        uploadUrl: "https://upload.test/secret",
        path: "mobile/ios/pending.png",
        filename: "pending.png",
        subfolder: "mobile/ios",
      });
    puts++;
    throw new DOMException("secret", "TimeoutError");
  });
  const { client, close } = await connect();
  try {
    const failed = await client.callTool({
      name: "upload_screenshots",
      arguments: { projectId, deviceType: "mobile", platform: "ios", sources },
    });
    assert.equal(failed.isError, true);
    const data = (failed.structuredContent as any).data;
    assert.deepEqual(data.uploads, []);
    assert.equal(data.pendingUpload.path, "mobile/ios/pending.png");
    assert.equal(data.recovery.phase, "upload");
    assert.match(data.recovery.nextStep, /may have completed/);
    assert.equal(puts, 1);
    assert.doesNotMatch(JSON.stringify(failed), /secret|uploadUrl/);
  } finally {
    await close();
  }
});

test("a later folder chunk failure preserves earlier assignments and requires no re-upload", async (t) => {
  let grants = 0,
    moves = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    const url = String(input);
    if (url.includes("/assets/folders?"))
      return Response.json({
        organization: {
          folders: [{ id: folderId, device_type: "mobile", platform: "ios" }],
        },
      });
    if (url.endsWith("/signed-url")) {
      grants++;
      return Response.json({
        uploadUrl: "https://upload.test/secret",
        path: `mobile/ios/${grants}.png`,
        filename: `${grants}.png`,
        subfolder: "mobile/ios",
      });
    }
    if (url.startsWith("https://upload.test")) return new Response(null);
    moves++;
    return moves === 1
      ? Response.json({ success: true })
      : Response.json({ detail: "secret" }, { status: 503 });
  });
  const { client, close } = await connect();
  try {
    const failed = await client.callTool({
      name: "upload_screenshots",
      arguments: {
        projectId,
        folderId,
        deviceType: "mobile",
        platform: "ios",
        sources: Array.from({ length: 51 }, (_, index) => ({
          filename: `${index}.png`,
          base64: "YWJj",
        })),
      },
    });
    assert.equal(failed.isError, true);
    const data = (failed.structuredContent as any).data;
    assert.equal(data.uploads.length, 51);
    assert.equal(
      data.uploads.filter((upload: any) => upload.folderAssigned).length,
      50,
    );
    assert.equal(data.recovery.phase, "folder_assignment");
    assert.match(data.recovery.nextStep, /do not upload them again/);
    assert.equal(grants, 51);
    assert.equal(moves, 2);
    assert.doesNotMatch(JSON.stringify(failed), /secret|uploadUrl/);
  } finally {
    await close();
  }
});
