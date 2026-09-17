import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppLaunchFlow, AppLaunchFlowApiError } from "./client/official.js";
import { officialApiPath } from "./client/api.js";
test("official SDK uses one authenticated v1 contract, parses problems, and verifies exclusive downloads", async () => {
  const requests: Array<{
    path: string;
    authorization: string | undefined;
    key: string | undefined;
  }> = [];
  const bytes = Buffer.from("a verified archive fixture");
  let corrupt = false;
  let origin = "";
  const server = createServer((req, res) => {
    const path = req.url!;
    requests.push({
      path,
      authorization: req.headers.authorization,
      key: req.headers["idempotency-key"] as string | undefined,
    });
    res.setHeader("content-type", "application/json");
    if (path === "/file") {
      res.setHeader("content-type", "application/zip");
      return res.end(corrupt ? Buffer.from("wrong") : bytes);
    }
    if (path.endsWith("/download"))
      return res.end(
        JSON.stringify({
          data: {
            url: origin + "/file",
            sha256: createHash("sha256").update(bytes).digest("hex"),
            sizeBytes: bytes.length,
            expiresAt: new Date(Date.now() + 60000).toISOString(),
          },
          meta: { requestId: "id" },
        }),
      );
    if (path === "/api/v1/renders") {
      req.resume();
      return res.end(
        JSON.stringify({
          data: { id: "render", status: "queued" },
          meta: { requestId: "id" },
        }),
      );
    }
    if (path === "/api/v1/projects")
      return res.end(
        JSON.stringify({
          data: { projects: [{ id: "project" }], nextCursor: null },
          meta: { requestId: "id" },
        }),
      );
    res.statusCode = 422;
    res.setHeader("content-type", "application/problem+json");
    res.end(
      JSON.stringify({
        code: "rate_limit_exceeded",
        detail: "Wait before retrying",
        requestId: "request",
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const directory = await mkdtemp(join(tmpdir(), "alf-sdk-"));
  try {
    const client = new AppLaunchFlow({ baseUrl: origin, token: "private-key" });
    assert.equal((await client.listProjects()).projects[0].id, "project");
    await client.createRender(
      { revisionId: "revision", formats: ["ios.phone.6.5"], languages: [] },
      "stable-release-key",
    );
    assert.equal(requests.at(-1)?.key, "stable-release-key");
    assert.equal(requests.at(-1)?.authorization, "Bearer private-key");
    await assert.rejects(
      client.formats(),
      (e: unknown) =>
        e instanceof AppLaunchFlowApiError &&
        e.status === 422 &&
        e.message === "Wait before retrying",
    );
    const path = join(directory, "release.zip");
    await client.downloadPackage("render", path);
    assert.deepEqual(await readFile(path), bytes);
    assert.equal(
      requests.find((r) => r.path === "/file")?.authorization,
      undefined,
    );
    await assert.rejects(client.downloadPackage("render", path), /EEXIST/);
    assert.deepEqual(await readFile(path), bytes);
    corrupt = true;
    await assert.rejects(
      client.downloadPackage("render", join(directory, "bad.zip")),
      /checksum|size/,
    );
    await assert.rejects(readFile(join(directory, "bad.zip")), /ENOENT/);
    await assert.rejects(
      client.requestJson("https://attacker.test/api/v1/projects"),
      /origin/,
    );
    assert.equal(
      officialApiPath("/api/mcp/transform"),
      "/api/v1/designs/transform",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("SDK honors rate-limit retry without changing the mutation key", async () => {
  const keys: string[] = [];
  const server = createServer((req, res) => {
    keys.push(String(req.headers["idempotency-key"]));
    req.resume();
    res.setHeader("content-type", "application/json");
    if (keys.length === 1) {
      res.statusCode = 429;
      res.setHeader("Retry-After", "0");
      res.end(JSON.stringify({ code: "rate_limit_exceeded" }));
    } else
      res.end(
        JSON.stringify({ data: { id: "render" }, meta: { requestId: "id" } }),
      );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const client = new AppLaunchFlow({
      baseUrl: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
      token: "key",
    });
    await client.createRender(
      { revisionId: "revision", formats: [], languages: [] },
      "stable-rate-limit-key",
    );
    assert.deepEqual(keys, ["stable-rate-limit-key", "stable-rate-limit-key"]);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("legacy folder helper uses the paginated official asset catalog", async () => {
  const { AppLaunchFlowClient } = await import("./client/api.js");
  const client = new AppLaunchFlowClient({
    baseUrl: "https://example.test",
    token: "fixture",
  });
  const offsets: number[] = [];
  client.requestJson = async <T>(
    path: string,
    options?: import("./client/api.js").RequestOptions,
  ) => {
    assert.equal(officialApiPath(path), "/api/v1/assets/list");
    offsets.push(options?.query?.offset as number);
    return {
      projectId: "project",
      assets: [
        { path: `backgrounds/${offsets.length}.png` },
        { path: "panorama/excluded.png" },
      ],
      truncated: offsets.length === 1,
    } as T;
  };
  const result = await client.listProjectAssetFolder("project", "backgrounds");
  assert.deepEqual(offsets, [0, 100]);
  assert.deepEqual(
    result.assets.map((asset: { path: string }) => asset.path),
    ["backgrounds/1.png", "backgrounds/2.png"],
  );
});
