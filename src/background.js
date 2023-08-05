// 'use strict';

// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages

var chapterCount = 0;

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.type === 'SET') {
//         const message = `Set chapter count to ${request.payload.message}`;
//         chapterCount = request.payload.message;

//         // Log message coming from the `request` parameter
//         console.log(`Background received setter: ${request.payload.message}`);

//         // Send a response message
//         sendResponse({
//             message,
//         });
//     }

//     else if (request.type === 'GET') {
//         const message = chapterCount;

//         console.log(`Background received request to getter`);

//         // Send a response message
//         sendResponse({
//             message,
//         });
//     }
// });