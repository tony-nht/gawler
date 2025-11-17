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
chrome.runtime.onMessage.addListener(handleMessage);
