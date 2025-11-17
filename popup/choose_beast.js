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


function handleMessage(msg, sender, response) {
  // Handle responses coming back from the background page.
  if (msg.code === "IMG_LIST") {
    const payload = msg.payload;
    processAction({ action: ACTION.LOAD_IMAGE_URL_LIST, payload: { urls: payload ?? [] } });
  }
  if (msg.code === "found-result") {
    // List out responses from the background page as they come in.
    let li = document.createElement("li");
    li.innerText = `Tab id: ${msg.id} at url: ${msg.url} had ${msg.count} hits.`;
    results.appendChild(li);
  }
  if (msg.code === "TEST") {
    processAction({ action: ACTION.TEST, payload: msg.payload });
  }
  if (msg.code === "HIHI") {
    downloadImgToFs(msg.payload.uri, msg.payload.fname, () => {
      updateTask(url, { state: IMAGE_STATE.SUCCESS });
      onUrlOk?.();
    }, onUriErr);
  }
}

/* BUSINESS LOGIC */
const store = {
  current: "",
  imageDict: new Map(),
  testData: [],
  timers: new Set(),

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
    imageOrder: null,
    imageTaskState: IMAGE_STATE.INIT,
    savedFileName: null
  }
}

const downloadImgToFs = (uri, fname, onOk, onErr) => {
  const t = store.imageDict.get(uri);
  if (t) {
    browser.downloads.download({
      url: uri,
      filename: fname,
      conflictAction: "uniquify",
    }).then(() => {
      onOk(uri);
      t.state = IMAGE_STATE.SUCCESS;
    }, () => {
      onErr(uri);
      t.state = IMAGE_STATE.FAILED;
    });
  }
}

function downloadImagesSequentially(urls, delayMs, onUrlOk, onUriErr) {
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
      const fname = `${task.imageOrder}.jpg`;
      const timerId = setTimeout(() => {
        const t = store.imageDict.get(url);
        if (t) {
          t.state = IMAGE_STATE.DOWNLOADING;
          const singleUrl = t.qualitySingleHref;
          console.log("CHUNGUS", url);
          createTabByUrl(singleUrl, () => {
            console.log("DELUXE", url);
            switchToTabByUrl(singleUrl, () => {
              console.log("OPTIMUS", singleUrl);
              sendCommandToCurrentTab(createCommand({ command: COMMAND.GET_IMAGE_URI }), (res) => {
                if (res?.uri) {
                  console.log("BEE", res.uri);
                  downloadImgToFs(res.uri, `${fname}`, () => {
                    updateTask(url, { state: IMAGE_STATE.SUCCESS });
                    onUrlOk?.();
                  }, onUriErr);
                }
              });
            })
          });
        }
      }, delayMs * i);
      store.timers.add(timerId);
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
  LOAD_LOCAL_STORAGE: 0,
  LOAD_IMAGE_URL_LIST: 2,
  ADD_IMAGE_ITEM: 3,
  START_OR_REFILL: 4,
  CANCEL_ALL_SCHEDULED: 5,
  CLEAR_ALL_TASKS: 6,
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
  const k = LOCAL_STORAGE_KEY.IMG_TASKS;
  const onOk = (lsd) => {
    const d = new Map(JSON.parse(lsd[k]));
    const ov = d.get(url);
    if (ov) {
      d.set(url, { ...ov, ...newtsk });
      const mapAsArray = [...d.entries()];
      const s = JSON.stringify(mapAsArray);
      browser.storage.local.set({ [LOCAL_STORAGE_KEY.IMG_TASKS]: s });
    }
  };
  const onErr = (err) => console.log(err);
  browser.storage.local.get(k).then(onOk, onErr);
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
      persist();
      break;
    case ACTION.REFRESH:
      const k = LOCAL_STORAGE_KEY.IMG_TASKS;
      const updatedDictHandler = payload.cb;
      const onOk = (lsd) => {
        store.imageDict = lsd[k];
        updatedDictHandler?.();
      };
      const onErr = (err) => console.log(err);
      browser.storage.local.get(k).then(onOk, onErr);
      break;
    case ACTION.CANCEL_ALL_SCHEDULED:
      store.timers.clear();
      for (let [k, v] of store.imageDict.entries()) {
        store.imageDict.set(k, { ...v, state: IMAGE_STATE.INIT })
      }
      break;
    case ACTION.CLEAR_ALL_TASKS:
      store.imageDict.clear();
      store.timers.clear();
      persist();
      break;
    case ACTION.START_OR_REFILL:
      const unf = [];
      for (let [k, v] of store.imageDict.entries()) {
        if (v.state !== IMAGE_STATE.SUCCESS) {
          unf.push(v.qualitySingleHref);
        }
      }
      console.log({ unf, len: unf.length });
      if (unf.length > 0) {
        downloadImagesSequentially(unf, 4000, (url) => {
        });
      }
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
          processAction({ action: ACTION.LOAD_IMAGE_URL_LIST, payload: { urls: res?.urls ?? [] } });
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
      // example code
      else if (e.target.type === "reset") {
        browser.tabs.query({ active: true, currentWindow: true })
          .then()
          .catch(reportError);
      }
      else if (e.target.type === "something") {
        browser.tabs.query({ active: true, currentWindow: true })
          .then()
          .catch(reportError);
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


