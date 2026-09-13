# Asset management 0.4 migration

Deploy the dashboard `/api/assets/folders` replacement support before MCP 0.4.0.

- `delete_assets` permanently removes unused files. There is no restore; saved-design references block deletion.
- `replace_asset` remains available but now changes saved-design references and permanently deletes the original. Upload first, then explicitly request replacement with two distinct same-category paths. This is a destructive change from the old hide-only behavior. Inspect partial-failure results and retry the same pair; do not delete either file manually while references may remain.
- `restore_assets` and the app-only `manage_asset_library` tool are removed.
- Screenshot folders require device/platform scope. Set language using `locale` on creation or `set_asset_folder_locale`; folder names do not imply a language.
- `upload_screenshots` accepts an existing `folderId`. It returns per-file paths and assignment status, including partial failures. Uploading and moving never changes saved designs. Non-screenshot categories do not belong to device-scoped screenshot folders.
- Folder deletion only ungroups its files.
- Asset listing handlers remove signed preview/upload URL fields from ordinary results and keep widget metadata intact. Persist relative paths. **Cursor exception:** its existing compatibility transport mirrors widget metadata into `structuredContent.widgetDataJson`; URL privacy cannot be guaranteed for that host yet. Resolving that requires a separate transport change; do not claim complete model invisibility across clients.

Locale bulk-apply tools are intentionally not part of this release. Use the dashboard for previewing and applying locale/frame assignments. Update the locally installed capture skill separately; it is not shipped in the npm package.
