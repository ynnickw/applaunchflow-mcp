import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";

const optionalHttpUrl = z
  .string()
  .max(2048)
  .refine(
    (value) => value === "" || /^https?:\/\//i.test(value),
    "Links must be empty or start with http:// or https://",
  );

const pageLinksSchema = z
  .object({
    appStoreUrl: optionalHttpUrl.optional(),
    googlePlayUrl: optionalHttpUrl.optional(),
    websiteUrl: optionalHttpUrl.optional(),
    twitterUrl: optionalHttpUrl.optional(),
    instagramUrl: optionalHttpUrl.optional(),
    tiktokUrl: optionalHttpUrl.optional(),
    youtubeUrl: optionalHttpUrl.optional(),
    linkedinUrl: optionalHttpUrl.optional(),
    contactEmail: z.string().max(200).optional(),
  })
  .strict();

const websitePagesSchema = z
  .object({
    privacyPolicy: z.string().max(60_000).optional(),
    termsOfService: z.string().max(60_000).optional(),
    support: z.string().max(20_000).optional(),
    links: pageLinksSchema.optional(),
    seo: z
      .object({
        title: z.string().max(120).optional(),
        description: z.string().max(320).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    "Provide at least one page, link, or SEO field",
  );

type WebsitePagesInput = z.infer<typeof websitePagesSchema>;

/** Merges only the supplied fields, so other website sections stay untouched. */
export function mergeWebsitePages(
  document: Record<string, any>,
  pages: WebsitePagesInput,
): Record<string, any> {
  return {
    ...document,
    legal: {
      ...(document.legal || {}),
      ...(pages.privacyPolicy !== undefined
        ? { privacy: pages.privacyPolicy }
        : {}),
      ...(pages.termsOfService !== undefined
        ? { terms: pages.termsOfService }
        : {}),
      ...(pages.support !== undefined ? { support: pages.support } : {}),
    },
    links: {
      ...(document.links || {}),
      ...(pages.links || {}),
    },
    seo: {
      ...(document.seo || {}),
      ...(pages.seo || {}),
    },
  };
}

function websiteDocumentOrThrow(result: any): Record<string, any> {
  if (!result?.project?.document) {
    throw new Error(
      "No saved website exists for this variant. Create the website in the dashboard first.",
    );
  }
  return result.project.document;
}

export function registerWebsiteTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  const editorUrl = (projectId: string, variantId: string) => {
    const url = new URL("/website", client.credentials.baseUrl);
    url.searchParams.set("projectId", projectId);
    url.searchParams.set("variantId", variantId);
    return url.href;
  };

  server.registerTool(
    "get_website",
    {
      title: "Get Website",
      description:
        "Read the saved website for a variant, including its legal pages, links and SEO. Website design, domains and publishing stay in the dashboard.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z.string().uuid(),
      }),
    },
    async ({ projectId, variantId }) => {
      try {
        const result = await client.getWebsite(projectId, variantId);
        return ok(
          {
            document: websiteDocumentOrThrow(result),
            editorUrl: editorUrl(projectId, variantId),
          },
          "Fetched website",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "save_website_pages",
    {
      title: "Save Website Pages",
      description:
        "Save the Privacy Policy, Terms, Support page, links and SEO fields of a saved website. Reads the website first and merges only the supplied fields, so other sections stay unchanged. Empty strings clear a page or link. Does not publish. Tell the user to reload the website studio if it is open, because an open tab can overwrite this save.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        variantId: z.string().uuid(),
        pages: websitePagesSchema,
      }),
    },
    async ({ projectId, variantId, pages }) => {
      try {
        const current = await client.getWebsite(projectId, variantId);
        const document = mergeWebsitePages(
          websiteDocumentOrThrow(current),
          pages,
        );
        await client.updateWebsite({
          generationId: projectId,
          variantId,
          document,
        });
        return ok(
          {
            savedFields: Object.keys(pages),
            editorUrl: editorUrl(projectId, variantId),
          },
          "Saved website pages. Reload the website studio if it is open; the website is not published.",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
