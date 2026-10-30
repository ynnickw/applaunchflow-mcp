import { McpServer } from "@modelcontextprotocol/server";
import { ToolInputError } from "../telemetry.js";
import { z } from "zod";
import { AppLaunchFlowApiError } from "../client/api.js";
import type { AppLaunchFlowClient } from "../client/api.js";
import { upstreamSignal } from "../request-context.js";
import {
  createHostedReadReceipt,
  createReadReceiptStore,
  fail,
  hostedMcpEnabled,
  ok,
  openUrl,
  verifyHostedReadReceipt,
} from "./utils.js";

const mockupReceiptKey = (generationId: string, variantId?: string) =>
  ["mockup", generationId, variantId || "active"].join("::");

const SCENE_PRESET_IDS = [
  "hero-launch",
  "pivot-showcase",
  "slow-rotate",
  "drifting-tilt",
] as const;

const OUTPUT_RATIOS = ["1:1", "4:3", "16:9", "9:16"] as const;
const MAX_PREVIEW_FRAMES = 4;
// Preview PNGs are inlined as base64 image content; keep each one bounded.
const MAX_PREVIEW_BYTES = 6 * 1024 * 1024;

/** Recovery guidance for export/preview rejections, keyed by API error code. */
const EXPORT_ERROR_HINTS: Record<string, string> = {
  api_pro_required:
    "Server exports through the connector need an active Unlimited subscription. The user can export from the editor instead (Export > On your device).",
  api_export_quota_exhausted:
    "The monthly API export allowance is used up. Do not retry; the user can export from the editor or wait for the allowance to renew.",
  export_too_long:
    "Server rendering needs the animation strictly under 30 seconds: lower state.motionDuration with update_mockup_animation, or export from the editor (On your device has no length limit).",
  transparent_server_export:
    "Set a background (state.backgroundMode 'color' with background other than 'transparent', or a gradient/image) before exporting on the server, or export transparent WebM from the editor.",
  no_export_access:
    "The account has no export access or credits. Do not retry; the user needs a plan or credits.",
  rate_limit_exceeded:
    "Too many render requests. Wait a minute before trying again.",
};

function withHint(error: unknown) {
  if (error instanceof AppLaunchFlowApiError) {
    const code = String(
      error.body?.code ?? error.body?.error?.code ?? "",
    ).toLowerCase();
    const hint = EXPORT_ERROR_HINTS[code];
    if (hint && !error.message.includes(hint))
      error.message = `${error.message}\nNext step: ${hint}`;
  }
  return error;
}

function buildMockupEditorUrl(
  client: AppLaunchFlowClient,
  args: { generationId: string; variantId?: string },
): string {
  const params = new URLSearchParams({ projectId: args.generationId });
  if (args.variantId) {
    params.set("variantId", args.variantId);
  }
  return `${client.credentials.baseUrl}/mockups?${params.toString()}`;
}

async function fetchImage(url: string) {
  const response = await fetch(url, { signal: upstreamSignal(60_000) });
  if (!response.ok)
    throw new Error(
      `Could not download the rendered frame (${response.status})`,
    );
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > MAX_PREVIEW_BYTES)
    throw new Error("The rendered frame is too large; use a smaller scale.");
  return bytes.toString("base64");
}

