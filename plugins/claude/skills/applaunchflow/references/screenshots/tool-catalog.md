# screenshots tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:plugin-skills`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## prepare_screenshot_styles

Generate or reuse the project's personalized screenshot-style catalog before the user chooses a style. This prepares every screenshot template for phone, tablet, and desktop in one AI call and returns a catalogKey. This tool itself displays the interactive picker in MCP Apps-compatible clients; do not call another tool after it. The picker shows real v1/v2 renders and creates a variant only after the user explicitly confirms a style. Repeating this with the same app context and screenshot paths is a cache hit and does not regenerate AI content. Clients without UI support receive the exact full-gallery URL.

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

Open the visual style gallery. With generationId and catalogKey from prepare_screenshot_styles it renders personalized v1/v2 previews and creates the selected variant directly; without them it provides static style discovery. Never offer templates via text or AskUserQuestion.

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

Create a new screenshot variant from a previously prepared personalized style catalog without another AI generation. Fallback for applying a template id supplied directly in chat or by an API client. The normal prepare_screenshot_styles flow now lets the user compare v1/v2 and create the variant directly in the browser. The new variant includes phone, tablet, and desktop layouts and opens in the editor.

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

Get layout JSON for the current translation before editing or reviewing a variant. Includes independent phone designs in format_layouts; they do not follow main/mobile edits. Use transform_layout with formatId to edit one, or resetFormat:true to follow main again. This is mandatory before every direct transform_layout call. Returns the editor URL as a reference link; it is not opened automatically. Share it when the user wants to review the result. The returned JSON follows the layout schema documented in the resource applaunchflow://schema/layout — read it to learn which fields exist and their valid ranges, not just which ones happen to be set here.

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

Persist a full translation layout payload. Whole-layout replace per device size — prefer transform_layout for targeted edits. formatLayouts is the complete independent phone-format map: omit it to preserve existing formats, provide {} to reset all, or provide the map from get_layout with explicit changes. Main edits do not overwrite independent formats. Each layout must be a complete, valid Layout object; see the resource applaunchflow://schema/layout for every field and valid value range.

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

Apply transform operations to an existing layout. Primary editing tool for text, screenshots, colors, and structure changes. IMPORTANT: Always call get_layout FIRST to inspect the current layout state before using this tool. Never transform blindly. ENFORCED RULE: each transform_layout call requires a fresh get_layout call for the same generationId, language, and variantId immediately beforehand. RULES: 1. nodeType is REQUIRED in every operation target. 2. Omit nodeId to update ALL nodes of that type in the target screens. 3. Use screens:'all' to target every screen at once. Do NOT send one operation per screen when the same change applies to all. 4. Dot-notation is supported for deep updates without replacing the whole object. Example: {'richContent.attrs.defaultFontSize': 96} updates only the font size inside richContent.attrs, preserving all other fields. Always use dot-notation for nested property changes. 5. For add_node, changes MUST include an 'id' field. 6. To add new screens, first add empty screen containers, then populate them in a SECOND call using selector 'screenId:<id>'. 7. layouts defaults to ['mobile'] (phone only); list 'tablet'/'desktop' explicitly to change them too. Use formatId to edit a separate phone size such as ios-duo-inner; do not combine formatId with layouts. resetFormat:true with formatId and no operations makes that size follow main again. 8. FONT SIZE: The rendered font size is controlled ONLY by 'richContent.attrs.defaultFontSize' (pixel value). To change font size, use dot-notation: {'richContent.attrs.defaultFontSize': 80}. Do NOT use 'fontSizeScale' — that property is for promo videos only and has NO effect on screenshot rendering. 9. UNSET: a null value removes a field ({model3D:null} returns to the 2D frame, {backgroundGradient:null}, {shadow:null}). 10. THEME: target {nodeType:'layout'} with changes {themeColors:{primary:'#...'}} recolors every linked element and re-derives dependent roles like the editor; {themePaletteMode:'v2'} switches the generated palette; orientation, backgroundColor, backgroundGradient, screenshotGap are also layout-level. 11. SCREENSHOT IMAGE: setting a screenshot's path replaces the image on both platforms (iosPath/androidPath overrides win over path and are cleared); provide platform:'ios'|'android' to change one platform only. phoneId is the 2D frame and follows the project platform at render (iphone17 / googlepixel); choose another device with model3D {modelId, finish, rotationX, rotationY, rotationZ}. 12. STACKING: zIndex is one order per screen across ALL node types; use bring_to_front / send_to_back, or reorder (which keeps the collection's zIndex values). 13. COORDINATES are per screen in canvas pixels: a text's position.x is the LEFT edge of its box (width wide, aligned inside it) and position.y its top; a screenshot's position is the device CENTRE and ScreenshotNode.scale its size factor. VALIDATION: unknown font families (see list_fonts), invalid 3D modelId/finish, magnifier.screenshotId not on the same screen, and asset paths that do not exist in the project are rejected with the reason; nothing is saved. Check the result visually with preview_screenshots. SCHEMA REFERENCE: read the resource applaunchflow://schema/transforms for the full operation and selector reference, and applaunchflow://schema/layout for every node type's fields and valid value ranges. Read them before any non-trivial edit rather than guessing field names.

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

