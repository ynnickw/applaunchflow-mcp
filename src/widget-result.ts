const WIDGET_KEYS = [
  "projectList", "assetList", "assetLibrary", "assetUpload",
  "picker", "socialGraphicsPicker", "promoVideoPicker",
] as const;

/** Cursor drops _meta. Mirror only known widget payloads, never arbitrary metadata. */
export function cursorWidgetResult(result: unknown): unknown {
  if (!result || typeof result !== "object") return result;
  const value = result as Record<string, unknown>;
  if (value.isError || !value._meta || typeof value._meta !== "object") return result;
  const meta = value._meta as Record<string, unknown>;
  const data = Object.fromEntries(WIDGET_KEYS.filter(key => meta[key] !== undefined)
    .map(key => [key, meta[key]]));
  if (!Object.keys(data).length) return result;
  return {
    ...value,
    structuredContent: {
      ...(value.structuredContent as Record<string, unknown> || {}),
      widgetDataJson: JSON.stringify(data),
    },
  };
}
