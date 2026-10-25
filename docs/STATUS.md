# Implementation status

## Cole rebrand (2026-10-25)

Cole now uses the supplied two-part symbol and a shared monochrome design system across the website, PWA and Chromium extension. Sidebar, welcome view, chat, composer, settings and setup dialogs have been redesigned. The existing database, preferences, deployment path and permissions are unchanged. See [Cole delivery and verification](COLE-DELIVERY.md) for results and screenshots.

The sections below record earlier engine release milestones.

## Gamma 2.0 upgrade (2026-10-24)

The complete active-brand rename, compatible storage normalization, modular lexical/entity/context pipeline, graph diagnostics, optional real CPU/WASM embeddings, public extract retrieval and settings are implemented. See [GAMMA.md](GAMMA.md) for architecture and release gates. All five numeric targets from the Gamma upgrade specification are met. See [the delivery report](GAMMA-DELIVERY.md) for measured results and release limitations.

## Madon upgrade (2026-10-24)

Implemented opt-in WebLLM 0.2.86/Qwen3-1.7B worker inference, setup/progress/recovery, real streaming transport, bounded role history, stop/retry, native thinking control and hidden-output parsing, trusted diagnostic routing, optional Wikimedia retrieval, source metadata, persistence, cache management and lazy loading. Gamma and the MV3 security boundary are preserved. Madon is a **website preview, not a fully hardware-validated release**.

The production browser exposed WebGPU but no adapter. Actual model initialization, generation, thinking quality, cache reuse and offline inference remain unverified. Full details, use instructions, exact configuration, verification results and the opt-in real smoke script are in [MADON.md](MADON.md).

## Implemented

Responsive React/TypeScript chat, supplied logo and favicon/PWA/extension icons, light/dark/system appearance, local IndexedDB conversations and context, search/rename/pin/delete/export, preference and device-note controls, safe Markdown, progressive cancellable responses, regeneration with prior context, reduced-motion support, keyboard shortcuts, focus-managed dialogs/mobile navigation, Gamma/Madon model registry, allowlisted slash commands, classified browser diagnostics, data copying/export, troubleshooting branches, cached offline app, update detection, and separate bundled Manifest V3 popup/side-panel builds.

The core engine is shared between website and extension. Page metadata/text inspection and current-tab pinning are gated by extension permissions. No backend, inference API, analytics, account, remote-image Markdown rendering, or arbitrary code execution is present.

## Verified content coverage

The validator reports **700 records, 2,811 expressions, 75 workflows, 560 terminal paths and 300 distinct authored multi-turn scenarios**, meeting the requested minima of **700, 2,500, 75, 250 and 300**. It rejects duplicate scenario names/exchanges and checks the minimum counts. Expression loops and graph traversal tests are counted separately.

Current verification: **3,331 Vitest tests, 36 desktop/mobile Playwright tests and 13 extension checks pass**. TypeScript, branding audit, knowledge validation and both production builds pass. The initial JavaScript payload grew from 499,750 to 814,491 bytes and exceeds the initial 650 kB budget; this regression is explicitly recorded in the delivery report.

Real MiniLM/WASM setup, offline cache reuse, retrieval and selective deletion passed in headless Chromium. This does not certify physical mobile performance or broad semantic relevance. Historical verification below remains labeled as a baseline.

English only; no robust multilingual classifier. Entity extraction and negation handling are intentionally bounded. Arbitrary compound questions, nuanced corrections, and unsupported comparisons may require clarification. The UI and engine do not promise general intelligence.

## Deliberately absent or limited

- Optional website-to-extension bridge: not implemented; no external privileged messaging surface is exposed.
- Firefox extension adapter, extension-store listing/signing, and cross-device chat sync: not implemented.
- `/tabs` pins/unpins the active tab; it does not enumerate all private tab URLs. `/extensions` explains permissions; it does not inspect an extension inventory.
- `/reader` extracts a bounded text excerpt; semantic summaries are not implemented.
- Saved device notes appear as user-provided analysis context; arbitrary prose notes are not parsed into trusted hardware facts.
- Older source references use authoritative category-level documentation; new guidance adds topic/vendor references. Version-sensitive browser UI paths need ongoing vendor-specific maintenance.
- OS internals, exact CPU/RAM utilization, hardware temperatures, battery health, private files, and arbitrary website reachability are unavailable unless the user supplies external evidence; no simulated measurements are presented.

## Verification boundaries

Automated web tests run in Chromium at desktop and mobile emulated viewports, including dark theme and cached Gamma offline reload. They do not constitute physical-device Safari/Firefox testing or a full assistive-technology audit. Install prompts and actual mobile keyboards vary by browser and should receive device testing before calling this a fully certified production release.

The extension test loads the production package and verifies local chat, popup rendering, rejected invalid messages, and denied ungranted page access. A temporary local-fixture permission tests extraction and pinning. Actual toolbar activeTab grant/side-panel user gestures still merit manual release testing in each supported Chromium browser.

GitHub Pages requires repository Settings → Pages → Source: GitHub Actions. A committed deployment workflow is not proof of a successful deployment; consult the Actions run and Pages status.

## Original Gamma baseline (before Madon upgrade, 2026-10-24)

- Strict TypeScript check: passed (including extension source).
- Knowledge validation: 205 records, 831 expressions, 103 reachable paths; zero duplicates, missing fields, or authored-expression ranking failures.
- Vitest: **1,002 tests passed** across engine, storage, and Markdown security suites.
- Playwright: **16 tests passed**, covering desktop/mobile chat, persistence/deletion, commands, dark theme, unavailable Madon, untrusted input, exports, keyboard access, cancellation, and offline reloads.
- Chromium extension: **11 checks passed** with the permission-testing distinction described above.
- Website and extension production builds: passed. Web JavaScript bundle approximately 484 KB (155 KB gzip); CSS approximately 14 KB (3.7 KB gzip).
