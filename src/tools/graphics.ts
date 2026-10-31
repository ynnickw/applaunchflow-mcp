import { McpServer } from "@modelcontextprotocol/server";
import { RESULT_REVIEW_GUIDANCE } from "../result-review-guidance.js";
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
import {
  graphicsResultMetadata,
  LAYOUT_RESULT_URI,
} from "../ui/layout-result.js";
import { transformOperationSchema } from "./layouts.js";

/** Inline previews returned as image content by render_graphics. */
const MAX_INLINE_PREVIEWS = 6;

const graphicsLanguageSchema = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .regex(
    /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/,
    "Use a language code such as de or pt-BR",
  )
  .optional()
  .describe(
    "Graphics language (e.g. de, pt-BR). Omit for the source language. Use list_graphics_translations for the saved languages and translate_graphics to add one.",
  );

type SocialTemplateCatalogPayload = {
  templates: Array<{
    id: string;
    name: string;
    description?: string | null;
    previewUrls: Record<SocialFormat, string>;
    previewResourceUris: Record<SocialFormat, string>;
    formats?: Array<{
      id: SocialFormat;
      label: string;
      width: number;
      height: number;
      ratioLabel?: string;
      groups?: string[];
      opaqueExport?: "png" | "jpeg";
      nativeExportOnly?: boolean;
      maxFileSizeKb?: number;
    }>;
  }>;
};

