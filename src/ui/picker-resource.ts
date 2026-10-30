import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/server";
import type { AppLaunchFlowClient } from "../client/api.js";

import { loadPickerBundle, type PickerName } from "./picker-bundle.js";
import {
  MCP_APP_MIME_TYPE,
  previousWidgetResourceUri,
  widgetResourceMetadata,
} from "./widget-metadata.js";
export { MCP_APP_MIME_TYPE, MCP_WIDGET_DOMAIN } from "./widget-metadata.js";

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

export function composePickerHtml(
  origin: string,
  description: string,
  script: string,
  style: string,
): string {
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
  // ChatGPT preserves inert document metadata but strips ordinary inline
  // scripts before running the app module in its nested sandbox. Mark the
  // document with a meta tag so the shared renderer can reliably select
  // its embedded-app queue limits in every MCP Apps host.
  const text = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${escapedOrigin}/"><meta name="applaunchflow-mcp-asset-origin" content="${escapedOrigin}">${safeStyle ? `<style>${safeStyle}</style>` : ""}<title>${description}</title></head><body><div id="root"></div><script type="module">${safeScript}</script></body></html>`;
  return text;
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
    assetFilename?: string;
    assetPrefix?: string;
    bundle?: PickerName;
    description: string;
  },
) {
  const origin = new URL(client.credentials.baseUrl).origin;
  const readResource = async (uri: URL) => {
    const getBundle = async () => {
      if (options.bundle) return loadPickerBundle(options.bundle);
      if (!options.assetFilename || !options.assetPrefix)
        throw new Error("Missing picker asset descriptor");
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
      return { script, style };
    };
    const { script, style } = await getBundle();
    const text = composePickerHtml(origin, options.description, script, style);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: MCP_APP_MIME_TYPE,
          text,
          _meta: widgetResourceMetadata(origin, options.description),
        },
      ],
    };
  };
  const previousUri = previousWidgetResourceUri(options.uri);
  const uris = previousUri ? [options.uri, previousUri] : [options.uri];
  for (const [index, uri] of uris.entries()) {
    server.registerResource(
      index === 0 ? options.name : `${options.name}-previous-uri`,
      uri,
      { mimeType: MCP_APP_MIME_TYPE },
      readResource,
    );
  }
  if (previousUri) {
    // Existing clients can retain an older tools/list URI across a deployment.
    // Only a known widget family plus a bounded version/digest is accepted;
    // the requested string never selects a file, network URL or user data.
    const bundled = previousUri.match(
      /^(ui:\/\/applaunchflow\/(?:project-list|asset-list)-)[a-f0-9]{64}\.html$/,
    );
    const numbered = previousUri.match(
      /^(ui:\/\/applaunchflow\/(?:screenshot-picker|social-graphics-picker|promo-video-picker|layout-result)-v)\d+\.html$/,
    );
    const prefix = bundled?.[1] || numbered?.[1];
    if (prefix)
      server.registerResource(
        `${options.name}-compatible-version`,
        new ResourceTemplate(`${prefix}{revision}.html`, { list: undefined }),
        { mimeType: MCP_APP_MIME_TYPE },
        async (uri, { revision }) => {
          const valid =
            typeof revision === "string" &&
            (bundled
              ? /^[a-f0-9]{64}(?:-ui-[a-f0-9]{16})?$/.test(revision)
              : /^\d{1,4}(?:-ui-[a-f0-9]{16})?$/.test(revision));
          if (!valid) throw new Error("Invalid AppLaunchFlow widget version");
          return readResource(uri);
        },
      );
  }
}
