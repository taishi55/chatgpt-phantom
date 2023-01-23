let isWebAccessOn = true;
let isProcessing = false;
var timePeriod = "w";
var region = "us-en";
var instruction =
  "Instructions: create an article in about the given info without plagiarism. Make sure to write in a formal tone. Make sure to cite the markdown notations # for a title, ## for paragraph's subtitles, and ![](src) for a thumbnail image. Provide a title that gets people's attention. Then provide a short description. Then provide one thumbnail image from the given images. Then provide 4 paragraphs consisting of subtitle and well-explained article. Then provide a conclusion.";
var urls = [];
var textarea;

chrome.storage.sync.get(["web_access", "region", "timePeriod"], (data) => {
  isWebAccessOn = data.web_access;
  region = data.region || "us-en";
  timePeriod = data.time_period || "w";
  instruction = data.instruction || instruction;
});

function showErrorMessage(e) {
  console.info("Phantom error --> API error: ", e);
  var errorDiv = document.createElement("div");
  errorDiv.classList.add(
    "web-chatgpt-error",
    "absolute",
    "bottom-0",
    "right-1",
    "dark:text-white",
    "bg-red-500",
    "p-4",
    "rounded-lg",
    "mb-4",
    "mr-4",
    "text-sm"
  );
  errorDiv.innerHTML = "<b>An error occurred</b><br>" + "<br>Please try again!";
  document.body.appendChild(errorDiv);
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

function showProcessingMessage() {
  var processingDiv = document.createElement("div");
  processingDiv.classList.add("processing-message");
  processingDiv.innerHTML =
    "<b>Searching the information.</b><br><div>Please wait...</div>";
  document.body.appendChild(processingDiv);
  setTimeout(() => {
    processingDiv.remove();
  }, 7000);
}

function pasteWebResultsToTextArea(resultText, instructionQuery) {
  if (instruction === "custom") {
    textarea.value = `${resultText}\n\nInstructions: ${instructionQuery}`;
  } else {
    textarea.value = `${resultText}\n\n${instructionQuery}`;
  }
}

function pressEnter() {
  textarea.focus();
  const enterEvent = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: "Enter",
    code: "Enter",
  });
  textarea.dispatchEvent(enterEvent);
}

async function onSubmit(event) {
  // making multi-line, not submission
  if (event.shiftKey && event.key === "Enter") {
    return;
  }

  // get real-time info and excecute
  if (
    (event.type === "click" || event.key === "Enter") &&
    isWebAccessOn &&
    !isProcessing
  ) {
    isProcessing = true;

    try {
      let query = textarea.value;
      textarea.value = "";

      query = query.trim();

      if (query === "") {
        isProcessing = false;
        return;
      }
      showProcessingMessage();

      let queryTopic = query;
      let queryInstructions = instruction;

      // custom instruction
      if (instruction === "custom" && query.includes("--")) {
        queryTopic = query.split("--")[0];
        queryInstructions = query.split("--")[1];
      }

      const results = await getSearchData(queryTopic, timePeriod, region);

      if (results) {
        pasteWebResultsToTextArea(results, queryInstructions);
        pressEnter();
      } else {
        textarea.value = query;
      }

      isProcessing = false;
    } catch (error) {
      isProcessing = false;
      showErrorMessage(error);
    }
  }
}

