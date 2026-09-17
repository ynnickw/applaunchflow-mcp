import { upstreamSignal } from "../request-context.js";
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  AppLaunchFlowClient,
  AppLaunchFlowApiError,
  type McpCredentials,
  type RequestOptions,
} from "./api.js";
export {
  AppLaunchFlowApiError,
  type RequestOptions,
  type McpCredentials,
} from "./api.js";
export type FormatId =
  | "ios.phone.6.9"
  | "ios.phone.6.5"
  | "ios.phone.6.3"
  | "ios.phone.6.1"
  | "ios.tablet.13"
  | "ios.tablet.12.9"
  | "ios.tablet.11"
  | "ios.tablet.10.5"
  | "android.phone"
  | "android.tablet7"
  | "android.tablet10";
export interface RevisionInput {
  projectId: string;
  variantId: string;
  language: string;
  name: string;
}
export interface Revision {
  id: string;
  projectId: string;
  variantId: string | null;
  name: string;
  language: string;
  status: "draft" | "approved" | "revoked";
  contentHash: string;
  bindings: Array<{
    key: string;
    kind: "capture" | "copy";
    device: string;
    screenId: string;
    nodeId: string;
    defaultValue: string;
  }>;
  createdAt: string;
  approvedAt: string | null;
}
export interface RenderInput {
  revisionId: string;
  formats: FormatId[];
  languages: Array<{
    locale: string;
    captures: Record<string, string>;
    copy: Record<string, string>;
    useDefaults?: boolean;
  }>;
  package?: "fastlane";
}
export interface Render {
  id: string;
  projectId: string;
  revisionId: string;
  status:
    | "queued"
    | "dispatching"
    | "rendering"
    | "succeeded"
    | "failed"
    | "cancelled"
    | "indeterminate";
  errorCode: string | null;
  statusUrl: string;
  createdAt: string;
  completedAt: string | null;
}
export interface Manifest {
  schemaVersion: 1;
  valid: true;
  revisionId: string;
  revisionHash: string;
  inputHash: string;
  rendererVersion: string;
  files: Array<{
    path: string;
    width: number;
    height: number;
    locale: string;
    platform: "ios" | "android";
    format: FormatId;
    screenId: string;
    sha256: string;
    sizeBytes: number;
  }>;
}
export interface Asset {
  id: string;
  projectId: string;
  name: string;
  status: "pending" | "ready";
  sha256: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}
