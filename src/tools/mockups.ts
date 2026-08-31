import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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

const MOCKUP_PRESETS_DATA = {
  motions: [
    { id: "hero-reveal", label: "Hero reveal", durationSeconds: 6 },
    { id: "feature-sweep", label: "Feature sweep", durationSeconds: 7 },
    { id: "showcase-orbit", label: "Showcase orbit", durationSeconds: 10 },
    { id: "parallax-tilt", label: "Parallax tilt", durationSeconds: 8 },
  ],
  finishes: [
    { id: "silver", label: "Silver" },
    { id: "cosmic-orange", label: "Cosmic Orange" },
    { id: "deep-blue", label: "Deep Blue" },
  ],
  backgroundPresets: [
    { id: "soft", label: "Soft" },
    { id: "paper", label: "Paper" },
    { id: "midnight", label: "Midnight" },
    { id: "transparent", label: "Transparent" },
  ],
  backgroundModes: ["color", "gradient", "image"],
  outputRatios: [
    { id: "4:3", label: "Classic", detail: "1440×1080 (default)" },
    { id: "1:1", label: "Square", detail: "1080×1080" },
    { id: "16:9", label: "Landscape", detail: "1920×1080" },
    { id: "9:16", label: "Portrait", detail: "1080×1920" },
  ],
  easings: ["linear", "ease-in", "ease-out", "ease-in-out"],
  scenePresets: [
    {
      id: "hero-launch",
      label: "Cinematic swing",
      motion: "hero-reveal",
      keyframeCount: 4,
      motionDurationSeconds: 6,
    },
    {
      id: "pivot-showcase",
      label: "Spin reveal",
      motion: "feature-sweep",
      keyframeCount: 4,
      motionDurationSeconds: 7,
    },
    {
      id: "slow-rotate",
      label: "Drop & zoom",
      motion: "showcase-orbit",
      keyframeCount: 5,
      motionDurationSeconds: 10,
    },
    {
      id: "drifting-tilt",
      label: "Punch zoom",
      motion: "parallax-tilt",
      keyframeCount: 4,
      motionDurationSeconds: 8,
    },
  ],
  stateBounds: {
    speed: { min: 0.7, max: 1.4 },
    motionDuration: { min: 1, max: 60 },
    deviceScale: { min: 0.7, max: 1.3 },
    primaryKeyframes: { minCount: 2, maxCount: 8 },
  },
  keyframeBounds: {
    time: { min: 0, max: 1, note: "Normalized position along the animation." },
    x: { min: -3, max: 3 },
    y: { min: -3, max: 3 },
    rotationX: { min: -6.283185307179586, max: 6.283185307179586 },
    rotationY: { min: -6.283185307179586, max: 6.283185307179586 },
    rotationZ: { min: -6.283185307179586, max: 6.283185307179586 },
    scale: { min: 0.2, max: 3 },
  },
} as const;

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
        "Create a new mockup-animation variant seeded from a SCENE_PRESETS preset and a specific screenshot/recording path. " +
        "Always omit variantId — this tool always creates a new variant. Never overwrites an existing mockup variant. " +
        "Call list_mockup_media first to pick a valid screenshotPath and list_mockup_presets to pick a presetId. " +
        "The editor opens automatically after creation.",
      inputSchema: {
        projectId: z.string().uuid().describe("Project / generation UUID."),
        screenshotPath: z
          .string()
          .min(1)
          .describe(
            'Storage-relative path for the device screen content, e.g. "mockups/1715191234567-clip.mp4" or "mobile/ios/1715191234567-home.png". Returned by list_mockup_media.',
          ),
        presetId: z
          .enum(SCENE_PRESET_IDS)
          .describe(
            "Scene preset id: 'hero-launch' (cinematic swing), 'pivot-showcase' (spin reveal), 'slow-rotate' (drop & zoom), or 'drifting-tilt' (punch zoom).",
          ),
        outputRatio: z
          .enum(OUTPUT_RATIOS)
          .optional()
          .describe(
            "Optional output aspect ratio. Defaults to 4:3 (classic).",
          ),
        motionDurationSeconds: z
          .number()
          .min(1)
          .max(60)
          .optional()
          .describe(
            "Optional override for the animation loop length (seconds). For video screenshotPath, pass the recording duration so the loop matches one cycle.",
          ),
        label: z
          .string()
          .min(1)
          .max(120)
          .optional()
          .describe("Optional variant label shown in the studio's variant dropdown."),
      },
    },
    async (args, extra) => {
      try {
        const result = await client.createMockupAnimation({
          generationId: args.projectId,
          screenshotPath: args.screenshotPath,
          presetId: args.presetId,
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
          { signal: extra.signal },
        );

        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Created mockup animation variant.",
                `Editor URL: ${editorUrl}`,
                "IMPORTANT: Paste this exact editor URL in the reply so the user can open it.",
                "To fine-tune the animation, call get_mockup_animation for this variant before update_mockup_animation.",
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
        "Fetch the current mockup animation state (MockupProjectState shape) for a project. " +
        "Required before update_mockup_animation so edits operate on fresh state.",
      inputSchema: {
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      },
    },
    async ({ generationId, variantId }) => {
      try {
        const result = await client.getMockupAnimation(generationId, variantId);
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
        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Fetched mockup animation.",
                `Editor URL: ${editorUrl}`,
                "A fresh read receipt was recorded and can be used for one update_mockup_animation call.",
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
            message: "Fetched mockup animation",
          },
        };
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
        "Persist a mockup animation state (the same MockupProjectState shape returned by get_mockup_animation). " +
        "This is a full-state replace — fetch the current state with get_mockup_animation, mutate the parts you want to change, then call this tool with the updated object. " +
        "There is no granular per-keyframe transform; whole-state replace is the supported edit path. " +
        "ENFORCED: each call requires a fresh get_mockup_animation for the same projectId/variantId immediately beforehand. " +
        "Validation bounds (see list_mockup_presets for the full reference): primaryKeyframes count 2–8, time 0–1, x/y -3..3, rotations -2π..2π, scale 0.2..3, speed 0.7..1.4, motionDuration 1..60, deviceScale 0.7..1.3.",
      inputSchema: {
        projectId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        state: z
          .record(z.any())
          .describe(
            "Full MockupProjectState object (selectedMediaPath, motion, finish, speed, background, backgroundMode, backgroundColor, backgroundGradient, backgroundImage, showDynamicIsland, outputRatio, motionDuration, deviceScale, primaryKeyframes, isPlaying). Use the object returned by get_mockup_animation as a starting point.",
          ),
        readReceipt: z
          .string()
          .optional()
          .describe(
            "Hosted connector only: pass the readReceipt returned by the immediately preceding get_mockup_animation call.",
          ),
      },
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
        });
        mockupReadReceipts.consume(receiptArgs);

        const editorUrl = buildMockupEditorUrl(client, {
          generationId: args.projectId,
          variantId: args.variantId,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Updated mockup animation.",
                `Editor URL (already open — do NOT run \`open\` again): ${editorUrl}`,
                "This update consumed the current read receipt. Call get_mockup_animation again before the next direct edit.",
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
            message: "Updated mockup animation",
          },
        };
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
        "List the screenshots and screen recordings uploaded under the project's mockups/ storage folder. " +
        "Call this before create_mockup_animation to discover valid screenshotPath values. " +
        "Returns media items with { path, signedUrl, kind: 'image' | 'video' }.",
      inputSchema: {
        projectId: z.string().uuid(),
      },
    },
    async ({ projectId }) => {
      try {
        const result = await client.listMockupMedia(projectId);
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
        "Return the structured set of valid mockup configuration values: motion presets, device finishes, background presets, output ratios, scene presets, and validation bounds. " +
        "Use before constructing an update_mockup_animation payload to pick valid enum values without round-tripping through the server validator. " +
        "If projectId is supplied, also returns the active screenshots variant's themeColors so the LLM can pick on-brand swatches for backgroundColor / gradient.",
      inputSchema: {
        projectId: z
          .string()
          .uuid()
          .optional()
          .describe("Optional generation UUID to also fetch theme colors."),
      },
    },
    async ({ projectId }) => {
      try {
        let themeColors: unknown = null;
        if (projectId) {
          try {
            const themeResult = await client.getMockupThemeColors(projectId);
            themeColors = themeResult?.themeColors ?? null;
          } catch {
            // Theme colors are optional — a missing screenshots variant is not
            // a failure for the presets lookup.
            themeColors = null;
          }
        }
        return ok(
          { ...MOCKUP_PRESETS_DATA, themeColors },
          "Mockup preset reference",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
