// Each scenario starts with a distinct observation and separates plausible layers.
export const moreScenarios = [
  {
    id: "media-device",
    question: "Which part of the call is wrong?",
    choices: [
      [
        "Wrong microphone",
        "microphone|input",
        "Select the intended microphone in the meeting’s device picker and compare its input meter with the OS input meter.",
      ],
      [
        "Wrong camera",
        "camera|video",
        "Select the intended camera in the website’s picker and close any unused capture session.",
      ],
      [
        "Wrong speakers",
        "speaker|output|headphone",
        "Check the meeting output picker if supported, then the operating system’s per-app output routing.",
      ],
    ],
    second:
      "Compare a trusted local recording or camera preview without sharing the recording. Note whether the mismatch follows the device or only this site.",
    escalation:
      "Report the selected device names and affected application to the meeting provider; avoid publishing private audio/video.",
  },
  {
    id: "media-autoplay",
    question: "Does the media play when you press its Play button?",
    choices: [
      [
        "Yes, after a tap",
        "yes|tap|click",
        "Use the explicit Play control. The observed behavior is consistent with autoplay policy rather than a broken media file.",
      ],
      [
        "No, it shows an error",
        "no|error",
        "Read the player error and compare another video on the same service before changing site permissions.",
      ],
      [
        "Only muted playback",
        "muted|silent",
        "Unmuted autoplay may be restricted. Let the user choose a Play or Unmute action instead of retrying automatically.",
      ],
    ],
    second:
      "Compare the media in the browser’s supported player and inspect the rejected play promise if you maintain the site.",
    escalation:
      "Provide the service with the exact playback error and browser version; do not install an unknown codec pack.",
  },
  {
    id: "media-constraints",
    question: "What capture configuration is failing?",
    choices: [
      [
        "A specific resolution",
        "resolution|width|height",
        "Try a supported default resolution instead of requiring an exact width and height.",
      ],
      [
        "A high frame rate",
        "frame|fps",
        "Compare the device’s default frame rate and inspect supported capabilities before requesting a higher rate.",
      ],
      [
        "Every configuration",
        "every|all|default",
        "Check permission, device availability and another trusted capture app; the issue may precede constraint negotiation.",
      ],
    ],
    second:
      "Use ideal constraints for preferences and report which requested constraint failed, without repeatedly reopening the device.",
    escalation:
      "Ask the site developer to provide a supported fallback configuration and preserve a clear error state.",
  },
  {
    id: "media-recorder-chunks",
    question: "What is wrong with the saved recording?",
    choices: [
      [
        "The end is missing",
        "end|truncated|short",
        "Wait for the recorder’s final dataavailable and stop sequence before assembling the saved file.",
      ],
      [
        "The format will not open",
        "format|open|codec",
        "Verify the actual recording MIME type and whether the receiving player supports that container and codec.",
      ],
      [
        "Memory grows during recording",
        "memory|large|long",
        "Bound chunk accumulation and offer a supported incremental save path rather than retaining unlimited data in memory.",
      ],
    ],
    second:
      "Record a short non-sensitive sample, stop normally and reopen the exported file before repeating a long recording.",
    escalation:
      "Preserve any recoverable chunks and report the recorder state, MIME type and stop sequence to the application developer.",
  },
  {
    id: "video-buffering",
    question: "Which symptom do you see during playback?",
    choices: [
      [
        "A buffering spinner",
        "buffer|spinner|loading",
        "Compare a lower resolution and observe whether enough media accumulates ahead of playback.",
      ],
      [
        "Choppy frames without buffering",
        "choppy|frame|stutter",
        "Compare playback statistics and pause other heavy work; decoding or rendering may be the limiting layer.",
      ],
      [
        "Both symptoms",
        "both",
        "Lower the resolution once and record separately whether buffering and dropped frames improve.",
      ],
    ],
    second:
      "Compare another video and a temporary browser profile while keeping the same network and power state.",
    escalation:
      "Share the service’s playback diagnostics and browser version with support; do not claim an exact network or GPU fault without evidence.",
  },
  {
    id: "linux-wayland",
    question: "What happens when you start sharing?",
    choices: [
      [
        "No chooser appears",
        "no chooser|nothing|dialog",
        "Check the desktop’s portal service and the browser package’s supported screen-sharing integration.",
      ],
      [
        "The chooser opens but capture is black",
        "black|blank",
        "Compare an ordinary unprotected window and check the session’s PipeWire/portal compatibility.",
      ],
      [
        "Only one browser fails",
        "one browser|firefox|chromium",
        "Compare the browser builds and native Wayland/XWayland backend before changing system security settings.",
      ],
    ],
    second:
      "Use distribution documentation to verify the matching desktop portal and PipeWire packages, then retry a non-sensitive window.",
    escalation:
      "Report the desktop environment, session type, browser package and portal error to distribution or browser support.",
  },
  {
    id: "linux-video-codecs",
    question: "Which media fails on Linux?",
    choices: [
      [
        "Only one file",
        "one file|single",
        "Identify that file’s container and codecs; compare a known-good file using the same declared format.",
      ],
      [
        "One browser only",
        "one browser|chromium|firefox",
        "Check the distribution’s codec support for that browser package rather than assuming all builds contain the same decoders.",
      ],
      [
        "Protected streaming service",
        "protected|drm|streaming",
        "Review the service’s officially supported Linux/browser configuration and its protected-media requirements.",
      ],
    ],
    second:
      "Use supported distribution packages and compare a non-protected test clip. Avoid third-party codec installers advertised by a web page.",
    escalation:
      "Provide the exact media error, codec and package version to the service or distribution maintainer.",
  },
  {
    id: "linux-audio-routing",
    question: "Where can you hear the browser audio?",
    choices: [
      [
        "On the wrong device",
        "wrong|headphone|speaker",
        "Move the active browser stream to the intended output in the desktop’s per-application sound controls.",
      ],
      [
        "Other apps work",
        "other apps|only browser",
        "Check the browser stream’s mute state and the page player’s volume independently.",
      ],
      [
        "No application has sound",
        "no application|none|system",
        "Check the selected system output and hardware connection before changing browser settings.",
      ],
    ],
    second:
      "Play a short trusted test sound and compare the same output with another app, changing only one routing control at a time.",
    escalation:
      "Use distribution audio support with the observed stream/output pattern; browser permissions do not repair a missing system device.",
  },
  {
    id: "win-proxy",
    question: "When does the proxy error occur?",
    choices: [
      [
        "Only away from work",
        "home|away|travel",
        "A work proxy may not be reachable on this network. Check the administrator’s documented remote-access configuration.",
      ],
      [
        "On every network",
        "every|all",
        "Review the configured proxy or PAC URL and record the exact failure without entering credentials into unexpected prompts.",
      ],
      [
        "Only one website",
        "one|single|site",
        "The proxy may apply destination-specific routing or policy. Compare an unrelated site and record the affected hostname.",
      ],
    ],
    second:
      "Ask IT to confirm whether the current proxy configuration is intended for this network; preserve the original settings.",
    escalation:
      "Share the proxy error and network context with the administrator instead of disabling organizational controls.",
  },
  {
    id: "win-display",
    question: "Where is the browser display unclear?",
    choices: [
      [
        "Only page text",
        "page text|website",
        "Compare browser page zoom and the site’s font rendering before changing the whole display.",
      ],
      [
        "The whole application",
        "whole|toolbar|application",
        "Check Windows’ recommended display resolution and scaling for the affected monitor.",
      ],
      [
        "Only after moving monitors",
        "moving|second|monitor",
        "Compare each monitor’s scaling and reconnect through a supported display configuration.",
      ],
    ],
    second:
      "Compare a standard system application on the same display and record whether the issue follows the monitor or browser window.",
    escalation:
      "Use display or graphics support with the resolution/scaling details; a webpage cannot measure panel quality.",
  },
  {
    id: "win-disk-active",
    question: "What does Windows show during the slowdown?",
    choices: [
      [
        "A known update is active",
        "update|maintenance",
        "Let the supported update complete after saving work and compare again before modifying the browser.",
      ],
      [
        "The browser dominates disk use",
        "browser",
        "Compare a saved, smaller tab workload and inspect whether a download or local database operation is active.",
      ],
      [
        "Another process dominates",
        "another|other process",
        "Investigate that identified process through Windows tools; do not delete unfamiliar files to reduce activity.",
      ],
    ],
    second:
      "Record active time and the process involved during the actual delay. Free capacity alone does not explain storage latency.",
    escalation:
      "Use Windows or storage-device support if activity remains unexplained or the OS reports disk errors.",
  },
  {
    id: "win-pagefile",
    question: "Was virtual-memory configuration changed recently?",
    choices: [
      [
        "The page file was disabled",
        "disabled|off",
        "Review Windows’ supported system-managed virtual-memory setting; disabling the page file can reduce the commit limit.",
      ],
      [
        "Settings were unchanged",
        "unchanged|no",
        "Inspect committed memory and sustained process growth before attributing the failure to page-file configuration.",
      ],
      [
        "The device is managed",
        "managed|work|organization",
        "Ask the administrator to review the allocation failure and approved virtual-memory policy.",
      ],
    ],
    second:
      "Compare the failing workload after saving and closing one unnecessary heavy application, while preserving the original configuration.",
    escalation:
      "Provide the allocation error and system commit information to support; do not infer exact memory use from browser hints.",
  },
  {
    id: "mac-pressure",
    question: "What does Activity Monitor’s Memory Pressure graph show?",
    choices: [
      [
        "Green while the browser is slow",
        "green",
        "Memory pressure is not yet established as the cause. Compare CPU activity and the affected site’s workload.",
      ],
      [
        "Yellow or red",
        "yellow|red",
        "Save work and pause a known heavy application or browser task, then observe whether pressure decreases.",
      ],
      [
        "I have not checked",
        "not checked|unknown|not sure",
        "Open Activity Monitor → Memory and observe the graph during the slowdown, without sharing unrelated process details.",
      ],
    ],
    second:
      "Repeat the same browser task after reducing the identified workload and compare pressure, not just the free-memory number.",
    escalation:
      "Use Apple or application support with the observed graph and process pattern if sustained pressure returns.",
  },
  {
    id: "mac-keychain-prompt",
    question: "When did the Keychain prompts begin?",
    choices: [
      [
        "After changing the login password",
        "password|changed",
        "Follow Apple’s supported process for a login-keychain password mismatch; do not delete the keychain as a first step.",
      ],
      [
        "For an unfamiliar application",
        "unfamiliar|unknown",
        "Cancel the prompt and verify the requesting application before granting credential access.",
      ],
      [
        "Only for a known browser action",
        "known|browser|saved",
        "Check the application name and the action you initiated, then use the normal OS authorization flow if appropriate.",
      ],
    ],
    second:
      "Compare the keychain’s lock state through Keychain Access and preserve existing credentials while following Apple’s recovery guidance.",
    escalation:
      "Contact trusted device support if the prompt cannot be explained; never share a keychain export or password in chat.",
  },
  {
    id: "mac-private-relay",
    question: "What changes when Private Relay is involved?",
    choices: [
      [
        "A site reports a different location",
        "location|region",
        "A site’s IP-based location may differ from your physical location. Check its documented account/location requirements.",
      ],
      [
        "Only one site refuses access",
        "one|refuses|denied",
        "Record the site’s exact error and consult its support before changing global privacy settings.",
      ],
      [
        "The network reports incompatibility",
        "network|incompatible",
        "Review Apple’s network compatibility guidance and any administrator policy for this connection.",
      ],
    ],
    second:
      "Use a supported, scoped comparison for the affected service and restore the intended privacy setting afterward.",
    escalation:
      "Ask the site or network operator to investigate compatibility; do not treat a changed IP location as proof of compromise.",
  },
  {
    id: "android-private-dns",
    question: "How broad is the DNS failure?",
    choices: [
      [
        "All websites fail",
        "all|every",
        "Verify the configured Private DNS hostname and whether Android reports it reachable.",
      ],
      [
        "Only an internal work site",
        "internal|work|intranet",
        "A public resolver may not know the internal domain. Use the organization’s approved DNS/VPN configuration.",
      ],
      [
        "Only one public domain",
        "one|single",
        "Compare the domain from another authorized network and ask its operator about DNS status.",
      ],
    ],
    second:
      "Compare Android’s supported automatic or administrator-approved DNS configuration without installing an unknown resolver profile.",
    escalation:
      "Share the failing domain and DNS error with the network or domain operator; keep sensitive traffic on trusted configurations.",
  },
  {
    id: "android-clear-cache",
    question: "What are you trying to fix before clearing data?",
    choices: [
      [
        "One stale page",
        "stale|one page",
        "Try a normal reload and a temporary comparison first; deleting all app storage is disproportionate.",
      ],
      [
        "A failed download",
        "download",
        "Check the download error and destination space before removing website records.",
      ],
      [
        "Low device storage",
        "storage|space",
        "Review Android’s storage report and back up files before choosing disposable data to remove.",
      ],
    ],
    second:
      "Read the exact distinction between Clear cache and Clear storage/data. Export local web-app records before any action that removes them.",
    escalation:
      "Use app or device support if the issue persists; do not erase the browser profile without a tested backup and a clear reason.",
  },
  {
    id: "android-webview",
    question: "Which Android experiences are failing?",
    choices: [
      [
        "Several apps with embedded pages",
        "several|multiple|embedded",
        "Check official updates for the system WebView/browser component and the affected applications.",
      ],
      [
        "Only one application",
        "one app|single",
        "Compare the same destination in the full browser and report the app-specific behavior to its developer.",
      ],
      [
        "The full browser also fails",
        "full browser|both",
        "Compare an unrelated site and network status to separate component failures from connectivity.",
      ],
    ],
    second:
      "Record OS, WebView/browser and app versions, then use only the official update channel after saving work.",
    escalation:
      "Contact the app or device vendor with the reproducible scope; avoid installing replacement system components from an untrusted site.",
  },
  {
    id: "iphone-files-download",
    question: "What does the download list show?",
    choices: [
      [
        "Completed but hard to find",
        "completed|find",
        "Open the item from Safari’s download list and inspect its configured Files destination.",
      ],
      [
        "Still downloading or failed",
        "downloading|failed|pending",
        "Check the stated error and connection; do not assume a partial file is usable.",
      ],
      [
        "Visible locally but not on another device",
        "another device|sync|icloud",
        "Check the Files provider’s synchronization status separately from the browser’s local download completion.",
      ],
    ],
    second:
      "Open the saved file locally and verify its contents before deleting the source or retrying a large transfer.",
    escalation:
      "Use the browser or Files provider’s support with the destination and exact error, without sharing private file contents.",
  },
  {
    id: "iphone-camera",
    question: "Where is camera use blocked on the iPhone?",
    choices: [
      [
        "Only one website",
        "one|site",
        "Review the affected website’s camera permission and use a deliberate capture control.",
      ],
      [
        "The browser app is restricted",
        "browser|permission",
        "Review the relevant iOS privacy and browser settings for that app.",
      ],
      [
        "Screen Time or management applies",
        "screen time|managed|restriction",
        "Ask the account owner or administrator to review the specific camera restriction.",
      ],
    ],
    second:
      "Compare the built-in camera app and a trusted web capture test without recording or sharing private content.",
    escalation:
      "Report whether the failure is site-, browser- or OS-wide to the appropriate support channel; do not grant unrelated permissions.",
  },
  {
    id: "iphone-content-blocker",
    question: "What breaks on the affected site?",
    choices: [
      [
        "Images or article content",
        "image|article|content",
        "Compare the browser’s scoped content-blocker setting for this site and note which resources are missing.",
      ],
      [
        "Sign-in or checkout",
        "sign|checkout|payment",
        "Verify the site and preserve the transaction state before making a temporary, site-specific comparison.",
      ],
      [
        "Many unrelated websites",
        "many|unrelated|all",
        "Compare connectivity and another browser context; a single blocker rule is not yet established as the cause.",
      ],
    ],
    second:
      "Change one site-scoped control at a time and restore the intended privacy setting after the test.",
    escalation:
      "Report the reproducible resource or flow failure to the site or blocker maintainer rather than disabling every protection.",
  },
  {
    id: "passkey-lost",
    question: "Which recovery option is available?",
    choices: [
      [
        "Another trusted synced device",
        "synced|another device",
        "Use the provider’s supported passkey access from the trusted device after verifying the site address.",
      ],
      [
        "A registered backup method",
        "backup|recovery|security key",
        "Follow the service’s official recovery flow using the backup method you previously registered.",
      ],
      [
        "No accessible backup",
        "none|no backup|lost",
        "Contact the service through its verified recovery channel; Gamma cannot recreate a private key or bypass authentication.",
      ],
    ],
    second:
      "After regaining access, review registered credentials and add a supported backup method before removing the lost device’s credential.",
    escalation:
      "Use the account provider’s identity-recovery process and do not pay an unverified party promising to recover passkeys.",
  },
  {
    id: "passkey-device",
    question: "What happens during nearby-device sign-in?",
    choices: [
      [
        "The QR code is from the legitimate site",
        "legitimate|site|qr",
        "Verify the full site address and follow the platform’s nearby-device prompt on the trusted phone.",
      ],
      [
        "The phone does not appear",
        "not appear|nearby|bluetooth",
        "Check the platform’s documented proximity and connectivity requirements without sharing the QR code publicly.",
      ],
      [
        "The prompt arrived unexpectedly",
        "unexpected|message|unsolicited",
        "Cancel it and open the service through a trusted address; do not approve a sign-in you did not initiate.",
      ],
    ],
    second:
      "Use another registered authentication method if the supported cross-device flow remains unavailable.",
    escalation:
      "Contact the account provider with the non-sensitive error; never send passkeys, recovery codes or session tokens to support chat.",
  },
  {
    id: "mfa-fatigue",
    question: "Did you initiate the sign-in prompting approval?",
    choices: [
      [
        "No, prompts are unexpected",
        "no|unexpected",
        "Deny the prompts and open the service through a verified address to review account activity.",
      ],
      [
        "Yes, but the details differ",
        "differ|wrong|location",
        "Do not approve until the service’s displayed request details match the sign-in you intended.",
      ],
      [
        "I already approved an unwanted prompt",
        "approved|already",
        "Use the official account security controls to revoke suspicious sessions and change compromised credentials.",
      ],
    ],
    second:
      "Review registered authentication methods and use the provider’s recommended phishing-resistant option where available.",
    escalation:
      "Contact the service’s security support through a known channel if unauthorized access is suspected.",
  },
  {
    id: "remote-support",
    question: "What interaction has already happened?",
    choices: [
      [
        "Only a warning page appeared",
        "page|only|popup",
        "Close the tab through browser controls and do not call the displayed number or install its suggested tool.",
      ],
      [
        "Remote access was installed",
        "installed|remote access",
        "Disconnect the untrusted remote session and seek trusted incident-response help for the device.",
      ],
      [
        "Credentials or payment were shared",
        "credential|password|payment",
        "Contact the relevant account or payment provider through a verified channel and follow its compromise-response process.",
      ],
    ],
    second:
      "Use the genuine OS security tools and a trusted support channel; do not follow further instructions from the warning page.",
    escalation:
      "Escalate suspected device or account compromise to qualified support, preserving relevant non-sensitive evidence.",
  },
  {
    id: "file-double-extension",
    question: "What do you know about the downloaded file?",
    choices: [
      [
        "It has two extensions",
        "two|double|exe",
        "Show the full filename in the OS file manager and treat the final executable extension as significant.",
      ],
      [
        "It came from an unexpected message",
        "unexpected|message|email",
        "Do not open it. Verify the sender and expected file through a separate trusted channel.",
      ],
      [
        "It was already opened",
        "opened|ran|executed",
        "Use trusted OS security tools and incident-response guidance; a browser cannot determine what the executable did.",
      ],
    ],
    second:
      "Compare the publisher’s official download information and signature where supported, without uploading private files to arbitrary scanners.",
    escalation:
      "Seek qualified security support if an unexpected executable was run or account access changed.",
  },
  {
    id: "profile-sync-conflict",
    question: "Where were the missing local records created?",
    choices: [
      [
        "Another browser profile",
        "profile",
        "Open the original profile; account sync may not include that website’s IndexedDB.",
      ],
      [
        "Another device",
        "device|computer|phone",
        "Use the original device to export the local records if it is still available.",
      ],
      [
        "A private window",
        "private|incognito",
        "Private-context data may be temporary; do not promise it can be recovered after that context was removed.",
      ],
    ],
    second:
      "Check the original origin and profile before clearing anything, and keep an independent export of important local data.",
    escalation:
      "If the original storage was deleted or evicted and no export exists, explain that recovery may be unavailable rather than inventing a restore path.",
  },
  {
    id: "sw-install-fail",
    question: "Which installation resource fails?",
    choices: [
      [
        "A missing asset URL",
        "missing|404|asset",
        "Check the built asset path and project base URL; do not mark offline setup complete while a required shell file is absent.",
      ],
      [
        "A blocked network request",
        "blocked|network|offline",
        "Retry on a permitted connection and preserve the previous working worker while the new installation is incomplete.",
      ],
      [
        "A storage error",
        "storage|quota",
        "Keep the application usable online and offer export before asking the user to free chosen site storage.",
      ],
    ],
    second:
      "Inspect the service-worker install error and test a controlled reload only after required caching succeeds.",
    escalation:
      "Report the failing URL/status or storage error to the maintainer; do not delete all user data as an installation shortcut.",
  },
  {
    id: "sw-navigation",
    question: "Which URL fails offline?",
    choices: [
      [
        "The application entry page",
        "entry|home|root",
        "Verify that the shell was cached and the page is inside the service worker’s intended scope.",
      ],
      [
        "A deep application route",
        "deep|route|path",
        "Provide a navigation-only fallback to the cached shell for valid in-scope application routes.",
      ],
      [
        "An API or script request",
        "api|script|json",
        "Do not return HTML for this request. Preserve an explicit unavailable/error result instead of disguising it as navigation.",
      ],
    ],
    second:
      "Test the production subpath after a controlled online visit, then repeat with offline mode and inspect the actual request destination.",
    escalation:
      "Have the maintainer correct scope and fallback routing while preserving existing user records.",
  },
  {
    id: "js-dynamic-import",
    question: "When did the lazy-module failure begin?",
    choices: [
      [
        "After a new deployment",
        "deploy|update",
        "An open page may reference an older chunk. Save work and offer a controlled reload to the current app version.",
      ],
      [
        "Only while offline",
        "offline",
        "Check whether that optional chunk was previously requested and cached; the shell alone does not guarantee every lazy feature is available.",
      ],
      [
        "With a CSP or MIME error",
        "csp|mime|policy",
        "Inspect the response type and content policy rather than repeatedly retrying an invalid executable response.",
      ],
    ],
    second:
      "Compare the referenced chunk URL with the deployed build manifest and retain assets needed by active clients where practical.",
    escalation:
      "Report the exact chunk URL and error to the maintainer; keep the rest of the application usable.",
  },
  {
    id: "idb-abort",
    question: "What reason accompanies the aborted transaction?",
    choices: [
      [
        "Quota exceeded",
        "quota|space",
        "Keep unsaved work in memory and offer export before asking the user to remove selected data.",
      ],
      [
        "Duplicate key or constraint",
        "duplicate|constraint|key",
        "Validate the record’s stable key and intended uniqueness rather than retrying the same invalid write indefinitely.",
      ],
      [
        "No clear reason",
        "unknown|no clear|unsure",
        "Report the transaction abort and preserve the original records; do not treat an earlier request success as a committed save.",
      ],
    ],
    second:
      "Use transaction complete/abort events as the save boundary and retry only after the underlying condition is understood.",
    escalation:
      "Provide the application developer with the non-sensitive error and operation type; avoid deleting the database to hide the failure.",
  },
  {
    id: "quota-write",
    question: "What needs to be preserved before cleanup?",
    choices: [
      [
        "An unsaved document",
        "unsaved|draft|document",
        "Export the current in-memory work before navigating away or removing storage.",
      ],
      [
        "Existing offline records",
        "offline|records|history",
        "Export the records you need and verify the exported file before choosing data to delete.",
      ],
      [
        "Only a disposable cache",
        "cache|disposable",
        "Identify the cache’s owner and remove only data that can safely be downloaded again.",
      ],
    ],
    second:
      "Compare the origin quota estimate with OS free space and retry a small bounded write after the user-approved cleanup.",
    escalation:
      "Ask the developer to handle quota failures without silent data loss; origin estimates do not guarantee future writes.",
  },
  {
    id: "fetch-content-type",
    question: "What is in the unexpected response?",
    choices: [
      [
        "A login page",
        "login|sign in",
        "Check authentication and redirects; do not parse the login HTML as a successful JSON result.",
      ],
      [
        "A server error page",
        "server|error|500",
        "Handle the HTTP error and preserve the operation state before offering a safe retry.",
      ],
      [
        "The application shell",
        "shell|doctype|index",
        "Inspect the endpoint path and SPA fallback rules; an API URL may be incorrectly routed to index.html.",
      ],
    ],
    second:
      "Check status, Content-Type and final response URL before parsing, without logging sensitive response bodies.",
    escalation:
      "Report the endpoint/routing mismatch to the API or deployment maintainer.",
  },
  {
    id: "http431",
    question: "Who can inspect the failing request?",
    choices: [
      [
        "I use the website",
        "user|visitor|use",
        "Record the exact error and ask the site for guidance before clearing data that may contain unsynced work.",
      ],
      [
        "I maintain the website",
        "maintain|developer|server",
        "Inspect request-header sizes and cookie scope; determine which header exceeds the configured limit.",
      ],
      [
        "It happens through a work proxy",
        "proxy|work",
        "Ask the proxy administrator to compare its header limits and added headers with the origin server.",
      ],
    ],
    second:
      "If site-specific data cleanup is justified, export needed local work first and explain that cookies may sign the user out.",
    escalation:
      "Have the operator correct excessive headers or appropriate limits instead of advising global browser resets.",
  },
  {
    id: "http503",
    question: "Was the failed request consequential?",
    choices: [
      [
        "A payment or order",
        "payment|order|purchase",
        "Check the service’s transaction status before retrying; a failed confirmation page does not prove the action was not processed.",
      ],
      [
        "A normal page load",
        "page|read|browse",
        "Check the service status and respect any Retry-After delay rather than repeatedly refreshing.",
      ],
      [
        "I operate the server",
        "operate|server|administrator",
        "Inspect capacity, maintenance state and upstream health while returning an appropriate retry policy.",
      ],
    ],
    second:
      "Retry only through the service’s documented safe flow after the reported outage or delay clears.",
    escalation:
      "Contact the operator with the timestamp and request type; avoid duplicate consequential submissions.",
  },
  {
    id: "dns-servfail",
    question: "How widely does the domain lookup fail?",
    choices: [
      [
        "Only one resolver",
        "resolver|one network",
        "Compare an authorized trusted resolver and ask the network operator about upstream or validation failures.",
      ],
      [
        "Several networks",
        "several|multiple|every",
        "Ask the domain operator to inspect authoritative servers and DNSSEC configuration.",
      ],
      [
        "Only an internal domain",
        "internal|intranet|work",
        "Use the intended private resolver or approved VPN; public resolvers may not serve that zone.",
      ],
    ],
    second:
      "Record the exact DNS status and compare authoritative versus recursive results if you administer the domain.",
    escalation:
      "Have the domain or resolver operator fix the underlying failure; do not disable validation indiscriminately.",
  },
  {
    id: "clipboard-gesture",
    question: "How is copying initiated?",
    choices: [
      [
        "A direct button click",
        "button|click|tap",
        "Check secure context and page focus, and catch the actual clipboard operation’s rejection.",
      ],
      [
        "A delayed background task",
        "delay|background|timer",
        "Move copying to a deliberate user action; the original activation may no longer apply.",
      ],
      [
        "Inside an embedded frame",
        "frame|embedded|iframe",
        "Check embedding policy and supported permission behavior for that frame.",
      ],
    ],
    second:
      "Provide manual text selection as a fallback and copy only the value the user intended.",
    escalation:
      "Report the browser and rejection to the application developer without asking for unrelated clipboard access.",
  },
] as const;
