# Varek

Varek is a browser-local diagnostic and knowledge assistant. **Zulvyn is a deterministic engine, not a large language model.** It combines authored explanations, indexed intent matching, conversation context, and actual browser APIs. No account, backend, inference API, or API key is required. Madon is visibly marked Coming Soon and cannot be activated.

The supplied Varek image is used unchanged as the application logo, with resized copies for favicons, PWA icons, and extension icons. The UI uses Porcelain/Fig design tokens, light by default, with dark and system themes.

## Release scope and coverage

This is a working initial implementation of the `max` specification, **not a claim that all of its release-scale content goals have been completed**. Run `npm run validate:knowledge` for the exact machine-checked report in [`docs/coverage.json`](docs/coverage.json).

- **205** independently authored knowledge records, across 13 categories.
- **831** distinct authored expressions; no generated synonym permutations counted.
- **26** branching troubleshooting flows, with **103** reachable yes/no branch paths. These are rule paths, not 103 distinct flows.
- Four response depths, explicit browser corrections, contextual follow-ups, typo tolerance, ambiguity handling, two-topic matching, and bounded context (30 minutes or 24 turns).
- 31 allowlisted slash commands. Device values carry evidence classifications; inaccessible measurements are not fabricated.

The requested **700 records and 2,500 expressions remain incomplete**. English is the supported language. This is a constrained knowledge assistant, not general-purpose language understanding. See [remaining scope](docs/STATUS.md) for other limits and verification boundaries.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the printed address with `/varek/` appended. Production commands:

```sh
npm run typecheck
npm run validate:knowledge
npm test
npm run build
npm run build:extension
npx playwright install --with-deps chromium
npm run test:e2e
npm run test:extension
```

For browser tests, set `CHROMIUM_PATH` to your installed Chromium executable. The web test configuration falls back to `/usr/bin/chromium`; extension tests default to the full Chromium installed by Playwright. The CI workflow sets a portable path for both. Some distribution Chromium builds disable unpacked-extension command-line loading; use Playwright's full Chromium for the extension suite.

`npm run preview` serves the production build at `http://localhost:4173/varek/`. Test offline behavior against this production build, not the Vite development server.

## What works in each mode

| Capability                                         | Website                  | Installed PWA             | Chromium extension                            |
| -------------------------------------------------- | ------------------------ | ------------------------- | --------------------------------------------- |
| Local knowledge, context, thinking, streaming      | Yes                      | Yes                       | Yes, same engine                              |
| Browser/device signals and evidence export         | Supported APIs only      | Supported APIs only       | Supported APIs only                           |
| Chat history, search, rename, pin, delete, export  | IndexedDB                | Same origin/profile store | Separate extension-origin store               |
| Offline conversation                               | After successful caching | After successful caching  | Bundled assets                                |
| Current-page metadata and reader excerpt           | No                       | No                        | Explicit user action and temporary permission |
| Pin/unpin current browser tab                      | No                       | No                        | `/tabs pin` or `/tabs unpin`                  |
| Other apps, hardware temperatures, exact RAM usage | No                       | No                        | No                                            |
| Website-to-extension bridge                        | Not implemented          | Not implemented           | No external messaging listener                |

### Conversation controls

Enter sends; Shift+Enter inserts a newline. The composer grows with text, supports IME composition, and exposes a keyboard-navigable slash menu. Escape dismisses menus and dialogs. Alt+N starts a chat, Alt+K focuses the composer, Alt+B toggles the sidebar, and Alt+F searches history. Native modal dialogs and the mobile navigation drawer manage focus.

Thinking Auto selects branching diagnosis for relevant problems; On adds analysis where relevant; Off skips optional diagnostic workflows. Analysis summaries identify actual matching, rules, and missing measurements. Streaming is presentation of an already-composed local answer. Stop preserves partial output; retry restores the context before the original request.

### Commands

Use `/help` for descriptions and argument requirements.

- General: `/help`, `/about`, `/model`, `/think auto|on|off`, `/theme light|dark|system`, `/clear`, `/new`, `/export`, `/shortcuts`.
- Observations: `/browser`, `/device`, `/system`, `/screen`, `/language`, `/timezone`, `/permissions`, `/features`, `/storage`, `/network`.
- Advice and diagnosis: `/privacy`, `/diagnose`, `/performance`, `/compatibility`, `/security`, `/cache`, `/cookies`.
- Extension: `/tab`, `/tabs pin|unpin`, `/page`, `/reader`. `/extensions` provides permission guidance; it does not enumerate installed extensions.

