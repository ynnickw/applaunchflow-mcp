# assets tool catalog

Generated from the registered hosted MCP schema. Do not edit by hand; run `npm run sync:claude-catalogs`.

This is a reference, not a script to execute in order. Read only the tool needed for the task. The host's actual tool/input schema takes precedence if versions differ. Never call a tool hidden by the host, and never copy synthetic IDs into a real request.

## list_assets

Returns an embedded library of a project's screenshots, illustrations, icons, backgrounds, panoramas, recordings, music, clips and fonts. Listing is read-only; Upload is an explicit widget action. Results contain relative storage paths; signed preview links remain private widget data. Each folder is limited to its newest 100 files and reports truncation.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
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

## prepare_asset_upload

App-only: authorizes one explicitly selected file upload to the project and returns its upload permission as private widget metadata. Does not transfer file bytes, replace files, apply a design or change the project icon.

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
    "kind": {
      "type": "string",
      "enum": [
        "screenshots",
        "appIcon",
        "recordings",
        "illustrations",
        "backgrounds",
        "panoramas",
        "fonts",
        "promoMedia"
      ]
    },
    "filename": {
      "type": "string",
      "minLength": 1,
      "maxLength": 180
    },
    "sizeBytes": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 26214400
    },
    "contentType": {
      "type": "string",
      "minLength": 1
    },
    "deviceType": {
      "type": "string",
      "enum": [
        "mobile",
        "tablet",
        "desktop",
        "watch"
      ]
    },
    "platform": {
      "type": "string",
      "enum": [
        "ios",
        "android"
      ]
    }
  },
  "required": [
    "projectId",
    "kind",
    "filename",
    "sizeBytes",
    "contentType"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## upload_screenshots

Uploads screenshot images to a project from HTTPS URLs or base64 data; local files are supported only by the npm/stdio transport. Results identify completed and failed files. Overwrite mode changes the bytes at existing paths and can affect saved designs that reference those paths.

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
    "deviceType": {
      "type": "string",
      "enum": [
        "mobile",
        "tablet",
        "desktop",
        "watch"
      ]
    },
    "platform": {
      "type": "string",
      "enum": [
        "ios",
        "android"
      ]
    },
    "sources": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string",
            "format": "uri"
          },
          "base64": {
            "type": "string"
          },
          "filename": {
            "type": "string"
          }
        }
      }
    },
    "overwrite": {
      "description": "Explicit opt-in: replace same-name screenshot bytes in place, updating ALL designs bound to that path. Previous bytes are backed up. Reload open editors afterwards.",
      "type": "boolean"
    },
    "targetPath": {
      "description": "Exact existing relative path to overwrite when legacy filenames are ambiguous. Requires overwrite=true and exactly one source.",
      "type": "string"
    },
    "folderId": {
      "description": "Existing screenshot folder in this device/platform scope. Assign each uploaded file to it; never changes saved designs.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "projectId",
    "deviceType",
    "platform",
    "sources"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## upload_asset

Uploads one illustration, logo, background, panorama, font, recording, image, video or audio asset. Maximum 25 MB per file. HTTPS URLs and base64 data are supported; local paths are npm/stdio-only. Returns a project-relative storage path and available media metadata. Font registration is enabled by default. Upload alone does not apply an asset to a design or change the project icon.

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
    "fileType": {
      "type": "string",
      "enum": [
        "illustration",
        "logo",
        "panorama",
        "background",
        "font",
        "mockup-media",
        "promo-media"
      ],
      "description": "Use mockup-media for mockup screens/recordings and mockup soundtracks, promo-media for promo video/audio footage, font for TTF/OTF/WOFF/WOFF2, or an image category. Mockup recordings are checked on upload (H.264, ≤1080 px short side, keyframe every ≤2 s, ≤60 fps) and rejected with an ffmpeg command when unsuitable."
    },
    "source": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "format": "uri"
        },
        "base64": {
          "type": "string"
        },
        "filename": {
          "type": "string"
        }
      },
      "description": "The file source — provide an HTTPS URL or base64 data, or a local file path for npm/stdio, with an appropriate filename."
    },
    "registerFont": {
      "description": "Font uploads only (default true): add the file to the project's custom fonts (metadata.customFonts) like the editor's font upload. Family, weight and style come from the filename (e.g. Inter-BoldItalic.ttf).",
      "type": "boolean"
    },
    "fontFamily": {
      "description": "Font uploads only: family name to register instead of the one derived from the filename. Upload each weight file with the same fontFamily.",
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    }
  },
  "required": [
    "projectId",
    "fileType",
    "source"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_source_screenshots

Lists real uploaded app screenshots across device types and platforms, with project-relative paths and preview metadata suitable as generation inputs. Does not add sample screenshots. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
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

## list_screenshots

Lists project-relative screenshot paths for one device type and platform. Empty projects can return sample screenshots explicitly marked isSample. Read-only.

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
    "deviceType": {
      "type": "string",
      "enum": [
        "mobile",
        "tablet",
        "desktop"
      ]
    },
    "platform": {
      "type": "string",
      "enum": [
        "ios",
        "android"
      ]
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_illustrations

Lists shared-library illustrations or illustrations uploaded to a specified project. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "source": {
      "type": "string",
      "enum": [
        "shared",
        "project"
      ],
      "description": "'shared' for the shared library, 'project' for project-uploaded illustrations."
    },
    "projectId": {
      "description": "Required when source is 'project'.",
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "category": {
      "description": "Filter shared library by category (e.g. 'Icons', 'Sticker', 'Illustrations').",
      "type": "string"
    },
    "search": {
      "description": "Search term to filter by name.",
      "type": "string"
    }
  },
  "required": [
    "source"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## view_screenshot

Returns the image pixels of a project screenshot identified by its project-relative path. Read-only.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      "description": "The project UUID."
    },
    "path": {
      "type": "string",
      "description": "Relative screenshot path (e.g. 'mobile/ios/1234-IMG.PNG') from list_screenshots or the layout's screenshot.path field."
    }
  },
  "required": [
    "projectId",
    "path"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## replace_asset

Globally replaces an asset, updates its saved-design references and permanently deletes the old storage object. The replacement affects every referenced design and cannot be undone.

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
    "path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "replacementPath": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "projectId",
    "path",
    "replacementPath"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## delete_assets

Permanently removes the specified asset records and storage objects. Saved-design references block deletion. This action cannot be undone.

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
    "paths": {
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1024
      }
    }
  },
  "required": [
    "projectId",
    "paths"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_asset_folders

Lists screenshot folders with explicit device, platform and optional locale bindings. Folder names do not imply language. Read-only.

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
    "offset": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## create_asset_folder

Creates a screenshot folder for an explicit device and platform, optionally bound to a locale. A caller-supplied UUID folderId makes retries reuse the same folder. Storage paths and saved designs are unchanged.

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
    "folderId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60
    },
    "deviceType": {
      "type": "string",
      "enum": [
        "mobile",
        "tablet",
        "desktop",
        "watch"
      ]
    },
    "platform": {
      "type": "string",
      "enum": [
        "ios",
        "android"
      ]
    },
    "locale": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "projectId",
    "folderId",
    "name",
    "deviceType",
    "platform"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## rename_asset_folder

