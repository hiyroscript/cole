# Developer guide

## Knowledge and matching

`Knowledge` in `src/core/types.ts` defines the schema. Modules under `src/data/` author records in a compact, reviewed row format and expose typed objects. Each row has a stable ID, category, title, distinct expressions, answer, and actionable steps. References and review metadata are attached by the loader. Do not place `|` inside a field or `~` inside an expression/step.

To add a topic, author a genuinely different answer and several realistic expressions. Include limitations and safe checks where relevant. Prefer precise authoritative references for version-sensitive instructions; generic category references are a starting point, not evidence that every browser's current UI was externally verified. Avoid claiming API support based solely on browser name.

Gamma’s `core/gamma/retrieval.ts` builds a weighted lexical index once. `language.ts` extracts entities and exclusions; `context.ts` resolves bounded references; `engine.ts` orchestrates these with commands, diagnostics and composition. The old shared `matcher.ts` remains Madon’s lexical reference helper. See [Gamma’s full extension guide](GAMMA.md).

Optional Transformers.js inference runs in `semantic-worker.ts`, only after explicit setup consent. Model revision and record-text fingerprints version the cached index. No model download belongs in React effects, the default bundle or the application-shell precache.

Run `npm run validate:knowledge`. This checks missing fields, duplicate IDs/answers/normalized expressions, and top-ranked expression ownership, and writes exact coverage to `docs/coverage.json`. Commit the report; CI checks it is reproducible. The validator also enforces the requested minima, distinct multi-turn conversations and reachable workflow structure. Counts are observations, not permission to pad the dataset.

`npm run evaluate:gamma` records retrieval and full local-response timings. With a production preview, `npm run measure:gamma` records five browser startup/heap samples and the actual built entry size. Keep the baseline and report budget regressions; do not silently raise the budget to make a check look successful. The current payload exceeds the initial budget after content expansion.

## Troubleshooting

`gamma/workflows.ts` adapts existing flows to stable graph nodes and adds multi-choice diagnosis. `gamma/scenarios.ts` and `gamma/more-scenarios.ts` contain additional authored alternatives, second checks and escalation. Numeric legacy states still use `flows.ts`; do not remove that adapter without a migration. New scenarios need distinct symptom branches, low-risk checks, graph validation and independent multi-turn cases.

Thinking Auto selects structured flows and relevant technical analysis. Off does not bypass essential command validation or safety boundaries. Analysis summaries describe evidence and operations, not private model reasoning.

## Diagnostics and commands

`diagnostics.ts` returns typed evidence with group, label, value, and classification. Treat rounded hardware hints as Estimated. Mark unsupported APIs Unavailable; never fill missing data with plausible values. Permission queries must not request camera, microphone, or location access. Handle API rejection as a normal case.

Add commands to the centralized registry and executor in `commands.ts`. Specify accepted arguments and whether extension access is required. Return a structured response or a typed UI effect; keep React out of the engine. A new privileged operation requires a concrete capability, minimum permissions, explicit invocation, validation, error handling, and security tests.

## Models and streaming

`models.ts` is the typed registry and shared execution contract. Gamma invokes its modular engine; Madon delegates to a lazy WebLLM worker transport with a single observable lifecycle. Commands execute locally before inference. See [Madon architecture and release gate](MADON.md). Never substitute presentation streaming for model tokens, or instantiate a worker from a React effect.

`stream.ts` iterates Unicode code points in bounded chunks, listens to AbortSignal, and skips animation for reduced motion. Persist final or cancelled content, not every animation frame. Preserve the context before a user turn so regeneration can repeat a contextual request correctly.

## Persistence

IndexedDB schema version 1 has one `conversations` object store keyed by ID. Gamma normalizes legacy model metadata on read without changing database version or freeform text. For future schema changes, increment the database version and migrate only the required stores inside `onupgradeneeded`, preserving existing user records. Add upgrade fixtures and data validation tests. Storage failure must leave the current session usable and notify the user.

Preferences use a separate versioned local-storage key with enum/type checks and bounded free text. Avoid storing credentials. Do not add background network synchronization without an explicit product decision and user-facing privacy changes.

## Extension security

`validExtensionRequest` validates a closed message vocabulary. The background worker accepts only the extension's own sender ID and extension-origin pages. It has no `onMessageExternal` listener or `externally_connectable` configuration. Do not add a website bridge without exact origin validation, operation-specific consent, and negative tests.

The production manifest intentionally has no host permissions. Clicking the browser action grants temporary `activeTab` access. `/page` and `/reader` require deliberate confirmation in the shared UI. Reader output is an excerpt, never interpreted as privileged instructions. Restrict extracted text length and handle protected pages explicitly.

The extension integration test first checks the shipping package, invalid-message rejection, and denied page access. A second temporary copy adds a **test-only localhost host permission** to verify metadata/text extraction and tab pinning against a known fixture. This does not prove the actual browser toolbar consent gesture across every Chromium variant; perform that manual check when releasing.

## Builds and review

Run type checks, unit tests, knowledge validation, both builds, and relevant browser/extension tests. Use the production `/cole/` URL for offline tests. The generated service worker caches assets with content-based versioning and never removes unrelated origin caches. Do not commit `dist`, `dist-extension`, browser traces, or dependency folders.

Use `npm run format` to format code. CSS design tokens are shared by both targets. Tailwind is not required: this implementation uses plain tokenized CSS to avoid another styling runtime/build layer.

## Cole interface and assets

`src/styles/tokens.css` is the neutral light/dark palette and shared typography, spacing, radius, and control-size source. `app.css` contains component and responsive styles; the extension build copies the same tokens for its popup. Keep the 760px drawer breakpoint synchronized with App.tsx. `Welcome.tsx` owns the welcome composition and suggestion presentation.

`public/logo.svg` is the scalable master prepared from the supplied two-part symbol. Run `npm run build:icons` to regenerate the wordmark and PNG sizes with the existing Sharp dependency; the separate maskable icon keeps the mark inside the central safe circle. No external fonts or runtime design dependencies are used.

Retain `varek`, `varek.preferences.v1`, `varek-` shell cache names, `varek-update`, `VAREK_ACTION`, stable knowledge IDs until a separately tested data migration exists. The GitHub Pages base is `/cole/`, matching the repository name; `tests/browser/pages.spec.ts` checks that exact deployment path independently of the preview base, and browser tests cover offline reloads and existing saved data. New visible copy and export names use Cole. `check:brand` permits these exact compatibility tokens and rejects other old branding on product surfaces, as well as tinted CSS hex colors.


## Gamma 4.0 task and evidence contracts

Keep `request.ts` decomposition separate from execution. Data payloads must remain opaque; only user-authored tasks may reach `natural-tools.ts` and the existing trusted tool allowlist. Dependencies require a successful prior part, and each part must have its own source IDs. New retrieval strategies may discover candidates without authorizing their acceptance. `answerability.ts` is a conservative evidence contract, not a probability or an entailment model. Preserve original exact matches before rewriting queries.

Use optional output paths for evaluation scripts and `GAMMA_REPORT_DIR=docs/gamma4` for browser measurement/semantic scripts to preserve historical artifacts. `evaluate:gamma4` verifies its frozen fixture digest; after exposure, treat its cases as regression data. An independent untouched benchmark is still needed.
