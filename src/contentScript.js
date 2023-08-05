"esversion: 11";
// import YTChapters from "get-youtube-chapters";

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
    d: var(--pause);
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
            if (!checkText || (ElText !== "")) {
                return resolve(element.querySelector(selector));
            }
        }

        const observer = new MutationObserver(mutations => {
            let El = element.querySelector(selector);
            if (El) {
                let ElText = El.textContent.trim();
                if (!checkText || (ElText !== "")) {
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
let IsStopping = false;
let SurroundingButton = HTMLElement;
let StopChapter = "";
let JustLoaded = true;

async function setupStopTime() {
    // Pause video automatically
    const VideoElem = await waitForElem(document, `video`, false);
    if (VideoElem) {
        VideoElem.ontimeupdate = (event) => {
            if (IsStopping && StopChapter !== "" && document.querySelector(`div.ytp-chapter-title-content`).textContent !== StopChapter) {
                VideoElem.pause();
                resetPauser();
            }
        };
    }

    createButton();
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
        // SurroundingButton.appendChild(getButton());
        // SurroundingButton.innerHTML = getButton();
        $(SurroundingButton).html(getButton());

        // Tell button what to do on click
        SurroundingButton.onclick = () => {
            if (!hasChapters()) return;

            if (IsStopping) {
                return resetPauser();
            }

            const ChapterTitle = document.querySelector(`div.ytp-chapter-title-content`);

            StopChapter = ChapterTitle.textContent;

            if (StopChapter !== "") {
                IsStopping = true;

                // console.log(`We're stopping at ${StopTime}`);
                drawButton();
            }
        };

        // Insert behind the play/pause button
        PlayButton.insertAdjacentElement("afterEnd", SurroundingButton);
    }
}

// function getButton() {
//     let Para = document.createElement('svg');
//     Para.classList = `chapter-pause-svg ${getSVGClass()}`;
//     Para.setAttribute('height', "100%");
//     Para.setAttribute('version', "1.1");
//     Para.setAttribute('viewBox', "0 0 36 36");
//     Para.setAttribute('width', "100%");
//     // Para.style = 'height="100%" version="1.1" viewBox="0 0 36 36" width="100%"';

//     let Path = document.createElement('path');
//     Path.classList = 'ytp-svg-fill';

//     Para.appendChild(Path);

//     return Para;
// }

function getButton() {
    return `<svg class="chapter-pause-svg  ${getSVGClass()}" height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
                <path class="ytp-svg-fill"></path>
            </svg>`;
}

function getSVGClass() {
    // if (JustLoaded) {
    //     JustLoaded = false;
    //     return;
    // }
    if (!IsStopping)
        return `ycp-chapter-pause`;
    else
        return `ycp-chapter-cancel`;
}

// Cancels timer
function resetPauser() {
    IsStopping = false;
    StopChapter = "";

    drawButton();
}

function drawButton() {
    if (SurroundingButton)
        $(SurroundingButton).html(getButton());
}

function hasChapters() {
    return document.getElementsByClassName('ytp-exp-chapter-hover-container').length > 0;
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