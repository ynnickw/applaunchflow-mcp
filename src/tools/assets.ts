import { promises as fs } from "fs";
import path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";

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
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const filename =
      source.filename || source.url.split("/").pop() || "upload.png";
    return [
      {
        buffer: Buffer.from(arrayBuffer),
        filename,
        contentType:
          response.headers.get("content-type") || inferMimeType(filename),
      },
    ];
  }

  const filename = source.filename || "upload.png";
  const normalizedBase64 = source.base64!.replace(/^data:[^;]+;base64,/, "");
  return [
    {
      buffer: Buffer.from(normalizedBase64, "base64"),
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
        "Upload screenshot images from local paths, URLs, or base64 for screenshot generation workflows.",
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
        "Upload an image asset (panorama background, illustration, logo, or background image) from a local path. " +
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
