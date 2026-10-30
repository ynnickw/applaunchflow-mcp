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
        "Lists variants for one project content type, newest first, including active, ready and has_content status. Read-only.",
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
        "Creates an empty, named, inactive content-type variant. Does not generate or copy a design and counts against the plan's variant limit.",
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
        "Copies a variant's saved content and translations into a new inactive variant with a copy label. Preserves the original and counts against the plan's variant limit. Returns the copy and editor link.",
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
        "Sets the project's active variant for the specified content type. Does not delete or rewrite the other variants.",
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
        "Permanently deletes the specified variant and all of its content and translations. Cannot be undone. Deleting the active variant promotes the newest remaining variant, which is returned as promotedVariant.",
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
