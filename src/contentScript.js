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
#surround-chapter-pause {
    flex: 0 0 auto;
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

const ButtonQuery = 'button#surround-chapter-pause';
let Chapters = [];
let ChapterMap = {};
let StopTime = -1;
let IsStopping = false;

function readDescription(_callback) {
    Chapters = [];
    ChapterMap = {};
    resetPauser();

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
                    if ((video.currentTime | 0) == StopTime && IsStopping) {
                        video.pause();
                        resetPauser();
                    } else if (video.currentTime > StopTime) {
                        resetPauser();
                    }
                };
            });

            _callback();
        });
    });
}

function resetPauser() {
    StopTime = -1;
    IsStopping = false;
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

            SurroundingButton.id = "surround-chapter-pause";

            SurroundingButton.className = "ytp-button";

            SurroundingButton.innerHTML = `
            <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
                <path class="ytp-svg-fill" d="M 12,26 28,26 28,10 12,10 z"></path>
            </svg>`;

            // Tell button what to do on click
            SurroundingButton.onclick = (event) => {
                let ChapterName = document.querySelector('div.ytp-chapter-title-content')?.textContent;

                if (ChapterName) {
                    let Index = ChapterMap[ChapterName];

                    if (Index < (Chapters.length - 1)) {
                        if (!IsStopping) {
                            StopTime = Chapters[Index + 1].start;
                            IsStopping = true;
                        } else {
                            resetPauser();
                        }
                    }
                }
            };

            elem.insertAdjacentElement('afterEnd', SurroundingButton);
        });
    });
}

document.addEventListener("yt-navigate-finish", (event) => {
    setupStopTime();
});