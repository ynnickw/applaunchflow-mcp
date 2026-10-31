import type { McpServer } from "@modelcontextprotocol/server";
import type { AppLaunchFlowClient } from "../client/api.js";
import { listPublicTemplateIds } from "../catalog.js";
import {
  buildSocialTemplateGalleryUrl,
  SOCIAL_FORMATS,
} from "../social-template-previews.js";
import { registerPickerResource } from "./picker-resource.js";

import { versionWidgetResourceUri } from "./widget-metadata.js";
import { packCatalogPayload } from "./catalog-payload.js";

export const SOCIAL_GRAPHICS_PICKER_URI = versionWidgetResourceUri(
  "ui://applaunchflow/social-graphics-picker-v20.html",
);

export async function createSocialGraphicsPickerResult(
  client: AppLaunchFlowClient,
  {
    generationId,
    catalogKey,
    primaryFormat,
    templateIds: requestedIds,
    selectedTemplateId,
    title,
  }: {
    generationId: string;
    catalogKey: string;
    primaryFormat: (typeof SOCIAL_FORMATS)[number];
    templateIds?: string[];
    selectedTemplateId?: string;
    title?: string;
  },
) {
  await client.getProject(generationId);
  const catalog = await client.requestJson<{
    templateIds: string[];
    paletteOptions?: unknown;
    templateLayoutsByFormat: Record<
      string,
      Record<string, Record<string, unknown>>
    >;
  }>("/api/graphics/template-catalog", {
    query: { generationId, catalogKey },
  });
  const templateIds = listPublicTemplateIds(
    catalog.templateLayoutsByFormat?.[primaryFormat] || {},
    requestedIds,
  );
  if (!templateIds.length) {
    throw new Error(
      "No personalized layouts are available. Prepare social graphics styles again.",
    );
  }
  const galleryUrl = buildSocialTemplateGalleryUrl(client.credentials.baseUrl, {
    format: primaryFormat,
    templateIds,
    selectedTemplateId: templateIds.includes(selectedTemplateId || "")
      ? selectedTemplateId
      : undefined,
    title,
    generationId,
    catalogKey,
    applySelection: true,
  });
  return {
    content: [
      {
        type: "text" as const,
        text: `Choose a social style in the inline picker. If it is not displayed, open: ${galleryUrl}`,
      },
    ],
    structuredContent: {
      success: true,
      data: {
        generationId,
        catalogKey,
        templateIds,
        primaryFormat,
        galleryUrl,
      },
      message: "Social graphics picker ready",
    },
    _meta: {
      socialGraphicsPicker: packCatalogPayload({
        generationId,
        catalogKey,
        primaryFormat,
        templateIds,
        selectedTemplateId,
        galleryUrl,
        paletteOptions: catalog.paletteOptions,
        templateLayoutsByFormat: catalog.templateLayoutsByFormat,
      }),
    },
  };
}

export function registerSocialGraphicsPicker(
  server: McpServer,
  client: AppLaunchFlowClient,
) {
  registerPickerResource(server, client, {
    name: "social-graphics-picker",
    uri: SOCIAL_GRAPHICS_PICKER_URI,
    assetFilename: "social-graphics-picker.html",
    assetPrefix: "social-graphics-picker",
    description:
      "Choose a personalized social-graphics template and palette across every supported format, then create a variant.",
  });
}
