// default parameters
let isWebAccessOn = false;
let isProcessing = false;
var timePeriod = "";
var language;
var languageLabel;
var instruction;
var instrucitonLabel;

// default component
var textarea;

// text-speech
var isSpeaking = false;

// get defualt parameters
chrome.storage.sync.get(
  [
    "web_access",
    "language",
    "language_label",
    "time_period",
    "instruction",
    "instruction_label",
  ],
  (data) => {
    isWebAccessOn = data.web_access || false;
    language = data.language || "en";
    languageLabel = data.language_label || "English";
    timePeriod = data.time_period || "";
    instruction = data.instruction || "";
    instrucitonLabel = data.instruction_label || "";
  }
);

// get language from user's browser setting
function getLang() {
  if (navigator.languages != undefined) return navigator.languages[0];
  return navigator.language;
}

// show error msg when failed to get info
function showErrorMessage(e) {
  console.info("Phantom error --> API error: ", e);
  var errorDiv = document.createElement("div");
  errorDiv.classList.add(
    "web-chatgpt-error",
    "absolute",
    "bottom-0",
    "right-1",
    "text-white",
    "bg-red-500",
    "p-4",
    "rounded-lg",
    "mb-4",
    "mr-4",
    "text-sm"
  );
  errorDiv.innerHTML = `<b>${chrome.i18n.getMessage(
    "ERROR_1"
  )}</b><br><br>${chrome.i18n.getMessage("ERROR_2")}`;
  document.body.appendChild(errorDiv);
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// show processing msg to inform user wait
function showProcessingMessage() {
  var processingDiv = document.createElement("div");
  processingDiv.classList.add("processing-message");
  processingDiv.innerHTML = `<b>${chrome.i18n.getMessage(
    "PROCESS_1"
  )}</b><br><div>${chrome.i18n.getMessage("PROCESS_2")}</div>`;
  document.body.appendChild(processingDiv);
  setTimeout(() => {
    processingDiv.remove();
  }, 7000);
}

function getYoutubeIds(text) {
  let youtubeVideoIds = [];
  const youtubeUrlPrefix = "https://www.youtube.com/watch?v=";
  let startIndex = text.indexOf(youtubeUrlPrefix);

  while (startIndex !== -1) {
    startIndex += youtubeUrlPrefix.length;
    youtubeVideoIds.push(text.substr(startIndex, 11));
    startIndex = text.indexOf(youtubeUrlPrefix, startIndex);
  }

  // remove duplicates
  return Array.from(new Set(youtubeVideoIds));
}

function getYoutubeVideos(youtubeVideoIds) {
  const videoElementsWrapper = document.createElement("div");

  const checkPreviosIframe = `iframe[src="https://www.youtube.com/embed/${youtubeVideoIds?.at(
    0
  )}"]`;
  if (
    youtubeVideoIds.length > 0 &&
    !document?.querySelector(checkPreviosIframe)
  ) {
    videoElementsWrapper.classList.add("youtube-videos", "print:hidden");
    youtubeVideoIds.forEach((videoId) => {
      videoElementsWrapper.innerHTML += `<iframe style="aspect-ratio: 16 / 9;width: 100%;border-radius: 0.5rem;" src="https://www.youtube.com/embed/${videoId}" title="Helpful videos" frameborder="0" allow="clipboard-write; encrypted-media; gyroscope;" allowfullscreen></iframe>`;
    });
  }

  return videoElementsWrapper;
}

function extractRecommendYoutubeIds(str) {
  if (str.includes("{{{") && str.includes("}}}")) {
    return str.split("{{{")[1].split("}}}")[0].split(", ");
  } else {
    return [];
  }
}

async function searchByUrl(videoId) {
  const scrollToBottomBtn = document.querySelector(
    ".cursor-pointer.absolute.right-6"
  );
  if (scrollToBottomBtn) {
    scrollToBottomBtn?.click();
  }
  const resultText = await getUrlData(videoId, instruction);
  if (resultText) {
    const previousStatusOfWebAccess = isWebAccessOn;
    isWebAccessOn = false;
    await pasteToTextarea(resultText, "");
    pressEnter();
    textarea.value = "";
    isWebAccessOn = previousStatusOfWebAccess;
  } else {
    alert(
      "Sorry, your selected video is not avaibale to get data. There are some reasons. 1. The video's transcription is turned off. 2. It is a live video."
    );
  }
}

function getVideoRecommendation(videoIds) {
  const recommendationWrapper = document.createElement("div");

  const checkPreviousImage = `img[src="https://i.ytimg.com/vi/${videoIds?.at(
    0
  )}/0.jpg"][alt="recommend"]`;

  if (videoIds.length > 0 && !document.querySelector(checkPreviousImage)) {
    const labelRecommendation = document.createElement("div");
    labelRecommendation.classList.add("pt-2");
    labelRecommendation.textContent = "see more...";
    recommendationWrapper.appendChild(labelRecommendation);
    // add recommendations
    const videoWrapper = document.createElement("div");
    for (const videoId of videoIds) {
      const videoBtn = document.createElement("button");
      videoBtn.addEventListener("click", async function () {
        await searchByUrl(videoId);
      });
      const videoImage = `<img src="https://i.ytimg.com/vi/${videoId}/0.jpg" style="width: 13rem;margin-right: 0.5rem;margin-bottom: 0.5rem;border-radius: 0.375rem;object-fit: cover;aspect-ratio: 16 / 9;display: inline-block;" alt="recommend" />`;
      videoBtn.innerHTML = videoImage;
      videoWrapper.appendChild(videoBtn);
    }
    recommendationWrapper.appendChild(videoWrapper);
    // add custom url input
    const labelCustomeSearch = document.createElement("div");
    labelCustomeSearch.classList.add("pt-2");
    labelCustomeSearch.textContent = "search by url...";
    recommendationWrapper.appendChild(labelCustomeSearch);
    const urlInputWrapper = document.createElement("div");
    urlInputWrapper.classList.add("flex", "items-strech");
    const urlInputBox = document.createElement("input");
    urlInputBox.classList.add(
      "flex-1",
      "border",
      "border-black/10",
      "bg-white",
      "dark:border-gray-900/50",
      "dark:text-white",
      "dark:bg-gray-700",
      "outline-none",
      "rounded-md",
      "px-3",
      "py-1"
    );
    urlInputBox.placeholder = "Paste a Youtube URL here.";
    const inputId = `youtube-url-input-${videoIds.at(0)}`;
    urlInputBox.id = inputId;
    const urlInputButtom = document.createElement("button");
    urlInputButtom.classList.add(
      "p-1",
      "rounded-md",
      "text-gray-500",
      "hover:bg-gray-100",
      "dark:hover:text-gray-400",
      "dark:hover:bg-gray-900"
    );
    urlInputButtom.innerHTML = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="mr-1 h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"> <line x1="22" y1="2" x2="11" y2="13"></line> <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon> </svg>`;
    urlInputButtom.addEventListener("click", async function () {
      // ignore empty values
      if (!document.querySelector(`#${inputId}`).value?.trim()) {
        return;
      }
      const youtubeUrl = document.querySelector(`#${inputId}`).value.trim();
      const desktopUrl = "youtube.com/watch?v=";
      const mobileUrl = "youtu.be/";
      if (youtubeUrl.includes(desktopUrl)) {
        const videoId = youtubeUrl.split(desktopUrl)[1].slice(0, 11);
        await searchByUrl(videoId);
      } else if (youtubeUrl.includes(mobileUrl)) {
        const videoId = youtubeUrl.split(mobileUrl)[1].slice(0, 11);
        await searchByUrl(videoId);
      } else {
        alert(
          "Invalid URL: Please input a Youtube URL including 'https://www.youtube.com/watch?v=' or 'https://youtu.be/'"
        );
      }
    });
    urlInputWrapper.appendChild(urlInputBox);
    urlInputWrapper.appendChild(urlInputButtom);
    recommendationWrapper.appendChild(urlInputWrapper);
  }

  return recommendationWrapper;
}

