import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppLaunchFlowClient } from "../client/api.js";
import { fail, ok } from "./utils.js";

const providerSchema = z.enum(["pexels", "unsplash"]);

interface StockSearchPhoto {
  id: number | string;
  width: number;
  height: number;
  photographer: string;
  photographerUrl: string;
  pexelsUrl?: string;
  unsplashUrl?: string;
  downloadLocation?: string;
  alt?: string | null;
  avgColor?: string | null;
  src: { original: string; small?: string; tiny?: string; medium?: string };
}

/** The exact import input for one search result; pass it back unchanged. */
function importInput(provider: "pexels" | "unsplash", photo: StockSearchPhoto) {
  return provider === "pexels"
    ? {
        imageUrl: photo.src.original,
        pexelsId: photo.id,
        photographer: photo.photographer,
        photographerUrl: photo.photographerUrl,
        pexelsUrl: photo.pexelsUrl,
      }
    : {
        imageUrl: photo.src.original,
        unsplashId: String(photo.id),
        photographer: photo.photographer,
        photographerUrl: photo.photographerUrl,
        unsplashUrl: photo.unsplashUrl,
        downloadLocation: photo.downloadLocation,
      };
}

export const STOCK_PHOTO_USAGE =
  "Use the returned path and attribution: screenshots/social panorama → transform_layout {nodeType:'panoramaBackground', changes:{imageUrl:<path>, storagePath:<path>, attribution}}; " +
  "one screen → {nodeType:'screen', screens:[i], changes:{backgroundImage:{url:<path>, storagePath:<path>, attribution}}}; " +
  "mockup animation → state.backgroundMode:'image' and state.backgroundImage:{url:<returned url>, storagePath:<path>, attribution} via update_mockup_animation (the mockup editor displays url as-is; layouts re-sign from storagePath). Keep attribution: the editor credits the photographer from it.";

export function registerStockPhotoTools(
  server: McpServer,
  client: AppLaunchFlowClient,
): void {
  server.registerTool(
    "search_stock_photos",
    {
      title: "Search Stock Photos",
      description:
        "Search free Pexels or Unsplash photos for backgrounds (screenshot/social panoramas, per-screen backgrounds, mockup animation backgrounds) — the same libraries as the editor's background picker. " +
        "Returns preview URLs to judge results and an importInput per photo; pass a chosen photo's importInput to import_stock_photo. Nothing is stored until import.",
      inputSchema: z.object({
        provider: providerSchema.default("pexels"),
        query: z.string().trim().min(1).max(200),
        orientation: z
          .enum(["landscape", "portrait", "square"])
          .optional()
          .describe("portrait suits a single phone screen; landscape a panorama across screens."),
        page: z.number().int().min(1).optional(),
        perPage: z.number().int().min(1).max(30).optional(),
      }),
    },
    async ({ provider, query, orientation, page, perPage }) => {
      try {
        const result = await client.searchStockPhotos(provider, {
          query,
          orientation:
            provider === "unsplash" && orientation === "square"
              ? "squarish"
              : orientation,
          page,
          per_page: perPage,
        });
        const photos = ((result.photos ?? []) as StockSearchPhoto[]).map(
          (photo) => ({
            id: photo.id,
            width: photo.width,
            height: photo.height,
            alt: photo.alt ?? null,
            avgColor: photo.avgColor ?? null,
            photographer: photo.photographer,
            previewUrl: photo.src.small ?? photo.src.medium ?? photo.src.tiny,
            importInput: importInput(provider, photo),
          }),
        );
        return ok(
          {
            provider,
            total: result.total,
            page: result.page,
            hasMore: result.hasMore,
            photos,
          },
          `Found ${photos.length} ${provider} photos`,
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "import_stock_photo",
    {
      title: "Import Stock Photo",
      description:
        "Copy a Pexels/Unsplash photo into the project's storage and return its project path plus photographer attribution, exactly like choosing it in the editor's background picker. " +
        "Pass importInput from search_stock_photos unchanged. Does not change any design by itself. " +
        STOCK_PHOTO_USAGE,
      inputSchema: z.object({
        projectId: z.string().uuid(),
        provider: providerSchema,
        importInput: z
          .record(z.string(), z.unknown())
          .describe("The importInput object of one search_stock_photos result."),
      }),
    },
    async ({ projectId, provider, importInput: input }) => {
      try {
        const imported = await client.importStockPhoto(provider, {
          ...input,
          projectId,
        });
        return ok(
          {
            path: imported.path,
            url: imported.url,
            attribution: imported.attribution,
            usage: STOCK_PHOTO_USAGE,
          },
          "Imported stock photo into the project",
        );
      } catch (error) {
        return fail(error);
      }
    },
  );
}
