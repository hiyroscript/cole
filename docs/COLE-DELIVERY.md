# Cole rebrand delivery

Implemented the current `max` brief on `rebrand/cole-minimal`. The user-supplied two-part symbol supersedes the brief’s proposed C concept. The supplied raster was cleaned into a black silhouette and traced into the scalable `public/logo.svg` master; it is not a byte-identical copy of the original image.

## Design and implementation

- Shared neutral light/dark tokens in `src/styles/tokens.css`, also used by the extension popup. Light canvas #F7F7F7, white surfaces, black primary actions; dark canvas #101010, charcoal surfaces and white actions. System appearance remains available. Browser theme color follows the selected appearance.
- Quiet 256px sidebar; readable 760px conversation/composer column; editorial Georgia welcome heading; native/system sans-serif working UI; 12px minimum metadata. No external font requests or new runtime dependencies.
- New `Welcome.tsx` composition with supplied mark, personalized greeting and four working suggestions. Refined chat roles, Markdown, evidence, sources, follow-ups, command menu, composer, stop/send actions, toasts and diagnostics.
- Preferences precede advanced assistant setup in Settings. An accessible disclosure contains both assistants’ complete setup controls and privacy disclosures; `/enhance on` opens this section. No model download consent was removed.
- Updated model cards, selected states, primary setup actions, confirmation language, exports, app metadata, install manifest, extension popup and workflow artifact (`cole-chromium-extension`). App-specific authored responses now refer to Cole; stable record IDs remain unchanged.
- Mobile drawer responds to viewport changes, preserves focus containment and keeps the background inert. Touch controls are enlarged; dynamic viewport and safe-area handling remain. Clicking modal padding no longer accidentally dismisses a dialog.

## Brand assets

`public/logo.svg` and `public/wordmark.svg`; PNGs at 16, 32, 128, 192 and 512px; 32px favicon; 180px Apple touch icon; separate 512px maskable icon. The old JPG was removed. Run `npm run build:icons` to reproduce platform assets with the existing Sharp dependency. All PNG dimensions and grayscale pixels were checked; the maskable symbol fits within the central 80% safe-zone circle. Dark app surfaces invert the transparent black symbol.

## Compatibility and functionality

The GitHub Pages base remains `/varek/`. IndexedDB `varek` stays at schema version 1, preferences use `varek.preferences.v1`, and app shell caches retain content-versioned `varek-` names. Worker activation still removes only old shell caches with that prefix; unrelated and model caches are untouched. Extension messaging retains `VAREK_ACTION`; permissions remain exactly `activeTab`, `scripting`, `sidePanel`, with no host grants or external bridge.

Gamma and Madon identities, deterministic retrieval, runtime lifecycle, stop/retry, safe Markdown, diagnostics, optional retrieval, model consent, search/rename/pin/delete/export, personalization, keyboard shortcuts, offline caching and historical model migration are preserved. Stored freeform messages are never rewritten. A browser test seeds the existing database/key directly and verifies original messages, evidence, context, pinning, timestamps, name, device notes, appearance and thinking preference after reloading Cole.

## Verification

| Check                        | Result                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check:brand`        | Passed: Cole product surfaces, monochrome CSS and existing legacy-model audit                                                    |
| `npm run typecheck`          | Passed                                                                                                                           |
| `npm run validate:knowledge` | Passed: 700 records, 2,811 expressions, 75 workflows, 560 paths, 300 authored multi-turn scenarios; report unchanged             |
| `npm test`                   | 3,331 tests passed across six files                                                                                              |
| `npm run build`              | Passed for `/varek/`                                                                                                             |
| `npm run build:extension`    | Passed with unchanged production permissions                                                                                     |
| `npm run test:e2e`           | 44 tests passed in desktop/mobile Chromium, including offline reload and new rebrand compatibility tests                         |
| `npm run test:extension`     | 13 checks passed: shipping package, denied ungranted inspection, invalid-message rejection, and local-fixture extraction/pinning |
| Platform icons               | Eight PNG sizes/grayscale checks passed; maskable safe-zone check passed                                                         |
| Rendered layouts             | Reviewed at 1440, 1024, 768, 390 and 320px; no document horizontal overflow. Popup at 340px and side-panel app at 360px reviewed |

Screenshots cover welcome and active chat at all five widths, light settings, open drawer, dark conversation, model selection/setup, extension popup and narrow panel. Representative previews:

- [Desktop welcome](previews/desktop.png)
- [Mobile welcome](previews/mobile.png)
- [Dark conversation](previews/dark.png)
- [Extension popup](previews/extension.png)

## Remaining release checks

No merge or deployment is implied by this branch. Real-device Safari/Firefox, mobile virtual keyboards, PWA installation dialogs, screen-reader behavior and actual Chromium toolbar activeTab gestures still need manual release checks. Browser tests use Chromium emulation. Madon tests exercise the existing mocked worker protocol and unsupported-device paths; real GPU generation is not newly certified. Gamma’s optional real model benchmark was not rerun for this visual change.

The pre-existing initial bundle budget issue remains: the website entry is approximately 815.50 kB (262.05 kB gzip), compared with the previous 814.49 kB baseline, still above the original 650 kB budget. Vite also reports the existing dependency URL/chunk-size warnings. No new runtime dependencies or automatic network behavior were added.
