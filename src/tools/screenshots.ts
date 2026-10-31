import { Buffer } from "node:buffer";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { listPublicTemplateIds } from "../catalog.js";
import { buildTemplateGalleryUrl } from "../template-previews.js";
import { openUrl, fail, ok, startProgressHeartbeat } from "./utils.js";
import { upstreamSignal } from "../request-context.js";
import { registerScreenshotExtraTools } from "./screenshot-extras.js";
import { registerStockPhotoTools } from "./stock-photos.js";

export function registerScreenshotTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  registerScreenshotExtraTools(server, client);
  registerStockPhotoTools(server, client);
  server.registerTool(
    "prepare_screenshot_styles",
    {
      title: "Prepare Personalized Screenshot Styles",
      description:
        "Generates or reuses personalized screenshot-layout candidates for every phone, tablet and desktop template. Returns a catalogKey, templateIds and galleryUrl for cached V1/V2 picker display. Matching app context and source paths reuse cached candidates. Preparation does not create a variant or open a picker.",
      inputSchema: z.object({
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
      }),
    },
    async (
      { generationId, selectedScreenshotPaths, deviceType = "phone" },
      ctx,
    ) => {
      const stopHeartbeat = startProgressHeartbeat(
        ctx,
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
        return ok(
          {
            generationId,
            catalogKey: result.catalogKey,
            deviceType,
            templateIds,
            galleryUrl,
            displayTool: "browse_templates",
            cacheHit: result.cacheHit === true,
            devices: ["phone", "tablet", "desktop"],
            selectedScreenshotPaths,
          },
          result.cacheHit
            ? "Reused personalized screenshot catalog"
            : "Prepared personalized screenshot catalog",
        );
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
      _meta: {
        ui: { visibility: ["model", "app"] },
        "openai/widgetAccessible": true,
      },
      title: "Apply Personalized Screenshot Style",
      description:
        "Creates a new screenshot variant from a prepared personalized catalog and the specified template/palette selection. Reuses cached candidate layouts without another generation and returns the editor link. Existing variants are preserved.",
      inputSchema: z.object({
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
      }),
    },
    async (
      {
        generationId,
        catalogKey,
        templateId,
        deviceType = "phone",
        paletteMode = "v1",
      },
      ctx,
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
          { signal: ctx.mcpReq.signal },
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
        "Lists real uploaded app screenshots across device types and platforms, with project-relative paths and preview metadata suitable as generation inputs. Does not add sample screenshots. Read-only.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
      }),
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
      description:
        "Lists project-relative screenshot paths for one device type and platform. Empty projects can return sample screenshots explicitly marked isSample. Read-only.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        deviceType: z.enum(["mobile", "tablet", "desktop"]).optional(),
        platform: z.enum(["ios", "android"]).optional(),
      }),
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
        "Returns the image pixels of a project screenshot identified by its project-relative path. Read-only.",
      inputSchema: z.object({
        projectId: z.string().uuid().describe("The project UUID."),
        path: z
          .string()
          .describe(
            "Relative screenshot path (e.g. 'mobile/ios/1234-IMG.PNG') from list_screenshots or the layout's screenshot.path field.",
          ),
      }),
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
