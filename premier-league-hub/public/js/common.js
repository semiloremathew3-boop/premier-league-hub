// common.js - helpers shared by every page (served from /static/js/common.js)

// ---------------------------------------------------------------------------
// AJAX with XMLHttpRequest (Week 5).
// method: "GET" or "POST"   url: where to send   body: a JS object to send as JSON, or null
// callback(errorMessage, data): errorMessage is null when everything went fine
// ---------------------------------------------------------------------------
function xhrRequest(method, url, body, callback) {
    const xhr = new XMLHttpRequest();                 // constructor

    xhr.addEventListener("load", () => {              // fires when the response has arrived
        let parsed = null;
        try {
            parsed = JSON.parse(xhr.responseText);    // turn the JSON text into a JS object
        } catch (e) {
            // the response was not JSON; parsed stays null
        }
        if (xhr.status >= 400) {
            callback((parsed && parsed.error) || "Request failed (" + xhr.status + ")", null);
        } else {
            callback(null, parsed);
        }
    });

    xhr.addEventListener("error", () => {             // network problem: the server could not be reached
        callback("Could not reach the server.", null);
    });

    xhr.open(method, url);                            // initialise the request
    if (body) {
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(body));               // send the JSON in the HTTP body
    } else {
        xhr.send();
    }
}

// ---------------------------------------------------------------------------
// Building page content safely
// ---------------------------------------------------------------------------

// Create an element and fill it with TEXT (textContent, never innerHTML).
// textContent shows whatever a user typed as plain text, so a team name like <script>...</script> cannot run as code.
function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
}

function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
}

// 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th" ...
function ordinal(n) {
    const rest = n % 100;
    if (rest >= 11 && rest <= 13) return n + "th";
    const last = n % 10;
    if (last === 1) return n + "st";
    if (last === 2) return n + "nd";
    if (last === 3) return n + "rd";
    return n + "th";
}

// Small pop-up message in the corner of the screen
function toast(message, isError) {
    const box = document.getElementById("toast");
    box.textContent = message;
    box.className = "toast show" + (isError ? " error" : "");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { box.className = "toast"; }, 3500);
}

// Highlight the navigation link of the page we are on
function markActiveNav() {
    for (const link of document.querySelectorAll("nav a")) {
        if (link.getAttribute("href") === window.location.pathname) {
            link.className = "active";
        }
    }
}

// ---------------------------------------------------------------------------
// Server-sent events (Week 5): the server pushes an event whenever a result or a team changes.
// onChange is the page's own "reload my data" function.
// ---------------------------------------------------------------------------
function connectLive(onChange) {
    const status = document.getElementById("live-status");
    const evtSource = new EventSource("/sse/updates");

    evtSource.addEventListener("connected", () => {
        status.textContent = "Live";
        status.className = "live on";
    });

    // If the connection drops, the browser reconnects by itself
    evtSource.onerror = () => {
        status.textContent = "Reconnecting";
        status.className = "live";
    };

    // The names below match the "event:" field the server writes
    evtSource.addEventListener("result", (e) => {
        toast(JSON.parse(e.data).text);
        onChange();
    });

    evtSource.addEventListener("teams", (e) => {
        toast(JSON.parse(e.data).text);
        onChange();
    });
}

// ---------------------------------------------------------------------------
// Pieces used on more than one page
// ---------------------------------------------------------------------------

// A W / D / L circle
function formChip(result) {
    return el("span", result, "chip chip-" + result);
}

// One finished match as a row: "Arsenal  3 - 0  Man United"
function matchRow(f) {
    const li = el("li", null, "match-row");
    li.appendChild(el("span", f.home.name, "team home" + (f.home.featured ? " is-featured" : "")));
    li.appendChild(el("span", f.homeGoals + " - " + f.awayGoals, "score"));
    li.appendChild(el("span", f.away.name, "team away" + (f.away.featured ? " is-featured" : "")));
    return li;
}