function updateTitleAndDescription() {
  const title = document.evaluate(
    "//h1[text()='ChatGPT']",
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
  if (!title) {
    return;
  }

  title.textContent = "ChatGPT Phantom";
  title.classList.remove("sm:mb-16");
  title.classList.add("sm:mb-10", "italic");

  const subtitle = document.createElement("div");
  subtitle.classList.add(
    "w-full",
    "mb-3",
    "text-center",
    "font-thin",
    "text-lg"
  );
  subtitle.textContent = "Ghost Writer";

  const message = document.createElement("div");
  message.classList.add(
    "w-full",
    "bg-gray-50",
    "dark:bg-white/5",
    "p-6",
    "rounded-md",
    "mb-5",
    "border"
  );
  message.textContent =
    "ChatGPT Phantom can create articles and video scripts that contain very accurate information based on real-time data.";
  title.parentNode.insertBefore(message, title.nextSibling);
  title.parentNode.insertBefore(subtitle, title.nextSibling);

  const limitation = document.evaluate(
    "//li[text()='Limited knowledge of world and events after 2021']",
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
  if (limitation) {
    limitation.style.cssText += "text-decoration-line: line-through;";
  }
}

function updateUI() {
  if (document.querySelector(".web-chatgpt-toolbar")) {
    return;
  }

  textarea = document.querySelector("textarea");
  if (!textarea) {
    return;
  }
  var textareaWrapper = textarea.parentNode;

  var btnSubmit = textareaWrapper.querySelector("button");

  new MutationObserver(async () => {
    try {
      await updateToolUI();
    } catch (e) {
      console.info("Phantom error --> Could not update UI:\n", e.stack);
    }
  }).observe(btnSubmit, { childList: true });

  textarea.addEventListener("keydown", onSubmit);

  btnSubmit.addEventListener("click", onSubmit);

  var toolbarDiv = document.createElement("div");
  toolbarDiv.classList.add(
    "web-chatgpt-toolbar",
    "flex",
    "items-baseline",
    "gap-3",
    "mt-0"
  );
  toolbarDiv.style.padding = "0em 0.5em";

  // Web access switch
  var toggleWebAccessDiv = document.createElement("div");
  toggleWebAccessDiv.innerHTML =
    '<label class="web-chatgpt-toggle"><input class="web-chatgpt-toggle-checkbox" type="checkbox"><div class="web-chatgpt-toggle-switch"></div><span class="web-chatgpt-toggle-label text-sm italic">Phantom Mode</span></label>';
  toggleWebAccessDiv.classList.add("web-chatgpt-toggle-web-access");
  chrome.storage.sync.get("web_access", (data) => {
    toggleWebAccessDiv.querySelector(".web-chatgpt-toggle-checkbox").checked =
      data.web_access;
  });
  var checkbox = toggleWebAccessDiv.querySelector(
    ".web-chatgpt-toggle-checkbox"
  );
  checkbox.addEventListener("click", () => {
    isWebAccessOn = checkbox.checked;
    chrome.storage.sync.set({ web_access: checkbox.checked });
  });

  // Time period dropdown
  var timePeriodLabel = document.createElement("label");
  timePeriodLabel.innerHTML = "Results from:";
  timePeriodLabel.classList.add("text-sm", "dark:text-white");

  var timePeriodDropdown = document.createElement("select");
  timePeriodDropdown.classList.add(
    "text-sm",
    "dark:text-white",
    "ml-0",
    "dark:bg-gray-700",
    "border-0",
    "dropdown-width",
    "dropdown-width-lg"
  );
  fetch(chrome.runtime.getURL("periods.json"))
    .then(function (response) {
      return response.json();
    })
    .then(function (periods) {
      periods.forEach(function (option) {
        var optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.innerHTML = option.label;
        optionElement.classList.add("text-sm", "dark:text-white");
        timePeriodDropdown.appendChild(optionElement);
      });

      timePeriodDropdown.value = timePeriod;
    });

  timePeriodDropdown.onchange = function () {
    chrome.storage.sync.set({ time_period: this.value });
    timePeriod = this.value;
  };

  // Region dropdown
  var regionDropdown = document.createElement("select");
  regionDropdown.classList.add(
    "text-sm",
    "dark:text-white",
    "ml-0",
    "dark:bg-gray-700",
    "border-0",
    "dropdown-width",
    "dropdown-width-lg"
  );
  fetch(chrome.runtime.getURL("regions.json"))
    .then(function (response) {
      return response.json();
    })
    .then(function (regions) {
      regions.forEach(function (region) {
        var optionElement = document.createElement("option");
        optionElement.value = region.value;
        optionElement.innerHTML = region.label;
        optionElement.classList.add("text-sm", "dark:text-white");
        regionDropdown.appendChild(optionElement);
      });

      regionDropdown.value = region;
    });
  regionDropdown.onchange = function () {
    chrome.storage.sync.set({ region: this.value });
    region = this.value;
  };

  // Instruction dropdown
  var instructionDropdown = document.createElement("select");
  instructionDropdown.classList.add(
    "text-sm",
    "dark:text-white",
    "ml-0",
    "dark:bg-gray-700",
    "border-0",
    "dropdown-width",
    "dropdown-width-lg"
  );
  fetch(chrome.runtime.getURL("instructions.json"))
    .then(function (response) {
      return response.json();
    })
    .then(function (instructions) {
      instructions.forEach(function (instruction) {
        var optionElement = document.createElement("option");
        optionElement.value = instruction.value;
        optionElement.innerHTML = instruction.label;
        optionElement.classList.add("text-sm", "dark:text-white");
        instructionDropdown.appendChild(optionElement);
      });

      instructionDropdown.value = instruction;
    });
  instructionDropdown.onchange = function () {
    chrome.storage.sync.set({ instruction: this.value });
    instruction = this.value;
  };

  // mount each switch and selector
  toolbarDiv.appendChild(toggleWebAccessDiv);
  toolbarDiv.appendChild(timePeriodDropdown);
  toolbarDiv.appendChild(regionDropdown);
  toolbarDiv.appendChild(instructionDropdown);

  textareaWrapper.parentNode.insertBefore(
    toolbarDiv,
    textareaWrapper.nextSibling
  );

  toolbarDiv.parentNode.classList.remove("flex");
  toolbarDiv.parentNode.classList.add("flex-col");

  var bottomDiv = document.querySelector("div[class*='absolute bottom-0']");

  var footerDiv = document.createElement("div");

  footerDiv.innerHTML =
    "For magic commands, refer to <a href='https://github.com/taishi55/chatgpt-phantom' target='_blank' class='underline'>ChatGPT Phantom</a> 👻. Please be <a href='https://www.buymeacoffee.com/phantom.writer' target='_blank' class='underline'>my supporter</a> to keep this extension for free 🥺";

  var lastElement = bottomDiv.lastElementChild;
  lastElement.appendChild(footerDiv);
}

async function updateToolUI() {
  try {
    const res = await fetch(chrome.runtime.getURL("languages.json"));
    const langs = await res.json();

    // modify the design of chat response section
    const formatElements = document.querySelectorAll(
      "div[class*='flex flex-col items-start gap-4 whitespace-pre-wrap']"
    );
    formatElements.forEach((element) => {
      element.classList.remove("flex", "flex-col", "items-start", "gap-4");
      element.classList.add("space-y-4");
    });

    // modify the design of a vertical tool bar
    const verticallyAllign = document.querySelectorAll(
      "div[class*='text-gray-400 flex self-end lg:self-center']"
    );
    verticallyAllign.forEach((element) => {
      element.classList.remove("justify-center");
      element.classList.add("custom-tool-bar");
    });

    // remove the previously created elements
    const pastElements = document.querySelectorAll(
      ".hide-element.show-element-lg"
    );
    for (var i = 0; i < pastElements.length; i++) {
      pastElements[i].parentNode.removeChild(pastElements[i]);
    }

    // get all chat conversations
    var chatDivElements = document.querySelectorAll(
      "div[class*='relative flex w-[calc(100%-50px)]']"
    );

    chatDivElements.forEach((chatDiv) => {
      // prevent one-line url to be overflowed
      chatDiv.firstElementChild.classList.add("word-wrap");

      // get all text within a replay
      let chatText = "";
      const childElement =
        chatDiv.firstElementChild?.querySelector(".markdown");
      if (childElement?.querySelectorAll("*")) {
        // the element has child elements
        const childElements = childElement?.querySelectorAll("*");
        for (let i = 0; i < childElements.length; i++) {
          if (childElements[i]?.textContent) {
            chatText += childElements[i].textContent + "\n\n";
          }
        }
      } else if (childElement?.textContent) {
        // the element has no child elements
        chatText = childElement.textContent;
      }

      // encode the text
      const encodedChatText = encodeURIComponent(chatText)
        .replace(/'/g, "%22")
        .replace(/"/g, "%22");

      // clean the noise
      chatText = JSON.stringify(chatText.replace(/'/g, "").replace(/"/g, ""));

      // copy button
      const copyIcon = document.createElement("div");
      copyIcon.classList.add("hide-element", "show-element-lg");
      copyIcon.innerHTML = `<button onclick='navigator.clipboard.writeText(${chatText})' class="flex items-center w-full py-1 rounded-md hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:dark:hover:text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"> <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /> </svg><span class="px-1">Copy</span></buttton>`;
      chatDiv.lastElementChild.appendChild(copyIcon);

      // plagiarism checker link
      const plagiarismChecker = document.createElement("div");
      plagiarismChecker.classList.add("hide-element", "show-element-lg");
      plagiarismChecker.innerHTML = `<a href='https://www.grammarly.com/plagiarism-checker' class='web-chatgpt-underline-on-hover' target='_blank'>plagiarism checker</a>`;
      chatDiv.lastElementChild.appendChild(plagiarismChecker);

      // inject the encoded text into the translation link
      langs.forEach(function (option) {
        const langDiv = document.createElement("div");
        langDiv.classList.add("hide-element", "show-element-lg");
        langDiv.innerHTML = `<a href='https://www.deepl.com/translator#en/${option.value}/${encodedChatText}/' class='web-chatgpt-underline-on-hover' target='_blank'>- ${option.label}</a>`;
        chatDiv.lastElementChild.appendChild(langDiv);
      });
    });
  } catch (error) {
    // error
    console.log("error occuring at tool bar", error);
  }
}

const rootEl = document.querySelector('div[id="__next"]');

window.onload = async () => {
  updateTitleAndDescription();
  updateUI();
  await updateToolUI();

  new MutationObserver(async (mutations) => {
    try {
      updateTitleAndDescription();
      updateUI();
      await updateToolUI();
    } catch (e) {
      console.info("Phantom error --> Could not update UI:\n", e.stack);
    }
  }).observe(rootEl, { childList: true });
};
