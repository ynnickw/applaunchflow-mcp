import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { requestTelemetry, runWithRequestSignal } from "./request-context.js";
import { errorCategory, toolErrorCategory } from "./telemetry.js";

const readOnly: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const createOrAppend: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

const overwriteOrDelete: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

const openWorldCreate: ToolAnnotations = {
  ...createOrAppend,
  openWorldHint: true,
};

export const TOOL_ANNOTATIONS: Record<string, ToolAnnotations> = {
  list_projects: readOnly,
  get_project: readOnly,
  create_project: createOrAppend,
  delete_project: overwriteOrDelete,
  upload_screenshots: openWorldCreate,
  list_illustrations: readOnly,
  upload_asset: openWorldCreate,
  prepare_screenshot_styles: createOrAppend,
  render_screenshot_picker: readOnly,
  apply_screenshot_style: createOrAppend,
  list_source_screenshots: readOnly,
  list_screenshots: readOnly,
  view_screenshot: readOnly,
  get_layout: readOnly,
  save_layout: overwriteOrDelete,
  transform_layout: overwriteOrDelete,
  browse_templates: readOnly,
  prepare_social_graphics_styles: createOrAppend,
  apply_social_graphics_style: createOrAppend,
  render_social_graphics_picker: readOnly,
  browse_social_templates: readOnly,
  get_graphics: readOnly,
  get_graphics_format: readOnly,
  save_graphics: overwriteOrDelete,
  save_graphics_format: overwriteOrDelete,
  generate_promo_video: createOrAppend,
  render_promo_video_picker: readOnly,
  apply_promo_video_candidate: createOrAppend,
  get_promo_video: readOnly,
  update_promo_video: overwriteOrDelete,
  clear_promo_video: overwriteOrDelete,
  create_mockup_animation: createOrAppend,
  get_mockup_animation: readOnly,
  update_mockup_animation: overwriteOrDelete,
  list_mockup_media: readOnly,
  list_mockup_presets: readOnly,
  translate_layouts: createOrAppend,
  list_translations: readOnly,
  list_variants: readOnly,
  create_variant: createOrAppend,
  duplicate_variant: createOrAppend,
  list_keywords: readOnly,
  list_keyword_competitors: readOnly,
  add_keywords: createOrAppend,
  get_keyword_history: readOnly,
};

const OAUTH_SECURITY_SCHEME = {
  type: "oauth2",
  scopes: [
    "projects:read",
    "projects:write",
    "assets:write",
    "generations:write",
  ],
};

const GENERIC_OUTPUT_SCHEMA = {
  success: z.boolean(),
  data: z.unknown().optional(),
  message: z.string().optional(),
  error: z.unknown().optional(),
};

/**
 * Apply the submission metadata contract centrally so local and hosted
 * transports cannot silently drift. Registration throws when a new tool is
 * added without an explicit safety classification.
 */
export function installToolMetadataPolicy(
  server: McpServer,
  options: { hosted?: boolean } = {},
): void {
  const registerTool = server.registerTool.bind(server);

  server.registerTool = ((
    name: string,
    config: Record<string, unknown>,
    callback: unknown,
  ) => {
    const annotations = TOOL_ANNOTATIONS[name];
    if (!annotations) {
      throw new Error(`Missing tool safety annotations for ${name}`);
    }

    const existingMeta = (config._meta || {}) as Record<string, unknown>;
    const toolCallback = callback as (
      ...args: unknown[]
    ) => unknown | Promise<unknown>;
    const instrumentedCallback = async (...args: unknown[]) => {
      const startedAt = performance.now();
      const extra = args[1] as { signal?: AbortSignal } | undefined;

      try {
        const result = await runWithRequestSignal(extra?.signal, () =>
          toolCallback(...args),
        );
        const isError =
          typeof result === "object" &&
          result !== null &&
          (result as { isError?: boolean }).isError === true;
        const log = isError ? console.warn : console.log;
        log(
          JSON.stringify({
            event: "mcp_tool",
            ...requestTelemetry(),
            tool: name,
            outcome: isError ? "error" : "success",
            durationMs: Math.round(performance.now() - startedAt),
            ...(isError ? { errorCategory: toolErrorCategory(result) } : {}),
          }),
        );
        return result;
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "mcp_tool",
            ...requestTelemetry(),
            tool: name,
            outcome: "exception",
            durationMs: Math.round(performance.now() - startedAt),
            errorCategory: errorCategory(error),
          }),
        );
        throw error;
      }
    };

    return registerTool(
      name,
      {
        ...config,
        annotations: {
          ...((config.annotations || {}) as ToolAnnotations),
          ...annotations,
        },
        outputSchema: config.outputSchema || GENERIC_OUTPUT_SCHEMA,
        _meta: {
          ...existingMeta,
          ...(options.hosted
            ? { securitySchemes: [OAUTH_SECURITY_SCHEME] }
            : {}),
        },
      } as never,
      instrumentedCallback as never,
    );
  }) as typeof server.registerTool;
}
