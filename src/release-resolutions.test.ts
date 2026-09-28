import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import type { McpServer } from "@modelcontextprotocol/server";
import { AppLaunchFlowClient } from "./client/api.js";
import { registerReleaseTools } from "./tools/releases.js";

test("connector forwards preview and custom sizes with stable idempotency keys", async () => {
  const received: Array<{ body: unknown; key: string | undefined }> = [];
  const http = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    assert.equal(req.url, "/api/v1/renders");
    received.push({
      body: JSON.parse(Buffer.concat(chunks).toString()),
      key: req.headers["idempotency-key"] as string,
    });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ data: { id: "render", status: "queued" } }));
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  let invoke: ((value: unknown) => Promise<unknown>) | undefined;
  const server = {
    registerTool(
      name: string,
      config: { inputSchema: { parse(value: unknown): unknown } },
      handler: (value: unknown) => Promise<unknown>,
    ) {
      if (name === "render_screenshots")
        invoke = (value) => handler(config.inputSchema.parse(value));
    },
  };
  try {
    registerReleaseTools(
      server as unknown as McpServer,
      new AppLaunchFlowClient({
        baseUrl: `http://127.0.0.1:${(http.address() as { port: number }).port}`,
        token: "fixture",
      }),
    );
    assert.ok(invoke);
    const base = {
      projectId: "11111111-1111-4111-8111-111111111111",
      formats: ["android.phone"],
      languages: ["fr"],
      idempotencyKey: "resolution-test",
    };
    for (const resolution of [
      { preset: "preview" },
      { width: 1290, height: 2796 },
    ]) {
      const resolutions = { "android.phone": resolution };
      await invoke({ ...base, resolutions });
      const { idempotencyKey, ...input } = base;
      assert.deepEqual(received.at(-1), {
        body: { ...input, resolutions, package: "fastlane" },
        key: idempotencyKey,
      });
    }
    assert.throws(() =>
      invoke!({
        ...base,
        resolutions: { "android.phone": { width: 8193, height: 2796 } },
      }),
    );
    assert.equal(received.length, 2);
  } finally {
    await new Promise<void>((resolve) => http.close(() => resolve()));
  }
});
