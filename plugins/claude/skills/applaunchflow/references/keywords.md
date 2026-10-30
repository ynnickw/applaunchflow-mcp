# Resolve the linked app and market

Use `get_project` to identify the linked App Store ID or Google Play package, then `list_keywords` and `list_keyword_competitors` for existing tracking. The tool resolves store/app context from that project; don't invent an app identifier or silently switch markets. Resolve country/language only when needed for the question. Linking or changing the store app requires the dashboard.

Check that each named tool is exposed by this host. If it is absent, give the relevant dashboard link and the specific limitation instead of inventing a call.

# Research versus tracking

`suggest_keywords` and `suggest_keyword_competitors` propose options; they do not add tracking. Ground recommendations in the actual app features and the user's target audience. State whether a value is observed data, a suggestion or your judgment. Do not promise a ranking gain.

Use `add_keywords` or `add_keyword_competitors` only when the user wants those items tracked. Inspect duplicates first. Respect `get_plan_usage` and returned limit recovery; repeated additions cannot fix a full allowance.

Use `remove_keywords` and `remove_keyword_competitors` only for the selected requested removals. Keyword text can match several country/store rows: scope precisely or use returned tracked IDs. Do not clean up other markets as a side effect of removing one term.

# Report actual performance

`get_keyword_history` provides historical rankings, not guaranteed attribution to a copy change. State app, store, country/language, time range, tracked term and missing data. Missing rank is not automatically zero. Do not turn one observation into a trend or compare incompatible markets.

The iOS keywords field belongs to [store copy](store-copy.md); adding a tracked keyword does not edit that field or publish metadata. Alerts, competitor gap analysis and CSV export remain dashboard workflows unless the live capability catalog says otherwise.

See [the complete keyword tool catalog](keywords/tool-catalog.md) for scope/filter fields and supported history inputs.
