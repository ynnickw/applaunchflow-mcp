import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";
import { pickerUri } from "../ui/picker-bundle.js";
import {
  pickerToolMeta,
  registerPickerResource,
} from "../ui/picker-resource.js";
import { projectListItemSchema } from "../contracts/index.js";
import { ToolInputError } from "../telemetry.js";

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

/**
 * Hub edit URLs are dashboard-relative ("/editor?projectId=..."). Resolve them
 * against the connector's dashboard; never follow a relative URL off-origin.
 */
export function dashboardUrl(
  value: unknown,
  baseUrl: string | undefined,
): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  if (!baseUrl) return safeHttpsUrl(value);
  try {
    const base = new URL(baseUrl);
    const url = new URL(value, base);
    if (url.origin === base.origin) return url.href;
  } catch {
    return undefined;
  }
  return safeHttpsUrl(value);
}

type StoreProvider = "app_store" | "google_play";

/** Same precedence as the dashboard's derivePrimaryStoreProvider. */
function linkedStore(metadata: Record<string, any>) {
  const appleAppId =
    typeof metadata.appleAppId === "string" ||
    typeof metadata.appleAppId === "number"
      ? String(metadata.appleAppId)
      : undefined;
  const googlePlayPackageName =
    typeof metadata.googlePlayPackageName === "string"
      ? metadata.googlePlayPackageName
      : undefined;
  const explicit = metadata.primaryStoreProvider;
  const primaryStoreProvider: StoreProvider | undefined =
    explicit === "google_play" || explicit === "gplay"
      ? "google_play"
      : explicit === "app_store"
        ? "app_store"
        : googlePlayPackageName && !appleAppId
          ? "google_play"
          : appleAppId
            ? "app_store"
            : undefined;
  return { appleAppId, googlePlayPackageName, primaryStoreProvider };
}

