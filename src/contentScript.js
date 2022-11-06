"esversion: 11";
import YTChapters from "get-youtube-chapters";

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
    --pause: path("M 12,26 28,26 28,10 12,10 z M 12,10 12,26 28,26 28,10 z");
    --cancel: path("M 11,11 27,27 29,25 13,9 z M 11,25 13,27 29,11 27,9 z");
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
function waitForElem(element, selector, checkText = true) {
    return new Promise(resolve => {
        let El = element.querySelector(selector);
        if (El) {
            let ElText = El.textContent.trim();
            if (!checkText || (ElText !== "" && ElText !== OldDescription)) {
                return resolve(element.querySelector(selector));
            }
        }

        const observer = new MutationObserver(mutations => {
            let El = element.querySelector(selector);
            if (El) {
                let ElText = El.textContent.trim();
                if (!checkText || (ElText !== "" && ElText !== OldDescription)) {
                    return resolve(element.querySelector(selector));
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

const ButtonQuery = `button#surround-chapter-pause`;
let OldDescription = ``;
let Chapters = [];
let ChapterMap = {};
let StopTime = Infinity;
let IsStopping = false;
let SurroundingButton;
const APIKey = "";
const Fields = "items/snippet/title,items/snippet/description";
let CurrentTime;

async function getDescription(VideoID) {
    // console.log(`Getting description`);

    const APIUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet&id=${VideoID}&fields=${Fields}&key=${APIKey}`;

    let ReturnDescription = "";

    await fetch(APIUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    })
        .then(response => response.json())
        .then(json => {
            // console.log(json.items[0].snippet.description);
            ReturnDescription = json.items[0].snippet.description;
        })
        .catch(err => {
            // console.log(err);
        });

    return ReturnDescription;
}

async function readDescription() {
    Chapters = [];
    ChapterMap = {};
    resetPauser();

    // Check if chapter titles appear
    if (await waitForElem(document, 'div.ytp-chapter-title-content')) {
        const URL = window.location.href;

        // Find from where video ID starts, and split from there on ampersands
        // *There should be at least one ampersand in the url, otherwise will have to change this
        const VideoID = URL.replace(/.*v=/, '').split('&')[0];

        const Description = await getDescription(VideoID);

        let TempArray = Description.split("\n");

        // console.log(TempArray);

        // If the temporary array has been created
        if (TempArray) {
            let TempIndex = 0;

            // Go through the temporary array to find when actual chapters start
            for (let i = 0; i < TempArray.length; i++) {
                // Find start of video
                if (/(\D|^)+0{1,2}:00/.test(TempArray[i]))
                    TempIndex = i;
            }

            // Throw out everything before video starts
            TempArray = TempArray.slice(TempIndex);

            // Filtering the description to only include lines with timestamps
            let TempDescription = TempArray.join(`\n`);

            // console.log(TempDescription);

            Chapters = YTChapters(TempDescription);
            // console.log(`Chapter count: ${Chapters.length}`);
            for (let i = 0; i < Chapters.length; i++) {
                let CurrentChapter = Chapters[i];
                // Remove leading symbols that shouldn't be a part of the chapter title
                CurrentChapter.title = filterChapterTitle(CurrentChapter.title);
                // console.log(`Chapter ${i}: "${CurrentChapter.title}" starts at: ${CurrentChapter.start}`);

                // Fill the chapter hashmap
                ChapterMap[CurrentChapter.title] = i;
            }
        }

        // console.log(`After chapters are set up`);

    }
}

/**
 * Filter the chapter title to make sure it's the same way as it shows up on the video
 */
function filterChapterTitle(Title) {
    // Trying to use capture groups led to weird results, just copy paste and figure it out later
    // TODO: Find better way of writing this regex
    let ReturnTitle = "";
    ReturnTitle = Title.replace(/^ *[-_\+–:] *| *[-_\+–:] *$/, "");

    // Remove any surrounding symbols
    ReturnTitle = ReturnTitle.replace(/\[|\]|\{|\}|-|_/g, "");

    // Fix when people format as "x:xx - x:xx {title}"
    ReturnTitle = ReturnTitle.replace(/([0-9]{1,2}:){1,}[0-9]{2}/, "");

    // console.log(`Returning title: ${ReturnTitle}`);
    return ReturnTitle.trim();
}

function resetPauser() {
    StopTime = Infinity;
    IsStopping = false;

    // Redraw button if it exists
    if (SurroundingButton)
        SurroundingButton.innerHTML = drawButton();
}


async function setupStopTime() {
    // Pause video automatically
    const VideoElem = await waitForElem(document, `video`, false);
    if (VideoElem) {
        VideoElem.ontimeupdate = (event) => {
            CurrentTime = VideoElem.currentTime;
            if ((CurrentTime | 0) >= StopTime && IsStopping) {
                VideoElem.pause();
                resetPauser();
            }
        };
    }

    createButton();

    readDescription();
}

function createButton() {
    // console.log(`Creating button`);
    if (waitForElem(document, `button.ytp-play-button`, false)) {
        const PlayButton = document.querySelector(`button.ytp-play-button`);

        // Check if button has already been created
        if (document.querySelector(ButtonQuery)) return;

        // Set up button
        SurroundingButton = document.createElement(`button`);

        SurroundingButton.id = `surround-chapter-pause`;

        SurroundingButton.className = `ytp-button`;

        // Create svg
        SurroundingButton.innerHTML = drawButton();

        // Tell button what to do on click
        SurroundingButton.onclick = () => {
            if (IsStopping) {
                return resetPauser();
            }

            const ChapterTitle = document.querySelector(`div.ytp-chapter-title-content`);
            let ChapterName = "";
            if (ChapterTitle)
                ChapterName = ChapterTitle.textContent;

            // I hate this, but explanation below
            ChapterName = YTChapters(`${ChapterName} 0:00`)[0].title;

            //* Alright, so YTChapters seems to be doing some stripping,
            //* seems like it's removing leading numbers from chapter titles,
            //* so this is my way of ensuring it will correctly search for the correct chapter name

            // Filter chapter title to ensure it's the same as in the hashmap
            ChapterName = filterChapterTitle(ChapterName);

            // console.log(`Trying to find "${ChapterName}"`);

            if (ChapterName) {
                let Index = ChapterMap[ChapterName] ?? Infinity;

                if (Index < (Chapters.length - 1)) {
                    StopTime = Chapters[Index + 1].start;
                    IsStopping = true;
                }
                else {
                    // Set a timer for 5 minutes
                    StopTime = CurrentTime + 300;
                    IsStopping = true;
                }
                // console.log(`We're stopping at ${StopTime}`);
                SurroundingButton.innerHTML = drawButton();
            } else {
                StopTime = CurrentTime + 300;
                IsStopping = true;
                // console.log(`We're stopping at ${StopTime}`);
                SurroundingButton.innerHTML = drawButton();
            }
            // console.log(`We're stopping at ${StopTime}`);
            SurroundingButton.innerHTML = drawButton();
        };

        // Insert behind the play/pause button
        PlayButton.insertAdjacentElement("afterEnd", SurroundingButton);
    }
}

function drawButton() {
    return `<svg class="chapter-pause-svg  ${getSVGClass()}" height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
                <path class="ytp-svg-fill"></path>
            </svg>`;
}

function getSVGClass() {
    if (!IsStopping)
        return `ycp-chapter-pause`;
    else
        return `ycp-chapter-cancel`;
}

document.addEventListener(`yt-navigate-finish`, (event) => {
    if (/.*watch\?v=.*/.test(window.location.href)) {
        // if (!APILoaded) {
        //     if (!loadClient()) return;
        //     APILoaded = true;
        // }
        setupStopTime();
    }
});