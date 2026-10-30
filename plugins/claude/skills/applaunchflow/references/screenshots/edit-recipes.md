# Screenshot edit recipes

First read get_editing_reference for screenshots, the relevant symbols, and get_layout for the explicit variant/language. Preserve the current document. All snippets below are operation fragments, not complete requests: resolve node IDs from the read, and supply that read's opaque receipt and target scope.

## Bind an uploaded capture into an existing frame

1. Find the requested source path using list_source_screenshots/list_assets; inspect view_screenshot if the content is ambiguous.
2. Resolve the existing ScreenshotNode on the user's requested screen. For two-device screens, clarify only if the target device cannot be inferred.
3. transform_layout uses update_node with target nodeType screenshot, its nodeId and screens containing the zero-based screen index; set changes.path to the returned relative source path.
4. Omit platform only when both platform views should use it: this clears iosPath/androidPath. Pass ios/android for an override only.
5. Preview the changed saved screen in the intended size/platform. Do not add a new frame or regenerate the design merely because the existing frame was empty.

## Change a headline or emphasize a phrase

Find the actual text node rather than matching every text on a screen. Retain richContent structure, paragraph alignment, marks, defaults and sizing fields. Change only the requested text/marks; preserve line breaks unless fit requires an intentional adjustment. Use the current TextNode/rich-content reference to distinguish fixed sizing, auto-fit and font reference size. Prefer short, readable marketing copy grounded in the product, not invented claims. Inspect line breaks and overlaps in the renderer, including the longest localized string.

## Recolor a brand or select a palette

For a theme-role change, use update_node on nodeType layout and changes.themeColors with the intended role(s). For a generated alternate palette use changes.themePaletteMode v1/v2. Preserve colorRefs: literal node changes may not affect colors linked to roles. For intentional literal replacement, replace_color accepts changes.find and changes.replace; scope screens explicitly. Don't replace every occurrence of a color when only a single element was requested.

## Add illustration, logo, background or decorative content

Inspect list_illustrations/list_assets, or upload the needed owned media first. Fetch the relevant node type and add a valid unique ID with position, dimensions and zIndex. Use illustration/logo.path, backgroundImage.storagePath or panoramaBackground.storagePath as appropriate; they have different geometry/scope. HeaderNode is a background block shared by layouts, not a product-page header format and not the rendered headline's text node.

All node families are available through the shared layout contract: text, screenshots, headers, illustrations, magnifiers, pills, badges, blobs, ratings, logos and emojis. Read the matching symbol before creating a family not present in the saved design. Keep decorative content subordinate to the app benefit and real UI.

## Add a screen without changing the rest

Inspect nearby screen structure and visual rhythm. Add the screen container, then valid typed content with fresh IDs, maintaining arrays and document order. Reuse appropriate assets and typography, but do not duplicate IDs. A full save must preserve untouched device layouts. Render the new screen and its neighbors when artwork/panoramas cross screen boundaries. The dashboard's AI Add Screen flow is not a dedicated MCP tool.

## Edit a device or one independent phone format

Read valid device/model/finish catalogs through the editing reference. Preserve scale/crop/position while changing only the requested model or finish; check contentOrientation when media rotation changes. ScreenshotNode.scale controls device size; 3D rotations use radians. For a size-specific design, inspect format_layouts, then transform with formatId, never with both formatId and layouts. A reset is destructive to that format's authored override and requires explicit intent.

## Assign locale images safely

Translate missing languages first using translate_layouts; assigning media does not translate text. Preview apply_locale_screenshots for the exact variant/device/platform and locale source set. A frame map is per language, not one image per screen. In tools supporting guarded assignments, pass the preview hash and map back; null keeps an existing image. Require every selected language's assignment. If any layout changed, refresh the preview rather than stripping the hash. If the current host lacks this schema, use per-frame transforms with fresh read receipts instead.

Use sync_layout only for a requested design sync, not a localized image change; it affects all non-source languages. Re-translation can reset manual language-specific design work even when it retains localized images.
