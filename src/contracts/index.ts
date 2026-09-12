/** Canonical wire contracts. Synced into the separately released MCP package. */
import { z } from "zod";

export const SOCIAL_FORMATS = [
  "og",
  "x_post",
  "instagram_story",
  "instagram_post",
  "x_header",
  "linkedin_banner",
  "play_store_feature",
  "app_store_event_card",
  "app_store_event_details",
  "ad_banner",
  "ad_mobile_banner",
  "ad_tablet_banner_720",
  "ad_tablet_banner_728",
  "ad_mrec",
  "ad_phone_portrait",
  "ad_phone_landscape",
  "ad_fullscreen_landscape",
  "ad_tablet_portrait",
  "ad_tablet_landscape",
] as const;
export type SocialFormat = (typeof SOCIAL_FORMATS)[number];
export type JsonObject = Record<string, unknown>;

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

export const projectIdField = z
  .string()
  .uuid()
  .describe("AppLaunchFlow project UUID.");
export const operationIdField = z
  .string()
  .uuid()
  .describe(
    "Use the operationId returned by the picker. Retry the exact same ID and selection after an uncertain response; only an independent new user action gets a new ID.",
  );
export const editTargetFields = {
  variantId: z
    .string()
    .uuid()
    .describe(
      "Concrete variant returned by the preceding read, never an active/default alias.",
    ),
  expectedRevision: z
    .string()
    .uuid()
    .describe(
      "Revision of this exact target from the preceding read. Stale/replayed writes fail with EDIT_CONFLICT; re-read instead of retrying.",
    ),
};
export const editLanguageField = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .describe("Exact language returned by the preceding read.");
export const selectionFields = {
  operationId: operationIdField,
  catalogKey: z.string().min(1).max(128),
  templateId: z.string().min(1),
  paletteMode: z.enum(["v1", "v2"]).default("v1"),
};
export const screenshotSelectionApiSchema = z
  .object({
    ...selectionFields,
    generationId: projectIdField,
    replaceVariantId: z.string().uuid().optional(),
  })
  .strict();
export const socialSelectionApiSchema = screenshotSelectionApiSchema.extend({
  primaryFormat: z.enum(SOCIAL_FORMATS),
});
// Tool-facing names are consistent; existing dashboard routes keep their wire
// names behind the client adapter, without alias ambiguity in model schemas.
export const screenshotSelectionSchema = screenshotSelectionApiSchema
  .omit({ generationId: true, replaceVariantId: true })
  .extend({ projectId: projectIdField });
export const socialSelectionSchema = socialSelectionApiSchema
  .omit({ generationId: true, replaceVariantId: true })
  .extend({
    projectId: projectIdField,
    primaryFormat: z.enum(SOCIAL_FORMATS).default("og"),
  });
export const promoCandidateSelectionSchema = z
  .object({
    projectId: projectIdField,
    operationId: operationIdField,
    candidateKey: z.string().regex(/^[a-f0-9]{64}$/i),
    candidateId: z.string().min(1).max(120),
    replaceVariantId: z.string().uuid().optional(),
  })
  .strict();
export const promoSelectionApiSchema = promoCandidateSelectionSchema
  .extend({
    candidateKey: promoCandidateSelectionSchema.shape.candidateKey.optional(),
    candidateId: promoCandidateSelectionSchema.shape.candidateId.optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    label: z.string().trim().min(1).max(120).optional(),
  })
  .refine(
    (input) =>
      input.config
        ? !input.candidateKey && !input.candidateId
        : !!input.candidateKey && !!input.candidateId,
    "Provide either a stored candidate key/id or a config, not both",
  );

export type ScreenshotSelectionRequest = z.input<
  typeof screenshotSelectionApiSchema
>;
export type SocialSelectionRequest = z.input<typeof socialSelectionApiSchema>;
export type ScreenshotToolSelectionRequest = z.input<
  typeof screenshotSelectionSchema
>;
export type SocialToolSelectionRequest = z.input<typeof socialSelectionSchema>;
export type PromoCandidateSelectionRequest = z.input<
  typeof promoCandidateSelectionSchema
>;
export interface SelectionResponse {
  variantId: string;
}
export interface ScreenshotSelectionResponse extends SelectionResponse {
  detectedLanguage: string;
  mobileLayout: unknown;
  tabletLayout: unknown;
  desktopLayout: unknown;
}
export interface SocialSelectionResponse extends SelectionResponse {
  sourceLanguage: string;
  language: string;
  availableLanguages: string[];
  socialTemplateId: string;
  socialPrimaryFormat: SocialFormat;
  graphics: Array<{ format: SocialFormat; layout: unknown }>;
}
export interface PreparedCatalog {
  catalogKey: string;
  cacheHit?: boolean;
  templatePayloads: Record<string, unknown>;
}
export interface PreparedPromoCandidates {
  candidateKey: string;
  candidates: Array<{
    id: string;
    title: string;
    explanation: string;
    durationInFrames: number;
    config: JsonObject;
  }>;
}
export interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  categories?: string[];
  screenCount?: number;
}

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
