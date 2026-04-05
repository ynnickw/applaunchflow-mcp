import { AppLaunchFlowApiError } from "../client/api.js";

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
