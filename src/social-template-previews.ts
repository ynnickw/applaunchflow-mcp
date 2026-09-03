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

export function isSocialFormat(value: string): value is SocialFormat {
  return (SOCIAL_FORMATS as readonly string[]).includes(value);
}

export function buildSocialTemplatePreviewPath(
  templateId: string,
  format: SocialFormat,
): string {
  return `/template-examples/social/${format}/${templateId}.png`;
}

export function buildSocialTemplatePreviewUrl(
  baseUrl: string,
  templateId: string,
  format: SocialFormat,
): string {
  return new URL(
    buildSocialTemplatePreviewPath(templateId, format),
    baseUrl,
  ).toString();
}

export function buildSocialTemplatePreviewResourceUri(
  templateId: string,
  format: SocialFormat,
): string {
  return `applaunchflow://social-templates/${encodeURIComponent(templateId)}/preview/${format}`;
}

export function buildSocialTemplateGalleryUrl(
  baseUrl: string,
  options?: {
    format?: SocialFormat;
    templateIds?: string[];
    selectedTemplateId?: string;
    title?: string;
    returnTo?: string;
    generationId?: string;
    catalogKey?: string;
    applySelection?: boolean;
  },
): string {
  const url = new URL("/template-gallery", baseUrl);
  url.searchParams.set("kind", "social");

  if (options?.format) {
    url.searchParams.set("format", options.format);
  }

  if (options?.templateIds?.length) {
    url.searchParams.set("ids", options.templateIds.join(","));
  }

  if (options?.selectedTemplateId) {
    url.searchParams.set("selected", options.selectedTemplateId);
  }

  if (options?.title) {
    url.searchParams.set("title", options.title);
  }

  if (options?.returnTo) {
    url.searchParams.set("returnTo", options.returnTo);
  }

  if (options?.generationId && options?.catalogKey) {
    url.searchParams.set("generationId", options.generationId);
    url.searchParams.set("catalogKey", options.catalogKey);
  }

  if (options?.applySelection) {
    url.searchParams.set("action", "apply");
  }

  return url.toString();
}

type SocialTemplateRecord = Record<string, unknown> & {
  id: string;
  previewUrls?: Partial<Record<SocialFormat, string>>;
};

function decorateSocialTemplate(
  template: SocialTemplateRecord,
  baseUrl: string,
): SocialTemplateRecord & {
  previewUrls: Record<SocialFormat, string>;
  previewResourceUris: Record<SocialFormat, string>;
} {
  const previewUrls = Object.fromEntries(
    SOCIAL_FORMATS.map((format) => [
      format,
      template.previewUrls?.[format] ||
        buildSocialTemplatePreviewUrl(baseUrl, template.id, format),
    ]),
  ) as Record<SocialFormat, string>;

  const previewResourceUris = Object.fromEntries(
    SOCIAL_FORMATS.map((format) => [
      format,
      buildSocialTemplatePreviewResourceUri(template.id, format),
    ]),
  ) as Record<SocialFormat, string>;

  return {
    ...template,
    previewUrls,
    previewResourceUris,
  };
}

export function decorateSocialTemplatePayload<T>(
  payload: T,
  baseUrl: string,
): T {
  if (
    payload &&
    typeof payload === "object" &&
    "templates" in (payload as Record<string, unknown>) &&
    Array.isArray((payload as Record<string, unknown>).templates)
  ) {
    const typedPayload = payload as Record<string, unknown>;
    return {
      ...typedPayload,
      templates: (typedPayload.templates as SocialTemplateRecord[]).map(
        (template) => decorateSocialTemplate(template, baseUrl),
      ),
    } as T;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "template" in (payload as Record<string, unknown>) &&
    (payload as Record<string, unknown>).template &&
    typeof (payload as Record<string, unknown>).template === "object"
  ) {
    const typedPayload = payload as Record<string, unknown>;
    return {
      ...typedPayload,
      template: decorateSocialTemplate(
        typedPayload.template as SocialTemplateRecord,
        baseUrl,
      ),
    } as T;
  }

  return payload;
}