export interface Upload {
  asset: Asset;
  upload: {
    method: "PUT";
    url: string;
    headers: Record<string, string>;
    expiresAt: string;
  };
  completeUrl: string;
}
export class AppLaunchFlow extends AppLaunchFlowClient {
  constructor(credentials: McpCredentials) {
    super(credentials);
  }
  override async requestJson<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const signal = upstreamSignal(options.timeoutMs ?? 180000, options.signal);
    const headers = new Headers(options.headers);
    if (
      !["GET", "HEAD"].includes(options.method ?? "GET") &&
      !headers.has("Idempotency-Key")
    )
      headers.set("Idempotency-Key", randomUUID());
    for (let attempt = 0; ; attempt++) {
      try {
        return await super.requestJson<T>(path, {
          ...options,
          headers: Object.fromEntries(headers),
          signal,
        });
      } catch (error) {
        if (
          !(error instanceof AppLaunchFlowApiError) ||
          error.status !== 429 ||
          attempt >= 3
        )
          throw error;
        const delay = Math.min(
          60000,
          Math.max(1000, (error.retryAfter ?? 5) * 1000),
        );
        await new Promise<void>((resolve, reject) => {
          signal.throwIfAborted();
          const abort = () => {
            clearTimeout(timer);
            reject(signal.reason);
          };
          const timer = setTimeout(() => {
            signal.removeEventListener("abort", abort);
            resolve();
          }, delay);
          signal.addEventListener("abort", abort, { once: true });
        });
      }
    }
  }
  formats() {
    return this.requestJson<{
      formats: Array<{
        id: FormatId;
        platform: string;
        device: string;
        width: number;
        height: number;
        storeType: string;
      }>;
      locales: { ios: string[]; android: string[] };
      limits: Record<string, number>;
    }>("/api/v1/formats");
  }
  createRevision(input: RevisionInput, idempotencyKey: string) {
    return this.requestJson<Revision>("/api/v1/design-revisions", {
      method: "POST",
      body: input,
      headers: { "Idempotency-Key": idempotencyKey },
      timeoutMs: 300000,
    });
  }
  getRevision(id: string) {
    return this.requestJson<Revision>(
      `/api/v1/design-revisions/${encodeURIComponent(id)}`,
    );
  }
  approveRevision(id: string, contentHash: string, idempotencyKey: string) {
    return this.requestJson<Revision>(
      `/api/v1/design-revisions/${encodeURIComponent(id)}/approve`,
      {
        method: "POST",
        body: {},
        headers: {
          "If-Match": `"${contentHash}"`,
          "Idempotency-Key": idempotencyKey,
        },
      },
    );
  }
  revokeRevision(id: string, contentHash: string, idempotencyKey: string) {
    return this.requestJson<Revision>(
      `/api/v1/design-revisions/${encodeURIComponent(id)}/revoke`,
      {
        method: "POST",
        body: {},
        headers: {
          "If-Match": `"${contentHash}"`,
          "Idempotency-Key": idempotencyKey,
        },
      },
    );
  }
  createAsset(
    input: {
      projectId: string;
      name: string;
      contentType: "image/png" | "image/jpeg";
      sizeBytes: number;
      sha256: string;
    },
    idempotencyKey: string,
  ) {
    return this.requestJson<Upload>("/api/v1/assets", {
      method: "POST",
      body: input,
      headers: { "Idempotency-Key": idempotencyKey },
    });
  }
  completeAsset(id: string, idempotencyKey: string) {
    return this.requestJson<Asset>(
      `/api/v1/assets/${encodeURIComponent(id)}/complete`,
      {
        method: "POST",
        body: {},
        headers: { "Idempotency-Key": idempotencyKey },
      },
    );
  }
  getAsset(id: string) {
    return this.requestJson<Asset>(`/api/v1/assets/${encodeURIComponent(id)}`);
  }
  renewAssetUpload(id: string) {
    return this.requestJson<Upload>(
      `/api/v1/assets/${encodeURIComponent(id)}/upload-url`,
      { method: "POST", body: {} },
    );
  }
  async uploadCapture(
    projectId: string,
    name: string,
    bytes: Uint8Array,
    contentType: "image/png" | "image/jpeg",
    idempotencyKey: string,
  ) {
    let upload = await this.createAsset(
      {
        projectId,
        name,
        contentType,
        sizeBytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
      idempotencyKey,
    );
    const existing = await this.getAsset(upload.asset.id);
    if (existing.status === "ready") return existing;
    if (Date.parse(upload.upload.expiresAt) < Date.now() + 30000)
      upload = await this.renewAssetUpload(upload.asset.id);
    const response = await fetch(upload.upload.url, {
      method: "PUT",
      headers: upload.upload.headers,
      body: Buffer.from(bytes),
      redirect: "error",
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok)
      throw new Error(`Capture upload failed (${response.status})`);
    return this.completeAsset(
      upload.asset.id,
      `complete:${createHash("sha256").update(idempotencyKey).digest("hex")}`,
    );
  }
  createRender(input: RenderInput, idempotencyKey: string) {
    return this.requestJson<Render>("/api/v1/renders", {
      method: "POST",
      body: input,
      headers: { "Idempotency-Key": idempotencyKey },
    });
  }
  getRender(id: string, options: RequestOptions = {}) {
    return this.requestJson<Render>(
      `/api/v1/renders/${encodeURIComponent(id)}`,
      options,
    );
  }
  getManifest(id: string) {
    return this.requestJson<Manifest>(
      `/api/v1/renders/${encodeURIComponent(id)}/manifest`,
    );
  }
  getDownload(id: string) {
    return this.requestJson<{
      url: string;
      sha256: string;
      sizeBytes: number;
      expiresAt: string;
    }>(`/api/v1/renders/${encodeURIComponent(id)}/download`);
  }
  cancelRender(id: string, idempotencyKey: string) {
    return this.requestJson<Render>(
      `/api/v1/renders/${encodeURIComponent(id)}/cancel`,
      {
        method: "POST",
        body: {},
        headers: { "Idempotency-Key": idempotencyKey },
      },
    );
  }
  async waitForRender(
    id: string,
    {
      signal,
      timeoutMs = 30 * 60000,
      intervalMs = 5000,
    }: { signal?: AbortSignal; timeoutMs?: number; intervalMs?: number } = {},
  ) {
    const deadline = AbortSignal.timeout(timeoutMs);
    const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
    for (;;) {
      combined.throwIfAborted();
      const render = await this.getRender(id, { signal: combined });
      if (render.status === "succeeded") return render;
      if (["failed", "cancelled", "indeterminate"].includes(render.status))
        throw new Error(
          `Render ${id} ended ${render.status}: ${render.errorCode ?? ""}`,
        );
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          reject(combined.reason);
        };
        const timer = setTimeout(() => {
          combined.removeEventListener("abort", abort);
          resolve();
        }, intervalMs);
        combined.addEventListener("abort", abort, { once: true });
      });
    }
  }
  /** Downloads exclusively to a new file, verifies bytes, removes partial files. Never extracts archives or overwrites an existing path. */
  async downloadPackage(id: string, path: string) {
    const download = await this.getDownload(id);
    if (!/^[a-f0-9]{64}$/.test(download.sha256))
      throw new Error("Missing package checksum");
    const response = await fetch(download.url, {
      redirect: "error",
      signal: AbortSignal.timeout(300000),
    });
    if (!response.ok || !response.body)
      throw new Error(`Package download failed (${response.status})`);
    const hash = createHash("sha256");
    let bytes = 0;
    let created = false;
    const output = createWriteStream(path, { flags: "wx", mode: 0o600 });
    output.on("open", () => {
      created = true;
    });
    try {
      await pipeline(
        Readable.fromWeb(response.body as never),
        new Transform({
          transform(chunk, _encoding, callback) {
            bytes += chunk.length;
            if (bytes > download.sizeBytes)
              return callback(new Error("Package exceeds declared size"));
            hash.update(chunk);
            callback(null, chunk);
          },
        }),
        output,
      );
      if (
        bytes !== download.sizeBytes ||
        hash.digest("hex") !== download.sha256
      )
        throw new Error("Package checksum or size mismatch");
      return download;
    } catch (error) {
      if (created) await unlink(path).catch(() => {});
      throw error;
    }
  }
}