async function pasteToTextarea(resultText, query) {
  if (!language.includes("en")) {
    // ChatGPT is not capable enough to handle large inputs in non-English languages.
    // The max number of letter is 3000 for English, 1500 for other language to get the best result.
    resultText =
      "Info:\n" +
      resultText
        .split("Info:")[1]
        .split("Source_URL:")[0]
        .trim()
        .slice(0, 1500) +
      "\n\nSource_URL:\n" +
      resultText.split("Source_URL:")[1];
  }
  textarea.value = `${resultText.replace(
    "{Prompt}",
    query
  )} Make sure to write in ${languageLabel}.`;
}

// submit the textarea input
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

// trigger to clawl data only when toggle is enabled
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

      const resultText = await getSearchData(query, timePeriod, instruction);

      if (resultText) {
        await pasteToTextarea(resultText, query);
        pressEnter();
      } else {
        alert(
          "Sorry, failed to get data... If you face this error a lot, please report on my GitHub page. I will fix the bug as soon as possible."
        );
        textarea.value = query;
      }

      isProcessing = false;
    } catch (error) {
      isProcessing = false;
      showErrorMessage(error);
    }
  }
}

// change css for PDF export
function updatePrintVisibility() {
  let containers = document.querySelectorAll(".overflow-hidden");
  containers?.forEach((container) => {
    container?.classList?.add("print:overflow-visible");
  });

  let scrollContainers = document.querySelectorAll(".overflow-y-auto");
  scrollContainers?.forEach((container) => {
    container?.classList?.add("print:overflow-visible");
  });

  let scrollReactContainers = document.querySelectorAll(
    "div[class*='react-scroll-to-bottom']"
  );
  scrollReactContainers?.forEach((container) => {
    container?.classList?.add("print:overflow-visible");
  });

  let bottomToolBar = document.querySelector("div[class*='absolute bottom-0']");
  bottomToolBar?.classList?.add("print:hidden");

  let sideToolBar = document.querySelector(".dark.hidden.bg-gray-900");
  sideToolBar?.classList?.add("print:hidden");
}

// hide and display elements
function toggleVisibility(elements, className) {
  elements.forEach((element) => {
    element.classList.toggle("show-element", className === "show-element");
    element.classList.toggle("hide-element", className === "hide-element");
  });
}

function renderWebSwitch(toolbarDiv) {
  var toggleWebAccessDiv = document.createElement("div");
  toggleWebAccessDiv.innerHTML =
    '<label class="web-chatgpt-toggle"><input class="web-chatgpt-toggle-checkbox" type="checkbox"><div class="web-chatgpt-toggle-switch"></div><span class="web-chatgpt-toggle-label text-sm italic">Phantom</span></label>';
  toggleWebAccessDiv.classList.add("web-chatgpt-toggle-web-access");
  chrome.storage.sync.get("web_access", (data) => {
    toggleWebAccessDiv.querySelector(".web-chatgpt-toggle-checkbox").checked =
      data.web_access;
  });

  toggleWebAccessDiv.addEventListener("click", () => {
    var checkbox = toggleWebAccessDiv.querySelector(
      ".web-chatgpt-toggle-checkbox"
    );
    isWebAccessOn = checkbox.checked;
    chrome.storage.sync.set({ web_access: isWebAccessOn });
  });
  toolbarDiv.appendChild(toggleWebAccessDiv);
}

