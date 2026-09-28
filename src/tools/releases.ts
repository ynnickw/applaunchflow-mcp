import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { AppLaunchFlow, type FormatId } from "../client/official.js";
import type { AppLaunchFlowClient } from "../client/api.js";
import { ok, fail } from "./utils.js";
export function registerReleaseTools(
  server: McpServer,
  base: AppLaunchFlowClient,
) {
  const client = new AppLaunchFlow(base.credentials);
  server.registerTool(
    "list_export_formats",
    {
      title: "List Export Formats",
      description:
        "List supported store dimensions and locales for validated Fastlane packages.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return ok(await client.formats(), "Supported export formats");
      } catch (e) {
        return fail(e);
      }
    },
  );
  server.registerTool(
    "render_screenshots",
    {
      title: "Render Screenshots",
      description:
        "Render the saved translations of the active screenshot variant (or a specified existing variant). Use list_export_formats for sizes. Set resolutions['android.phone'] to {preset:'preview'} for 1290x2796 or {preset:'play-high'} for 2160x3840 (default). Any requested format can use exact custom {width,height} (320-8192 pixels); custom sizes may not satisfy store requirements. Presets follow layout orientation. One resolution per format per request. Update captures and copy through the normal asset and layout tools first. Reuse idempotencyKey for retries; never replace it after an uncertain outcome.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        formats: z.array(z.string()),
        resolutions: z
          .record(
            z.string(),
            z.union([
              z.object({ preset: z.enum(["play-high", "preview"]) }).strict(),
              z
                .object({
                  width: z.number().int().min(320).max(8192),
                  height: z.number().int().min(320).max(8192),
                })
                .strict(),
            ]),
          )
          .optional(),
        languages: z.array(z.string()),
        idempotencyKey: z.string().min(8).max(128),
      }),
    },
    async ({ idempotencyKey, formats, ...input }) => {
      try {
        return ok(
          await client.createRender(
            { ...input, formats: formats as FormatId[], package: "fastlane" },
            idempotencyKey,
          ),
          "Render accepted; poll its status",
        );
      } catch (e) {
        return fail(e);
      }
    },
  );
  server.registerTool(
    "get_release_render",
    {
      title: "Get Release Render",
      description:
        "Poll a render. Only succeeded renders provide a validated manifest and short-lived package download URL. Failed or indeterminate jobs must not be retried with a new key automatically.",
      inputSchema: z.object({ renderId: z.string().uuid() }),
    },
    async ({ renderId }) => {
      try {
        const render = await client.getRender(renderId);
        return ok(
          {
            ...render,
            ...(render.status === "succeeded"
              ? {
                  manifest: await client.getManifest(renderId),
                  download: await client.getDownload(renderId),
                }
              : {}),
          },
          "Release render status",
        );
      } catch (e) {
        return fail(e);
      }
    },
  );
}
