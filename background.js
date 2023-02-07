var manifest_version = chrome.runtime.getManifest().manifest_version;

function openChatGPTWebpage() {
  chrome.tabs.create({
    url: "https://chat.openai.com/chat",
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  chrome.storage.sync.set({
    web_access: true,
    language: chrome.i18n.getMessage("@@ui_locale") || 'en',
    source_num: 3,
    time_period: "",
    instruction: "",
    instruction_label: "",
  });
  openChatGPTWebpage();
});

// open chatgpt webpage when extension icon is clicked
if (manifest_version == 2) {
  chrome.browserAction.onClicked.addListener(openChatGPTWebpage);
} else {
  chrome.action.onClicked.addListener(openChatGPTWebpage);
}
