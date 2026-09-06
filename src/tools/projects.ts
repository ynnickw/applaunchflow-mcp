import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";
import { pickerUri } from "../ui/picker-bundle.js";
import {
  pickerToolMeta,
  registerPickerResource,
} from "../ui/picker-resource.js";
import { projectListItemSchema } from "../contracts/index.js";

export const PROJECT_LIST_URI = pickerUri("project-list");

function toProjectListItem(value: unknown, baseUrl: string) {
  const summary = toProjectSummary(value);
  if (typeof summary.id !== "string") return [];
  const project = isRecord(value) ? value : {};
  const parsed = projectListItemSchema.safeParse({
    ...summary,
    name: summary.name || "Untitled project",
    // Icons are fresh display URLs supplied by the owned-project API. Never
    // fall back to persisted metadata URLs, which may be expired signatures.
    iconUrl: safeDisplayUrl(project.iconUrl, baseUrl),
    projectUrl: new URL(`/app/${encodeURIComponent(summary.id)}`, baseUrl).href,
  });
  return parsed.success ? [parsed.data] : [];
}

function safeDisplayUrl(value: unknown, baseUrl: string): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.username || url.password) return undefined;
    if (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        url.origin === new URL(baseUrl).origin &&
        ["localhost", "127.0.0.1"].includes(url.hostname))
    )
      return url.href;
    // Locally signed Supabase URLs use a separate loopback port.
    if (
      new URL(baseUrl).hostname === "127.0.0.1" ||
      new URL(baseUrl).hostname === "localhost"
    ) {
      if (url.origin === "http://127.0.0.1:54321") return url.href;
    }
  } catch {
    /* Invalid artwork falls back to the standard app icon. */
  }
  return undefined;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function toProjectSummary(value: unknown): Record<string, unknown> {
  const project = isRecord(value) ? value : {};
  const metadata = isRecord(project.metadata) ? project.metadata : {};

  return stripUndefined({
    id: typeof project.id === "string" ? project.id : undefined,
    name:
      typeof project.name === "string"
        ? project.name
        : typeof metadata.appName === "string"
          ? metadata.appName
          : undefined,
    platform:
      typeof project.platform === "string"
        ? project.platform
        : typeof metadata.platform === "string"
          ? metadata.platform
          : undefined,
    updatedAt:
      typeof project.updated_at === "string"
        ? project.updated_at
        : typeof project.updatedAt === "string"
          ? project.updatedAt
          : undefined,
    category:
      typeof metadata.category === "string" ? metadata.category : undefined,
    defaultDeviceType:
      typeof metadata.defaultDeviceType === "string"
        ? metadata.defaultDeviceType
        : undefined,
    detectedLanguage:
      typeof metadata.detectedLanguage === "string"
        ? metadata.detectedLanguage
        : undefined,
  });
}

function toVariantSummary(value: unknown): Record<string, unknown> {
  const variant = isRecord(value) ? value : {};
  return stripUndefined({
    id: typeof variant.id === "string" ? variant.id : undefined,
    generationId:
      typeof variant.generation_id === "string"
        ? variant.generation_id
        : typeof variant.generationId === "string"
          ? variant.generationId
          : undefined,
    label: typeof variant.label === "string" ? variant.label : undefined,
    isActive:
      typeof variant.is_active === "boolean"
        ? variant.is_active
        : typeof variant.isActive === "boolean"
          ? variant.isActive
          : undefined,
    updatedAt:
      typeof variant.updated_at === "string"
        ? variant.updated_at
        : typeof variant.updatedAt === "string"
          ? variant.updatedAt
          : undefined,
    languages: Array.isArray(variant.languages)
      ? variant.languages.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : undefined,
    ready: typeof variant.ready === "boolean" ? variant.ready : undefined,
  });
}

function toContentSummary(value: unknown): Record<string, unknown> {
  const content = isRecord(value) ? value : {};
  const variants = asArray(content.variants).map(toVariantSummary);
  const activeVariant = isRecord(content.activeVariant)
    ? toVariantSummary(content.activeVariant)
    : undefined;

  return stripUndefined({
    type: typeof content.type === "string" ? content.type : undefined,
    variants,
    activeVariant,
    editUrl: safeHttpsUrl(content.editUrl),
    activeLabel:
      typeof content.activeLabel === "string" ? content.activeLabel : undefined,
    variantCount:
      typeof content.variantCount === "number"
        ? content.variantCount
        : variants.length,
    isReady: typeof content.isReady === "boolean" ? content.isReady : undefined,
    hasContent:
      typeof content.hasContent === "boolean" ? content.hasContent : undefined,
    screenshotTemplateId:
      typeof content.screenshotTemplateId === "string"
        ? content.screenshotTemplateId
        : undefined,
    socialTemplateId:
      typeof content.socialTemplateId === "string"
        ? content.socialTemplateId
        : undefined,
  });
}

