import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { TOOL_ANNOTATIONS } from "../tool-metadata.js";
import { billingUrl } from "./limit-recovery.js";
import { fail, ok } from "./utils.js";

type Area = {
  id: string;
  label: string;
  /** Candidate tools; only the ones this server registers are reported. */
  tools: string[];
  notes: string[];
  /** Dashboard route for the editor ("{project}" is substituted). */
  editor?: string;
  /** Things in this area that only the dashboard UI can do. */
  dashboardOnly?: string[];
};

const AREAS: Area[] = [
  {
    id: "projects",
    label: "Projects and variants",
    tools: [
      "list_projects",
      "get_project",
      "create_project",
      "delete_project",
      "list_variants",
      "create_variant",
      "duplicate_variant",
      "set_active_variant",
      "delete_variant",
    ],
    notes: [
      "projectId and generationId are the same project id.",
      "create_variant makes an EMPTY variant; AI generation tools create their own variants.",
    ],
    editor: "/app/{project}",
    dashboardOnly: [
      "Project settings (name, category, fonts, linked store app)",
    ],
  },
  {
    id: "assets",
    label: "Uploads and assets",
    tools: [
      "upload_screenshots",
      "upload_asset",
      "list_source_screenshots",
      "list_screenshots",
      "list_assets",
      "list_illustrations",
      "view_screenshot",
      "replace_asset",
      "delete_assets",
      "list_asset_folders",
      "create_asset_folder",
      "rename_asset_folder",
      "delete_asset_folder",
      "move_assets",
      "set_asset_folder_locale",
    ],
    notes: ["Uploads store files only; they are applied by editing a design."],
    editor: "/app/{project}?section=assets",
  },
  {
    id: "screenshots",
    label: "App Store / Google Play screenshots",
    tools: [
      "list_source_screenshots",
      "prepare_screenshot_styles",
      "browse_templates",
      "apply_screenshot_style",
      "get_layout",
      "transform_layout",
      "save_layout",
      "translate_layouts",
      "list_translations",
      "store_review_snapshot",
      "view_review_snapshot",
      "list_export_formats",
      "render_screenshots",
      "get_release_render",
    ],
    notes: [
      "Read get_editing_reference (feature screenshots) before editing layout JSON.",
      "render_screenshots exports PNG packages for every store size (Unlimited plan, monthly API allowance).",
    ],
    editor: "/editor?projectId={project}",
    dashboardOnly: [
      "Theme recolor and V1/V2 palette switching",
      "Undo history",
    ],
  },
  {
    id: "socialGraphics",
    label: "Social graphics and store creatives",
    tools: [
      "prepare_social_graphics_styles",
      "browse_social_templates",
      "apply_social_graphics_style",
      "get_graphics",
      "get_graphics_format",
      "save_graphics_format",
      "save_graphics",
      "transform_graphics",
      "translate_graphics",
      "render_graphics",
      "preview_graphics_format",
    ],
    notes: [
      "Read get_editing_reference (feature socialGraphics) before editing.",
    ],
    editor: "/graphics?projectId={project}",
    dashboardOnly: ["Sync one format's design to other formats"],
  },
  {
    id: "promoVideo",
    label: "Promo videos",
    tools: [
      "generate_promo_video",
      "get_promo_video_generation",
      "apply_promo_video_candidate",
      "get_promo_video",
      "update_promo_video",
      "clear_promo_video",
      "export_promo_video",
      "get_promo_video_export",
      "translate_promo_video",
      "preview_promo_video",
    ],
    notes: [
      "Read get_editing_reference (feature promoVideo) before editing the config.",
    ],
    editor: "/promovideo?projectId={project}",
  },
  {
    id: "mockups",
    label: "Mockup animations",
    tools: [
      "create_mockup_animation",
      "get_mockup_animation",
      "update_mockup_animation",
      "list_mockup_media",
      "list_mockup_presets",
      "export_mockup_animation",
      "get_mockup_export",
      "preview_mockup_animation",
    ],
    notes: [
      "Read get_editing_reference (feature mockups) before editing the state.",
    ],
    editor: "/mockups?projectId={project}",
  },
  {
    id: "storeListing",
    label: "Store listing text (ASO copy)",
    tools: [
      "get_store_listing",
      "generate_store_listing",
      "update_store_listing",
      "translate_store_listing",
    ],
    notes: ["Text only; publishing it to the stores happens in the dashboard."],
    editor: "/asocopy?projectId={project}",
  },
  {
    id: "websitePages",
    label: "Website legal pages, links and SEO",
    tools: ["get_website", "save_website_pages"],
    notes: [
      "Works on a website already created in the dashboard and never publishes. Tell the user to reload the studio if it is open.",
    ],
    editor: "/website?projectId={project}",
  },
  {
    id: "keywords",
    label: "Keyword tracking",
    tools: [
      "list_keywords",
      "add_keywords",
      "remove_keywords",
      "suggest_keywords",
      "get_keyword_history",
      "list_keyword_competitors",
      "suggest_keyword_competitors",
      "add_keyword_competitors",
      "remove_keyword_competitors",
    ],
    notes: [
      "Store and app resolve from the project's linked app (get_project).",
    ],
    editor: "/app/{project}?section=keywords",
    dashboardOnly: [
      "Linking or changing the project's store app",
      "Keyword alerts, competitor gap analysis, CSV export",
    ],
  },
  {
    id: "account",
    label: "Plan and usage",
    tools: ["get_plan_usage", "get_capabilities"],
    notes: [],
  },
];

