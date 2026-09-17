import { randomUUID } from "node:crypto";
import type { AssetList } from "../contracts/index.js";
import { upstreamSignal } from "../request-context.js";

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

const DEFAULT_API_TIMEOUT_MS = 30_000;
const LONG_RUNNING_API_TIMEOUT_MS = 10 * 60_000;
const UPLOAD_TIMEOUT_MS = 2 * 60_000;

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface McpCredentials {
  baseUrl: string;
  token: string;
}

export class AppLaunchFlowApiError extends Error {
  status: number;
  body: any;
  retryAfter?: number;
  requestId?: string;

  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = "AppLaunchFlowApiError";
    this.status = status;
    this.body = body;
  }
}

function buildSearchParams(query?: Record<string, QueryValue>): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
      continue;
    }
    params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export class AppLaunchFlowClient {
  credentials: McpCredentials;

  constructor(credentials: McpCredentials) {
    this.credentials = credentials;
  }

  private buildHeaders(extraHeaders?: Record<string, string>): Headers {
    const headers = new Headers(extraHeaders);
    headers.set("Authorization", `Bearer ${this.credentials.token}`);
    return headers;
  }

  async requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const versioned = officialApiPath(path);
    const url = new URL(versioned, this.credentials.baseUrl);
    const query = new URLSearchParams(buildSearchParams(options.query));
    for (const [key, value] of query) url.searchParams.append(key, value);
    if (url.origin !== new URL(this.credentials.baseUrl).origin)
      throw new Error("API paths must stay on the configured origin");
    const headers = this.buildHeaders(options.headers);

    const mutation = !["GET", "HEAD"].includes(options.method ?? "GET");
    if (mutation && !headers.has("Idempotency-Key"))
      headers.set("Idempotency-Key", randomUUID());
    if (mutation && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      method: options.method || "GET",
      redirect: "error",
      headers,
      signal: upstreamSignal(
        options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
        options.signal,
      ),
      body: mutation ? JSON.stringify(options.body ?? {}) : undefined,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload =
      response.status !== 204 &&
      (contentType.includes("application/json") ||
        contentType.includes("application/problem+json"))
        ? await response.json()
        : await response.text();

    if (!response.ok) {
      const message =
        typeof payload === "string"
          ? payload
          : payload?.detail ||
            payload?.error ||
            payload?.message ||
            `Request failed with status ${response.status}`;
      const error = new AppLaunchFlowApiError(
        message,
        response.status,
        payload,
      );
      const retry = response.headers.get("retry-after");
      error.retryAfter = retry ? Number(retry) : undefined;
      error.requestId = response.headers.get("x-request-id") ?? undefined;
      throw error;
    }

    return (
      payload &&
      typeof payload === "object" &&
      "data" in payload &&
      "meta" in payload
        ? payload.data
        : payload
    ) as T;
  }

  async createSignedUpload(args: {
    projectId: string;
    filename: string;
    contentType: string;
    deviceType?: "mobile" | "tablet" | "desktop" | "watch";
    platform?: "ios" | "android";
    fileType?:
      | "screenshot-overwrite-stage"
      | "illustration"
      | "logo"
      | "panorama"
      | "background"
      | "mockup-media"
      | "promo-media"
      | "font";
  }) {
    return this.requestJson<{
      uploadUrl: string;
      path: string;
      fullPath: string;
      filename: string;
      subfolder: string;
    }>("/api/assets/upload/signed-url", {
      method: "POST",
      body: args,
    });
  }

  async uploadBinary(
    uploadUrl: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: new Uint8Array(buffer),
      signal: upstreamSignal(UPLOAD_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }
  }

  listAssets(projectId: string) {
    return this.requestJson<unknown>(
      `/api/assets/list?projectId=${encodeURIComponent(projectId)}`,
    );
  }

  async listProjects() {
    const projects: any[] = [];
    let cursor: string | null = null;
    do {
      const page: { projects: any[]; nextCursor?: string | null } =
        await this.requestJson("/api/projects", { query: { cursor } });
      projects.push(...page.projects);
      cursor = page.nextCursor ?? null;
    } while (cursor);
    return { projects };
  }

  createProject(body: Record<string, unknown>) {
    return this.requestJson<{ project: any }>("/api/projects", {
      method: "POST",
      body,
    });
  }

  deleteProject(projectId: string) {
    return this.requestJson<{ success: true }>(`/api/projects/${projectId}`, {
      method: "DELETE",
    });
  }

  getProject(projectId: string) {
    return this.requestJson<any>(`/api/app/${projectId}`);
  }

  listScreenshots(query: {
    projectId: string;
    deviceType?: "mobile" | "tablet" | "desktop";
    platform?: "ios" | "android";
  }) {
    return this.requestJson<{ screenshots: string[]; isSample?: boolean }>(
      "/api/screenshots/list",
      { query },
    );
  }

  listProjectScreenshots(projectId: string) {
    return this.requestJson<{
      screenshotUrls: string[];
      paths: string[];
      platforms: Array<"ios" | "android">;
      deviceTypes: Array<"phone" | "tablet" | "desktop">;
      defaultPlatform: "ios" | "android";
    }>(`/api/projects/${projectId}/screenshots`);
  }

  generateLayouts(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/screenshots/generate", {
      method: "POST",
      body,
      timeoutMs: LONG_RUNNING_API_TIMEOUT_MS,
    });
  }

  applyScreenshotTemplate(body: {
    generationId: string;
    catalogKey: string;
    templateId: string;
    paletteMode: "v1" | "v2";
  }) {
    return this.requestJson<any>("/api/screenshots/apply-template", {
      method: "POST",
      body,
    });
  }

  regenerateLayouts(body: { projectId: string; variantId?: string }) {
    return this.requestJson<any>("/api/screenshots/regenerate", {
      method: "POST",
      body,
    });
  }

  getLayout(query: {
    generationId: string;
    language?: string;
    variantId?: string;
    sign?: boolean;
  }) {
    return this.requestJson<any>("/api/translations", {
      query: {
        generationId: query.generationId,
        language: query.language,
        variantId: query.variantId,
        sign: query.sign ? 1 : undefined,
      },
    });
  }

  saveLayout(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/translations", {
      method: "POST",
      body,
    });
  }

  transformLayout(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/mcp/transform", {
      method: "POST",
      body,
    });
  }

  listTemplates() {
    return this.requestJson<{ templates: any[] }>("/api/mcp/templates");
  }

  getTemplate(templateId: string) {
    return this.requestJson<{ template: any }>(
      `/api/mcp/templates/${templateId}`,
    );
  }

  listSocialTemplates() {
    return this.requestJson<{ templates: any[] }>("/api/mcp/social-templates");
  }

  getSocialTemplate(templateId: string) {
    return this.requestJson<{ template: any }>(
      `/api/mcp/social-templates/${templateId}`,
    );
  }

  getPromoVideo(generationId: string, variantId?: string) {
    return this.requestJson<any>("/api/promovideo/load", {
      query: { generationId, variantId },
    });
  }

  generatePromoVideo(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/promovideo/generate", {
      method: "POST",
      body,
      timeoutMs: LONG_RUNNING_API_TIMEOUT_MS,
    });
  }

  updatePromoVideo(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/promovideo/update", {
      method: "POST",
      body,
    });
  }

  clearPromoVideo(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/promovideo/clear", {
      method: "POST",
      body,
    });
  }

  createMockupAnimation(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/mockups/setup", {
      method: "POST",
      body,
    });
  }

  getMockupAnimation(generationId: string, variantId?: string) {
    return this.requestJson<any>("/api/mockups", {
      query: { generationId, variantId },
    });
  }

  updateMockupAnimation(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/mockups", {
      method: "POST",
      body,
    });
  }

  listMockupMedia(projectId: string) {
    return this.requestJson<any>("/api/mockup-media/list", {
      query: { projectId },
    });
  }

  getMockupThemeColors(generationId: string) {
    return this.requestJson<any>("/api/mockups/theme-colors", {
      query: { generationId },
    });
  }

  lookupAppStore(id: string, country = "us") {
    return this.requestJson<any>("/api/itunes/lookup", {
      query: { id, country },
      headers: {},
    });
  }

  translateLayouts(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/screenshots/translate", {
      method: "POST",
      body,
      timeoutMs: LONG_RUNNING_API_TIMEOUT_MS,
    });
  }

  listVariants(generationId: string, contentType: string) {
    return this.requestJson<any>("/api/variants", {
      query: { generationId, contentType },
    });
  }

  createVariant(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/variants", {
      method: "POST",
      body,
    });
  }

  switchVariant(variantId: string) {
    return this.requestJson<any>(`/api/variants/${variantId}`, {
      method: "PATCH",
      body: { isActive: true },
    });
  }

  duplicateVariant(variantId: string) {
    return this.requestJson<any>(`/api/variants/${variantId}/duplicate`, {
      method: "POST",
    });
  }

  deleteVariant(variantId: string) {
    return this.requestJson<any>(`/api/variants/${variantId}`, {
      method: "DELETE",
    });
  }

  getGraphics(projectId: string, variantId?: string) {
    return this.requestJson<any>("/api/graphics", {
      query: { projectId, variantId },
    });
  }

  getGraphicsFormat(projectId: string, format: string, variantId?: string) {
    return this.requestJson<any>("/api/graphics", {
      query: { projectId, variantId, format },
    });
  }

  generateGraphics(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/graphics/generate", {
      method: "POST",
      body,
      timeoutMs: LONG_RUNNING_API_TIMEOUT_MS,
    });
  }

  applyGraphicsTemplate(body: {
    generationId: string;
    catalogKey: string;
    templateId: string;
    primaryFormat: string;
    paletteMode: "v1" | "v2";
  }) {
    return this.requestJson<any>("/api/graphics/apply-template", {
      method: "POST",
      body,
    });
  }

  saveGraphics(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/graphics", {
      method: "POST",
      body,
    });
  }

  saveGraphicsFormat(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/graphics/format", {
      method: "POST",
      body,
    });
  }

  getAsoCopy(generationId: string, variantId?: string) {
    return this.requestJson<any>("/api/aso/copy", {
      query: { generationId, variantId },
    });
  }

  generateAsoCopy(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/aso/copy", {
      method: "POST",
      body,
      timeoutMs: LONG_RUNNING_API_TIMEOUT_MS,
    });
  }

  updateAsoCopy(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/aso/copy", {
      method: "PUT",
      body,
    });
  }

  translateAsoCopy(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/aso/translate", {
      method: "POST",
      body,
      timeoutMs: LONG_RUNNING_API_TIMEOUT_MS,
    });
  }

  suggestCompetitors(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/aso/competitors/suggest", {
      method: "POST",
      body,
      timeoutMs: LONG_RUNNING_API_TIMEOUT_MS,
    });
  }

  listSharedIllustrations(query?: {
    category?: string;
    style?: string;
    search?: string;
    limit?: number;
  }) {
    return this.requestJson<any>("/api/illustrations/shared", { query });
  }

  listProjectIllustrations(projectId: string) {
    return this.requestJson<any>("/api/illustrations/list", {
      query: { projectId },
    });
  }

  listKeywords(query: {
    projectId: string;
    storeProvider?: "app_store" | "google_play";
  }) {
    return this.requestJson<any>("/api/keywords", { query });
  }

  listKeywordCompetitors(query: {
    projectId: string;
    storeProvider?: "app_store" | "google_play";
  }) {
    return this.requestJson<any>("/api/keywords/competitors", { query });
  }

  getKeywordHistory(query: { trackedKeywordId: string; appId?: string }) {
    return this.requestJson<any>("/api/keywords/history", { query });
  }

  addKeywords(body: {
    projectId: string;
    appId: string;
    keywords: string[];
    country?: string;
    lang?: string;
    source?: "type" | "suggest" | "competitor" | "auto_detect";
    storeProvider?: "app_store" | "google_play";
  }) {
    return this.requestJson<{
      ok: true;
      added: number;
      staleCount: number;
    }>("/api/keywords", { method: "POST", body });
  }

  /** List files in a project's asset subfolder (panorama, illustrations, backgrounds, etc.) */
  async listProjectAssetFolder(projectId: string, folder: string) {
    // Use the app endpoint for known folders, or fall back to storage listing
    if (folder === "illustrations") {
      return this.listProjectIllustrations(projectId);
    }
    const result: AssetList = { projectId, assets: [], truncated: false };
    let offset = 0;
    let more: boolean;
    do {
      const page = await this.requestJson<AssetList>("/api/assets/list", {
        query: { projectId, offset },
      });
      result.assets.push(
        ...page.assets.filter((asset) => asset.path.startsWith(`${folder}/`)),
      );
      more = page.truncated;
      offset += 100;
    } while (more);
    return result;
  }
}

/** One wire contract for the MCP and direct SDK consumers. */
export function officialApiPath(path: string) {
  if (path.startsWith("/api/v1/")) return path;
  return path
    .replace(/^\/api\/mcp\/transform(?=\?|$)/, "/api/v1/designs/transform")
    .replace(/^\/api\/mcp\/review-snapshot(?=\?|$)/, "/api/v1/review-snapshots")
    .replace(
      /^\/api\/mcp\/(social-templates|templates)(?=\/|\?|$)/,
      "/api/v1/$1",
    )
    .replace(/^\/api\/app\//, "/api/v1/projects/")
    .replace(/^\/api\/(?!v1\/)/, "/api/v1/");
}