function renderPeriodDropdown(dropdownDesign, toolbarDiv) {
  var periodDropdown = document.createElement("select");
  periodDropdown.classList.add(...dropdownDesign);
  const periodList = [
    { value: "", label: chrome.i18n.getMessage("PERIOD_1") },
    { value: "EgQIAhAB", label: chrome.i18n.getMessage("PERIOD_2") },
    {
      value: "EgQIAxAB",
      label: chrome.i18n.getMessage("PERIOD_3"),
    },
    {
      value: "EgQIBBAB",
      label: chrome.i18n.getMessage("PERIOD_4"),
    },
    {
      value: "EgQIBRAB",
      label: chrome.i18n.getMessage("PERIOD_5"),
    },
  ];

  periodList.forEach(function (option) {
    var optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.innerHTML = option.label;
    optionElement.classList.add("text-sm", "dark:text-white");
    periodDropdown.appendChild(optionElement);
  });

  periodDropdown.value = timePeriod;
  periodDropdown.onchange = function () {
    chrome.storage.sync.set({ time_period: this.value });
    timePeriod = this.value;
  };

  toolbarDiv.appendChild(periodDropdown);
}

async function renderLangDropwdown(dropdownDesign, toolbarDiv) {
  var languageDropdown = document.createElement("select");
  languageDropdown.classList.add(...dropdownDesign);
  const chromeLangRes = await fetch(chrome.runtime.getURL("chrome_langs.json"));
  const chromeLang = await chromeLangRes.json();
  chromeLang.forEach(function (option) {
    var optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.innerHTML = option.label;
    optionElement.classList.add("text-sm", "dark:text-white");
    languageDropdown.appendChild(optionElement);
    if (language === option.value) {
      languageLabel = option.label;
    }
  });
  languageDropdown.value = language;
  languageDropdown.onchange = async function () {
    chrome.storage.sync.set({
      language: this.value,
      language_label:
        languageDropdown.options[languageDropdown.selectedIndex].text,
    });
    language = this.value;
    languageLabel =
      languageDropdown.options[languageDropdown.selectedIndex].text;
  };
  toolbarDiv.appendChild(languageDropdown);
}

function renderInstructionItem(
  instructionId,
  label,
  value,
  instructionList,
  instructionLabelInput,
  instructionTextarea,
  instructionDeleteBtn,
  instructionCancelBtn,
  instructionEditBtn,
  instructionBtnText,
  instructionCreateNewBtn,
  instructionWindowWrapper,
  instructionSearch
) {
  var instructionItemWrapper = document.createElement("li");
  instructionItemWrapper.id = "instruction-item-" + instructionId;
  instructionItemWrapper.classList.add("show-element");

  var instructionItem = document.createElement("div");
  instructionItem.classList.add(
    "instruction-list-item",
    "hover:bg-gray-500/10",
    "highlight"
  );
  setTimeout(() => {
    instructionItem.classList.remove("highlight");
  }, 1200);

  var instructionText = document.createElement("button");
  instructionText.classList.add("instruction-text");
  instructionText.textContent = label;

  var deleteBtn = document.createElement("button");
  deleteBtn.classList.add("instruction-delete-btn");
  deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"> <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /> </svg>`;

  var editBtn = document.createElement("button");
  editBtn.classList.add("instruction-edit-btn");
  editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"> <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /> </svg>`;

  deleteBtn.addEventListener("click", function (e) {
    e.preventDefault();
    instructionLabelInput.value = label;
    instructionTextarea.value = value;
    instructionLabelInput.disabled = true;
    instructionTextarea.disabled = true;
    instructionLabelInput.id = instructionId;
    // hide
    toggleVisibility(
      [instructionSearch, instructionList, instructionCreateNewBtn],
      "hide-element"
    );
    // show
    toggleVisibility(
      [
        instructionLabelInput,
        instructionTextarea,
        instructionDeleteBtn,
        instructionCancelBtn,
      ],
      "show-element"
    );
  });

  editBtn.addEventListener("click", function (e) {
    e.preventDefault();
    instructionLabelInput.value = label;
    instructionTextarea.value = value;
    instructionLabelInput.disabled = false;
    instructionTextarea.disabled = false;
    instructionLabelInput.id = instructionId;

    // hide
    toggleVisibility(
      [instructionSearch, instructionList, instructionCreateNewBtn],
      "hide-element"
    );
    // show
    toggleVisibility(
      [
        instructionLabelInput,
        instructionTextarea,
        instructionEditBtn,
        instructionCancelBtn,
      ],
      "show-element"
    );
  });

  instructionText.addEventListener("click", (e) => {
    e.preventDefault();
    instruction = value;
    instructionBtnText.textContent = label;
    chrome.storage.sync.set({ instruction: value });
    chrome.storage.sync.set({ instruction_label: label });
    toggleVisibility([instructionWindowWrapper], "hide-element");
  });

  instructionItem.appendChild(instructionText);
  instructionItem.appendChild(deleteBtn);
  instructionItem.appendChild(editBtn);
  instructionItemWrapper.append(instructionItem);
  instructionList.prepend(instructionItemWrapper);
}

