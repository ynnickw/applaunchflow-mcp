/** Only fixed categories may enter logs; never include upstream bodies/messages. */
export class ToolInputError extends Error {
  constructor(
    public readonly code: "READ_BEFORE_EDIT_REQUIRED" | "HOSTED_FILE_PATH_UNSUPPORTED",
    message: string,
  ) {
    super(message);
  }
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
}

export function errorCategory(error: unknown): string {
  const value = record(error);
  if (value.code === "READ_BEFORE_EDIT_REQUIRED") return "read_before_edit_required";
  if (value.code === "HOSTED_FILE_PATH_UNSUPPORTED") return "hosted_file_path_unsupported";
  if (value.code === "REQUEST_CANCELLED") return "cancelled";
  if (value.code === "UPSTREAM_TIMEOUT") return "timeout";
  if (value.name === "AbortError") return "cancelled";
  if (value.name === "TimeoutError") return "timeout";
  switch (value.status) {
    case 400: case 422: return "validation";
    case 401: return "unauthorized";
    case 403: return "forbidden";
    case 404: return "not_found";
    case 409: return "conflict";
    case 429: return "rate_limited";
  }
  if (typeof value.status === "number" && value.status >= 500 && value.status <= 599) {
    return "upstream_error";
  }
  return "unknown";
}

export function toolErrorCategory(result: unknown): string {
  return errorCategory(record(record(result).structuredContent).error);
}

export function protocolErrorCategory(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Bad Request: Unsupported protocol version:")) return "unsupported_protocol_version";
  if (message === "Parse error: Invalid JSON") return "invalid_json";
  if (message === "Parse error: Invalid JSON-RPC message") return "invalid_jsonrpc";
  if (message.startsWith("Not Acceptable:")) return "unacceptable_response_type";
  if (message.startsWith("Unsupported Media Type:")) return "unsupported_media_type";
  return "transport_error";
}

const METHODS = new Set([
  "initialize", "ping", "tools/list", "tools/call", "resources/list",
  "resources/templates/list", "resources/read", "prompts/list", "prompts/get",
  "notifications/initialized", "notifications/cancelled", "notifications/progress",
  "logging/setLevel", "completion/complete",
]);

export function safeRpcMethod(method: unknown): string | undefined {
  if (typeof method !== "string") return undefined;
  return METHODS.has(method) ? method : "other";
}
