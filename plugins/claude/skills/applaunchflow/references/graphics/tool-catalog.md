# graphics tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:claude-catalogs`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## prepare_social_graphics_styles

Generates or reuses personalized layout candidates across supported social, store-creative and ad formats. Returns a catalogKey, templateIds and galleryUrl for cached picker display. Matching app context and screenshot paths reuse cached candidates. Preparation does not create a variant or open a picker.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "selectedScreenshotPaths": {
      "minItems": 1,
      "maxItems": 7,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      },
      "description": "1-7 unique project-relative paths for app_store_header; 3-7 for other formats. Use paths from list_source_screenshots, in story order."
    },
    "primaryFormat": {
      "description": "Format to preview first. Defaults to og.",
      "type": "string",
      "enum": [
        "og",
        "x_post",
        "instagram_story",
        "instagram_post",
        "x_header",
        "linkedin_banner",
        "play_store_feature",
        "app_store_event_card",
        "app_store_event_details",
        "app_store_header",
        "app_store_search",
        "ad_banner",
        "ad_mobile_banner",
        "ad_tablet_banner_720",
        "ad_tablet_banner_728",
        "ad_mrec",
        "ad_phone_portrait",
        "ad_phone_landscape",
        "ad_fullscreen_landscape",
        "ad_tablet_portrait",
        "ad_tablet_landscape"
      ]
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "selectedScreenshotPaths"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## browse_social_templates

Displays the cached social-style picker and returns its gallery URL and format specifications. A project plus prepared catalogKey enables personalized V1/V2 previews; without a catalog it provides static discovery. This read never generates options, applies a style or creates a variant.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "format": {
      "description": "Which social format the gallery should preview first. Defaults to 'og'.",
      "type": "string",
      "enum": [
        "og",
        "x_post",
        "instagram_story",
        "instagram_post",
        "x_header",
        "linkedin_banner",
        "play_store_feature",
        "app_store_event_card",
        "app_store_event_details",
        "app_store_header",
        "app_store_search",
        "ad_banner",
        "ad_mobile_banner",
        "ad_tablet_banner_720",
        "ad_tablet_banner_728",
        "ad_mrec",
        "ad_phone_portrait",
        "ad_phone_landscape",
        "ad_fullscreen_landscape",
        "ad_tablet_portrait",
        "ad_tablet_landscape"
      ]
    },
    "templateIds": {
      "description": "Optional subset of social template ids to show.",
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "selectedTemplateId": {
      "description": "Optional template id to highlight in the gallery.",
      "type": "string"
    },
    "title": {
      "description": "Optional gallery heading, for example the project name.",
      "type": "string"
    },
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead. Project UUID from prepare_social_graphics_styles. Pass together with catalogKey to show the real personalized previews.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "catalogKey": {
      "description": "Catalog key from prepare_social_graphics_styles. Pass together with generationId.",
      "type": "string",
      "minLength": 1,
      "maxLength": 128
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## apply_social_graphics_style

Creates a new social-graphics variant from a prepared catalog and selected style. Includes all supported formats, reuses cached layouts without another generation and returns the graphics editor link.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "catalogKey": {
      "type": "string",
      "minLength": 1,
      "maxLength": 128
    },
    "templateId": {
      "type": "string",
      "minLength": 1
    },
    "primaryFormat": {
      "description": "Format to show first in the editor. Defaults to og.",
      "type": "string",
      "enum": [
        "og",
        "x_post",
        "instagram_story",
        "instagram_post",
        "x_header",
        "linkedin_banner",
        "play_store_feature",
        "app_store_event_card",
        "app_store_event_details",
        "app_store_header",
        "app_store_search",
        "ad_banner",
        "ad_mobile_banner",
        "ad_tablet_banner_720",
        "ad_tablet_banner_728",
        "ad_mrec",
        "ad_phone_portrait",
        "ad_phone_landscape",
        "ad_fullscreen_landscape",
        "ad_tablet_portrait",
        "ad_tablet_landscape"
      ]
    },
    "paletteMode": {
      "description": "Color palette variant. v1 is the original palette; v2 uses stronger color separation. Defaults to v1.",
      "type": "string",
      "enum": [
        "v1",
        "v2"
      ]
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "catalogKey",
    "templateId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_graphics

Returns saved social-graphics layouts and variant metadata for one language, including primary format and available languages. Unsaved derived formats are absent. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "description": "Graphics language (e.g. de, pt-BR). Omit for the source language. Use list_graphics_translations for the saved languages and translate_graphics to add one.",
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "pattern": "^[a-z]{2,3}(-[A-Za-z]{2,4})?$"
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_graphics_format

Returns one social or store-creative format layout, canvas dimensions and a same-target editing read receipt. An unsaved format is derived from the primary format and marked derived:true without persisting it. Includes App Store headers/search creatives and other supported formats. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "description": "Graphics language (e.g. de, pt-BR). Omit for the source language. Use list_graphics_translations for the saved languages and translate_graphics to add one.",
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "pattern": "^[a-z]{2,3}(-[A-Za-z]{2,4})?$"
    },
    "format": {
      "type": "string",
      "enum": [
        "og",
        "x_post",
        "instagram_story",
        "instagram_post",
        "x_header",
        "linkedin_banner",
        "play_store_feature",
        "app_store_event_card",
        "app_store_event_details",
        "app_store_header",
        "app_store_search",
        "ad_banner",
        "ad_mobile_banner",
        "ad_tablet_banner_720",
        "ad_tablet_banner_728",
        "ad_mrec",
        "ad_phone_portrait",
        "ad_phone_landscape",
        "ad_fullscreen_landscape",
        "ad_tablet_portrait",
        "ad_tablet_landscape"
      ]
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "format"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## save_graphics

Replaces the supplied complete social-graphics layout data for one language. This is a whole-document save rather than a targeted field patch.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "description": "Graphics language (e.g. de, pt-BR). Omit for the source language. Use list_graphics_translations for the saved languages and translate_graphics to add one.",
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "pattern": "^[a-z]{2,3}(-[A-Za-z]{2,4})?$"
    },
    "socialTemplateId": {
      "type": "string",
      "minLength": 1
    },
    "socialPrimaryFormat": {
      "type": "string",
      "enum": [
        "og",
        "x_post",
        "instagram_story",
        "instagram_post",
        "x_header",
        "linkedin_banner",
        "play_store_feature",
        "app_store_event_card",
        "app_store_event_details",
        "app_store_header",
        "app_store_search",
        "ad_banner",
        "ad_mobile_banner",
        "ad_tablet_banner_720",
        "ad_tablet_banner_728",
        "ad_mrec",
        "ad_phone_portrait",
        "ad_phone_landscape",
        "ad_fullscreen_landscape",
        "ad_tablet_portrait",
        "ad_tablet_landscape"
      ],
      "description": "The variant's default format (persisted)."
    },
    "graphics": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "format": {
            "type": "string",
            "enum": [
              "og",
              "x_post",
              "instagram_story",
              "instagram_post",
              "x_header",
              "linkedin_banner",
              "play_store_feature",
              "app_store_event_card",
              "app_store_event_details",
              "app_store_header",
              "app_store_search",
              "ad_banner",
              "ad_mobile_banner",
              "ad_tablet_banner_720",
              "ad_tablet_banner_728",
              "ad_mrec",
              "ad_phone_portrait",
              "ad_phone_landscape",
              "ad_fullscreen_landscape",
              "ad_tablet_portrait",
              "ad_tablet_landscape"
            ]
          },
          "layout": {
            "type": "object",
            "propertyNames": {
              "type": "string"
            },
            "additionalProperties": {},
            "description": "Complete Layout object for this format — the SAME shape screenshot layouts use, with exactly one entry in screens[] and canvasWidth/canvasHeight matching the format. Full field reference: applaunchflow://schema/layout."
          }
        },
        "required": [
          "format",
          "layout"
        ]
      }
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "socialTemplateId",
    "socialPrimaryFormat",
    "graphics"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## save_graphics_format

Saves one complete social or store-creative format layout for the specified variant and language. Hosted edits require a fresh same-format read receipt. The layout must contain exactly one screen at the format's authored canvas size. Other formats are preserved.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "description": "Graphics language (e.g. de, pt-BR). Omit for the source language. Use list_graphics_translations for the saved languages and translate_graphics to add one.",
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "pattern": "^[a-z]{2,3}(-[A-Za-z]{2,4})?$"
    },
    "format": {
      "type": "string",
      "enum": [
        "og",
        "x_post",
        "instagram_story",
        "instagram_post",
        "x_header",
        "linkedin_banner",
        "play_store_feature",
        "app_store_event_card",
        "app_store_event_details",
        "app_store_header",
        "app_store_search",
        "ad_banner",
        "ad_mobile_banner",
        "ad_tablet_banner_720",
        "ad_tablet_banner_728",
        "ad_mrec",
        "ad_phone_portrait",
        "ad_phone_landscape",
        "ad_fullscreen_landscape",
        "ad_tablet_portrait",
        "ad_tablet_landscape"
      ]
    },
    "layout": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {},
      "description": "Complete Layout object for this one format — the SAME shape screenshot layouts use, with exactly one entry in screens[] and canvasWidth/canvasHeight matching the format. Full field reference: read the resource applaunchflow://schema/layout."
    },
    "readReceipt": {
      "description": "Hosted connector only: pass the readReceipt returned by the immediately preceding get_graphics_format call.",
      "type": "string"
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "format",
    "layout"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## transform_graphics

Applies layout operations across the selected social-graphics formats and languages. syncFrom recomposes target formats from the specified source and replaces their current layouts, including custom work. Changes are validated before saving.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "description": "Graphics language (e.g. de, pt-BR). Omit for the source language. Use list_graphics_translations for the saved languages and translate_graphics to add one.",
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "pattern": "^[a-z]{2,3}(-[A-Za-z]{2,4})?$"
    },
    "formats": {
      "description": "Without syncFrom: formats the operations edit (default: primary format). With syncFrom: formats rebuilt from it (default: all other formats).",
      "maxItems": 21,
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "og",
          "x_post",
          "instagram_story",
          "instagram_post",
          "x_header",
          "linkedin_banner",
          "play_store_feature",
          "app_store_event_card",
          "app_store_event_details",
          "app_store_header",
          "app_store_search",
          "ad_banner",
          "ad_mobile_banner",
          "ad_tablet_banner_720",
          "ad_tablet_banner_728",
          "ad_mrec",
          "ad_phone_portrait",
          "ad_phone_landscape",
          "ad_fullscreen_landscape",
          "ad_tablet_portrait",
          "ad_tablet_landscape"
        ]
      }
    },
    "operations": {
      "description": "Layout operations; optional when syncFrom is set.",
      "maxItems": 100,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": [
              "update_node",
              "delete_node",
              "add_node",
              "reorder",
              "replace_color",
              "bring_to_front",
              "send_to_back"
            ],
            "description": "Operation type. update_node merges changes into every matched node (null removes a field). replace_color is a find-and-replace for colors across the layout — use it for bulk color changes instead of updating each text node individually. Example: {type:'replace_color', target:{nodeType:'screen'}, changes:{find:'#F6EFE9', replace:'#7C3AED'}} replaces that color everywhere (text marks, icon colors, backgrounds). Use screens:'all' to replace across all screens, or screens:[6] for a single screen. reorder takes changes.order (node ids back-to-front) and permutes the zIndex values those nodes already have. bring_to_front / send_to_back move the matched node(s) above / below every other element on their screen (all node types share one zIndex order per screen)."
          },
          "target": {
            "type": "object",
            "properties": {
              "nodeType": {
                "type": "string",
                "description": "REQUIRED. The node type to target: 'layout' (layout-level fields: backgroundColor, backgroundGradient, colorRefs, orientation, screenshotGap, phoneFormatImagesOnly, layerGroups, themeColors {role: hex} recoloring linked elements like the editor's Theme panel, themePaletteMode 'v1'|'v2'), 'screen', 'text', 'screenshot', 'illustration', 'magnifier', 'pill', 'badge', 'blob', 'rating', 'logo', 'emoji', 'header', 'panoramaBackground', 'backgroundImage'."
              },
              "nodeId": {
                "description": "Optional. Target a specific node by id. If omitted, the operation applies to ALL nodes of nodeType in the target screens.",
                "type": "string"
              },
              "selector": {
                "description": "Optional. Target screens by id: 'screenId:<id>'. Do NOT use '#' prefix.",
                "type": "string"
              },
              "screens": {
                "description": "Optional. Target specific screens by index array (e.g. [0, 1, 2]) or 'all' for every screen. If omitted, targets all screens.",
                "anyOf": [
                  {
                    "type": "string",
                    "const": "all"
                  },
                  {
                    "type": "array",
                    "items": {
                      "type": "number"
                    }
                  }
                ]
              }
            },
            "required": [
              "nodeType"
            ]
          },
          "changes": {
            "type": "object",
            "propertyNames": {
              "type": "string"
            },
            "additionalProperties": {},
            "description": "Fields to set (dot-notation allowed). A null value REMOVES that field: {backgroundGradient:null}, {model3D:null} (back to the 2D frame), {shadow:null}, {iosPath:null}. Asset fields: screenshot.path, illustration.path / logo.path, screen backgroundImage.storagePath, panoramaBackground.storagePath — relative project paths from upload_asset / list_assets."
          },
          "platform": {
            "description": "Screenshot path changes only. Omit to replace the image on BOTH platforms (clears iosPath/androidPath overrides, like the editor's Replace). Set to store changes.path as that platform's override only.",
            "type": "string",
            "enum": [
              "ios",
              "android"
            ]
          }
        },
        "required": [
          "type",
          "target",
          "changes"
        ]
      }
    },
    "syncFrom": {
      "description": "Source format for 'Sync to all formats'.",
      "type": "string",
      "enum": [
        "og",
        "x_post",
        "instagram_story",
        "instagram_post",
        "x_header",
        "linkedin_banner",
        "play_store_feature",
        "app_store_event_card",
        "app_store_event_details",
        "app_store_header",
        "app_store_search",
        "ad_banner",
        "ad_mobile_banner",
        "ad_tablet_banner_720",
        "ad_tablet_banner_728",
        "ad_mrec",
        "ad_phone_portrait",
        "ad_phone_landscape",
        "ad_fullscreen_landscape",
        "ad_tablet_portrait",
        "ad_tablet_landscape"
      ]
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## update_graphics_settings

Changes variant-wide graphics settings. primaryFormat changes the default format across languages. Platform switching updates device frames/models and single-store badges across saved formats and languages; on a single-platform project it also changes the project platform shared by the screenshot editor.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "primaryFormat": {
      "type": "string",
      "enum": [
        "og",
        "x_post",
        "instagram_story",
        "instagram_post",
        "x_header",
        "linkedin_banner",
        "play_store_feature",
        "app_store_event_card",
        "app_store_event_details",
        "app_store_header",
        "app_store_search",
        "ad_banner",
        "ad_mobile_banner",
        "ad_tablet_banner_720",
        "ad_tablet_banner_728",
        "ad_mrec",
        "ad_phone_portrait",
        "ad_phone_landscape",
        "ad_fullscreen_landscape",
        "ad_tablet_portrait",
        "ad_tablet_landscape"
      ]
    },
    "platform": {
      "type": "string",
      "enum": [
        "ios",
        "android"
      ]
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## translate_graphics

Creates or refreshes translated social-graphics layouts in the requested languages using text translation. Existing target-language edits can be overwritten. Subject to the account's translation allowances.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "description": "Variant to translate. Defaults to the active graphics variant.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "targetLanguages": {
      "minItems": 1,
      "maxItems": 20,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 2,
        "maxLength": 16
      },
      "description": "Language codes, e.g. ['de','ja','pt-BR']. Unsupported codes are rejected with the list of issues."
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "targetLanguages"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_graphics_translations

Lists source and available translation languages for a social-graphics variant. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## render_graphics

Renders saved or derived social/store-creative layouts deterministically. Preview mode returns inspection images and does not consume export allowance. Export mode uses export allowance and returns native-size artifacts with required opacity, file type and file-size limits, plus ZIP output where applicable. Download links are short-lived. Does not modify saved layouts.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "formats": {
      "minItems": 1,
      "maxItems": 21,
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "og",
          "x_post",
          "instagram_story",
          "instagram_post",
          "x_header",
          "linkedin_banner",
          "play_store_feature",
          "app_store_event_card",
          "app_store_event_details",
          "app_store_header",
          "app_store_search",
          "ad_banner",
          "ad_mobile_banner",
          "ad_tablet_banner_720",
          "ad_tablet_banner_728",
          "ad_mrec",
          "ad_phone_portrait",
          "ad_phone_landscape",
          "ad_fullscreen_landscape",
          "ad_tablet_portrait",
          "ad_tablet_landscape"
        ]
      }
    },
    "languages": {
      "description": "Saved graphics languages. Default: the source language.",
      "minItems": 1,
      "maxItems": 10,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 2,
        "maxLength": 16
      }
    },
    "platform": {
      "type": "string",
      "enum": [
        "ios",
        "android"
      ]
    },
    "mode": {
      "default": "preview",
      "type": "string",
      "enum": [
        "preview",
        "export"
      ]
    },
    "projectId": {
      "description": "Alias of generationId (the project id).",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "formats"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```
