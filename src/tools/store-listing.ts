import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { ToolInputError } from "../telemetry.js";
import { fail, ok, startProgressHeartbeat } from "./utils.js";
import { variantEditorUrl } from "./variants.js";

/** Store character limits (dashboard src/lib/store-connect/limits.ts). */
const LIMITS = {
  promotionalText: 170,
  shortDescriptionIos: 30,
  shortDescriptionAndroid: 80,
  fullDescription: 4000,
  keywords: 100,
  whatsNew: 4000,
  appName: 30,
};

const listingFields = z
  .object({
    promotionalText: z
      .string()
      .max(LIMITS.promotionalText)
      .optional()
      .describe("App Store promotional text, max 170 characters."),
    shortDescription: z
      .string()
      .max(LIMITS.shortDescriptionAndroid)
      .optional()
      .describe(
        "iOS subtitle (max 30 characters) or Google Play short description (max 80).",
      ),
    fullDescription: z
      .string()
      .max(LIMITS.fullDescription)
      .optional()
      .describe("Full description, max 4000 characters."),
    keywords: z
      .string()
      .max(LIMITS.keywords)
      .optional()
      .describe("App Store keyword field: comma-separated, max 100 characters."),
    whatsNew: z
      .string()
      .max(LIMITS.whatsNew)
      .optional()
      .describe(
        "Release notes (App Store max 4000; Google Play max 500 per language).",
      ),
  })
  .strict();

const localizedFields = listingFields
  .extend({
    appName: z
      .string()
      .max(LIMITS.appName)
      .optional()
      .describe("Localized store name, max 30 characters."),
  })
  .strict();

type Copy = Record<string, any>;

/**
 * Overlay field edits on the saved listing. Untouched fields, AI insights and
 * other languages are kept exactly as saved.
 */
export function mergeStoreListing(
  current: Copy,
  fields: Record<string, unknown> | undefined,
  translations: Record<string, Record<string, unknown>> | undefined,
): { asoCopy: Copy; confirmedWhatsNewLanguages: string[] } {
  const asoCopy: Copy = { ...current, ...(fields ?? {}) };
  const confirmedWhatsNewLanguages: string[] = [];
  if (translations && Object.keys(translations).length) {
    const existing: Record<string, Copy> = { ...(current.translations ?? {}) };
    for (const [language, patch] of Object.entries(translations)) {
      if (!existing[language]) {
        throw new ToolInputError(
          "INVALID_TOOL_INPUT",
          `No ${language} translation exists yet. Create it with translate_store_listing, then edit it.`,
        );
      }
      existing[language] = { ...existing[language], ...patch };
      if (typeof patch.whatsNew === "string")
        confirmedWhatsNewLanguages.push(language);
    }
    asoCopy.translations = existing;
  }
  return { asoCopy, confirmedWhatsNewLanguages };
}

