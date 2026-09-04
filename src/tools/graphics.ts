import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolInputError } from "../telemetry.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { listPublicTemplateIds } from "../catalog.js";
import {
  buildSocialTemplateGalleryUrl,
  decorateSocialTemplatePayload,
  SOCIAL_FORMATS,
  type SocialFormat,
} from "../social-template-previews.js";
import {
  createHostedReadReceipt,
  fail,
  hostedMcpEnabled,
  ok,
  openUrl,
  startProgressHeartbeat,
  verifyHostedReadReceipt,
} from "./utils.js";
import {
  createSocialGraphicsPickerResult,
  SOCIAL_GRAPHICS_PICKER_URI,
} from "../ui/social-graphics-picker.js";
import { pickerToolMeta } from "../ui/picker-resource.js";

type SocialTemplateCatalogPayload = {
  templates: Array<{
    id: string;
    name: string;
    description?: string | null;
    previewUrls: Record<SocialFormat, string>;
    previewResourceUris: Record<SocialFormat, string>;
  }>;
};

function buildGraphicsEditorUrl(
  client: AppLaunchFlowClient,
  args: {
    generationId: string;
    variantId?: string;
    format?: SocialFormat;
  },
): string {
  const params = new URLSearchParams({ projectId: args.generationId });
  if (args.variantId) {
    params.set("variantId", args.variantId);
  }
  if (args.format) {
    params.set("format", args.format);
  }
  return `${client.credentials.baseUrl}/graphics?${params.toString()}`;
}

