console.log("CLMMM");
/* LOCAL STORAGE */
const LOCAL_STORAGE_KEY = {
  IMG_TASKS: "IMG_TASKS",
}
/* DATA PLUMBING */
const COMMAND = {
  FETCH_IMAGE_URLS: "FETCH_IMAGE_URLS",
  GET_IMAGE_URI: "GET_IMAGE_URI",
}

function sendCommandToCurrentTab(msg, onOk, onErr) {
  if (!msg?.command || !msg?.payload) {
    console.error("Malformed command, dog");
  };
  return browser.tabs.query({ active: true, currentWindow: true })
    .then((tabs) => {
      browser.tabs.sendMessage(tabs[0].id, msg).then((res) => onOk(res));
    })
    .catch(onErr);
}

function sendCommandToTabByUrl(url, msg, onOk, onErr) {
  if (!msg?.command || !msg?.payload) {
    console.error("Malformed command, dog");
  };
  return browser.tabs.query({
    active: true,
    currentWindow: true
  }).then((tabs) => {
    for (let tab of tabs) {
      if (tab.url.includes(url)) {
        console.log("SEND TO URL", url, msg);
        browser.tabs.sendMessage(tab.id, msg).then((res) => onOk(res));
        break;
      }
    }
  });
}
function createCommand({ command, payload }) {
  return { command, payload }
}

function normalizeName(str) {
  const n = str.slice();
  const a = n.replace(/[^\w]/gi, '')
  return a;
}

function handleMessage(msg, sender, res) {
  console.log("PANEL::RECEIVED::MESSAGE", msg, sender, res);
  // Handle responses coming back from the background page.
  if (msg.code === "TEST") {
    processAction({ action: ACTION.TEST, payload: msg.payload });
  }
  if (msg.code === "WAITED_FOR_IMG") {
    processAction({ action: ACTION.IMAGE_URI_COLLECTED, payload: msg });
  }
}

/* BUSINESS LOGIC */
const store = {
  current: "",
  imageDict: new Map(),
  urlsArray: [],
  testData: [],
  timers: new Map(),
  galleryName: ""

}
const IMAGE_STATE = {
  INIT: 0,
  DOWNLOADING: 1,
  SUCCESS: 2,
  FAILED: 3,
}

const createImageTask = (url) => {
  return {
    galeryPreviewHref: url,
    qualitySingleHref: url,  // Is also the tabname
    imageUri: "",
    imageOrder: null,
    state: IMAGE_STATE.INIT,
    savedFileName: null
  }
}

function handleDownloadTask(t) {
  const uri = t.imageUri;
  if (uri) {
    const prefix = normalizeName(store.galleryName ?? "");
    browser.downloads.download({
      url: uri,
      filename: `${prefix}/${t.imageOrder}`,
      conflictAction: "uniquify",
    }).then(() => {
      console.log("OKOK:", t?.imageOrder);
      updateTask(t.qualitySingleHref, { state: IMAGE_STATE.SUCCESS });
    }, (e) => {
      updateTask(t.qualitySingleHref, { state: IMAGE_STATE.FAILED });
      console.log("ERRRO:", e?.toString());
    })
  }
}
function downloadImagesSequentially(delayMs) {
  const unf = [];
  for (let [k, v] of store.imageDict.entries()) {
    if (v.state !== IMAGE_STATE.SUCCESS) {
      unf.push(v.qualitySingleHref);
    }
  }
  const urls = unf;
  if (urls.length === 0) {
    console.log("Download complete: No more URLs to process.");
    return;
  }
  console.log("HUHHU", urls);
  urls.forEach((el, i) => {
    const task = store.imageDict.get(el);
    const url = task.qualitySingleHref;
    console.log("MAXIMUS", url);
    if (url) {
      setTimeout(() => {
        const t = store.imageDict.get(url);
        if (t) {
          if (!t.imageUri) {
            const singleUrl = t.qualitySingleHref;
            console.log("CHUNGUS", url);
            createTabByUrl(singleUrl);
          }
        }
      }, delayMs * i);
    }
  })

  // validate all images have uri 
  let allGood = true;
  for (let [k, v] of store.imageDict.entries()) {
    const uri = v.imageUri;
    if (!uri) {
      allGood = false;
      break;
    }
    if (typeof uri !== "string") {
      allGood = false;
      break;
    }
    if (uri.length < 10) {
      allGood = false;
      break;
    }
  }
  console.log("IS EVERYTHING OK", allGood);
  let counter = 0;
  if (allGood) {
    for (let [k, v] of store.imageDict.entries()) {
      const task = v;
      const url = task.qualitySingleHref;
      if (url) {
        const timerId = setTimeout(() => {
          const t = store.imageDict.get(url);
          if (t.imageUri) {
            handleDownloadTask(t);
          }
        }, (delayMs > 1100 ? delayMs : 1100) * counter);
        counter = counter + 1;
        store.timers.set(url, timerId);
      }
    }
  }
}
const createTabByUrl = (url, onOk) => {
  return browser.tabs.create({ url }).then(() => {
    onOk?.();
  });
}