export function toSafeProjectState(value: unknown): Record<string, unknown> {
  const state = isRecord(value) ? value : {};
  const assets = isRecord(state.assets) ? state.assets : {};
  const content = isRecord(state.content) ? state.content : {};
  const progress = isRecord(state.progress) ? state.progress : {};

  const safeContent = Object.fromEntries(
    ["screenshots", "socialGraphics", "promoVideo", "mockups", "website"]
      .filter((key) => isRecord(content[key]))
      .map((key) => [key, toContentSummary(content[key])]),
  );

  return {
    project: toProjectSummary(state.project),
    assets: {
      screenshotCounts: {
        mobile: asArray(assets.mobileScreenshots).length,
        tablet: asArray(assets.tabletScreenshots).length,
        desktop: asArray(assets.desktopScreenshots).length,
      },
      hasLogo: typeof assets.logo === "string" && assets.logo.length > 0,
      qrCodeCount: asArray(assets.qrCodes).length,
    },
    content: safeContent,
    progress: stripUndefined({
      totalItems:
        typeof progress.totalItems === "number"
          ? progress.totalItems
          : undefined,
      completedItems:
        typeof progress.completedItems === "number"
          ? progress.completedItems
          : undefined,
      percentage:
        typeof progress.percentage === "number"
          ? progress.percentage
          : undefined,
      missingItems: Array.isArray(progress.missingItems)
        ? progress.missingItems.filter(
            (entry): entry is string => typeof entry === "string",
          )
        : undefined,
    }),
  };
}

export function registerProjectTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  registerPickerResource(server, client, {
    name: "project-list",
    bundle: "project-list",
    uri: PROJECT_LIST_URI,
    description:
      "AppLaunchFlow project list with app icons and explicit project selection. Selection continues the chat; it does not create a design.",
  });
  server.registerTool(
    "list_projects",
    {
      title: "List Projects",
      description:
        "List existing AppLaunchFlow projects for the authenticated user and show a simple project list with icons. Use this before asking for screenshots or a new upload. When the user has named a project, continue with that matching project; only ask them to select if the choice is ambiguous. Clicking Use project sends the chosen project ID to the chat, without creating a variant.",
      _meta: {
        ...pickerToolMeta(PROJECT_LIST_URI),
        "openai/widgetAccessible": true,
      },
    },
    async () => {
      try {
        const result = await client.listProjects();
        return {
          ...ok(
            { projects: asArray(result.projects).map(toProjectSummary) },
            "Fetched projects",
          ),
          _meta: {
            projectList: {
              projects: asArray(result.projects).flatMap((project) =>
                toProjectListItem(project, client.credentials.baseUrl),
              ),
            },
          },
        };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_project",
    {
      title: "Get Project",
      description: "Get the full hub state for a project",
      inputSchema: {
        projectId: z.string().uuid(),
      },
    },
    async ({ projectId }) => {
      try {
        return ok(
          toSafeProjectState(await client.getProject(projectId)),
          "Fetched project",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "create_project",
    {
      title: "Create Project",
      description:
        "Create a new AppLaunchFlow project. Only app name and platform are required. " +
        "Autofill category and description from context when possible — do not ask the user for these unless genuinely ambiguous.",
      inputSchema: {
        appName: z.string().trim().min(1).max(120).describe("The app name."),
        platform: z
          .enum(["ios", "android", "both"])
          .optional()
          .describe("Target platform. Defaults to iOS."),
        category: z
          .string()
          .trim()
          .max(120)
          .optional()
          .describe(
            "App category. Infer from the app name/context when possible (e.g. 'Travel' for a flight app).",
          ),
        appDescription: z
          .string()
          .trim()
          .max(4000)
          .optional()
          .describe("Brief app description. Infer from context when possible."),
        defaultDeviceType: z
          .enum(["phone", "tablet", "desktop", "watch"])
          .optional()
          .describe("Defaults to phone. Only set if the user explicitly asks."),
        logoPath: z
          .string()
          .optional()
          .describe(
            "Optional stored logo path from upload_screenshots when fileType=logo.",
          ),
        metadata: z
          .record(z.any())
          .optional()
          .describe("Advanced escape hatch for extra metadata fields."),
      },
    },
    async (args) => {
      try {
        const platform = args.platform || "ios";

        const metadata = stripUndefined({
          ...(args.metadata || {}),
          appName: args.appName,
          platform,
          category: args.category,
          appDescription: args.appDescription,
          defaultDeviceType: args.defaultDeviceType || "phone",
          logoPath: args.logoPath,
        });

        const requestBody = stripUndefined({
          name: args.appName,
          platform,
          metadata,
        });

        const created = await client.createProject(requestBody);

        return ok(
          {
            project: toProjectSummary(created.project),
            nextRecommendedStep: "upload_screenshots",
          },
          "Created project",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "delete_project",
    {
      title: "Delete Project",
      description: "Delete a project",
      inputSchema: {
        projectId: z.string().uuid(),
      },
    },
    async ({ projectId }) => {
      try {
        return ok(await client.deleteProject(projectId), "Deleted project");
      } catch (error) {
        return fail(error);
      }
    },
  );
}
