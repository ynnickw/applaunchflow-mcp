export const TEMPLATE_PREVIEW_DEVICE_TYPES = [
  "phone",
  "tablet",
  "desktop",
] as const;

export type TemplatePreviewDeviceType =
  (typeof TEMPLATE_PREVIEW_DEVICE_TYPES)[number];

export function isTemplatePreviewDeviceType(
  value: string,
): value is TemplatePreviewDeviceType {
  return (
    TEMPLATE_PREVIEW_DEVICE_TYPES as readonly string[]
  ).includes(value);
}

export function isSafeTemplateId(templateId: string): boolean {
  return /^[a-z0-9-]+$/i.test(templateId);
}

export function buildTemplatePreviewPath(
  templateId: string,
  deviceType: TemplatePreviewDeviceType,
): string {
  return `/template-examples/${deviceType}/${templateId}.png`;
}

export function buildTemplatePreviewUrl(
  baseUrl: string,
  templateId: string,
  deviceType: TemplatePreviewDeviceType,
): string {
  return new URL(buildTemplatePreviewPath(templateId, deviceType), baseUrl).toString();
}

export function buildTemplatePreviewResourceUri(
  templateId: string,
  deviceType: TemplatePreviewDeviceType,
): string {
  return `applaunchflow://templates/${encodeURIComponent(templateId)}/preview/${deviceType}`;
}

export function buildTemplateGalleryUrl(
  baseUrl: string,
  options?: {
    deviceType?: TemplatePreviewDeviceType;
    templateIds?: string[];
    selectedTemplateId?: string;
    title?: string;
    returnTo?: string;
  },
): string {
  const url = new URL("/template-gallery", baseUrl);

  if (options?.deviceType) {
    url.searchParams.set("device", options.deviceType);
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

  return url.toString();
}

type TemplateRecord = Record<string, unknown> & {
  id: string;
  previewUrls?: Record<string, string>;
};

function decorateTemplate(
  template: TemplateRecord,
  baseUrl: string,
): TemplateRecord & {
  previewUrls: Record<TemplatePreviewDeviceType, string>;
  previewResourceUris: Record<TemplatePreviewDeviceType, string>;
} {
  const previewUrls = Object.fromEntries(
    TEMPLATE_PREVIEW_DEVICE_TYPES.map((deviceType) => [
      deviceType,
      template.previewUrls?.[deviceType] ||
        buildTemplatePreviewUrl(baseUrl, template.id, deviceType),
    ]),
  ) as Record<TemplatePreviewDeviceType, string>;

  const previewResourceUris = Object.fromEntries(
    TEMPLATE_PREVIEW_DEVICE_TYPES.map((deviceType) => [
      deviceType,
      buildTemplatePreviewResourceUri(template.id, deviceType),
    ]),
  ) as Record<TemplatePreviewDeviceType, string>;

  return {
    ...template,
    previewUrls,
    previewResourceUris,
  };
}

export function decorateTemplatePayload<T>(
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
      templates: (typedPayload.templates as TemplateRecord[]).map((template) =>
        decorateTemplate(template, baseUrl),
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
      template: decorateTemplate(
        typedPayload.template as TemplateRecord,
        baseUrl,
      ),
    } as T;
  }

  return payload;
}
