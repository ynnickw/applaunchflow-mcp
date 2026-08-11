import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import {
  buildTemplateGalleryUrl,
  TEMPLATE_PREVIEW_DEVICE_TYPES,
  type TemplatePreviewDeviceType,
  decorateTemplatePayload,
} from "../template-previews.js";
import { fail } from "./utils.js";

type TemplateCatalogPayload = {
  templates: Array<{
    id: string;
    name: string;
    description?: string | null;
    categories?: string[];
    screenCount?: number;
    previewUrls: Record<string, string>;
    previewResourceUris: Record<string, string>;
  }>;
};

type TemplateDetailsPayload = {
  template: {
    id: string;
    name: string;
    description?: string | null;
    categories?: string[];
    screenCount?: number;
    previewUrls: Record<string, string>;
    previewResourceUris: Record<string, string>;
  };
};

function formatTemplateLine(
  template: TemplateCatalogPayload["templates"][number],
  deviceType: TemplatePreviewDeviceType,
): string {
  const parts = [
    `${template.name} (${template.id})`,
    typeof template.screenCount === "number"
      ? `${template.screenCount} screens`
      : null,
    template.categories?.length
      ? `categories: ${template.categories.join(", ")}`
      : null,
    template.description || null,
    `Preview URL (${deviceType}): ${template.previewUrls[deviceType]}`,
  ];

  return parts.filter(Boolean).join(" | ");
}

function buildListTemplatesResult(
  payload: TemplateCatalogPayload,
  deviceType: TemplatePreviewDeviceType,
  galleryUrl: string,
) {
  return {
    content: [
      {
        type: "text" as const,
        text: [
          `Fetched ${payload.templates.length} screenshot templates.`,
          `Open the visual gallery: ${galleryUrl}`,
          `Use the ${deviceType} preview resources below to compare them visually.`,
          "Keep the full catalog available unless the user explicitly asks for a shortlist.",
          "",
          ...payload.templates.map((template) =>
            formatTemplateLine(template, deviceType),
          ),
        ].join("\n"),
      },
      {
        type: "resource_link" as const,
        uri: galleryUrl,
        name: "Open Template Gallery",
        mimeType: "text/html",
        description:
          "Hosted visual gallery with screenshot template previews for all available templates.",
      },
      ...payload.templates.map((template) => ({
        type: "resource_link" as const,
        uri: template.previewResourceUris[deviceType],
        name: `${template.name} (${deviceType} preview)`,
        mimeType: "image/png",
        description:
          template.description ||
          `Visual preview for the ${template.name} screenshot template.`,
      })),
    ],
    structuredContent: {
      success: true,
      data: {
        ...payload,
        previewDeviceType: deviceType,
        galleryUrl,
      },
      message: "Fetched templates",
    },
  };
}

function buildTemplateDetailsResult(payload: TemplateDetailsPayload) {
  const { template } = payload;
  const previewSummary = TEMPLATE_PREVIEW_DEVICE_TYPES.map(
    (deviceType) =>
      `${deviceType}: ${template.previewUrls[deviceType]} | resource: ${template.previewResourceUris[deviceType]}`,
  );

  return {
    content: [
      {
        type: "text" as const,
        text: [
          `Fetched template ${template.name} (${template.id}).`,
          template.description || null,
          typeof template.screenCount === "number"
            ? `Screen count: ${template.screenCount}`
            : null,
          template.categories?.length
            ? `Categories: ${template.categories.join(", ")}`
            : null,
          "",
          "Preview assets:",
          ...previewSummary,
        ]
          .filter(Boolean)
          .join("\n"),
      },
      ...TEMPLATE_PREVIEW_DEVICE_TYPES.map((deviceType) => ({
        type: "resource_link" as const,
        uri: template.previewResourceUris[deviceType],
        name: `${template.name} (${deviceType} preview)`,
        mimeType: "image/png",
        description:
          template.description ||
          `Visual preview for the ${template.name} screenshot template.`,
      })),
    ],
    structuredContent: {
      success: true,
      data: payload,
      message: "Fetched template",
    },
  };
}

