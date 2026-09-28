import assert from "node:assert/strict";
import test from "node:test";
import type { McpServer } from "@modelcontextprotocol/server";
import type { AppLaunchFlowClient } from "./client/api.js";
import { registerLocalizationTools } from "./tools/localization.js";

test("translation tool accepts every editor language and forwards it unchanged", async () => {
  const languages = [
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
  ];
  let sent: unknown;
  let run: (() => Promise<void>) | undefined;
  const server = {
    registerTool(
      name: string,
      config: {
        inputSchema: {
          parse: (value: unknown) => unknown;
          safeParse: (value: unknown) => { success: boolean };
        };
      },
      handler: (args: unknown) => Promise<unknown>,
    ) {
      if (name !== "translate_layouts") return;
      run = async () => {
        const input = {
          generationId: "00000000-0000-4000-8000-000000000001",
          targetLanguages: languages,
        };
        await handler(config.inputSchema.parse(input));
        assert.deepEqual(sent, { ...input, layouts: ["mobile", "tablet"] });
        assert.equal(
          config.inputSchema.safeParse({
            ...input,
            targetLanguages: ["invalid"],
          }).success,
          false,
        );
      };
    },
  };
  registerLocalizationTools(
    server as unknown as McpServer,
    {
      translateLayouts: async (body: unknown) => {
        sent = body;
        return {};
      },
    } as unknown as AppLaunchFlowClient,
  );
  assert.ok(run);
  await run();
});
