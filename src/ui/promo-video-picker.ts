import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { buildPromoVideoDashboardUrl } from "../promo-video-urls.js";
import { fail } from "../tools/utils.js";
import { registerPickerResource } from "./picker-resource.js";

export const PROMO_VIDEO_PICKER_URI =
  "ui://applaunchflow/promo-video-picker-v19.html";

type PromoCandidate = {
  id: string;
  title: string;
  config: Record<string, unknown>;
};

type PromoBatch = {
  generationId: string;
  candidateKey?: string;
  screenshotPaths: string[];
  candidates: PromoCandidate[];
  [key: string]: unknown;
};

function alignScreenshotUrls(
  candidatePaths: string[],
  availablePaths: string[],
  availableUrls: string[],
) {
  return candidatePaths.map((candidatePath) => {
    const index = availablePaths.findIndex(
      (availablePath) =>
        availablePath === candidatePath ||
        availablePath.endsWith(`/${candidatePath}`) ||
        candidatePath.endsWith(`/${availablePath}`),
    );
    return index >= 0 ? availableUrls[index] || "" : "";
  });
}

export async function createPromoVideoPickerResult(
  client: AppLaunchFlowClient,
  {
    projectId,
    candidateKey,
    replaceVariantId,
  }: {
    projectId: string;
    candidateKey: string;
    replaceVariantId?: string;
  },
) {
  await client.getProject(projectId);
  const [batch, screenshots] = await Promise.all([
    client.requestJson<PromoBatch>("/api/promovideo/candidate-catalog", {
      query: { generationId: projectId, candidateKey },
    }),
    client.listProjectScreenshots(projectId),
  ]);
  if (batch.candidates?.length !== 3) {
    throw new Error(
      "The promo-video picker did not contain three current candidates.",
    );
  }
  const pickerUrl = buildPromoVideoDashboardUrl(client, {
    generationId: projectId,
    candidateKey,
    replaceVariantId,
  });
  const screenshotUrls = alignScreenshotUrls(
    batch.screenshotPaths,
    screenshots.paths,
    screenshots.screenshotUrls,
  );
  return {
    content: [
      {
        type: "text" as const,
        text: `Choose a promo-video concept in the inline picker. If it is not displayed, open: ${pickerUrl}`,
      },
    ],
    structuredContent: {
      success: true,
      data: {
        projectId,
        candidateKey,
        candidateIds: batch.candidates.map((candidate) => candidate.id),
        pickerUrl,
      },
      message: "Promo video picker ready",
    },
    _meta: {
      promoVideoPicker: {
        projectId,
        candidateKey,
        replaceVariantId,
        pickerUrl,
        screenshotUrls,
        // Keep nested config fields opaque to host object/URL transformations.
        // The widget validates and parses this JSON before rendering. This is
        // private widget metadata, not model-visible generated content.
        batchJson: JSON.stringify(batch),
      },
    },
  };
}

export function registerPromoVideoPicker(
  server: McpServer,
  client: AppLaunchFlowClient,
) {
  registerPickerResource(server, client, {
    name: "promo-video-picker",
    uri: PROMO_VIDEO_PICKER_URI,
    assetFilename: "promo-video-picker.html",
    assetPrefix: "promo-video-picker",
    description:
      "Preview three personalized promo-video concepts and create only the one the user selects.",
  });

  server.registerTool(
    "apply_promo_video_candidate",
    {
      title: "Apply Promo Video Candidate",
      description:
        "Create a promo-video variant from one of the three server-stored candidates. This is called by the inline picker after explicit user selection; arbitrary video config input is not accepted. If replaceVariantId is supplied, the previous variant is deleted after the new variant is saved; replacement requires explicit user approval.",
      inputSchema: {
        projectId: z.string().uuid(),
        candidateKey: z.string().regex(/^[a-f0-9]{64}$/i),
        candidateId: z.string().min(1).max(120),
        replaceVariantId: z.string().uuid().optional().describe(
          "Existing promo-video variant to delete after saving the selected candidate. Only pass when the user explicitly approved replacing that variant.",
        ),
      },
    },
    async ({ projectId, candidateKey, candidateId, replaceVariantId }) => {
      try {
        await client.getProject(projectId);
        const batch = await client.requestJson<PromoBatch>(
          "/api/promovideo/candidate-catalog",
          { query: { generationId: projectId, candidateKey } },
        );
        const candidate = batch.candidates.find(
          (item) => item.id === candidateId,
        );
        if (!candidate) {
          throw new Error("The selected promo-video candidate is unavailable.");
        }
        const result = await client.requestJson<{ variantId: string }>(
          "/api/promovideo/apply-candidate",
          {
            method: "POST",
            body: {
              projectId,
              config: candidate.config,
              label: candidate.title,
              ...(replaceVariantId ? { replaceVariantId } : {}),
            },
          },
        );
        const editorUrl = buildPromoVideoDashboardUrl(client, {
          generationId: projectId,
          variantId: result.variantId,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Created promo-video candidate ${candidateId}. Editor URL: ${editorUrl}`,
            },
          ],
          structuredContent: {
            success: true,
            data: {
              projectId,
              variantId: result.variantId,
              candidateId,
              editorUrl,
            },
            message: "Applied promo video candidate",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );
}
