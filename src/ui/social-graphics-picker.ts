import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { listPublicTemplateIds } from "../catalog.js";
import {
  buildSocialTemplateGalleryUrl,
  SOCIAL_FORMATS,
} from "../social-template-previews.js";
import { fail } from "../tools/utils.js";
import { pickerToolMeta, registerPickerResource } from "./picker-resource.js";

export const SOCIAL_GRAPHICS_PICKER_URI =
  "ui://applaunchflow/social-graphics-picker-v1.html";

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

  server.registerTool(
    "render_social_graphics_picker",
    {
      title: "Show Inline Social Graphics Picker",
      description:
        "Display the interactive social-graphics picker inside MCP Apps-compatible clients after prepare_social_graphics_styles. Reuses the prepared catalog and saves only after the user explicitly confirms a template. Clients without UI support receive the exact full-gallery URL.",
      inputSchema: {
        generationId: z.string().uuid(),
        catalogKey: z.string().regex(/^[a-f0-9]{64}$/i),
        primaryFormat: z.enum(SOCIAL_FORMATS).default("og"),
      },
      _meta: pickerToolMeta(SOCIAL_GRAPHICS_PICKER_URI),
    },
    async ({ generationId, catalogKey, primaryFormat }) => {
      try {
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
        );
        if (!templateIds.length) {
          throw new Error(
            "No personalized layouts are available. Prepare social graphics styles again.",
          );
        }
        const galleryUrl = buildSocialTemplateGalleryUrl(
          client.credentials.baseUrl,
          {
            format: primaryFormat,
            templateIds,
            generationId,
            catalogKey,
            applySelection: true,
          },
        );
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
            socialGraphicsPicker: {
              generationId,
              catalogKey,
              primaryFormat,
              templateIds,
              galleryUrl,
              paletteOptions: catalog.paletteOptions,
              templateLayoutsByFormat: catalog.templateLayoutsByFormat,
            },
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );
}