export function registerGraphicsTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "prepare_social_graphics_styles",
    {
      title: "Prepare Personalized Social Graphics Styles",
      description:
        "Generate or reuse the project's personalized social-graphics style catalog before the user chooses a style. " +
        "This prepares every social template across all supported social, store-listing, and mobile-ad formats in one AI call and returns a catalogKey. " +
        "This tool itself displays the existing dashboard picker inline in Claude, ChatGPT, and other MCP Apps-compatible hosts; do not call another tool after it. " +
        "A variant is created only after the user explicitly confirms a style. Clients without UI support receive the exact gallery URL. " +
        "Repeating the same app context and screenshot paths reuses the cache.",
      inputSchema: {
        generationId: z.string().uuid(),
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
        primaryFormat: z
          .enum(SOCIAL_FORMATS)
          .optional()
          .describe("Format to preview first. Defaults to og."),
      },
      _meta: pickerToolMeta(SOCIAL_GRAPHICS_PICKER_URI),
    },
    async (
      { generationId, selectedScreenshotPaths, primaryFormat = "og" },
      extra,
    ) => {
      const stopHeartbeat = startProgressHeartbeat(
        extra,
        "Preparing personalized social graphics across every format…",
      );
      try {
        const result = await client.generateGraphics({
          generationId,
          selectedScreenshotPaths,
          primaryFormat,
          previewAllTemplates: true,
        });
        const templateIds = listPublicTemplateIds(result.templatePayloads);
        if (!result.catalogKey || templateIds.length === 0) {
          throw new Error(
            "The social graphics catalog response did not include a cache key and templates",
          );
        }
        const galleryUrl = buildSocialTemplateGalleryUrl(
          client.credentials.baseUrl,
          {
            format: primaryFormat,
            templateIds,
            generationId,
            catalogKey: result.catalogKey,
            applySelection: true,
          },
        );
        const opened = await openUrl(
          server,
          galleryUrl,
          "Choose a personalized social-graphics style, then create the new variant in the editor.",
          { signal: extra.signal },
        );
        const pickerResult = await createSocialGraphicsPickerResult(client, {
          generationId,
          catalogKey: result.catalogKey,
          primaryFormat,
        });
        return {
          ...pickerResult,
          content: pickerResult.content,
          structuredContent: {
            success: true,
            data: {
              ...pickerResult.structuredContent.data,
              cacheHit: result.cacheHit === true,
              formats: [...SOCIAL_FORMATS],
              selectedScreenshotPaths,
              browserOpened: opened,
            },
            message: result.cacheHit
              ? "Reused personalized social graphics styles; picker ready"
              : "Prepared personalized social graphics styles; picker ready",
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
    "apply_social_graphics_style",
    {
      title: "Apply Personalized Social Graphics Style",
      description:
        "Create a new social-graphics variant from a previously prepared personalized catalog without another AI generation. " +
        "Use after prepare_social_graphics_styles and browse_social_templates. The new variant contains all supported formats and opens in the graphics editor.",
      inputSchema: {
        generationId: z.string().uuid(),
        catalogKey: z.string().min(1).max(128),
        templateId: z.string().min(1),
        primaryFormat: z
          .enum(SOCIAL_FORMATS)
          .optional()
          .describe("Format to show first in the editor. Defaults to og."),
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
        primaryFormat = "og",
        paletteMode = "v1",
      },
      extra,
    ) => {
      try {
        const result = await client.applyGraphicsTemplate({
          generationId,
          catalogKey,
          templateId,
          primaryFormat,
          paletteMode,
        });
        const editorUrl = buildGraphicsEditorUrl(client, {
          generationId,
          variantId: result.variantId,
          format: primaryFormat,
        });
        await openUrl(
          server,
          editorUrl,
          "Opening the selected personalized social graphics style in the editor.",
          { signal: extra.signal },
        );
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Applied social graphics style ${templateId} across all supported formats without another AI generation.`,
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
              primaryFormat,
              formats: [...SOCIAL_FORMATS],
              editorUrl,
            },
            message: "Applied personalized social graphics style",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "browse_social_templates",
    {
      title: "Browse & Select Social Template",
      description:
        "Open the visual social style gallery. With generationId and catalogKey from prepare_social_graphics_styles it renders personalized previews and creates the selected variant directly; without them it provides static style discovery. Never offer social templates via text or AskUserQuestion.",
      inputSchema: {
        format: z
          .enum(SOCIAL_FORMATS)
          .optional()
          .describe(
            "Which social format the gallery should preview first. Defaults to 'og'.",
          ),
        templateIds: z
          .array(z.string())
          .optional()
          .describe("Optional subset of social template ids to show."),
        selectedTemplateId: z
          .string()
          .optional()
          .describe("Optional template id to highlight in the gallery."),
        title: z
          .string()
          .optional()
          .describe("Optional gallery heading, for example the project name."),
        generationId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Project UUID from prepare_social_graphics_styles. Pass together with catalogKey to show the real personalized previews.",
          ),
        catalogKey: z
          .string()
          .min(1)
          .max(128)
          .optional()
          .describe(
            "Catalog key from prepare_social_graphics_styles. Pass together with generationId.",
          ),
      },
    },
    async (
      {
        format = "og",
        templateIds,
        selectedTemplateId,
        title,
        generationId,
        catalogKey,
      },
      extra,
    ) => {
      try {
        if (Boolean(generationId) !== Boolean(catalogKey)) {
          return fail(
            new Error(
              "generationId and catalogKey must be passed together to open personalized previews.",
            ),
          );
        }
        const payload = decorateSocialTemplatePayload(
          await client.listSocialTemplates(),
          client.credentials.baseUrl,
        ) as SocialTemplateCatalogPayload;
        const availableIds = new Set(payload.templates.map((t) => t.id));
        const filteredTemplateIds =
          templateIds?.filter((id) => availableIds.has(id)) || [];
        const droppedTemplateIds =
          templateIds?.filter((id) => !availableIds.has(id)) || [];

        if (droppedTemplateIds.length > 0) {
          console.error(
            `[browse_social_templates] Ignoring unknown template ids not in the registry: ${droppedTemplateIds.join(", ")}`,
          );
        }

        // Restricting to ids that all turn out to be unknown would fall back to
        // showing every template — misleading for a prepared catalog. Fail
        // loudly so the caller re-prepares instead.
        if (
          templateIds &&
          templateIds.length > 0 &&
          filteredTemplateIds.length === 0
        ) {
          return fail(
            new Error(
              `None of the requested social template ids match the available templates (${droppedTemplateIds.join(", ")}). ` +
                "The prepared catalog and the social template registry may be out of sync — re-run prepare_social_graphics_styles and pass its returned templateIds.",
            ),
          );
        }

        const galleryUrl = buildSocialTemplateGalleryUrl(
          client.credentials.baseUrl,
          {
            format,
            templateIds:
              filteredTemplateIds.length > 0 ? filteredTemplateIds : undefined,
            selectedTemplateId:
              selectedTemplateId && availableIds.has(selectedTemplateId)
                ? selectedTemplateId
                : undefined,
            title,
            generationId,
            catalogKey,
            applySelection: Boolean(generationId && catalogKey),
          },
        );

        const opened = await openUrl(
          server,
          galleryUrl,
          generationId && catalogKey
            ? "Choose a personalized social-graphics style, then create the new variant in the editor."
            : "Browse social-graphics styles in AppLaunchFlow.",
          { signal: extra.signal },
        );

        return {
          content: [
            {
              type: "text" as const,
              text: [
                opened
                  ? "Opened the social template gallery in the browser."
                  : "The client could not open the browser automatically; paste this exact gallery URL into the user-visible reply.",
                `Social template gallery URL: ${galleryUrl}`,
                generationId && catalogKey
                  ? "The gallery shows the personalized renders. Confirming a style creates the variant across all supported formats and opens the graphics editor directly."
                  : "Static discovery mode copies the chosen template id.",
              ].join("\n"),
            },
            {
              type: "resource_link" as const,
              uri: galleryUrl,
              name: "Open Social Template Gallery",
              mimeType: "text/html",
              description:
                "Hosted gallery for browsing social-graphics template previews.",
            },
          ],
          structuredContent: {
            success: true,
            data: {
              galleryUrl,
              userFacingUrl: galleryUrl,
              format,
              templateIds: filteredTemplateIds,
              browserOpened: opened,
              personalized: Boolean(generationId && catalogKey),
            },
            message: "Prepared social template gallery",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  const graphicsReadReceipts = new Set<string>();
  const graphicsReceiptKey = (args: {
    generationId: string;
    variantId?: string;
    format: SocialFormat;
  }) => [args.generationId, args.variantId || "active", args.format].join("::");

  server.registerTool(
    "get_graphics",
    {
      title: "Get Social Graphics",
      description:
        "Fetch the current social graphics layouts (one per format) for overview or metadata inspection. " +
        "For direct edits, use get_graphics_format instead.",
      inputSchema: {
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      },
    },
    async ({ generationId, variantId }) => {
      try {
        const result = await client.getGraphics(generationId, variantId);
        const editorUrl = buildGraphicsEditorUrl(client, {
          generationId,
          variantId,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Fetched social graphics.",
                `Editor URL: ${editorUrl}`,
                "Use get_graphics_format before a direct one-format edit.",
              ].join("\n"),
            },
          ],
          structuredContent: {
            success: true,
            data: { ...result, editorUrl, readBeforeEditSatisfied: false },
            message: "Fetched social graphics",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_graphics_format",
    {
      title: "Get One Social Graphics Format",
      description:
        "Fetch exactly one social graphics layout for a project. " +
        "Use this before direct edits so the next save_graphics_format call works from the current state of that same format. " +
        "If the user did not request a specific format, use the variant's primary format from an earlier get_graphics response or inspect the editor URL. " +
        "The returned layout is the same Layout shape screenshots use — one screen, canvas sized to the format. Read the resource applaunchflow://schema/layout for every node type's fields and valid ranges.",
      inputSchema: {
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        format: z.enum(SOCIAL_FORMATS),
      },
    },
    async ({ generationId, variantId, format }) => {
      try {
        const result = await client.getGraphicsFormat(
          generationId,
          format,
          variantId,
        );
        const editorUrl = buildGraphicsEditorUrl(client, {
          generationId,
          variantId,
          format,
        });
        graphicsReadReceipts.add(
          graphicsReceiptKey({ generationId, variantId, format }),
        );
        const receiptKey = graphicsReceiptKey({
          generationId,
          variantId,
          format,
        });
        const readReceipt = hostedMcpEnabled()
          ? createHostedReadReceipt(receiptKey, client.credentials.token)
          : undefined;

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Fetched social graphics format ${format}.`,
                `Editor URL: ${editorUrl}`,
                "A fresh same-format read receipt was recorded and can be used for one save_graphics_format call.",
              ].join("\n"),
            },
          ],
          structuredContent: {
            success: true,
            data: {
              ...result,
              editorUrl,
              readBeforeEditSatisfied: true,
              readReceipt,
            },
            message: "Fetched one social graphics format",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "save_graphics",
    {
      title: "Save Social Graphics",
      description:
        "Persist a complete social graphics payload (template id, primary format, all per-format layouts). " +
        "Prefer save_graphics_format when editing a single format. Each layout uses the same shape as screenshot layouts; see the resource applaunchflow://schema/layout.",
      inputSchema: {
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        socialTemplateId: z.string().min(1),
        socialPrimaryFormat: z.enum(SOCIAL_FORMATS),
        graphics: z
          .array(
            z.object({
              format: z.enum(SOCIAL_FORMATS),
              layout: z
                .record(z.any())
                .describe(
                  "Complete Layout object for this format — the SAME shape screenshot layouts use, with exactly one entry in screens[] and canvasWidth/canvasHeight matching the format. Full field reference: applaunchflow://schema/layout.",
                ),
            }),
          )
          .min(1),
      },
    },
    async (args) => {
      try {
        return ok(await client.saveGraphics(args), "Saved social graphics");
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "save_graphics_format",
    {
      title: "Save One Social Graphics Format",
      description:
        "Persist exactly one social graphics format after reading the latest same-format layout with get_graphics_format. " +
        "ENFORCED: each call requires a fresh get_graphics_format for the same generationId/variantId/format immediately beforehand. " +
        "Read the current layouts, mutate only the requested format in memory, then save that single layout here.",
      inputSchema: {
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        format: z.enum(SOCIAL_FORMATS),
        layout: z
          .record(z.any())
          .describe(
            "Complete Layout object for this one format — the SAME shape screenshot layouts use, with exactly one entry in screens[] and canvasWidth/canvasHeight matching the format. " +
              "Full field reference: read the resource applaunchflow://schema/layout.",
          ),
        readReceipt: z
          .string()
          .optional()
          .describe(
            "Hosted connector only: pass the readReceipt returned by the immediately preceding get_graphics_format call.",
          ),
      },
    },
    async (args) => {
      try {
        const receiptKey = graphicsReceiptKey({
          generationId: args.generationId,
          variantId: args.variantId,
          format: args.format,
        });

        const hasReceipt = hostedMcpEnabled()
          ? verifyHostedReadReceipt(
              args.readReceipt,
              receiptKey,
              client.credentials.token,
            )
          : graphicsReadReceipts.has(receiptKey);
        if (!hasReceipt) {
          return fail(
            new ToolInputError(
              "READ_BEFORE_EDIT_REQUIRED",
              "Call get_graphics_format first for this generation/variant/format before save_graphics_format. Direct editing is locked until the current same-format state has been read.",
            ),
          );
        }

        const { readReceipt: _readReceipt, ...saveArgs } = args;
        const result = await client.saveGraphicsFormat(saveArgs);
        graphicsReadReceipts.delete(receiptKey);

        const editorUrl = buildGraphicsEditorUrl(client, {
          generationId: args.generationId,
          variantId: args.variantId,
          format: args.format,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Saved social graphics format ${args.format}.`,
                `Editor URL (already open — do NOT run \`open\` again): ${editorUrl}`,
                "This save consumed the current same-format read receipt. Call get_graphics_format again before the next direct edit.",
              ].join("\n"),
            },
          ],
          structuredContent: {
            success: true,
            data: {
              result,
              editorUrl,
              nextEditRequiresFreshRead: true,
            },
            message: "Saved one social graphics format",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );
}