export function registerStoreListingTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  const editorUrl = (projectId: string, variantId?: string | null) =>
    variantId
      ? variantEditorUrl(client.credentials.baseUrl, "asoCopy", projectId, variantId)
      : new URL(
          `/asocopy?projectId=${encodeURIComponent(projectId)}`,
          client.credentials.baseUrl,
        ).href;

  server.registerTool(
    "get_store_listing",
    {
      title: "Get Store Listing Text",
      description:
        "Read the project's App Store / Google Play listing text (ASO copy): promotionalText, shortDescription (iOS subtitle / Play short description), fullDescription, keywords, whatsNew, suggested category, AI insights, and translations keyed by language. Returns asoCopy:null when none was generated yet (use generate_store_listing). Reads the active listing variant unless variantId is given.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      }),
    },
    async ({ projectId, variantId }) => {
      try {
        const result = await client.getAsoCopy(projectId, variantId);
        return ok(
          { ...result, editorUrl: editorUrl(projectId, variantId) },
          result?.asoCopy ? "Fetched store listing" : "No store listing yet",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "generate_store_listing",
    {
      title: "Generate Store Listing Text",
      description:
        "AI-write the store listing text (promotional text, subtitle/short description, full description, keywords, category) from the project's app details, optionally informed by competitor apps. Saves it as a NEW active listing variant (the previous one is kept unless replaceVariantId is given with the user's approval) and returns it with the editor URL. Takes up to a minute.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        competitorAppIds: z
          .array(z.string().min(1).max(255))
          .max(20)
          .optional()
          .describe(
            "Competitor store app ids to analyze (Apple numeric ids or Play package names).",
          ),
        competitorStoreProvider: z
          .enum(["app_store", "google_play"])
          .optional()
          .describe("Store of competitorAppIds. Defaults to app_store."),
        replaceVariantId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Retire this existing listing variant after the new one saves. Only with explicit user approval.",
          ),
      }),
    },
    async (
      { projectId, competitorAppIds, competitorStoreProvider, replaceVariantId },
      ctx,
    ) => {
      const stop = startProgressHeartbeat(ctx, "Writing store listing text");
      try {
        const result = await client.generateAsoCopy({
          generationId: projectId,
          ...(competitorAppIds?.length
            ? {
                competitorTargets: competitorAppIds.map((appId) => ({
                  appId,
                  storeProvider: competitorStoreProvider ?? "app_store",
                })),
              }
            : {}),
          ...(competitorStoreProvider ? { competitorStoreProvider } : {}),
          ...(replaceVariantId ? { replaceVariantId } : {}),
        });
        return ok(
          { ...result, editorUrl: editorUrl(projectId, result?.variantId) },
          "Generated store listing",
        );
      } catch (error) {
        return fail(error);
      } finally {
        stop();
      }
    },
  );

  server.registerTool(
    "update_store_listing",
    {
      title: "Update Store Listing Text",
      description:
        "Edit store listing text. Pass only the fields to change: fields edits the source language, translations edits existing languages ({ \"de\": { \"promotionalText\": \"...\" } }). Everything else (other fields, insights, other languages) is kept as saved. Enforces store character limits. Edits the active listing variant unless variantId is given. Editing the source text does not re-translate; call translate_store_listing for that.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        fields: listingFields.optional(),
        translations: z
          .record(z.string().min(2).max(35), localizedFields)
          .optional(),
      }),
    },
    async ({ projectId, variantId, fields, translations }) => {
      try {
        if (
          !Object.keys(fields ?? {}).length &&
          !Object.keys(translations ?? {}).length
        ) {
          throw new ToolInputError(
            "INVALID_TOOL_INPUT",
            "Provide fields and/or translations to change.",
          );
        }
        const current = await client.getAsoCopy(projectId, variantId);
        if (!current?.asoCopy) {
          throw new ToolInputError(
            "INVALID_TOOL_INPUT",
            "This project has no store listing text yet. Call generate_store_listing first.",
          );
        }
        const { asoCopy, confirmedWhatsNewLanguages } = mergeStoreListing(
          current.asoCopy,
          fields,
          translations,
        );
        await client.updateAsoCopy({
          generationId: projectId,
          ...(variantId ? { variantId } : {}),
          asoCopy,
          ...(confirmedWhatsNewLanguages.length
            ? { confirmedWhatsNewLanguages }
            : {}),
        });
        const saved = await client.getAsoCopy(projectId, variantId);
        return ok(
          { asoCopy: saved?.asoCopy, editorUrl: editorUrl(projectId, variantId) },
          "Updated store listing",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "translate_store_listing",
    {
      title: "Translate Store Listing Text",
      description:
        "AI-translate the store listing text into other languages (adds or refreshes translations; languages whose source text did not change are skipped). Each new language counts against the plan's translation limit. Language codes: en, en-GB, en-AU, en-CA, es, es-MX, fr, fr-CA, de, it, pt, pt-BR, ja, ko, zh-CN, zh-TW, nl, ru, ar, tr, pl, sv, no, da, fi, cs, hi, hu, ro, uk, el, he, id, ms, th, vi, fil, hr, sk, ca, bn, gu, kn, ml, mr, or, pa, sl, ta, te, ur.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        targetLanguages: z.array(z.string().min(2).max(35)).min(1).max(60),
      }),
    },
    async ({ projectId, variantId, targetLanguages }, ctx) => {
      const stop = startProgressHeartbeat(ctx, "Translating store listing");
      try {
        const result = await client.translateAsoCopy({
          generationId: projectId,
          ...(variantId ? { variantId } : {}),
          targetLanguages,
        });
        return ok(
          { ...result, editorUrl: editorUrl(projectId, variantId) },
          "Translated store listing",
        );
      } catch (error) {
        return fail(error);
      } finally {
        stop();
      }
    },
  );
}
