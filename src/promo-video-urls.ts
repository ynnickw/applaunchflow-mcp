import type { AppLaunchFlowClient } from "./client/api.js";

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
  if (args.variantId) params.set("variantId", args.variantId);
  if (args.candidateKey) params.set("candidateKey", args.candidateKey);
  if (args.replaceVariantId)
    params.set("replaceVariantId", args.replaceVariantId);
  const pathname = args.candidateKey ? "/promo-video-picker" : "/promovideo";
  return `${client.credentials.baseUrl}${pathname}?${params.toString()}`;
}
