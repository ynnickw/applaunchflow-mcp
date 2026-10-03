import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { AppLaunchFlowClient, AppLaunchFlowApiError } from "./client/api.js";
import { fail } from "./tools/utils.js";
import { runWithRequestSignal } from "./request-context.js";

async function withUnresponsiveServer(
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(() => undefined);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("dashboard requests honor explicit timeouts", async () => {
  await withUnresponsiveServer(async (baseUrl) => {
    const client = new AppLaunchFlowClient({ baseUrl, token: "test-token" });
    await assert.rejects(
      client.requestJson("/slow", { timeoutMs: 20 }),
      (error: unknown) =>
        error instanceof Error && error.name === "TimeoutError",
    );
  });
});

test("dashboard requests inherit MCP request cancellation", async () => {
  await withUnresponsiveServer(async (baseUrl) => {
    const client = new AppLaunchFlowClient({ baseUrl, token: "test-token" });
    const controller = new AbortController();
    const request = runWithRequestSignal(controller.signal, () =>
      client.listProjects(),
    );
    controller.abort();
    await assert.rejects(
      request,
      (error: unknown) => error instanceof Error && error.name === "AbortError",
    );
  });
});

test("official validation problems expose field guidance for rendering and editing", async (t) => {
  const errors = [
    { path: "formats.0", message: "Invalid format; use list_export_formats." },
  ];
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      {
        type: "https://dashboard.applaunchflow.com/api/docs/problems/validation_error",
        title: "validation error",
        status: 422,
        code: "validation_error",
        detail: "The request did not match the operation schema.",
        errors,
      },
      { status: 422, headers: { "content-type": "application/problem+json" } },
    ),
  );
  const client = new AppLaunchFlowClient({
    baseUrl: "https://dashboard.test",
    token: "fixture",
  });
  await assert.rejects(
    client.requestJson("/api/v1/renders"),
    (error: unknown) => {
      assert.ok(error instanceof AppLaunchFlowApiError);
      const result = fail(error);
      assert.deepEqual(
        "issues" in result.structuredContent.error
          ? result.structuredContent.error.issues
          : undefined,
        errors,
      );
      assert.match(result.content[0].text, /formats.0/);
      assert.match(result.content[0].text, /list_export_formats/);
      return true;
    },
  );
});

test("request cancellation with an SDK Error reason retains the cancellation category", () => {
  const controller = new AbortController();
  controller.abort(new Error("Client cancelled the request"));
  const result = runWithRequestSignal(controller.signal, () =>
    fail(controller.signal.reason),
  );
  assert.equal(result.structuredContent.error.code, "REQUEST_CANCELLED");
});
