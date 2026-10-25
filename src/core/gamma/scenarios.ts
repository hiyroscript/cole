import { moreScenarios } from "./more-scenarios";
// Authored decision points; each alternative has a different diagnostic purpose.
export const scenarios = [
  ...moreScenarios,
  {
    id: "mac-camera",
    question: "Where is camera access failing?",
    choices: [
      [
        "Only one website",
        "one|site",
        "Review that site’s camera permission and selected input in Safari or your browser.",
      ],
      [
        "Every browser site",
        "every|browser",
        "Check macOS Privacy & Security → Camera for the browser, then follow any app-restart prompt.",
      ],
      [
        "Other apps too",
        "other|apps",
        "Check whether another app is using the camera, and use the Mac’s supported hardware checks if no app can capture.",
      ],
    ],
    second:
      "Compare capture in a trusted local application and a known meeting test page. Record which layer fails without sharing a recording.",
    escalation:
      "Share the affected apps, permission states, and OS version with Apple or browser support.",
  },
  {
    id: "android-permission",
    question: "What happens when the site asks for the camera?",
    choices: [
      [
        "Permission denied",
        "denied|blocked",
        "Review both the Android permission for the browser and the site permission.",
      ],
      [
        "Wrong camera",
        "wrong|front|back",
        "Use the website’s camera picker and compare front and rear inputs.",
      ],
      [
        "No prompt",
        "no prompt|nothing",
        "Check whether the site is HTTPS and whether an earlier permission denial is stored.",
      ],
    ],
    second:
      "Compare the Android camera app. If it works, retry a trusted browser test after closing other capture apps.",
    escalation:
      "Report the exact browser error and permission state to the site; do not grant unrelated permissions.",
  },
  {
    id: "media-inuse",
    question: "Does the camera work outside this website?",
    choices: [
      [
        "In another app",
        "another|app|yes",
        "Finish the other app’s capture session, close it normally, and retry the website.",
      ],
      [
        "Nowhere",
        "nowhere|no",
        "Check the physical privacy shutter and OS camera settings before changing browser data.",
      ],
      [
        "Not sure",
        "not sure|unknown",
        "Test the OS camera app without recording or sharing private content.",
      ],
    ],
    second:
      "Restart the browser after saving work and select the camera again. Compare a different trusted capture application.",
    escalation:
      "If all apps fail, use device support; if only this site fails, provide its developer the capture error.",
  },
  {
    id: "screen-audio",
    question: "What did you choose to share?",
    choices: [
      [
        "A browser tab",
        "tab",
        "Review the tab-audio checkbox in the browser’s share picker and confirm the intended tab has audio.",
      ],
      [
        "An application window",
        "window|application",
        "Window audio capture is platform-dependent. Compare a supported tab share if that fits the content.",
      ],
      [
        "The entire screen",
        "screen|display|entire",
        "Check whether this browser and OS support system audio capture; screen video alone does not confirm audio support.",
      ],
    ],
    second:
      "Check the meeting’s audio input and returned share status. Use a supported sharing method rather than installing an unknown capture utility.",
    escalation:
      "Consult the meeting provider’s browser/OS audio-sharing support table.",
  },
  {
    id: "webgpu-adapter",
    question: "Which WebGPU check failed?",
    choices: [
      [
        "API missing",
        "api|missing|undefined",
        "Check HTTPS or localhost and the browser’s documented WebGPU support.",
      ],
      [
        "Adapter is null",
        "adapter|null",
        "Review browser graphics diagnostics and supported OS graphics updates; do not bypass blocklists with random flags.",
      ],
      [
        "Model setup failed",
        "model|setup|memory",
        "Read the model’s exact setup error. Adapter presence does not establish memory capacity or optional feature support.",
      ],
    ],
    second:
      "Compare a minimal trusted WebGPU sample and the browser graphics report. Gamma’s built-in engine remains available without WebGPU.",
    escalation:
      "Send browser support the non-sensitive adapter failure and graphics report, or continue with Gamma.",
  },
  {
    id: "idb-blocked",
    question: "Are other copies of the application open?",
    choices: [
      [
        "Another tab",
        "tab|yes",
        "Save work in the other tab and close it normally so its database connection can end.",
      ],
      [
        "An installed app window",
        "app|window",
        "Save and close the installed app window as well as browser tabs using the same origin.",
      ],
      [
        "No other copy",
        "no|none",
        "Capture the blocked event and database version in developer tools if you maintain the app; avoid deleting the database.",
      ],
    ],
    second:
      "Restart the browser after saving work. Application authors should close old connections on versionchange and retry the upgrade.",
    escalation:
      "Export recoverable data and report the blocked version transition to the application maintainer.",
  },
  {
    id: "storage-denied",
    question: "When does storage fail?",
    choices: [
      [
        "Only in private mode",
        "private|incognito",
        "Compare a regular trusted profile; private-mode storage may be restricted or temporary.",
      ],
      [
        "Only embedded",
        "embedded|iframe",
        "Compare the app in its own top-level tab; third-party storage policy can differ.",
      ],
      [
        "Everywhere",
        "every|all|regular",
        "Inspect the exact exception and managed browser policies. Preserve current edits by export.",
      ],
    ],
    second:
      "Attempt a small temporary write with error handling, remove only the test entry, and report failure without resetting existing data.",
    escalation:
      "Use session-only operation or export while the administrator or developer investigates storage access.",
  },
  {
    id: "sw-waiting",
    question: "Is important work still open in the old application version?",
    choices: [
      [
        "Unsaved work",
        "unsaved|yes|editing",
        "Save or export the work before activating an update that reloads the page.",
      ],
      [
        "Everything saved",
        "saved|no|ready",
        "Use the application’s update action, then reload controlled tabs together.",
      ],
      [
        "Update loops",
        "loop|repeated",
        "Record the active and waiting worker versions; avoid repeatedly clearing all site data.",
      ],
    ],
    second:
      "Close other saved app tabs and reopen one instance. Confirm the new worker controls the expected project path.",
    escalation:
      "Report the worker version and scope to the maintainer; retain local data while the update path is repaired.",
  },
  {
    id: "cors-preflight",
    question: "Are you using the site or maintaining its API?",
    choices: [
      [
        "Using the website",
        "using|visitor|user",
        "Report the failing action and visible error to the site. Browser security should remain enabled.",
      ],
      [
        "Maintaining the API",
        "maintaining|developer|api",
        "Inspect the OPTIONS response for allowed origin, method, and requested headers.",
      ],
      [
        "Credentialed request",
        "credential|cookie",
        "Check that the server names the permitted origin rather than using a wildcard with credentials.",
      ],
    ],
    second:
      "Compare a same-origin request and the exact failing preflight in developer tools; use a supported CORS endpoint.",
    escalation:
      "Have the API owner correct the policy. An arbitrary CORS proxy is not an appropriate fix for private data.",
  },
  {
    id: "notification-scam",
    question: "Where does the warning appear?",
    choices: [
      [
        "A site notification",
        "notification|desktop",
        "Identify its sending site in browser notification settings and revoke that site’s permission.",
      ],
      [
        "Inside a web page",
        "page|tab",
        "Close the warning tab without calling its number or downloading its suggested software.",
      ],
      [
        "The system security app",
        "system|security app|defender",
        "Open the genuine OS security app from the system menu and review its protection history.",
      ],
    ],
    second:
      "Review recent downloads and use the OS security app for a scan if a file was opened; do not trust a scan animation on a web page.",
    escalation:
      "If credentials or remote access were shared, contact the relevant service through a trusted channel and use incident-response support.",
  },
  {
    id: "profile-lock",
    question: "Could another browser process still be using this profile?",
    choices: [
      [
        "Another window is open",
        "window|yes",
        "Save work and close all windows of that browser normally.",
      ],
      [
        "Only a background process",
        "background|process",
        "Check the OS task manager and end only the identified browser process after confirming there is no unsaved work.",
      ],
      [
        "After a crash",
        "crash|no|restart",
        "Restart the OS after saving other work before following vendor-specific profile recovery instructions.",
      ],
    ],
    second:
      "Try opening the existing profile normally again. Keep a backup before any manual recovery and never share one live profile between processes.",
    escalation:
      "Use the browser vendor’s profile-lock recovery documentation; do not delete profile contents as a shortcut.",
  },
  {
    id: "print-layout",
    question: "What is wrong in Print Preview?",
    choices: [
      [
        "Wide table cut off",
        "table|wide|cut",
        "Compare landscape orientation and the browser’s fit-to-page scaling.",
      ],
      [
        "Content is missing",
        "missing|blank",
        "Compare the site’s own print view; a print stylesheet may hide or clip content.",
      ],
      [
        "Text is too small",
        "small|tiny",
        "Adjust print scale and paper size separately from browser page zoom.",
      ],
    ],
    second:
      "Save a preview PDF and inspect the intended pages before printing or sharing it.",
    escalation:
      "Report the affected content and print settings to the author; provide an accessible alternative when needed.",
  },
] as const;
