import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

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
  apply_screenshot_style: createOrAppend,
  generate_layouts: createOrAppend,
  list_source_screenshots: readOnly,
  list_screenshots: readOnly,
  view_screenshot: readOnly,
  get_layout: readOnly,
  save_layout: overwriteOrDelete,
  transform_layout: overwriteOrDelete,
  browse_templates: readOnly,
  prepare_social_graphics_styles: createOrAppend,
  apply_social_graphics_style: createOrAppend,
  browse_social_templates: readOnly,
  generate_graphics: createOrAppend,
  get_graphics: readOnly,
  get_graphics_format: readOnly,
  save_graphics: overwriteOrDelete,
  save_graphics_format: overwriteOrDelete,
  generate_promo_video: createOrAppend,
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
      callback as never,
    );
  }) as typeof server.registerTool;
}
