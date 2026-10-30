# store-copy tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:plugin-skills`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## get_store_listing

Read the project's App Store / Google Play listing text (ASO copy): promotionalText, shortDescription (iOS subtitle / Play short description), fullDescription, keywords, whatsNew, suggested category, AI insights, and translations keyed by language. Returns asoCopy:null when none was generated yet (use generate_store_listing). Reads the active listing variant unless variantId is given.

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

## generate_store_listing

AI-write the store listing text (promotional text, subtitle/short description, full description, keywords, category) from the project's app details, optionally informed by competitor apps. Saves it as a NEW active listing variant (the previous one is kept unless replaceVariantId is given with the user's approval) and returns it with the editor URL. Takes up to a minute.

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
    "competitorAppIds": {
      "description": "Competitor store app ids to analyze (Apple numeric ids or Play package names).",
      "maxItems": 20,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 255
      }
    },
    "competitorStoreProvider": {
      "description": "Store of competitorAppIds. Defaults to app_store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    },
    "replaceVariantId": {
      "description": "Retire this existing listing variant after the new one saves. Only with explicit user approval.",
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

## update_store_listing

Edit store listing text. Pass only the fields to change: fields edits the source language, translations edits existing languages ({ "de": { "promotionalText": "..." } }). Everything else (other fields, insights, other languages) is kept as saved. Enforces store character limits. Edits the active listing variant unless variantId is given. Editing the source text does not re-translate; call translate_store_listing for that.

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
    "fields": {
      "type": "object",
      "properties": {
        "promotionalText": {
          "description": "App Store promotional text, max 170 characters.",
          "type": "string",
          "maxLength": 170
        },
        "shortDescription": {
          "description": "iOS subtitle (max 30 characters) or Google Play short description (max 80).",
          "type": "string",
          "maxLength": 80
        },
        "fullDescription": {
          "description": "Full description, max 4000 characters.",
          "type": "string",
          "maxLength": 4000
        },
        "keywords": {
          "description": "App Store keyword field: comma-separated, max 100 characters.",
          "type": "string",
          "maxLength": 100
        },
        "whatsNew": {
          "description": "Release notes (App Store max 4000; Google Play max 500 per language).",
          "type": "string",
          "maxLength": 4000
        }
      },
      "additionalProperties": false
    },
    "translations": {
      "type": "object",
      "propertyNames": {
        "type": "string",
        "minLength": 2,
        "maxLength": 35
      },
      "additionalProperties": {
        "type": "object",
        "properties": {
          "promotionalText": {
            "description": "App Store promotional text, max 170 characters.",
            "type": "string",
            "maxLength": 170
          },
          "shortDescription": {
            "description": "iOS subtitle (max 30 characters) or Google Play short description (max 80).",
            "type": "string",
            "maxLength": 80
          },
          "fullDescription": {
            "description": "Full description, max 4000 characters.",
            "type": "string",
            "maxLength": 4000
          },
          "keywords": {
            "description": "App Store keyword field: comma-separated, max 100 characters.",
            "type": "string",
            "maxLength": 100
          },
          "whatsNew": {
            "description": "Release notes (App Store max 4000; Google Play max 500 per language).",
            "type": "string",
            "maxLength": 4000
          },
          "appName": {
            "description": "Localized store name, max 30 characters.",
            "type": "string",
            "maxLength": 30
          }
        },
        "additionalProperties": false
      }
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## translate_store_listing

AI-translate the store listing text into other languages (adds or refreshes translations; languages whose source text did not change are skipped). Each new language counts against the plan's translation limit. Language codes: en, en-GB, en-AU, en-CA, es, es-MX, fr, fr-CA, de, it, pt, pt-BR, ja, ko, zh-CN, zh-TW, nl, ru, ar, tr, pl, sv, no, da, fi, cs, hi, hu, ro, uk, el, he, id, ms, th, vi, fil, hr, sk, ca, bn, gu, kn, ml, mr, or, pa, sl, ta, te, ur.

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
    "targetLanguages": {
      "minItems": 1,
      "maxItems": 60,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 2,
        "maxLength": 35
      }
    }
  },
  "required": [
    "projectId",
    "targetLanguages"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```
