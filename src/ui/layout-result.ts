import { createHash } from "node:crypto";

// Hosts cache resource documents by URI. Advance this when the result UI
// contract changes so new saves cannot reuse an obsolete thumbnail bundle.
export const LAYOUT_RESULT_URI = "ui://applaunchflow/layout-result-v2.html";

/** Only the private widget metadata receives the signed saved-layout URLs. */
export function graphicsResultMetadata(
  saved: {
    variantId?: string;
    language?: string;
    graphics?: Array<{ format: string; layout: unknown }>;
  },
  projectId: string,
  formats: string[],
  editorUrl: string,
) {
  const layouts = Object.fromEntries(
    formats.flatMap((format) => {
      const graphic = saved.graphics?.find((item) => item.format === format);
      return graphic?.layout ? [[format, graphic.layout]] : [];
    }),
  );
  if (!saved.variantId || Object.keys(layouts).length !== new Set(formats).size)
    return undefined;
  return {
    layoutResult: {
      kind: "graphics",
      projectId,
      variantId: saved.variantId,
      language: saved.language || "en",
      revision: createHash("sha256")
        .update(JSON.stringify(layouts))
        .digest("hex"),
      editorUrl,
      layouts,
    },
  };
}