Commands that change preferences return typed effects. Destructive actions require confirmation. Commands do not execute arbitrary JavaScript, shell commands, or browser settings changes.

## Privacy and data

GitHub Pages serves static assets and receives normal HTTP asset requests. Conversation processing runs in the browser. Varek has no analytics, tracking pixels, remote inference calls, or automatic page inspection. Markdown cannot inject HTML, execute JavaScript URLs, or load remote images.

Conversations are stored in IndexedDB database `varek`, schema version 1. Preferences and optional user-provided device notes are stored in `varek.preferences.v1` in local storage. Data is validated on load. Browser storage can be unavailable or evicted; errors are surfaced instead of claiming persistence succeeded. Varek does not encrypt local storage or exports.

Settings provide current/all-chat exports, individual/all-chat deletion, preference reset, device-note clearing, and full data/cache clearing. Exported files may contain private text or URLs; review before sharing. Deleting local data does not delete previously exported copies. Website and extension histories are independent.

## Offline and updates

The build generates a content-versioned service worker caching the app shell, local knowledge bundle, logo, and icons under `/varek/`. Only Varek-owned cache names are removed during updates. Cached same-origin assets are matched independently of development server `Vary: Origin` headers. A new worker waits until the user chooses the update control; active responses disable that control.

A first-ever offline visit cannot work. Cleared/evicted storage or failed service-worker installation can remove offline availability. Install using the browser's Install or Add to Home Screen control where supported. There is no assumption that all browsers offer an install prompt.

## GitHub Pages deployment

The workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) checks types, validates knowledge, runs unit tests, builds both targets, runs desktop/mobile/offline and extension checks, uploads the extension artifact, and deploys the web build on pushes to `main`.

In repository **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. The deployment job switches an existing Pages site to GitHub Actions using its scoped Pages token. If Pages has never been enabled, enable it here first; the workflow does not create a missing Pages site. The expected URL after a successful deployment is:

https://hiyroscript.github.io/varek/

Vite uses the `/varek/` project base. The application uses local state rather than server-dependent routes. No credentials belong in frontend code. Pull requests run verification without deploying.

## Install the Chromium extension

1. Download **varek-chromium-extension** from a successful workflow run's Artifacts section and extract the ZIP. Alternatively run `npm run build:extension` locally.
2. Open `chrome://extensions` or your Chromium browser's extension manager and enable Developer mode.
3. Choose **Load unpacked** and select the folder containing `manifest.json` (locally, `dist-extension/`).
4. Click Varek's toolbar icon on the webpage you want to inspect, then choose **Open side panel**.
5. Deliberately run `/tab`, `/page`, or `/reader` and confirm the local read. If you switch to another origin, click the toolbar icon again to grant temporary access there.

The package contains all executable code. It requests `activeTab`, `scripting`, and `sidePanel`, with **no blanket host permissions**, history permission, or remote executable code. Restricted browser pages and missing permission produce an explicit limitation. `/reader` returns an excerpt of up to 12,000 visible characters, not a semantic summary. Page content is untrusted and is never executed as instructions.

Firefox extension compatibility and store publication have not been implemented. Side-panel availability varies among Chromium-derived browsers. The full conversation tab is available as a fallback, but inspection should be performed from the side panel alongside the target page.

## Architecture

- `src/app/`, `src/components/`, `src/styles/`: React app, safe Markdown, accessible dialogs, design tokens.
- `src/core/`: pure matching, context/response pipeline, model metadata, commands, branching flows, cancellable streaming.
- `src/data/`: authored typed knowledge modules.
- `src/lib/`: diagnostics, evidence labels, IndexedDB/preferences, extension messaging validation.
- `extension/`: MV3 manifest, local popup, permission-gated background worker.
- `scripts/`: knowledge validation, offline-cache generation, separate extension packaging.
- `tests/`: language and conversation sequences, security/storage/stream tests, browser flows, extension checks.

See [the developer guide](docs/DEVELOPING.md) before adding records, commands, models, or permissions.
