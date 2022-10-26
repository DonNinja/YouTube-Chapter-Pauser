'esversion: 11';
import YTChapters from 'get-youtube-chapters';

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts

let styles = `
button#chapter-pause-button {
    color: rgba(255, 255, 255, 1);
    background-color: rgba(255, 255, 255, 1);
    border-color: rgba(255, 255, 255, 1);
    font-size: 3em;
    padding: 0;
    cursor: pointer;
    height: 25px;
    width: 25px;
    border-style: none;
    margin: 0;
    position: relative;
    top: 50%;
    left: 50%;
    -ms-transform: translate(-50%, -50%);
    transform: translate(-50%, -60%);
}
`;

var styleSheet = document.createElement("style");
// styleSheet = "text/css"
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

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

const ButtonQuery = 'button#chapter-pause-button';
let Chapters = [];
let ChapterMap = {};
let StopTime = -1;
let IsStopping = false;

function readDescription(_callback) {
    Chapters = [];
    ChapterMap = {};
    StopTime = -1;
    IsStopping = false;

    // Wait for the description to be loaded
    waitForElm(document, 'div#description').then((elem) => {
        // Wait for the description's string to be loaded
        waitForElm(elem, "yt-formatted-string.content").then((elem) => {
            // let DescriptionText = elem.querySelector('yt-formatted-string.content').textContent;
            oldDescription = elem.textContent;
            Chapters = YTChapters(elem.textContent);
            // console.log(`Chapter count: ${chapters.length}`);
            for (let i = 0; i < Chapters.length; i++) {
                let CurrentChapter = Chapters[i];
                // Remove leading symbols that shouldn't be a part of the chapter title
                CurrentChapter.title = CurrentChapter.title.replace(/[-_\+–] /, '');
                console.log(`Chapter ${i}: ${CurrentChapter.title} starts at: ${CurrentChapter.start}`);

                // Fill the chapter hashmap
                ChapterMap[CurrentChapter.title] = i;
            }

            // Pause video automatically
            waitForElm(document, 'video').then((elem) => {
                let video = elem;

                video.ontimeupdate = (event) => {
                    if ((video.currentTime | 0) == StopTime) {
                        video.pause();
                        StopTime = -1;
                    }
                };
            });

            _callback();
        });
    });
}


function setupStopTime() {
    // IsStopping = false;
    readDescription(function () {
        // Don't create the button if video has no buttons
        if (Chapters.length == 0) {
            console.log(`Couldn't find chapters`);
            // If button has already been created, remove it
            if (document.querySelector(ButtonQuery)) 
                document.querySelector(ButtonQuery).remove();

            return;
        }

        waitForElm(document, 'button.ytp-play-button').then((elem) => {
            // Check if button has already been created
            if (document.querySelector(ButtonQuery)) return;

            const SurroundingButton = document.createElement('button');

            SurroundingButton.className = 'ytp-button';

            const Button = document.createElement('button');

            Button.title = "Stop at next chapter";

            // Set the button's ID
            Button.id = "chapter-pause-button";

            // Tell button what to do on click
            SurroundingButton.onclick = (event) => {
                let ChapterName = document.querySelector('div.ytp-chapter-title-content')?.textContent;

                if (ChapterName) {
                    let Index = ChapterMap[ChapterName];

                    if (Index < (Chapters.length - 1)) {
                        StopTime = Chapters[Index + 1].start;
                    }
                }
            };

            SurroundingButton.appendChild(Button);

            elem.insertAdjacentElement('afterEnd', SurroundingButton);
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GETCOUNT") {
        console.log(`${request.payload.message}`);

        sendResponse(Chapters.length);
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
    setupStopTime();
});