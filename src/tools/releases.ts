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
        "Lists screenshot export formats, device families, platforms, authored dimensions and available resolution presets. Read-only.",
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
        "Starts a render of saved screenshot translations for the active or specified variant. Supports preset or custom dimensions, independent phone-format layouts and at most ten screens per validated iOS package. Uses export allowance. Repeated requests with the same idempotencyKey reuse the original request.",
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
        "Returns the status, progress and available download artifacts of an existing screenshot render job. Read-only.",
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
