import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import {
  buildTemplateGalleryUrl,
  TEMPLATE_PREVIEW_DEVICE_TYPES,
  type TemplatePreviewDeviceType,
  decorateTemplatePayload,
} from "../template-previews.js";
import type { TemplateSelectionCoordinator } from "../template-selection.js";
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
  selectionCoordinator?: TemplateSelectionCoordinator,
): void {
  server.registerTool(
    "browse_templates",
    {
      title: "Browse & Select Template",
      description:
        "ALWAYS use this tool when a template choice is needed. Opens the visual template gallery in the browser where the user can browse previews and click to select. Returns the selected template id. Never offer templates via text or AskUserQuestion — always open this gallery.",
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
      },
    },
    async (
      {
        deviceType = "phone",
        templateIds,
        selectedTemplateId,
        title,
      },
      extra,
    ) => {
      try {
        const payload = decorateTemplatePayload(
          await client.listTemplates(),
          client.credentials.baseUrl,
        ) as TemplateCatalogPayload;
        const availableIds = new Set(payload.templates.map((template) => template.id));
        const availableTemplateMap = new Map(
          payload.templates.map((template) => [template.id, template]),
        );
        const filteredTemplateIds =
          templateIds?.filter((templateId) => availableIds.has(templateId)) || [];

        // If coordinator is available, set up a callback so clicking a template works
        if (selectionCoordinator) {
          const selection = await selectionCoordinator.createSelection({
            baseUrl: client.credentials.baseUrl,
            deviceType,
            templateIds: filteredTemplateIds.length > 0 ? filteredTemplateIds : undefined,
            selectedTemplateId:
              selectedTemplateId && availableIds.has(selectedTemplateId)
                ? selectedTemplateId
                : undefined,
            title,
          });

          const fallbackGalleryUrl = buildTemplateGalleryUrl(client.credentials.baseUrl, {
            deviceType,
            templateIds: filteredTemplateIds.length > 0 ? filteredTemplateIds : undefined,
            selectedTemplateId:
              selectedTemplateId && availableIds.has(selectedTemplateId)
                ? selectedTemplateId
                : undefined,
            title,
          });

          try {
            const elicitationId = randomUUID();

            try {
              selection.setCompletionNotifier(
                server.server.createElicitationCompletionNotifier(elicitationId),
              );
            } catch {
              selection.setCompletionNotifier(undefined);
            }

            const elicitationResult = await server.server.elicitInput(
              {
                mode: "url",
                elicitationId,
                message:
                  "Browse the template gallery and click a template to select it.",
                url: selection.galleryUrl,
              },
              { signal: extra.signal },
            );

            if (elicitationResult.action !== "accept") {
              selection.cleanup();

              return {
                content: [
                  {
                    type: "text" as const,
                    text:
                      elicitationResult.action === "decline"
                        ? "Template browsing was dismissed."
                        : "Template browsing was cancelled.",
                  },
                ],
                structuredContent: {
                  success: false,
                  data: { action: elicitationResult.action, cancelled: true },
                  message: "Template browsing not completed",
                },
              };
            }

            const chosenTemplateId = await selection.waitForSelection(extra.signal);
            const chosenTemplate = availableTemplateMap.get(chosenTemplateId);

            if (!chosenTemplate) {
              throw new Error(`Selected template ${chosenTemplateId} is not available`);
            }

            return {
              content: [
                {
                  type: "text" as const,
                  text: `Selected template ${chosenTemplate.name} (${chosenTemplate.id}).`,
                },
                {
                  type: "resource_link" as const,
                  uri: chosenTemplate.previewResourceUris[deviceType],
                  name: `${chosenTemplate.name} (${deviceType} preview)`,
                  mimeType: "image/png",
                  description:
                    chosenTemplate.description ||
                    `Visual preview for the ${chosenTemplate.name} screenshot template.`,
                },
              ],
              structuredContent: {
                success: true,
                data: {
                  template: chosenTemplate,
                  templateId: chosenTemplate.id,
                  templateName: chosenTemplate.name,
                  deviceType,
                  galleryUrl: selection.galleryUrl,
                },
                message: "Selected template",
              },
            };
          } catch (error) {
            selection.cleanup();

            const errorMessage =
              error instanceof Error ? error.message : String(error);
            if (
              errorMessage.includes("Client does not support url elicitation") ||
              errorMessage.includes("Client does not support URL elicitation")
            ) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: [
                      "This client does not support interactive URL selection.",
                      "Paste this exact gallery URL into the user-visible reply so the user can choose manually:",
                      fallbackGalleryUrl,
                    ].join("\n"),
                  },
                  {
                    type: "resource_link" as const,
                    uri: fallbackGalleryUrl,
                    name: "Open Template Gallery",
                    mimeType: "text/html",
                    description:
                      "Hosted visual gallery for browsing screenshot template previews.",
                  },
                ],
                structuredContent: {
                  success: false,
                  data: {
                    interactiveSelectionAvailable: false,
                    galleryUrl: fallbackGalleryUrl,
                    userFacingUrl: fallbackGalleryUrl,
                    deviceType,
                    templateIds: filteredTemplateIds,
                  },
                  message: "Interactive selection unavailable; falling back to manual gallery browsing",
                },
              };
            }

            throw error;
          }
        }

        // No coordinator — fall back to returning the URL
        const galleryUrl = buildTemplateGalleryUrl(client.credentials.baseUrl, {
          deviceType,
          templateIds: filteredTemplateIds.length > 0 ? filteredTemplateIds : undefined,
          selectedTemplateId:
            selectedTemplateId && availableIds.has(selectedTemplateId)
              ? selectedTemplateId
              : undefined,
          title,
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

  server.registerTool(
    "list_templates",
    {
      title: "List Templates",
      description:
        "List all AppLaunchFlow screenshot templates with visual preview resources. Prefer visual comparison over text-only descriptions.",
      inputSchema: {
        deviceType: z
          .enum(TEMPLATE_PREVIEW_DEVICE_TYPES)
          .optional()
          .describe("Which preview device to attach for each template."),
      },
    },
    async ({ deviceType = "phone" }) => {
      try {
        const payload = decorateTemplatePayload(
          await client.listTemplates(),
          client.credentials.baseUrl,
        ) as TemplateCatalogPayload;
        const galleryUrl = buildTemplateGalleryUrl(client.credentials.baseUrl, {
          deviceType,
        });
        return buildListTemplatesResult(payload, deviceType, galleryUrl);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_template_details",
    {
      title: "Get Template Details",
      description:
        "Get details and visual preview resources for a single screenshot template.",
      inputSchema: {
        templateId: z.string(),
      },
    },
    async ({ templateId }) => {
      try {
        const payload = decorateTemplatePayload(
          await client.getTemplate(templateId),
          client.credentials.baseUrl,
        ) as TemplateDetailsPayload;
        return buildTemplateDetailsResult(payload);
      } catch (error) {
        return fail(error);
      }
    },
  );
}
