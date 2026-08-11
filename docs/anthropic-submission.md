# Anthropic connector submission pack

Use this file to complete the Claude connector-directory submission portal. Do
not accept the directory terms or compliance attestations until the publisher
has reviewed them.

## Listing

- **Name:** AppLaunchFlow
- **Slug:** `applaunchflow`
- **Tagline:** Create launch visuals from your app screenshots
- **Description:** AppLaunchFlow turns uploaded app screenshots into polished launch assets directly from Claude. Create and edit App Store and Google Play screenshot sets, generate social graphics in six common formats, compare and select promo-video concepts, and build animated device mockups. AppLaunchFlow opens visual pickers in the browser whenever a design choice needs human review. Access is scoped to the connected AppLaunchFlow account through OAuth 2.1 with PKCE.
- **Categories:** Design; Productivity; Sales and marketing
- **Company:** Yannick Westermann Labs
- **Website:** `https://www.applaunchflow.com`
- **MCP server URL:** `https://mcp.applaunchflow.com/mcp`
- **Documentation:** `https://dashboard.applaunchflow.com/docs/mcp`
- **Privacy policy:** `https://dashboard.applaunchflow.com/privacy`
- **Terms:** `https://dashboard.applaunchflow.com/terms`
- **Support email:** `support@applaunchflow.com`
- **Icon:** `../../applaunchflow/public/favicon.png` (885 x 885 PNG)
- **Authentication:** OAuth 2.1 authorization code flow with PKCE, dynamic client registration, refresh-token rotation, and revocation.
- **Allowed link origin:** `https://dashboard.applaunchflow.com`

## Use cases

1. Turn 3-10 uploaded iOS or Android app screenshots into a new personalized app-store screenshot variant, using a browser picker to choose the final visual direction.
2. Generate a coordinated social-graphics set across OG image, X post, Instagram Story, Play Store feature graphic, X header, and LinkedIn banner formats, then edit individual formats conversationally.
3. Generate three promo-video concepts from project screenshots, let the user compare and select one, and continue editing the chosen video in the dashboard.
4. Create animated phone, tablet, or laptop mockups and refine camera motion, timing, overlays, and audio through Claude.

## Data handling summary

- Project data and generated assets remain scoped to the authenticated AppLaunchFlow user.
- OAuth access and refresh tokens are never stored in plaintext; only hashes and short non-secret prefixes are persisted.
- Authorization codes expire after 10 minutes, access tokens after 1 hour, and rotating refresh tokens after 30 days unless revoked earlier.
- Tool responses do not include plaintext credentials, token hashes, database diagnostics, or unrelated customer data.
- Review credentials must belong to a dedicated synthetic-data account with no MFA, email confirmation, SMS confirmation, or private-network dependency.

## Submission gates

- [ ] Submit from a Claude Team or Enterprise organization as an Owner/Primary Owner or a role with Directory management access.
- [ ] Create an isolated reviewer account with representative synthetic screenshots, social graphics, promo-video capacity, and mockup data.
- [ ] Verify the reviewer can complete OAuth without MFA or an emailed one-time code.
- [ ] Run the complete hosted-tool smoke suite using the reviewer account.
- [ ] Review and explicitly approve Anthropic's current Software Directory Policy, Software Directory Terms, security-testing authorization, and all seven portal compliance acknowledgments.
- [ ] Submit through the Claude.ai organization-admin connector portal.

## Review notes

- All tools provide explicit titles, structured output schemas, and centralized `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint` annotations.
- Mutating project tools do not publish to third-party services. Remote HTTPS asset ingestion is marked open-world because it fetches user-supplied URLs.
- Destructive tools are explicitly annotated, and the connector instructions require confirmation before deletion, clearing, or irreversible replacement.
- Composition-sensitive edits require a fresh, token-bound, target-bound read receipt before the server accepts a write.