export function registerMockupTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  const mockupReadReceipts = createReadReceiptStore();

  server.registerTool(
    "create_mockup_animation",
    {
      title: "Create Mockup Animation",
      description:
        "Creates a new mockup-animation variant from a scene preset and a project screenshot or recording. A dedicated mockup upload is not required. Supports phone, dual-screen phone, tablet and laptop devices, with model-fitted motion and finishes. Existing variants are preserved. Returns the new variant and editor link.",
      inputSchema: z.object({
        projectId: z.string().uuid().describe("Project / generation UUID."),
        screenshotPath: z
          .string()
          .min(1)
          .describe(
            'Project-relative path for the device screen content, e.g. "mockups/1715191234567-clip.mp4" from list_mockup_media or "mobile/ios/1715191234567-home.png" from list_assets. Use an existing asset from the same project.',
          ),
        presetId: z
          .enum(SCENE_PRESET_IDS)
          .describe(
            "Scene preset id: 'hero-launch' (cinematic swing), 'pivot-showcase' (spin reveal), 'slow-rotate' (drop & zoom), or 'drifting-tilt' (punch zoom).",
          ),
        device: z
          .enum(["phone", "duo", "tablet", "laptop"])
          .default("phone")
          .describe(
            "Device kind: phone (iPhone 18 Pro / Pixel 10 Pro by platform), duo (iPhone Duo, unfolded), tablet (iPad Pro), laptop (MacBook Pro 14\"). Match the screen content's aspect: iPad screenshots on tablet, Mac/desktop captures on laptop.",
          ),
        platform: z
          .enum(["ios", "android"])
          .optional()
          .describe(
            "Only for device phone: ios = iPhone, android = Pixel. Defaults to the project's platform.",
          ),
        outputRatio: z
          .enum(OUTPUT_RATIOS)
          .optional()
          .describe("Optional output aspect ratio. Defaults to 4:3 (classic)."),
        motionDurationSeconds: z
          .number()
          .min(1)
          .max(60)
          .optional()
          .describe(
            "Optional animation length in seconds. For a video screenshotPath it defaults to the recording's length (read on the server) so the loop plays the recording once; otherwise the preset's length.",
          ),
        label: z
          .string()
          .min(1)
          .max(120)
          .optional()
          .describe(
            "Optional variant label shown in the studio's variant dropdown.",
          ),
      }),
    },
    async (args, ctx) => {
      try {
        const result = await client.createMockupAnimation({
          generationId: args.projectId,
          screenshotPath: args.screenshotPath,
          presetId: args.presetId,
          device: args.device,
          platform: args.platform,
          outputRatio: args.outputRatio,
          motionDurationSeconds: args.motionDurationSeconds,
          label: args.label,
        });
        const variantId = result?.variantId || "";
        const editorUrl = buildMockupEditorUrl(client, {
          generationId: args.projectId,
          variantId,
        });

        await openUrl(
          server,
          editorUrl,
          "Opening the new mockup animation in the editor.",
          { signal: ctx.mcpReq.signal },
        );

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Created mockup animation variant ${variantId}${result?.deviceModelId ? ` (${result.deviceModelId}, ${result.motionDurationSeconds}s)` : ""}.`,
                `Editor URL: ${editorUrl}`,
                "IMPORTANT: Paste this exact editor URL in the reply so the user can open it.",
                "Check the framing with preview_mockup_animation. To fine-tune, call get_mockup_animation for this variant before update_mockup_animation.",
              ].join("\n"),
            },
          ],
          structuredContent: {
            success: true,
            data: { ...result, editorUrl },
            message: "Created mockup animation",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_mockup_animation",
    {
      title: "Get Mockup Animation",
      description:
        "Returns a saved mockup animation state, its resolved variant ID and a same-target editing read receipt. Omitting variantId reads the active variant. Read-only.",
      inputSchema: z.object({
        generationId: z.string().uuid(),
        variantId: z
          .string()
          .uuid()
          .optional()
          .describe("Mockup variant; omitted = the project's active one."),
      }),
    },
    async ({ generationId, variantId: requested }) => {
      try {
        const result = await client.getMockupAnimation(generationId, requested);
        const variantId: string | undefined =
          requested ?? result?.variantId ?? result?.project?.variant_id;
        const editorUrl = buildMockupEditorUrl(client, {
          generationId,
          variantId,
        });
        mockupReadReceipts.record({ generationId, variantId });
        const readReceipt = hostedMcpEnabled()
          ? createHostedReadReceipt(
              mockupReceiptKey(generationId, variantId),
              client.credentials.token,
            )
          : undefined;
        // Mirror edit state and receipt in text for hosts that omit structuredContent.
        return ok(
          {
            ...result,
            ...(variantId ? { variantId } : {}),
            editorUrl,
            readBeforeEditSatisfied: true,
            readReceipt,
          },
          result && "project" in result && !result.project
            ? "No saved mockup animation for this variant yet; create one with create_mockup_animation."
            : "Fetched mockup animation. Pass variantId and readReceipt to the matching edit tool; do not display the receipt to the user.",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "update_mockup_animation",
    {
      title: "Update Mockup Animation",
      description:
        "Replaces a complete saved mockup animation state. Hosted edits require a fresh same-target read receipt. The server sorts keyframes, derives legacy primary-device fields, validates model/finish and motion bounds, and reports ignored unknown fields. Whole-state replacement is the supported save contract.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z
          .string()
          .uuid()
          .describe("The variantId returned by get_mockup_animation."),
        state: z
          .record(z.string(), z.any())
          .describe(
            "Complete MockupProjectState from get_mockup_animation. devices[] is canonical when present (1–6 independent devices); preserve all devices (the server mirrors devices[0] into the legacy fields). Read get_editing_reference(feature: mockups) for the full contract, including names, timing, transitions, keyframe lidOpen, audio and presenter overlay.",
          ),
        fitMotionToDevice: z
          .boolean()
          .default(true)
          .describe(
            "When a device's model changes kind (phone, duo, tablet, laptop) and its keyframes are still an unmodified scene preset, re-fit them to the new model like create_mockup_animation does (smaller travel/zoom on iPad/MacBook, laptop lid choreography). Authored keyframes are never changed; the result warns instead. false only reports.",
          ),
        readReceipt: z
          .string()
          .optional()
          .describe(
            "Hosted connector only: pass the readReceipt returned by the immediately preceding get_mockup_animation call.",
          ),
      }),
    },
    async (args) => {
      try {
        const receiptArgs = {
          generationId: args.projectId,
          variantId: args.variantId,
        };

        const hasReceipt = hostedMcpEnabled()
          ? verifyHostedReadReceipt(
              args.readReceipt,
              mockupReceiptKey(args.projectId, args.variantId),
              client.credentials.token,
            )
          : mockupReadReceipts.has(receiptArgs);
        if (!hasReceipt) {
          return fail(
            new ToolInputError(
              "READ_BEFORE_EDIT_REQUIRED",
              "Call get_mockup_animation first for this project/variant before update_mockup_animation. Direct editing is locked until the current state has been read.",
            ),
          );
        }

        const result = await client.updateMockupAnimation({
          generationId: args.projectId,
          variantId: args.variantId,
          state: args.state,
          fitMotionToDevice: args.fitMotionToDevice,
        });
        mockupReadReceipts.consume(receiptArgs);

        const editorUrl = buildMockupEditorUrl(client, {
          generationId: args.projectId,
          variantId: args.variantId,
        });
        const ignoredFields: string[] = result?.ignoredFields ?? [];
        const warnings: string[] = result?.warnings ?? [];
        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Updated mockup animation.",
                ...(ignoredFields.length
                  ? [
                      `Ignored unknown fields (not saved): ${ignoredFields.join(", ")}. Check the names in get_editing_reference(feature: mockups).`,
                    ]
                  : []),
                ...warnings.map((warning) => `Note: ${warning}`),
                `Editor URL (already open — do NOT run \`open\` again): ${editorUrl}`,
                "This update consumed the current read receipt. Call get_mockup_animation again before the next direct edit.",
              ].join("\n"),
            },
          ],
          structuredContent: {
            success: true,
            data: {
              result,
              ignoredFields,
              warnings,
              editorUrl,
              nextEditRequiresFreshRead: true,
            },
            message: "Updated mockup animation",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "preview_mockup_animation",
    {
      title: "Preview Mockup Animation",
      description:
        "Renders up to four frames of a saved mockup animation as PNG inspection images. times are timeline seconds within motionDuration, not normalized keyframe fractions. Does not modify the design.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z
          .string()
          .uuid()
          .optional()
          .describe("Mockup variant; omitted = the project's active one."),
        times: z
          .array(z.number().min(0).max(60))
          .min(1)
          .max(MAX_PREVIEW_FRAMES)
          .optional()
          .describe("Timeline seconds to render, e.g. [0, 2.5, 5]."),
        scale: z
          .number()
          .min(0.25)
          .max(1)
          .default(0.5)
          .describe(
            "Size relative to the export resolution (4:3 exports are 1440×1080; 0.5 → 720×540).",
          ),
      }),
    },
    async ({ projectId, variantId, times, scale }) => {
      try {
        const result = await client.previewMockupAnimation({
          generationId: projectId,
          variantId,
          times,
          scale,
        });
        const frames: Array<{
          timeSeconds: number;
          frame: number;
          url: string;
        }> = result?.frames ?? [];
        const images = await Promise.all(
          frames.map((frame) => fetchImage(frame.url)),
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Rendered ${frames.length} frame(s) of mockup variant ${result.variantId} at ${result.width}×${result.height} (animation ${result.motionDurationSeconds}s): ${frames.map((frame) => `t=${frame.timeSeconds}s`).join(", ")}. Images follow in that order.`,
            },
            ...images.flatMap((data, index) => [
              {
                type: "text" as const,
                text: `Frame at t=${frames[index].timeSeconds}s:`,
              },
              { type: "image" as const, data, mimeType: "image/png" },
            ]),
          ],
        };
      } catch (error) {
        return fail(withHint(error));
      }
    },
  );

  server.registerTool(
    "export_mockup_animation",
    {
      title: "Export Mockup Animation",
      description:
        "Starts an MP4/WebM export of a saved mockup animation and returns exportJobId. Server exports require an opaque background, duration strictly under thirty seconds and available API export allowance. An accepted job uses one allowance. The same idempotencyKey identifies the same request across retries.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z
          .string()
          .uuid()
          .optional()
          .describe("Mockup variant; omitted = the project's active one."),
        format: z.enum(["mp4", "webm"]).default("mp4"),
        quality: z
          .enum(["1080p", "720p"])
          .default("1080p")
          .describe(
            "1080p = the output ratio's full size (e.g. 1440×1080 for 4:3); 720p renders at two-thirds.",
          ),
        fps: z.union([z.literal(30), z.literal(60)]).default(30),
        idempotencyKey: z.string().min(8).max(128).optional(),
      }),
    },
    async ({ projectId, variantId, format, quality, fps, idempotencyKey }) => {
      try {
        const result = await client.exportMockupAnimation(
          { projectId, variantId, options: { format, quality, fps } },
          idempotencyKey,
        );
        return ok(
          { ...result, format, quality, fps },
          `Export queued. Poll get_mockup_animation_export with exportJobId ${result.exportJobId} (renders usually take 1–3 minutes).`,
        );
      } catch (error) {
        return fail(withHint(error));
      }
    },
  );

  server.registerTool(
    "get_mockup_animation_export",
    {
      title: "Get Mockup Animation Export",
      description:
        "Returns mockup export progress and a short-lived download URL when complete. Supports a bounded waitSeconds. Failed exports are refunded. Read-only.",
      inputSchema: z.object({
        exportJobId: z.string().uuid(),
        waitSeconds: z
          .number()
          .int()
          .min(0)
          .max(50)
          .default(0)
          .describe("Poll for up to this many seconds before returning."),
      }),
    },
    async ({ exportJobId, waitSeconds }) => {
      try {
        const deadline = Date.now() + waitSeconds * 1000;
        let status = await client.getExportJob(exportJobId);
        while (
          !["completed", "failed", "cancelled"].includes(
            status.export.status,
          ) &&
          Date.now() + 5000 <= deadline
        ) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          status = await client.getExportJob(exportJobId);
        }
        const job = status.export;
        if (job.status === "completed" && status.downloadUrl) {
          const download = await client.getExportDownload(status.downloadUrl);
          return ok(
            {
              exportJobId,
              status: job.status,
              fileName: job.fileName,
              fileSize: job.fileSize,
              downloadUrl: download.url,
              downloadUrlExpiresAt: download.expiresAt,
            },
            "Export completed. Share this exact downloadUrl with the user (it expires).",
          );
        }
        return ok(
          {
            exportJobId,
            status: job.status,
            progress: job.progress,
            errorMessage: job.errorMessage,
          },
          job.status === "failed" || job.status === "cancelled"
            ? `Export ${job.status}${job.errorMessage ? `: ${job.errorMessage}` : ""}. Credits were refunded; ask the user before starting another export.`
            : `Export ${job.status}${typeof job.progress === "number" ? ` (${Math.round(job.progress)}%)` : ""}. Poll again in a little while.`,
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "generate_mockup_motion",
    {
      title: "Generate Mockup Motion",
      description:
        "Drafts mockup keyframe data from a motion description. Returns configuration data without saving an animation or rendering video pixels.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        prompt: z.string().min(3).max(600),
        deviceKind: z
          .enum(["phone", "duo", "tablet", "laptop"])
          .default("phone")
          .describe(
            "Kind of the device the motion is for (list_mockup_presets deviceModels[].presetDevice). Laptops get lidOpen per keyframe; tablets and laptops get smaller movements.",
          ),
      }),
    },
    async ({ projectId, prompt, deviceKind }) => {
      try {
        const result = await client.generateMockupMotion({
          generationId: projectId,
          prompt,
          deviceKind: deviceKind === "duo" ? "phone" : deviceKind,
        });
        return ok(
          result,
          "Generated custom motion (not saved). Apply it with get_mockup_animation + update_mockup_animation.",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "list_mockup_media",
    {
      title: "List Mockup Media",
      description:
        "Lists image and video assets in the project's mockups storage folder, with available duration, dimensions, frame rate and export-safety metadata. General project screenshots outside that folder are not included. Read-only.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        includeMetadata: z
          .boolean()
          .default(true)
          .describe(
            "Read each video's length, size and cloud-render suitability (slower for many videos).",
          ),
      }),
    },
    async ({ projectId, includeMetadata }) => {
      try {
        const result = await client.listMockupMedia(projectId, {
          includeMetadata,
        });
        return ok(result, "Listed mockup media");
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "list_mockup_presets",
    {
      title: "List Mockup Presets",
      description:
        "Returns supported device models/finishes, fitted scene presets, motions, bundled music, output ratios, transitions, easing values, validation bounds, export limits and recording requirements. An optional project also supplies its screenshot theme colors. Read-only.",
      inputSchema: z.object({
        projectId: z
          .string()
          .uuid()
          .optional()
          .describe("Optional generation UUID to also fetch theme colors."),
      }),
    },
    async ({ projectId }) => {
      try {
        const [presets, themeColors] = await Promise.all([
          client.getMockupPresets(),
          projectId
            ? client
                .getMockupThemeColors(projectId)
                .then((result) => result?.themeColors ?? null)
                // Theme colors are optional — a missing screenshots variant is
                // not a failure for the presets lookup.
                .catch(() => null)
            : Promise.resolve(null),
        ]);
        return ok(
          {
            ...presets,
            themeColors,
            editingReference:
              "Field definitions: get_editing_reference(feature: mockups).",
          },
          "Mockup preset reference",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
