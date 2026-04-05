import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";

const SUPPORTED_LANGUAGE_CODES = [
  "en", "es", "fr", "de", "it", "pt", "pt-BR", "ja", "ko",
  "zh-CN", "zh-TW", "nl", "ru", "ar", "tr", "pl", "sv",
  "no", "da", "fi", "cs", "hi", "hu", "ro", "uk",
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
        "Translate screenshot layouts into one or more target languages using AI. " +
        "This is the PREFERRED way to localize screenshots — do NOT manually edit text nodes for translation. " +
        "The backend translates all text in the layout while preserving positioning, styling, and screenshots. " +
        "Requires a source layout to already exist (generate_layouts must have been called first).",
      inputSchema: {
        generationId: z.string().uuid().describe("The project/generation UUID."),
        variantId: z
          .string()
          .uuid()
          .optional()
          .describe("Variant to translate. If omitted, uses the active variant."),
        targetLanguages: z
          .array(z.enum(SUPPORTED_LANGUAGE_CODES))
          .min(1)
          .describe(
            "Array of target language codes (e.g. ['en', 'ja', 'de']). The source language is auto-detected and excluded.",
          ),
        layouts: z
          .array(z.enum(["mobile", "tablet", "desktop"]))
          .optional()
          .describe(
            "Which layout sizes to translate. Defaults to ['mobile', 'tablet']. Include 'desktop' only if the project has a desktop layout.",
          ),
      },
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
        "List available translations for a project variant. Returns which languages have been translated.",
      inputSchema: {
        generationId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      },
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
