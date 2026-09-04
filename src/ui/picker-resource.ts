import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppLaunchFlowClient } from "../client/api.js";

export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";

function rebaseInlineCssAssetUrls(css: string, origin: string): string {
  return css.replace(
    /url\(\s*(["']?)(\.\.?\/[^"'()]+)\1\s*\)/g,
    (_match, quote: string, relativePath: string) => {
      const absoluteUrl = new URL(relativePath, `${origin}/mcp-assets/`).href;
      return `url(${quote}${absoluteUrl}${quote})`;
    },
  );
}

async function fetchPublicAsset(
  origin: string,
  path: string,
  expectedType: "javascript" | "css",
): Promise<string> {
  const url = new URL(path, `${origin}/`);
  if (url.origin !== origin || !url.pathname.startsWith("/mcp-assets/")) {
    throw new Error("Invalid picker asset URL");
  }
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    redirect: "error",
  });
  if (
    !response.ok ||
    !(response.headers.get("content-type") || "").includes(expectedType)
  ) {
    throw new Error("Picker bundle asset is unavailable");
  }
  return response.text();
}

export function pickerToolMeta(resourceUri: string) {
  return {
    ui: { resourceUri },
    "openai/outputTemplate": resourceUri,
  };
}

export function registerPickerResource(
  server: McpServer,
  client: AppLaunchFlowClient,
  options: {
    name: string;
    uri: string;
    assetFilename: string;
    assetPrefix: string;
    description: string;
  },
) {
  const origin = new URL(client.credentials.baseUrl).origin;
  const resourceDomains = [
    origin,
    "https://nffjiphaibxwybkybxph.supabase.co",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
  ];
  if (["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) {
    resourceDomains.push("http://127.0.0.1:54321");
  }

  const uri = options.uri;
  server.registerResource(
    options.name,
    options.uri,
    { mimeType: MCP_APP_MIME_TYPE },
    async () => {
      const response = await fetch(
        `${origin}/mcp-assets/${options.assetFilename}`,
        {
          signal: AbortSignal.timeout(30_000),
          redirect: "error",
        },
      );
      if (
        !response.ok ||
        !(response.headers.get("content-type") || "").includes("text/html")
      ) {
        throw new Error(
          `${options.name} assets are unavailable. Build and deploy the dashboard MCP UI assets first.`,
        );
      }
      const html = await response.text();
      if (!html.includes(`/mcp-assets/${options.assetPrefix}-`)) {
        throw new Error(`Invalid ${options.name} asset response`);
      }
      const scriptTag = html.match(
        /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/i,
      );
      if (!scriptTag) {
        throw new Error(`Invalid ${options.name} script asset`);
      }
      const styleTag = html.match(
        /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i,
      );
      const [script, style] = await Promise.all([
        fetchPublicAsset(origin, scriptTag[1], "javascript"),
        styleTag
          ? fetchPublicAsset(origin, styleTag[1], "css")
          : Promise.resolve(""),
      ]);
      const escapedOrigin = origin
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;");
      // Build a fresh resource document instead of interpolating the bundle as
      // a String.replace replacement value. Minified JavaScript commonly
      // contains `$&`, `$\`` and `$'`; String.replace expands those sequences
      // and silently corrupts the module before it reaches the MCP sandbox.
      // The stylesheet is moved out of /mcp-assets and inlined into a document
      // hosted on the MCP client's sandbox origin. Keep emitted font/image
      // files anchored to the dashboard; otherwise `url(./asset-*.woff2)` is
      // resolved against oaiusercontent.com and FontFaceSet.load rejects before
      // the picker can render its first preview.
      const safeStyle = rebaseInlineCssAssetUrls(style, origin).replace(
        /<\/style/gi,
        "<\\/style",
      );
      const safeScript = script.replace(/<\/script/gi, "<\\/script");
      const assetOriginScript = `globalThis.__ALF_MCP_ASSET_ORIGIN__=${JSON.stringify(origin).replaceAll("<", "\\u003c")};`;
      const text = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${escapedOrigin}/">${safeStyle ? `<style>${safeStyle}</style>` : ""}<title>${options.description}</title></head><body><div id="root"></div><script>${assetOriginScript}</script><script type="module">${safeScript}</script></body></html>`;
      return {
        contents: [
          {
            uri,
            mimeType: MCP_APP_MIME_TYPE,
            text,
            _meta: {
              ui: {
                prefersBorder: true,
                csp: {
                  resourceDomains,
                  connectDomains: resourceDomains,
                },
              },
              "openai/widgetDescription": options.description,
              "openai/widgetCSP": {
                resource_domains: resourceDomains,
                connect_domains: resourceDomains,
              },
            },
          },
        ],
      };
    },
  );
}
