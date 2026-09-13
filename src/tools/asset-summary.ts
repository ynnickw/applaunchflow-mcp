/** Widget credentials and preview links must not enter ordinary tool content. */
export function assetSummary(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(assetSummary);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key, item]) => !/^(previewUrl|signedUrl|uploadUrl|token|accessToken)$/i.test(key) && !(typeof item === "string" && /^https?:\/\//i.test(item) && /\/object\/sign\/|[?&](token|signature|x-amz-signature|sig)=/i.test(item))).map(([key, item]) => [key, assetSummary(item)]));
  return value;
}
