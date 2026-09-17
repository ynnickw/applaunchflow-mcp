# CI → saved design version → Fastlane

1. Review and save a design in the editor. Open **Developer API** and choose **Save design version**, or call `POST /api/v1/design-versions` with `projectId`, `variantId`, `language` and `name`. Keep its ID as `designVersionId` and its binding keys in your release configuration. The ID already pins the immutable design; no separate approval token or content hash is required. The version is immediately ready to render; later editor changes cannot alter it.
2. Create a project-restricted key with `assets:read`, `assets:write`, `designs:read`, `exports:read`, `exports:write`. Store it as `APPLAUNCHFLOW_API_KEY` in the CI secret store. CI that only renders an existing version does not need `designs:write`.
3. Capture your app separately for each requested locale. Fill every capture and copy binding for the requested device layouts in `release.json`. The example is illustrative; use the exact binding keys from your version. Use `useDefaults:true` only when intentionally retaining saved defaults.
4. Install the released `applaunchflow` version containing the `applaunchflow/api` export. This branch must be released together with the dashboard v1 API; the previous npm version does not include it.
5. Set `APPLAUNCHFLOW_RELEASE_ID` to a stable release identity (for example repository + commit SHA + workflow name). Preserve it across retries. Run `node examples/release.mjs release.json release.zip` with Node 24. Preserve the receipt as a CI artifact even if polling times out. A changed request with the same identity returns 409, so a release cannot silently drift.
6. Run `python3 examples/unpack-release.py release.zip output`. The destination must not exist. The SDK has already checked the ZIP SHA-256; extraction checks the manifest, file paths, sizes, CRCs and per-file SHA-256.
7. After your normal release approval, upload screenshots:

```sh
bundle exec fastlane deliver --screenshots_path output/fastlane/screenshots --skip_binary_upload true --skip_metadata true
bundle exec fastlane supply --metadata_path output/fastlane/metadata/android --skip_upload_apk true --skip_upload_aab true --skip_upload_metadata true --skip_upload_images true
```

The helper does not upload to stores or submit an app for review. Store credentials belong to Fastlane, not AppLaunchFlow. `indeterminate` means the render dispatch outcome needs investigation; poll/support must resolve it before creating another paid render. A polling timeout is not render cancellation.

Packages validate structure, store dimensions, image integrity, absence of transparency, file limits and checksums. They cannot judge translation quality, text clipping or store policy acceptance. Inspect representative localized outputs before upload.
