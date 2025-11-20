
## What it does ##
Crawling Gallery pages : List of images. Why this works better than commandline stuffs ? 
- We are using real browser -> We can handle Javascripts stuffs  (Unlike some headless or pure HTML crawler)
- Enjoy free browser VPN (by extensions: PlanetVPN,...)
- Serve as a simple template that handle: 
    + Basic browser menus: PureJS DOM manip style
        + popup (Good for per-page workflows -> States are reset each time popup is shown) / 
        + panel menu (Good for multipage workflows -> Sidebar menu window)
    + Simple lcoal storage handling 
    + Plumbing work: 
        + Background <--> Extension 
        + Background <--> Document Page 
        + Extension <--> Document Page 
        Notes: Background and Extension onMessage both will catch the same message send by Document

### TODO:
- More robust and useful local storage workflow
- Some advanced tabs management stuffs

## What it shows ##
Below are description of beastify extension example provided by MDN
* write a browser action with a popup
* how to have different browser_action images based upon the theme
* give the popup style and behavior using CSS and JS
* inject a content script programmatically using `tabs.executeScript()`
* send a message from the main extension to a content script
* use web accessible resources to enable web pages to load packaged content
* reload web pages