Translate screenshot layouts into one or more target languages using AI. This is the PREFERRED way to localize screenshots — do NOT manually edit text nodes for translation. The backend translates all text in the layout while preserving positioning, styling, and screenshots. Requires a source screenshot layout to already exist — created by the personalized gallery or apply_screenshot_style. Provide the source variantId when available to translate that exact variant; if omitted, the active variant is used. Re-running it for a language that already exists RE-SYNCS that translation from the source layout: its design (positions, styles, colors, devices) is replaced by the source's, unchanged text reuses the previous translation and per-language screenshots are kept; manual per-language design edits are lost. To copy only the design without translating, use sync_layout; to put language-specific screenshots in, use apply_locale_screenshots.

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

List available translations for a project variant. Returns which languages have been translated.

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

Put language-specific screenshots into existing translations without retranslating: each language's images fill that translation's device frames in document order (a two-device screen takes two images); extra images are reported, unfilled frames keep their image. Sources (exactly one): localeFolders {language: folderId} from list_asset_folders / set_asset_folder_locale (images sorted by original filename), screenshotPathsByLanguage {language: [paths]}, or screenshotPaths (same images for every selected language). platform 'both' (default) sets the shared image and clears per-platform overrides; 'ios'/'android' sets only that platform's override. Use preview:true first to see the frame assignments without saving. Overwrites the images of the targeted translations.

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

Copy the source-language design (positions, sizes, styles, colors, devices, new or removed elements) of a screenshot variant to every other language WITHOUT re-translating: each translation keeps its own text and its own screenshots. Use after design edits to the source language. fillMissingImages also fills empty frames from the source. translateChangedText:true additionally translates only text that changed in the source (uses AI). Overwrites the design of every non-source translation of the variant, including per-language design tweaks.

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

Render chosen screens of a saved screenshot variant with the real export renderer and return them as images you can look at. Use it after transform_layout / save_layout / translate_layouts to check legibility, overlap, cropping and colors before reporting a visual result. Renders the saved state (not unsaved edits) for one platform/device/size/language. Defaults: active variant, project source language, phone, the project's platform, the store's primary size (iOS 6.9", Android play-high, iPad 13"). displaySize also selects an independent phone format (6.5/6.3/6.1, duo-inner/duo-outer, play-high). Takes ~20-60 s (longer with 3D devices); request only the screens you need (max 10). Images are downscaled; this is not an export (use render_screenshots for store files).

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

App-only: temporarily store the PNG rendered by the edit-result widget for automatic review or a manual Review retry. Does not render on the server or modify any design or library asset.

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

Retrieve actual PNG image pixels rendered by the user's edit-result widget. Call this when the widget's review message provides projectId and snapshotId; inspect the returned image, not layout JSON. Snapshots expire after 15 minutes and only the uploading user can read them. This does not modify the design.

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

List supported store dimensions and locales for validated Fastlane packages.

Input schema:

```json
{
  "type": "object",
  "properties": {},
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## render_screenshots

Render the saved translations of the active screenshot variant (or a specified existing variant). Use list_export_formats for sizes, including ios.phone.duo-inner and ios.phone.duo-outer. Presets use their independent format layout when present; use transform_layout with formatId to edit or reset it. Validated iOS packages allow at most 10 screens. Set resolutions['android.phone'] to {preset:'preview'} for 1290x2796 or {preset:'play-high'} for 2160x3840 (default). Any requested format can use exact custom {width,height} (320-8192 pixels); custom sizes may not satisfy store requirements. Presets follow layout orientation. One resolution per format per request. Update captures and copy through the normal asset and layout tools first. Reuse idempotencyKey for retries; never replace it after an uncertain outcome.

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

Poll a render. Only succeeded renders provide a validated manifest and short-lived package download URL. Failed or indeterminate jobs must not be retried with a new key automatically.

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
