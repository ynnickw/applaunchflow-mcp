# AppLaunchFlow MCP

MCP server for AppLaunchFlow — create App Store & Google Play screenshots with AI.

## Setup

Add to your MCP client config (e.g. Claude Desktop):

```json
{
  "mcpServers": {
    "applaunchflow": {
      "command": "npx",
      "args": ["-y", "@applaunchflow/mcp@latest"]
    }
  }
}
```

## Auth

```bash
npx -y @applaunchflow/mcp@latest auth login
```

Credentials are stored in `~/.applaunchflow/credentials.json`.

Environment overrides for the local connector:

- `APPLAUNCHFLOW_BASE_URL`
- `APPLAUNCHFLOW_MCP_TOKEN`
- `APPLAUNCHFLOW_MCP_COOKIE_NAME`

## Hosted connector (ChatGPT and Codex)

The same MCP server can run as a public Streamable HTTP service. It supports
OAuth 2.1 authorization-code flow with PKCE through the AppLaunchFlow dashboard.

```bash
npm ci
npm run build
APPLAUNCHFLOW_BASE_URL=https://dashboard.applaunchflow.com \
APPLAUNCHFLOW_MCP_PUBLIC_URL=https://mcp.applaunchflow.com \
PORT=8787 \
npm run start:http
```

Public endpoints:

- MCP: `https://mcp.applaunchflow.com/mcp`
- Protected resource metadata: `https://mcp.applaunchflow.com/.well-known/oauth-protected-resource`
- Health: `https://mcp.applaunchflow.com/healthz`

`APPLAUNCHFLOW_MCP_PUBLIC_URL` may be either the origin or the full `/mcp`
URL; both services normalize it to the same canonical resource URL. Set
`APPLAUNCHFLOW_MCP_PUBLIC_URL=https://mcp.applaunchflow.com/mcp` and
`NEXT_PUBLIC_APP_URL=https://dashboard.applaunchflow.com` on the dashboard.

The included `Dockerfile` produces a non-root OCI image for the hosted server.
The MCP host and dashboard must both be served through public HTTPS in
production. Do not expose the Node process directly without a TLS-terminating
platform or reverse proxy.

## Personalized style workflow

Screenshot and social-graphics styles are prepared once for the selected app screenshots, then the chosen style is applied from cache. This lets users compare styles without paying for another AI call when they choose one.

For App Store screenshots:

1. `list_source_screenshots`
2. `prepare_screenshot_styles` with 3-7 ordered paths
3. `browse_templates` with the returned `templateIds`, `generationId`, and `catalogKey`
4. `apply_screenshot_style` with the returned `catalogKey`

For social graphics:

1. `list_source_screenshots`
2. `prepare_social_graphics_styles` with 3-7 ordered paths
3. `browse_social_templates` with the returned `templateIds`, `generationId`, and `catalogKey`
4. `apply_social_graphics_style` with the returned `catalogKey`

The screenshot result includes phone, tablet, and desktop. The social result includes all six supported formats. `generate_layouts` and `generate_graphics` remain available for legacy direct single-template calls.

## Development

```bash
npm ci
npm run dev
```

Run `npm test` before publishing or deploying. See
[`docs/openai-submission.md`](docs/openai-submission.md) for the final OpenAI
submission checklist and manual test cases.
