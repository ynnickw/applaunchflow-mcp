import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { ToolInputError } from "../telemetry.js";
import { fail, ok } from "./utils.js";

type StoreProvider = "app_store" | "google_play";

const storeProviderSchema = z
  .enum(["app_store", "google_play"])
  .optional()
  .describe(
    "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
  );

const marketSchema = z
  .object({
    country: z
      .string()
      .regex(/^[A-Za-z]{2}$/)
      .describe("ISO country code, e.g. us, de."),
    lang: z
      .string()
      .min(2)
      .max(16)
      .describe("BCP-47 storefront language, e.g. en-US, de-DE."),
  })
  .strict();

type TrackedKeyword = {
  id: string;
  storeProvider: StoreProvider;
  keyword: string;
  country: string;
  lang: string;
};

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Resolve keyword strings (optionally per store/country) to tracked row ids. */
export function selectTrackedKeywordIds(
  tracked: TrackedKeyword[],
  selection: {
    keywords?: string[];
    trackedKeywordIds?: string[];
    storeProvider?: StoreProvider;
    countries?: string[];
  },
): { ids: string[]; missing: string[] } {
  const ids = new Set(selection.trackedKeywordIds ?? []);
  const known = new Set(tracked.map((row) => row.id));
  const missing = [...ids].filter((id) => !known.has(id));
  const countries = selection.countries?.map((country) =>
    country.toLowerCase(),
  );
  for (const keyword of selection.keywords ?? []) {
    const wanted = normalizeKeyword(keyword);
    const matches = tracked.filter(
      (row) =>
        normalizeKeyword(row.keyword) === wanted &&
        (!selection.storeProvider ||
          row.storeProvider === selection.storeProvider) &&
        (!countries || countries.includes(row.country.toLowerCase())),
    );
    if (!matches.length) missing.push(keyword);
    for (const row of matches) ids.add(row.id);
  }
  return { ids: [...ids].filter((id) => known.has(id)), missing };
}

function competitorIds(value: unknown): string[] {
  const competitors =
    value && typeof value === "object"
      ? (value as { competitors?: unknown }).competitors
      : undefined;
  return Array.isArray(competitors)
    ? competitors
        .map((entry) =>
          entry && typeof entry === "object"
            ? String((entry as { appId?: unknown }).appId ?? "")
            : "",
        )
        .filter(Boolean)
    : [];
}

