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

Environment overrides:

- `applaunchflow_BASE_URL`
- `applaunchflow_MCP_TOKEN`
- `applaunchflow_MCP_COOKIE_NAME`

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
pnpm install
pnpm dev
```