Renames a screenshot folder. Its ID, locale binding, asset storage paths and saved designs are unchanged.

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
    "folderId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60
    }
  },
  "required": [
    "projectId",
    "folderId",
    "name"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## delete_asset_folder

Deletes a screenshot folder and ungroups its files. Does not delete asset files, storage objects or saved-design references.

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
    "folderId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    }
  },
  "required": [
    "projectId",
    "folderId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## move_assets

Groups screenshot assets in a folder with the same device and platform, or ungroups them when folderId is null. Storage paths and saved designs are unchanged.

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
    "paths": {
      "minItems": 1,
      "maxItems": 50,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1024
      }
    },
    "folderId": {
      "anyOf": [
        {
          "type": "string",
          "format": "uuid",
          "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "projectId",
    "paths",
    "folderId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## set_asset_folder_locale

Sets a screenshot folder's explicit language code, or clears its locale binding with null. Does not infer language from the folder name or alter saved designs.

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
    "folderId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "locale": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "projectId",
    "folderId",
    "locale"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## search_stock_photos

Searches Pexels or Unsplash for existing photos and returns preview metadata and import inputs. Does not upload a photo or modify a design.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "provider": {
      "default": "pexels",
      "type": "string",
      "enum": [
        "pexels",
        "unsplash"
      ]
    },
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200
    },
    "orientation": {
      "description": "portrait suits a single phone screen; landscape a panorama across screens.",
      "type": "string",
      "enum": [
        "landscape",
        "portrait",
        "square"
      ]
    },
    "page": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "perPage": {
      "type": "integer",
      "minimum": 1,
      "maximum": 30
    }
  },
  "required": [
    "query"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## import_stock_photo

Imports a selected Pexels or Unsplash photo into project storage and returns its relative path and photographer attribution. Does not apply the image to a design. Attribution is part of the imported asset metadata.

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
    "provider": {
      "type": "string",
      "enum": [
        "pexels",
        "unsplash"
      ]
    },
    "importInput": {
      "type": "object",
      "propertyNames": {
        "type": "string"
      },
      "additionalProperties": {},
      "description": "The importInput object of one search_stock_photos result."
    }
  },
  "required": [
    "projectId",
    "provider",
    "importInput"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

## list_fonts

Lists built-in, Google and project-uploaded font families with their available weights. Layout validation accepts these exact family names in rich-text font fields. Read-only.

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
    "query": {
      "description": "Case-insensitive substring filter, e.g. 'serif' or 'grotesk'.",
      "type": "string",
      "maxLength": 100
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000
    }
  },
  "required": [
    "projectId"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```
