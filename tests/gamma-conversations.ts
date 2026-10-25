// Each row is an independently written conversational scenario, not a generated
// Cartesian product of graph branches. Format: name | turns (~) | final assertion.
const rows = `
slow-single-resolved|Why is my browser slow?~Mostly the news website~Reading and scrolling~Yes, that comparison fixed it|helped
slow-tabs-persist|Why is my browser slow?~Several tabs~No, closing saved tabs changed nothing~No, the clean profile is also slow|browser support
slow-video-explanation|Why is my browser slow?~Video playback~/explain|playback resolution
website-other-site-works|Website will not open~Yes, another unrelated site loads~No, the affected site still fails|exact error
website-network-wide|Website will not open~No, other sites fail too~Yes, access returned|helped
website-explain-comparison|Website will not open~Yes, the second site opens~/explain|site-specific
crash-single-page|Browser keeps crashing~Yes, only the document editor~No, a temporary profile also crashes|reproducible
crash-many-pages|Browser keeps crashing~No, several unrelated pages crash~Yes, the temporary profile avoids it|helped
crash-diagnostic-state|Browser keeps crashing~Yes, only one page~/diagnose status|in progress
login-clean-profile|Login failures~Yes, the account works in a temporary profile~No, the original profile still fails|service
login-account-recovery|Login failures~No, another profile cannot sign in either~No, the official recovery check did not fix it|lock
login-restored|Login failures~Yes, the temporary profile signs in~Yes, sign-in now works|helped
audio-browser-only|No sound~Yes, another app has sound~Yes, the tab was muted|helped
audio-system-output|No sound~No, the other app is silent too~No, another output also fails|audio troubleshooter
audio-explain-routing|No sound~No, there is no sound in other apps~/explain|output device
video-one-item|Video will not play~Yes, another video plays~No, the original still fails|codec
video-service-wide|Video will not play~No, no videos on the service play~Yes, the comparison now plays|helped
video-workflow-status|Video will not play~Yes, another clip works~/diagnose status|confirm
network-other-device-works|Connection failures~Yes, the other laptop connects~No, this device still cannot connect|network provider
network-shared-outage|Connection failures~No, the phone also fails on this network~Yes, connectivity returned|helped
network-explain-device-scope|Connection failures~Yes, another device reaches the site~/explain|device
heat-damaged-battery|A hot laptop~Yes, the battery looks swollen|Stop using
heat-workload-improves|A hot laptop~No, there is no physical damage~Yes, reducing workload helped|helped
heat-persists|A hot laptop~No, there is no smell or swelling~No, it stays unusually hot|qualified
freeze-tab-only|Frozen tab~Yes, the other tab responds~Yes, reopening the saved page helped|helped
freeze-system-wide|Frozen tab~No, other tabs do not respond~No, the freeze returns|clean profile
freeze-unsaved-work|Frozen tab~Yes, another tab works~/explain|unsaved
load-site-specific|Slow page loading~Yes, an unrelated site loads normally~No, the comparison is also slow|initial connection
load-shared-network|Slow page loading~No, unrelated sites are slow~Yes, another device comparison found a working path|helped
load-explain-scope|Slow page loading~Yes, only this site is slow~/explain|site
logout-private-window|Repeated logout~Yes, I use a private window~Yes, the regular profile keeps the session|helped
logout-service-policy|Repeated logout~No, I do not clear cookies~No, sessions still expire|multi-factor
logout-explain-cookie-check|Repeated logout~Yes, cookies clear at exit~/explain|session cookies
clipboard-keyboard-works|Clipboard access~Yes, the keyboard shortcut works~No, the site copy button still fails|manual
clipboard-other-apps-fail|Clipboard access~No, normal copy and paste also fails~Yes, system clipboard works again|helped
clipboard-check-purpose|Clipboard access~Yes, manual copying works~/explain|clipboard
failed-download-security|Failed downloads~Yes, it has a security warning~No, I have not verified the publisher|publisher
failed-download-space|Failed downloads~No, there is no security warning~Yes, the verified download finished|helped
failed-download-explanation|Failed downloads~No, the download shows a disk error~/explain|disk space
blank-clean-profile-works|Blank page~Yes, the page works in a temporary profile~Yes, a single extension change restored it|helped
blank-site-fails-everywhere|Blank page~No, the temporary profile is blank too~No, another browser is also blank|developer
blank-profile-test-purpose|Blank page~Yes, the clean profile works~/explain|extensions
layout-zoom-fix|Broken page layout~Yes, resetting zoom restored it~Yes, the page is usable|helped
layout-profile-no-fix|Broken page layout~No, default zoom is still broken~No, the temporary profile is broken too|viewport
layout-zoom-explanation|Broken page layout~Yes, normal zoom fixes the overlap~/explain|zoom
extension-one-conflict|Extension conflicts~Yes, the clean profile works~Yes, one extension explained the issue|helped
extension-not-established|Extension conflicts~No, it fails with no added extensions~No, the service still fails|Restore
extension-compare-purpose|Extension conflicts~Yes, the profile without add-ons works~/explain|one
update-managed-device|Browser update failures~Yes, the browser is managed~No, the update still fails|official
update-unmanaged-space|Browser update failures~No, this is my personal browser~Yes, the supported updater completed|helped
update-check-explanation|Browser update failures~No, it is not managed~/explain|free space
certificate-clock-fixed|Certificate warnings~Yes, the system date is wrong~Yes, the warning is gone|helped
certificate-multiple-sites|Certificate warnings~No, the time is correct~No, several trusted sites still warn|sensitive
certificate-no-bypass|Certificate warnings~No, the clock is correct~/explain|administrator
dns-spelling-fixed|DNS~Yes, I typed the domain incorrectly~Yes, the corrected address resolves|helped
dns-unrelated-domain|DNS~No, the domain spelling is correct~No, it still does not resolve|domain or network
dns-comparison-explained|DNS~No, I copied the correct domain~/explain|another device
wifi-distance-improves|Wi-Fi troubleshooting~Yes, moving closer helps~Yes, the connection is stable here|helped
wifi-multiple-devices|Wi-Fi troubleshooting~No, distance makes no difference~No, multiple devices still lose connection|network operator
wifi-check-purpose|Wi-Fi troubleshooting~Yes, it works near the router~/explain|interference
portal-official-prompt|Captive portals~Yes, the OS has a sign-in prompt~Yes, a trusted site loads afterward|helped
portal-no-prompt|Captive portals~No, no official prompt appears~No, the operator procedure still fails|network operator
portal-verify-network|Captive portals~Yes, a network sign-in prompt appears~/explain|network name
cache-reload-enough|Clear a site cache~Yes, a normal reload fixes it~Yes, the content is current|helped
cache-server-stale|Clear a site cache~No, normal reload is stale~No, a temporary profile is stale too|server
cache-preserve-data|Clear a site cache~No, normal reload did not help~/explain|Save work
quota-backup-first|Storage quota~No, I have not exported my offline notes~No, saving still fails|requirements
quota-known-cleanup|Storage quota~Yes, the important records are exported~Yes, the site saves again|helped
quota-action-explained|Storage quota~No, I still have unsynced documents~/explain|back up
battery-known-app|Battery drains quickly~Yes, the OS identifies one busy app~Yes, pausing it improved battery life|helped
battery-unknown-drain|Battery drains quickly~No, no single app stands out~No, idle drain continues|manufacturer
battery-check-limits|Battery drains quickly~No, I cannot identify one app~/explain|system battery
disk-recognized-files|Low disk space~Yes, there are large files I no longer need~Yes, I now have room for the download|helped
disk-unknown-files|Low disk space~No, the large folders are unfamiliar~No, supported cleanup was insufficient|storage expansion
disk-safe-cleanup|Low disk space~No, I do not recognize the files~/explain|system folders
startup-restored-tabs|Slow startup~Yes, it restores many tabs~Yes, starting with a blank page is faster|helped
startup-no-tabs|Slow startup~No, it opens a blank page~No, reviewing startup items did not help|clean browser profile
startup-explain-items|Slow startup~No, there are no restored tabs~/explain|startup
`;
export type ConversationScenario = {
  name: string;
  turns: string[];
  contains: string;
};
export const extendedConversations: ConversationScenario[] = rows
  .trim()
  .split("\n")
  .map((line) => {
    const [name, turns, contains] = line.split("|");
    return { name, turns: turns.split("~"), contains };
  });
