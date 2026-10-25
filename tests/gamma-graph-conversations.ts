// Individually written symptom/observation exchanges. These are evaluated through
// the public response pipeline, including intent selection and persisted context.
const rows = `
mac-camera-one-site|mac browser camera denied~Only one website~/explain|site’s camera permission
mac-camera-os-layer|mac browser camera denied~Every browser site~No, the OS permission was already allowed|local application
mac-camera-other-apps|mac browser camera denied~Other apps too|another app
android-camera-denied|android site camera blocked~Permission denied~/explain|Android permission
android-camera-wrong-input|android site camera blocked~Wrong camera|front and rear
android-camera-no-prompt|android site camera blocked~No prompt~No, the secure site still does not ask|camera app
camera-held-by-app|Camera busy in another application~In another app~/explain|other app
camera-physical-shutter|Camera busy in another application~Nowhere|privacy shutter
camera-unknown-scope|Camera busy in another application~Not sure~No, the comparison still fails|Restart
share-tab-audio|Screen-share audio availability~A browser tab~/explain|tab-audio
share-window-audio|Screen-share audio availability~An application window|platform-dependent
share-display-audio|Screen-share audio availability~The entire screen~No, system audio is still absent|meeting’s audio
webgpu-api-absent|WebGPU API without an adapter~API missing|HTTPS
webgpu-adapter-null|WebGPU API without an adapter~Adapter is null~/explain|graphics diagnostics
webgpu-model-failure|WebGPU API without an adapter~Model setup failed~No, setup still fails|minimal trusted
idb-blocked-other-tab|IndexedDB upgrade blocked~Another tab|close it normally
idb-blocked-installed-window|IndexedDB upgrade blocked~An installed app window~/explain|installed app
idb-blocked-no-copy|IndexedDB upgrade blocked~No other copy~No, the upgrade is still blocked|versionchange
storage-private-context|Storage blocked by browser policy~Only in private mode|regular trusted
storage-embedded-context|Storage blocked by browser policy~Only embedded~/explain|top-level
storage-policy-all-contexts|Storage blocked by browser policy~Everywhere~No, the test still fails|temporary write
worker-update-unsaved|Service worker waiting for activation~Unsaved work|Save or export
worker-update-ready|Service worker waiting for activation~Everything saved~/explain|update action
worker-update-loop|Service worker waiting for activation~Update loops~No, the loop persists|Close other
cors-visitor|CORS preflight rejection~Using the website|security should remain
cors-api-owner|CORS preflight rejection~Maintaining the API~/explain|OPTIONS
cors-with-cookies|CORS preflight rejection~Credentialed request~No, the request is still rejected|same-origin
scam-site-notification|Notification masquerading as antivirus~A site notification|revoke
scam-page-warning|Notification masquerading as antivirus~Inside a web page~/explain|Close
scam-real-security-app|Notification masquerading as antivirus~The system security app~No, I still need to investigate|recent downloads
profile-lock-open-window|Browser profile already in use~Another window is open|Save work
profile-lock-background-process|Browser profile already in use~Only a background process~/explain|unsaved work
profile-lock-after-crash|Browser profile already in use~After a crash~No, the profile still refuses to open|backup
print-wide-table|Printing cuts off page content~Wide table cut off|landscape
print-missing-sections|Printing cuts off page content~Content is missing~/explain|print stylesheet
print-tiny-text|Printing cuts off page content~Text is too small~No, preview is still wrong|preview PDF
meeting-wrong-microphone|Wrong camera or microphone selected~Wrong microphone|input meter
meeting-wrong-camera|Wrong camera or microphone selected~Wrong camera~/explain|camera
meeting-wrong-speakers|Wrong camera or microphone selected~Wrong speakers~No, the output is still wrong|local recording
autoplay-works-after-tap|Autoplay policy rejection~Yes, after a tap|autoplay policy
autoplay-player-error|Autoplay policy rejection~No, it shows an error~/explain|player error
autoplay-muted-only|Autoplay policy rejection~Only muted playback~No, automatic sound still does not start|play promise
capture-exact-resolution|Unsupported camera constraints~A specific resolution|default resolution
capture-high-framerate|Unsupported camera constraints~A high frame rate~/explain|frame rate
capture-all-settings|Unsupported camera constraints~Every configuration~No, defaults also fail|ideal constraints
recording-truncated-end|Saving recorded media chunks~The end is missing|final dataavailable
recording-incompatible-format|Saving recorded media chunks~The format will not open~/explain|MIME type
recording-growing-memory|Saving recorded media chunks~Memory grows during recording~No, the recording is still unreliable|short non-sensitive
buffering-spinner|Buffering versus dropped frames~A buffering spinner|lower resolution
buffering-decode-stutter|Buffering versus dropped frames~Choppy frames without buffering~/explain|decoding
buffering-and-frames|Buffering versus dropped frames~Both symptoms~No, lowering resolution did not resolve it|temporary browser profile
wayland-no-picker|Wayland screen sharing~No chooser appears|portal service
wayland-black-window|Wayland screen sharing~The chooser opens but capture is black~/explain|unprotected
wayland-one-build|Wayland screen sharing~Only one browser fails~No, the supported build still fails|PipeWire
linux-codec-single-file|Distribution media codec availability~Only one file|container and codecs
linux-codec-package|Distribution media codec availability~One browser only~/explain|browser package
linux-protected-media|Distribution media codec availability~Protected streaming service~No, the service still refuses playback|non-protected
linux-audio-wrong-output|Linux per-application audio routing~On the wrong device|per-application
linux-audio-muted-stream|Linux per-application audio routing~Other apps work~/explain|mute state
linux-audio-system-failure|Linux per-application audio routing~No application has sound~No, sound is still missing|test sound
work-proxy-away|Windows proxy mismatch~Only away from work|remote-access
proxy-all-networks|Windows proxy mismatch~On every network~/explain|PAC URL
proxy-one-destination|Windows proxy mismatch~Only one website~No, that site still fails|IT
windows-text-zoom|Windows scaling and browser sharpness~Only page text|page zoom
windows-toolbar-blur|Windows scaling and browser sharpness~The whole application~/explain|recommended display
windows-second-monitor|Windows scaling and browser sharpness~Only after moving monitors~No, the blur remains|same display
disk-update-workload|High disk active time~A known update is active|update complete
disk-browser-workload|High disk active time~The browser dominates disk use~/explain|download
disk-other-process|High disk active time~Another process dominates~No, the delay continues|active time
pagefile-disabled|Page file and memory commitments~The page file was disabled|commit limit
pagefile-unchanged|Page file and memory commitments~Settings were unchanged~/explain|committed memory
pagefile-managed|Page file and memory commitments~The device is managed~No, allocation still fails|saving and closing
mac-green-pressure|macOS memory pressure~Green while the browser is slow|CPU activity
mac-red-pressure|macOS memory pressure~Yellow or red~/explain|Save work
mac-pressure-unknown|macOS memory pressure~I have not checked~No, the browser is still slow|identified workload
keychain-password-change|Keychain prompts from browsers~After changing the login password|password mismatch
keychain-unknown-app|Keychain prompts from browsers~For an unfamiliar application~/explain|Cancel
keychain-known-action|Keychain prompts from browsers~Only for a known browser action~No, prompts still recur|lock state
relay-location-mismatch|Private Relay and site behavior~A site reports a different location|IP-based location
relay-single-site|Private Relay and site behavior~Only one site refuses access~/explain|exact error
relay-network-policy|Private Relay and site behavior~The network reports incompatibility~No, compatibility is still a problem|scoped comparison
android-dns-all-sites|Android Private DNS failures~All websites fail|Private DNS hostname
android-dns-internal|Android Private DNS failures~Only an internal work site~/explain|internal domain
android-dns-single|Android Private DNS failures~Only one public domain~No, lookup still fails|administrator-approved
android-stale-page|Android cache versus app storage~One stale page|normal reload
android-download-cleanup|Android cache versus app storage~A failed download~/explain|destination space
android-space-cleanup|Android cache versus app storage~Low device storage~No, space is still low|Clear cache
webview-several-apps|Android System WebView updates~Several apps with embedded pages|official updates
webview-one-app|Android System WebView updates~Only one application~/explain|full browser
webview-browser-too|Android System WebView updates~The full browser also fails~No, unrelated sites also fail|versions
iphone-download-location|Finding iPhone browser downloads~Completed but hard to find|Files destination
iphone-download-incomplete|Finding iPhone browser downloads~Still downloading or failed~/explain|partial file
iphone-download-sync|Finding iPhone browser downloads~Visible locally but not on another device~No, the remote device still lacks it|saved file locally
iphone-camera-one-site|iPhone browser camera restrictions~Only one website|website’s camera permission
iphone-camera-app-layer|iPhone browser camera restrictions~The browser app is restricted~/explain|iOS privacy
iphone-camera-managed|iPhone browser camera restrictions~Screen Time or management applies~No, capture still fails|built-in camera
iphone-blocker-images|iPhone content-blocker exceptions~Images or article content|scoped content-blocker
iphone-blocker-checkout|iPhone content-blocker exceptions~Sign-in or checkout~/explain|transaction state
iphone-many-sites|iPhone content-blocker exceptions~Many unrelated websites~No, several sites still fail|one site-scoped
lost-passkey-synced|Lost passkey device recovery~Another trusted synced device|verifying the site
lost-passkey-backup|Lost passkey device recovery~A registered backup method~/explain|official recovery
lost-passkey-no-backup|Lost passkey device recovery~No accessible backup|cannot recreate
cross-device-legitimate|Passkey on another device~The QR code is from the legitimate site|full site address
cross-device-phone-missing|Passkey on another device~The phone does not appear~/explain|proximity
cross-device-unexpected|Passkey on another device~The prompt arrived unexpectedly|Cancel
mfa-unexpected-denied|Repeated unexpected MFA prompts~No, prompts are unexpected|Deny
mfa-details-mismatch|Repeated unexpected MFA prompts~Yes, but the details differ~/explain|Do not approve
mfa-already-approved|Repeated unexpected MFA prompts~I already approved an unwanted prompt|revoke suspicious
remote-warning-only|Unsolicited remote support~Only a warning page appeared|do not call
remote-tool-installed|Unsolicited remote support~Remote access was installed~/explain|Disconnect
remote-payment-disclosed|Unsolicited remote support~Credentials or payment were shared|verified channel
filename-hidden-executable|Misleading download extensions~It has two extensions|final executable
filename-unexpected-message|Misleading download extensions~It came from an unexpected message~/explain|Do not open
filename-already-executed|Misleading download extensions~It was already opened|incident-response
local-records-other-profile|Local profile versus synced account~Another browser profile|original profile
local-records-other-device|Local profile versus synced account~Another device~/explain|export
local-records-private-window|Local profile versus synced account~A private window|temporary
worker-install-404|Failed service-worker installation~A missing asset URL|project base URL
worker-install-network|Failed service-worker installation~A blocked network request~/explain|previous working worker
worker-install-storage|Failed service-worker installation~A storage error~No, installation still fails|install error
worker-offline-entry|Offline navigation fallback~The application entry page|intended scope
worker-offline-deep-link|Offline navigation fallback~A deep application route~/explain|navigation-only
worker-offline-api|Offline navigation fallback~An API or script request|Do not return HTML
lazy-import-deployment|Dynamic import failure recovery~After a new deployment|Save work
lazy-import-offline|Dynamic import failure recovery~Only while offline~/explain|previously requested
lazy-import-policy|Dynamic import failure recovery~With a CSP or MIME error~No, importing still fails|build manifest
idb-transaction-quota|IndexedDB transaction abort~Quota exceeded|unsaved work
idb-transaction-key|IndexedDB transaction abort~Duplicate key or constraint~/explain|uniqueness
idb-transaction-unknown|IndexedDB transaction abort~No clear reason~No, writes still abort|complete/abort
quota-unsaved-document|Quota failure while saving~An unsaved document|in-memory
quota-offline-history|Quota failure while saving~Existing offline records~/explain|verify the exported
quota-disposable-assets|Quota failure while saving~Only a disposable cache~No, saving still fails|origin quota
json-login-html|HTML returned instead of JSON~A login page|authentication
json-server-error|HTML returned instead of JSON~A server error page~/explain|HTTP error
json-spa-fallback|HTML returned instead of JSON~The application shell~No, parsing still fails|Content-Type
headers-large-visitor|Request headers too large~I use the website|unsynced work
headers-large-operator|Request headers too large~I maintain the website~/explain|cookie scope
headers-large-proxy|Request headers too large~It happens through a work proxy~No, requests are still rejected|sign the user out
unavailable-payment|HTTP 503 service unavailable~A payment or order|transaction status
unavailable-page-load|HTTP 503 service unavailable~A normal page load~/explain|Retry-After
unavailable-server-owner|HTTP 503 service unavailable~I operate the server~No, service has not recovered|safe flow
servfail-one-resolver|DNS SERVFAIL~Only one resolver|trusted resolver
servfail-many-networks|DNS SERVFAIL~Several networks~/explain|DNSSEC
servfail-private-zone|DNS SERVFAIL~Only an internal domain~No, lookup still fails|authoritative
clipboard-button|Clipboard user activation~A direct button click|secure context
clipboard-delayed-task|Clipboard user activation~A delayed background task~/explain|deliberate user action
clipboard-embedded-frame|Clipboard user activation~Inside an embedded frame~No, copying still fails|manual text selection
`;
export const graphConversations = rows
  .trim()
  .split("\n")
  .map((line) => {
    const [name, turns, contains] = line.split("|");
    return { name, turns: turns.split("~"), contains };
  });
