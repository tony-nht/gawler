(function () {

  function normalizeName(str) {
    const n = str.slice();
    const a = n.replace(/[^\w]/gi, '')
    return a;
  }
  function waitForElm(selector) {
    return new Promise(resolve => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }
      const observer = new MutationObserver(mutations => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(document.querySelector(selector));
        }
      });

      // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }
  // INIT:
  function initExt() {
    console.log("BEASTINGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG");
    const toggleButton = document.createElement('button');
    toggleButton.id = "chungus-toggle-button";
    toggleButton.style.position = 'fixed'; // Fixes it relative to the viewport
    toggleButton.style.bottom = '20px';          // Positions it at the very top
    toggleButton.style.right = '20px';         // Positions it at the very left
    toggleButton.style.padding = '20px 20px';
    toggleButton.style.zIndex = '1000';    // Ensures it sits above other content
    toggleButton.innerText = 'TOGGLE EXT BAR';

    const menuContainer = document.createElement('div');
    menuContainer.id = 'chungus';
    // Optional: Add basic styling for visibility (in a real app, this should be in a CSS file)
    menuContainer.style.position = 'fixed'; // Fixes it relative to the viewport
    menuContainer.style.top = '0';          // Positions it at the very top
    menuContainer.style.left = '0';         // Positions it at the very left
    menuContainer.style.padding = '10px 0';
    menuContainer.style.width = '100%';     // Makes it span the full width
    menuContainer.style.backgroundColor = 'red'; // Dark blue background for visibility
    menuContainer.style.height = '100px'; // Dark blue background for visibility
    menuContainer.style.zIndex = '1000';    // Ensures it sits above other content


    const links = [
      { id: 'man-download-btn', text: 'MAN_DOWNLOAD' },
      { id: 'test-btn', text: 'TEST' }
    ];

    links.forEach(linkData => {
      const e = document.createElement('button');
      e.id = linkData.id;
      e.innerText = linkData.text
      menuContainer.appendChild(e);
    });


    document.body.prepend(menuContainer);
    document.body.append(toggleButton);
    document.body.style.paddingTop = '200px';

    window.addEventListener("click", (e) => {
      console.log("HIHIHI:", e);
      if (e.target.id === "chungus-toggle-button") {
        const ele = document.querySelector("#chungus");
        const v = ele.style.visibility;
        ele.style.visibility = v == "visible" ? "hidden" : "visible";
      }
      else if (e.target.id === "test-btn") {
        console.log("CLICKED_TEST");
        browser.runtime.sendMessage({
          code: "TEST",
          uri,
        });
      }
      else if (e.target.id === 'man-download-btn') {
        const uri = document.getElementById("img")?.src;
        browser.runtime.sendMessage({
          code: "MANUAL_DOWNLOAD",
          uri,
        });
      }
    });

    // Communication with the background script
    browser.runtime.onMessage.addListener(async (msg) => {
      console.log("CONTENT_SCRIPT::RECEIVE_MSG::", msg);
      if (msg.command === "FETCH_IMAGE_URLS") {
        const gn = normalizeName(document.querySelector("#gn").innerHTML);
        const urls = Array.from(document.querySelectorAll("#gdt a")).map(i => {
          return i.href
        });
        return Promise.resolve({
          urls,
          gn
        });
      }
      // Clickon Injected Page
      else if (msg.command === "GET_IMAGE_URI") {
        const ok = await waitForElm('#img');
        const img = document.getElementById("img");
        const uri = img?.src;
        console.log("GETTING IMAGE: ", uri);
        if (uri) {
          return Promise.resolve({
            code: "WAITED_FOR_IMG",
            uri,
            url: document.location.href
          });
        }
      }
      else if (msg.command === "GET_IMAGE_URI_FROM_PANEL") {
        const ok = await waitForElm('#img');
        const img = document.getElementById("img");
        const uri = img?.src;
        if (uri) {
          return Promise.resolve({
            code: "WAITED_FOR_IMG",
            uri,
            url: document.location.href
          });
        }
      }

    });

  }

  if (window.hasRun) {
    return;
  }
  try {
    initExt();
    waitForElm('#img').then(() => {
      const img = document.getElementById("img");
      if (!img.complete || img.loading) {
        console.log("WAIT SECONDS FOR COMPLETE IMAGE");
        setTimeout(() => {
          const uri = img?.src;
          browser.runtime.sendMessage({
            code: "WAITED_FOR_IMG",
            uri,
            url: document.location.href
          });
        }, 7000);
      }
    })
    window.hasRun = true;
  }
  catch (e) {
  }

})();




// function downloadImage(imageUrl, filename) {
//   // 1. Create a temporary anchor element
//   const link = document.createElement('a');
//
//   // 2. Set the href to the image URL
//   link.href = imageUrl;
//
//   // 3. Set the download attribute with the desired filename
//   link.download = filename;
//
//   // 4. Append the link to the body (necessary for some browsers)
//   document.body.appendChild(link);
//
//   // 5. Programmatically click the link to start the download
//   link.click();
//
//   // 6. Clean up: remove the temporary link element
//   document.body.removeChild(link);
// }

