import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { openUrl, fail, ok } from "./utils.js";

const contentTypeEnum = z.enum(["screenshots"]);

export function registerVariantTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "list_variants",
    {
      title: "List Variants",
      description: "List variants for a generation and content type",
      inputSchema: {
        generationId: z.string().uuid(),
        contentType: contentTypeEnum,
      },
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
      title: "Create Variant",
      description:
        "Create a new content variant. This is the preferred starting point when the user wants a new screenshot direction, a different template, or a fresh AI-generated take without overwriting the current variant.",
      inputSchema: {
        generationId: z.string().uuid(),
        contentType: contentTypeEnum,
        label: z.string().optional(),
        setActive: z.boolean().optional(),
      },
    },
    async (args, extra) => {
      try {
        const result = await client.createVariant(args);
        const variantId = result?.variant?.id;
        const generationId = args.generationId;

        if (variantId && generationId) {
          const editorUrl = `${client.credentials.baseUrl}/editor?projectId=${generationId}&variantId=${variantId}&device=phone`;

          await openUrl(server, editorUrl, "Opening the new variant in the editor.", { signal: extra.signal });

          return ok(
            { ...result, editorUrl },
            "Created variant",
          );
        }

        return ok(result, "Created variant");
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "duplicate_variant",
    {
      title: "Duplicate Variant",
      description: "Duplicate an existing variant",
      inputSchema: {
        variantId: z.string().uuid(),
      },
    },
    async ({ variantId }) => {
      try {
        return ok(await client.duplicateVariant(variantId), "Duplicated variant");
      } catch (error) {
        return fail(error);
      }
    },
  );
}
