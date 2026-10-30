# graphics tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:plugin-skills`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## prepare_social_graphics_styles

Generate or reuse the project's personalized social-graphics style catalog before the user chooses a style. This prepares every social template across all supported social, store-listing, and mobile-ad formats in one AI call and returns a catalogKey. This tool itself displays the existing dashboard picker inline in Claude, ChatGPT, and other MCP Apps-compatible hosts; do not call another tool after it. A variant is created only after the user explicitly confirms a style. Clients without UI support receive the exact gallery URL. Repeating the same app context and screenshot paths reuses the cache.

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

Open the visual social style gallery. With generationId and catalogKey from prepare_social_graphics_styles it renders personalized previews and creates the selected variant directly; without them it provides static style discovery. Never offer social templates via text or AskUserQuestion.

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

Create a new social-graphics variant from a previously prepared personalized catalog without another AI generation. Use after prepare_social_graphics_styles and browse_social_templates. The new variant contains all supported formats and opens in the graphics editor.

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

Fetch the saved social graphics layouts (one per saved format) of one language for overview or metadata inspection: socialTemplateId, socialPrimaryFormat (the default format), language, sourceLanguage and availableLanguages. Formats the variant never saved are absent here; get_graphics_format derives them. For direct edits, use get_graphics_format instead.

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

Fetch exactly one social or App Store creative layout for a project, including app_store_header (3840x1646) and app_store_search (1920x1280). Use this before direct edits so the next save_graphics_format call works from the current state of that same format. If the user did not request a specific format, use the variant's primary format from an earlier get_graphics response or inspect the editor URL. A format the variant never saved (older variants lack e.g. app_store_header) is derived server-side from the primary format exactly as the editor does when the format is opened, and returned with derived:true; edit it and save_graphics_format persists it. Never hand-build a layout from scratch. The returned layout is the same Layout shape screenshots use — exactly one screen, canvas sized to the format. Read the resource applaunchflow://schema/layout for every node type's fields and valid ranges.

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

Persist several social graphics formats of one language at once. The listed formats are replaced; formats you omit keep their saved layout. socialTemplateId and socialPrimaryFormat are stored for the whole variant (every language): socialPrimaryFormat is the default format the editor opens. To change only the default format or switch iOS/Android, use update_graphics_settings. Prefer save_graphics_format when editing a single format, and transform_graphics for the same change across formats. Each layout must have exactly one screen and its format's canvas size (validated); see the resource applaunchflow://schema/layout.

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

Persist exactly one social or App Store creative format after reading the latest same-format layout with get_graphics_format. Supports full layout editing of text, images, logos, devices, backgrounds and positioning, including app_store_header and app_store_search. Preserve unrequested fields and the format's canvas dimensions. This edits AppLaunchFlow designs, not a live store listing. ENFORCED: each call requires a fresh get_graphics_format for the same generationId/variantId/language/format immediately beforehand. The layout must have exactly one screen and the format's canvas size; violations return specific validation issues. Read the current layouts, mutate only the requested format in memory, then save that single layout here.

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

Apply the same layout operations to several social formats in one atomic save, and/or rebuild formats from one source format (the editor's 'Sync to all formats'). Operations use the transform_layout contract (applaunchflow://schema/transforms); each social layout has exactly one screen, so target screens:[0] or omit screens. Without syncFrom, operations edit `formats` (default: the variant's primary format). With syncFrom, operations edit only the syncFrom format, then every format in `formats` (default: ALL other formats) is rebuilt from it with each template's own composition for that size; this replaces those formats' current layouts, so confirm with the user before syncing over formats they customized. Formats the variant never saved are derived first, like the editor. Works per language (default: source language). No prior read is required, but inspect the result.

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

Variant-wide social-graphics settings. primaryFormat sets the default format (the one the editor opens first; all languages). platform switches iOS/Android like the editor's platform toggle: every saved format and language gets that store's device frames/3D models, and a lone App Store/Google Play badge swaps to the matching store (layouts showing both badges keep both). For a single-platform project this also switches the project's platform, which the screenshot editor shares.

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

Translate every saved format of a social-graphics variant into one or more languages with AI, preserving layout, styling and images (the editor's Translate). Each target language becomes its own saved copy; translating a language that already exists replaces its layouts. The source language is detected and skipped. Then edit a language with get_graphics_format/save_graphics_format or transform_graphics using language, and render it with render_graphics languages. Do NOT translate by editing text nodes by hand.

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

List the languages a social-graphics variant has saved (sourceLanguage plus availableLanguages). Pass one as language to the graphics read, edit and render tools.

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

Render saved social graphics on the server, no browser needed. Use mode 'preview' (default, free) to LOOK at your edits: returns the rendered images inline (up to 6; the rest as URLs). Use mode 'export' to DELIVER files: native-size images per format and language, encoded like the editor's export (opaqueExport 'png' = PNG without alpha, e.g. the PNG-only app_store_header; 'jpeg' = opaque JPEG; size ceilings respected), plus a ZIP when there are several. Export uses the account's export allowance/credit. Formats the variant never saved are derived like the editor (flagged derived). platform defaults to the project's platform. Download URLs expire after about 15 minutes; give them to the user right away. Rendering takes roughly 30-120 s.

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
