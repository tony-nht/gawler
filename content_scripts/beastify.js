(function () {
  // PLUMBING
  const MESSAGE_CODE = {
    IMG_LIST: "IMG_LIST",
    TEST: "TEST"
  }
  const createMessage = ({ code, payload }) => {
    return {
      code,
      payload
    }
  }

  function sendToExt(mObj) {
    if (!mObj?.payload || !mObj.code) {
      console.log("Malformed MESSAGE bro");
      return;
    };
    browser.runtime.sendMessage(mObj);
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

    const menuList = document.createElement('ul');

    const links = [
      { text: 'Chungus', href: '/' },
      { text: 'Deluxe', href: '/chungus' },
      { text: 'Maximus', href: '/maximus' },
      { text: 'TEST', href: '/' }
    ];

    links.forEach(linkData => {


      // Create the <li> element
      const listItem = document.createElement('li');

      if (linkData.text === "TEST") {
        const b = document.createElement('button');
        b.id = "TEST_LINK";
        b.innerText = "TEST";
        menuList.appendChild(b);
        return;
      }
      // Create the <a> element
      const anchor = document.createElement('a');
      anchor.textContent = linkData.text;
      anchor.href = linkData.href;
      // Append the anchor to the list item
      listItem.appendChild(anchor);
      menuList.appendChild(listItem);
    });

    menuContainer.appendChild(menuList);

    document.body.prepend(menuContainer);
    document.body.append(toggleButton);
    document.body.style.paddingTop = '200px';


    // Add CSS to the links for better visibility
    menuList.querySelectorAll('a').forEach(link => {
      link.style.color = 'white';
      link.style.textDecoration = 'none';
      link.style.padding = '0 15px';
    });

    window.addEventListener("click", (e) => {
      console.log("HIHIHI:", e);
      if (e.target.id === "chungus-toggle-button") {
        const ele = document.querySelector("#chungus");
        const v = ele.style.visibility;
        ele.style.visibility = v == "visible" ? "hidden" : "visible";
      }
      else if (e.target.id === "TEST_LINK") {
        const link = document.location.href;
        console.log("DOWNLOAD MANUAL", link);
        const img = document.getElementById("img");
        const uri = img?.src;
        if (uri) {
          const idash = link.lastIndexOf("-");
          const imgOrdNum = link.substring(idash + 1);
          sendToExt(createMessage({
            code: "HIHI", payload: {
              uri,
              fname: `${imgOrdNum}.jpg`
            }
          }));
        }
      }
    });
  }

  if (window.hasRun) {
    return;
  }
  try {
    initExt();
  }
  catch (e) {

  }
  window.hasRun = true;
  function downloadImage(imageUrl, filename) {
    // 1. Create a temporary anchor element
    const link = document.createElement('a');

    // 2. Set the href to the image URL
    link.href = imageUrl;

    // 3. Set the download attribute with the desired filename
    link.download = filename;

    // 4. Append the link to the body (necessary for some browsers)
    document.body.appendChild(link);

    // 5. Programmatically click the link to start the download
    link.click();

    // 6. Clean up: remove the temporary link element
    document.body.removeChild(link);
  }
  (function () {
    console.log("DOWNLOADDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD");
    waitForElm('#img').then(() => {
      console.log("=========================================");
      const img = document.getElementById("img");
      const uri = img?.src;
      console.log("======GETTING IMAGE: ", uri);
      if (uri) {
        const idash = imgOrdPart.lastIndexOf("-");
        const imgOrdNum = imgOrdPart.substring(idash + 1);
        downloadImage(uri, `${imgOrdNum}.jpg`);
      }
    });
  })()

  /**
   * Listen for messages from the background script.
   */
  browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.command === "FETCH_IMAGE_URLS") {
      const urls = Array.from(document.querySelectorAll("#gdt a")).map(i => {
        return i.href
      });
      return Promise.resolve({
        urls
      });
    }
    else if (msg.command === "GET_IMAGE_URI") {
      const ok = await waitForElm('#img');
      const img = document.getElementById("img");
      const uri = img?.src;
      console.log("GETTING IMAGE: ", uri);
      if (uri) {
        return Promise.resolve({
          uri
        });
      }
    }
  });
})();
