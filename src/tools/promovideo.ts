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

const promoReceiptKey = (generationId: string, variantId?: string) =>
  ["promo-video", generationId, variantId || "active"].join("::");

export function buildPromoVideoDashboardUrl(
  client: AppLaunchFlowClient,
  args: {
    generationId: string;
    variantId?: string;
    candidateKey?: string;
    replaceVariantId?: string;
  },
): string {
  const params = new URLSearchParams({ projectId: args.generationId });
  if (args.variantId) {
    params.set("variantId", args.variantId);
  }
  if (args.candidateKey) {
    params.set("candidateKey", args.candidateKey);
  }
  if (args.replaceVariantId) {
    params.set("replaceVariantId", args.replaceVariantId);
  }
  const pathname = args.candidateKey ? "/promo-video-picker" : "/promovideo";
  return `${client.credentials.baseUrl}${pathname}?${params.toString()}`;
}

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
        "Generate or reuse three transient promo-video candidates from the project's screenshots. " +
        "The dashboard picker opens automatically so the user can preview all three; only the chosen candidate becomes a saved variant. " +
        "After generation, call render_promo_video_picker to show the same three-option picker inline in Claude, ChatGPT, and other MCP Apps-compatible hosts. " +
        "Use replaceVariantId only when the user explicitly chose to replace that existing variant, which also allows a safe swap at the plan limit. " +
        "Use selectedScreenshotPaths to constrain which uploaded screenshots feed the candidates.",
      inputSchema: {
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
          .min(3)
          .max(7)
          .optional()
          .describe(
            "Optional project-relative phone screenshot paths from list_source_screenshots, in story order.",
          ),
        selectedScreenshotIndices: z
          .array(z.number().int().min(0))
          .optional()
          .describe(
            "Legacy screenshot positions. Prefer selectedScreenshotPaths.",
          ),
      },
    },
    async (args, extra) => {
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
          { signal: extra.signal },
        );

        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Prepared three personalized promo-video candidates without creating a saved variant yet.",
                `Candidate picker URL: ${pickerUrl}`,
                "The dashboard picker previews all three options. Choosing one creates that variant and opens it in the promo-video editor.",
                "Next, call render_promo_video_picker with this projectId and candidateKey.",
              ].join("\n"),
            },
          ],
          structuredContent: {
            success: true,
            data: { ...result, editorUrl: pickerUrl },
            message: "Prepared promo video candidates",
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
        "Fetch the current promo video config (Remotion VideoConfig) for a project. Required before update_promo_video so edits operate on fresh state. " +
        "The returned object follows the schema in the resource applaunchflow://schema/video-config — read that resource to learn which fields and scene types exist and their valid ranges, not just which ones this config happens to use.",
      inputSchema: {
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      },
    },
    async ({ generationId, variantId }) => {
      try {
        const result = await client.getPromoVideo(generationId, variantId);
        const editorUrl = buildPromoVideoDashboardUrl(client, {
          generationId,
          variantId,
        });
        promoVideoReadReceipts.record({ generationId, variantId });
        const readReceipt = hostedMcpEnabled()
          ? createHostedReadReceipt(
              promoReceiptKey(generationId, variantId),
              client.credentials.token,
            )
          : undefined;
        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Fetched promo video.",
                `Editor URL: ${editorUrl}`,
                "A fresh read receipt was recorded and can be used for one update_promo_video call.",
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
            message: "Fetched promo video",
          },
        };
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
        "Persist a promo video config (the same Remotion VideoConfig shape returned by get_promo_video / generate_promo_video). " +
        "This is a full-config replace — fetch the current config with get_promo_video, mutate the parts you want to change, then call this tool with the updated object. " +
        "There is no granular scene-level transform; whole-config replace is the supported edit path at this stage. " +
        "ENFORCED: each call requires a fresh get_promo_video for the same projectId/variantId immediately beforehand. " +
        "SCHEMA REFERENCE: read the resource applaunchflow://schema/video-config for the full field-level reference — the six scene types and their content shapes, theme, TextStyle, ken burns, choreography preset ids, devices, overlays, and audio. " +
        "Values outside the documented ranges fail validation and reject the whole update.",
      inputSchema: {
        projectId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        config: z
          .record(z.any())
          .describe(
            "Full Remotion VideoConfig object — a whole-config replace, not a patch. " +
              "Required: theme (colors + typography) and scenes (at least one; each scene is a discriminated union on `type`: hook | feature | text-only | closeup | multi-phone | cta, with a matching `content` shape). " +
              "Optional: version, duration (seconds), audio, phoneId. " +
              "All coordinates are percentages of the frame (0-100, 50 = centered), never pixels. " +
              "Always start from the object returned by get_promo_video and mutate it — do not hand-build one. " +
              "Full field reference including every scene's content fields and valid ranges: read the resource applaunchflow://schema/video-config.",
          ),
        appName: z.string().optional(),
        projectName: z.string().optional(),
        readReceipt: z
          .string()
          .optional()
          .describe(
            "Hosted connector only: pass the readReceipt returned by the immediately preceding get_promo_video call.",
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
              promoReceiptKey(args.projectId, args.variantId),
              client.credentials.token,
            )
          : promoVideoReadReceipts.has(receiptArgs);
        if (!hasReceipt) {
          return fail(
            new ToolInputError(
              "READ_BEFORE_EDIT_REQUIRED",
              "Call get_promo_video first for this project/variant before update_promo_video. Direct editing is locked until the current state has been read.",
            ),
          );
        }

        const { readReceipt: _readReceipt, ...updateArgs } = args;
        const result = await client.updatePromoVideo(updateArgs);
        promoVideoReadReceipts.consume(receiptArgs);

        const editorUrl = buildPromoVideoDashboardUrl(client, {
          generationId: args.projectId,
          variantId: args.variantId,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Updated promo video.",
                `Editor URL (already open — do NOT run \`open\` again): ${editorUrl}`,
                "This update consumed the current read receipt. Call get_promo_video again before the next direct edit.",
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
        "Wipe the promo video config for a variant so the user can start over. Does not delete the variant itself.",
      inputSchema: {
        projectId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      },
    },
    async (args) => {
      try {
        return ok(await client.clearPromoVideo(args), "Cleared promo video");
      } catch (error) {
        return fail(error);
      }
    },
  );
}
