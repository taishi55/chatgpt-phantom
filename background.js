var manifest_version = chrome.runtime.getManifest().manifest_version;

function openChatGPTWebpage() {
  chrome.tabs.create({
    url: "https://chat.openai.com/chat",
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    web_access: true,
    region: "us-en",
    time_period: "w",
    instruction: "Instructions: create an article in about the given info without plagiarism. Make sure to write in a formal tone. Make sure to cite the markdown notations # for a title, ## for paragraph's subtitles, and ![](src) for a thumbnail image. Provide a title that gets people's attention. Then provide a short description. Then provide a thumbnail image. Then provide 4 paragraphs consisting of subtitle and well-explained article. Then provide a conclusion."
  });
  openChatGPTWebpage();
});

// open chatgpt webpage when extension icon is clicked
if (manifest_version == 2) {
  chrome.browserAction.onClicked.addListener(openChatGPTWebpage);
} else {
  chrome.action.onClicked.addListener(openChatGPTWebpage);
}