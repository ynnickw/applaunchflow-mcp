import { McpServer } from "@modelcontextprotocol/server";
import { ToolInputError } from "../telemetry.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import {
  createHostedReadReceipt,
  createReadReceiptStore,
  fail,
  hostedMcpEnabled,
  ok,
  openUrl,
  startProgressHeartbeat,
  verifyHostedReadReceipt,
} from "./utils.js";
import {
  createPromoVideoPickerResult,
  PROMO_VIDEO_PICKER_URI,
} from "../ui/promo-video-picker.js";
import { pickerToolMeta } from "../ui/picker-resource.js";
import { buildPromoVideoDashboardUrl } from "../promo-video-urls.js";

const promoReceiptKey = (
  generationId: string,
  variantId?: string,
  language?: string,
) =>
  [
    "promo-video",
    generationId,
    variantId || "active",
    language || "source",
  ].join("::");

/** Local receipts: the same scope as the hosted key (variant + language). */
const promoReceiptScope = (
  generationId: string,
  variantId?: string,
  language?: string,
) => ({
  generationId,
  variantId: `${variantId || "active"}@${language || "source"}`,
});

const languageField = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .describe(
    "Language code of the promo-video translation (e.g. 'de'). Omit for the source language. get_promo_video lists availableLanguages.",
  );

const PROMO_EXPORT_SIZES = {
  appStore: ["default", "6.9", "6.7", "6.5", "6.3"],
  ipad: ["12.9", "11"],
  social: ["9:16", "1:1", "16:9"],
  creative: ["header", "search"],
} as const;
type PromoExportCategory = keyof typeof PROMO_EXPORT_SIZES;

/** "appStore:6.9" → { category, size }, the video's own preview format. */
export function parsePromoFormat(format: unknown): {
  category: PromoExportCategory;
  size: string;
} {
  if (typeof format === "string") {
    const [category, ...rest] = format.split(":");
    const size = rest.join(":");
    const sizes = PROMO_EXPORT_SIZES[category as PromoExportCategory] as
      | readonly string[]
      | undefined;
    if (sizes?.includes(size)) {
      return { category: category as PromoExportCategory, size };
    }
  }
  return { category: "appStore", size: "default" };
}

/** Same option rules as the editor's export dialog / the export API. */
export function resolvePromoExportOptions(
  args: {
    category?: PromoExportCategory;
    size?: string;
    format?: "mp4" | "webm";
    quality?: "720p" | "1080p";
  },
  previewFormat: unknown,
) {
  const fallback = parsePromoFormat(previewFormat);
  const category = args.category ?? fallback.category;
  const size =
    args.size ??
    (args.category && args.category !== fallback.category
      ? PROMO_EXPORT_SIZES[category][0]
      : fallback.size);
  if (!(PROMO_EXPORT_SIZES[category] as readonly string[]).includes(size)) {
    throw new ToolInputError(
      "INVALID_TOOL_INPUT",
      `size "${size}" is not valid for category "${category}". Use one of: ${PROMO_EXPORT_SIZES[category].join(", ")}.`,
    );
  }
  const creative = category === "creative";
  if (creative && (args.format === "webm" || args.quality === "720p")) {
    throw new ToolInputError(
      "INVALID_TOOL_INPUT",
      "App Store creative exports (header/search) are mp4 at 1080p only: Apple matches them by exact pixel size.",
    );
  }
  return {
    category,
    size,
    format: args.format ?? "mp4",
    quality: args.quality ?? "1080p",
  };
}

export { buildPromoVideoDashboardUrl } from "../promo-video-urls.js";

export function buildPromoVideoCandidateRequest<
  TArgs extends Record<string, unknown>,
>(args: TArgs): TArgs & { candidateCount: 3 } {
  return { ...args, candidateCount: 3 };
}

