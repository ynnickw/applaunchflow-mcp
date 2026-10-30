# AppLaunchFlow for Claude

Create and edit app-store screenshots, social graphics, App Store headers and
search creatives, promo videos, and animated device mockups using your connected
AppLaunchFlow account. The `applaunchflow` skill supplies a single entry point
with focused reference guides for each feature, including assets, localization,
store listing copy, and keyword tracking.

## Connection and use

Add the bundled AppLaunchFlow connector and sign in through its normal OAuth
flow. It connects only to `https://mcp.applaunchflow.com/mcp`. No API key, local
CLI, package installation, hook, shell command or background executable is
bundled. In Claude Code the remote connector loads from the plugin; on
claude.ai and Cowork, connect it through the plugin's Connectors tab.

Try asking:

- "Show my projects and reuse my existing screenshots to prepare screenshot styles."
- "Change the second English screenshot's headline without changing the other screens."
- "Adapt my graphics to an App Store header, preserving the custom Instagram Story."
- "Shorten the promo intro and check the closeup, keeping the music and export quality."
- "Make the exported device motion slower without changing its media."

New style pickers leave the choice to you. Editing uses current saved state and
scoped operations. Rendered previews are for inspection, not store-ready export
files; exports are requested separately and depend on your AppLaunchFlow plan
and allowances. Some actions require the dashboard. Installing this plugin does
not grant a paid AppLaunchFlow subscription.

## Data and safety

The skill itself is Markdown and JSON; it has no independent storage, telemetry
or network code. When you request product work, Claude sends the relevant
project IDs, instructions, media paths and configuration to the declared
AppLaunchFlow MCP service. AppLaunchFlow stores uploaded assets and saved work
in your connected account under its service policies. Browser pickers, supplied
media sources and returned preview/download links are used only as part of the
requested workflow. The plugin does not send data to a separate analytics or
advertising endpoint. Never put OAuth tokens or private reviewer access in the
plugin files.

Asset deletion and global replacement can permanently remove stored files.
The guides distinguish those actions from a one-frame edit and require clear
user intent. A successful save is not evidence of visual quality, and a still
preview cannot verify continuous animation or audio.

Documentation: https://dashboard.applaunchflow.com/docs/mcp

Privacy: https://dashboard.applaunchflow.com/privacy

Terms: https://dashboard.applaunchflow.com/terms

Support: support@applaunchflow.com

License: MIT, as declared in the plugin manifest.
