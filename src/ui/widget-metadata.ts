import { createHash } from "node:crypto";

export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";
export const MCP_WIDGET_DOMAIN = "https://mcp.applaunchflow.com";

/** Host-neutral metadata. OpenAI's sandbox identity is not a generic ui.domain. */
export function widgetResourceMetadata(origin: string, description: string) {
  const resourceDomains = [
    origin,
    "https://ubvbpgodmmitzutgshzu.supabase.co",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    // Imported store icons remain on the stores' public image CDNs. Device
    // textures use fetch as well as <img>, so both CSP directives need them.
    ...Array.from(
      { length: 5 },
      (_, index) => `https://is${index + 1}-ssl.mzstatic.com`,
    ),
    "https://play-lh.googleusercontent.com",
  ];
  if (["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) {
    resourceDomains.push("http://127.0.0.1:54321");
  }
  return {
    ui: {
      prefersBorder: true,
      csp: { resourceDomains, connectDomains: resourceDomains },
    },
    "openai/widgetDescription": description,
    "openai/widgetDomain": MCP_WIDGET_DOMAIN,
    "openai/widgetCSP": {
      resource_domains: resourceDomains,
      connect_domains: resourceDomains,
    },
  };
}

// Hosts can cache resources for a whole conversation. The bundle digest alone
// is insufficient: changing only CSP/sandbox metadata must invalidate it too.
export function widgetMetadataFingerprint(
  metadata: unknown = widgetResourceMetadata(
    "https://dashboard.applaunchflow.com",
    "AppLaunchFlow widget resource contract",
  ),
): string {
  return createHash("sha256")
    .update(JSON.stringify({ mimeType: MCP_APP_MIME_TYPE, metadata }))
    .digest("hex")
    .slice(0, 16);
}

const metadataSuffix = `-ui-${widgetMetadataFingerprint()}`;

export function versionWidgetResourceUri(uri: string): string {
  if (!uri.startsWith("ui://applaunchflow/") || !uri.endsWith(".html")) {
    throw new Error("Invalid AppLaunchFlow widget URI");
  }
  return uri.endsWith(`${metadataSuffix}.html`)
    ? uri
    : uri.slice(0, -5) + metadataSuffix + ".html";
}

/** Bounded compatibility for the exact URI advertised before metadata versioning. */
export function previousWidgetResourceUri(uri: string): string | undefined {
  return uri.endsWith(`${metadataSuffix}.html`)
    ? uri.slice(0, -(metadataSuffix.length + 5)) + ".html"
    : undefined;
}
