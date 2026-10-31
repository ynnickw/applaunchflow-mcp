import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

/** Lossless, private widget data; never include this in model-visible content. */
export function packCatalogPayload(payload: Record<string, unknown>) {
  const bytes = Buffer.from(JSON.stringify(payload), "utf8");
  if (bytes.length > 32 * 1024 * 1024)
    throw new Error("The preview catalog is too large to display inline.");
  const payloadGzipBase64 = gzipSync(bytes).toString("base64");
  if (payloadGzipBase64.length > 4 * 1024 * 1024)
    throw new Error("The preview catalog is too large to display inline.");
  return {
    payloadGzipBase64,
    payloadBytes: bytes.length,
    payloadSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
