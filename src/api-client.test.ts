import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { AppLaunchFlowClient } from "./client/api.js";
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
