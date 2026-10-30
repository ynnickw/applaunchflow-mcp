import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";

/**
 * Mirrors the dashboard's languageCodeSchema (src/shared/validation/schemas.ts,
 * SUPPORTED_LANGUAGES in src/shared/config/languages.ts): 51 codes.
 */
export const SUPPORTED_LANGUAGE_CODES = [
  "en",
  "en-GB",
  "en-AU",
  "en-CA",
  "es",
  "es-MX",
  "fr",
  "fr-CA",
  "de",
  "it",
  "pt",
  "pt-BR",
  "ja",
  "ko",
  "zh-CN",
  "zh-TW",
  "nl",
  "ru",
  "ar",
  "tr",
  "pl",
  "sv",
  "no",
  "da",
  "fi",
  "cs",
  "hi",
  "hu",
  "ro",
  "uk",
  "el",
  "he",
  "id",
  "ms",
  "th",
  "vi",
  "fil",
  "hr",
  "sk",
  "ca",
  "bn",
  "gu",
  "kn",
  "ml",
  "mr",
  "or",
  "pa",
  "sl",
  "ta",
  "te",
  "ur",
] as const;

export function registerLocalizationTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "translate_layouts",
    {
      title: "Translate Layouts",
      description:
        "Translates screenshot-layout text into requested languages while preserving composition and language-specific images. Requires an existing source layout. Re-running a target language re-syncs its design from the source and can replace manual target-language design tweaks. Subject to translation allowances.",
      inputSchema: z.object({
        generationId: z
          .string()
          .uuid()
          .describe("The project/generation UUID."),
        variantId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Variant to translate. If omitted, uses the active variant.",
          ),
        targetLanguages: z
          .array(z.enum(SUPPORTED_LANGUAGE_CODES))
          .min(1)
          .describe(
            "Array of target language codes (e.g. ['en', 'ja', 'de']). Use el for Greek (el-GR), he for Hebrew (iw-IL), fil for Filipino, or for Odia, pa for Punjabi. The source language is auto-detected and excluded.",
          ),
        layouts: z
          .array(z.enum(["mobile", "tablet", "desktop"]))
          .optional()
          .describe(
            "Which layout sizes to translate. Defaults to ['mobile', 'tablet']. Include 'desktop' only if the project has a desktop layout.",
          ),
      }),
    },
    async (args) => {
      try {
        const body = {
          ...args,
          layouts: args.layouts || ["mobile", "tablet"],
        };
        return ok(await client.translateLayouts(body), "Translated layouts");
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "list_translations",
    {
      title: "List Translations",
      description:
        "Lists available screenshot-layout translations and source-language metadata for a project or variant. Read-only.",
      inputSchema: z.object({
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      }),
    },
    async ({ generationId, variantId }) => {
      try {
        return ok(
          await client.getLayout({ generationId, variantId }),
          "Fetched translations",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