async function renderInstructionDropdown(dropdownDesign, toolbarDiv) {
  var instructionDropdown = document.createElement("div");
  instructionDropdown.classList.add("relative");
  var instructionBtn = document.createElement("button");
  instructionBtn.classList.add(...dropdownDesign, "instruction-btn");
  var instructionBtnText = document.createElement("div");
  instructionBtnText.textContent = instrucitonLabel;
  instructionBtnText.classList.add("instruction-text");
  var instructionBtnIcon = document.createElement("div");
  instructionBtnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /> </svg>`;
  instructionBtn.appendChild(instructionBtnText);
  instructionBtn.appendChild(instructionBtnIcon);

  // dropdown window for choosing instructions
  var instructionWindowWrapper = document.createElement("div");
  instructionWindowWrapper.classList.add(
    "hide-element",
    "instruction-window-wrapper"
  );
  var instructionWindow = document.createElement("div");
  instructionWindow.classList.add(
    "instruction-window",
    "dark:bg-gray-900",
    "dark:text-white"
  );
  // list of existing instructions
  var instructionList = document.createElement("ol");
  instructionList.classList.add("instruction-list", "show-element");

  var instructionBtnWrapper = document.createElement("div");
  instructionBtnWrapper.classList.add("instruction-btn-wrapper");
  // button that navigates to a new input
  var instructionCreateNewBtn = document.createElement("button");
  instructionCreateNewBtn.classList.add(
    "add-new-btn",
    "bg-blue-600",
    "show-element"
  );
  instructionCreateNewBtn.textContent = chrome.i18n.getMessage("BTN_1");
  instructionBtnWrapper.appendChild(instructionCreateNewBtn);
  // button that cancels and navigates to the list of instructions
  var instructionCancelBtn = document.createElement("button");
  instructionCancelBtn.classList.add(
    "add-new-btn",
    "bg-gray-600",
    "hide-element"
  );
  instructionCancelBtn.textContent = chrome.i18n.getMessage("BTN_2");
  instructionBtnWrapper.appendChild(instructionCancelBtn);
  // button that add a new instruction and navigates to the list of instructions
  var instructionAddBtn = document.createElement("button");
  instructionAddBtn.classList.add("add-new-btn", "bg-blue-600", "hide-element");
  instructionAddBtn.textContent = chrome.i18n.getMessage("BTN_3");
  instructionBtnWrapper.appendChild(instructionAddBtn);
  // button that edit an existing instruction and navigates to the list of instructions
  var instructionEditBtn = document.createElement("button");
  instructionEditBtn.classList.add(
    "add-new-btn",
    "bg-blue-600",
    "hide-element"
  );
  instructionEditBtn.textContent = chrome.i18n.getMessage("BTN_4");
  instructionBtnWrapper.appendChild(instructionEditBtn);
  // button that edit an existing instruction and navigates to the list of instructions
  var instructionDeleteBtn = document.createElement("button");
  instructionDeleteBtn.classList.add(
    "add-new-btn",
    "bg-red-600",
    "hide-element"
  );
  instructionDeleteBtn.textContent = chrome.i18n.getMessage("BTN_5");
  instructionBtnWrapper.appendChild(instructionDeleteBtn);
  // input to add a new instruction's label
  var instructionLabelInput = document.createElement("input");
  instructionLabelInput.placeholder = chrome.i18n.getMessage("PLACEHOLDER_1");
  instructionLabelInput.classList.add(
    "border",
    "border-black/10",
    "bg-white",
    "dark:border-gray-900/50",
    "dark:text-white",
    "dark:bg-gray-700",
    "rounded-md",
    "hide-element",
    "px-3",
    "py-1",
    "outline-none",
    "text-sm",
    "block"
  );

  // textarea to add a new instruction
  var instructionTextarea = document.createElement("textarea");
  instructionTextarea.placeholder = chrome.i18n.getMessage("PLACEHOLDER_2");
  instructionTextarea.classList.add(
    "border",
    "border-black/10",
    "bg-white",
    "dark:border-gray-900/50",
    "dark:text-white",
    "dark:bg-gray-700",
    "rounded-md",
    "hide-element",
    "h-full",
    "text-sm",
    "outline-none",
    "resize-none"
  );

  var instructionSearch = document.createElement("input");
  instructionSearch.classList.add(
    "border",
    "border-black/10",
    "bg-white",
    "dark:border-gray-900/50",
    "dark:text-white",
    "dark:bg-gray-700",
    "rounded-md",
    "hide-element",
    "px-3",
    "py-1",
    "outline-none",
    "text-sm",
    "show-element"
  );
  instructionSearch.placeholder = chrome.i18n.getMessage("PLACEHOLDER_3");

  const watchComponents = [
    instructionList,
    instructionLabelInput,
    instructionTextarea,
    instructionDeleteBtn,
    instructionCancelBtn,
    instructionEditBtn,
    instructionBtnText,
    instructionCreateNewBtn,
    instructionWindowWrapper,
    instructionSearch,
  ];

  // auto completion
  instructionSearch.addEventListener("input", function (event) {
    // this.value
    const instructionItems = Array.from(
      document.querySelectorAll("[id^='instruction-item']")
    );

    if (!this.value) {
      // show all if no input
      toggleVisibility(instructionItems, "show-element");
    } else {
      // hide not matched one
      toggleVisibility(
        instructionItems.filter(
          (item) =>
            !item
              .querySelector(".instruction-text")
              .textContent.toLocaleLowerCase()
              .includes(this.value.toLocaleLowerCase())
        ),
        "hide-element"
      );
      // show matched one
      toggleVisibility(
        instructionItems.filter((item) =>
          item
            .querySelector(".instruction-text")
            .textContent.toLocaleLowerCase()
            .includes(this.value.toLocaleLowerCase())
        ),
        "show-element"
      );
    }
  });

  // naviates back to the list
  instructionCancelBtn.addEventListener("click", function (e) {
    e.preventDefault();
    // blank
    instructionLabelInput.disabled = false;
    instructionTextarea.disabled = false;
    // hide
    toggleVisibility(
      [
        instructionLabelInput,
        instructionCancelBtn,
        instructionTextarea,
        instructionAddBtn,
        instructionEditBtn,
        instructionDeleteBtn,
      ],
      "hide-element"
    );
    // show
    toggleVisibility(
      [instructionSearch, instructionList, instructionCreateNewBtn],
      "show-element"
    );
  });

  // navigates to a new input
  instructionCreateNewBtn.addEventListener("click", function (e) {
    e.preventDefault();
    // blank
    instructionLabelInput.value = "";
    instructionTextarea.value = "";
    instructionLabelInput.disabled = false;
    instructionTextarea.disabled = false;
    // hide
    toggleVisibility(
      [
        instructionSearch,
        instructionList,
        instructionCreateNewBtn,
        instructionLabelInput,
      ],
      "hide-element"
    );
    // show
    toggleVisibility(
      [
        instructionLabelInput,
        instructionTextarea,
        instructionAddBtn,
        instructionCancelBtn,
      ],
      "show-element"
    );
  });

  // save a new instruction and navigates back to the list
  instructionAddBtn.addEventListener("click", async function (e) {
    e.preventDefault();
    // show warning if values are not provided
    if (!instructionLabelInput.value) {
      alert(chrome.i18n.getMessage("WARNING_1"));
      return;
    } else if (!instructionTextarea.value) {
      alert(chrome.i18n.getMessage("WARNING_2"));
      return;
    }

    // save the data
    var id = crypto.randomUUID();
    addInstruction(id, instructionLabelInput.value, instructionTextarea.value);
    // display the new instruction
    renderInstructionItem(
      id,
      instructionLabelInput.value,
      instructionTextarea.value,
      ...watchComponents
    );
    // hide
    toggleVisibility(
      [
        instructionLabelInput,
        instructionTextarea,
        instructionAddBtn,
        instructionCancelBtn,
      ],
      "hide-element"
    );
    // show
    toggleVisibility(
      [instructionSearch, instructionList, instructionCreateNewBtn],
      "show-element"
    );
  });

  // edit an existing instruction and navigates back to the list
  instructionEditBtn.addEventListener("click", async function (e) {
    e.preventDefault();
    // show warning if values are not provided
    if (!instructionLabelInput.value) {
      alert(chrome.i18n.getMessage("WARNING_LABEL"));
      return;
    } else if (!instructionTextarea.value) {
      alert(chrome.i18n.getMessage("WARNING_VALUE"));
      return;
    }

    // display the new instruction
    var newId = crypto.randomUUID();
    updateInstruction(
      instructionLabelInput.id,
      newId,
      instructionLabelInput.value,
      instructionTextarea.value
    );
    renderInstructionItem(
      newId,
      instructionLabelInput.value,
      instructionTextarea.value,
      ...watchComponents
    );

    // hide
    toggleVisibility(
      [
        instructionLabelInput,
        instructionTextarea,
        instructionEditBtn,
        instructionCancelBtn,
      ],
      "hide-element"
    );
    // show
    toggleVisibility(
      [instructionSearch, instructionList, instructionCreateNewBtn],
      "show-element"
    );
  });

  // delete an exsiting instruction and naviagetes back to the list
  instructionDeleteBtn.addEventListener("click", async function (e) {
    e.preventDefault();
    // delete the data
    deleteInstruction(instructionLabelInput.id);
    // hide
    toggleVisibility(
      [
        instructionLabelInput,
        instructionTextarea,
        instructionDeleteBtn,
        instructionCancelBtn,
      ],
      "hide-element"
    );
    // show
    toggleVisibility(
      [instructionSearch, instructionList, instructionCreateNewBtn],
      "show-element"
    );
  });

  // inject all instructions
  const myInstructions = await readInstructions(instructionBtnText);
  var allInstructions = [...myInstructions];
  allInstructions.forEach((item) => {
    renderInstructionItem(item.id, item.label, item.value, ...watchComponents);
  });

  var instructionMainWrapper = document.createElement("div");
  instructionMainWrapper.classList.add(
    "h-full",
    "flex",
    "flex-col",
    "gap-3",
    "overflow-y-auto"
  );
  instructionMainWrapper.appendChild(instructionSearch);
  instructionMainWrapper.appendChild(instructionList);
  instructionMainWrapper.appendChild(instructionLabelInput);
  instructionMainWrapper.appendChild(instructionTextarea);

  instructionWindow.appendChild(instructionMainWrapper);
  instructionWindow.appendChild(instructionBtnWrapper);
  instructionWindowWrapper.appendChild(instructionWindow);
  instructionDropdown.appendChild(instructionBtn);
  instructionDropdown.appendChild(instructionWindowWrapper);

  // toggle the instruction window when instruction is clicked
  instructionBtn.addEventListener("click", () => {
    if (instructionWindowWrapper.classList.contains("hide-element")) {
      instructionWindowWrapper.classList.remove("hide-element");
      instructionWindowWrapper.classList.add("show-element");
    } else {
      instructionWindowWrapper.classList.remove("show-element");
      instructionWindowWrapper.classList.add("hide-element");
    }
  });

  // close the instruction window when other place is clicked
  document.addEventListener("click", function (event) {
    if (
      !instructionWindowWrapper.contains(event.target) &&
      !instructionBtn.contains(event.target) &&
      !instructionWindowWrapper.classList.contains("hide-element")
    ) {
      instructionWindowWrapper.classList.remove("show-element");
      instructionWindowWrapper.classList.add("hide-element");
    }
  });

  toolbarDiv.appendChild(instructionDropdown);
}

function renderFooterMsg(bottomDiv) {
  var footerDiv = document.createElement("div");

  footerDiv.innerHTML = `Refer to <a href='https://chatgpt-phantom.vercel.app/' target='_blank' class='underline'>ChatGPT Phantom</a> 👻. ${chrome.i18n.getMessage(
    "DONATE"
  )} <a href='https://www.buymeacoffee.com/phantom.writer' target='_blank' class='underline'>Donation</a>`;
  footerDiv.classList.add("text-xs", "text-gray-400", "text-center");

  var lastElement = bottomDiv.lastElementChild;
  lastElement.appendChild(footerDiv);
}

// add some functions under textarea
async function updateBottomToolBar() {
  const isChatGptPlus = document.querySelector(".stretch.mx-2.flex.flex-row");
  if (isChatGptPlus) {
    isChatGptPlus.classList.remove("flex-row");
    isChatGptPlus.classList.add("flex-col");
  }
  if (document.querySelector(".web-chatgpt-toolbar")) {
    return;
  }

  textarea = document.querySelector("textarea");
  if (!textarea) {
    return;
  }

  var textareaWrapper = textarea.parentNode;

  var btnSubmit = textareaWrapper.querySelector("button");

  textarea.addEventListener("keydown", onSubmit);

  btnSubmit.addEventListener("click", onSubmit);

  var toolbarDiv = document.createElement("div");
  toolbarDiv.classList.add("web-chatgpt-toolbar", "gap-2");

  // Web access switch
  renderWebSwitch(toolbarDiv);

  const dropdownDesign = [
    "text-sm",
    "dark:text-white",
    "ml-0",
    "dark:bg-gray-700",
    "border-0",
    "rounded-md",
  ];
  // Time period dropdown
  renderPeriodDropdown(dropdownDesign, toolbarDiv);

  // Lang dropdown
  await renderLangDropwdown(dropdownDesign, toolbarDiv);

  // Instruction dropdown
  await renderInstructionDropdown(dropdownDesign, toolbarDiv);

  textareaWrapper.parentNode.insertBefore(
    toolbarDiv,
    textareaWrapper.nextSibling
  );
  toolbarDiv.parentNode.classList.add("flex-col");

  var bottomDiv = document.querySelector("div[class*='absolute bottom-0']");
  renderFooterMsg(bottomDiv);

  if (bottomDiv instanceof Node) {
    // update side tool bar for each update (when bottomDiv's children changed)!
    new MutationObserver(async (mutationsList) => {
      let runOnce = false;
      for (const mutation of mutationsList) {
        if (mutation.target.nodeName === "TEXTAREA") {
          // ignore the change in the textarea element
          return;
        } else if (mutation.target.nodeName === "BUTTON" && !runOnce) {
          // handle other mutations
          updatePrintVisibility();
          await updateSideToolBar();
          runOnce = true;
        }
      }
    }).observe(bottomDiv, { childList: true, subtree: true });
  }
}

function getPDF() {
  window.print();
}

function addInstruction(id, label, value) {
  chrome.storage.local.get("myInstructions", async function (result) {
    var instructions = result.myInstructions || [];
    instructions.push({ id, label, value });
    chrome.storage.local.set({ myInstructions: instructions });
  });
}

function updateInstruction(previousId, newId, newLabel, newValue) {
  chrome.storage.local.get("myInstructions", async function (result) {
    var instructions = result.myInstructions || [];
    instructions = instructions.filter(function (instruction) {
      return instruction.id !== previousId;
    });
    instructions.push({ id: newId, label: newLabel, value: newValue });
    chrome.storage.local.set({ myInstructions: instructions });
    removeInstructionFromHTML(previousId);
  });
}

function deleteInstruction(deleteId) {
  chrome.storage.local.get("myInstructions", async function (result) {
    // remove from the storage
    var instructions = result.myInstructions || [];
    instructions = instructions.filter(function (instruction) {
      return instruction.id !== deleteId;
    });
    chrome.storage.local.set({ myInstructions: instructions });

    removeInstructionFromHTML(deleteId);
  });
}

function removeInstructionFromHTML(removeId) {
  // remove from HTML
  const element = document.getElementById("instruction-item-" + removeId);
  if (element) {
    element.parentNode.removeChild(element);
  }
}

async function readInstructions(instructionBtnText) {
  return new Promise((resolve) => {
    chrome.storage.local.get("myInstructions", async function (result) {
      var instructions = result.myInstructions || [];
      if (instructions.length === 0) {
        try {
          const res = await fetch(chrome.runtime.getURL(`instructions.json`));
          const defaultInstructions = await res.json();
          instructions = defaultInstructions.map((item) => {
            return {
              ...item,
              id: crypto.randomUUID(),
            };
          });
          chrome.storage.local.set({ myInstructions: instructions });
        } catch (error) {
          console.info(error);
        }
      }
      if (!instrucitonLabel || !instruction) {
        instruction = instructions[0].value;
        instrucitonLabel = instructions[0].label;
        instructionBtnText.textContent = instructions[0].label;
        chrome.storage.sync.set({ instruction: instructions[0].value });
        chrome.storage.sync.set({ instruction_label: instructions[0].label });
      }
      resolve(instructions);
    });
  });
}

function speechText(rowText) {
  if (!window.speechSynthesis) {
    // your device is not availbale
    return;
  }

  if (!isSpeaking) {
    const utterance = new SpeechSynthesisUtterance(rowText);
    window.speechSynthesis.speak(utterance);
    isSpeaking = true;
  } else {
    isSpeaking = false;
    window.speechSynthesis.cancel();
  }
}

function convertTitleAndSubtitleCSS() {
  const paragraphs = document.querySelectorAll("p");
  for (let i = 0; i < paragraphs.length; i++) {
    // Check if the text content of the paragraph contains "##"
    if (paragraphs[i].textContent.startsWith("##")) {
      // If it does, do something
      paragraphs[i].textContent = paragraphs[i].textContent.replace("##", "");
      // Create a new <h2> element
      const h2Element = document.createElement("h2");
      // Copy the contents of the <p> element to the <h2> element
      h2Element.textContent = paragraphs[i].textContent;
      // Replace the <p> element with the new <h2> element
      paragraphs[i].parentNode.replaceChild(h2Element, paragraphs[i]);
    } else if (paragraphs[i].textContent.startsWith("#")) {
      paragraphs[i].textContent = paragraphs[i].textContent.replace("#", "");
      // Create a new <h2> element
      const h1Element = document.createElement("h1");
      // Copy the contents of the <p> element to the <h1> element
      h1Element.textContent = paragraphs[i].textContent;
      // Replace the <p> element with the new <h1> element
      paragraphs[i].parentNode.replaceChild(h1Element, paragraphs[i]);
    }
  }
}

// add some functions on the side of each chat message
async function updateSideToolBar() {
  try {
    const res = await fetch(chrome.runtime.getURL("languages.json"));
    const langs = await res.json();

    // convert title to h1 and subtitle to h2
    convertTitleAndSubtitleCSS();

    // modify the design of chat response section
    const formatElements = document.querySelectorAll(
      "div[class*='flex flex-col items-start gap-4 whitespace-pre-wrap']"
    );
    formatElements?.forEach((element) => {
      if (element?.classList) {
        element.classList.remove("flex", "flex-col", "items-start", "gap-4");
        element.classList.add("space-y-4");
      }
    });

    // modify the design of a vertical tool bar
    const verticallyAllign = document.querySelectorAll(
      "div[class*='text-gray-400 flex self-end lg:self-center']"
    );
    verticallyAllign.forEach((toolBar) => {
      toolBar.classList.remove("justify-center");
      toolBar.classList.add("custom-tool-bar", "print:hidden");

      // modify defalt buttons
      const defaultBtns = toolBar.querySelectorAll(".p-1.rounded-md");
      if (defaultBtns) {
        defaultBtns.forEach((element, index) => {
          element.classList.remove("p-1");
          element.classList.add(
            "flex",
            "items-center",
            "gap-1",
            "pl-1",
            "mb-1"
          );
          if (
            index === 0 &&
            !element.innerHTML.includes("Good") &&
            defaultBtns.length > 1
          ) {
            element.innerHTML += "Good";
          } else if (
            index === 1 &&
            !element.innerHTML.includes("Bad") &&
            defaultBtns.length > 1
          ) {
            element.innerHTML += "Bad";
          }

          element.addEventListener("change", function () {
            element.classList.remove("p-1");
            element.classList.add(
              "flex",
              "items-center",
              "gap-1",
              "pl-1",
              "mb-1"
            );
          });
        });
      }
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
      chatDiv
        .querySelector("div[class*='flex flex-grow flex-col gap-3']")
        .classList.add("word-wrap");

      // get all text within a replay
      let chatText = "";
      let copyInnerHtml = "";
      const childElement = chatDiv
        .querySelector("div[class*='flex flex-grow flex-col gap-3']")
        ?.querySelector(".markdown");
      if (childElement?.querySelectorAll("*")) {
        // the element has child elements
        const childElements = childElement?.querySelectorAll("*");
        for (let i = 0; i < childElements.length; i++) {
          if (childElements[i]?.textContent) {
            chatText += childElements[i].textContent + "\n\n";
          }
          // avoid copying duplicated elements
          if (!copyInnerHtml.includes(childElements[i].outerHTML)) {
            copyInnerHtml += `<div>${childElements[i].outerHTML}</div>\n`;
          }
        }

        // embed Youtube video
        const videoIds = getYoutubeIds(chatText);
        if (videoIds.length > 0) {
          const videoElements = getYoutubeVideos(videoIds);
          childElement.appendChild(videoElements);
        }
      } else if (
        chatDiv.querySelector("div[class*='flex flex-grow flex-col gap-3']")
          ?.textContent
      ) {
        // the element has no child elements
        chatText = chatDiv.querySelector(
          "div[class*='flex flex-grow flex-col gap-3']"
        ).textContent;

        copyInnerHtml = `<div>${chatDiv.querySelector("div[class*='flex flex-grow flex-col gap-3']")
          .innerHTML
          }</div>\n`;

        // add a viewable video in iframe
        const videoIds = getYoutubeIds(chatText);
        if (videoIds.length > 0) {
          const videoElements = getYoutubeVideos(videoIds);
          chatDiv
            .querySelector("div[class*='flex flex-grow flex-col gap-3']")
            .appendChild(videoElements);
        }

        // add a video recommendation
        const recommendVideoIds = extractRecommendYoutubeIds(chatText);
        if (recommendVideoIds.length > 0) {
          const videoRecommendations =
            getVideoRecommendation(recommendVideoIds);
          chatDiv
            .querySelector("div[class*='flex flex-grow flex-col gap-3']")
            .appendChild(videoRecommendations);
        }
      }

      // clean the noise for copy button
      const textToCopy = chatText;

      // encode the text for DeepL
      const encodedChatText = encodeURIComponent(
        chatText.replace(/\//g, "\\/").replace(/\/\//g, "//")
      )
        .replace(/'/g, "%22")
        .replace(/"/g, "%22");

      // word counts
      const wordCounts = document.createElement("div");
      if (wordCounts?.classList) {
        wordCounts.classList.add("hide-element", "show-element-lg");
        wordCounts.innerHTML = `<span class="flex items-center gap-1 pl-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12H12m-8.25 5.25h16.5" /> </svg> ${textToCopy.split(/[\s\n]+/).length
          } words</span>`;
        chatDiv.querySelector(".custom-tool-bar").appendChild(wordCounts);
      }

      // character counts
      const characterCounts = document.createElement("div");
      if (characterCounts?.classList) {
        characterCounts.classList.add("hide-element", "show-element-lg");
        characterCounts.innerHTML = `<span class="flex items-center gap-1 pl-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12H12m-8.25 5.25h16.5" /> </svg> ${textToCopy.length} char</span>`;
        chatDiv.querySelector(".custom-tool-bar").appendChild(characterCounts);
      }

      const buttonClassName =
        "flex items-center w-full pl-1 rounded-md hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:dark:hover:text-gray-400";

      // copy text button
      const copyTextBtn = document.createElement("div");
      if (copyTextBtn?.classList) {
        copyTextBtn.addEventListener("click", function () {
          navigator.clipboard.writeText(textToCopy);
        });
        copyTextBtn.classList.add("hide-element", "show-element-lg");
        copyTextBtn.innerHTML = `<button class="${buttonClassName}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /> </svg><span class="px-1">Copy Text</span></buttton>`;
        chatDiv.querySelector(".custom-tool-bar").appendChild(copyTextBtn);
      }

      // copy html button
      copyInnerHtml = "<html>\n<body>\n" + copyInnerHtml + "</body>\n</html>";
      const copyHtmlBtn = document.createElement("div");
      if (copyHtmlBtn?.classList) {
        copyHtmlBtn.addEventListener("click", function () {
          navigator.clipboard.writeText(copyInnerHtml);
        });
        copyHtmlBtn.classList.add("hide-element", "show-element-lg");
        copyHtmlBtn.innerHTML = `<button class="${buttonClassName}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /> </svg><span class="px-1">Copy HTML</span></buttton>`;
        chatDiv.querySelector(".custom-tool-bar").appendChild(copyHtmlBtn);
      }

      // export pdf button
      const pdfExportBtn = document.createElement("div");
      if (pdfExportBtn?.classList) {
        pdfExportBtn.addEventListener("click", function () {
          getPDF();
        });
        pdfExportBtn.classList.add("hide-element", "show-element-lg");
        pdfExportBtn.innerHTML = `<button class="${buttonClassName}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /> </svg> <span class="px-1">Export PDF</span></buttton>`;
        chatDiv.querySelector(".custom-tool-bar").appendChild(pdfExportBtn);
      }

      // export speaker button
      const speakerBtn = document.createElement("div");
      if (speakerBtn?.classList) {
        speakerBtn.addEventListener("click", function () {
          speechText(textToCopy);
        });
        speakerBtn.classList.add("hide-element", "show-element-lg");
        speakerBtn.innerHTML = `<button class="${buttonClassName}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /> </svg> <span class="px-1">Text-Speech</span></buttton>`;
        chatDiv.querySelector(".custom-tool-bar").appendChild(speakerBtn);
      }

      const linkClassName =
        "border-b border-transparent hover:border-b flex gap-1 items-center pl-1";
      // plagiarism checker link
      const plagiarismChecker = document.createElement("div");
      if (plagiarismChecker?.classList) {
        plagiarismChecker.classList.add("hide-element", "show-element-lg");
        plagiarismChecker.innerHTML = `<a href='https://www.grammarly.com/plagiarism-checker' class='${linkClassName}' target='_blank'><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" /> </svg> Plagiarism Checker</a>`;
        chatDiv
          .querySelector(".custom-tool-bar")
          .appendChild(plagiarismChecker);
      }

      // trend checker link
      const trendChecker = document.createElement("div");
      if (trendChecker?.classList) {
        trendChecker.classList.add("hide-element", "show-element-lg");
        trendChecker.innerHTML = `<a href='https://trends.google.com/trends/trendingsearches/realtime?geo=US&category=all' class='${linkClassName}' target='_blank'><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /> </svg> Search Trend</a>`;
        chatDiv.querySelector(".custom-tool-bar").appendChild(trendChecker);
      }

      // inject the encoded text into the translation link
      langs.forEach(function (option) {
        const langDiv = document.createElement("div");
        if (langDiv?.classList) {
          langDiv.classList.add("hide-element", "show-element-lg");
          langDiv.innerHTML = `<a href='https://www.deepl.com/translator#en/${option.value}/${encodedChatText}/' class='${linkClassName}' target='_blank'><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" /> </svg> ${option.label}</a>`;
          chatDiv.querySelector(".custom-tool-bar").appendChild(langDiv);
        }
      });
    });
  } catch (error) {
    // error
    console.log("error occuring at tool bar", error);
  }
}

const rootEl = document.querySelector('div[id="__next"]');

window.onload = async () => {
  if (rootEl?.classList) {
    rootEl.classList.add("print-color-correction");
  }

  updatePrintVisibility();
  await updateBottomToolBar();
  await updateSideToolBar();

  // update when changing pages or changing dark to white or vice versa
  new MutationObserver(async () => {
    try {
      updatePrintVisibility();
      await updateBottomToolBar();
      await updateSideToolBar();
    } catch (e) {
      console.info("Phantom Error --> ", e.stack);
    }
  }).observe(rootEl, { childList: true });
};
