import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { ToolInputError } from "../telemetry.js";
import { openUrl, fail, ok } from "./utils.js";

const contentTypeEnum = z.enum([
  "screenshots",
  "socialGraphics",
  "promoVideo",
  "mockups",
  "website",
]);
type ContentType = z.infer<typeof contentTypeEnum>;

const EDITOR_PATHS: Record<string, string> = {
  screenshots: "/editor",
  socialGraphics: "/graphics",
  promoVideo: "/promovideo",
  mockups: "/mockups",
  website: "/website",
  asoCopy: "/asocopy",
  appIcon: "/icon-composer",
};

/** Absolute editor URL for one variant (same routes the dashboard hub uses). */
export function variantEditorUrl(
  baseUrl: string,
  contentType: string,
  projectId: string,
  variantId: string,
): string | undefined {
  const path = EDITOR_PATHS[contentType];
  if (!path) return undefined;
  const params = new URLSearchParams({ projectId, variantId });
  if (contentType === "screenshots") params.set("device", "phone");
  return new URL(`${path}?${params.toString()}`, baseUrl).href;
}

const projectIdField = z
  .string()
  .uuid()
  .describe(
    "Project id (list_projects/get_project); design tools call it generationId.",
  );

type VariantSummary = {
  id: string;
  label?: string;
  is_active?: boolean;
  has_content?: boolean;
  ready?: boolean;
};

async function findVariant(
  client: AppLaunchFlowClient,
  projectId: string,
  contentType: ContentType,
  variantId: string,
) {
  const list = (await client.listVariants(projectId, contentType)) as {
    variants?: VariantSummary[];
  };
  const variants = Array.isArray(list?.variants) ? list.variants : [];
  const variant = variants.find((entry) => entry.id === variantId);
  if (!variant) {
    throw new ToolInputError(
      "INVALID_TOOL_INPUT",
      `Variant ${variantId} is not a ${contentType} variant of project ${projectId}. Call list_variants for valid ids.`,
    );
  }
  return { variant, variants };
}

