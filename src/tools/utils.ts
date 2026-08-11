import { createHmac, timingSafeEqual } from "node:crypto";
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
 * Ask the host to open a URL. Hosted connectors return false when the client
 * does not support URL elicitation so the tool can still return the URL.
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
    return false;
  }
}

/**
 * Minimal shape of the tool-handler `extra` we need for progress reporting.
 * The MCP client only receives progress notifications when it supplied a
 * progressToken in the request metadata, so this is a no-op otherwise.
 */
type ProgressNotification = {
  method: "notifications/progress";
  params: {
    progressToken: string | number;
    progress: number;
    total?: number;
    message?: string;
  };
};

interface ProgressCapableExtra {
  _meta?: { progressToken?: string | number };
  sendNotification?: (notification: ProgressNotification) => Promise<void>;
}

/**
 * Emit periodic progress notifications while a long-running operation (e.g. the
 * one-shot AI catalog generation behind prepare_*) is awaited. Clients that
 * reset their request timeout on progress stay connected instead of timing out
 * during the dead air. Returns a stop function to call in a `finally`.
 */
export function startProgressHeartbeat(
  extra: ProgressCapableExtra | undefined,
  message: string,
  intervalMs = 8000,
): () => void {
  const progressToken = extra?._meta?.progressToken;
  const sendNotification = extra?.sendNotification;
  if (progressToken === undefined || typeof sendNotification !== "function") {
    return () => {};
  }

  let progress = 0;
  const send = () => {
    progress += 1;
    void sendNotification({
      method: "notifications/progress",
      params: { progressToken, progress, message },
    }).catch(() => {
      // Best-effort keepalive; a failed notification must not break the tool.
    });
  };

  send();
  const interval = setInterval(send, intervalMs);
  if (typeof interval.unref === "function") {
    interval.unref();
  }

  return () => clearInterval(interval);
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

const READ_RECEIPT_TTL_MS = 10 * 60 * 1000;

/**
 * Hosted MCP requests are intentionally stateless, so the local in-memory
 * get-before-edit gate cannot span two tool calls. These signed, short-lived
 * receipts prove that the same access token fetched the exact target shortly
 * before attempting an edit, without storing bearer tokens or server state.
 */
export function createHostedReadReceipt(
  target: string,
  bearerToken: string,
  now = Date.now(),
): string {
  const payload = Buffer.from(JSON.stringify({ target, issuedAt: now })).toString(
    "base64url",
  );
  const signature = createHmac("sha256", bearerToken)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyHostedReadReceipt(
  receipt: string | undefined,
  target: string,
  bearerToken: string,
  now = Date.now(),
): boolean {
  if (!receipt) return false;
  const [payload, signature, extra] = receipt.split(".");
  if (!payload || !signature || extra) return false;

  const expected = createHmac("sha256", bearerToken)
    .update(payload)
    .digest("base64url");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      target?: unknown;
      issuedAt?: unknown;
    };
    return (
      decoded.target === target &&
      typeof decoded.issuedAt === "number" &&
      decoded.issuedAt <= now &&
      now - decoded.issuedAt <= READ_RECEIPT_TTL_MS
    );
  } catch {
    return false;
  }
}

export function hostedMcpEnabled(): boolean {
  return process.env.APPLAUNCHFLOW_MCP_REMOTE === "1";
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
