import { promises as fs } from "fs";
import { promises as dns } from "node:dns";
import { BlockList, isIP } from "node:net";
import path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { upstreamSignal } from "../request-context.js";
import { ToolInputError } from "../telemetry.js";
import { fail, ok } from "./utils.js";

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
    throw new Error("Hosted connectors only fetch assets over HTTPS");
  }
  if (url.username || url.password) {
    throw new Error("Asset URLs must not contain embedded credentials");
  }

  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateOrReservedIp(address))
  ) {
    throw new Error("Asset URL resolves to a private or reserved network");
  }
  return url;
}

async function readResponseWithLimit(response: Response): Promise<Buffer> {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_UPLOAD_BYTES) {
    throw new Error("Asset exceeds the 25 MB upload limit");
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
      throw new Error("Asset exceeds the 25 MB upload limit");
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
  for (let redirectCount = 0; redirectCount <= MAX_REMOTE_REDIRECTS; redirectCount += 1) {
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

async function resolveUploadPayload(source: z.infer<typeof uploadSourceSchema>) {
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
      throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (!/^(image|font)\//i.test(contentType)) {
      throw new Error(`Asset URL returned unsupported content type: ${contentType || "unknown"}`);
    }
    const buffer = await readResponseWithLimit(response);
    const filename =
      source.filename || finalUrl.pathname.split("/").pop() || "upload.png";
    return [
      {
        buffer,
        filename,
        contentType:
          contentType || inferMimeType(filename),
      },
    ];
  }

  const filename = source.filename || "upload.png";
  const normalizedBase64 = source.base64!.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(normalizedBase64, "base64");
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Asset exceeds the 25 MB upload limit");
  }
  return [
    {
      buffer,
      filename,
      contentType: inferMimeType(filename),
    },
  ];
}

export function registerAssetTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "upload_screenshots",
    {
      title: "Upload Screenshots",
      description:
        "Upload screenshot images for screenshot generation workflows. Hosted connectors must use HTTPS URLs or base64 data; local file paths are available only to the npm/stdio connector.",
      inputSchema: {
        projectId: z.string().uuid(),
        deviceType: z.enum(["mobile", "tablet", "desktop", "watch"]),
        platform: z.enum(["ios", "android"]),
        sources: z.array(uploadSourceSchema).min(1),
      },
    },
    async ({ projectId, deviceType, platform, sources }) => {
      try {
        const uploads = [];
        for (const source of sources) {
          const payloads = await resolveUploadPayload(source);
          for (const payload of payloads) {
            const signed = await client.createSignedUpload({
              projectId,
              filename: payload.filename,
              contentType: payload.contentType,
              deviceType,
              platform,
            });
            await client.uploadBinary(
              signed.uploadUrl,
              payload.buffer,
              payload.contentType,
            );
            uploads.push({
              filename: signed.filename,
              path: signed.path,
              fullPath: signed.fullPath,
              subfolder: signed.subfolder,
            });
          }
        }
        return ok({ uploads }, "Uploaded assets");
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "list_illustrations",
    {
      title: "List Illustrations",
      description:
        "List available illustrations. Use 'shared' source to browse the shared library (icons, stickers, etc.). " +
        "Use 'project' source to list illustrations uploaded to a specific project. " +
        "When the user wants to add an illustration, list available options FIRST so they can pick one or choose to upload.",
      inputSchema: {
        source: z
          .enum(["shared", "project"])
          .describe("'shared' for the shared library, 'project' for project-uploaded illustrations."),
        projectId: z
          .string()
          .uuid()
          .optional()
          .describe("Required when source is 'project'."),
        category: z
          .string()
          .optional()
          .describe("Filter shared library by category (e.g. 'Icons', 'Sticker', 'Illustrations')."),
        search: z
          .string()
          .optional()
          .describe("Search term to filter by name."),
      },
    },
    async ({ source, projectId, category, search }) => {
      try {
        if (source === "project") {
          if (!projectId) {
            throw new Error("projectId is required when source is 'project'");
          }
          return ok(
            await client.listProjectIllustrations(projectId),
            "Fetched project illustrations",
          );
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
        "Upload an image asset (panorama background, illustration, logo, or background image). Hosted connectors must use an HTTPS URL or base64 data; local paths are available only to the npm/stdio connector. " +
        "Returns the stored path which can then be used in transform_layout operations " +
        "(e.g. set panoramaBackground.imageUrl or illustration imageUrl to the returned path). " +
        "For illustrations: list_illustrations first to show existing options, then upload only if the user wants a custom image. " +
        "For panoramas: ask the user to provide a local image path to upload.",
      inputSchema: {
        projectId: z.string().uuid(),
        fileType: z
          .enum(["illustration", "logo", "panorama", "background"])
          .describe(
            "Type of asset: 'panorama' for panorama backgrounds, 'illustration' for decorative images/stickers, 'logo' for app logo, 'background' for per-screen background images.",
          ),
        source: uploadSourceSchema.describe(
          "The image source — provide a local file path, a URL, or base64 data.",
        ),
      },
    },
    async ({ projectId, fileType, source }) => {
      try {
        const payloads = await resolveUploadPayload(source);
        const payload = payloads[0];
        const signed = await client.createSignedUpload({
          projectId,
          filename: payload.filename,
          contentType: payload.contentType,
          fileType,
        });
        await client.uploadBinary(
          signed.uploadUrl,
          payload.buffer,
          payload.contentType,
        );
        return ok(
          {
            filename: signed.filename,
            path: signed.path,
            fullPath: signed.fullPath,
            subfolder: signed.subfolder,
          },
          `Uploaded ${fileType} asset`,
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
