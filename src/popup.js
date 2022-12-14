// 'use strict';
/*
import './popup.css';

(function () {
    // We will make use of Storage API to get and store `count` value
    // More information on Storage API can we found at
    // https://developer.chrome.com/extensions/storage

    // To get storage access, we have to mention it in `permissions` property of manifest.json file
    // More information on Permissions can we found at
    // https://developer.chrome.com/extensions/declare_permissions
    const counterStorage = {
        get: (cb) => {
            chrome.storage.sync.get(['count'], (result) => {
                cb(result.count);
            });
        },
        set: (value, cb) => {
            chrome.storage.sync.set(
                {
                    count: value,
                },
                () => {
                    cb();
                }
            );
        },
    };

    function setupCounter(initialValue = 0) {
        document.getElementById('counter').innerHTML = initialValue;
    }

    function updateCounter(amount) {
        let newCount;

        newCount = amount;

        counterStorage.set(newCount, () => {
            document.getElementById('counter').innerHTML = newCount;
        });
    }

    function restoreCounter() {
        // Restore count value
        counterStorage.get((count) => {
            if (typeof count === 'undefined') {
                // Set counter value as 0
                counterStorage.set(0, () => {
                    setupCounter(0);
                });
            } else {
                setupCounter(count);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', restoreCounter);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];

        chrome.tabs.sendMessage(
            tab.id,
            {
                type: 'GETCOUNT',
                payload: {
                    message: 'POPUP SAYS: GIB CHAPTERS'
                }
            },
            (response) => {
                console.log(`Received ${response} from contentScript`);
                updateCounter(response);
            }
        );
    });
})();
*/