import { createHash } from "node:crypto";

export const LAYOUT_RESULT_URI = "ui://applaunchflow/layout-result-v1.html";

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
