# screenshots tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:claude-catalogs`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## prepare_screenshot_styles

Generates or reuses personalized screenshot-layout candidates for every phone, tablet and desktop template. Returns a catalogKey, templateIds and galleryUrl for cached V1/V2 picker display. Matching app context and source paths reuse cached candidates. Preparation does not create a variant or open a picker.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may provide projectId instead. Project/generation UUID.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "selectedScreenshotPaths": {
      "minItems": 3,
      "maxItems": 7,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      },
      "description": "3-7 unique project-relative paths from list_source_screenshots, in the desired story order."
    },
    "deviceType": {
      "description": "Initial preview device. All three device layouts are prepared regardless. Defaults to phone.",
      "type": "string",
      "enum": [
        "phone",
        "tablet",
        "desktop"
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

## browse_templates

Displays the cached screenshot-style picker and returns its gallery URL for a device and optional template subset. A project plus prepared catalogKey enables personalized V1/V2 previews; without a catalog it provides static discovery. This read never generates options, applies a style or creates a variant.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "deviceType": {
      "description": "Which preview device the gallery should show first.",
      "type": "string",
      "enum": [
        "phone",
        "tablet",
        "desktop"
      ]
    },
    "templateIds": {
      "description": "Optional subset of template ids to show in the gallery.",
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
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may provide projectId instead. Project UUID from prepare_screenshot_styles. Provide together with catalogKey to show the real personalized previews.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "catalogKey": {
      "description": "Catalog key from prepare_screenshot_styles. Provide together with generationId.",
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

## apply_screenshot_style

Creates a new screenshot variant from a prepared personalized catalog and the specified template/palette selection. Reuses cached candidate layouts without another generation and returns the editor link. Existing variants are preserved.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may provide projectId instead.",
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
    "deviceType": {
      "description": "Device to show first in the editor. Defaults to phone.",
      "type": "string",
      "enum": [
        "phone",
        "tablet",
        "desktop"
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

## get_layout

Returns saved screenshot layouts for one variant and language, including independent phone-format layouts, an editor link and a same-target editing read receipt. Main/mobile changes do not implicitly update independent phone formats. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may provide projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "description": "Required for editing: use the exact language from the project's translations. If omitted, this only lists translations; call get_layout again with a returned language before transform_layout.",
      "type": "string",
      "minLength": 1
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "sign": {
      "type": "boolean"
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

## save_layout

Replaces complete saved screenshot layouts for the specified device sizes and language. Omitted formatLayouts preserves independent formats; an empty map resets them. Main layouts do not overwrite independent phone-format layouts.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may provide projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "type": "string"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "formatLayouts": {
      "description": "Complete phone-format override map. Keys include ios-duo-inner and ios-duo-outer. Omit to preserve; {} resets all formats to follow main.",
      "type": "object",
      "propertyNames": {
        "type": "string",
        "enum": [
          "ios-6.5",
          "ios-6.3",
          "ios-6.1",
          "ios-duo-inner",
          "ios-duo-outer",
          "android-play-high"
        ]
      },
      "additionalProperties": {
        "type": "object",
        "propertyNames": {
          "type": "string"
        },
        "additionalProperties": {}
      }
    },
    "mobileLayout": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {},
      "description": "Complete Layout object for the phone canvas. Shape documented in applaunchflow://schema/layout."
    },
    "tabletLayout": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {},
      "description": "Complete Layout object for the tablet canvas. Same shape as mobileLayout, different canvasWidth/canvasHeight."
    },
    "desktopLayout": {
      "description": "Optional complete Layout object for the desktop canvas. Same shape as mobileLayout.",
      "anyOf": [
        {
          "type": "object",
          "propertyNames": {
            "type": "string"
          },
          "additionalProperties": {}
        },
        {
          "type": "null"
        }
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
    "language",
    "mobileLayout",
    "tabletLayout"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## transform_layout

Applies scoped operations to saved screenshot layouts. Hosted edits require a fresh same-target read receipt. Every target requires nodeType; missing nodeId matches all nodes of that type within the selected screens. Dot-notation preserves sibling fields; null removes a field. Defaults to mobile only. Independent formatId edits and resetFormat are supported. Layout, font, device and asset validation occurs before saving.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may provide projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "type": "string"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "formatId": {
      "description": "Edit this phone format instead of mobile/tablet/desktop. Never combine with layouts. Existing independent formats do not follow later mobile edits.",
      "type": "string",
      "enum": [
        "ios-6.5",
        "ios-6.3",
        "ios-6.1",
        "ios-duo-inner",
        "ios-duo-outer",
        "android-play-high"
      ]
    },
    "resetFormat": {
      "description": "With formatId and no operations, remove that format override so it follows the main layout again. Requires a fresh get_layout read receipt.",
      "type": "boolean"
    },
    "atomic": {
      "type": "boolean"
    },
    "layouts": {
      "description": "Which layout sizes to transform. Defaults to ['mobile']; include 'tablet' / 'desktop' only when the user asks for them.",
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "mobile",
          "tablet",
          "desktop"
        ]
      }
    },
    "operations": {
      "default": [],
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
    "readReceipt": {
      "description": "Hosted connector only: provide the readReceipt returned by the immediately preceding get_layout call.",
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
    "language"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## translate_layouts

Translates screenshot-layout text into requested languages while preserving composition and language-specific images. Requires an existing source layout. Re-running a target language re-syncs its design from the source and can replace manual target-language design tweaks. Subject to translation allowances.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may provide projectId instead. The project/generation UUID.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "description": "Variant to translate. If omitted, uses the active variant.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "targetLanguages": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "en",
          "en-GB",
          "en-AU",
          "en-CA",
          "es",
          "es-MX",
          "fr",
          "fr-CA",
          "de",
          "it",
          "pt",
          "pt-BR",
          "ja",
          "ko",
          "zh-CN",
          "zh-TW",
          "nl",
          "ru",
          "ar",
          "tr",
          "pl",
          "sv",
          "no",
          "da",
          "fi",
          "cs",
          "hi",
          "hu",
          "ro",
          "uk",
          "el",
          "he",
          "id",
          "ms",
          "th",
          "vi",
          "fil",
          "hr",
          "sk",
          "ca",
          "bn",
          "gu",
          "kn",
          "ml",
          "mr",
          "or",
          "pa",
          "sl",
          "ta",
          "te",
          "ur"
        ]
      },
      "description": "Array of target language codes (e.g. ['en', 'ja', 'de']). Use el for Greek (el-GR), he for Hebrew (iw-IL), fil for Filipino, or for Odia, pa for Punjabi. The source language is auto-detected and excluded."
    },
    "layouts": {
      "description": "Which layout sizes to translate. Defaults to ['mobile', 'tablet']. Include 'desktop' only if the project has a desktop layout.",
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "mobile",
          "tablet",
          "desktop"
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
    "targetLanguages"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_translations

Lists available screenshot-layout translations and source-language metadata for a project or variant. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may provide projectId instead.",
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

## apply_locale_screenshots

Assigns language-specific screenshot assets to existing translated device frames. Sources are locale folders, per-language paths or a shared path list. Assignment follows document order; unfilled frames retain their images and excess sources are reported. Preview mode returns assignments without saving. Apply mode replaces only the targeted translation images.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "Screenshot variant to update."
    },
    "languages": {
      "description": "Translations to update; defaults to every language the source covers.",
      "maxItems": 51,
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "deviceType": {
      "default": "mobile",
      "type": "string",
      "enum": [
        "mobile",
        "tablet",
        "desktop"
      ]
    },
    "platform": {
      "default": "both",
      "type": "string",
      "enum": [
        "ios",
        "android",
        "both"
      ]
    },
    "localeFolders": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {
        "type": "string",
        "format": "uuid",
        "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
      }
    },
    "screenshotPathsByLanguage": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {
        "maxItems": 500,
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    },
    "screenshotPaths": {
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "preview": {
      "description": "Return the frame assignments without saving.",
      "type": "boolean"
    }
  },
  "required": [
    "projectId",
    "variantId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## sync_layout

Copies a screenshot variant's source-language design to its other languages while retaining translated text and language-specific screenshots. Existing language-specific design tweaks are replaced. Optional missing-image fill and changed-text translation are supported.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may provide projectId instead.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "fillMissingImages": {
      "type": "boolean"
    },
    "translateChangedText": {
      "type": "boolean"
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

## preview_screenshots

Renders selected screens of a saved screenshot variant as inspection images using the export renderer. Supports one platform, device, size and language per request, including independent phone formats. At most ten screens. Images can be downscaled and are not store-delivery exports. Does not change saved designs.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "variantId": {
      "description": "Screenshot variant; defaults to the active one.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "language": {
      "description": "Translation language; defaults to the project's source language.",
      "type": "string"
    },
    "device": {
      "type": "string",
      "enum": [
        "phone",
        "tablet",
        "desktop"
      ]
    },
    "platform": {
      "description": "Store look (device frame, Android size); defaults to the project platform.",
      "type": "string",
      "enum": [
        "ios",
        "android"
      ]
    },
    "displaySize": {
      "type": "string",
      "enum": [
        "11",
        "13",
        "6.9",
        "6.5",
        "6.3",
        "6.1",
        "duo-inner",
        "duo-outer",
        "12.9",
        "10.5",
        "play-high",
        "preview"
      ]
    },
    "screens": {
      "description": "Screen indexes (0-based). Defaults to every screen.",
      "minItems": 1,
      "maxItems": 10,
      "type": "array",
      "items": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      }
    },
    "maxEdge": {
      "description": "Longest edge of each returned image in pixels (default 1024).",
      "type": "integer",
      "minimum": 200,
      "maximum": 1600
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## store_review_snapshot

App-only: temporarily stores a PNG rendered by the edit-result widget for visual review. Does not render on the server or modify a design or library asset.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "png": {
      "type": "string",
      "maxLength": 4000000
    }
  },
  "required": [
    "projectId",
    "png"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false
}
```

## view_review_snapshot

Returns actual PNG pixels previously uploaded by the edit-result widget for the specified project and snapshot ID. Only the uploading user can access the snapshot, which expires after fifteen minutes. Does not modify a design.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "snapshotId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "projectId",
    "snapshotId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false
}
```

## list_export_formats

Lists screenshot export formats, device families, platforms, authored dimensions and available resolution presets. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {},
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## render_screenshots

Starts a render of saved screenshot translations for the active or specified variant. Supports preset or custom dimensions, independent phone-format layouts and at most ten screens per validated iOS package. Uses export allowance. Repeated requests with the same idempotencyKey reuse the original request.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
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
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "resolutions": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {
        "anyOf": [
          {
            "type": "object",
            "properties": {
              "preset": {
                "type": "string",
                "enum": [
                  "play-high",
                  "preview"
                ]
              }
            },
            "required": [
              "preset"
            ],
            "additionalProperties": false
          },
          {
            "type": "object",
            "properties": {
              "width": {
                "type": "integer",
                "minimum": 320,
                "maximum": 8192
              },
              "height": {
                "type": "integer",
                "minimum": 320,
                "maximum": 8192
              }
            },
            "required": [
              "width",
              "height"
            ],
            "additionalProperties": false
          }
        ]
      }
    },
    "languages": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "idempotencyKey": {
      "type": "string",
      "minLength": 8,
      "maxLength": 128
    }
  },
  "required": [
    "projectId",
    "formats",
    "languages",
    "idempotencyKey"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_release_render

Returns the status, progress and available download artifacts of an existing screenshot render job. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "renderId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "renderId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```