function buildGraphicsEditorUrl(
  client: AppLaunchFlowClient,
  args: {
    generationId: string;
    variantId?: string;
    format?: SocialFormat;
    language?: string;
  },
): string {
  const params = new URLSearchParams({ projectId: args.generationId });
  if (args.variantId) {
    params.set("variantId", args.variantId);
  }
  if (args.format) {
    params.set("format", args.format);
  }
  if (args.language) {
    params.set("language", args.language);
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
        "Generates or reuses personalized layout candidates across supported social, store-creative and ad formats. Returns a catalogKey, templateIds and galleryUrl for cached picker display. Matching app context and screenshot paths reuse cached candidates. Preparation does not create a variant or open a picker.",
      inputSchema: z
        .object({
          generationId: z.string().uuid(),
          selectedScreenshotPaths: z
            .array(z.string().min(1))
            .min(1)
            .max(7)
            .refine((paths) => new Set(paths).size === paths.length, {
              message: "Screenshot paths must be unique",
            })
            .describe(
              "1-7 unique project-relative paths for app_store_header; 3-7 for other formats. Use paths from list_source_screenshots, in story order.",
            ),
          primaryFormat: z
            .enum(SOCIAL_FORMATS)
            .optional()
            .describe("Format to preview first. Defaults to og."),
        })
        .refine(
          (args) =>
            args.selectedScreenshotPaths.length >=
            (args.primaryFormat === "app_store_header" ? 1 : 3),
          {
            message:
              "Select at least 3 screenshots, or at least 1 for app_store_header.",
            path: ["selectedScreenshotPaths"],
          },
        ),
    },
    async (
      { generationId, selectedScreenshotPaths, primaryFormat = "og" },
      ctx,
    ) => {
      const stopHeartbeat = startProgressHeartbeat(
        ctx,
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
        return ok(
          {
            generationId,
            catalogKey: result.catalogKey,
            primaryFormat,
            templateIds,
            galleryUrl,
            displayTool: "browse_social_templates",
            cacheHit: result.cacheHit === true,
            formats: [...SOCIAL_FORMATS],
            selectedScreenshotPaths,
          },
          result.cacheHit
            ? "Reused personalized social graphics catalog"
            : "Prepared personalized social graphics catalog",
        );
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
        "Creates a new social-graphics variant from a prepared catalog and selected style. Includes all supported formats, reuses cached layouts without another generation and returns the graphics editor link.",
      inputSchema: z.object({
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
      }),
    },
    async (
      {
        generationId,
        catalogKey,
        templateId,
        primaryFormat = "og",
        paletteMode = "v1",
      },
      ctx,
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
          { signal: ctx.mcpReq.signal },
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
        "Displays the cached social-style picker and returns its gallery URL and format specifications. A project plus prepared catalogKey enables personalized V1/V2 previews; without a catalog it provides static discovery. This read never generates options, applies a style or creates a variant.",
      inputSchema: z.object({
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
      }),
      _meta: pickerToolMeta(SOCIAL_GRAPHICS_PICKER_URI),
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
      ctx,
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

        const templateSummaries = payload.templates
          .filter(
            (template) =>
              filteredTemplateIds.length === 0 ||
              filteredTemplateIds.includes(template.id),
          )
          .map((template) => ({
            id: template.id,
            name: template.name,
            ...(template.description
              ? { description: template.description }
              : {}),
          }));
        const formats = (payload.templates[0]?.formats ?? []).map(
          (definition) => ({
            id: definition.id,
            label: definition.label,
            width: definition.width,
            height: definition.height,
            groups: definition.groups ?? [],
            ...(definition.opaqueExport
              ? { opaqueExport: definition.opaqueExport }
              : {}),
            ...(definition.maxFileSizeKb
              ? { maxFileSizeKb: definition.maxFileSizeKb }
              : {}),
          }),
        );

        const pickerResult =
          generationId && catalogKey
            ? await createSocialGraphicsPickerResult(client, {
                generationId,
                catalogKey,
                primaryFormat: format,
                templateIds: filteredTemplateIds,
                selectedTemplateId,
                title,
              })
            : undefined;
        const opened = await openUrl(
          server,
          galleryUrl,
          generationId && catalogKey
            ? "Choose a personalized social-graphics style, then create the new variant in the editor."
            : "Browse social-graphics styles in AppLaunchFlow.",
          { signal: ctx.mcpReq.signal },
        );
        return {
          _meta: pickerResult?._meta || {
            socialGraphicsPicker: { mode: "discovery", galleryUrl },
          },
          content: [
            {
              type: "text" as const,
              text: [
                opened
                  ? "Opened the social template gallery in the browser."
                  : pickerResult
                    ? "Choose a social graphics style in the picker."
                    : "Browse social graphics styles in the gallery.",
                `Social template gallery URL: ${galleryUrl}`,
                generationId && catalogKey
                  ? "The gallery shows the personalized renders. Confirming a style creates the variant across all supported formats and opens the graphics editor directly."
                  : "Static discovery mode copies the chosen template id.",
                `Templates: ${templateSummaries.map((t) => `${t.id} (${t.name})`).join(", ")}`,
                `Formats (id WxH, export): ${formats
                  .map(
                    (f) =>
                      `${f.id} ${f.width}x${f.height}${f.opaqueExport ? ` ${f.opaqueExport.toUpperCase()} only, no alpha` : ""}${f.maxFileSizeKb ? ` <=${f.maxFileSizeKb}KB` : ""}`,
                  )
                  .join("; ")}`,
              ].join("\n"),
            },
          ],
          structuredContent: {
            success: true,
            data: {
              galleryUrl,
              userFacingUrl: galleryUrl,
              format,
              templateIds:
                pickerResult?.structuredContent.data.templateIds ??
                filteredTemplateIds,
              templates: templateSummaries,
              formats,
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
    language?: string;
    format: SocialFormat;
  }) =>
    [
      args.generationId,
      args.variantId || "active",
      args.language || "source",
      args.format,
    ].join("::");

  server.registerTool(
    "get_graphics",
    {
      title: "Get Social Graphics",
      description:
        "Returns saved social-graphics layouts and variant metadata for one language, including primary format and available languages. Unsaved derived formats are absent. Read-only.",
      inputSchema: z.object({
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        language: graphicsLanguageSchema,
      }),
    },
    async ({ generationId, variantId, language }) => {
      try {
        const result = await client.getGraphics(
          generationId,
          variantId,
          language,
        );
        const editorUrl = buildGraphicsEditorUrl(client, {
          generationId,
          variantId,
          language,
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
        "Returns one social or store-creative format layout, canvas dimensions and a same-target editing read receipt. An unsaved format is derived from the primary format and marked derived:true without persisting it. Includes App Store headers/search creatives and other supported formats. Read-only.",
      inputSchema: z.object({
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        language: graphicsLanguageSchema,
        format: z.enum(SOCIAL_FORMATS),
      }),
    },
    async ({ generationId, variantId, language, format }) => {
      try {
        const result = await client.getGraphicsFormat(
          generationId,
          format,
          variantId,
          language,
        );
        const derived =
          Array.isArray(result?.derivedFormats) &&
          result.derivedFormats.includes(format);
        const editorUrl = buildGraphicsEditorUrl(client, {
          generationId,
          variantId,
          format,
          language,
        });
        const receiptKey = graphicsReceiptKey({
          generationId,
          variantId,
          language,
          format,
        });
        graphicsReadReceipts.add(receiptKey);
        const readReceipt = hostedMcpEnabled()
          ? createHostedReadReceipt(receiptKey, client.credentials.token)
          : undefined;

        // Mirror edit state and receipt in text for hosts that omit structuredContent.
        return ok(
          {
            ...result,
            derived,
            editorUrl,
            readBeforeEditSatisfied: true,
            readReceipt,
          },
          (derived
            ? `${format} was never saved on this variant: this layout was derived from the primary format like the editor does. It is not stored until save_graphics_format saves it. `
            : "Fetched one social graphics format. ") +
            "Pass readReceipt to the matching edit tool; do not display it to the user.",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "save_graphics",
    {
      title: "Save Social Graphics",
      _meta: pickerToolMeta(LAYOUT_RESULT_URI),
      description:
        "Replaces the supplied complete social-graphics layout data for one language. This is a whole-document save rather than a targeted field patch.",
      inputSchema: z.object({
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        language: graphicsLanguageSchema,
        socialTemplateId: z.string().min(1),
        socialPrimaryFormat: z
          .enum(SOCIAL_FORMATS)
          .describe("The variant's default format (persisted)."),
        graphics: z
          .array(
            z.object({
              format: z.enum(SOCIAL_FORMATS),
              layout: z
                .record(z.string(), z.any())
                .describe(
                  "Complete Layout object for this format — the SAME shape screenshot layouts use, with exactly one entry in screens[] and canvasWidth/canvasHeight matching the format. Full field reference: applaunchflow://schema/layout.",
                ),
            }),
          )
          .min(1),
      }),
    },
    async (args) => {
      try {
        const result = await client.saveGraphics(args);
        let metadata;
        let editorUrl = buildGraphicsEditorUrl(client, {
          ...args,
          format: args.socialPrimaryFormat,
        });
        try {
          const saved = await client.getGraphics(
            args.generationId,
            args.variantId,
            args.language,
          );
          editorUrl = buildGraphicsEditorUrl(client, {
            ...args,
            variantId: saved.variantId,
            format: args.socialPrimaryFormat,
          });
          const formats = args.graphics.map((item) => item.format);
          formats.sort(
            (a, b) =>
              Number(b === args.socialPrimaryFormat) -
              Number(a === args.socialPrimaryFormat),
          );
          metadata = graphicsResultMetadata(
            saved,
            args.generationId,
            formats,
            editorUrl,
          );
        } catch {
          /* The save succeeded even if its preview cannot be loaded. */
        }
        return {
          ...ok(
            { ...result, editorUrl },
            metadata
              ? `Saved social graphics. ${RESULT_REVIEW_GUIDANCE}`
              : "Saved social graphics. The preview is unavailable; open the editor without repeating the save.",
          ),
          ...(metadata ? { _meta: metadata } : {}),
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "save_graphics_format",
    {
      title: "Save One Social Graphics Format",
      _meta: pickerToolMeta(LAYOUT_RESULT_URI),
      description:
        "Saves one complete social or store-creative format layout for the specified variant and language. Hosted edits require a fresh same-format read receipt. The layout must contain exactly one screen at the format's authored canvas size. Other formats are preserved.",
      inputSchema: z.object({
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        language: graphicsLanguageSchema,
        format: z.enum(SOCIAL_FORMATS),
        layout: z
          .record(z.string(), z.any())
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
      }),
    },
    async (args) => {
      try {
        const receiptKey = graphicsReceiptKey({
          generationId: args.generationId,
          variantId: args.variantId,
          language: args.language,
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
              "Call get_graphics_format first for this generation/variant/language/format before save_graphics_format. Direct editing is locked until the current same-format state has been read.",
            ),
          );
        }

        const { readReceipt: _readReceipt, ...saveArgs } = args;
        const result = await client.saveGraphicsFormat(saveArgs);
        graphicsReadReceipts.delete(receiptKey);

        const editorUrl = buildGraphicsEditorUrl(client, {
          generationId: args.generationId,
          variantId: result.variantId || args.variantId,
          format: args.format,
          language: args.language,
        });

        let metadata;
        try {
          const saved = await client.getGraphicsFormat(
            args.generationId,
            args.format,
            result.variantId || args.variantId,
            args.language,
          );
          metadata = graphicsResultMetadata(
            saved,
            args.generationId,
            [args.format],
            editorUrl,
          );
        } catch {
          /* Never ask the user to repeat a saved edit for a preview failure. */
        }

        return {
          ...(metadata ? { _meta: metadata } : {}),
          content: [
            {
              type: "text" as const,
              text: [
                `Saved social graphics format ${args.format}.`,
                `Editor URL: ${editorUrl}`,
                metadata
                  ? RESULT_REVIEW_GUIDANCE
                  : "The preview is unavailable; open the editor without repeating the save.",
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

  server.registerTool(
    "translate_graphics",
    {
      title: "Translate Social Graphics",
      description:
        "Creates or refreshes translated social-graphics layouts in the requested languages using text translation. Existing target-language edits can be overwritten. Subject to the account's translation allowances.",
      inputSchema: z.object({
        generationId: z.string().uuid(),
        variantId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Variant to translate. Defaults to the active graphics variant.",
          ),
        targetLanguages: z
          .array(z.string().trim().min(2).max(16))
          .min(1)
          .max(20)
          .describe(
            "Language codes, e.g. ['de','ja','pt-BR']. Unsupported codes are rejected with the list of issues.",
          ),
      }),
    },
    async (args) => {
      try {
        const result = await client.translateGraphics(args);
        return ok(
          {
            ...result,
            editorUrl: buildGraphicsEditorUrl(client, {
              generationId: args.generationId,
              variantId: result?.variantId ?? args.variantId,
            }),
          },
          "Translated social graphics",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "list_graphics_translations",
    {
      title: "List Social Graphics Languages",
      description:
        "Lists source and available translation languages for a social-graphics variant. Read-only.",
      inputSchema: z.object({
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      }),
    },
    async ({ generationId, variantId }) => {
      try {
        return ok(
          await client.listGraphicsTranslations(generationId, variantId),
          "Fetched social graphics languages",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "transform_graphics",
    {
      title: "Transform Social Graphics Formats",
      _meta: pickerToolMeta(LAYOUT_RESULT_URI),
      description:
        "Applies layout operations across the selected social-graphics formats and languages. syncFrom recomposes target formats from the specified source and replaces their current layouts, including custom work. Changes are validated before saving.",
      inputSchema: z
        .object({
          generationId: z.string().uuid(),
          variantId: z.string().uuid().optional(),
          language: graphicsLanguageSchema,
          formats: z
            .array(z.enum(SOCIAL_FORMATS))
            .max(SOCIAL_FORMATS.length)
            .optional()
            .describe(
              "Without syncFrom: formats the operations edit (default: primary format). With syncFrom: formats rebuilt from it (default: all other formats).",
            ),
          operations: z
            .array(transformOperationSchema)
            .max(100)
            .optional()
            .describe("Layout operations; optional when syncFrom is set."),
          syncFrom: z
            .enum(SOCIAL_FORMATS)
            .optional()
            .describe("Source format for 'Sync to all formats'."),
        })
        .refine((args) => args.syncFrom || args.operations?.length, {
          message: "Pass at least one operation, syncFrom, or both.",
          path: ["operations"],
        }),
    },
    async (args) => {
      try {
        const result = await client.transformGraphics({
          ...args,
          operations: args.operations ?? [],
        });
        const updatedFormats: SocialFormat[] = result.updatedFormats ?? [];
        const editorUrl = buildGraphicsEditorUrl(client, {
          generationId: args.generationId,
          variantId: result.variantId ?? args.variantId,
          format: args.syncFrom ?? updatedFormats[0],
          language: args.language,
        });
        const metadata = graphicsResultMetadata(
          {
            variantId: result.variantId,
            language: result.language,
            graphics: (result.graphics ?? []).filter(
              (graphic: { format: SocialFormat }) =>
                updatedFormats.includes(graphic.format),
            ),
          },
          args.generationId,
          updatedFormats,
          editorUrl,
        );
        const { graphics: _graphics, ...summary } = result;
        return {
          ...ok(
            { ...summary, editorUrl },
            `Updated ${updatedFormats.length} social format(s): ${updatedFormats.join(", ")}. ` +
              "Use render_graphics (mode preview) to look at the result. " +
              (metadata ? RESULT_REVIEW_GUIDANCE : ""),
          ),
          ...(metadata ? { _meta: metadata } : {}),
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "update_graphics_settings",
    {
      title: "Update Social Graphics Settings",
      description:
        "Changes variant-wide graphics settings. primaryFormat changes the default format across languages. Platform switching updates device frames/models and single-store badges across saved formats and languages; on a single-platform project it also changes the project platform shared by the screenshot editor.",
      inputSchema: z
        .object({
          generationId: z.string().uuid(),
          variantId: z.string().uuid().optional(),
          primaryFormat: z.enum(SOCIAL_FORMATS).optional(),
          platform: z.enum(["ios", "android"]).optional(),
        })
        .refine((args) => args.primaryFormat || args.platform, {
          message: "Pass primaryFormat, platform, or both.",
          path: ["primaryFormat"],
        }),
    },
    async (args) => {
      try {
        const result = await client.updateGraphicsSettings(args);
        return ok(
          {
            ...result,
            editorUrl: buildGraphicsEditorUrl(client, {
              generationId: args.generationId,
              variantId: result?.variantId ?? args.variantId,
              format: args.primaryFormat,
            }),
          },
          "Updated social graphics settings",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "render_graphics",
    {
      title: "Render Social Graphics",
      description:
        "Renders saved or derived social/store-creative layouts deterministically. Preview mode returns inspection images and does not consume export allowance. Export mode uses export allowance and returns native-size artifacts with required opacity, file type and file-size limits, plus ZIP output where applicable. Download links are short-lived. Does not modify saved layouts.",
      inputSchema: z.object({
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        formats: z
          .array(z.enum(SOCIAL_FORMATS))
          .min(1)
          .max(SOCIAL_FORMATS.length),
        languages: z
          .array(z.string().trim().min(2).max(16))
          .min(1)
          .max(10)
          .optional()
          .describe("Saved graphics languages. Default: the source language."),
        platform: z.enum(["ios", "android"]).optional(),
        mode: z.enum(["preview", "export"]).default("preview"),
      }),
    },
    async ({ mode, ...args }, ctx) => {
      const stopHeartbeat = startProgressHeartbeat(
        ctx,
        mode === "export"
          ? "Rendering social graphics for export…"
          : "Rendering social graphics previews…",
      );
      try {
        const result = await client.renderGraphics(mode, args);
        const rendered: Array<any> = result.graphics ?? [];
        const images: Array<{ type: "image"; data: string; mimeType: string }> =
          [];
        for (const graphic of rendered.slice(0, MAX_INLINE_PREVIEWS)) {
          try {
            const bytes = await client.fetchArtifactBytes(graphic.preview.url);
            images.push({
              type: "image",
              data: bytes.toString("base64"),
              mimeType: "image/jpeg",
            });
          } catch {
            /* The URL below still lets the caller fetch it. */
          }
        }
        const lines = [
          mode === "export"
            ? `Exported ${rendered.length} social graphic(s). Share these exact download URLs (expire ${result.expiresAt}):`
            : `Rendered ${rendered.length} preview(s) (${result.platform}). Inspect the images before describing the result.`,
          ...rendered.map(
            (graphic) =>
              `- ${graphic.language} ${graphic.format} ${graphic.width}x${graphic.height}${graphic.derived ? " (derived, not saved)" : ""}: ` +
              (graphic.file
                ? `${graphic.file.path} ${graphic.file.url}`
                : `preview ${graphic.preview.url}`),
          ),
          ...(result.zip
            ? [`ZIP: ${result.zip.fileName} ${result.zip.url}`]
            : []),
          ...(rendered.length > MAX_INLINE_PREVIEWS
            ? [
                `Only the first ${MAX_INLINE_PREVIEWS} previews are inline; open the other preview URLs if needed.`,
              ]
            : []),
        ];
        return {
          content: [
            { type: "text" as const, text: lines.join("\n") },
            ...images,
          ],
          structuredContent: {
            success: true,
            data: result,
            message:
              mode === "export"
                ? "Exported social graphics"
                : "Rendered social graphics previews",
          },
        };
      } catch (error) {
        return fail(error);
      } finally {
        stopHeartbeat();
      }
    },
  );
}