export function registerTemplateTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "browse_templates",
    {
      title: "Browse & Select Template",
      description:
        "Use this visual style gallery after prepare_screenshot_styles, restricted to its returned templateIds, so the user can choose which prepared result to apply. It can also be used independently for static style discovery. Returns the selected template id. Never offer templates via text or AskUserQuestion — always open this gallery.",
      inputSchema: {
        deviceType: z
          .enum(TEMPLATE_PREVIEW_DEVICE_TYPES)
          .optional()
          .describe("Which preview device the gallery should show first."),
        templateIds: z
          .array(z.string())
          .optional()
          .describe("Optional subset of template ids to show in the gallery."),
        selectedTemplateId: z
          .string()
          .optional()
          .describe("Optional template id to highlight in the gallery."),
        title: z
          .string()
          .optional()
          .describe("Optional gallery heading, for example the project name."),
        generationId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Project UUID from prepare_screenshot_styles. Pass together with catalogKey to show the real personalized previews.",
          ),
        catalogKey: z
          .string()
          .min(1)
          .max(128)
          .optional()
          .describe(
            "Catalog key from prepare_screenshot_styles. Pass together with generationId.",
          ),
      },
    },
    async (
      {
        deviceType = "phone",
        templateIds,
        selectedTemplateId,
        title,
        generationId,
        catalogKey,
      },
    ) => {
      try {
        const payload = decorateTemplatePayload(
          await client.listTemplates(),
          client.credentials.baseUrl,
        ) as TemplateCatalogPayload;
        const availableIds = new Set(payload.templates.map((template) => template.id));
        const filteredTemplateIds =
          templateIds?.filter((templateId) => availableIds.has(templateId)) || [];
        const droppedTemplateIds =
          templateIds?.filter((templateId) => !availableIds.has(templateId)) ||
          [];

        if (droppedTemplateIds.length > 0) {
          console.error(
            `[browse_templates] Ignoring unknown template ids not in the registry: ${droppedTemplateIds.join(", ")}`,
          );
        }

        // If a caller restricted the gallery to specific ids but NONE of them
        // are known, silently showing every template would misrepresent the
        // prepared catalog. Fail loudly instead so the flow can re-prepare.
        if (
          templateIds &&
          templateIds.length > 0 &&
          filteredTemplateIds.length === 0
        ) {
          return fail(
            new Error(
              `None of the requested template ids match the available templates (${droppedTemplateIds.join(", ")}). ` +
                "The prepared catalog and the template registry may be out of sync — re-run prepare_screenshot_styles and pass its returned templateIds.",
            ),
          );
        }

        const galleryUrl = buildTemplateGalleryUrl(client.credentials.baseUrl, {
          deviceType,
          templateIds: filteredTemplateIds.length > 0 ? filteredTemplateIds : undefined,
          selectedTemplateId:
            selectedTemplateId && availableIds.has(selectedTemplateId)
              ? selectedTemplateId
              : undefined,
          title,
          generationId,
          catalogKey,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Paste this exact gallery URL into the user-visible reply.",
                `Template gallery URL: ${galleryUrl}`,
                "Do not say 'link above' because tool results may be collapsed or hidden.",
                "After you pick a template, reply with the template name or id.",
              ].join("\n"),
            },
            {
              type: "resource_link" as const,
              uri: galleryUrl,
              name: "Open Template Gallery",
              mimeType: "text/html",
              description:
                "Hosted visual gallery for browsing screenshot template previews.",
            },
          ],
          structuredContent: {
            success: true,
            data: {
              galleryUrl,
              userFacingUrl: galleryUrl,
              deviceType,
              templateIds: filteredTemplateIds,
            },
            message: "Prepared template gallery",
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

}
