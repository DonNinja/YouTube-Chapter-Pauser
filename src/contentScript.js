// 'use strict';
var YTChapters = require('get-youtube-chapters');

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts

// Waits for element to load
function WaitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

WaitForElm('div#description').then((elem) => {
    let DescriptionText = elem.querySelector('yt-formatted-string.content').textContent;
    let chapters = YTChapters(DescriptionText);
    console.log(`Chapter count: ${chapters.length}`);
    for (let i = 0; i < chapters.length; i++) {
        let chapter = chapters[i];
        // Remove leading symbols that shouldn't be a part of the chapter title
        let title = chapter.title.replace(/[-_\+–] /, '');
        console.log(`Chapter ${i}: ${title} starts at: ${chapter.start}`);
    }

    // Tell background to set
    /* chrome.runtime.sendMessage({
        type: 'SET',
        payload: {
            message: chapters.length,
        },
    },
        (response) => {
            console.log(response.message);
        }); */

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "GETCOUNT") {
            console.log(`${request.payload.message}`);

            // let message = chapters.length;

            sendResponse(chapters.length);
            return true;
        }
    });
});