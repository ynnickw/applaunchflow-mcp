import { promises as fs } from "fs";
import { promises as dns } from "node:dns";
import { BlockList, isIP } from "node:net";
import path from "path";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  AppLaunchFlowApiError,
  type AppLaunchFlowClient,
} from "../client/api.js";
import { upstreamSignal } from "../request-context.js";
import { ToolInputError } from "../telemetry.js";
import { fail, ok, safeFail } from "./utils.js";
import { assetSummary } from "./asset-summary.js";
import { mediaDurationSeconds } from "../media-duration.js";

import {
  assetListSchema,
  assetUploadRequestSchema,
  assetUploadMetadata,
  validateAssetUploadGrant,
} from "../contracts/index.js";
import { pickerUri } from "../ui/picker-bundle.js";
import {
  pickerToolMeta,
  registerPickerResource,
} from "../ui/picker-resource.js";

export const ASSET_LIST_URI = pickerUri("asset-list");

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_REMOTE_REDIRECTS = 3;

const blockedNetworks = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedNetworks.addSubnet(network, prefix, "ipv4");
}
blockedNetworks.addAddress("::", "ipv6");
blockedNetworks.addAddress("::1", "ipv6");
for (const [network, prefix] of [
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedNetworks.addSubnet(network, prefix, "ipv6");
}

export function isPrivateOrReservedIp(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  const family = isIP(normalized);
  if (family === 0) return true;
  return blockedNetworks.check(normalized, family === 4 ? "ipv4" : "ipv6");
}

async function assertSafeRemoteUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new ToolInputError(
      "INVALID_UPLOAD_INPUT",
      "Hosted connectors only fetch assets over HTTPS",
    );
  }
  if (url.username || url.password) {
    throw new ToolInputError(
      "INVALID_UPLOAD_INPUT",
      "Asset URLs must not contain embedded credentials",
    );
  }

  const addresses = await dns.lookup(url.hostname, {
    all: true,
    verbatim: true,
  });
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateOrReservedIp(address))
  ) {
    throw new ToolInputError(
      "INVALID_UPLOAD_INPUT",
      "Asset URL resolves to a private or reserved network",
    );
  }
  return url;
}

async function readResponseWithLimit(response: Response): Promise<Buffer> {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_UPLOAD_BYTES) {
    throw new ToolInputError(
      "INVALID_UPLOAD_INPUT",
      "Asset exceeds the 25 MB upload limit",
    );
  }
  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_UPLOAD_BYTES) {
      await reader.cancel();
      throw new ToolInputError(
        "INVALID_UPLOAD_INPUT",
        "Asset exceeds the 25 MB upload limit",
      );
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function fetchRemoteAsset(value: string): Promise<{
  response: Response;
  finalUrl: URL;
}> {
  let current = await assertSafeRemoteUrl(value);
  for (
    let redirectCount = 0;
    redirectCount <= MAX_REMOTE_REDIRECTS;
    redirectCount += 1
  ) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: upstreamSignal(20_000),
      headers: { accept: "image/*,font/*;q=0.8" },
    });
    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: current };
    }
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location || redirectCount === MAX_REMOTE_REDIRECTS) {
      throw new Error("Asset URL redirected too many times");
    }
    current = await assertSafeRemoteUrl(new URL(location, current).toString());
  }
  throw new Error("Asset URL could not be fetched");
}

const uploadSourceSchema = z
  .object({
    path: z.string().optional(),
    url: z.string().url().optional(),
    base64: z.string().optional(),
    filename: z.string().optional(),
  })
  .refine((value) => !!value.path || !!value.url || !!value.base64, {
    message: "Provide path, url, or base64",
  });

const hostedUploadSourceSchema = z
  .object({
    url: z.string().url().optional(),
    base64: z.string().optional(),
    filename: z.string().optional(),
  })
  .refine((value) => !!value.url || !!value.base64, {
    message: "Provide url or base64",
  });

