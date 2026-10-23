import { AppLaunchFlowApiError } from "../client/api.js";

/**
 * Recovery guidance for plan, quota and rate-limit rejections. Without it an
 * agent cannot tell "upgrade or free a slot" from "retry later", and loops on
 * retries that can never succeed.
 */
export interface LimitRecovery {
  kind:
    | "variant_limit"
    | "project_limit"
    | "keyword_limit"
    | "competitor_limit"
    | "translation_limit"
    | "plan_limit"
    | "api_export_quota"
    | "api_plan_required"
    | "rate_limit";
  /** Whether repeating the same call later can succeed without user action. */
  retryable: boolean;
  guidance: string;
  /** Where the user changes plan or billing (absolute dashboard URL). */
  upgradeUrl?: string;
  retryAfterSeconds?: number;
}

const GENERIC_CODES = new Set([
  "request_rejected",
  "upstream_error",
  "bad_request",
  "internal_error",
]);

/** Plan-gate wording used by editor routes that send no machine code. */
const PLAN_GATE_MESSAGE =
  /limit reached for your plan|requires a subscription|upgrade (?:your|to)|not included in your plan/;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Dashboard home: plans and billing are in its account menu. */
export function billingUrl(baseUrl: string | undefined): string | undefined {
  if (!baseUrl) return undefined;
  try {
    return new URL("/", baseUrl).href;
  } catch {
    return undefined;
  }
}

export function limitRecovery(error: unknown): LimitRecovery | null {
  if (!(error instanceof AppLaunchFlowApiError)) return null;
  const body =
    error.body && typeof error.body === "object"
      ? (error.body as Record<string, any>)
      : {};
  const code = [
    text(body.error?.code),
    text(body.code),
    // Editor routes report some limits as a snake_case error string.
    /^[a-z]+(?:_[a-z]+)+$/.test(text(body.error)) ? text(body.error) : "",
    /^[a-z]+(?:_[a-z]+)+$/.test(text(body.detail)) ? text(body.detail) : "",
  ]
    .map((value) => value.toLowerCase())
    // Generic gateway codes carry no reason; the detail may.
    .find((value) => value && !GENERIC_CODES.has(value));
  const message = [text(body.detail), text(body.error), error.message]
    .join(" ")
    .toLowerCase();
  const upgradeUrl = billingUrl(error.baseUrl);
  const upgrade = upgradeUrl
    ? ` To raise the limit the user can upgrade their plan at ${upgradeUrl} (account menu → plans).`
    : " To raise the limit the user can upgrade their AppLaunchFlow plan.";
  const planLimit = (
    kind: LimitRecovery["kind"],
    guidance: string,
  ): LimitRecovery => ({
    kind,
    retryable: false,
    guidance: `${guidance}${upgrade} Retrying the same call will fail again.`,
    ...(upgradeUrl ? { upgradeUrl } : {}),
  });

  if (code === "variant_limit_reached")
    return planLimit(
      "variant_limit",
      "The plan's variant limit for this content type is reached. Reuse or edit an existing variant (list_variants), or, only with the user's explicit approval, delete an unused one with delete_variant.",
    );
  if (code === "project_limit_reached")
    return planLimit(
      "project_limit",
      "The plan's project limit is reached. Work in an existing project (list_projects), or, only with the user's explicit approval, delete an unused project with delete_project.",
    );
  if (code === "keyword_limit")
    return planLimit(
      "keyword_limit",
      "The plan's tracked-keyword limit (keyword × country) would be exceeded; nothing was added. Add fewer keywords or countries, or, with the user's approval, stop tracking some with remove_keywords.",
    );
  if (code === "competitor_limit")
    return planLimit(
      "competitor_limit",
      "The plan's competitor limit would be exceeded; the list was not changed. Keep fewer competitors (remove_keyword_competitors).",
    );
  if (code === "api_export_quota_exhausted")
    return planLimit(
      "api_export_quota",
      "This month's API/MCP export allowance is used up (get_plan_usage shows used/limit and resetsAt). Wait for the reset, or export from the editor in the browser.",
    );
  if (code === "api_pro_required")
    return planLimit(
      "api_plan_required",
      "Exports through the API/MCP require the Unlimited plan. The user can still export from the editor in the browser.",
    );
  const planGated =
    code === "plan_limit_reached" ||
    body.requiresUpgrade === true ||
    PLAN_GATE_MESSAGE.test(message);
  if (planGated && message.includes("translation"))
    return planLimit(
      "translation_limit",
      "Translations are limited by plan (Free has none; paid plans cap the number of languages). Translate fewer languages, or reuse languages that already exist (list_translations).",
    );
  if (planGated || code === "pro_required")
    return planLimit(
      "plan_limit",
      "This action is not included in the user's current plan or its limit is reached.",
    );
  if (error.status === 429 || code === "rate_limit_exceeded" || code === "rate_limited") {
    const retryAfterSeconds =
      typeof error.retryAfter === "number" && Number.isFinite(error.retryAfter)
        ? error.retryAfter
        : undefined;
    return {
      kind: "rate_limit",
      retryable: true,
      guidance: `Too many requests in a short time. Wait ${retryAfterSeconds ? `${retryAfterSeconds} s` : "a minute"} before retrying once; do not retry in a loop.`,
      ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
    };
  }
  return null;
}
