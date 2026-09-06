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

export const MAX_ASSET_UPLOAD_BYTES = 25 * 1024 * 1024;
const imageTypes = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
};
const videoTypes = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4v: "video/x-m4v",
};
const audioTypes = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  flac: "audio/flac",
};
const fontTypes = {
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
};

export function assetUploadTypes(kind: AssetKind): Record<string, string> {
  if (kind === "fonts") return fontTypes;
  if (kind === "recordings") return videoTypes;
  if (kind === "promoMedia")
    return { ...imageTypes, ...videoTypes, ...audioTypes };
  return imageTypes;
}
export function assetUploadAccept(kind: AssetKind): string {
  return Object.keys(assetUploadTypes(kind))
    .map((ext) => `.${ext}`)
    .join(",");
}
export const assetUploadRequestSchema = z.object({
  projectId: z.string().uuid(),
  kind: assetKindSchema,
  filename: z
    .string()
    .min(1)
    .max(180)
    .refine(
      (name) =>
        !/[\\/\u0000-\u001f%?#:]/.test(name) && name !== "." && name !== "..",
    ),
  sizeBytes: z.number().int().positive().max(MAX_ASSET_UPLOAD_BYTES),
  contentType: z.string().min(1),
  deviceType: z.enum(["mobile", "tablet", "desktop", "watch"]).optional(),
  platform: z.enum(["ios", "android"]).optional(),
});
export type AssetUploadRequest = z.infer<typeof assetUploadRequestSchema>;
// Zod 4's no-eval parsing option; Zod 3 accepts the empty path and ignores jitless.
const portableParseOptions = { jitless: true, path: [] };
type AssetUploadMetadata = {
  projectId: string;
  filename: string;
  contentType: string;
  deviceType?: AssetUploadRequest["deviceType"];
  platform?: AssetUploadRequest["platform"];
  fileType?:
    | "logo"
    | "mockup-media"
    | "illustration"
    | "background"
    | "panorama"
    | "font"
    | "promo-media";
};

/** The same category/extension validation runs before the chooser upload and on the MCP server. */
export function assetUploadMetadata(
  value: AssetUploadRequest,
): AssetUploadMetadata {
  const input = assetUploadRequestSchema.parse(value, portableParseOptions);
  const ext = input.filename.split(".").pop()?.toLowerCase() || "";
  const mime = assetUploadTypes(input.kind)[ext];
  if (!mime || input.contentType !== mime)
    throw new Error("Unsupported file type for this asset category");
  const common = {
    projectId: input.projectId,
    filename: input.filename,
    contentType: mime,
  };
  if (input.kind === "screenshots") {
    if (!input.deviceType || !input.platform)
      throw new Error("Choose a screenshot device and platform");
    return {
      ...common,
      deviceType: input.deviceType,
      platform: input.platform,
    };
  }
  const fileType = {
    appIcon: "logo",
    recordings: "mockup-media",
    illustrations: "illustration",
    backgrounds: "background",
    panoramas: "panorama",
    fonts: "font",
    promoMedia: "promo-media",
  } as const;
  return { ...common, fileType: fileType[input.kind] };
}

export const assetUploadGrantSchema = z.object({
  projectId: z.string().uuid(),
  path: assetListItemSchema.shape.path,
  uploadUrl: displayUrl,
});
export type AssetUploadGrant = z.infer<typeof assetUploadGrantSchema>;

/** No arbitrary destinations, credentials or another project's storage objects. */
export function validateAssetUploadGrant(
  value: unknown,
  request: AssetUploadRequest,
  localOrigin?: string,
): AssetUploadGrant {
  const grant = assetUploadGrantSchema.parse(value, portableParseOptions);
  const metadata = assetUploadMetadata(request);
  const folders = {
    logo: "logo",
    "mockup-media": "mockups",
    illustration: "illustrations",
    background: "backgrounds",
    panorama: "panorama",
    font: "fonts",
    "promo-media": "promo-media",
  };
  const folder = metadata.fileType
    ? folders[metadata.fileType]
    : `${metadata.deviceType}/${metadata.platform}`;
  const url = new URL(grant.uploadUrl);
  const local = localOrigin ? new URL(localOrigin) : undefined;
  const allowedLocal =
    local &&
    ["127.0.0.1", "localhost"].includes(local.hostname) &&
    (url.origin === local.origin ||
      (url.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(url.hostname) &&
        url.port === "54321"));
  if (
    grant.projectId !== request.projectId ||
    !grant.path.startsWith(`${folder}/`) ||
    grant.path.slice(folder.length + 1).includes("/") ||
    (!allowedLocal &&
      url.origin !== "https://ubvbpgodmmitzutgshzu.supabase.co") ||
    url.hash ||
    url.username ||
    url.password ||
    decodeURIComponent(url.pathname) !==
      `/storage/v1/object/upload/sign/screenshots/${request.projectId}/${grant.path}` ||
    !url.searchParams.get("token")
  )
    throw new Error("Invalid upload destination");
  return grant;
}
