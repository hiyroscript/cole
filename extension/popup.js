document.getElementById("open").addEventListener("click", async () => {
  try {
    const w = await chrome.windows.getCurrent();
    await chrome.sidePanel.open({ windowId: w.id });
    window.close();
  } catch {
    document.getElementById("status").textContent =
      "Side panel unavailable. Use the full conversation instead.";
  }
});
document
  .getElementById("tab")
  .addEventListener("click", () =>
    chrome.tabs.create({ url: chrome.runtime.getURL("index.html") }),
  );
