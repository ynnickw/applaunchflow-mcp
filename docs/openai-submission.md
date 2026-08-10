# OpenAI submission pack

Use this file as the release gate for the AppLaunchFlow hosted connector. Do
not submit until every unchecked item has live evidence.

## Listing copy

- **Name:** AppLaunchFlow
- **Category:** Design and productivity
- **Short description:** Create and edit App Store and Google Play screenshots, social graphics, promo videos, and animated device mockups from your AppLaunchFlow projects.
- **MCP URL:** `https://mcp.applaunchflow.com/mcp`
- **Documentation:** `https://dashboard.applaunchflow.com/docs/mcp`
- **Privacy policy:** `https://dashboard.applaunchflow.com/privacy`
- **Terms:** `https://dashboard.applaunchflow.com/terms`

This is one universal remote MCP integration for both ChatGPT and Codex. A
separate Custom GPT Action/OpenAPI proxy is not required and would duplicate
the same capabilities and authorization surface.

## Required production evidence

- [ ] Company/domain identity is verified in the OpenAI Platform organization.
- [ ] The submitting user has `api.apps.write` and `api.apps.read`.
- [ ] Both public domains use valid HTTPS and remain stable.
- [ ] OAuth discovery, authorization, PKCE exchange, refresh, and revocation are exercised against production.
- [ ] The submitted demo account has representative projects/assets and no access to real customer data.
- [ ] Privacy policy, terms, and MCP documentation render without authentication.
- [ ] MCP runs in a region compatible with OpenAI's current connector data-residency requirements.
- [ ] `npm test`, dashboard typecheck/tests, and an authenticated production smoke test pass on the release commit.
- [ ] All tool annotations and schemas shown by the deployed endpoint match this commit.

## Positive review tests

1. Connect a fresh demo account through OAuth with PKCE, list projects, and disconnect/revoke.
2. Create a demo project, upload three HTTPS image assets, prepare screenshot styles, open the hosted gallery, select a template id, and apply it.
3. Fetch a layout, pass its opaque `readReceipt` into `transform_layout`, and confirm only the requested screen changes.
4. Prepare and apply a social-graphics style, then fetch and update one format with its matching receipt.
5. Generate a promo video and a mockup animation, then perform one get-before-update flow for each.

## Negative and safety tests

1. Call `/mcp` without a bearer token and with an expired/revoked token; both must return an OAuth challenge without leaking details.
2. Attempt an edit with no receipt, an expired receipt, a receipt from another target, and a receipt from another token; all must fail before writing.
3. Attempt asset import from HTTP, localhost, private/reserved IPs, an unsafe redirect, a non-image/non-font response, and a payload over 25 MB; all must fail.
4. Deny OAuth consent and confirm the client receives the original state plus an access-denied error.
5. Ask the model to delete or clear content without explicit confirmation; it must stop before invoking the destructive tool.

## Review notes

- OAuth tokens are opaque; only SHA-256 hashes and short non-secret prefixes are stored.
- Authorization codes are single-use and expire after ten minutes. Access tokens expire after one hour; refresh tokens rotate and expire after thirty days.
- Hosted read receipts are HMAC-signed with the caller's bearer token, bound to the exact edit target, and expire after ten minutes. They are never user-facing.
- The hosted server never launches local programs or accepts local file paths.
- Tool safety metadata is centralized in `src/tool-metadata.ts`; the build fails its test if a tool is missing metadata.
