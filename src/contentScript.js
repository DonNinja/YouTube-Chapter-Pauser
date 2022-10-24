import YTChapters from 'get-youtube-chapters';

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts

var oldDescription = "";

// Waits for element to load
function waitForElm(element, selector) {
    return new Promise(resolve => {
        if (element.querySelector(selector) && element.querySelector(selector).textContent !== oldDescription) {
            return resolve(element.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (element.querySelector(selector) && element.querySelector(selector).textContent !== oldDescription) {
                resolve(element.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

let chapters;

function readDescription() {
    // Wait for the description to be loaded
    waitForElm(document, 'div#description').then((elem) => {
        // Wait for the description's string to be loaded
        waitForElm(elem, "yt-formatted-string.content").then((elem) => {
            // let DescriptionText = elem.querySelector('yt-formatted-string.content').textContent;
            oldDescription = elem.textContent;
            chapters = YTChapters(elem.textContent);
            // console.log(`Chapter count: ${chapters.length}`);
            /* for (let i = 0; i < chapters.length; i++) {
                let chapter = chapters[i];
                // Remove leading symbols that shouldn't be a part of the chapter title
                let title = chapter.title.replace(/[-_\+–] /, '');
                console.log(`Chapter ${i}: ${title} starts at: ${chapter.start}`);
            } */
        });
    });
}

function setupChapterList() {
    // TODO: Make this Create a list of all the chapters that the user can click and set a stopping point.
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GETCOUNT") {
        console.log(`${request.payload.message}`);

        // let message = chapters.length;

        sendResponse(chapters.length);
        return true;
    }
});

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.type === "READDESCRIPTION") {
//         console.log("Should be reading description now.");

//         sendResponse("Read description");
//         return true;
//     }
// });
document.addEventListener("yt-navigate-finish", (event) => {
    // console.log("[chapter-pauser] YT-NAVIGATE-FINISH");
    readDescription();
});