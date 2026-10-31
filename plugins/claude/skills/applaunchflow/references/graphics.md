Check that the workflow's named tools are exposed by this host. If one is absent, use the matching AppLaunchFlow editor link and explain the specific step that needs the dashboard; don't claim the step completed.

# Choose the actual surface

Resolve project, variant and language. For a new design, use the project's existing sources with `prepare_social_graphics_styles`, then immediately call `browse_social_templates` with the returned generationId/catalogKey and primaryFormat as format. No extra question is needed between preparation and display. Show the picker/URL and stop for the user's choice. Revisit with the same catalogKey, without preparing again. Picker confirmation creates the variant; don't apply twice. Use `apply_social_graphics_style` only for an explicit template/catalog choice supplied directly in chat or by an API. Most formats need 3–7 source screenshots; app_store_header can start with 1–7.

`get_graphics` gives an overview and primary format. Use `get_editing_reference(feature: "socialGraphics")` and `SOCIAL_FORMATS`/`SocialFormatDefinition` for the current formats and dimensions. Distinguish a static App Store header/search creative from an animated promo export in category creative.

Supported formats in the audited release: og, x_post, instagram_story, instagram_post, x_header, linkedin_banner, play_store_feature, app_store_event_card, app_store_event_details, app_store_header, app_store_search, ad_banner, ad_mobile_banner, ad_tablet_banner_720, ad_tablet_banner_728, ad_mrec, ad_phone_portrait, ad_phone_landscape, ad_fullscreen_landscape, ad_tablet_portrait, ad_tablet_landscape. Consult the live catalog when it changes.

# Edit and adapt

For one format, `get_graphics_format` returns the full Layout and receipt; `save_graphics_format` saves the complete edited layout for that same project/variant/language/format. Each contains exactly one screen and its exact format canvas dimensions. If it returns derived:true, the layout was adapted from the primary format; it becomes stored on save. Don't resize a layout by changing its canvas dimensions.

Layout nodes/coordinates follow screenshot conventions: canvas units, text top-left, device center, degrees for ordinary rotation and radians for 3D. Typography uses richContent. Fetch relevant symbols rather than guessing fields. Preserve all other elements.

For requested changes across several formats, `transform_graphics` applies operations atomically. Inspect the actual layouts first, even though this tool doesn't require a read receipt. Use `save_graphics` when complete multiple layouts are needed, preserving formats/languages not requested.

Use `transform_graphics(syncFrom: ...)` only for intentional recomposition from one format: it replaces target layouts and can remove format-specific customization. An Instagram Story usually needs a different text/device composition from a wide header; keep safe margins and useful hierarchy for each ratio.

`update_graphics_settings` sets the primary format or store platform for the variant. The platform switch affects device frames and badges across all formats/languages, not just the open format.

Use `list_graphics_translations` and `translate_graphics` for localization. Re-translating an existing language replaces its layouts; don't use it for one copy correction. A targeted correction uses that language's normal edit flow.

# Review and export

`render_graphics(mode: "preview")` returns rendered images (up to six inline); request only relevant formats/languages and inspect actual pixels. A widget alone isn't proof the model has seen an image. `view_review_snapshot` can inspect a previously uploaded browser snapshot when one exists; it cannot create one.

For delivery, use `render_graphics(mode: "export")`. Native-size/export rules come from the format definition: app_store_header is 3840×1646 and PNG without alpha; app_store_search is 1920×1280 with opaque JPEG rules. Native-only sizes and file-size ceilings must survive export. Use the actual returned files/ZIP promptly because links expire.

Preview images serve inspection, not store submission. If details look soft, improve preview resolution where the tool supports it and inspect the exported native file before asserting quality.

See [App Store headers and creative adaptation](graphics/store-creatives.md) for store-specific composition and output rules; [the tool catalog](graphics/tool-catalog.md) covers every input.