const ACTION = {
  LOAD_IMAGE_URL_LIST: 2,
  ADD_IMAGE_ITEM: 3,
  START_OR_REFILL: 4,
  CANCEL_ALL_SCHEDULED: 5,
  CLEAR_ALL_TASKS: 6,
  IMAGE_URI_COLLECTED: 7,
  TEST: 999
}
function revitalize(onReviveOk) {
  const k = LOCAL_STORAGE_KEY.IMG_TASKS;
  const onOk = (lsd) => {
    try {
      store.imageDict = new Map(JSON.parse(lsd[k]));
    }
    catch (e) {
    }
    onReviveOk?.();
  };
  const onErr = (err) => console.log(err);
  browser.storage.local.get(k).then(onOk, onErr);
}

function persist() {
  const mapAsArray = [...store.imageDict.entries()];
  const s = JSON.stringify(mapAsArray);
  browser.storage.local.set({ [LOCAL_STORAGE_KEY.IMG_TASKS]: s });
}

function updateTask(url, n) {
  const o = store.imageDict.get(url);
  if (o && n) {
    const t = Object.assign(o, n);
    console.log("ASSINGNENING", { url, o, n, t });
    store.imageDict.set(url, t);
  }
}


function processAction({ action, payload = {} }) {
  console.log("PROCESSING ACTION:", JSON.stringify(arguments));
  switch (action) {
    case ACTION.LOAD_LOCAL_STORAGE:
      revitalize();
      rerender();
      break;
    case ACTION.LOAD_IMAGE_URL_LIST:
      const l = payload.urls;
      store.galleryName = normalizeName(payload.gn);
      store.urlsArray = l;
      l.forEach((url, i) => {
        if (url) {
          const t = createImageTask(url);
          const imgOrdNum = i;
          t.qualitySingleHref = url;
          t.imageOrder = imgOrdNum;
          store.imageDict.set(url, t);
        }
      })
      break;
    case ACTION.IMAGE_URI_COLLECTED:
      const url = payload.url;
      const uri = payload.uri;
      if (url && uri) {
        const o = store.imageDict.get(url);
        if (o) {
          o.state = IMAGE_STATE.DOWNLOADING;
          o.imageUri = uri;
          rerender();
        }
        else {
          const trimmedUrl = url.slice(0, url.lastIndexOf("?"));
          const o = store.imageDict.get(trimmedUrl);
          if (o) {
            o.state = IMAGE_STATE.DOWNLOADING;
            o.imageUri = uri;
            rerender();
          }
        }
      }
      break;
    case ACTION.CANCEL_ALL_SCHEDULED:
      break;
    case ACTION.CLEAR_ALL_TASKS:
      store.imageDict.clear();
      store.timers.clear();
      persist();
      break;
    case ACTION.START_OR_REFILL:
      downloadImagesSequentially(400);
      break;
    case ACTION.TEST:
      const dt = payload;
      store.testData.splice(0, 0, dt)
      break;
    default:
  }

}
function rerender() {
  console.log("RENDERER:", store);
  const r = document.getElementById("chungus-result");
  const c = document.getElementById("chungus-content");
  const items = store.urlsArray.map((url, idx) => {
    const v = store.imageDict.get(url);
    if (!v) return null;
    const el = document.createElement('button');
    el.style.padding = '10px 10px';
    el.style.width = '48px';
    el.style.backgroundColor = 'black';
    if (v.state == IMAGE_STATE.INIT) {
      el.style.backgroundColor = 'black';
    }
    if (v.state == IMAGE_STATE.DOWNLOADING) {
      el.style.backgroundColor = 'yellow';
    }
    if (v.state == IMAGE_STATE.FAILED) {
      el.style.backgroundColor = 'red';
    }
    if (v.state == IMAGE_STATE.SUCCESS) {
      el.style.backgroundColor = 'green';
    }
    el.style.color = 'white';
    el.innerText = idx.toString();
    el.addEventListener("click", () => {
      const t = store.imageDict.get(url);
      const uri = t.imageUri;
      if (t.state !== IMAGE_STATE.SUCCESS) {
        if (uri) {
          handleDownloadTask(t);
        }
        else {
          sendCommandToTabByUrl(url,
            { command: "GET_IMAGE_URI_FROM_PANEL", payload: {} },
            (res) => {
              updateTask(t, { imageUri: res.uri });
              const n = store.imageDict.get(url);
              handleDownloadTask(n);
            })

        }
      }
      const urip = document.createElement("pre");
      urip.id = "urip";
      urip.innerText = uri;
      const urlp = document.createElement("pre");
      urlp.innerText = url;
      urlp.id = "urlp";
      r.replaceChildren(urip, urlp);

    });
    return el;
  }).filter(e => e);
  c.replaceChildren(...items);

  if (store.galleryName) {
    const r = document.getElementById("chungus-title");
    r.innerText = store.galleryName;
  }

}
let init = null;

