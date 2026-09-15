import assert from "node:assert/strict";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createAppLaunchFlowServer } from "./index.js";

test("explicit recapture stages bytes then overwrites a stable bound path; defaults remain append-only", async (t) => {
  const bodies: Record<string, unknown>[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/signed-url")) {
        const body = JSON.parse(String(init?.body));
        bodies.push(body);
        return Response.json({
          uploadUrl: "https://upload.test/private?token=secret",
          path: ".asset-staging/mobile/ios/unique-shot.png",
          filename: "unique-shot.png",
          subfolder: ".asset-staging/mobile/ios",
        });
      }
      if (url.startsWith("https://upload.test")) return new Response("");
      assert.ok(url.endsWith("/api/assets/overwrite"));
      const body = JSON.parse(String(init?.body));
      bodies.push(body);
      assert.equal(body.filename, "shot.png");
      assert.equal(
        body.sourcePath,
        ".asset-staging/mobile/ios/unique-shot.png",
      );
      return Response.json({
        path: "mobile/ios/1750000000000-shot.png",
        filename: "1750000000000-shot.png",
        subfolder: "mobile/ios",
        revision: body.operationId,
        backupPath: ".asset-history/backup/shot.png",
      });
    },
  );
  const server = createAppLaunchFlowServer({
    baseUrl: "https://dashboard.test",
    token: "fixture",
  });
  const client = new Client({ name: "test", version: "1" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
  try {
    const args = {
      projectId: "00000000-0000-4000-8000-000000000001",
      deviceType: "mobile",
      platform: "ios",
      sources: [{ filename: "shot.png", base64: "YWJj" }],
    };
    const result = await client.callTool({
      name: "upload_screenshots",
      arguments: { ...args, overwrite: true },
    });
    assert.notEqual(result.isError, true);
    assert.equal(bodies[0].fileType, "screenshot-overwrite-stage");
    assert.match(JSON.stringify(result), /1750000000000-shot.png/);
    assert.doesNotMatch(JSON.stringify(result), /secret|uploadUrl/);
    bodies.length = 0;
    await client.callTool({ name: "upload_screenshots", arguments: args });
    assert.equal(bodies.length, 1);
    assert.equal(bodies[0].fileType, undefined);
    assert.equal(
      (await client.listTools()).tools.find(
        (t) => t.name === "upload_screenshots",
      )?.annotations?.destructiveHint,
      true,
    );
  } finally {
    await client.close();
    await server.close();
  }
});
