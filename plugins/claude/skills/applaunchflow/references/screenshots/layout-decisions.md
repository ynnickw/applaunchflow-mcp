# Layout decisions

Get current fields through `get_editing_reference` symbols `Layout`, `Screen`, `ScreenshotNode`, `TextNode`, `HeaderNode`, `Model3DConfig`, `transformOperationSchema`, and the index's relevant validator/catalog.

| Desired change | Decision |
| --- | --- |
| Move text/device | Authored canvas units, separately per screen; text position is top-left, screenshot position is center. |
| Resize device | ScreenshotNode.scale; model3D.scale is legacy. Preserve screenshot content crop/fit unless requested. |
| Change typography | richContent marks/attrs and fitting contracts; use exact font families from list_fonts. |
| Change all linked colors | layout themeColors roles; literal colors can be overridden by colorRefs. |
| Change stacking | One zIndex order across all node families on a screen; bring_to_front/send_to_back/reorder. |
| Replace a screenshot | path changes both platforms and clears iosPath/androidPath overrides unless platform explicitly scopes the operation. |
| Fit screen content | contain fits, cover crops, stretch distorts; contentTransform pans/zooms; overflow between screens is a separate behavior. |
| Turn a device | Ordinary rotation/tiltAngle is degrees; model3D rotations are radians. Preserve/set contentOrientation as described by the current reference to keep pixels upright. |
| 3D device or laptop opening | model3D supersedes 2D frames; lidOpen is 0–1. Use valid model IDs and finishes from the catalog. |
| Add artwork | Upload or select owned illustration/logo/background paths first. Add the corresponding typed node with a unique ID. |
| Add a screen | Add screen container and its content nodes separately; preserve document IDs/order and valid node arrays. AI-assisted Add Screen in the dashboard is not exposed as a dedicated MCP tool. |
| Edit one phone size | get_layout returns format_layouts for the language. Inspect the intended entry, then pass formatId to transform_layout (not get_layout). A stored override can have independent geometry and images; do not reset it to propagate an unrelated source edit. |
| Reset phone format | Use the documented reset operation only when asked; a reset discards that format's customization. |
| Panorama | Panorama spans screens; per-screen backgrounds and layout gradients have different scope. screenshotGap controls artwork crossing gaps. |

All families can be edited: screenshots, text, headers, illustrations, magnifiers, pills, badges, blobs, ratings, logos and emojis. Preserve IDs, rich text, color references, layer groups, hidden/locked flags, and unknown fields. Opacity uses 0–100 in layouts.

A transform's null removes a field, e.g. model3D:null restores the 2D frame; it is not an instruction to retain the old value.

When binding an image into an empty frame, discover that frame's existing ID, then change its screenshot path. Uploading alone never binds it to a design.
