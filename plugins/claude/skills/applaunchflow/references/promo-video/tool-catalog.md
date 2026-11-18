# promo-video tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:claude-catalogs`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## create_device_video

Saves a new Video variant in the selected project using its existing screenshots or recordings on a 3D device, without generating copy. Returns the variant ID and editor link. Optional replaceVariantId retires that existing variant after the new video saves and requires explicit user approval.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "Project / generation UUID."
    },
    "deviceType": {
      "default": "phone",
      "type": "string",
      "enum": [
        "phone",
        "tablet",
        "desktop"
      ]
    },
    "deviceModelId": {
      "description": "Match deviceType. iPhone Duo is a phone and MacBook is desktop.",
      "type": "string",
      "enum": [
        "iphone-17-pro",
        "iphone-duo",
        "google-pixel-10-pro",
        "ipad-pro",
        "macbook-pro-14"
      ]
    },
    "selectedScreenshotPaths": {
      "description": "Screenshots in playback order. With no clips or selection, uses the first screenshot for the chosen device.",
      "minItems": 1,
      "maxItems": 10,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 512
      }
    },
    "recordings": {
      "description": "Recordings play before screenshots. Up to ten clips and screenshots combined.",
      "minItems": 1,
      "maxItems": 10,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "storagePath": {
            "type": "string",
            "minLength": 1,
            "maxLength": 512
          },
          "durationSeconds": {
            "anyOf": [
              {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 3600
              },
              {
                "type": "null"
              }
            ],
            "description": "Use the measured clip length when available, or null."
          }
        },
        "required": [
          "storagePath",
          "durationSeconds"
        ]
      }
    },
    "motion": {
      "description": "Preset for every scene. Duo folds and MacBook lid motions work on their matching devices.",
      "type": "string",
      "enum": [
        "hero-launch",
        "pivot-showcase",
        "slow-rotate",
        "drifting-tilt",
        "float",
        "glide-left",
        "glide-right",
        "tilt-in",
        "duo-unfold",
        "duo-flip",
        "duo-half-fold",
        "duo-fold-shut",
        "lid-open",
        "lid-turn",
        "lid-shut"
      ]
    },
    "customMotion": {
      "description": "Authored or generated device keyframes. Omit motion when using this.",
      "type": "object",
      "properties": {
        "label": {
          "type": "string",
          "maxLength": 80
        },
        "description": {
          "type": "string",
          "maxLength": 500
        },
        "keyframes": {
          "minItems": 2,
          "maxItems": 24,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "time": {
                "type": "number",
                "minimum": 0,
                "maximum": 1
              },
              "x": {
                "type": "number"
              },
              "y": {
                "type": "number"
              },
              "rotationX": {
                "type": "number"
              },
              "rotationY": {
                "type": "number"
              },
              "rotationZ": {
                "type": "number"
              },
              "scale": {
                "type": "number"
              },
              "lidOpen": {
                "type": "number",
                "minimum": 0,
                "maximum": 1
              },
              "easing": {
                "type": "string",
                "enum": [
                  "linear",
                  "ease-in",
                  "ease-out",
                  "ease-in-out"
                ]
              }
            },
            "required": [
              "id",
              "time",
              "x",
              "y",
              "rotationX",
              "rotationY",
              "rotationZ",
              "scale",
              "easing"
            ]
          }
        }
      },
      "required": [
        "label",
        "keyframes"
      ]
    },
    "previewFormat": {
      "type": "string",
      "enum": [
        "appStore:default",
        "appStore:duo",
        "appStore:6.9",
        "appStore:6.7",
        "appStore:6.5",
        "appStore:6.3",
        "ipad:12.9",
        "ipad:11",
        "ipad:13",
        "social:9:16",
        "social:1:1",
        "social:16:9",
        "social:4:3",
        "creative:header",
        "creative:search"
      ]
    },
    "replaceVariantId": {
      "description": "Existing Video variant to replace only after explicit user approval.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "idempotencyKey": {
      "description": "Reuse the same key when retrying an uncertain creation.",
      "type": "string",
      "pattern": "^[A-Za-z0-9._:-]{8,128}$"
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_video_recordings

Lists saved screen recordings for device-only or promo videos. Set includeMetadata to get the duration, dimensions and cloud-render suitability. Returns project-relative paths.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "Project / generation UUID."
    },
    "includeMetadata": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## generate_promo_video_motion

