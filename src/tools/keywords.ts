import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";

const storeProviderSchema = z
  .enum(["app_store", "google_play"])
  .optional()
  .describe(
    "Which store to read. Defaults to the project's primary store provider.",
  );

export function registerKeywordTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "list_keywords",
    {
      title: "List Tracked Keywords",
      description:
        "Fetch the keywords currently tracked for a project, including current rank, 7d/30d deltas, difficulty/traffic estimates, sparkline, competitor positions, and a summary (tracked count, ranked count, average position, top-10 share). " +
        "Use this as the first read for any keyword/ASO conversation.",
      inputSchema: {
        projectId: z.string().uuid(),
        storeProvider: storeProviderSchema,
      },
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
        "List the competitor apps configured for keyword tracking on a project (name, developer, icon) plus the user's plan-based competitor limit. " +
        "These are the apps shown alongside the user's app in the keyword monitor's competitor columns.",
      inputSchema: {
        projectId: z.string().uuid(),
        storeProvider: storeProviderSchema,
      },
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
        "Add one or more keywords to track for a project's linked app. Up to 50 keywords per call. " +
        "If appId or storeProvider is omitted, both are resolved from the project (primaryStoreProvider + appleAppId / googlePlayPackageName). " +
        "Returns 402 with error \"keyword_limit\" if the user's plan limit would be exceeded.",
      inputSchema: {
        projectId: z.string().uuid(),
        keywords: z
          .array(z.string().min(1))
          .min(1)
          .max(50)
          .describe("Keyword strings to track. Normalized server-side."),
        appId: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Store app id (Apple numeric id or Google package name). Auto-resolved from the project when omitted.",
          ),
        storeProvider: z
          .enum(["app_store", "google_play"])
          .optional()
          .describe(
            "Store to track in. Defaults to the project's primaryStoreProvider.",
          ),
        country: z
          .string()
          .length(2)
          .optional()
          .describe("ISO country code, lowercase. Defaults to \"us\"."),
        lang: z
          .string()
          .min(2)
          .max(16)
          .optional()
          .describe("BCP-47 language tag. Defaults to \"en-US\"."),
      },
    },
    async ({ projectId, keywords, appId, storeProvider, country, lang }) => {
      try {
        let resolvedStoreProvider = storeProvider;
        let resolvedAppId = appId;
        if (!resolvedAppId || !resolvedStoreProvider) {
          const project = await client.getProject(projectId);
          resolvedStoreProvider =
            resolvedStoreProvider ??
            (project?.primaryStoreProvider as
              | "app_store"
              | "google_play"
              | undefined) ??
            "app_store";
          if (!resolvedAppId) {
            resolvedAppId =
              resolvedStoreProvider === "google_play"
                ? project?.googlePlayPackageName
                : project?.appleAppId
                  ? String(project.appleAppId)
                  : undefined;
          }
        }
        if (!resolvedAppId) {
          return fail(
            new Error(
              `Project has no linked ${resolvedStoreProvider === "google_play" ? "Google Play package" : "Apple app id"}. ` +
                "Link the app in the project settings or pass appId explicitly.",
            ),
          );
        }
        return ok(
          await client.addKeywords({
            projectId,
            appId: resolvedAppId,
            keywords,
            storeProvider: resolvedStoreProvider,
            country: country?.toLowerCase(),
            lang,
          }),
          "Added tracked keywords",
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
        "Fetch the rank time series for a single tracked keyword. Returns up to 30 days on Free and up to 365 days on Pro. " +
        "Pass appId to compute the history for a competitor app instead of the user's own app — defaults to the tracked keyword's owner app.",
      inputSchema: {
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
      },
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
