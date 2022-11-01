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
:root {
    --pause: path('M 12,26 28,26 28,10 12,10 z M 12,10 12,26 28,26 28,10 z');
    --cancel: path('M 11,11 27,27 29,25 13,9 z M 11,25 13,27 29,11 27,9 z');
}

#surround-chapter-pause {
    flex: 0 0 auto;
}

svg.chapter-pause-svg path {
    animation-duration: 0.2s;
    animation-fill-mode: forwards;
    animation-timing-function: ease-in-out;
}

.ycp-chapter-pause path {
    animation-name: chapter-pause;
}

.ycp-chapter-cancel path {
    animation-name: chapter-cancel;
}

@keyframes chapter-pause {
    from {
        d: var(--cancel);
    } to {
        d: var(--pause);
    }
}

@keyframes chapter-cancel {
    from {
        d: var(--pause);
    } to {
        d: var(--cancel);
    }
}
`;

var styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

// Waits for element to load
function waitForElm(element, selector) {
    return new Promise(resolve => {
        if (element.querySelector(selector) && element.querySelector(selector).textContent !== OldDescription) {
            return resolve(element.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (element.querySelector(selector) && element.querySelector(selector).textContent !== OldDescription) {
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
let OldDescription = "";
let Chapters = [];
let ChapterMap = {};
let StopTime = Infinity;
let IsStopping = false;
let CreatedButton = false;
let SurroundingButton;

function readDescription(_callback) {
    let CheckDescription = "";
    Chapters = [];
    ChapterMap = {};
    resetPauser();

    waitForElm(document, 'tp-yt-paper-button#expand').then((elem) => {
        // Open description
        elem.click();
        // Wait for the description to be loaded
        waitForElm(document, 'div#description').then((elem) => {
            // Wait for the description's string to be loaded
            waitForElm(elem, "yt-formatted-string.ytd-text-inline-expander").then((elem) => {
                while (CheckDescription === "") {
                    // Always create button, fuck it ㄟ( ▔, ▔ )ㄏ
                    // if (!document.querySelector(ButtonQuery)) {
                    createButton();
                    // }

                    OldDescription = elem.textContent;
                    CheckDescription = elem.textContent;

                    console.log(`Read: '${OldDescription}'`);

                    waitForElm(document, 'tp-yt-paper-button#collapse').then((elem) => {
                        elem.click();
                    });

                    let TempArray = elem.textContent.split('\n');

                    // Filter temp array to only include timestamped lines
                    // !Could be better to remove this from the code!
                    // TempArray = TempArray.filter((e) => {
                    //     return /.*[\d+:]+\d{2}.*/.test(e);
                    // });

                    let TempIndex = 0;

                    // Go through the temporary array to find when actual chapters start
                    for (let i = 0; i < TempArray.length; i++) {
                        // Find start of video
                        if (/^ *0{1,2}:00|0{1,2}:00 *$/.test(TempArray[i]))
                            TempIndex = i;
                    }

                    // Throw out everything before video starts
                    TempArray = TempArray.slice(TempIndex);

                    // Filtering the description to only include lines with timestamps
                    let TempDescription = TempArray.join('\n');

                    // console.log(TempDescription);

                    Chapters = YTChapters(TempDescription);
                    // console.log(`Chapter count: ${Chapters.length}`);
                    for (let i = 0; i < Chapters.length; i++) {
                        let CurrentChapter = Chapters[i];
                        // Remove leading symbols that shouldn't be a part of the chapter title
                        CurrentChapter.title = filterChapterTitle(CurrentChapter.title);
                        // console.log(`Chapter ${i}: '${CurrentChapter.title}' starts at: ${CurrentChapter.start}`);

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

                }
            });
            _callback();
        });
    });
}

function filterChapterTitle(Title) {
    // Trying to use capture groups led to weird results, just copy paste and figure it out later
    // TODO: Find better way of writing this regex
    let ReturnTitle = Title.replace(/^ *[-_\+–:] *| *[-_\+–:] *$/, '');
    // console.log(`Returning title: ${ReturnTitle}`);
    return ReturnTitle;
}

function resetPauser() {
    StopTime = Infinity;
    IsStopping = false;

    // Redraw button if it exists
    if (SurroundingButton)
        SurroundingButton.innerHTML = drawButton();
}


function setupStopTime() {
    // IsStopping = false;
    readDescription(function () {
        // Don't create the button if video has no buttons
        if (Chapters.length == 0) {
            // console.log(`Couldn't find chapters`);
            // If button has already been created, remove it
            if (document.querySelector(ButtonQuery))
                document.querySelector(ButtonQuery).remove();

            return;
        } else {
            createButton();
        }

    });
}

function createButton() {
    waitForElm(document, 'button.ytp-play-button').then((elem) => {
        // Check if button has already been created
        if (document.querySelector(ButtonQuery)) return;

        // Set up button
        SurroundingButton = document.createElement('button');

        SurroundingButton.id = "surround-chapter-pause";

        SurroundingButton.className = "ytp-button";

        // Create svg
        SurroundingButton.innerHTML = drawButton();

        // Tell button what to do on click
        SurroundingButton.onclick = () => {
            let ChapterName = document.querySelector('div.ytp-chapter-title-content')?.textContent;

            // I hate this, but explanation below
            ChapterName = YTChapters(`${ChapterName} 0:00`)[0].title;

            //* Alright, so YTChapters seems to be doing some stripping,
            //* seems like it's removing leading numbers from chapter titles,
            //* so this is my way of ensuring it will correctly search for the correct chapter name

            // Filter chapter title to ensure it's the same as in the hashmap
            ChapterName = filterChapterTitle(ChapterName);

            // console.log(`Trying to find '${ChapterName}'`);

            if (ChapterName) {
                let Index = ChapterMap[ChapterName] ?? Infinity;

                if (Index < (Chapters.length - 1)) {
                    if (!IsStopping) {
                        StopTime = Chapters[Index + 1].start;
                        // console.log(`Set to stop at ${StopTime}`);
                        IsStopping = true;
                    } else {
                        resetPauser();
                    }
                    SurroundingButton.innerHTML = drawButton();
                } else {
                    // console.log(`Either couldn't find the chapter, or index is last`);
                }
            }
        };

        // Insert behind the play/pause button
        elem.insertAdjacentElement('afterEnd', SurroundingButton);

        // Check if button was created
        CreatedButton = document.querySelector(ButtonQuery) !== null;
    });
}

function drawButton() {
    return `<svg class="chapter-pause-svg  ${getSVGClass()}" height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
                <path class="ytp-svg-fill"></path>
            </svg>`;
}

function getSVGClass() {
    if (!IsStopping)
        return 'ycp-chapter-pause';
    else
        return 'ycp-chapter-cancel';
}

document.addEventListener("yt-navigate-finish", (event) => {
    setupStopTime();
});