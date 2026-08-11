# OpenAI submission pack

Use this file as the release gate for the AppLaunchFlow hosted connector. Do
not submit until every unchecked item has live evidence.

## Listing copy

- **Name:** AppLaunchFlow
- **Category:** Design
- **Short description:** Create app-store screenshots, social graphics, promo videos, and animated device mockups.
- **Long description:** AppLaunchFlow turns uploaded app screenshots into polished launch assets without leaving ChatGPT or Codex. Create and edit App Store and Google Play screenshot sets, generate social graphics in six common formats, produce promo-video concepts, and build animated device mockups. Every operation is scoped to the AppLaunchFlow account connected through OAuth, and visual pickers open in the browser when a design choice needs human review.
- **Website:** `https://www.applaunchflow.com`
- **Support:** `https://dashboard.applaunchflow.com/docs/mcp`
- **MCP URL:** `https://mcp.applaunchflow.com/mcp`
- **Documentation:** `https://dashboard.applaunchflow.com/docs/mcp`
- **Privacy policy:** `https://dashboard.applaunchflow.com/privacy`
- **Terms:** `https://dashboard.applaunchflow.com/terms`
- **Logo:** `../../applaunchflow/public/favicon.png` (885 x 885 PNG)
- **MCP URL type:** Universal
- **Authentication:** OAuth 2.1 authorization code flow with PKCE, refresh-token rotation, dynamic client registration, and token revocation.
- **CSP/UI:** The MCP does not serve embedded UI resources. User-facing picker and editor URLs use `https://dashboard.applaunchflow.com`.

This is one universal remote MCP integration for both ChatGPT and Codex. A
separate Custom GPT Action/OpenAPI proxy is not required and would duplicate
the same capabilities and authorization surface.

## Required production evidence

- [ ] Company/domain identity is verified in the OpenAI Platform organization.
- [ ] The submitting user is an organization owner or has **Apps Management: Write** (and Read for viewing status).
- [ ] Both public domains use valid HTTPS and remain stable.
- [ ] OAuth discovery, authorization, PKCE exchange, refresh, and revocation are exercised against production.
- [ ] OAuth discovery advertises `openid` and `email`, and UserInfo returns only `sub`, `email`, and `email_verified` for tokens granted both scopes.
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

## Starter prompts

1. `Create a new AppLaunchFlow project for my iOS app and upload these five screenshots in story order.`
2. `Create a fresh App Store screenshot variant for my Spotify project and let me choose from the personalized styles.`
3. `Generate social graphics for my latest project, let me pick a style, and then update the Instagram Story headline.`
4. `Create three promo-video concepts from the project's current iPhone screenshots and open the picker.`
5. `Create an animated iPhone mockup for the latest screenshot variant, then make the rotation slower.`

## Reviewer test-case detail

### Positive 1: OAuth and project listing

- **Prompt:** `List my AppLaunchFlow projects.`
- **Expected behavior:** Complete OAuth with PKCE, call `list_projects`, and return only projects owned by the reviewer account.
- **Expected shape:** A project array with ids, titles, platforms, and update timestamps; no token or internal database fields.
- **Fixture:** Reviewer account with at least one populated demo project.

### Positive 2: Personalized screenshot style

- **Prompt:** `Create a new screenshot variant from the five source screenshots and let me pick a style.`
- **Expected behavior:** Call `list_source_screenshots`, `prepare_screenshot_styles`, `browse_templates`, then `apply_screenshot_style` after the reviewer selects a template.
- **Expected shape:** A fresh variant id plus a dashboard editor URL.
- **Fixture:** One project with five iPhone source screenshots.

### Positive 3: Safe screenshot edit

- **Prompt:** `Change the headline on screen 2 to "Music for every moment".`
- **Expected behavior:** Call `get_layout` before `transform_layout` and pass the returned target-bound read receipt.
- **Expected shape:** The updated layout summary and existing editor URL; only screen 2 changes.
- **Fixture:** The screenshot variant created in Positive 2.

### Positive 4: Social graphic generation and edit

- **Prompt:** `Create social graphics from this project, let me choose a style, then update the Instagram Story headline.`
- **Expected behavior:** Prepare and browse personalized social styles, apply the selected style, call `get_graphics_format`, then `save_graphics_format` with the receipt.
- **Expected shape:** A new graphics variant containing all supported formats and a saved Instagram Story update.
- **Fixture:** The same five project screenshots.

### Positive 5: Promo video and mockup animation

- **Prompt:** `Create promo-video concepts and an animated phone mockup from this project's screenshots.`
- **Expected behavior:** Generate three transient promo candidates, let the reviewer select one, then create a mockup animation. Read before any subsequent update.
- **Expected shape:** One saved promo variant, one mockup-animation variant, and their editor URLs.
- **Fixture:** A project with remaining reviewer-plan capacity.

### Negative 1: Unauthenticated access

- **Scenario:** Call `/mcp` without a token or with a revoked token.
- **Expected behavior:** Return an OAuth challenge with no account, token, or internal-error details.
- **Why:** Project data requires an active user grant.

### Negative 2: Stale or mismatched edit authorization

- **Scenario:** Ask to edit with no read receipt, an expired receipt, or a receipt issued for another target/token.
- **Expected behavior:** Refuse before writing and instruct the client to fetch the current target first.
- **Why:** Prevents blind, cross-target, and cross-user writes.

### Negative 3: Unsafe remote asset import

- **Scenario:** Upload an HTTP, localhost, private-network, oversized, or non-media URL.
- **Expected behavior:** Reject the asset before fetching or persisting it.
- **Why:** Prevents SSRF, unsafe redirects, unsupported content, and oversized payloads.

## Release notes

Initial public submission of AppLaunchFlow as a universal OAuth-backed MCP plugin for ChatGPT and Codex. It supports app-store screenshots, social graphics, promo videos, and animated device mockups. Review credentials use an isolated demo account containing synthetic project data only.

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
