/** Shared project and asset list contracts. */
import { z } from "zod";

// Presentation-only data travels in tool _meta, never in the model summary.
const displayUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  });
export const projectListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  platform: z.string().optional(),
  category: z.string().optional(),
  updatedAt: z.string().optional(),
  iconUrl: displayUrl.optional(),
  projectUrl: displayUrl,
});
export const projectListSchema = z.object({
  projects: z.array(projectListItemSchema),
});
export type ProjectListItem = z.infer<typeof projectListItemSchema>;

export const assetKindSchema = z.enum([
  "screenshots",
  "appIcon",
  "recordings",
  "illustrations",
  "backgrounds",
  "panoramas",
  "fonts",
  "promoMedia",
]);
export const assetListItemSchema = z.object({
  path: z
    .string()
    .min(1)
    .refine(
      (path) =>
        !/[\\\\%?#:]/.test(path) &&
        path.split("/").every((part) => part && part !== "." && part !== ".."),
    ),
  name: z.string(),
  kind: assetKindSchema,
  mediaType: z.enum(["image", "video", "audio", "font"]),
  deviceType: z.enum(["mobile", "tablet", "desktop", "watch"]).optional(),
  platform: z.enum(["ios", "android"]).optional(),
  previewUrl: displayUrl.optional(),
});
export const assetListSchema = z.object({
  projectId: z.string().uuid(),
  assets: z.array(assetListItemSchema),
  truncated: z.boolean(),
});
export type AssetListItem = z.infer<typeof assetListItemSchema>;
export type AssetList = z.infer<typeof assetListSchema>;
export type AssetKind = z.infer<typeof assetKindSchema>;
