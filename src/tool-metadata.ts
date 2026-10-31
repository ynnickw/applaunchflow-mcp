import type { McpServer, ToolAnnotations } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  requestTelemetry,
  requestErrorCategory,
  runWithRequestSignal,
  needsWidgetFallback,
} from "./request-context.js";
import { cursorWidgetResult } from "./widget-result.js";
import { captureMcpTool } from "./mcp-analytics.js";
import { toolErrorCategory } from "./telemetry.js";

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
  get_editing_reference: readOnly,
  list_export_formats: readOnly,
  render_screenshots: { ...createOrAppend, idempotentHint: true },
  get_release_render: readOnly,
  list_projects: readOnly,
  get_project: readOnly,
  create_project: createOrAppend,
  delete_project: overwriteOrDelete,
  upload_screenshots: { ...overwriteOrDelete, openWorldHint: true },
  list_illustrations: readOnly,
  list_assets: readOnly,
  list_asset_folders: readOnly,
  delete_assets: overwriteOrDelete,
  replace_asset: overwriteOrDelete,
  create_asset_folder: createOrAppend,
  rename_asset_folder: overwriteOrDelete,
  delete_asset_folder: overwriteOrDelete,
  move_assets: overwriteOrDelete,
  set_asset_folder_locale: overwriteOrDelete,
  upload_asset: openWorldCreate,
  prepare_asset_upload: createOrAppend,
  prepare_screenshot_styles: createOrAppend,
  apply_screenshot_style: createOrAppend,
  list_source_screenshots: readOnly,
  list_screenshots: readOnly,
  view_screenshot: readOnly,
  // Renders on the server but never changes a design.
  preview_screenshots: { ...readOnly, idempotentHint: false },
  list_fonts: readOnly,
  apply_locale_screenshots: overwriteOrDelete,
  sync_layout: overwriteOrDelete,
  search_stock_photos: { ...readOnly, openWorldHint: true },
  import_stock_photo: openWorldCreate,
  store_review_snapshot: createOrAppend,
  view_review_snapshot: readOnly,
  get_layout: readOnly,
  save_layout: overwriteOrDelete,
  transform_layout: overwriteOrDelete,
  browse_templates: readOnly,
  prepare_social_graphics_styles: createOrAppend,
  apply_social_graphics_style: createOrAppend,
  browse_social_templates: readOnly,
  get_graphics: readOnly,
  get_graphics_format: readOnly,
  save_graphics: overwriteOrDelete,
  save_graphics_format: overwriteOrDelete,
  translate_graphics: overwriteOrDelete,
  list_graphics_translations: readOnly,
  transform_graphics: overwriteOrDelete,
  update_graphics_settings: overwriteOrDelete,
  // Preview is free; export uses the export allowance. Neither edits designs.
  render_graphics: createOrAppend,
  generate_promo_video: createOrAppend,
  get_promo_video_generation: readOnly,
  // Optional replacement retires the previous variant after saving the new one.
  apply_promo_video_candidate: overwriteOrDelete,
  get_promo_video: readOnly,
  update_promo_video: overwriteOrDelete,
  clear_promo_video: overwriteOrDelete,
  // Re-translating an existing language overwrites that translation's edits.
  translate_promo_video: overwriteOrDelete,
  preview_promo_video: readOnly,
  // Uses one API export; the idempotency key makes retries safe.
  export_promo_video: { ...createOrAppend, idempotentHint: true },
  get_promo_video_export: readOnly,
  create_mockup_animation: createOrAppend,
  get_mockup_animation: readOnly,
  update_mockup_animation: overwriteOrDelete,
  list_mockup_media: readOnly,
  list_mockup_presets: readOnly,
  // Server renders (Lambda) but changes no user content.
  preview_mockup_animation: { ...readOnly, idempotentHint: false },
  export_mockup_animation: { ...createOrAppend, idempotentHint: true },
  get_mockup_animation_export: readOnly,
  generate_mockup_motion: { ...readOnly, idempotentHint: false },
  // Re-running for an existing language re-syncs its design from the source.
  translate_layouts: overwriteOrDelete,
  list_translations: readOnly,
  list_variants: readOnly,
  create_variant: createOrAppend,
  duplicate_variant: createOrAppend,
  // Switching back is always possible; nothing is removed.
  set_active_variant: { ...createOrAppend, idempotentHint: true },
  delete_variant: overwriteOrDelete,
  list_keywords: readOnly,
  list_keyword_competitors: readOnly,
  add_keywords: createOrAppend,
  remove_keywords: overwriteOrDelete,
  // AI suggestions write nothing, but repeated calls differ.
  suggest_keywords: { ...readOnly, idempotentHint: false },
  suggest_keyword_competitors: readOnly,
  add_keyword_competitors: { ...createOrAppend, idempotentHint: true },
  remove_keyword_competitors: overwriteOrDelete,
  get_keyword_history: readOnly,
  get_website: readOnly,
  save_website_pages: overwriteOrDelete,
  get_store_listing: readOnly,
  // Optional replaceVariantId retires the previous listing variant.
  generate_store_listing: overwriteOrDelete,
  update_store_listing: overwriteOrDelete,
  // Refreshes existing translations whose source text changed.
  translate_store_listing: overwriteOrDelete,
  get_capabilities: readOnly,
  get_plan_usage: readOnly,
};

