# Developer guide

## Knowledge and matching

`Knowledge` in `src/core/types.ts` defines the schema. Modules under `src/data/` author records in a compact, reviewed row format and expose typed objects. Each row has a stable ID, category, title, distinct expressions, answer, and actionable steps. References and review metadata are attached by the loader. Do not place `|` inside a field or `~` inside an expression/step.

To add a topic, author a genuinely different answer and several realistic expressions. Include limitations and safe checks where relevant. Prefer precise authoritative references for version-sensitive instructions; generic category references are a starting point, not evidence that every browser's current UI was externally verified. Avoid claiming API support based solely on browser name.

`matcher.ts` builds a token-to-record index once, normalizes punctuation and Unicode, expands a small synonym lexicon, uses bounded edit distance, and ranks candidate phrase overlap. Exact authored expressions are also indexed. Retrieval runs on submission, never every keystroke. Full answer text is not searched. Current dataset size does not require a worker; measure before adding one.

`engine.ts` handles commands, corrections, short replies, context-sensitive depth changes, two-topic questions, ambiguity, diagnostics, and composition. It expires context after 30 minutes or 24 turns. Unknown or low-confidence topics must fall back honestly. Extend the independent language test cases alongside new expressions; avoid tuning only to the authored aliases.

Run `npm run validate:knowledge`. This checks missing fields, duplicate IDs/answers/normalized expressions, and top-ranked expression ownership, and writes exact coverage to `docs/coverage.json`. Commit the report; CI checks it is reproducible. Counts are observations, not permission to pad the dataset.

## Troubleshooting

`flows.ts` contains an initial yes/no question, different first recommendations, a next observation, and an escalation/exit. The heat safety branch exits immediately. Store attempted responses in context. Add only low-risk initial checks; do not advise disabling protections as a standard fix. Test every reachable branch and add a multi-turn conversation case.

Thinking Auto selects structured flows and relevant technical analysis. Off does not bypass essential command validation or safety boundaries. Analysis summaries describe evidence and operations, not private model reasoning.

## Diagnostics and commands

`diagnostics.ts` returns typed evidence with group, label, value, and classification. Treat rounded hardware hints as Estimated. Mark unsupported APIs Unavailable; never fill missing data with plausible values. Permission queries must not request camera, microphone, or location access. Handle API rejection as a normal case.

Add commands to the centralized registry and executor in `commands.ts`. Specify accepted arguments and whether extension access is required. Return a structured response or a typed UI effect; keep React out of the engine. A new privileged operation requires a concrete capability, minimum permissions, explicit invocation, validation, error handling, and security tests.

## Models and streaming

`models.ts` is the registry. Only available models have a usable engine; Madon has no engine. A future model should implement the response/context contract and declare capabilities rather than duplicating chat UI.

`stream.ts` iterates Unicode code points in bounded chunks, listens to AbortSignal, and skips animation for reduced motion. Persist final or cancelled content, not every animation frame. Preserve the context before a user turn so regeneration can repeat a contextual request correctly.

## Persistence

IndexedDB schema version 1 has one `conversations` object store keyed by ID. For future changes, increment the database version and migrate only the required stores inside `onupgradeneeded`, preserving existing user records. Add upgrade fixtures and data validation tests. Storage failure must leave the current session usable and notify the user.

Preferences use a separate versioned local-storage key with enum/type checks and bounded free text. Avoid storing credentials. Do not add background network synchronization without an explicit product decision and user-facing privacy changes.

## Extension security

`validExtensionRequest` validates a closed message vocabulary. The background worker accepts only the extension's own sender ID and extension-origin pages. It has no `onMessageExternal` listener or `externally_connectable` configuration. Do not add a website bridge without exact origin validation, operation-specific consent, and negative tests.

The production manifest intentionally has no host permissions. Clicking the browser action grants temporary `activeTab` access. `/page` and `/reader` require deliberate confirmation in the shared UI. Reader output is an excerpt, never interpreted as privileged instructions. Restrict extracted text length and handle protected pages explicitly.

The extension integration test first checks the shipping package, invalid-message rejection, and denied page access. A second temporary copy adds a **test-only localhost host permission** to verify metadata/text extraction and tab pinning against a known fixture. This does not prove the actual browser toolbar consent gesture across every Chromium variant; perform that manual check when releasing.

## Builds and review

Run type checks, unit tests, knowledge validation, both builds, and relevant browser/extension tests. Use the production `/varek/` URL for offline tests. The generated service worker caches assets with content-based versioning and never removes unrelated origin caches. Do not commit `dist`, `dist-extension`, browser traces, or dependency folders.

Use `npm run format` to format code. CSS design tokens are shared by both targets. Tailwind is not required: this implementation uses plain tokenized CSS to avoid another styling runtime/build layer.
