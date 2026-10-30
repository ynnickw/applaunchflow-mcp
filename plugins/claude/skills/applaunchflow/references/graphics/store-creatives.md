# Static headers, search creatives and format adaptation

This describes AppLaunchFlow's renderer contract, not a promise that a platform will approve the artwork. Read SOCIAL_FORMATS and SocialFormatDefinition from get_editing_reference for the current dimensions and output rules before delivery.

## Which feature?

- An App Store product-page header or search-results still is a graphics format: app_store_header or app_store_search. It is not a screenshot HeaderNode, store listing text, or a custom product page publishing tool.
- An animated header/search creative belongs to promo-video category creative. Use that skill and its supported format/quality rules.
- In-app event card/details and Play Store feature graphics are also graphics formats. Creating the image doesn't create/publish an event or change a store connection.

## Creation and editing

For new static headers, prepare_social_graphics_styles accepts 1–7 existing source screenshots when primaryFormat is app_store_header. Other formats require at least three. The picker creates only after the user chooses; preserve the returned catalog and don't generate again just to revisit it.

For an existing graphics variant, get_graphics_format retrieves the chosen format even if it has to derive it from the primary design. Read its derived flag. Edit the single screen at the exact canvas size and save_graphics_format with its matching receipt. Adapt hierarchy, copy placement, screenshot/device size, crop and decorations; do not just stretch an old canvas or overwrite all formats. Targeting a headline is a text-node edit; adding the format itself is not adding a HeaderNode.

Shared layout support includes rich text, 2D/3D devices, illustrations, logos, ratings, badges, shapes, magnifiers, backgrounds and panoramas. Fetch typed references before creating elements; preserve IDs, rich text, themes/colorRefs and stacking. Do not invent testimonials, awards or review ratings. Use brand-appropriate visual hierarchy and a useful product demonstration rather than adding decorations just because the schema permits them.

## Composition by aspect ratio

- Wide header/banner: one dominant promise, one clear product focus, intentional negative space and readable copy. A portrait-screen collage should not overwhelm the short height.
- Search creative: compose deliberately for 3:2; do not crop a 21:9 header blindly.
- Story/vertical: keep copy and key UI away from edges and overlay-prone regions; maintain a clear focal point and generous separation.
- Small ad banner: use minimal copy and strong contrast. Fine body copy from a full-size story will not remain readable at a small ad size.
- Format sync: transform_graphics syncFrom intentionally recomposes and replaces target layouts. Confirm the requested scope if targets contain custom work; use individual format edits when preservation is required.

## Current native output constraints

| Format | Authored size | Special export behavior |
| --- | --- | --- |
| app_store_header | 3840 × 1646 | Native pixels, opaque PNG; no alpha |
| app_store_search | 1920 × 1280 | Native pixels, opaque JPEG renderer rule |
| play_store_feature | 1024 × 500 | Native pixels, opaque JPEG renderer rule |
| app_store_event_card | 1920 × 1080 | Native pixels |
| app_store_event_details | 1080 × 1920 | Native pixels |
| instagram_story | 1080 × 1920 | Native pixels; renderer file-size ceiling |

Other ad placements also have native-size and file-size constraints in SOCIAL_FORMATS. Do not invent retina multiples for nativeExportOnly placements. Use preview to inspect the design, export only when requested, and preserve the native dimensions/opacity/file type on export. Do not deliver a low-resolution review image as a store-ready file. Verify the returned native artifact and report store publishing separately.
