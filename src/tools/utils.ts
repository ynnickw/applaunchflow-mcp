import { exec } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ElicitResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { AppLaunchFlowApiError } from "../client/api.js";

/**
 * Bypass the SDK's `elicitation.url` capability gate by calling the underlying
 * protocol `request()` method directly.  This lets us send URL-mode elicitations
 * to clients (like Claude Code) that support them at the protocol level even when
 * the SDK's newer capability check doesn't recognise the advertised capabilities.
 *
 * Falls back gracefully: callers should catch errors and offer the URL in text.
 */
export async function elicitUrl(
  server: McpServer,
  params: {
    mode: "url";
    elicitationId: string;
    message: string;
    url: string;
  },
  options?: RequestOptions,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto = server.server as any;
  return proto.request(
    { method: "elicitation/create", params },
    ElicitResultSchema,
    options,
  ) as ReturnType<typeof server.server.elicitInput>;
}

/**
 * Open a URL in the user's default browser.
 * Uses `open` on macOS, `xdg-open` on Linux, `start` on Windows.
 */
export function openInBrowser(url: string): void {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  exec(`${command} ${JSON.stringify(url)}`);
}

/**
 * Try URL elicitation first, fall back to opening the URL directly in the browser.
 * Returns true if elicitation succeeded (user accepted), false otherwise.
 */
export async function openUrl(
  server: McpServer,
  url: string,
  message: string,
  options?: RequestOptions,
): Promise<boolean> {
  try {
    const result = await elicitUrl(
      server,
      {
        mode: "url",
        elicitationId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        message,
        url,
      },
      options,
    );
    return result.action === "accept";
  } catch {
    openInBrowser(url);
    return true;
  }
}

export function ok(data: unknown, message?: string) {
  const text =
    typeof data === "string"
      ? message
        ? `${message}\n\n${data}`
        : data
      : message
        ? `${message}\n\n${JSON.stringify(data, null, 2)}`
        : JSON.stringify(data, null, 2);

  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
    structuredContent: {
      success: true,
      data,
      ...(message ? { message } : {}),
    },
  };
}

export function fail(error: unknown) {
  const normalized =
    error instanceof AppLaunchFlowApiError
      ? {
          code:
            error.body?.error?.code ||
            error.body?.code ||
            `HTTP_${error.status}`,
          type: error.body?.error?.type || "server",
          message: error.body?.error?.message || error.message,
          status: error.status,
          details: error.body,
        }
      : {
          code: "UNKNOWN",
          type: "server",
          message: error instanceof Error ? error.message : String(error),
        };

  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: normalized.message,
      },
    ],
    structuredContent: {
      success: false,
      error: normalized,
    },
  };
}
