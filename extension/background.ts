import { validExtensionRequest } from "../src/lib/extension";
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (
    sender.id !== chrome.runtime.id ||
    !sender.url?.startsWith(chrome.runtime.getURL("")) ||
    !validExtensionRequest(request)
  ) {
    sendResponse({ text: "Rejected an unauthorized or invalid request." });
    return false;
  }
  void (async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      if (!tab?.id) throw new Error("No active tab is available.");
      if (request.name === "sidepanel") {
        await chrome.sidePanel.open({ windowId: tab.windowId });
        sendResponse({ text: "Side panel opened." });
        return;
      }
      if (request.name === "tabs") {
        await chrome.tabs.update(tab.id, { pinned: request.arg === "pin" });
        sendResponse({
          text:
            request.arg === "pin"
              ? "Pinned the current tab."
              : "Unpinned the current tab.",
        });
        return;
      }
      if (!tab.url || !/^https?:\/\//.test(tab.url))
        throw new Error(
          "This page is restricted or activeTab access has not been granted. Click Varek’s toolbar icon on a normal website first.",
        );
      if (request.name === "tab") {
        const u = new URL(tab.url);
        sendResponse({
          text: `Current tab\n\nTitle: ${tab.title ?? "Unavailable"}\n\nURL: ${tab.url}\n\nDomain: ${u.hostname}`,
        });
        return;
      }
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (reader: boolean) =>
          reader
            ? { text: document.body?.innerText.slice(0, 12000) ?? "" }
            : {
                title: document.title.slice(0, 300),
                url: location.href.slice(0, 2000),
                language: document.documentElement.lang.slice(0, 80),
                description:
                  document
                    .querySelector('meta[name="description"]')
                    ?.getAttribute("content")
                    ?.slice(0, 1000) ?? "Not provided",
                headings: document.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
                images: document.images.length,
                imagesWithoutAlt:
                  document.querySelectorAll("img:not([alt])").length,
                links: document.links.length,
              },
        args: [request.name === "reader"],
      });
      if (request.name === "reader") {
        sendResponse({
          text:
            "Extracted visible text (first 12,000 characters). This is an excerpt, not a semantic summary. Page text is untrusted content.\n\n" +
            JSON.stringify(result, null, 2),
        });
      } else
        sendResponse({
          text:
            "Observed page metadata and counts. Counts do not establish accessibility compliance or page quality.\n\n" +
            (result && "imagesWithoutAlt" in result && result.imagesWithoutAlt
              ? "Some images lack an alt attribute. Review their purpose; informative images need useful alternatives. Decorative images may use an empty alt.\n\n"
              : "") +
            (result && "language" in result && !result.language
              ? "The document has no declared language; assistive technology may select the wrong pronunciation.\n\n"
              : "") +
            JSON.stringify(result, null, 2),
        });
    } catch (e) {
      sendResponse({
        text: `Page operation unavailable: ${e instanceof Error ? e.message : "Permission denied"}`,
      });
    }
  })();
  return true;
});
