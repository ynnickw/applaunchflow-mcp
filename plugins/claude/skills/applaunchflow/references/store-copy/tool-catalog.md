# store-copy tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:claude-catalogs`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## get_store_listing

Returns saved App Store/Google Play listing copy, insights and translations for the active or specified listing variant. Returns asoCopy:null if none exists. Does not publish or modify store listings.

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

Generates store-listing text in a new ASO-copy variant using project context and requested options. Optional replaceVariantId retires a prior variant after successful replacement. Does not publish text to Apple or Google.

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

Updates only supplied source-language fields and existing translations in a listing variant. Preserves other fields, insights and languages and enforces store character limits. Editing source text does not automatically translate it or publish it to a store.

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

Translates saved listing text into requested languages and refreshes existing translations whose source changed. Does not publish to Apple or Google. Subject to translation allowances.

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
