import { Buffer } from "node:buffer";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { listPublicTemplateIds } from "../catalog.js";
import { buildTemplateGalleryUrl } from "../template-previews.js";
import { openUrl, fail, ok, startProgressHeartbeat } from "./utils.js";
import { upstreamSignal } from "../request-context.js";
import {
  createScreenshotPickerResult,
  SCREENSHOT_PICKER_URI,
} from "../ui/screenshot-picker.js";
import { pickerToolMeta } from "../ui/picker-resource.js";

export function registerScreenshotTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "prepare_screenshot_styles",
    {
      title: "Prepare Personalized Screenshot Styles",
      description:
        "Generate or reuse the project's personalized screenshot-style catalog before the user chooses a style. " +
        "This prepares every screenshot template for phone, tablet, and desktop in one AI call and returns a catalogKey. " +
        "This tool itself displays the interactive picker in MCP Apps-compatible clients; do not call another tool after it. " +
        "The picker shows real v1/v2 renders and creates a variant only after the user explicitly confirms a style. " +
        "Repeating this with the same app context and screenshot paths is a cache hit and does not regenerate AI content. " +
        "Clients without UI support receive the exact full-gallery URL.",
      inputSchema: {
        generationId: z.string().uuid().describe("Project/generation UUID."),
        selectedScreenshotPaths: z
          .array(z.string().min(1))
          .min(3)
          .max(7)
          .refine((paths) => new Set(paths).size === paths.length, {
            message: "Screenshot paths must be unique",
          })
          .describe(
            "3-7 unique project-relative paths from list_source_screenshots, in the desired story order.",
          ),
        deviceType: z
          .enum(["phone", "tablet", "desktop"])
          .optional()
          .describe(
            "Initial preview device. All three device layouts are prepared regardless. Defaults to phone.",
          ),
      },
      _meta: pickerToolMeta(SCREENSHOT_PICKER_URI),
    },
    async (
      { generationId, selectedScreenshotPaths, deviceType = "phone" },
      extra,
    ) => {
      const stopHeartbeat = startProgressHeartbeat(
        extra,
        "Preparing personalized screenshot styles for every template…",
      );
      try {
        const result = await client.generateLayouts({
          generationId,
          selectedScreenshotPaths,
          deviceType,
          previewAllTemplates: true,
        });
        const templateIds = listPublicTemplateIds(result.templatePayloads);
        if (!result.catalogKey || templateIds.length === 0) {
          throw new Error(
            "The screenshot catalog response did not include a cache key and templates",
          );
        }
        const galleryUrl = buildTemplateGalleryUrl(client.credentials.baseUrl, {
          deviceType,
          templateIds,
          generationId,
          catalogKey: result.catalogKey,
          applySelection: true,
        });
        const opened = await openUrl(
          server,
          galleryUrl,
          "Choose a personalized screenshot style. Compare v1 and v2, then create the new variant in the editor.",
          { signal: extra.signal },
        );
        const pickerResult = await createScreenshotPickerResult(client, {
          generationId,
          catalogKey: result.catalogKey,
          deviceType,
        });
        return {
          ...pickerResult,
          content: pickerResult.content,
          structuredContent: {
            success: true,
            data: {
              ...pickerResult.structuredContent.data,
              cacheHit: result.cacheHit === true,
              devices: ["phone", "tablet", "desktop"],
              selectedScreenshotPaths,
              browserOpened: opened,
            },
            message: result.cacheHit
              ? "Reused personalized screenshot styles; picker ready"
              : "Prepared personalized screenshot styles; picker ready",
          },
        };
      } catch (error) {
        return fail(error);
      } finally {
        stopHeartbeat();
      }
    },
  );

  server.registerTool(
    "apply_screenshot_style",
    {
      _meta: { ui: { visibility: ["model", "app"] }, "openai/widgetAccessible": true },
      title: "Apply Personalized Screenshot Style",
      description:
        "Create a new screenshot variant from a previously prepared personalized style catalog without another AI generation. " +
        "Fallback for applying a template id supplied directly in chat or by an API client. The normal prepare_screenshot_styles flow now lets the user compare v1/v2 and create the variant directly in the browser. The new variant includes phone, tablet, and desktop layouts and opens in the editor.",
      inputSchema: {
        generationId: z.string().uuid(),
        catalogKey: z.string().min(1).max(128),
        templateId: z.string().min(1),
        deviceType: z
          .enum(["phone", "tablet", "desktop"])
          .optional()
          .describe("Device to show first in the editor. Defaults to phone."),
        paletteMode: z
          .enum(["v1", "v2"])
          .optional()
          .describe(
            "Color palette variant. v1 is the original palette; v2 uses stronger color separation. Defaults to v1.",
          ),
      },
    },
    async (
      {
        generationId,
        catalogKey,
        templateId,
        deviceType = "phone",
        paletteMode = "v1",
      },
      extra,
    ) => {
      try {
        const result = await client.applyScreenshotTemplate({
          generationId,
          catalogKey,
          templateId,
          paletteMode,
        });
        const editorParams = new URLSearchParams({
          projectId: generationId,
          device: deviceType,
          variantId: result.variantId,
        });
        if (result.detectedLanguage) {
          editorParams.set("language", result.detectedLanguage);
        }
        const editorUrl = `${client.credentials.baseUrl}/editor?${editorParams.toString()}`;
        await openUrl(
          server,
          editorUrl,
          "Opening the selected personalized screenshot style in the editor.",
          { signal: extra.signal },
        );
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Applied screenshot style ${templateId} without another AI generation.`,
                `Editor URL: ${editorUrl}`,
                "IMPORTANT: Paste this exact editor URL in the reply so the user can open it.",
              ].join("\n"),
            },
          ],
          structuredContent: {
            success: true,
            data: {
              generationId,
              variantId: result.variantId,
              templateId,
              editorUrl,
            },
            message: "Applied personalized screenshot style",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "list_source_screenshots",
    {
      title: "List Template Source Screenshots",
      description:
        "List all real source screenshots available to screenshot and social-graphics style generation, including project-relative path, signed preview URL, platform, and phone/tablet/desktop device type. No sample fallback is added. Use the returned paths to choose 3-7 inputs for prepare_screenshot_styles or prepare_social_graphics_styles.",
      inputSchema: {
        projectId: z.string().uuid(),
      },
    },
    async ({ projectId }) => {
      try {
        const result = await client.listProjectScreenshots(projectId);
        const screenshots = result.paths.map((path, index) => ({
          path,
          signedUrl: result.screenshotUrls[index],
          platform: result.platforms[index],
          deviceType: result.deviceTypes[index],
        }));
        return ok(
          {
            projectId,
            defaultPlatform: result.defaultPlatform,
            screenshots,
          },
          `Listed ${screenshots.length} template source screenshots`,
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "list_screenshots",
    {
      title: "List Screenshots",
      description: "List uploaded screenshot paths for a project",
      inputSchema: {
        projectId: z.string().uuid(),
        deviceType: z.enum(["mobile", "tablet", "desktop"]).optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ projectId, deviceType, platform }) => {
      try {
        return ok(
          await client.listScreenshots({ projectId, deviceType, platform }),
          "Listed screenshots",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "view_screenshot",
    {
      title: "View Screenshot",
      description:
        "Fetch a screenshot image and return it for visual analysis. " +
        "Use this to inspect screenshots — extract colors, read UI text, understand layout context, or identify visual elements. " +
        "Pass projectId and the relative path from list_screenshots or get_layout (e.g. 'mobile/ios/1234-image.PNG').",
      inputSchema: {
        projectId: z.string().uuid().describe("The project UUID."),
        path: z
          .string()
          .describe("Relative screenshot path (e.g. 'mobile/ios/1234-IMG.PNG') from list_screenshots or the layout's screenshot.path field."),
      },
    },
    async ({ projectId, path }) => {
      try {
        const fullPath = `${projectId}/${path}`;
        const previewUrl = `${client.credentials.baseUrl}/api/preview?path=${encodeURIComponent(fullPath)}&w=320`;

        const headers = new Headers();
        headers.set("Authorization", `Bearer ${client.credentials.token}`);

        const response = await fetch(previewUrl, {
          headers,
          signal: upstreamSignal(30_000),
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const mimeType = response.headers.get("content-type") || "image/png";
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        return {
          content: [
            {
              type: "image" as const,
              data: base64,
              mimeType,
            },
          ],
          structuredContent: {
            success: true,
            data: {
              projectId,
              path,
              mimeType,
              renderedAsImageContent: true,
            },
            message: "Fetched screenshot image",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );
}