Drafts device-motion keyframes from a prompt for a new device-only video or a compatible saved scene. Returns the motion without saving a video.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "Project / generation UUID."
    },
    "prompt": {
      "type": "string",
      "minLength": 3,
      "maxLength": 600
    },
    "deviceKind": {
      "type": "string",
      "enum": [
        "phone",
        "tablet",
        "laptop"
      ],
      "description": "Use phone for iPhone Duo and laptop for MacBook."
    }
  },
  "required": [
    "projectId",
    "prompt",
    "deviceKind"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## generate_promo_video

Starts or reuses background preparation of three transient promo-video scene/config candidates and returns the embedded picker or its URL. The picker updates when preparation finishes. Only an explicitly selected candidate becomes a saved variant. Optional replaceVariantId enables replacement after the new selection saves; selectedScreenshotPaths restricts candidate inputs.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "Project / generation UUID."
    },
    "message": {
      "description": "Optional creative direction applied to all three candidates.",
      "type": "string"
    },
    "replaceVariantId": {
      "description": "Existing promo-video variant to replace after the user chooses a candidate. Only provide with explicit user approval.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "selectedScreenshotPaths": {
      "description": "Optional project-relative screenshot paths (1–10) from list_source_screenshots, in story order. They must match deviceType (phone → mobile/…, tablet → tablet/…, desktop → desktop/…).",
      "minItems": 1,
      "maxItems": 10,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "deviceType": {
      "description": "Device the video shows: phone (default; iPhone or Pixel by platform), tablet (iPad Pro, iPad App Store formats) or desktop (MacBook, 16:9). Uses that device's uploaded screenshots.",
      "type": "string",
      "enum": [
        "phone",
        "tablet",
        "desktop"
      ]
    },
    "selectedScreenshotIndices": {
      "description": "Legacy screenshot positions. Prefer selectedScreenshotPaths.",
      "minItems": 1,
      "maxItems": 10,
      "type": "array",
      "items": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      }
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## apply_promo_video_candidate

Saves the specified prepared promo-video candidate as a variant and returns its editor link. When replaceVariantId is supplied, the prior variant is retired only after the new variant saves successfully.

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
    "candidateKey": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "candidateId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "replaceVariantId": {
      "description": "Existing promo-video variant to delete after saving the selected candidate. Only provide when the user explicitly approved replacing that variant.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "projectId",
    "candidateKey",
    "candidateId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_promo_video

Returns a saved promo-video configuration, source/available languages and a same-target editing read receipt. Transition names are normalized to content-motion semantics. Reading a translation does not change it.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may provide projectId instead. Project / generation UUID.",
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
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "description": "Language code of the promo-video translation (e.g. 'de'). Omit for the source language. get_promo_video lists availableLanguages."
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

## update_promo_video

Replaces a complete saved promo-video configuration for one variant/language. Hosted edits require a fresh same-target read receipt. Renderer-schema errors reject the entire update; missing editor defaults and derived values are reported. Device-model changes update the frame; music changes reset track start without re-cutting scenes. appName changes fallback copy; projectName renames the project.

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
    "language": {
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "description": "Language code of the promo-video translation (e.g. 'de'). Omit for the source language. get_promo_video lists availableLanguages."
    },
    "config": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {},
      "description": "Full Remotion VideoConfig: the `config` from get_promo_video, mutated. theme (colors + typography) and scenes (≥1 visible; discriminated on `type`: hook | feature | text-only | closeup | multi-phone | cta, each with its `content` shape). Any scene may set `hidden: true` (kept and editable, excluded from playback/export/duration). Coordinates are percentages of the frame (0-100), never pixels. Keep `transitionNaming: \"content-motion\"`."
    },
    "appName": {
      "description": "App name shown by hook/CTA scenes that leave appName null.",
      "type": "string"
    },
    "projectName": {
      "description": "Renames the whole project (all content types). Omit unless asked.",
      "type": "string"
    },
    "readReceipt": {
      "description": "Hosted connector only: provide the readReceipt returned by the immediately preceding get_promo_video call.",
      "type": "string"
    }
  },
  "required": [
    "projectId",
    "config"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## clear_promo_video

Clears the specified promo-video variant's saved configuration. This removes its current video content rather than creating a new variant.

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
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## translate_promo_video

Translates saved promo-video scene text into requested languages. Re-translating an existing language replaces its edited translation. Returns per-language results and available languages; subject to translation allowances.

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
      "description": "Promo-video variant; defaults to the active one.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "targetLanguages": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 2,
        "maxLength": 16
      },
      "description": "Language codes, e.g. ['de', 'ja']. Use el for Greek, he for Hebrew, fil for Filipino."
    }
  },
  "required": [
    "projectId",
    "targetLanguages"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## preview_promo_video

Renders one frame of a saved promo video as PNG for inspection. Selection supports a visible scene index plus relative position, or an absolute 30-fps frame. Defaults to the video's preview format. Unsaved changes are not included. Does not consume export allowance or modify the design.

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
    "language": {
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "description": "Language code of the promo-video translation (e.g. 'de'). Omit for the source language. get_promo_video lists availableLanguages."
    },
    "sceneIndex": {
      "type": "integer",
      "minimum": 0,
      "maximum": 99
    },
    "at": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "frame": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "format": {
      "description": "category:size — appStore:{default,duo,6.9,6.7,6.5,6.3}, ipad:{13,12.9,11}, social:{9:16,1:1,16:9,4:3}, creative:{header,search}.",
      "type": "string"
    },
    "scale": {
      "description": "Output size relative to the full format (default 0.5).",
      "type": "number",
      "minimum": 0.1,
      "maximum": 1
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## export_promo_video

Starts an MP4 or WebM render of a saved video variant and language under 30 seconds. An accepted job uses one API export allowance and returns exportId. The saved design stays intact. Transparent backgrounds require social WebM. Reuse the same idempotencyKey for retries of the same export.

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
    "language": {
      "type": "string",
      "minLength": 2,
      "maxLength": 16,
      "description": "Language code of the promo-video translation (e.g. 'de'). Omit for the source language. get_promo_video lists availableLanguages."
    },
    "category": {
      "type": "string",
      "enum": [
        "appStore",
        "ipad",
        "social",
        "creative"
      ]
    },
    "size": {
      "type": "string"
    },
    "format": {
      "type": "string",
      "enum": [
        "mp4",
        "webm"
      ]
    },
    "quality": {
      "type": "string",
      "enum": [
        "720p",
        "1080p"
      ]
    },
    "transparentBackground": {
      "description": "Render with alpha. Requires a social WebM export.",
      "type": "boolean"
    },
    "idempotencyKey": {
      "type": "string",
      "minLength": 8,
      "maxLength": 128,
      "description": "Unique per intended export; reuse on retries."
    }
  },
  "required": [
    "projectId",
    "idempotencyKey"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_promo_video_export

Returns the status and progress of a promo-video export. Completed jobs include a short-lived download URL; another status read can refresh the URL. Failed exports are refunded. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "exportId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "exportId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```
