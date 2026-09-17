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
    "prepare_release_capture",
    {
      title: "Prepare Release Capture",
      description:
        "Reserve a checksummed immutable CI capture. PUT the exact bytes to the returned upload URL with all returned headers, then complete_release_capture. This does not modify editor assets.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        name: z.string(),
        contentType: z.enum(["image/png", "image/jpeg"]),
        sizeBytes: z.number().int().positive(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        idempotencyKey: z.string().min(8).max(119),
      }),
    },
    async ({ idempotencyKey, ...input }) => {
      try {
        return ok(
          await client.createAsset(input, idempotencyKey),
          "Upload reserved",
        );
      } catch (e) {
        return fail(e);
      }
    },
  );
  server.registerTool(
    "complete_release_capture",
    {
      title: "Complete Release Capture",
      description:
        "Validate an immutable uploaded capture before using its asset ID in a release render.",
      inputSchema: z.object({
        assetId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(128),
      }),
    },
    async ({ assetId, idempotencyKey }) => {
      try {
        return ok(
          await client.completeAsset(assetId, idempotencyKey),
          "Capture validated",
        );
      } catch (e) {
        return fail(e);
      }
    },
  );
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
    "save_design_version",
    {
      title: "Save Design Version",
      description:
        "Save the current variant and its assets as a fixed design version. Returns a version ID and CI binding names, immediately usable for rendering.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z.string().uuid(),
        language: z.string(),
        name: z.string(),
        idempotencyKey: z.string().min(8).max(128),
      }),
    },
    async ({ idempotencyKey, ...input }) => {
      try {
        return ok(
          await client.saveDesignVersion(input, idempotencyKey),
          "Design version saved; ready to render",
        );
      } catch (e) {
        return fail(e);
      }
    },
  );
  server.registerTool(
    "get_design_version",
    {
      title: "Get Design Version",
      description:
        "Read a saved design version, its content hash and immutable capture/copy bindings.",
      inputSchema: z.object({ designVersionId: z.string().uuid() }),
    },
    async ({ designVersionId }) => {
      try {
        return ok(
          await client.getDesignVersion(designVersionId),
          "Fixed design version",
        );
      } catch (e) {
        return fail(e);
      }
    },
  );
  server.registerTool(
    "render_design_version",
    {
      title: "Render Design Version",
      description:
        "Render a saved design version with completed immutable capture asset IDs and localized copy. Every requested binding is required unless useDefaults is explicitly true. Reuse idempotencyKey for retries; never replace it after an uncertain outcome.",
      inputSchema: z.object({
        designVersionId: z.string().uuid(),
        formats: z.array(z.string()),
        languages: z.array(
          z.object({
            locale: z.string(),
            captures: z.record(z.string(), z.string().uuid()),
            copy: z.record(z.string(), z.string()),
            useDefaults: z.boolean().default(false),
          }),
        ),
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
