// Each path asks for an observation; no diagnosis is represented as a measurement.
export type Flow = {
  id: string;
  question: string;
  yes: string;
  no: string;
  next: string;
  escalation: string;
};
export const flows: Flow[] = [
  {
    id: "slow",
    question: "Does the slowdown affect just one website?",
    yes: "Focus on that site: save work, reload, and compare it in a temporary profile.",
    no: "Start with the browser task manager and close one unused heavy tab after saving work.",
    next: "Did that improve the slowdown?",
    escalation:
      "Record the browser version and the workload. Compare a clean profile, then consult browser support if the problem persists.",
  },
  {
    id: "website",
    question: "Can you open a second, unrelated website?",
    yes: "The issue may be site-specific. Record the exact error and compare the affected site in another browser.",
    no: "Check your system network status and whether another device on the same network can connect.",
    next: "Did the next check restore access?",
    escalation:
      "Use the exact error to distinguish DNS, certificate, access, or server problems. Contact the site or network operator without bypassing security warnings.",
  },
  {
    id: "crash",
    question: "Does the crash happen on only one page?",
    yes: "Save the URL and exact crash message. Retry the page in a temporary profile.",
    no: "Update and restart the browser, then test a temporary profile with no added extensions.",
    next: "Does the temporary profile avoid the crash?",
    escalation:
      "Save a reproducible sequence and consult browser support. System-wide crashes need operating-system or hardware support.",
  },
  {
    id: "login",
    question:
      "Does the same account sign in successfully in a temporary browser profile?",
    yes: "Review cookie controls and extensions in the original profile. Change only one setting at a time.",
    no: "Check the service status and use its official account-recovery flow. Do not share passwords or codes here.",
    next: "Can you sign in after that check?",
    escalation:
      "Contact the service with the error text. Avoid repeated password attempts that may lock the account.",
  },
  {
    id: "audio",
    question: "Can you hear audio from another app?",
    yes: "Check the tab, player, and per-app mute controls, then reload the affected page.",
    no: "Check the selected system output device and its volume. Test another trusted output device if available.",
    next: "Is the sound working now?",
    escalation:
      "Use the system audio troubleshooter or device support. Record which outputs and apps fail.",
  },
  {
    id: "video",
    question: "Does another video on the same service play?",
    yes: "The original video may be unavailable or have a format-specific issue. Record its error.",
    no: "Check the service status, update the browser, and compare a temporary profile.",
    next: "Does playback work after that check?",
    escalation:
      "Contact the video service with the error code and browser version. Avoid installing unknown codec packs.",
  },
  {
    id: "offline-network",
    question: "Can another device on the same network reach a trusted website?",
    yes: "Focus on this device’s connection, proxy configuration, and any official network sign-in prompt.",
    no: "The shared connection may be affected. Check router status or ask the network operator.",
    next: "Has connectivity returned?",
    escalation:
      "Record the exact network error and contact your network provider or IT administrator.",
  },
  {
    id: "heat",
    question: "Is there swelling, smoke, or a burning smell?",
    yes: "Stop using the device. Disconnect power if safe and contact qualified support; do not continue load testing.",
    no: "Use a firm ventilated surface and inspect system activity for sustained load. Cole cannot measure temperature.",
    next: "Did reducing the workload improve the heat?",
    escalation:
      "Persistent unusual heat needs manufacturer or qualified hardware support.",
  },
  {
    id: "freeze",
    question: "Can you still interact with another browser tab?",
    yes: "The problem appears limited to one tab. Wait briefly if it contains unsaved work, then close only that tab if necessary.",
    no: "Check whether another application responds. If the whole system is unresponsive, use the operating system’s recovery controls.",
    next: "Did reopening the affected page resolve the freeze?",
    escalation:
      "Record the page and steps that reproduce the freeze. Compare a clean profile and contact the site developer.",
  },
  {
    id: "load",
    question: "Does another unrelated website load normally?",
    yes: "Focus on the slow site. Compare it in a temporary browser profile and check its status page.",
    no: "Compare another device on the same network before changing browser settings.",
    next: "Did that comparison identify a working configuration?",
    escalation:
      "Record whether delays affect the initial connection, images, or interaction. Share that evidence with the site or network operator.",
  },
  {
    id: "logout",
    question:
      "Are you using a private window or clearing cookies when the browser closes?",
    yes: "That can remove session cookies. Use a regular trusted profile if persistent sign-in is appropriate.",
    no: "Review site-specific cookie permissions and the service’s session limits.",
    next: "Does the session now survive a normal browser restart?",
    escalation:
      "Ask the service whether account policies or security controls are invalidating sessions. Do not weaken multi-factor authentication.",
  },
  {
    id: "clipboard",
    question: "Does the normal keyboard copy-and-paste shortcut work?",
    yes: "The issue is likely with the site’s clipboard integration or permissions. Click its copy control directly and review supported site permissions.",
    no: "Check whether clipboard operations work in another trusted application; the issue may be outside the website.",
    next: "Can you now copy the intended text?",
    escalation:
      "Use manual text selection as a fallback. Report the failing browser and action to the site developer.",
  },
  {
    id: "download-fail",
    question: "Does the download show a security warning?",
    yes: "Verify the publisher and file source. Do not disable protection just to silence the warning.",
    no: "Check the exact error, system disk space, and whether the connection is stable.",
    next: "Did a verified download complete successfully?",
    escalation:
      "Contact the publisher with the error. If the device is managed, ask IT about download restrictions.",
  },
  {
    id: "blank",
    question: "Does the page work in a temporary browser profile?",
    yes: "Review extensions and site-data differences in the original profile, changing one item at a time.",
    no: "Check the service status and compare another browser engine.",
    next: "Does the page display after the next check?",
    escalation:
      "Report the browser version and non-sensitive console error to the site developer.",
  },
  {
    id: "layout",
    question: "Does resetting page zoom restore the layout?",
    yes: "Keep a readable zoom level and report any layout failure at supported zoom to the developer.",
    no: "Compare a temporary profile to check whether styles are blocked by an extension or profile setting.",
    next: "Is the page usable after that comparison?",
    escalation:
      "Send the developer a non-sensitive screenshot and viewport size. Do not disable browser security.",
  },
  {
    id: "extension-conflict",
    question: "Does the site work in a clean profile without added extensions?",
    yes: "In the original profile, disable one nonessential extension at a time and retry.",
    no: "Extensions are not yet established as the cause. Check the service status and exact error.",
    next: "Did a single extension change explain the issue?",
    escalation:
      "Restore unrelated extensions. Report a reproducible conflict to the extension author without sharing sensitive page contents.",
  },
  {
    id: "update-fail",
    question: "Is the browser managed by an organization?",
    yes: "Contact the administrator with the update error; local settings may be policy-controlled.",
    no: "Check system free space and retry the official updater after saving work and restarting.",
    next: "Did the supported updater finish?",
    escalation:
      "Use official browser support or the operating-system package manager. Avoid third-party updater downloads.",
  },
  {
    id: "certificate",
    question: "Is your system date or time incorrect?",
    yes: "Correct the date, time, and time zone through system settings, then reload the site.",
    no: "Compare a known trusted site. If several sites fail, ask your network administrator about interception or certificate configuration.",
    next: "Is the warning resolved without bypassing it?",
    escalation:
      "Stop entering sensitive information on the affected connection and contact the site or network administrator.",
  },
  {
    id: "dns",
    question: "Does the domain name contain a spelling mistake?",
    yes: "Correct the address and navigate again. Verify the expected domain before signing in.",
    no: "Compare an unrelated site and another device on the same network to isolate the resolver or domain.",
    next: "Does the corrected or retested address resolve?",
    escalation:
      "Record the DNS error and contact the domain or network operator. Preserve existing resolver settings before any authorized change.",
  },
  {
    id: "wifi",
    question: "Does moving nearer the router improve the connection?",
    yes: "Distance or interference may be involved. Choose a clearer location and compare again before replacing hardware.",
    no: "Check another device on the same network to separate a device issue from a shared connection problem.",
    next: "Is the connection stable after that check?",
    escalation:
      "Contact the network operator with the observed device and location pattern.",
  },
  {
    id: "captive",
    question: "Does the operating system show a network sign-in prompt?",
    yes: "Use that prompt after confirming the network name with its operator.",
    no: "Ask the network operator for the official sign-in procedure; avoid entering credentials on an unexpected warning page.",
    next: "Can you reach a trusted website after completing the portal?",
    escalation:
      "Ask the network operator to check access for your device. Do not bypass certificate warnings.",
  },
  {
    id: "cache",
    question: "Does a normal reload restore the expected page?",
    yes: "No data deletion is necessary. Keep your saved sessions and offline work.",
    no: "Save work, then compare a reload without cache or a temporary browser profile.",
    next: "Does the page now show current content?",
    escalation:
      "Only consider site-specific data deletion after exporting unsynced work. If the server sends stale content, contact its operator.",
  },
  {
    id: "quota",
    question: "Have you exported the local data you want to keep?",
    yes: "Review the browser’s site storage list and remove only unneeded data from identified origins.",
    no: "Export or back up important offline documents before any cleanup. Storage deletion may be irreversible.",
    next: "Is the affected site able to save data now?",
    escalation:
      "Check the site’s storage requirements and system disk space. Ask its developer to handle quota errors without losing work.",
  },
  {
    id: "battery",
    question: "Does system battery usage identify a particular app?",
    yes: "Review that app’s foreground and background activity; pause unnecessary work and compare battery use.",
    no: "Compare brightness, connection quality, and idle drain using the system battery report.",
    next: "Did the change improve battery life?",
    escalation:
      "Use manufacturer diagnostics for battery health. Stop using a swollen or damaged battery and seek qualified support.",
  },
  {
    id: "disk",
    question:
      "Do system storage settings show large files you recognize and no longer need?",
    yes: "Back up anything important, then remove only those known files using normal file-management controls.",
    no: "Use the operating system’s recommended cleanup tools instead of deleting unfamiliar system folders.",
    next: "Is there now enough space for the affected task?",
    escalation:
      "Ask device support about safe storage expansion or cleanup. Browser storage estimates cannot determine system free space.",
  },
  {
    id: "startup",
    question: "Is the browser restoring many tabs at launch?",
    yes: "Save important pages, then compare launching to a blank page.",
    no: "Review startup extensions and operating-system startup apps one at a time.",
    next: "Does the browser launch more promptly now?",
    escalation:
      "Compare a clean browser profile and check system startup performance with an operating-system tool.",
  },
];
export function flowReply(id: string, step: number, yes: boolean) {
  const f = flows.find((x) => x.id === id)!;
  if (step === 0) {
    const urgent = id === "heat" && yes;
    return {
      text: (yes ? f.yes : f.no) + (urgent ? "" : "\n\n" + f.next),
      done: urgent,
    };
  }
  return {
    text: yes
      ? "That check helped. Keep the working configuration and monitor whether the issue returns."
      : f.escalation,
    done: true,
  };
}
