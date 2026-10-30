Check that the workflow's named tools are exposed by this host. If one is absent, use the matching AppLaunchFlow editor link and explain the specific step that needs the dashboard; don't claim the step completed.

# Preserve product truth and scope

Resolve the project and linked store app with `get_project`. Separate the user's goal: listing copy, keyword discovery/rank monitoring, or publishing to a store. The audited MCP edits listing data and tracking; store publishing happens in the dashboard.

For existing copy, `get_store_listing` gives the saved source and languages. `update_store_listing` applies requested fields while preserving other languages and AI insights. `generate_store_listing` creates AI copy; use it for a requested draft rather than replacing copy for a small correction. Explicit replacement can retire a variant. `translate_store_listing` creates/refreshes localized copy; inspect existing languages before overwriting edited translations.

Keep app capabilities and claims grounded in user/project input. Respect the tool's store-specific bounds: app name 30 characters, iOS subtitle 30 versus Play short description 80, iOS promotional text 170, descriptions 4000, iOS keyword field 100; release-note limits depend on store. A locale-specific correction should change that locale only.

For keyword research or monitoring, use the separate [keyword tracking skill](keywords.md). Do not confuse changing the stored iOS keywords text field with adding tracked search terms.

See [the store-copy tool catalog](store-copy/tool-catalog.md) for fields and language inputs. Preview exact proposed copy and character counts when a limit is close. Say that copy was saved in AppLaunchFlow, not published to a store.
