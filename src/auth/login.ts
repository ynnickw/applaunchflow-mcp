import { createServer } from "http";
import type { AddressInfo } from "net";
import { spawn } from "child_process";
import {
  normalizeBaseUrl,
  saveStoredCredentials,
  type StoredCredentials,
} from "./credentials.js";

function openBrowser(url: string): void {
  const platform = process.platform;
  const command =
    platform === "darwin"
      ? "open"
      : platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args =
    platform === "win32" ? ["/c", "start", "", url] : [url];

  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch (error) {
    console.error(
      `Failed to open the browser automatically. Open this URL manually: ${url}`,
    );
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
}

async function createCallbackListener() {
  const callbackPath = "/callback";
  let resolveAddress: ((address: AddressInfo) => void) | null = null;
  const addressPromise = new Promise<AddressInfo>((resolve) => {
    resolveAddress = resolve;
  });

  const responsePromise = new Promise<Omit<StoredCredentials, "createdAt">>(
    (resolve, reject) => {
      const server = createServer((request, response) => {
        const requestUrl = new URL(
          request.url || "/",
          "http://127.0.0.1:0",
        );

        if (requestUrl.pathname !== callbackPath) {
          response.statusCode = 404;
          response.end("Not found");
          return;
        }

        const token = requestUrl.searchParams.get("token");
        const cookieName = requestUrl.searchParams.get("cookieName");
        const baseUrl = requestUrl.searchParams.get("baseUrl");
        const expiresAt =
          requestUrl.searchParams.get("expiresAt") || undefined;

        if (!token || !cookieName || !baseUrl) {
          response.statusCode = 400;
          response.end("Missing token payload");
          return;
        }

        response.setHeader("content-type", "text/html; charset=utf-8");
        response.end(
          "<!doctype html><html><body><h1>AppLaunchFlow MCP connected</h1><p>You can close this tab now.</p></body></html>",
        );

        clearTimeout(timeout);
        server.close();
        resolve({
          baseUrl: normalizeBaseUrl(baseUrl),
          token,
          cookieName,
          expiresAt,
        });
      });

      server.listen(0, "127.0.0.1", () => {
        const address = server.address() as AddressInfo;
        resolveAddress?.(address);
      });

      const timeout = setTimeout(() => {
        server.close();
        reject(new Error("Timed out waiting for browser authentication"));
      }, 5 * 60 * 1000);
    },
  );

  const address = await addressPromise;
  return {
    callbackUrl: `http://127.0.0.1:${address.port}${callbackPath}`,
    responsePromise,
  };
}

export async function login(baseUrl: string): Promise<StoredCredentials> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const { callbackUrl, responsePromise } = await createCallbackListener();
  const authorizeUrl = new URL("/auth/mcp", normalizedBaseUrl);
  authorizeUrl.searchParams.set("callback", callbackUrl);
  authorizeUrl.searchParams.set("name", "Local MCP");

  console.error(`Opening AppLaunchFlow authorization in your browser...`);
  console.error(`If nothing opens, visit: ${authorizeUrl.toString()}`);
  openBrowser(authorizeUrl.toString());

  const received = await responsePromise;
  const credentials: StoredCredentials = {
    ...received,
    createdAt: new Date().toISOString(),
  };

  await saveStoredCredentials(credentials);
  console.error(`Login successful! Connected to ${credentials.baseUrl}`);
  return credentials;
}
