import { Buffer } from "node:buffer";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppLaunchFlowClient } from "../client/api.js";
import {
  buildTemplatePreviewUrl,
  decorateTemplatePayload,
  isSafeTemplateId,
  isTemplatePreviewDeviceType,
} from "../template-previews.js";
import {
  LAYOUT_SCHEMA_RESOURCE,
  PROJECT_CREATION_WIZARD_RESOURCE,
  SUPPORTED_DEVICES,
  TRANSFORM_SCHEMA_RESOURCE,
  WORKFLOW_GUIDE_RESOURCE,
} from "./data.js";

function asJsonResource(uri: string, payload: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function asBinaryResource(uri: string, mimeType: string, blob: string) {
  return {
    contents: [
      {
        uri,
        mimeType,
        blob,
      },
    ],
  };
}

export function registerResources(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerResource(
    "layout-schema",
    "applaunchflow://schema/layout",
    {
      title: "Layout Schema",
      description: "AppLaunchFlow layout JSON structure",
      mimeType: "application/json",
    },
    async (uri) => asJsonResource(uri.href, LAYOUT_SCHEMA_RESOURCE),
  );

  server.registerResource(
    "transform-schema",
    "applaunchflow://schema/transforms",
    {
      title: "Transform Schema",
      description: "Supported layout transform operations",
      mimeType: "application/json",
    },
    async (uri) => asJsonResource(uri.href, TRANSFORM_SCHEMA_RESOURCE),
  );

  server.registerResource(
    "template-catalog",
    "applaunchflow://templates",
    {
      title: "Template Catalog",
      description: "Current screenshot template catalog",
      mimeType: "application/json",
    },
    async (uri) =>
      asJsonResource(
        uri.href,
        decorateTemplatePayload(
          await client.listTemplates(),
          client.credentials.baseUrl,
        ),
      ),
  );

  server.registerResource(
    "template-preview",
    new ResourceTemplate("applaunchflow://templates/{templateId}/preview/{deviceType}", {
      list: undefined,
    }),
    {
      title: "Template Preview",
      description:
        "Rendered preview image for a screenshot template and device type.",
      mimeType: "image/png",
    },
    async (uri, { templateId, deviceType }) => {
      const resolvedTemplateId = Array.isArray(templateId)
        ? templateId[0]
        : templateId;
      const resolvedDeviceType = Array.isArray(deviceType)
        ? deviceType[0]
        : deviceType;

      if (
        !isSafeTemplateId(resolvedTemplateId) ||
        !isTemplatePreviewDeviceType(resolvedDeviceType)
      ) {
        throw new Error("Invalid template preview request");
      }

      const headers = new Headers();
      headers.set(
        "Cookie",
        `${client.credentials.cookieName}=${client.credentials.token}`,
      );
      headers.set("Authorization", `Bearer ${client.credentials.token}`);

      const previewUrl = buildTemplatePreviewUrl(
        client.credentials.baseUrl,
        resolvedTemplateId,
        resolvedDeviceType,
      );
      const response = await fetch(previewUrl, {
        headers,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch template preview ${resolvedTemplateId}/${resolvedDeviceType}: HTTP ${response.status}`,
        );
      }

      const mimeType = response.headers.get("content-type") || "image/png";
      const arrayBuffer = await response.arrayBuffer();
      const blob = Buffer.from(arrayBuffer).toString("base64");

      return asBinaryResource(uri.href, mimeType, blob);
    },
  );

  server.registerResource(
    "project-creation-wizard",
    "applaunchflow://wizard/project-creation",
    {
      title: "Project Creation Wizard",
      description: "The exact guided flow used by the UI create-project wizard",
      mimeType: "application/json",
    },
    async (uri) => asJsonResource(uri.href, PROJECT_CREATION_WIZARD_RESOURCE),
  );

  server.registerResource(
    "workflow-guide",
    "applaunchflow://guide/workflows",
    {
      title: "Workflow Guide",
      description: "Preferred MCP workflows for generating and editing projects",
      mimeType: "application/json",
    },
    async (uri) => asJsonResource(uri.href, WORKFLOW_GUIDE_RESOURCE),
  );

  server.registerResource(
    "devices",
    "applaunchflow://devices",
    {
      title: "Supported Devices",
      description: "Device frame identifiers and dimensions",
      mimeType: "application/json",
    },
    async (uri) => asJsonResource(uri.href, SUPPORTED_DEVICES),
  );

  server.registerResource(
    "project-state",
    new ResourceTemplate("applaunchflow://project/{projectId}/state", {
      list: undefined,
    }),
    {
      title: "Project State",
      description: "Project state summary with variants and translations",
      mimeType: "application/json",
    },
    async (uri, { projectId }) => {
      const resolvedProjectId = Array.isArray(projectId) ? projectId[0] : projectId;
      const [project, translations, screenshotVariants] =
        await Promise.all([
          client.getProject(resolvedProjectId),
          client.getLayout({ generationId: resolvedProjectId }),
          client.listVariants(resolvedProjectId, "screenshots"),
        ]);

      return asJsonResource(uri.href, {
        project,
        translations,
        variants: {
          screenshots: screenshotVariants,
        },
      });
    },
  );
}