/** Apple app id from a numeric id or an apps.apple.com URL ("/id123"). */
export function parseAppStoreId(value: string): string | undefined {
  const trimmed = value.trim();
  if (/^\d{5,15}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (!/(^|\.)apple\.com$/.test(url.hostname)) return undefined;
    return /\/id(\d{5,15})(?:[/?#]|$)/.exec(url.pathname + "/")?.[1];
  } catch {
    return undefined;
  }
}

async function importAppStoreApp(
  client: AppLaunchFlowClient,
  appStore: string,
  country?: string,
): Promise<
  | {
      storeAppId: string;
      name: string;
      category?: string;
      description?: string;
      iconUrl?: string;
      storeUrl?: string;
    }
  | undefined
> {
  const id = parseAppStoreId(appStore);
  if (!id) {
    throw new ToolInputError(
      "INVALID_TOOL_INPUT",
      "appStore must be a numeric Apple app id or an apps.apple.com URL containing /id<digits>.",
    );
  }
  const result = await client.lookupAppStore(
    id,
    (country || "us").toLowerCase(),
  );
  const app = asArray(result?.results).find(
    (entry) => isRecord(entry) && String(entry.storeAppId) === id,
  );
  if (!app || typeof app.name !== "string") {
    throw new ToolInputError(
      "INVALID_TOOL_INPUT",
      `No App Store app ${id} in the ${(country || "us").toUpperCase()} storefront. Check the id or pass country.`,
    );
  }
  return {
    storeAppId: id,
    name: app.name,
    category: typeof app.category === "string" ? app.category : undefined,
    description:
      typeof app.description === "string" ? app.description : undefined,
    iconUrl: safeHttpsUrl(app.iconUrl),
    storeUrl: safeHttpsUrl(app.storeUrl),
  };
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
    // Linked store app (keywords, store import, QR codes use these).
    ...linkedStore(metadata),
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

function toContentSummary(
  value: unknown,
  baseUrl?: string,
): Record<string, unknown> {
  const content = isRecord(value) ? value : {};
  const variants = asArray(content.variants).map(toVariantSummary);
  const activeVariant = isRecord(content.activeVariant)
    ? toVariantSummary(content.activeVariant)
    : undefined;

  return stripUndefined({
    type: typeof content.type === "string" ? content.type : undefined,
    variants,
    activeVariant,
    editUrl: dashboardUrl(content.editUrl, baseUrl),
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

export function toSafeProjectState(
  value: unknown,
  baseUrl?: string,
): Record<string, unknown> {
  const state = isRecord(value) ? value : {};
  const assets = isRecord(state.assets) ? state.assets : {};
  const content = isRecord(state.content) ? state.content : {};
  const progress = isRecord(state.progress) ? state.progress : {};

  const safeContent = Object.fromEntries(
    [
      "screenshots",
      "socialGraphics",
      "promoVideo",
      "mockups",
      "asoCopy",
      "appIcon",
      "website",
    ]
      .filter((key) => isRecord(content[key]))
      .map((key) => [key, toContentSummary(content[key], baseUrl)]),
  );
  const project = toProjectSummary(state.project);

  return {
    project:
      baseUrl && typeof project.id === "string"
        ? {
            ...project,
            hubUrl: new URL(`/app/${encodeURIComponent(project.id)}`, baseUrl)
              .href,
          }
        : project,
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
        "Lists the authenticated user's existing AppLaunchFlow projects and returns an embedded project list with icons. Choosing a project supplies its ID to the chat without creating or changing a design.",
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
      description:
        "Returns a project's app metadata, linked store-app identifiers, source screenshot counts, content-type variants, active variants and dashboard/editor links. projectId and generationId identify the same project. Read-only.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
      }),
    },
    async ({ projectId }) => {
      try {
        return ok(
          toSafeProjectState(
            await client.getProject(projectId),
            client.credentials.baseUrl,
          ),
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
        "Creates a project from an app name or imports metadata and the icon from a published Apple App Store listing. Platform defaults to iOS. Returns the project ID and hub URL. Does not generate a design or publish to a store.",
      inputSchema: z.object({
        appName: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .optional()
          .describe(
            "The app name. Required unless appStore is given (then it overrides the store name).",
          ),
        appStore: z
          .string()
          .trim()
          .min(1)
          .max(500)
          .optional()
          .describe(
            "Import from the App Store: numeric Apple app id (e.g. 284882215) or an apps.apple.com URL.",
          ),
        country: z
          .string()
          .regex(/^[A-Za-z]{2}$/)
          .optional()
          .describe(
            "Storefront for the App Store import (ISO country, default us).",
          ),
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
          .record(z.string(), z.any())
          .optional()
          .describe("Advanced escape hatch for extra metadata fields."),
      }),
    },
    async (args) => {
      try {
        const imported = args.appStore
          ? await importAppStoreApp(client, args.appStore, args.country)
          : undefined;
        const appName = args.appName || imported?.name;
        if (!appName) {
          throw new ToolInputError(
            "INVALID_TOOL_INPUT",
            "Provide appName, or appStore to import the app from the App Store.",
          );
        }
        const platform = args.platform || "ios";

        const metadata = stripUndefined({
          ...(args.metadata || {}),
          appName,
          platform,
          category: args.category || imported?.category || undefined,
          appDescription:
            args.appDescription ||
            imported?.description?.slice(0, 4000) ||
            undefined,
          defaultDeviceType: args.defaultDeviceType || "phone",
          logoPath: args.logoPath,
          ...(imported
            ? {
                appleAppId: imported.storeAppId,
                primaryStoreProvider: "app_store",
                logoUrl: args.logoPath
                  ? undefined
                  : imported.iconUrl || undefined,
              }
            : {}),
        });

        const requestBody = stripUndefined({
          name: appName,
          platform,
          metadata,
        });

        const created = await client.createProject(requestBody);
        const project = toProjectSummary(created.project);

        return ok(
          {
            project:
              typeof project.id === "string"
                ? {
                    ...project,
                    hubUrl: new URL(
                      `/app/${encodeURIComponent(project.id)}`,
                      client.credentials.baseUrl,
                    ).href,
                  }
                : project,
            ...(imported
              ? {
                  importedFrom: {
                    appleAppId: imported.storeAppId,
                    name: imported.name,
                    storeUrl: imported.storeUrl || undefined,
                  },
                }
              : {}),
            nextRecommendedStep: "upload_screenshots",
          },
          imported
            ? `Created project from App Store app ${imported.name}`
            : "Created project",
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
      description:
        "Deletes the specified project. This is a destructive project operation.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
      }),
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
