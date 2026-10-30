import { Buffer } from "node:buffer";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { upstreamSignal } from "../request-context.js";
import { fail, ok, startProgressHeartbeat } from "./utils.js";

export const PREVIEW_DISPLAY_SIZES = [
  "6.9",
  "6.5",
  "6.3",
  "6.1",
  "duo-inner",
  "duo-outer",
  "13",
  "12.9",
  "11",
  "10.5",
  "play-high",
  "preview",
] as const;

const MAX_PREVIEW_IMAGE_BYTES = 6 * 1024 * 1024;

async function fetchPreviewImage(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    redirect: "error",
    signal: upstreamSignal(30_000),
  });
  if (!response.ok)
    throw new Error(`Could not download the rendered preview (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > MAX_PREVIEW_IMAGE_BYTES)
    throw new Error("Rendered preview image is unexpectedly large");
  return bytes;
}

/**
 * Screenshot-editor tools that close the loop for agents without an editor
 * widget: rendered previews, the font catalog, per-locale screenshot
 * application and layout sync without translation.
 */
export function registerScreenshotExtraTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "preview_screenshots",
    {
      title: "Preview Rendered Screenshots",
      description: "Renders selected screens of a saved screenshot variant as inspection images using the export renderer. Supports one platform, device, size and language per request, including independent phone formats. At most ten screens. Images can be downscaled and are not store-delivery exports. Does not change saved designs.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z
          .string()
          .uuid()
          .optional()
          .describe("Screenshot variant; defaults to the active one."),
        language: z
          .string()
          .optional()
          .describe("Translation language; defaults to the project's source language."),
        device: z.enum(["phone", "tablet", "desktop"]).optional(),
        platform: z
          .enum(["ios", "android"])
          .optional()
          .describe("Store look (device frame, Android size); defaults to the project platform."),
        displaySize: z.enum(PREVIEW_DISPLAY_SIZES).optional(),
        screens: z
          .array(z.number().int().min(0))
          .min(1)
          .max(10)
          .optional()
          .describe("Screen indexes (0-based). Defaults to every screen."),
        maxEdge: z
          .number()
          .int()
          .min(200)
          .max(1600)
          .optional()
          .describe("Longest edge of each returned image in pixels (default 1024)."),
      }),
    },
    async (args, ctx) => {
      const stopHeartbeat = startProgressHeartbeat(
        ctx,
        "Rendering screenshot preview…",
      );
      try {
        const result = await client.previewScreenshots({ ...args, format: "jpeg" });
        const images = await Promise.all(
          result.images.map(async (image) => ({
            ...image,
            data: (await fetchPreviewImage(image.url)).toString("base64"),
          })),
        );
        const summary = {
          projectId: result.projectId,
          variantId: result.variantId,
          language: result.language,
          platform: result.platform,
          device: result.device,
          size: result.size,
          renderedSize: `${result.renderedWidth}x${result.renderedHeight}`,
          screenCount: result.screenCount,
          screens: images.map((image) => image.screenIndex),
          renderMs: result.renderMs,
        };
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Rendered ${images.length} of ${result.screenCount} screens (${result.platform} ${result.device}, ${result.size}, ${result.language}). Images follow in screen order; inspect them before describing the result.`,
                JSON.stringify(summary),
              ].join("\n"),
            },
            ...images.flatMap((image) => [
              {
                type: "text" as const,
                text: `Screen ${image.screenIndex}:`,
              },
              {
                type: "image" as const,
                data: image.data,
                mimeType: image.mimeType,
              },
            ]),
          ],
        };
      } catch (error) {
        return fail(error);
      } finally {
        stopHeartbeat();
      }
    },
  );

  server.registerTool(
    "list_fonts",
    {
      title: "List Fonts",
      description: "Lists built-in, Google and project-uploaded font families with their available weights. Layout validation accepts these exact family names in rich-text font fields. Read-only.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        query: z
          .string()
          .max(100)
          .optional()
          .describe("Case-insensitive substring filter, e.g. 'serif' or 'grotesk'."),
        limit: z.number().int().min(1).max(1000).optional(),
      }),
    },
    async ({ projectId, query, limit }) => {
      try {
        return ok(
          await client.listFonts({ projectId, query, limit }),
          "Font families available to layouts",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "apply_locale_screenshots",
    {
      title: "Apply Per-Language Screenshots",
      description: "Assigns language-specific screenshot assets to existing translated device frames. Sources are locale folders, per-language paths or a shared path list. Assignment follows document order; unfilled frames retain their images and excess sources are reported. Preview mode returns assignments without saving. Apply mode replaces only the targeted translation images.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z.string().uuid().describe("Screenshot variant to update."),
        languages: z
          .array(z.string())
          .max(51)
          .optional()
          .describe("Translations to update; defaults to every language the source covers."),
        deviceType: z.enum(["mobile", "tablet", "desktop"]).default("mobile"),
        platform: z.enum(["ios", "android", "both"]).default("both"),
        localeFolders: z.record(z.string(), z.string().uuid()).optional(),
        screenshotPathsByLanguage: z
          .record(z.string(), z.array(z.string()).max(500))
          .optional(),
        screenshotPaths: z.array(z.string()).min(1).max(50).optional(),
        preview: z
          .boolean()
          .optional()
          .describe("Return the frame assignments without saving."),
      }),
    },
    async (args) => {
      try {
        const sources = [
          args.localeFolders,
          args.screenshotPathsByLanguage,
          args.screenshotPaths,
        ].filter(Boolean).length;
        if (sources !== 1)
          throw new Error(
            "Provide exactly one of localeFolders, screenshotPathsByLanguage or screenshotPaths",
          );
        const result = await client.bulkApplyScreenshots({
          projectId: args.projectId,
          targets: [
            {
              variantId: args.variantId,
              ...(args.languages?.length ? { languages: args.languages } : {}),
            },
          ],
          deviceType: args.deviceType,
          platform: args.platform,
          ...(args.localeFolders ? { localeFolders: args.localeFolders } : {}),
          ...(args.screenshotPathsByLanguage
            ? { screenshotPathsByLanguage: args.screenshotPathsByLanguage }
            : {}),
          ...(args.screenshotPaths
            ? { screenshotPaths: args.screenshotPaths }
            : {}),
          preview: Boolean(args.preview),
        });
        if (args.preview) {
          // Signed preview layouts are large; summarize the assignments.
          const previews = (result.previews ?? []).map(
            (item: {
              language: string;
              assignments?: Record<string, string | null>;
              assets?: Array<{ path: string }>;
            }) => ({
              language: item.language,
              images: (item.assets ?? []).map((asset) => asset.path),
              frameAssignments: item.assignments ?? {},
            }),
          );
          return ok(
            { previews },
            previews.length
              ? "Preview of per-language frame assignments (nothing saved)"
              : "No translation matched these languages and source",
          );
        }
        return ok(
          result,
          `Updated ${result.translationsUpdated ?? 0} translations. Check them with preview_screenshots.`,
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "sync_layout",
    {
      title: "Sync Layout to Translations",
      description: "Copies a screenshot variant's source-language design to its other languages while retaining translated text and language-specific screenshots. Existing language-specific design tweaks are replaced. Optional missing-image fill and changed-text translation are supported.",
      inputSchema: z.object({
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        fillMissingImages: z.boolean().optional(),
        translateChangedText: z.boolean().optional(),
      }),
    },
    async (args, ctx) => {
      const stopHeartbeat = startProgressHeartbeat(
        ctx,
        "Syncing the layout to every translation…",
      );
      try {
        return ok(
          await client.syncLayoutTranslations(args),
          "Synced the source layout to the other languages",
        );
      } catch (error) {
        return fail(error);
      } finally {
        stopHeartbeat();
      }
    },
  );
}
