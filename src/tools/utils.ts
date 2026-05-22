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

export interface ReadReceiptStore {
  record(args: { generationId: string; variantId?: string }): void;
  has(args: { generationId: string; variantId?: string }): boolean;
  consume(args: { generationId: string; variantId?: string }): void;
}

/**
 * In-memory get-before-edit gate keyed by generationId + variantId. The timestamp
 * is retained for a future TTL sweep; current callers only check presence.
 */
export function createReadReceiptStore(): ReadReceiptStore {
  const receipts = new Map<string, number>();
  const keyFor = (args: { generationId: string; variantId?: string }) =>
    [args.generationId, args.variantId || "active"].join("::");
  return {
    record(args) {
      receipts.set(keyFor(args), Date.now());
    },
    has(args) {
      return receipts.has(keyFor(args));
    },
    consume(args) {
      receipts.delete(keyFor(args));
    },
  };
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

interface ValidationIssue {
  path?: Array<string | number> | string;
  message?: string;
  code?: string;
  expected?: unknown;
  received?: unknown;
  maximum?: unknown;
  minimum?: unknown;
}

function extractValidationIssues(error: unknown): ValidationIssue[] | null {
  if (!(error instanceof AppLaunchFlowApiError)) return null;
  const body = error.body as
    | { details?: unknown; error?: { details?: unknown } }
    | undefined;
  const details = body?.details ?? body?.error?.details;
  if (!Array.isArray(details)) return null;
  return details.filter(
    (issue): issue is ValidationIssue =>
      typeof issue === "object" && issue !== null,
  );
}

function formatValidationIssue(issue: ValidationIssue): string {
  const path = Array.isArray(issue.path)
    ? issue.path.join(".")
    : (issue.path ?? "");
  const where = path ? `\`${path}\`` : "(root)";
  const bounds = [
    issue.expected !== undefined ? `expected ${JSON.stringify(issue.expected)}` : null,
    issue.received !== undefined ? `received ${JSON.stringify(issue.received)}` : null,
    issue.maximum !== undefined ? `max ${JSON.stringify(issue.maximum)}` : null,
    issue.minimum !== undefined ? `min ${JSON.stringify(issue.minimum)}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const parts = [where, issue.message ?? issue.code ?? "invalid"];
  if (bounds) parts.push(`(${bounds})`);
  return `• ${parts.join(" — ")}`;
}

export function fail(error: unknown) {
  const issues = extractValidationIssues(error);

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
          ...(issues ? { issues } : {}),
        }
      : {
          code: "UNKNOWN",
          type: "server",
          message: error instanceof Error ? error.message : String(error),
        };

  // For validation errors, append a compact issue summary to the visible
  // text so the calling LLM can see exactly which field tripped Zod and
  // self-correct on the next call instead of guessing.
  const text = issues?.length
    ? [normalized.message, "Issues:", ...issues.map(formatValidationIssue)].join(
        "\n",
      )
    : normalized.message;

  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
    structuredContent: {
      success: false,
      error: normalized,
    },
  };
}
