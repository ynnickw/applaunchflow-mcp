import type { StoredCredentials } from "../auth/credentials.js";

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
}

export class AppLaunchFlowApiError extends Error {
  status: number;
  body: any;

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
  readonly credentials: StoredCredentials;

  constructor(credentials: StoredCredentials) {
    this.credentials = credentials;
  }

  private buildHeaders(extraHeaders?: Record<string, string>): Headers {
    const headers = new Headers(extraHeaders);
    headers.set(
      "Cookie",
      `${this.credentials.cookieName}=${this.credentials.token}`,
    );
    return headers;
  }

  async requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.credentials.baseUrl}${path}${buildSearchParams(options.query)}`;
    const headers = this.buildHeaders(options.headers);

    if (options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        typeof payload === "string"
          ? payload
          : payload?.error ||
            payload?.message ||
            `Request failed with status ${response.status}`;
      throw new AppLaunchFlowApiError(message, response.status, payload);
    }

    return payload as T;
  }

  async createSignedUpload(args: {
    projectId: string;
    filename: string;
    contentType: string;
    deviceType?: "mobile" | "tablet" | "desktop" | "watch";
    platform?: "ios" | "android";
    fileType?:
      | "illustration"
      | "logo"
      | "panorama"
      | "background"
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
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }
  }

  listProjects() {
    return this.requestJson<{ projects: any[] }>("/api/projects");
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

  generateLayouts(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/screenshots/generate", {
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
    return this.requestJson<{ template: any }>(`/api/mcp/templates/${templateId}`);
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

  generateGraphics(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/graphics/generate", {
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

  getAsoCopy(generationId: string, variantId?: string) {
    return this.requestJson<any>("/api/aso/copy", {
      query: { generationId, variantId },
    });
  }

  generateAsoCopy(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/aso/copy", {
      method: "POST",
      body,
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
    });
  }

  suggestCompetitors(body: Record<string, unknown>) {
    return this.requestJson<any>("/api/aso/competitors/suggest", {
      method: "POST",
      body,
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

  /** List files in a project's asset subfolder (panorama, illustrations, backgrounds, etc.) */
  async listProjectAssetFolder(projectId: string, folder: string) {
    // Use the app endpoint for known folders, or fall back to storage listing
    if (folder === "illustrations") {
      return this.listProjectIllustrations(projectId);
    }
    // For panorama/backgrounds/logo — use the screenshots list with a folder hint
    // These are stored under {projectId}/{folder}/ in the screenshots bucket
    return this.requestJson<any>(`/api/app/${projectId}/assets`, {
      query: { folder },
    });
  }
}
