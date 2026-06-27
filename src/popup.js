// Tell the background worker to read the active tab, then close the popup.
document.getElementById("go").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "EASYREAD_RUN" }, () => window.close());
});
