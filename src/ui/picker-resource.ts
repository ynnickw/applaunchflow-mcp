import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppLaunchFlowClient } from "../client/api.js";

export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";

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
      const escapedOrigin = origin
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;");
      const text = html
        .replace("<head>", `<head><base href="${escapedOrigin}/">`)
        // ChatGPT packages the HTML into a nested sandbox before parsing it.
        // Root-relative URLs are otherwise captured by the sandbox origin even
        // when a base element is present, so make every dashboard asset explicit.
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
              "openai/widgetDomain": origin,
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
