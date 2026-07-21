import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { createReadReceiptStore, fail, ok, openUrl } from "./utils.js";

function buildPromoVideoEditorUrl(
  client: AppLaunchFlowClient,
  args: { generationId: string; variantId?: string },
): string {
  const params = new URLSearchParams({ projectId: args.generationId });
  if (args.variantId) {
    params.set("variantId", args.variantId);
  }
  return `${client.credentials.baseUrl}/promovideo?${params.toString()}`;
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
        "Run AI generation against the project's screenshots and produce a complete Remotion promo video config. " +
        "Omit variantId so a new variant is always created — never overwrite an existing promo-video variant. " +
        "After generation, the promo video editor opens automatically. " +
        "Use selectedScreenshotIndices to constrain which uploaded screenshots feed the LLM. " +
        "Use the optional message field to pass natural-language regeneration feedback when iterating on an existing variant.",
      inputSchema: {
        projectId: z.string().uuid().describe("Project / generation UUID."),
        message: z
          .string()
          .optional()
          .describe(
            "Optional natural-language feedback for regeneration. Only meaningful when iterating on an existing variant.",
          ),
        variantId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "DO NOT pass this for fresh takes. Only set when explicitly regenerating an existing variant.",
          ),
        selectedScreenshotIndices: z
          .array(z.number().int().min(0))
          .optional()
          .describe(
            "Optional indices into the project's screenshots array. If omitted, the generator uses the project's default platform set.",
          ),
      },
    },
    async (args, extra) => {
      try {
        const result = await client.generatePromoVideo(args);
        const variantId = result?.variantId || args.variantId || "";
        const editorUrl = buildPromoVideoEditorUrl(client, {
          generationId: args.projectId,
          variantId,
        });

        await openUrl(
          server,
          editorUrl,
          "Opening the generated promo video in the editor.",
          { signal: extra.signal },
        );

        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Generated promo video successfully.",
                `Editor URL: ${editorUrl}`,
                "IMPORTANT: Paste this exact editor URL in the reply so the user can open it.",
              ].join("\n"),
            },
          ],
          structuredContent: {
            success: true,
            data: { ...result, editorUrl },
            message: "Generated promo video",
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
        const editorUrl = buildPromoVideoEditorUrl(client, {
          generationId,
          variantId,
        });
        promoVideoReadReceipts.record({ generationId, variantId });
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
            data: { ...result, editorUrl, readBeforeEditSatisfied: true },
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
      },
    },
    async (args) => {
      try {
        const receiptArgs = {
          generationId: args.projectId,
          variantId: args.variantId,
        };

        if (!promoVideoReadReceipts.has(receiptArgs)) {
          return fail(
            new Error(
              "Call get_promo_video first for this project/variant before update_promo_video. Direct editing is locked until the current state has been read.",
            ),
          );
        }

        const result = await client.updatePromoVideo(args);
        promoVideoReadReceipts.consume(receiptArgs);

        const editorUrl = buildPromoVideoEditorUrl(client, {
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
        return ok(
          await client.clearPromoVideo(args),
          "Cleared promo video",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
