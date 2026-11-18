import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { buildPromoVideoDashboardUrl } from "../promo-video-urls.js";
import { assetSummary } from "./asset-summary.js";
import { PROMO_EXPORT_SIZES } from "./promovideo.js";
import { fail, ok } from "./utils.js";

const MAX_SCREENS = 10;
const projectId = z.string().uuid().describe("Project / generation UUID.");
const projectPath = z
  .string()
  .min(1)
  .max(512)
  .refine(
    (path) =>
      !/[\\\0]/.test(path) &&
      path
        .split("/")
        .every((segment) => segment && segment !== "." && segment !== ".."),
    "Use a project-relative storage path.",
  );
const deviceModels = {
  "iphone-17-pro": "phone",
  "iphone-duo": "phone",
  "google-pixel-10-pro": "phone",
  "ipad-pro": "tablet",
  "macbook-pro-14": "desktop",
} as const;
const previewFormats = Object.entries(PROMO_EXPORT_SIZES).flatMap(
  ([category, sizes]) => sizes.map((size) => `${category}:${size}`),
);
const customMotion = z.object({
  label: z.string().max(80),
  description: z.string().max(500).optional(),
  keyframes: z
    .array(
      z.object({
        id: z.string(),
        time: z.number().min(0).max(1),
        x: z.number(),
        y: z.number(),
        rotationX: z.number(),
        rotationY: z.number(),
        rotationZ: z.number(),
        scale: z.number(),
        lidOpen: z.number().min(0).max(1).optional(),
        easing: z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]),
      }),
    )
    .min(2)
    .max(24),
});

export function registerDeviceVideoTools(
  server: McpServer,
  client: AppLaunchFlowClient,
) {
  server.registerTool(
    "create_device_video",
    {
      title: "Create Device-Only Video",
      description:
        "Creates and saves a regular Video variant with project screenshots or recordings on a 3D device and no generated copy. The editor can add text, scenes and transitions later. Returns the variant ID and editor link.",
      inputSchema: z
        .object({
          projectId,
          deviceType: z.enum(["phone", "tablet", "desktop"]).default("phone"),
          deviceModelId: z
            .enum(Object.keys(deviceModels) as (keyof typeof deviceModels)[])
            .optional()
            .describe(
              "Match deviceType. iPhone Duo is a phone and MacBook is desktop.",
            ),
          selectedScreenshotPaths: z
            .array(projectPath)
            .min(1)
            .max(MAX_SCREENS)
            .refine(
              (paths) => new Set(paths).size === paths.length,
              "Select each screenshot once.",
            )
            .optional()
            .describe(
              "Screenshots in playback order. With no clips or selection, uses the first screenshot for the chosen device.",
            ),
          recordings: z
            .array(
              z.object({
                storagePath: projectPath.refine(
                  (path) => path.startsWith("mockups/"),
                  "Use a path from the recording library.",
                ),
                durationSeconds: z
                  .number()
                  .positive()
                  .max(3600)
                  .nullable()
                  .describe(
                    "Use the measured clip length when available, or null.",
                  ),
              }),
            )
            .min(1)
            .max(MAX_SCREENS)
            .refine(
              (clips) =>
                new Set(clips.map(({ storagePath }) => storagePath)).size ===
                clips.length,
              "Select each recording once.",
            )
            .optional()
            .describe(
              "Recordings play before screenshots. Up to ten clips and screenshots combined.",
            ),
          motion: z
            .enum([
              "hero-launch",
              "pivot-showcase",
              "slow-rotate",
              "drifting-tilt",
              "float",
              "glide-left",
              "glide-right",
              "tilt-in",
              "duo-unfold",
              "duo-flip",
              "duo-half-fold",
              "duo-fold-shut",
              "lid-open",
              "lid-turn",
              "lid-shut",
            ])
            .optional()
            .describe(
              "Preset for every scene. Duo folds and MacBook lid motions work on their matching devices.",
            ),
          customMotion: customMotion
            .optional()
            .describe(
            "Authored or generated device keyframes. Omit motion when using this.",
            ),
          previewFormat: z.enum(previewFormats).optional(),
          replaceVariantId: z
            .string()
            .uuid()
            .optional()
            .describe(
              "Existing Video variant to replace only after explicit user approval.",
            ),
          idempotencyKey: z
            .string()
            .regex(/^[A-Za-z0-9._:-]{8,128}$/)
            .optional()
            .describe(
              "Reuse the same key when retrying an uncertain creation.",
            ),
        })
        .refine(
          (args) =>
            !args.deviceModelId ||
            deviceModels[args.deviceModelId] === args.deviceType,
          "deviceModelId must match deviceType.",
        )
        .refine(
          (args) => !(args.motion && args.customMotion),
          "Choose a preset or custom motion.",
        )
        .refine(
          (args) =>
            (args.recordings?.length ?? 0) +
              (args.selectedScreenshotPaths?.length ?? 0) <=
            MAX_SCREENS,
          "Choose up to ten screenshots and recordings combined.",
        ),
    },
    async ({ idempotencyKey, ...args }) => {
      try {
        const { variantId, durationInFrames } = await client.createDeviceVideo(
          args,
          idempotencyKey,
        );
        const editorUrl = buildPromoVideoDashboardUrl(client, {
          generationId: args.projectId,
          variantId,
        });
        return ok(
          { projectId: args.projectId, variantId, durationInFrames, editorUrl },
          "Created a device-only video. Use get_promo_video to read the saved configuration.",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "list_video_recordings",
    {
      title: "List Video Recordings",
      description:
        "Lists saved screen recordings for device-only or promo videos. Set includeMetadata to get the duration, dimensions and cloud-render suitability. Returns project-relative paths.",
      inputSchema: z.object({
        projectId,
        includeMetadata: z.boolean().default(false),
      }),
    },
    async ({ projectId, includeMetadata }) => {
      try {
        const { media } = await client.listVideoRecordings(
          projectId,
          includeMetadata,
        );
        return ok(
          {
            recordings: assetSummary(
              media.filter((item) => item.kind === "video"),
            ),
          },
          "Fetched the project's video recordings.",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "generate_promo_video_motion",
    {
      title: "Generate Video Device Motion",
      description:
        "Drafts device-motion keyframes from a prompt for a new device-only video or a compatible saved scene. Returns the motion without saving a video.",
      inputSchema: z.object({
        projectId,
        prompt: z.string().trim().min(3).max(600),
        deviceKind: z
          .enum(["phone", "tablet", "laptop"])
          .describe("Use phone for iPhone Duo and laptop for MacBook."),
      }),
    },
    async ({ projectId, prompt, deviceKind }) => {
      try {
        const {
          motion: { duration, ...motion },
        } = await client.generatePromoVideoMotion({
          generationId: projectId,
          prompt,
          deviceKind,
        });
        return ok(
          { motion, suggestedDurationSeconds: duration },
          "Drafted device motion.",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
