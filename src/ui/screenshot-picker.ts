import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { listPublicTemplateIds } from "../catalog.js";
import { buildTemplateGalleryUrl } from "../template-previews.js";
import { fail } from "../tools/utils.js";
import { pickerToolMeta, registerPickerResource } from "./picker-resource.js";

export const SCREENSHOT_PICKER_URI =
  "ui://applaunchflow/screenshot-picker-v14.html";

export async function createScreenshotPickerResult(
  client: AppLaunchFlowClient,
  {
    generationId,
    catalogKey,
    deviceType,
  }: {
    generationId: string;
    catalogKey: string;
    deviceType: "phone" | "tablet" | "desktop";
  },
) {
  // The catalog URL is a read capability. Also verify project access using
  // this connector's OAuth identity before returning its private layouts.
  await client.getProject(generationId);
  const catalog = await client.requestJson<{
    templateIds: string[];
    paletteOptions?: unknown;
    templateLayoutsByDevice: Record<string, Record<string, unknown>>;
  }>("/api/screenshots/template-catalog", {
    query: { generationId, catalogKey },
  });
  const templateIds = listPublicTemplateIds(
    catalog.templateLayoutsByDevice?.[deviceType] || {},
  );
  if (!templateIds.length)
    throw new Error(
      "No personalized layouts available. Prepare screenshot styles again.",
    );
  const galleryUrl = buildTemplateGalleryUrl(client.credentials.baseUrl, {
    generationId,
    catalogKey,
    deviceType,
    templateIds,
    applySelection: true,
  });
  return {
    content: [
      {
        type: "text" as const,
        text: `Choose a style in the inline picker. If it is not displayed, open: ${galleryUrl}`,
      },
    ],
    structuredContent: {
      success: true,
      data: { generationId, catalogKey, templateIds, galleryUrl },
      message: "Screenshot picker ready",
    },
    // Layouts and signed image URLs go only to the component, not the model.
    _meta: {
      picker: {
        generationId,
        catalogKey,
        deviceType,
        templateIds,
        galleryUrl,
        paletteOptions: catalog.paletteOptions,
        templateLayoutsByDevice: catalog.templateLayoutsByDevice,
      },
    },
  };
}

export function registerScreenshotPicker(
  server: McpServer,
  client: AppLaunchFlowClient,
) {
  registerPickerResource(server, client, {
    name: "screenshot-picker",
    uri: SCREENSHOT_PICKER_URI,
    assetFilename: "screenshot-picker.html",
    assetPrefix: "screenshot-picker",
    description:
      "Choose a personalized screenshot template and V1/V2 palette, then create a new variant.",
  });
  server.registerTool(
    "render_screenshot_picker",
    {
      title: "Show Inline Screenshot Picker",
      description:
        "Reopen the interactive screenshot picker for an already prepared catalog. Normally prepare_screenshot_styles displays this picker directly. This tool does not generate or save anything. Clients without UI support receive the exact full-gallery URL.",
      inputSchema: {
        generationId: z.string().uuid(),
        catalogKey: z.string().regex(/^[a-f0-9]{64}$/i),
        deviceType: z.enum(["phone", "tablet", "desktop"]).default("phone"),
      },
      _meta: pickerToolMeta(SCREENSHOT_PICKER_URI),
    },
    async ({ generationId, catalogKey, deviceType }) => {
      try {
        return await createScreenshotPickerResult(client, {
          generationId,
          catalogKey,
          deviceType,
        });
      } catch (error) {
        return fail(error);
      }
    },
  );
}
