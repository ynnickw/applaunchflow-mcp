# promo-video tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:plugin-skills`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## generate_promo_video

Generate or reuse three transient promo-video candidates from the project's screenshots. This tool itself displays the same three-option dashboard picker inline in Claude, ChatGPT, and other MCP Apps-compatible hosts; do not call another tool after it. Only the candidate explicitly chosen by the user becomes a saved variant. Clients without UI support receive the exact picker URL. Use replaceVariantId only when the user explicitly chose to replace that existing variant, which also allows a safe swap at the plan limit. Use selectedScreenshotPaths to constrain which uploaded screenshots feed the candidates.

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
      "description": "Existing promo-video variant to replace after the user chooses a candidate. Only pass with explicit user approval.",
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

Create a promo-video variant from one of the three server-stored candidates. This is called by the inline picker after explicit user selection; arbitrary video config input is not accepted. If replaceVariantId is supplied, the previous variant is deleted after the new variant is saved; replacement requires explicit user approval.

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
      "description": "Existing promo-video variant to delete after saving the selected candidate. Only pass when the user explicitly approved replacing that variant.",
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

Fetch the saved promo video config (the Remotion VideoConfig) for a project variant and language. Required before update_promo_video so edits operate on fresh state. Edit the returned `config` (persisted as promovideo project `remotion_code`) and send the whole object back to update_promo_video. Also returns sourceLanguage and availableLanguages (existing translations); pass `language` to read a translation. Configs come back already migrated to content-motion transition names (`transitionNaming: "content-motion"`). Field reference: get_editing_reference feature promoVideo (or the resource applaunchflow://schema/video-config).

Input schema:

```json
{
  "type": "object",
  "properties": {
    "generationId": {
      "description": "Project id: the same UUID as projectId from list_projects/get_project (generationId is its legacy name). You may pass projectId instead. Project / generation UUID.",
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

Persist a promo video config: a full-config replace of the `config` returned by get_promo_video (no per-scene patch tool). ENFORCED: each call requires a fresh get_promo_video for the same projectId/variantId/language immediately beforehand. The server validates the config against the same renderer schema the editor loads with; any violation rejects the whole update with a 400 listing each field path and message, and nothing is saved. Fix those fields and retry. Fields the editor always writes are filled server-side when absent: version (2), duration, scene choreography (null), nullable content fields (e.g. feature subtitle, hook logoUrl, closeup caption → null; frameVariant 'flat', showLogo true, badge 'appStore'), illustration url when storagePath is set, and the transitionNaming marker (names always mean content motion; never mirrored). Copy, screenshot indexes and layouts are never invented. Also rejected: all scenes hidden, unknown transition types, unknown font families. Cascades like the editor: changing deviceModelId re-derives phoneId; changing audioDesign.musicId resets musicStartTimeSeconds to 0 (scene timings are NOT re-cut to the new beat). The response lists filledDefaults/derived. appName sets the app name used by hook/CTA fallbacks; projectName RENAMES the whole project. Field reference: get_editing_reference feature promoVideo.

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
      "description": "Hosted connector only: pass the readReceipt returned by the immediately preceding get_promo_video call.",
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

Wipe the promo video config for a variant so the user can start over. Does not delete the variant itself.

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

AI-translate the saved promo video (all scene copy) of a variant into one or more languages. Each language becomes its own editable translation; read or edit it with get_promo_video / update_promo_video using `language`. Translating a language that already exists RE-TRANSLATES it from the source and overwrites edits made to that translation; only do that when the user asks. Returns per-language results plus sourceLanguage and availableLanguages (get_promo_video also lists availableLanguages). Subject to the plan's translation limits.

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

Render one frame of the SAVED promo video server-side and return it as a PNG image, so you can check an edit (legibility, overlap, device placement) without a browser. Pick a scene by its config index (sceneIndex; hidden scenes do not render) and a position inside it (at: 0 = first frame, 0.5 = default mid-scene, 1 = last frame), or an absolute 30 fps frame. Renders the video's own previewFormat unless format is given (e.g. 'social:9:16'). Save with update_promo_video first; unsaved edits are not visible. Takes ~10–40 s. Not billed as an export.

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
      "description": "category:size — appStore:{default,6.9,6.7,6.5,6.3}, ipad:{12.9,11}, social:{9:16,1:1,16:9}, creative:{header,search}.",
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

Render the SAVED promo video (variant + language) to an MP4/WebM file on the server; no browser needed. Same options as the editor's export dialog: category appStore (size default 886×1920 App Store preview, 6.9, 6.7, 6.5, 6.3), ipad (12.9, 11), social (9:16, 1:1, 16:9) or creative (App Store header/search: mp4 1080p only, 5–30 s); quality 1080p or 720p; format mp4 or webm. Category/size default to the video's previewFormat. Server exports must be shorter than 30 s (hide or shorten scenes otherwise). Requires export access: an active Pro plan with remaining monthly API exports (or the Automation add-on); Launch Passes and editor credits do not cover API exports. Each call that is accepted uses one export. Returns exportId immediately; poll get_promo_video_export until status is completed to get the download URL. Reuse the same idempotencyKey when retrying; never invent a new one after an uncertain outcome.

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

Poll an export started by export_promo_video. While queued/rendering it returns progress; when completed it returns a short-lived downloadUrl (valid ~1 hour; call again for a fresh one). Failed exports are refunded and must not be retried with a new idempotencyKey automatically.

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