function inferMimeType(filename: string): string {
  const extension = path.extname(filename).toLowerCase();
  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".avif":
      return "image/avif";
    case ".heic":
      return "image/heic";
    case ".heif":
      return "image/heif";
    case ".mp4":
      return "video/mp4";
    case ".m4v":
      return "video/x-m4v";
    case ".mov":
      return "video/quicktime";
    case ".webm":
      return "video/webm";
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".wav":
      return "audio/wav";
    case ".aac":
      return "audio/aac";
    case ".ogg":
      return "audio/ogg";
    case ".ttf":
      return "font/ttf";
    case ".otf":
      return "font/otf";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

async function expandPathSource(sourcePath: string) {
  const stat = await fs.stat(sourcePath);
  if (!stat.isDirectory()) {
    return [sourcePath];
  }

  const entries = await fs.readdir(sourcePath);
  return entries
    .filter((entry) =>
      [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(
        path.extname(entry).toLowerCase(),
      ),
    )
    .map((entry) => path.join(sourcePath, entry))
    .sort();
}

async function resolveUploadPayload(
  source: z.infer<typeof uploadSourceSchema>,
) {
  if (source.path) {
    if (process.env.APPLAUNCHFLOW_MCP_REMOTE === "1") {
      throw new ToolInputError(
        "HOSTED_FILE_PATH_UNSUPPORTED",
        "Local file paths are unavailable to hosted connectors; use an HTTPS URL or base64 data",
      );
    }
    const expanded = await expandPathSource(source.path);
    return Promise.all(
      expanded.map(async (filePath) => {
        const buffer = await fs.readFile(filePath);
        return {
          buffer,
          filename: source.filename || path.basename(filePath),
          contentType: inferMimeType(source.filename || filePath),
        };
      }),
    );
  }

  if (source.url) {
    const { response, finalUrl } = await fetchRemoteAsset(source.url);
    if (!response.ok) {
      throw new AppLaunchFlowApiError(
        "Asset source download failed",
        response.status,
        undefined,
      );
    }
    const contentType = response.headers.get("content-type") || "";
    if (
      !/^(image\/|video\/|audio\/|font\/|application\/(x-font-|font-))/i.test(
        contentType,
      )
    ) {
      throw new ToolInputError(
        "INVALID_UPLOAD_INPUT",
        "Asset URL returned an unsupported content type",
      );
    }
    const buffer = await readResponseWithLimit(response);
    const filename =
      source.filename || finalUrl.pathname.split("/").pop() || "upload.png";
    return [
      {
        buffer,
        filename,
        contentType: contentType || inferMimeType(filename),
      },
    ];
  }

  const filename = source.filename || "upload.png";
  const normalizedBase64 = source.base64!.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(normalizedBase64, "base64");
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new ToolInputError(
      "INVALID_UPLOAD_INPUT",
      "Asset exceeds the 25 MB upload limit",
    );
  }
  return [
    {
      buffer,
      filename,
      contentType: inferMimeType(filename),
    },
  ];
}

/**
 * Check an uploaded mockup recording against the cloud-render profile and
 * have the server delete it when unsuitable. null when the dashboard predates
 * the inspection endpoint.
 */
async function inspectMockupRecording(
  client: AppLaunchFlowClient,
  projectId: string,
  path: string,
): Promise<{
  exportSafe: boolean;
  issues: string[];
  removed?: boolean;
  ffmpegCommand?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fps?: number | null;
} | null> {
  try {
    return await client.inspectMockupMedia({
      generationId: projectId,
      path,
      removeIfUnsuitable: true,
    });
  } catch (error) {
    if (error instanceof AppLaunchFlowApiError && error.status === 404)
      return null;
    if (error instanceof AppLaunchFlowApiError && error.status < 500)
      throw new ToolInputError(
        "INVALID_UPLOAD_INPUT",
        `Uploaded ${path}, but it could not be read as a video recording: ${error.message}`,
      );
    throw error;
  }
}

export function registerAssetTools(
  server: McpServer,
  client: AppLaunchFlowClient,
  options: { hosted?: boolean } = {},
): void {
  const exposedUploadSourceSchema = options.hosted
    ? hostedUploadSourceSchema
    : uploadSourceSchema;
  registerPickerResource(server, client, {
    name: "asset-list",
    bundle: "asset-list",
    uri: ASSET_LIST_URI,
    description: "AppLaunchFlow project assets",
  });
  server.registerTool(
    "list_assets",
    {
      title: "List Assets",
      description:
        "Returns an embedded library of a project's screenshots, illustrations, icons, backgrounds, panoramas, recordings, music, clips and fonts. Listing is read-only; Upload is an explicit widget action. Results contain relative storage paths; signed preview links remain private widget data. Each folder is limited to its newest 100 files and reports truncation.",
      inputSchema: z.object({ projectId: z.string().uuid() }),
      _meta: {
        ...pickerToolMeta(ASSET_LIST_URI),
        "openai/widgetAccessible": true,
      },
    },
    async ({ projectId }) => {
      try {
        const data = assetListSchema.parse(await client.listAssets(projectId));
        if (data.projectId !== projectId)
          throw new Error("Asset project mismatch");
        return {
          ...ok(
            {
              projectId,
              truncated: data.truncated,
              assets: assetSummary(data.assets),
            },
            "Fetched project assets",
          ),
          _meta: { assetList: data },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );
  server.registerTool(
    "prepare_asset_upload",
    {
      title: "Prepare Asset Upload",
      description:
        "App-only: authorizes one explicitly selected file upload to the project and returns its upload permission as private widget metadata. Does not transfer file bytes, replace files, apply a design or change the project icon.",
      inputSchema: assetUploadRequestSchema,
      _meta: {
        ui: { visibility: ["app"] },
        "openai/widgetAccessible": true,
        "openai/visibility": "private",
      },
    },
    async (request) => {
      try {
        const metadata = assetUploadMetadata(request);
        // Unique names avoid accidental overwrites, even for parallel identical filenames.
        const signed = await client.createSignedUpload({
          ...metadata,
          filename: `${randomUUID()}-${metadata.filename}`,
        });
        const grant = validateAssetUploadGrant(
          {
            projectId: request.projectId,
            path: signed.path,
            uploadUrl: signed.uploadUrl,
          },
          request,
          client.credentials.baseUrl,
        );
        return {
          ...ok({ projectId: request.projectId }, "Upload permission prepared"),
          _meta: { assetUpload: grant },
        };
      } catch (error) {
        // Validation errors can contain the signed URL. Never echo upload secrets to the model.
        return safeFail(
          error,
          "Could not authorize this upload. Check the file type, size, connection and project access.",
        );
      }
    },
  );
  server.registerTool(
    "upload_screenshots",
    {
      title: "Upload Screenshots",
      description:
        "Uploads screenshot images to a project from HTTPS URLs or base64 data; local files are supported only by the npm/stdio transport. Results identify completed and failed files. Overwrite mode changes the bytes at existing paths and can affect saved designs that reference those paths.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        deviceType: z.enum(["mobile", "tablet", "desktop", "watch"]),
        platform: z.enum(["ios", "android"]),
        sources: z.array(exposedUploadSourceSchema).min(1),
        overwrite: z
          .boolean()
          .optional()
          .describe(
            "Explicit opt-in: replace same-name screenshot bytes in place, updating ALL designs bound to that path. Previous bytes are backed up. Reload open editors afterwards.",
          ),
        targetPath: z
          .string()
          .optional()
          .describe(
            "Exact existing relative path to overwrite when legacy filenames are ambiguous. Requires overwrite=true and exactly one source.",
          ),
        folderId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Existing screenshot folder in this device/platform scope. Assign each uploaded file to it; never changes saved designs.",
          ),
      }),
    },
    async ({
      projectId,
      deviceType,
      platform,
      sources,
      folderId,
      overwrite,
      targetPath,
    }) => {
      let pendingOverwrite:
        | { operationId: string; sourcePath: string; targetPath?: string }
        | undefined;
      let sourceIndex = 0;
      let fileIndex = 0;
      let phase = "source_download";
      let pendingUpload: { path: string; filename: string } | undefined;
      const uploads: Array<{
        sourceIndex: number;
        fileIndex: number;
        sourceFilename: string;
        filename: string;
        path: string;
        subfolder: string;
        folderAssigned: boolean;
        revision?: string;
        backupPath?: string | null;
      }> = [];
      try {
        if (targetPath && (!overwrite || sources.length !== 1))
          throw new ToolInputError(
            "INVALID_UPLOAD_INPUT",
            "targetPath requires overwrite=true and exactly one source",
          );
        if (folderId) {
          const library = await client.requestJson<{
            organization: {
              folders: Array<{
                id: string;
                device_type: string;
                platform: string;
              }>;
            };
          }>("/api/assets/folders", { query: { projectId } });
          if (
            !library.organization.folders.some(
              (folder) =>
                folder.id === folderId &&
                folder.device_type === deviceType &&
                folder.platform === platform,
            )
          )
            throw new ToolInputError(
              "INVALID_UPLOAD_INPUT",
              "Folder does not match upload scope",
            );
        }
        for (; sourceIndex < sources.length; sourceIndex++) {
          const source = sources[sourceIndex];
          fileIndex = 0;
          phase = "source_download";
          const payloads = await resolveUploadPayload(source);
          if (targetPath && payloads.length !== 1)
            throw new ToolInputError(
              "INVALID_UPLOAD_INPUT",
              "targetPath requires exactly one image, not a ZIP",
            );
          for (; fileIndex < payloads.length; fileIndex++) {
            const payload = payloads[fileIndex];
            phase = "upload_authorization";
            const signed = await client.createSignedUpload({
              projectId,
              filename: `${randomUUID()}-${payload.filename}`,
              contentType: payload.contentType,
              deviceType,
              platform,
              ...(overwrite
                ? { fileType: "screenshot-overwrite-stage" as const }
                : {}),
            });
            pendingUpload = { path: signed.path, filename: signed.filename };
            phase = "upload";
            await client.uploadBinary(
              signed.uploadUrl,
              payload.buffer,
              payload.contentType,
            );
            if (overwrite)
              pendingOverwrite = {
                operationId: randomUUID(),
                sourcePath: signed.path,
                targetPath,
              };
            phase = "overwrite";
            const stored = overwrite
              ? await client.requestJson<{
                  path: string;
                  filename: string;
                  subfolder: string;
                  revision: string;
                  backupPath: string | null;
                }>("/api/assets/overwrite", {
                  method: "POST",
                  timeoutMs: 65_000,
                  body: {
                    projectId,
                    deviceType,
                    platform,
                    filename: payload.filename,
                    ...pendingOverwrite,
                  },
                })
              : signed;
            pendingOverwrite = undefined;
            pendingUpload = undefined;
            uploads.push({
              sourceIndex,
              fileIndex,
              sourceFilename: payload.filename,
              filename: stored.filename,
              path: stored.path,
              subfolder: stored.subfolder,
              folderAssigned: false,
              ...("revision" in stored
                ? { revision: stored.revision, backupPath: stored.backupPath }
                : {}),
            });
          }
        }
        if (folderId) {
          phase = "folder_assignment";
          // The API supports moving multiple paths in one mutation. Avoid one
          // account-wide rate-limit slot per screenshot in a batch.
          for (let offset = 0; offset < uploads.length; offset += 50) {
            // Match the folder API's 50-path limit and retain completed chunks
            // if a later assignment fails.
            const chunk = uploads.slice(offset, offset + 50);
            await client.requestJson("/api/assets/folders", {
              method: "POST",
              body: {
                projectId,
                action: "move",
                folderId,
                paths: chunk.map((upload) => upload.path),
              },
            });
            for (const upload of chunk) upload.folderAssigned = true;
          }
        }
        return ok(
          { uploads },
          overwrite
            ? "Screenshots overwritten in place. Existing bindings are unchanged; reload open editors to refresh. Previous bytes and staged sources are retained."
            : "Uploaded assets",
        );
      } catch (error) {
        if (error instanceof ToolInputError && !uploads.length)
          return fail(error);
        const partial = ok(
          {
            uploads,
            folderId,
            pendingOverwrite,
            pendingUpload,
            recovery: {
              phase,
              sourceIndex,
              fileIndex,
              nextStep:
                phase === "folder_assignment"
                  ? "All files were uploaded. Use move_assets with the listed unassigned paths; do not upload them again."
                  : pendingUpload || pendingOverwrite
                    ? "Check the pending path or overwrite operation before retrying: the write may have completed. Do not repeat successful uploads."
                    : "Retry only the failed source and remaining sources. For a directory source, skip the completed files listed by sourceIndex/fileIndex. Do not repeat successful uploads. Refresh expired source URLs or use base64 data if a source download timed out.",
            },
            complete: false,
            ...(error instanceof AppLaunchFlowApiError &&
            error.body?.code === "AMBIGUOUS_FILENAME"
              ? {
                  code: "AMBIGUOUS_FILENAME",
                  nextStep:
                    "Supply the exact targetPath already bound in the design; filename matches were ambiguous and this file was not overwritten.",
                }
              : {}),
          },
          overwrite
            ? "Overwrite incomplete. Completed overwrites are listed and may affect existing designs. Do not blindly retry: check project/operation state first. Staged uploads and backups are retained."
            : "Upload incomplete. Successfully uploaded files are listed; unassigned files can be moved with move_assets. No saved designs were changed.",
        );
        return {
          ...partial,
          isError: true,
          structuredContent: {
            ...partial.structuredContent,
            success: false,
            error: safeFail(error, partial.structuredContent.message!)
              .structuredContent.error,
          },
        };
      }
    },
  );

  server.registerTool(
    "list_illustrations",
    {
      title: "List Illustrations",
      description:
        "Lists shared-library illustrations or illustrations uploaded to a specified project. Read-only.",
      inputSchema: z.object({
        source: z
          .enum(["shared", "project"])
          .describe(
            "'shared' for the shared library, 'project' for project-uploaded illustrations.",
          ),
        projectId: z
          .string()
          .uuid()
          .optional()
          .describe("Required when source is 'project'."),
        category: z
          .string()
          .optional()
          .describe(
            "Filter shared library by category (e.g. 'Icons', 'Sticker', 'Illustrations').",
          ),
        search: z
          .string()
          .optional()
          .describe("Search term to filter by name."),
      }),
    },
    async ({ source, projectId, category, search }) => {
      try {
        if (source === "project") {
          if (!projectId) {
            throw new Error("projectId is required when source is 'project'");
          }
          const data = await client.listProjectIllustrations(projectId);
          return {
            ...ok(assetSummary(data), "Fetched project illustrations"),
            _meta: { illustrationPreviews: data },
          };
        }
        return ok(
          await client.listSharedIllustrations({ category, search, limit: 50 }),
          "Fetched shared illustrations",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "upload_asset",
    {
      title: "Upload Asset",
      description:
        "Uploads one illustration, logo, background, panorama, font, recording, image, video or audio asset. Maximum 25 MB per file. HTTPS URLs and base64 data are supported; local paths are npm/stdio-only. Returns a project-relative storage path and available media metadata. Font registration is enabled by default. Upload alone does not apply an asset to a design or change the project icon.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        fileType: z
          .enum([
            "illustration",
            "logo",
            "panorama",
            "background",
            "font",
            "mockup-media",
            "promo-media",
          ])
          .describe(
            "Use mockup-media for mockup screens/recordings and mockup soundtracks, promo-media for promo video/audio footage, font for TTF/OTF/WOFF/WOFF2, or an image category. Mockup recordings are checked on upload (H.264, ≤1080 px short side, keyframe every ≤2 s, ≤60 fps) and rejected with an ffmpeg command when unsuitable.",
          ),
        source: exposedUploadSourceSchema.describe(
          "The file source — provide an HTTPS URL or base64 data, or a local file path for npm/stdio, with an appropriate filename.",
        ),
        registerFont: z
          .boolean()
          .optional()
          .describe(
            "Font uploads only (default true): add the file to the project's custom fonts (metadata.customFonts) like the editor's font upload. Family, weight and style come from the filename (e.g. Inter-BoldItalic.ttf).",
          ),
        fontFamily: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .optional()
          .describe(
            "Font uploads only: family name to register instead of the one derived from the filename. Upload each weight file with the same fontFamily.",
          ),
      }),
    },
    async ({ projectId, fileType, source, registerFont, fontFamily }) => {
      try {
        const payloads = await resolveUploadPayload(source);
        const payload = payloads[0];
        if (payload.buffer.byteLength > MAX_UPLOAD_BYTES)
          throw new ToolInputError(
            "INVALID_UPLOAD_INPUT",
            "Asset exceeds the 25 MB upload limit",
          );
        const mime = payload.contentType;
        const allowed =
          fileType === "font"
            ? /^(font\/|application\/(x-font-|font-))/.test(mime)
            : mime.startsWith("image/") ||
              ((fileType === "mockup-media" || fileType === "promo-media") &&
                (mime.startsWith("video/") || mime.startsWith("audio/")));
        if (!allowed)
          throw new ToolInputError(
            "INVALID_UPLOAD_INPUT",
            "Unsupported content type for this asset category",
          );
        const signed = await client.createSignedUpload({
          projectId,
          filename: `${randomUUID()}-${payload.filename}`,
          contentType: payload.contentType,
          fileType,
        });
        await client.uploadBinary(
          signed.uploadUrl,
          payload.buffer,
          payload.contentType,
        );
        const registered =
          fileType === "font" && registerFont !== false
            ? await client.registerCustomFont({
                projectId,
                path: signed.path,
                ...(fontFamily ? { name: fontFamily } : {}),
              })
            : null;
        // Durations let agents time promo/mockup scenes to the real clip.
        const durationSeconds =
          mime.startsWith("video/") || mime.startsWith("audio/")
            ? mediaDurationSeconds(payload.buffer, mime)
            : undefined;
        const uploaded = {
          filename: signed.filename,
          path: signed.path,
          subfolder: signed.subfolder,
          ...(durationSeconds !== undefined ? { durationSeconds } : {}),
          ...(registered
            ? { fontFamily: registered.family, font: registered.font }
            : {}),
        };
        if (fileType === "mockup-media" && mime.startsWith("video/")) {
          let inspection: Awaited<ReturnType<typeof inspectMockupRecording>>;
          try {
            inspection = await inspectMockupRecording(
              client,
              projectId,
              signed.path,
            );
          } catch (error) {
            if (error instanceof ToolInputError) return fail(error);
            throw error;
          }
          if (inspection && !inspection.exportSafe)
            return fail(
              new ToolInputError(
                "INVALID_UPLOAD_INPUT",
                [
                  `This recording isn't suitable for mockup rendering and was ${inspection.removed ? "removed" : "not used"}: ${inspection.issues.join(" ")}`,
                  "The editor re-encodes recordings to H.264, 30 fps, a keyframe every 2 s, ≤1080 px short side, ≤30 MB; the server cannot re-encode.",
                  `Re-encode it and upload again, e.g.: ${inspection.ffmpegCommand}`,
                  "Or ask the user to upload it in the mockup editor, which converts it automatically.",
                ].join("\n"),
              ),
            );
          if (inspection)
            return ok(
              {
                ...uploaded,
                durationSeconds: inspection.durationSeconds,
                width: inspection.width,
                height: inspection.height,
                fps: inspection.fps,
              },
              `Uploaded ${fileType} recording (${inspection.durationSeconds}s, ${inspection.width}×${inspection.height})`,
            );
        }
        return ok(
          uploaded,
          registered
            ? `Uploaded and registered font family "${registered.family}"`
            : `Uploaded ${fileType} asset`,
        );
      } catch (error) {
        return safeFail(
          error,
          "Asset upload failed. Check file type, size and project access; list assets before retrying an uncertain upload.",
        );
      }
    },
  );
}
