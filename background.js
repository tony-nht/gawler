function handleMessage(msg, sender, res) {
  console.log("BACKGROUND::MESSAGE::RECEIVED", msg, sender, res);
  if (msg.code === "TEST") {
    console.log("CLICKED_TEST");
    document.alert("TEST IS CLIECKED");
  }
  if (msg.code === "MANUAL_DOWNLOAD") {
    const uri = msg.uri;
    browser.downloads.download({
      url: uri,
      filename: "HIHIHI/" + uri.substring(
        uri.lastIndexOf("/")
      ),
      conflictAction: "uniquify",
    }).then(() => {
      document.notify("DOWNLOADED");
    })
  }
}
browser.runtime.onMessage.addListener(handleMessage);
