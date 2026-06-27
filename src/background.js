// EasyRead — background service worker (Manifest V3)
//
// The extension injects its content script on demand, only into the tab the
// user is actively working in (via the `activeTab` permission). This is more
// private and lighter-weight than running a content script on every page:
// nothing touches a page until the user explicitly asks EasyRead to read it.

const CONTEXT_MENU_ID = "easyread-read";

// Register the right-click menu once on install/update.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Read aloud with EasyRead",
    contexts: ["selection", "page"]
  });
});

// Inject the reader into a tab and start it.
// content.js is written to be re-injection-safe: if it is already present it
// simply re-runs `start()` instead of re-registering anything.
async function runInTab(tabId) {
  if (tabId == null) return;
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  } catch (err) {
    // Most common cause: a restricted page (chrome://, the Web Store, PDF
    // viewer, etc.) where extensions are not allowed to run.
    console.warn("EasyRead: cannot run on this page.", err);
  }
}

function runInActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) runInTab(tabs[0].id);
  });
}

// Trigger sources -----------------------------------------------------------

// Right-click menu.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID && tab) runInTab(tab.id);
});

// Keyboard shortcut (Alt+R by default).
chrome.commands.onCommand.addListener((command) => {
  if (command === "read-aloud") runInActiveTab();
});

// Toolbar popup button.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "EASYREAD_RUN") {
    runInActiveTab();
    sendResponse({ ok: true });
  }
  return true;
});