/** Dashboard-only features; agents must send users there instead of guessing. */
const NOT_AVAILABLE: Array<{ feature: string; what: string; route: string }> = [
  {
    feature: "Publishing to App Store Connect / Google Play",
    what: "Uploading screenshots, previews and listing text to the stores (Publish button on the project hub).",
    route: "/app/{project}",
  },
  {
    feature: "Store connections",
    what: "Connecting App Store Connect / Google Play credentials.",
    route: "/app/{project}?section=connections",
  },
  {
    feature: "Custom product pages and Apple product page assets",
    what: "Creating and publishing App Store custom product pages.",
    route: "/app/{project}?section=product-pages",
  },
  {
    feature: "A/B tests",
    what: "Store product page experiments.",
    route: "/app/{project}?section=abtests",
  },
  {
    feature: "Reviews",
    what: "Reading and replying to store reviews.",
    route: "/app/{project}?section=reviews",
  },
  {
    feature: "App icon (Icon Composer)",
    what: "Generating and editing the app icon.",
    route: "/icon-composer?projectId={project}",
  },
  {
    feature: "Website builder",
    what: "The app's landing website design, domains and publishing. Legal pages, links and SEO are available through save_website_pages.",
    route: "/website?projectId={project}",
  },
  {
    feature: "Export history",
    what: "Past exports and their downloads (History tab of each editor's Export dialog).",
    route: "/promovideo?projectId={project}",
  },
  {
    feature: "Collaborators",
    what: "Inviting members and managing project access.",
    route: "/app/{project}?section=collaborators",
  },
  {
    feature: "QR codes",
    what: "Store QR codes for the app.",
    route: "/app/{project}?section=qr",
  },
  {
    feature: "Developer API keys",
    what: "Creating and revoking API keys.",
    route: "/app/{project}?section=developer-api",
  },
  {
    feature: "Billing and plans",
    what: "Upgrading, payment methods and invoices (account menu).",
    route: "/",
  },
];

function link(baseUrl: string, route: string, projectId?: string) {
  if (route.includes("{project}") && !projectId) return undefined;
  return new URL(
    route.replaceAll("{project}", encodeURIComponent(projectId ?? "")),
    baseUrl,
  ).href;
}

export function buildCapabilities(
  baseUrl: string,
  projectId: string | undefined,
  availableTools: ReadonlySet<string>,
) {
  return {
    areas: AREAS.map((area) => {
      const editorUrl = area.editor
        ? link(baseUrl, area.editor, projectId)
        : undefined;
      return {
        id: area.id,
        label: area.label,
        tools: area.tools.filter((tool) => availableTools.has(tool)),
        notes: area.notes,
        ...(editorUrl ? { editorUrl } : {}),
        ...(area.dashboardOnly ? { dashboardOnly: area.dashboardOnly } : {}),
      };
    }),
    notAvailableViaMcp: NOT_AVAILABLE.map((entry) => ({
      feature: entry.feature,
      what: entry.what,
      // Without a project, the dashboard home is where the user picks one.
      dashboardUrl:
        link(baseUrl, entry.route, projectId) ?? new URL("/", baseUrl).href,
    })),
    guidance: [
      "If a request needs something listed in notAvailableViaMcp, say so and give the dashboardUrl instead of attempting it with other tools.",
      projectId
        ? "URLs are for this project."
        : "Pass projectId to get project-specific dashboard URLs.",
    ],
  };
}

export function registerCapabilityTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "get_capabilities",
    {
      title: "Get Capabilities",
      description:
        "Returns supported MCP feature areas and tools, dashboard/editor links and features available only in the dashboard. An optional project ID supplies project-specific links. Read-only.",
      inputSchema: z.object({
        projectId: z.string().uuid().optional(),
      }),
    },
    async ({ projectId }) => {
      try {
        return ok(
          buildCapabilities(
            client.credentials.baseUrl,
            projectId,
            new Set(Object.keys(TOOL_ANNOTATIONS)),
          ),
          "AppLaunchFlow MCP capabilities",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_plan_usage",
    {
      title: "Get Plan Usage",
      description:
        "Returns the account's API-export access, monthly export usage/limit/reset information and, with a project ID, its keyword and competitor limits. Includes a plan-management URL. Does not change the plan or purchase credits.",
      inputSchema: z.object({
        projectId: z.string().uuid().optional(),
      }),
    },
    async ({ projectId }) => {
      try {
        const [apiExports, keywords, competitors] = await Promise.all([
          client.getApiUsage(),
          projectId
            ? client.listKeywords({ projectId }).catch(() => null)
            : Promise.resolve(null),
          projectId
            ? client.listKeywordCompetitors({ projectId }).catch(() => null)
            : Promise.resolve(null),
        ]);
        const trackedKeywords = Array.isArray(keywords?.trackedKeywords)
          ? keywords.trackedKeywords.length
          : undefined;
        return ok(
          {
            apiExports: {
              ...apiExports,
              note: apiExports.pro
                ? "Exports via render_screenshots and other API/MCP exports consume this monthly allowance."
                : "API/MCP exports need the Unlimited plan; editing designs does not.",
            },
            ...(keywords
              ? {
                  keywords: {
                    limit: keywords.limit === -1 ? "unlimited" : keywords.limit,
                    trackedRows: trackedKeywords,
                    note: "Each keyword × country counts once.",
                  },
                }
              : {}),
            ...(competitors
              ? {
                  competitors: {
                    limit:
                      competitors.limit === -1
                        ? "unlimited"
                        : competitors.limit,
                    current: Array.isArray(competitors.competitors)
                      ? competitors.competitors.length
                      : undefined,
                    storeProvider: competitors.storeProvider,
                  },
                }
              : {}),
            upgradeUrl: billingUrl(client.credentials.baseUrl),
          },
          "Fetched plan usage",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
