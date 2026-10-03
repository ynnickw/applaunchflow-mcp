import { randomUUID } from "node:crypto";
import { requestAnalyticsIdentity } from "./request-context.js";
import { errorCategory } from "./telemetry.js";

const MAX_IN_FLIGHT = 32;
let inFlight = 0;
let reportedFailure = false;

/** Bucket a host's user agent without forwarding arbitrary header contents. */
export function mcpClientName(userAgent: string | undefined): string {
  if (/cursor/i.test(userAgent ?? "")) return "Cursor";
  if (/claude/i.test(userAgent ?? "")) return "Claude";
  if (/codex/i.test(userAgent ?? "")) return "Codex";
  if (/openai|chatgpt/i.test(userAgent ?? "")) return "ChatGPT";
  return "Other";
}

/** Metadata-only, opt-in hosted telemetry. Never capture tool arguments/results. */
export async function captureMcpTool(args: {
  tool: string;
  outcome: "success" | "error" | "exception";
  durationMs: number;
  category?: string;
}): Promise<void> {
  const apiKey = process.env.APPLAUNCHFLOW_MCP_POSTHOG_KEY;
  const host = process.env.APPLAUNCHFLOW_MCP_POSTHOG_HOST;
  const identity = requestAnalyticsIdentity();
  // Local stdio calls have no verified account identity and are not captured.
  if (!apiKey || !host || !identity || inFlight >= MAX_IN_FLIGHT) return;
  inFlight++;
  try {
    const origin = new URL(host);
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== "/"
    ) {
      throw new Error("Invalid analytics host");
    }
    const category = errorCategory({ category: args.category });
    const errorTypes: Record<string, string> = {
      validation: "validation",
      read_before_edit_required: "missing_context",
      hosted_file_path_unsupported: "validation",
      unauthorized: "permission",
      forbidden: "permission",
      not_found: "api_4xx",
      conflict: "api_4xx",
      rate_limited: "rate_limited",
      upstream_error: "api_5xx",
      timeout: "timeout",
      cancelled: "internal",
      unknown: "internal",
    };
    const response = await fetch(new URL("/i/v0/e/", origin), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(2000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event: "$mcp_tool_call",
        distinct_id: identity.userId,
        timestamp: new Date().toISOString(),
        properties: {
          $insert_id: randomUUID(),
          $process_person_profile: false,
          $mcp_server_name: "AppLaunchFlow",
          $mcp_client_name: identity.clientName,
          $mcp_tool_name: args.tool,
          $mcp_duration_ms: args.durationMs,
          $mcp_is_error: args.outcome !== "success",
          ...(args.outcome !== "success"
            ? {
                $mcp_error_type: errorTypes[category],
                error_category: category,
              }
            : {}),
        },
      }),
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error("Analytics capture failed");
  } catch {
    // One fixed warning per process; analytics must not fail/retry a customer tool.
    if (!reportedFailure) {
      reportedFailure = true;
      console.warn(JSON.stringify({ event: "mcp_analytics_unavailable" }));
    }
  } finally {
    inFlight--;
  }
}