export function registerVariantTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "list_variants",
    {
      title: "List Variants",
      description:
        "List the variants of one content type in a project, newest first, with the active one. has_content=false marks an empty variant (created but never designed); ready marks variants the user flagged as ready. The active variant is what the hub shows and what render_screenshots exports by default.",
      inputSchema: z.object({
        generationId: z.string().uuid(),
        contentType: contentTypeEnum,
      }),
    },
    async ({ generationId, contentType }) => {
      try {
        return ok(
          await client.listVariants(generationId, contentType),
          "Fetched variants",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "create_variant",
    {
      title: "Create Empty Variant",
      description:
        "Create an EMPTY variant: a blank, named slot with no design. It does not generate or copy anything and counts against the plan's variant limit. " +
        "For a new AI-generated design use prepare_screenshot_styles, prepare_social_graphics_styles, generate_promo_video or create_mockup_animation instead (each creates its own variant). To try changes without touching the current design, use duplicate_variant. " +
        "An empty variant is only useful when you will fill it yourself (e.g. save_layout / save_graphics / update_promo_video / update_mockup_animation with its variantId). It is never made active: activate it with set_active_variant after it has content.",
      inputSchema: z.object({
        generationId: z.string().uuid(),
        contentType: contentTypeEnum,
        label: z.string().optional(),
        setActive: z
          .boolean()
          .optional()
          .describe(
            "Not supported: an empty active variant would replace what the hub shows and what render_screenshots exports. Fill the variant, then call set_active_variant.",
          ),
      }),
    },
    async (args, ctx) => {
      try {
        if (args.setActive) {
          throw new ToolInputError(
            "INVALID_TOOL_INPUT",
            "create_variant creates an empty variant and cannot make it active. Create it without setActive, fill it, then call set_active_variant.",
          );
        }
        const result = await client.createVariant({
          generationId: args.generationId,
          contentType: args.contentType,
          label: args.label,
        });
        const variantId = result?.variant?.id;
        const editorUrl = variantId
          ? variantEditorUrl(
              client.credentials.baseUrl,
              args.contentType,
              args.generationId,
              variantId,
            )
          : undefined;

        if (editorUrl) {
          await openUrl(
            server,
            editorUrl,
            "Opening the new empty variant in the editor.",
            { signal: ctx.mcpReq.signal },
          );
        }

        return ok(
          {
            ...result,
            empty: true,
            ...(editorUrl ? { editorUrl } : {}),
            note:
              result?.variant?.is_active === true
                ? "This is the project's first variant of this type, so the dashboard made it active. It is empty until you save content into it."
                : "Empty and inactive. Save content into it with its variantId, then call set_active_variant.",
          },
          "Created empty variant",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "duplicate_variant",
    {
      title: "Duplicate Variant",
      description:
        "Copy an existing variant with all of its content (layouts and translations, graphics formats, promo config or mockup state) into a new inactive variant labelled '<label> (Copy)'. Use it to try changes without touching the original. Counts against the plan's variant limit. Returns the copy and its editorUrl.",
      inputSchema: z.object({
        variantId: z.string().uuid(),
      }),
    },
    async ({ variantId }) => {
      try {
        const result = await client.duplicateVariant(variantId);
        const variant = result?.variant;
        const editorUrl =
          variant?.id && variant?.generation_id && variant?.content_type
            ? variantEditorUrl(
                client.credentials.baseUrl,
                variant.content_type,
                variant.generation_id,
                variant.id,
              )
            : undefined;
        return ok(
          { ...result, ...(editorUrl ? { editorUrl } : {}) },
          "Duplicated variant",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "set_active_variant",
    {
      title: "Set Active Variant",
      description:
        "Make an existing variant the active one for its content type. The active variant is what the project hub shows, what editors open by default and what render_screenshots exports when no variantId is given. Refuses empty variants (has_content=false in list_variants).",
      inputSchema: z.object({
        projectId: projectIdField,
        contentType: contentTypeEnum,
        variantId: z.string().uuid(),
      }),
    },
    async ({ projectId, contentType, variantId }) => {
      try {
        const { variant } = await findVariant(
          client,
          projectId,
          contentType,
          variantId,
        );
        if (variant.is_active) {
          return ok(
            {
              variant,
              editorUrl: variantEditorUrl(
                client.credentials.baseUrl,
                contentType,
                projectId,
                variantId,
              ),
            },
            "Variant is already active",
          );
        }
        if (variant.has_content === false) {
          throw new ToolInputError(
            "INVALID_TOOL_INPUT",
            `Variant ${variant.label ?? variantId} is empty. Save content into it first; activating it would make the hub and render_screenshots use an empty design.`,
          );
        }
        const result = await client.switchVariant(variantId);
        return ok(
          {
            ...result,
            editorUrl: variantEditorUrl(
              client.credentials.baseUrl,
              contentType,
              projectId,
              variantId,
            ),
          },
          "Set active variant",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "delete_variant",
    {
      title: "Delete Variant",
      description:
        "Permanently delete one variant and all of its content (layouts, translations, graphics, promo config or mockup state). Cannot be undone. Only call when the user explicitly asked to delete this specific variant; never to free a plan slot on your own. If it was active, the newest remaining variant becomes active (returned as promotedVariant).",
      inputSchema: z.object({
        projectId: projectIdField,
        contentType: contentTypeEnum,
        variantId: z.string().uuid(),
        confirm: z
          .literal(true)
          .describe(
            "Must be true: confirms the user explicitly asked to delete this variant.",
          ),
      }),
    },
    async ({ projectId, contentType, variantId }) => {
      try {
        const { variant } = await findVariant(
          client,
          projectId,
          contentType,
          variantId,
        );
        const result = await client.deleteVariant(variantId);
        return ok(
          { ...result, deletedLabel: variant.label },
          `Deleted variant ${variant.label ?? variantId}`,
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