function copyFunction(e) {
  const copyText = e.textContent;
  const textArea = document.createElement('textarea');
  textArea.textContent = copyText;
  document.body.append(textArea);
  textArea.select();
  textArea?.remove?.();
  document.execCommand("copy");
  const tmp = document.getElementById("TEMP");
  tmp.innerText = "Copied pre text to clipboard";

};
function listenForClicks() {
  if (!init) {
    processAction({ action: ACTION.LOAD_LOCAL_STORAGE });

    document.addEventListener("click", (e) => {
      console.log("CLICK:", e);

      /* MENU HANDLERS */
      if (e.target.id === "chungus-setup") {
        sendCommandToCurrentTab(createCommand({
          command: COMMAND.FETCH_IMAGE_URLS,
          payload: {}
        }), (res) => {
          console.log("RES:", res);
          processAction({
            action: ACTION.LOAD_IMAGE_URL_LIST,
            payload: {
              urls: res?.urls ?? [],
              gn: res?.gn ?? "HIHIHI"
            }
          });
          rerender();
        });
      }
      else if (e.target.id === "chungus-start") {
        processAction({ action: ACTION.START_OR_REFILL });
        rerender();
      }
      else if (e.target.id === "chungus-test") {
        processAction({ action: ACTION.TEST });
        rerender();
      }
      else if (e.target.id === "chungus-refresh") {
        rerender();
      }
      else if (e.target.id === "chungus-clear") {
        processAction({ action: ACTION.CLEAR_ALL_TASKS });
        rerender();
      }
      else if (e.target.id === "urip") {
      }
      else if (e.target.id === "urlp") {
      }

    });

    init = true;
  }
}

function reportExecuteScriptError(error) {
  document.querySelector("#popup-content").classList.add("hidden");
  document.querySelector("#error-content").classList.remove("hidden");
  console.error(`Failed to execute beastify content script: ${error.message}`);
}

/**
 * When the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */
browser.tabs.executeScript({ file: "/content_scripts/client.js" })
  .then(listenForClicks)
  .catch(reportExecuteScriptError);


browser.runtime.onMessage.addListener(handleMessage);
