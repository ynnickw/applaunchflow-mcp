# keywords tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:claude-catalogs`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## list_keywords

Returns tracked keywords, ranks, changes, difficulty/traffic estimates, sparkline data, competitor positions, summary metrics and plan limits. trackedKeywords includes row IDs across stores and countries. Read-only.

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
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## add_keywords

Adds keyword tracking for the requested stores/countries. Store and app identity resolve from project metadata unless overridden. Each keyword-country pair counts against the keyword limit; an oversized batch is rejected in full. Projects without a linked app can track terms but have no own-app rank. Rankings arrive asynchronously.

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
    "keywords": {
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 100
      },
      "description": "Keyword strings to track. Normalized server-side."
    },
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    },
    "country": {
      "description": "Single storefront country. Defaults to \"us\". Ignored when countries is given.",
      "type": "string",
      "pattern": "^[A-Za-z]{2}$"
    },
    "lang": {
      "description": "Language for the single country. Defaults to \"en-US\".",
      "type": "string",
      "minLength": 2,
      "maxLength": 16
    },
    "countries": {
      "description": "Track every keyword in each of these storefronts (keywords × countries ≤ 250).",
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "country": {
            "type": "string",
            "pattern": "^[A-Za-z]{2}$",
            "description": "ISO country code, e.g. us, de."
          },
          "lang": {
            "type": "string",
            "minLength": 2,
            "maxLength": 16,
            "description": "BCP-47 storefront language, e.g. en-US, de-DE."
          }
        },
        "required": [
          "country",
          "lang"
        ],
        "additionalProperties": false
      }
    },
    "appId": {
      "description": "Rarely needed: the linked store app id. Must match the project's linked app; omit to use it.",
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "projectId",
    "keywords"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## remove_keywords

Removes selected tracked keywords and permanently deletes their rank history. Selection supports row IDs or text with optional store/country scope. Unscoped text matches every store and country. Unknown IDs reject the batch without deleting anything.

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
    "keywords": {
      "maxItems": 100,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "trackedKeywordIds": {
      "maxItems": 500,
      "type": "array",
      "items": {
        "type": "string",
        "format": "uuid",
        "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
      }
    },
    "storeProvider": {
      "description": "Only remove keyword text in this store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    },
    "countries": {
      "description": "Only remove keyword text in these countries.",
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[A-Za-z]{2}$"
      }
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## suggest_keywords

Returns AI-assisted keyword ideas based on project metadata, excluding terms already tracked in the selected store. Does not start tracking suggestions.

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
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## get_keyword_history

Returns rank history for one tracked keyword, optionally for a specified competitor app. Available history is limited by plan: up to thirty days on Free and up to 365 days on Unlimited. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "trackedKeywordId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "The tracked-keyword row id (from list_keywords). Not the keyword string."
    },
    "appId": {
      "description": "Optional store app id to compute history for. Defaults to the tracked keyword's app.",
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "trackedKeywordId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_keyword_competitors

Lists the competitor apps currently tracked for a project and store, including available limit metadata. Read-only.

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
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## suggest_keyword_competitors

Returns candidate competitor apps for a project and selected store. Does not add competitors to tracking.

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
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## add_keyword_competitors

Adds the specified competitor apps to a project's keyword tracking for one store, subject to plan limits. Repeated additions of the same app are idempotent.

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
    "appIds": {
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 255
      }
    },
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    }
  },
  "required": [
    "projectId",
    "appIds"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## remove_keyword_competitors

Removes specified competitor apps from a project's tracking in one store. Unknown app IDs are reported without changing tracking.

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
    "appIds": {
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 255
      }
    },
    "storeProvider": {
      "description": "Which store. Defaults to the project's primary store (its linked app; get_project shows primaryStoreProvider), else the App Store.",
      "type": "string",
      "enum": [
        "app_store",
        "google_play"
      ]
    }
  },
  "required": [
    "projectId",
    "appIds"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```