export function registerKeywordTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "list_keywords",
    {
      title: "List Tracked Keywords",
      description:
        "Fetch the keywords tracked for a project in one store: rows with current rank, 7d/30d deltas, difficulty/traffic estimates, sparkline and competitor positions, plus a summary (tracked count, ranked count, average position, top-10 share), the plan's keyword limit, and trackedKeywords (every keyword × country row across all stores, with the row id used by remove_keywords and get_keyword_history). " +
        "Use this as the first read for any keyword conversation.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        storeProvider: storeProviderSchema,
      }),
    },
    async ({ projectId, storeProvider }) => {
      try {
        return ok(
          await client.listKeywords({ projectId, storeProvider }),
          "Fetched tracked keywords",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "list_keyword_competitors",
    {
      title: "List Keyword Competitors",
      description:
        "List the competitor apps configured for keyword tracking in one store (appId, name, developer, icon) plus the plan's competitor limit. These are the apps shown next to the user's app in the keyword monitor's competitor columns.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        storeProvider: storeProviderSchema,
      }),
    },
    async ({ projectId, storeProvider }) => {
      try {
        return ok(
          await client.listKeywordCompetitors({ projectId, storeProvider }),
          "Fetched keyword competitors",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "add_keywords",
    {
      title: "Add Tracked Keywords",
      description:
        "Track keywords for a project, in one or more storefronts. The store and app resolve on the server from the project's linked app (get_project: primaryStoreProvider, appleAppId / googlePlayPackageName); pass storeProvider only to track in the other store. " +
        "If the project has no linked store app, keywords are still tracked and show search results, but the user's own rank stays empty until an app is linked in the dashboard keyword page (or the project was created with create_project appStore). " +
        "Each keyword × country counts against the plan's keyword limit; a batch over the limit is rejected as a whole (error keyword_limit, nothing added). Rankings appear after the background scrape (usually within minutes).",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        keywords: z
          .array(z.string().min(1).max(100))
          .min(1)
          .max(50)
          .describe("Keyword strings to track. Normalized server-side."),
        storeProvider: storeProviderSchema,
        country: z
          .string()
          .regex(/^[A-Za-z]{2}$/)
          .optional()
          .describe(
            'Single storefront country. Defaults to "us". Ignored when countries is given.',
          ),
        lang: z
          .string()
          .min(2)
          .max(16)
          .optional()
          .describe('Language for the single country. Defaults to "en-US".'),
        countries: z
          .array(marketSchema)
          .min(1)
          .max(50)
          .optional()
          .describe(
            "Track every keyword in each of these storefronts (keywords × countries ≤ 250).",
          ),
        appId: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Rarely needed: the linked store app id. Must match the project's linked app; omit to use it.",
          ),
      }),
    },
    async ({
      projectId,
      keywords,
      appId,
      storeProvider,
      country,
      lang,
      countries,
    }) => {
      try {
        const result = await client.addKeywordsForProject({
          projectId,
          keywords,
          appId,
          storeProvider,
          ...(countries?.length
            ? {
                countries: countries.map((market) => ({
                  country: market.country.toLowerCase(),
                  lang: market.lang,
                })),
              }
            : { country: (country || "us").toLowerCase(), lang }),
        });
        return ok(
          {
            ...result,
            ...(result?.appId === null
              ? {
                  note: "The project has no linked store app, so these keywords have no own-app rank yet. The user can link the app on the project's keyword page.",
                }
              : {}),
          },
          `Tracking ${result?.added ?? keywords.length} keyword × country rows`,
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "remove_keywords",
    {
      title: "Remove Tracked Keywords",
      description:
        "Stop tracking keywords and delete their rank history. Only call when the user asked to remove these keywords. Select by trackedKeywordIds (row ids from list_keywords trackedKeywords) and/or by keyword text; keyword text matches every store and country unless storeProvider/countries narrow it. All-or-nothing: unknown ids are reported and nothing is deleted.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        keywords: z.array(z.string().min(1)).max(100).optional(),
        trackedKeywordIds: z.array(z.string().uuid()).max(500).optional(),
        storeProvider: z
          .enum(["app_store", "google_play"])
          .optional()
          .describe("Only remove keyword text in this store."),
        countries: z
          .array(z.string().regex(/^[A-Za-z]{2}$/))
          .max(50)
          .optional()
          .describe("Only remove keyword text in these countries."),
      }),
    },
    async ({ projectId, keywords, trackedKeywordIds, storeProvider, countries }) => {
      try {
        if (!keywords?.length && !trackedKeywordIds?.length) {
          throw new ToolInputError(
            "INVALID_TOOL_INPUT",
            "Provide keywords or trackedKeywordIds to remove.",
          );
        }
        const listing = await client.listKeywords({ projectId });
        const tracked = (
          Array.isArray(listing?.trackedKeywords) ? listing.trackedKeywords : []
        ) as TrackedKeyword[];
        const { ids, missing } = selectTrackedKeywordIds(tracked, {
          keywords,
          trackedKeywordIds,
          storeProvider,
          countries,
        });
        if (missing.length) {
          throw new ToolInputError(
            "INVALID_TOOL_INPUT",
            `Not tracked in this project: ${missing.join(", ")}. Nothing was removed; check list_keywords.`,
          );
        }
        if (!ids.length) {
          throw new ToolInputError(
            "INVALID_TOOL_INPUT",
            "No tracked keywords matched. Nothing was removed.",
          );
        }
        await client.removeKeywords(ids);
        const removed = tracked.filter((row) => ids.includes(row.id));
        return ok(
          { removed: removed.length, rows: removed },
          `Stopped tracking ${removed.length} keyword × country rows`,
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "suggest_keywords",
    {
      title: "Suggest Keywords",
      description:
        "AI keyword ideas for the project (from its name, category and description), excluding keywords already tracked in that store. Suggestions are not tracked until you call add_keywords with the ones the user wants.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        storeProvider: storeProviderSchema,
      }),
    },
    async ({ projectId, storeProvider }) => {
      try {
        return ok(
          await client.suggestKeywords({ projectId, storeProvider }),
          "Suggested keywords",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "suggest_keyword_competitors",
    {
      title: "Suggest Keyword Competitors",
      description:
        "Suggest competitor apps for one store: apps that rank high for many of the project's tracked keywords, plus apps found by searching the app's own name, each with a reason. Empty when nothing is tracked yet. Add the chosen ones with add_keyword_competitors.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        storeProvider: storeProviderSchema,
      }),
    },
    async ({ projectId, storeProvider }) => {
      try {
        return ok(
          await client.suggestKeywordCompetitors({ projectId, storeProvider }),
          "Suggested keyword competitors",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "add_keyword_competitors",
    {
      title: "Add Keyword Competitors",
      description:
        "Add competitor apps to the project's keyword tracking in one store, keeping existing ones. appIds are Apple numeric ids for app_store or package names for google_play (from suggest_keyword_competitors or the store). Rejected as a whole (competitor_limit) if the plan's competitor limit would be exceeded.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        appIds: z.array(z.string().min(1).max(255)).min(1).max(50),
        storeProvider: storeProviderSchema,
      }),
    },
    async ({ projectId, appIds, storeProvider }) => {
      try {
        const current = await client.listKeywordCompetitors({
          projectId,
          storeProvider,
        });
        const resolvedStore = (current?.storeProvider ??
          storeProvider ??
          "app_store") as StoreProvider;
        const existing = competitorIds(current);
        const next = [...new Set([...existing, ...appIds.map(String)])];
        const result = await client.replaceKeywordCompetitors({
          projectId,
          appIds: next,
          storeProvider: resolvedStore,
        });
        return ok(
          { ...result, added: next.length - existing.length },
          "Updated keyword competitors",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "remove_keyword_competitors",
    {
      title: "Remove Keyword Competitors",
      description:
        "Remove competitor apps from the project's keyword tracking in one store. Only call when the user asked to remove them. Unknown appIds are reported and nothing changes.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        appIds: z.array(z.string().min(1).max(255)).min(1).max(50),
        storeProvider: storeProviderSchema,
      }),
    },
    async ({ projectId, appIds, storeProvider }) => {
      try {
        const current = await client.listKeywordCompetitors({
          projectId,
          storeProvider,
        });
        const resolvedStore = (current?.storeProvider ??
          storeProvider ??
          "app_store") as StoreProvider;
        const existing = competitorIds(current);
        const unknown = appIds.filter((id) => !existing.includes(String(id)));
        if (unknown.length) {
          throw new ToolInputError(
            "INVALID_TOOL_INPUT",
            `Not a ${resolvedStore} competitor of this project: ${unknown.join(", ")}. Nothing was changed; check list_keyword_competitors.`,
          );
        }
        const remove = new Set(appIds.map(String));
        const result = await client.replaceKeywordCompetitors({
          projectId,
          appIds: existing.filter((id) => !remove.has(id)),
          storeProvider: resolvedStore,
        });
        return ok(
          { ...result, removed: remove.size },
          "Updated keyword competitors",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_keyword_history",
    {
      title: "Get Keyword History",
      description:
        "Fetch the rank time series for a single tracked keyword. Returns up to 30 days on Free and up to 365 days on Unlimited. " +
        "Pass appId to compute the history for a competitor app instead of the user's own app; defaults to the tracked keyword's owner app.",
      inputSchema: z.object({
        trackedKeywordId: z
          .string()
          .uuid()
          .describe(
            "The tracked-keyword row id (from list_keywords). Not the keyword string.",
          ),
        appId: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Optional store app id to compute history for. Defaults to the tracked keyword's app.",
          ),
      }),
    },
    async ({ trackedKeywordId, appId }) => {
      try {
        return ok(
          await client.getKeywordHistory({ trackedKeywordId, appId }),
          "Fetched keyword history",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