/**
 * Design tools name the project id `generationId` (the dashboard's legacy
 * name); project tools call it `projectId`. Accept either on every tool that
 * takes generationId and say so in the schema, so agents never have to guess.
 */
export function withProjectIdAlias(inputSchema: unknown): {
  schema: unknown;
  aliased: boolean;
} {
  const shape = (inputSchema as { shape?: Record<string, z.ZodType> })?.shape;
  if (
    !(inputSchema instanceof z.ZodObject) ||
    !shape?.generationId ||
    shape.projectId
  )
    return { schema: inputSchema, aliased: false };
  const field = shape.generationId;
  const optional = field.safeParse(undefined).success;
  const note =
    "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.";
  const base = (field as { description?: string }).description;
  const description = base && !/projectId/.test(base) ? `${note} ${base}` : base ?? note;
  const generationId = (optional ? field : field.optional()).describe(
    description,
  );
  const projectId = z
    .string()
    .uuid()
    .optional()
    .describe("Alias of generationId (the project id).");
  // safeExtend keeps refinements that some tool schemas already carry.
  const object = inputSchema as z.ZodObject & {
    safeExtend?: (shape: Record<string, z.ZodType>) => z.ZodObject;
  };
  let schema = object.safeExtend
    ? object.safeExtend({ generationId, projectId })
    : object.extend({ generationId, projectId });
  if (!optional)
    schema = schema.refine(
      (value: Record<string, unknown>) =>
        Boolean(value.generationId || value.projectId),
      { message: "generationId (the project id) is required", path: ["generationId"] },
    ) as unknown as typeof schema;
  schema = schema.refine(
    (value: Record<string, unknown>) =>
      !value.generationId ||
      !value.projectId ||
      value.generationId === value.projectId,
    { message: "generationId and projectId must be the same project id", path: ["projectId"] },
  ) as unknown as typeof schema;
  return { schema, aliased: true };
}

/** Map the projectId alias onto generationId before the tool handler runs. */
export function resolveProjectIdAlias(args: unknown): unknown {
  if (!args || typeof args !== "object") return args;
  const { projectId, ...rest } = args as Record<string, unknown>;
  if (projectId === undefined) return args;
  return { ...rest, generationId: rest.generationId ?? projectId };
}

/** Tools whose result is image content; see the outputSchema note below. */
const IMAGE_RESULT_TOOLS = new Set([
  "view_review_snapshot",
  "preview_mockup_animation",
  "preview_screenshots",
  "preview_promo_video",
]);

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
  // Cursor validates structuredContent before forwarding it to embedded apps.
  // The optional compatibility payload must be part of the advertised schema.
  widgetDataJson: z.string().optional(),
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
    const alias = withProjectIdAlias(config.inputSchema);
    const originalCallback = callback as (
      ...args: unknown[]
    ) => unknown | Promise<unknown>;
    const toolCallback = alias.aliased
      ? (input: unknown, ...rest: unknown[]) =>
          originalCallback(resolveProjectIdAlias(input), ...rest)
      : originalCallback;
    const instrumentedCallback = async (...args: unknown[]) => {
      const startedAt = performance.now();
      const context = args[1] as
        { mcpReq?: { signal?: AbortSignal } } | undefined;

      try {
        const result = await runWithRequestSignal(context?.mcpReq?.signal, () =>
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
        void captureMcpTool({
          tool: name,
          outcome: isError ? "error" : "success",
          durationMs: Math.round(performance.now() - startedAt),
          ...(isError ? { category: toolErrorCategory(result) } : {}),
        });
        return needsWidgetFallback() ? cursorWidgetResult(result) : result;
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "mcp_tool",
            ...requestTelemetry(),
            tool: name,
            outcome: "exception",
            durationMs: Math.round(performance.now() - startedAt),
            errorCategory: requestErrorCategory(error, context?.mcpReq?.signal),
          }),
        );
        void captureMcpTool({
          tool: name,
          outcome: "exception",
          durationMs: Math.round(performance.now() - startedAt),
          category: requestErrorCategory(error, context?.mcpReq?.signal),
        });
        throw error;
      }
    };

    return registerTool(
      name,
      {
        ...config,
        title: typeof config.title === "string" ? config.title : name.replaceAll("_", " "),
        ...(alias.aliased ? { inputSchema: alias.schema } : {}),
        annotations: {
          ...((config.annotations || {}) as ToolAnnotations),
          ...annotations,
          title: typeof config.title === "string" ? config.title : name.replaceAll("_", " "),
        },
        // Image-only tools must not advertise JSON output: structured-output
        // clients can otherwise unwrap that JSON and discard sibling PNG bytes.
        ...(IMAGE_RESULT_TOOLS.has(name)
          ? {}
          : { outputSchema: config.outputSchema || GENERIC_OUTPUT_SCHEMA }),
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
