let overlayElement;
let commentListElement;
let commentIconElement;
let expandCommentElement;

function createOverlay(callback) {
    function toggleComments() {
        if (commentListElement.style.display === 'block') {
            commentListElement.style.display = 'none';
            commentIconElement.innerHTML = '+';
        } else {
            commentListElement.style.display = 'block';
            commentIconElement.innerHTML = '-';
        }
    }

    fetch(chrome.extension.getURL('overlay.html'))
        .then(response => response.text())
        .then(response => {
            document.getElementsByTagName('body')[0].insertAdjacentHTML('beforeend', response);

            overlayElement = document.getElementById('feedback-overlay');
            overlayElement.style.visibility = 'hidden';
            commentListElement = overlayElement.querySelector('.feedback-overlay__comments');
            commentIconElement = overlayElement.querySelector('.feedback-overlay__expand-comment-icon');
            expandCommentElement = overlayElement.querySelector('.feedback-overlay__expand-comment');

            expandCommentElement.addEventListener('click', toggleComments);
            callback();
        });
}

function updateOverlay(data) {
    const comments = {};
    const ratingElement = overlayElement.querySelector('.feedback-overlay__rating');
    let thumbsUpCount = 0;
    let thumbsDownCount = 0;

    function getColor(value) {
        // value from 0 to 1 (0 == red, 1 == green)
        const hue = value * 120;
        return `hsl(${hue},100%,45%)`;
    }

    (function resetOverlay() {
        // Clear existing info
        commentListElement.style.display = 'none';
        commentListElement.innerHTML = '';
        commentIconElement.innerHTML = '+';
        expandCommentElement.style.display = 'none';
        ratingElement.innerHTML = '';
    })();

    data.data.list.forEach(item => {
        if (item.thumbsSignal === 'THUMBS_UP') {
            thumbsUpCount++;
        } else {
            thumbsDownCount++;
            comments[item.comment] ? comments[item.comment].count++ : comments[item.comment] = { count: 1 };
            comments[item.comment].created = item.created;
        }
    });

    const totalCount = thumbsUpCount + thumbsDownCount;

    if (totalCount) {
        const rating = Math.round((thumbsUpCount / totalCount) * 1000) / 10;

        ratingElement.innerHTML = rating;
        ratingElement.style.color = getColor(thumbsUpCount / totalCount);
    }

    overlayElement.querySelector('.feedback-overlay__thumbs-up-count').innerHTML = thumbsUpCount;
    overlayElement.querySelector('.feedback-overlay__thumbs-down-count').innerHTML = thumbsDownCount;

    const commentKeys = Object.keys(comments);

    if (commentKeys.length) {
        commentKeys.sort((a, b) => comments[b].created > comments[a].created); // sort by newest first
        commentKeys.forEach(comment => {
            const listItem = document.createElement('li');

            listItem.innerHTML = comment;
            if (comments[comment].count > 1) {
                listItem.innerHTML += ` (x${comments[comment].count})`;
            }
            commentListElement.appendChild(listItem);
        });

        expandCommentElement.style.display = 'inline';
    }

    if (overlayElement.style.visibility === 'hidden') {
        chrome.storage.local.get('settings', config => {
            if (!config.settings['hide-overlay']) {
                overlayElement.style.visibility = 'visible';
            }
        });
    }
}

function makeRequest(settings, callback) {
    if (!(settings.domains &&
        settings.domains.some(domain => window.location.hostname.indexOf(domain) !== -1))
    ) {
        overlayElement.style.visibility = 'hidden';
        return false;
    }

    const docId = window.location.pathname.split('-').pop();

    if (!parseInt(docId)) {
        return false;
    }

    const parameters = {
        fromDate: new Date(settings['from-date']).getTime(),
        toDate: new Date(settings['to-date']).getTime()
    };
    let queryString = '?docId=' + docId;

    for (key in parameters) {
        if (parameters[key]) {
            queryString += `&${key}=${parameters[key]}`;
        }
    }

    fetch('https://*' + queryString)
        .then(response => response.json())
        .then(callback);
}

chrome.storage.local.get('settings', config => {
    createOverlay(makeRequest.bind(null, config.settings, updateOverlay));
});

chrome.storage.onChanged.addListener(config => {
    if (config.settings.newValue['hide-overlay']) {
        overlayElement.style.visibility = 'hidden';
    } else {
        overlayElement.style.visibility = 'visible';
        makeRequest(config.settings.newValue, updateOverlay);
    }
});