// Independent contextual regressions, including ambiguous references, corrections,
// permissions, reset boundaries and follow-up wording outside exact intent aliases.
const rows = `
instructions-after-cookie-topic|What are cookies?~Give me the instructions|1.
fix-reference-after-crash|Browser keeps crashing~How do I fix that?|1.
steps-after-cache-topic|Clear a site cache~What should I try first?|1.
shorten-storage-advice|Storage quota~More detail~Make that shorter|storage
expand-privacy-topic|How can I improve my privacy?~Can you explain that more?|Reference:
repeat-webassembly|What is WebAssembly?~Say that again|WebAssembly
browser-correction-brave|I'm using Chrome~Actually, it's Brave~/context|Stated browser: brave
browser-correction-safari|I'm using Firefox~Correction, I use Safari~/context|Stated browser: safari
correction-during-troubleshooting|Why is my browser slow?~Several tabs~Actually, I use Brave~/diagnose status|No active
stated-browser-followup|I'm using Firefox~Why is my browser slow?|For firefox
browser-detection-separate|I'm using Brave~What browser am I using?~/context|Stated browser: brave
comparison-pronoun|I'm using Chrome~Compare it with Firefox|Firefox
compare-referenced-pair|Chrome works but Firefox doesn't~Can you compare them?|Firefox
compare-cookie-cache-again|Compare cache and cookies~Can you compare them?|sign you out
comparison-ambiguous|What is WebAssembly?~Can you compare them?|Which two
privacy-pronoun|I'm using Brave~Is that private?|third-party cookie
safe-action-ambiguous|Clear a site cache~Is it safe?|Which action
unsafe-infection-premise|Why is my browser slow?~My browser is definitely infected|cannot confirm
current-memory-followup|What is RAM?~How much memory is being used right now?|cannot read system-wide
negated-slow-followup|Why is my browser slow?~My browser isn't slow, it just crashes~/context|Topic: crash
new-topic-drops-diagnosis|Why is my browser slow?~What is WebAssembly?~/diagnose status|No active
reset-then-pronoun|Why is my browser slow?~/context clear~How do I fix that?|Name the browser feature
clear-browser-reference|I'm using Safari~/context clear~/context|Stated browser: none
stop-clears-recommendation|Why is my browser slow?~Several tabs~/diagnose stop~/explain|No recommendation
restart-clears-explanation|Why is my browser slow?~Several tabs~/diagnose restart~/explain|No recommendation
restart-asks-scope|Screen-share audio availability~A browser tab~/diagnose restart|What did you choose to share
stop-then-short-answer|Why is my browser slow?~Several tabs~/diagnose stop~Yes|Which check
no-diagnosis-restart|What is WebAssembly?~/diagnose restart|before restarting
instruction-reference-missing|Hello~Give me instructions|Name the browser feature
numbered-option-clarification|Hello~Can you explain the second option?|Which options
second-option-without-selection|Screen-share audio availability~Can you explain the second option?|platform-dependent
third-option-explanation|IndexedDB upgrade blocked~Explain the third option|blocked event
first-option-explanation|HTTP 503 service unavailable~Explain the first option|transaction status
alternative-after-first-check|Why is my browser slow?~Several tabs~Try something else|temporary profile
explain-recommended-comparison|Why is my browser slow?~Video playback~Why that recommendation?|playback resolution
complete-with-no-false-memory|Website will not open~Yes, another site works~Yes, access returned~/context clear~/diagnose status|No active
web-disabled-after-local-topic|What is WebAssembly?~Search Wikipedia for WebAssembly|off
web-sources-not-invented|What is DNS?~More detail~/sources|No public sources
web-off-preserves-local-help|/web off~What is WebAssembly?|WebAssembly
semantic-off-preserves-local-help|/enhance off~What are cookies?|Cookies
semantic-consent-followup|What is WebAssembly?~/enhance on|explicitly consent
unknown-command-during-flow|Why is my browser slow?~/delete-everything|cannot be executed
invalid-web-argument|What is DNS?~/web private-history|Use /web
extension-tab-boundary|What browser am I using?~/tab|requires the Varek Chromium extension
extension-reader-boundary|What is WebAssembly?~/reader|cannot access your other tabs
permission-command-not-a-grant|Why is my browser slow?~/permissions|browser-reported
platform-ios-vs-windows|I am using Safari on iOS~Windows proxy mismatch|You stated iOS
platform-android-vs-mac|I'm using Chrome on Android~macOS memory pressure|You stated Android
platform-linux-vs-iphone|I am using Firefox on Linux~iPhone browser camera restrictions|You stated Linux
platform-windows-version|I'm using Chrome on Windows 11~Windows proxy mismatch|When does the proxy
platform-ipad-alias|I'm using Safari on iPadOS~iPhone browser camera restrictions|Where is camera
platform-correction|I'm using Firefox on Linux~Actually, I am using Chrome on Windows 11~Windows proxy mismatch|When does the proxy
unsupported-after-supported|What is WebAssembly?~Write an epic poem about a purple volcano|reliable answer
ambiguous-yes-after-definition|What is WebAssembly?~Yes|Which check
health-after-performance-question|Why is my browser slow?~/health|no universal browser-health score
`;
export const contextConversations = rows
  .trim()
  .split("\n")
  .map((line) => {
    const [name, turns, contains] = line.split("|");
    return { name, turns: turns.split("~"), contains };
  });
