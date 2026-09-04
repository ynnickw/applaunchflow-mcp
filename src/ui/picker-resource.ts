import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppLaunchFlowClient } from "../client/api.js";

export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";

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
      let text = html;
      if (styleTag) {
        text = text.replace(
          styleTag[0],
          `<style>${style.replaceAll("</style", "<\\/style")}</style>`,
        );
      }
      // ChatGPT's MCP Apps runtime expects the compiled module in the resource
      // HTML. Loading it as a remote module can fail before the iframe starts.
      text = text.replace(
        scriptTag[0],
        `<script type="module">${script.replaceAll("</script", "<\\/script")}</script>`,
      );
      text = text
        .replace("<head>", `<head><base href="${escapedOrigin}/">`)
        .replaceAll('="/mcp-assets/', `="${escapedOrigin}/mcp-assets/`);
      return {
        contents: [
          {
            uri: options.uri,
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
