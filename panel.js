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
  if (msg.code === "found-result") {
    // List out responses from the background page as they come in.
    let li = document.createElement("li");
    li.innerText = `Tab id: ${msg.id} at url: ${msg.url} had ${msg.count} hits.`;
    results.appendChild(li);
  }
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

function downloadImagesSequentially(delayMs, onUrlOk, onUriErr) {
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
      const timerId = setTimeout(() => {
        const t = store.imageDict.get(url);
        if (t) {
          if (!t.imageUri) {
            const singleUrl = t.qualitySingleHref;
            console.log("CHUNGUS", url);
            createTabByUrl(singleUrl);
          }
          else {
            const uri = t.imageUri;
            const prefix = normalizeName(store.galleryName ?? "");
            const slh = uri.findLastIndex("/");
            const base = uri.slice(slh + 1);
            browser.downloads.download({
              url: uri,
              filename: `${prefix}/${base}`,
              conflictAction: "uniquify",
            })
          }
        }
      }, delayMs * i);
      store.timers.set(url, timerId);
    }
  })

}
const createTabByUrl = (url, onOk, onErr) => {
  return browser.tabs.create({ url }).then(() => {
    browser.tabs.executeScript({ file: "/content_scripts/beastify.js" })
    onOk?.();
  });
}

const switchToTabByUrl = (url, onOk, onErr) => {
  return browser.tabs.query({
    currentWindow: true
  }).then((tabs) => {
    browser.tabs.executeScript({ file: "/content_scripts/beastify.js" })
    for (let tab of tabs) {
      if (tab.id === url) {
        browser.tabs.update(url, {
          active: true
        }).then(() => {
          browser.tabs.executeScript({ file: "/content_scripts/beastify.js" })
          onOk?.()
        });
      }
    }
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
function revitalize(onReviveOk, onReviveErr) {
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

function updateTask(url, newtsk) {
  const o = store.imageDict.get(url);
  if (o) {
    store.imageDict.set(url, { ...o, ...newtsk });
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
      for (let url of l) {
        if (url) {
          const t = createImageTask(url);
          const islash = url.lastIndexOf("/");
          const imgOrdPart = url.substring(islash);
          const idash = imgOrdPart.lastIndexOf("-");
          const imgOrdNum = imgOrdPart.substring(idash + 1);
          if (imgOrdNum) {
            t.qualitySingleHref = url;
            t.imageOrder = imgOrdNum;
            store.imageDict.set(url, t);
          }
        }
      }
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
      downloadImagesSequentially(90000);
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
  const c = document.getElementById("chungus-content");
  const items = store.imageDict.keys().map(k => {
    const v = store.imageDict.get(k);
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
    el.innerText = v?.imageOrder.toString();
    return el;
  });
  c.replaceChildren(...items);

  if (store.galleryName) {
    const r = document.getElementById("chungus-title");
    r.innerText = store.galleryName;
  }

  const r = document.getElementById("chungus-result");
  const p = document.createElement("pre");
  p.innerText = store.testData.toString();
  r.replaceChildren(p);
}
let init = null;
function listenForClicks() {
  if (!init) {
    processAction({ action: ACTION.LOAD_LOCAL_STORAGE });

    browser.tabs.executeScript({ file: "/content_scripts/beastify.js" })
      .then(() => {
        sendCommandToCurrentTab(createCommand({ command: COMMAND.GET_IMAGE_URI }), (res) => {
          console.log("A:", res);
          const uri = res.uri;
          browser.downloads.download({
            url: uri,
            filename: "HIHIHI/" + uri.substring(
              uri.lastIndexOf("_")
            ),
            conflictAction: "uniquify",
          })
        });
      })
      .catch(reportExecuteScriptError);


    document.addEventListener("click", (e) => {
      console.log("CLICK:", e);

      function reportError(error) {
        console.error(`Could not beastify: ${error}`);
      }

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
browser.tabs.executeScript({ file: "/content_scripts/beastify.js" })
  .then(listenForClicks)
  .catch(reportExecuteScriptError);


browser.runtime.onMessage.addListener(handleMessage);