export function registerPromoVideoTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  const promoVideoReadReceipts = createReadReceiptStore();

  server.registerTool(
    "generate_promo_video",
    {
      title: "Generate Promo Video",
      description:
        "Generates or reuses three transient promo-video scene/config candidates from uploaded screenshots and returns the embedded picker or its URL. Only an explicitly selected candidate becomes a saved variant. Optional replaceVariantId enables replacement after the new selection saves; selectedScreenshotPaths restricts candidate inputs.",
      inputSchema: z.object({
        projectId: z.string().uuid().describe("Project / generation UUID."),
        message: z
          .string()
          .optional()
          .describe(
            "Optional creative direction applied to all three candidates.",
          ),
        replaceVariantId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Existing promo-video variant to replace after the user chooses a candidate. Only pass with explicit user approval.",
          ),
        selectedScreenshotPaths: z
          .array(z.string().min(1))
          .min(1)
          .max(10)
          .optional()
          .describe(
            "Optional project-relative screenshot paths (1–10) from list_source_screenshots, in story order. They must match deviceType (phone → mobile/…, tablet → tablet/…, desktop → desktop/…).",
          ),
        deviceType: z
          .enum(["phone", "tablet", "desktop"])
          .optional()
          .describe(
            "Device the video shows: phone (default; iPhone or Pixel by platform), tablet (iPad Pro, iPad App Store formats) or desktop (MacBook, 16:9). Uses that device's uploaded screenshots.",
          ),
        selectedScreenshotIndices: z
          .array(z.number().int().min(0))
          .min(1)
          .max(10)
          .optional()
          .describe(
            "Legacy screenshot positions. Prefer selectedScreenshotPaths.",
          ),
      }),
      _meta: pickerToolMeta(PROMO_VIDEO_PICKER_URI),
    },
    async (args, ctx) => {
      try {
        const result = await client.generatePromoVideo(
          buildPromoVideoCandidateRequest(args),
        );
        if (!result?.candidateKey || result?.candidates?.length !== 3) {
          throw new Error(
            "Promo video generation did not return a reusable three-option picker",
          );
        }
        const pickerUrl = buildPromoVideoDashboardUrl(client, {
          generationId: args.projectId,
          candidateKey: result.candidateKey,
          replaceVariantId: args.replaceVariantId,
        });

        await openUrl(
          server,
          pickerUrl,
          "Compare three personalized promo-video candidates and choose which one to create.",
          { signal: ctx.mcpReq.signal },
        );

        const pickerResult = await createPromoVideoPickerResult(client, {
          projectId: args.projectId,
          candidateKey: result.candidateKey,
          replaceVariantId: args.replaceVariantId,
        });

        return {
          ...pickerResult,
          content: pickerResult.content,
          structuredContent: {
            success: true,
            data: {
              ...pickerResult.structuredContent.data,
              editorUrl: pickerUrl,
            },
            message: "Prepared promo video candidates; picker ready",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_promo_video",
    {
      title: "Get Promo Video",
      description:
        "Returns a saved promo-video configuration, source/available languages and a same-target editing read receipt. Transition names are normalized to content-motion semantics. Reading a translation does not change it.",
      inputSchema: z.object({
        generationId: z.string().uuid().describe("Project / generation UUID."),
        variantId: z.string().uuid().optional(),
        language: languageField.optional(),
      }),
    },
    async ({ generationId, variantId, language }) => {
      try {
        const result = await client.getPromoVideo(
          generationId,
          variantId,
          language,
        );
        const editorUrl = buildPromoVideoDashboardUrl(client, {
          generationId,
          variantId,
        });
        promoVideoReadReceipts.record(
          promoReceiptScope(generationId, variantId, language),
        );
        const readReceipt = hostedMcpEnabled()
          ? createHostedReadReceipt(
              promoReceiptKey(generationId, variantId, language),
              client.credentials.token,
            )
          : undefined;
        const { project, ...rest } = result ?? {};
        const config = project?.remotion_code ?? rest.config ?? null;
        // Mirror edit state and receipt in text for hosts that omit structuredContent.
        return ok(
          {
            ...rest,
            config,
            project: project
              ? {
                  ...project,
                  remotion_code: undefined,
                  configField: "config",
                }
              : null,
            editorUrl,
            readBeforeEditSatisfied: true,
            readReceipt,
          },
          config
            ? "Fetched promo video. Edit `config` and pass it with readReceipt to update_promo_video; do not display the receipt to the user."
            : "No promo video saved for this variant/language yet. Use generate_promo_video (or translate_promo_video for a new language).",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "update_promo_video",
    {
      title: "Update Promo Video",
      description:
        "Replaces a complete saved promo-video configuration for one variant/language. Hosted edits require a fresh same-target read receipt. Renderer-schema errors reject the entire update; missing editor defaults and derived values are reported. Device-model changes update the frame; music changes reset track start without re-cutting scenes. appName changes fallback copy; projectName renames the project.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        language: languageField.optional(),
        config: z
          .record(z.string(), z.any())
          .describe(
            "Full Remotion VideoConfig: the `config` from get_promo_video, mutated. " +
              "theme (colors + typography) and scenes (≥1 visible; discriminated on `type`: hook | feature | text-only | closeup | multi-phone | cta, each with its `content` shape). " +
              "Any scene may set `hidden: true` (kept and editable, excluded from playback/export/duration). " +
              'Coordinates are percentages of the frame (0-100), never pixels. Keep `transitionNaming: "content-motion"`.',
          ),
        appName: z
          .string()
          .optional()
          .describe(
            "App name shown by hook/CTA scenes that leave appName null.",
          ),
        projectName: z
          .string()
          .optional()
          .describe(
            "Renames the whole project (all content types). Omit unless asked.",
          ),
        readReceipt: z
          .string()
          .optional()
          .describe(
            "Hosted connector only: pass the readReceipt returned by the immediately preceding get_promo_video call.",
          ),
      }),
    },
    async (args) => {
      try {
        const receiptScope = promoReceiptScope(
          args.projectId,
          args.variantId,
          args.language,
        );

        const hasReceipt = hostedMcpEnabled()
          ? verifyHostedReadReceipt(
              args.readReceipt,
              promoReceiptKey(args.projectId, args.variantId, args.language),
              client.credentials.token,
            )
          : promoVideoReadReceipts.has(receiptScope);
        if (!hasReceipt) {
          return fail(
            new ToolInputError(
              "READ_BEFORE_EDIT_REQUIRED",
              "Call get_promo_video first for this project/variant/language before update_promo_video. Direct editing is locked until the current state has been read.",
            ),
          );
        }

        const { readReceipt: _readReceipt, ...updateArgs } = args;
        const result = await client.updatePromoVideo(updateArgs);
        promoVideoReadReceipts.consume(receiptScope);

        const editorUrl = buildPromoVideoDashboardUrl(client, {
          generationId: args.projectId,
          variantId: args.variantId,
        });
        const filled: string[] = result?.filledDefaults ?? [];
        const derived: string[] = result?.derived ?? [];
        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Updated promo video.",
                `Editor URL (already open — do NOT run \`open\` again): ${editorUrl}`,
                ...(filled.length
                  ? [`Filled editor defaults: ${filled.join(", ")}`]
                  : []),
                ...(derived.length ? [`Derived: ${derived.join(", ")}`] : []),
                "Use preview_promo_video to look at the result. This update consumed the current read receipt. Call get_promo_video again before the next direct edit.",
              ].join("\n"),
            },
          ],
          structuredContent: {
            success: true,
            data: {
              durationInFrames: result?.durationInFrames,
              filledDefaults: filled,
              derived,
              editorUrl,
              nextEditRequiresFreshRead: true,
            },
            message: "Updated promo video",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "clear_promo_video",
    {
      title: "Clear Promo Video",
      description:
        "Clears the specified promo-video variant's saved configuration. This removes its current video content rather than creating a new variant.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      }),
    },
    async (args) => {
      try {
        return ok(await client.clearPromoVideo(args), "Cleared promo video");
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "translate_promo_video",
    {
      title: "Translate Promo Video",
      description:
        "Translates saved promo-video scene text into requested languages. Re-translating an existing language replaces its edited translation. Returns per-language results and available languages; subject to translation allowances.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z
          .string()
          .uuid()
          .optional()
          .describe("Promo-video variant; defaults to the active one."),
        targetLanguages: z
          .array(z.string().trim().min(2).max(16))
          .min(1)
          .describe(
            "Language codes, e.g. ['de', 'ja']. Use el for Greek, he for Hebrew, fil for Filipino.",
          ),
      }),
    },
    async ({ projectId, variantId, targetLanguages }, ctx) => {
      const stopHeartbeat = startProgressHeartbeat(
        ctx,
        "Translating promo video",
      );
      try {
        const result = await client.translatePromoVideo({
          generationId: projectId,
          variantId,
          targetLanguages,
        });
        const failed = (result?.results ?? []).filter(
          (item: { success?: boolean }) => !item.success,
        );
        return ok(
          result,
          failed.length
            ? `Translated with ${failed.length} failure(s); see results.`
            : "Translated promo video",
        );
      } catch (error) {
        return fail(error);
      } finally {
        stopHeartbeat();
      }
    },
  );

  server.registerTool(
    "preview_promo_video",
    {
      title: "Preview Promo Video",
      description:
        "Renders one frame of a saved promo video as PNG for inspection. Selection supports a visible scene index plus relative position, or an absolute 30-fps frame. Defaults to the video's preview format. Unsaved changes are not included. Does not consume export allowance or modify the design.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        language: languageField.optional(),
        sceneIndex: z.number().int().min(0).max(99).optional(),
        at: z.number().min(0).max(1).optional(),
        frame: z.number().int().min(0).optional(),
        format: z
          .string()
          .optional()
          .describe(
            "category:size — appStore:{default,6.9,6.7,6.5,6.3}, ipad:{12.9,11}, social:{9:16,1:1,16:9}, creative:{header,search}.",
          ),
        scale: z
          .number()
          .min(0.1)
          .max(1)
          .optional()
          .describe("Output size relative to the full format (default 0.5)."),
      }),
    },
    async (args, ctx) => {
      const stopHeartbeat = startProgressHeartbeat(
        ctx,
        "Rendering promo video frame",
      );
      try {
        const { png, mimeType, ...meta } = await client.previewPromoVideo(args);
        if (
          mimeType !== "image/png" ||
          !png ||
          png.length > 8_000_000 ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(png)
        ) {
          throw new Error("The preview render returned no valid PNG.");
        }
        // Image-first result (no competing JSON envelope); facts as text.
        return {
          content: [
            { type: "image" as const, data: png, mimeType: "image/png" },
            {
              type: "text" as const,
              text: `Promo video frame ${meta.frame} (${Number(meta.timeSeconds).toFixed(2)} s of ${(Number(meta.durationInFrames) / Number(meta.fps || 30)).toFixed(2)} s), scene ${meta.sceneIndex} (${meta.sceneType}), format ${meta.format}, ${meta.width}×${meta.height}, language ${meta.language}.`,
            },
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
    "export_promo_video",
    {
      title: "Export Promo Video",
      description:
        "Starts an MP4/WebM export of a saved promo-video variant and language. Supports configured App Store, iPad, social and creative placements within renderer limits. Server duration must be under thirty seconds. An accepted job uses one API export allowance and returns exportId. The same idempotencyKey identifies the same request across retries.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        language: languageField.optional(),
        category: z.enum(["appStore", "ipad", "social", "creative"]).optional(),
        size: z.string().optional(),
        format: z.enum(["mp4", "webm"]).optional(),
        quality: z.enum(["720p", "1080p"]).optional(),
        idempotencyKey: z
          .string()
          .min(8)
          .max(128)
          .describe("Unique per intended export; reuse on retries."),
      }),
    },
    async ({ projectId, variantId, language, idempotencyKey, ...choice }) => {
      try {
        let previewFormat: unknown;
        if (!choice.category || !choice.size) {
          const saved = await client.getPromoVideo(
            projectId,
            variantId,
            language,
          );
          previewFormat = saved?.project?.remotion_code?.previewFormat;
        }
        const options = resolvePromoExportOptions(choice, previewFormat);
        const result = await client.exportPromoVideo(
          { projectId, variantId, language, options },
          idempotencyKey,
        );
        const exportId = result?.exportJobId ?? result?.jobId;
        return ok(
          { exportId, status: result?.status ?? "queued", options },
          `Export queued (${options.category} ${options.size}, ${options.format} ${options.quality}). Poll get_promo_video_export with exportId.`,
        );
      } catch (error) {
        if (error instanceof Error && /under 30 seconds/i.test(error.message)) {
          // The editor's "On your device" export is browser-only.
          error.message +=
            " Via MCP: shorten scene durations or set hidden: true on scenes with update_promo_video, then export again with a new idempotencyKey.";
        }
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_promo_video_export",
    {
      title: "Get Promo Video Export",
      description:
        "Returns the status and progress of a promo-video export. Completed jobs include a short-lived download URL; another status read can refresh the URL. Failed exports are refunded. Read-only.",
      inputSchema: z.object({ exportId: z.string().uuid() }),
    },
    async ({ exportId }) => {
      try {
        const status = await client.getExport(exportId);
        const job = status?.export ?? {};
        let download: { url: string; expiresAt?: string } | undefined;
        if (typeof status?.downloadUrl === "string") {
          download = await client.getDownloadLink(status.downloadUrl);
        }
        return ok(
          {
            exportId,
            status: job.status,
            progress: job.progress,
            error: job.error ?? job.errorMessage,
            export: job,
            downloadUrl: download?.url,
            downloadExpiresAt: download?.expiresAt,
          },
          download?.url
            ? "Export complete. Share the exact downloadUrl."
            : `Export ${job.status ?? "pending"}`,
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
