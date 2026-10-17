// server.js - Premier League Hub

// This file runs the server and handles requests from the website.
// It also handles errors, forms, and sending files.

// Express is used to serve CSS, JavaScript and other static files.
// GET and POST are used to get and send information.

// The server also handles AJAX requests and live updates.
// Users can download the league table as a CSV file.

// The server has custom pages for 404 and 500 errors.
// It also includes /api/getName and /api/getImage for the course.

const express = require("express");
const path = require("path");   
const fs = require("fs");       
const data = require("./data");   

const app = express();
const PORT = process.env.PORT || 3000;   // Render tells us its port through process.env.PORT

const PAGES_DIR = path.join(__dirname, "pages");
const DOWNLOAD_DIR = path.join(__dirname, "downloads");
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });   // make sure the folder exists before we write files into it

// 1. MIDDLEWARE (order matters: requests pass through these from top to bottom)


// Our own logging middleware. It runs for every request, then calls next() to pass the request on.
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Body parsers. Without them req.body would be undefined.
app.use(express.urlencoded({ extended: true }));   // for HTML forms (application/x-www-form-urlencoded)
app.use(express.json());                           // for JSON sent by our AJAX calls


// 2. STATIC FILES: everything in /public (css, client js, images) is served under /static

app.use("/static", express.static(path.join(__dirname, "public")));


// 3. PAGES: the HTML files live in /pages and are sent with sendFile

app.get("/", (req, res) => {
    res.sendFile(path.join(PAGES_DIR, "index.html"));
});

app.get("/arsenal", (req, res) => {
    res.sendFile(path.join(PAGES_DIR, "arsenal.html"));
});

app.get("/fixtures", (req, res) => {
    res.sendFile(path.join(PAGES_DIR, "fixtures.html"));
});

// /teams has TWO handlers chained with app.route(): GET shows the page, POST receives the plain HTML form
app.route("/teams")
    .get((req, res) => {
        res.sendFile(path.join(PAGES_DIR, "teams.html"));
    })
    .post((req, res) => {
        const result = data.addTeam(req.body);
        if (result.error) {
            return res.status(400).send(result.error);
        }
        broadcast("teams", { text: "Team added: " + result.team.name });
        // Send the browser back to the page; the new team shows up in the list
        res.redirect("/teams");
    });


// 4. READ-ONLY DATA ROUTES (GET): JSON for the pages to display
// The league table, calculated from the played fixtures every time it is asked for.
app.get("/api/table", (req, res) => {
    res.json(data.computeTable());
});

app.get("/api/teams", (req, res) => {
    res.json(data.getTeams());
});

// Get the team ID from the URL. It comes in as a string.
app.get("/api/teams/:id", (req, res) => {
    const team = data.getTeamById(req.params.id);
    if (!team) {
        return res.status(404).json({ error: "No team with id " + req.params.id + "." });
    }
    const row = data.computeTable().find(r => r.id === team.id);
    res.json({ team: team, standing: row });
});

// Get fixtures and filter them by status, team or matchday if provided.
app.get("/api/fixtures", (req, res) => {
    res.json(data.getFixtures({
        status: req.query.status,
        teamId: Number(req.query.team) || undefined,     
        matchday: Number(req.query.matchday) || undefined
    }));
});

// Everything the Arsenal dashboard needs, in one response.
app.get("/api/arsenal", (req, res) => {
    res.json(data.getDashboard());
});

// These two routes give the class website our site's name and picture.
// Allow the class website to access this information.
app.get("/api/getName", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.json({ name: "Premier League Hub" });
});

app.get("/api/getImage", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.sendFile(path.join(__dirname, "public", "img", "badge.png"));
});
// 5. CHANGING DATA (POST): input arrives in the HTTP body (JSON) and/or the route

// Add a team. BODY (JSON): { name, stadium }
app.post("/api/teams", (req, res) => {
    const result = data.addTeam(req.body);
    if (result.error) {
        return res.status(400).json({ error: result.error });   // 400 = the client sent bad input
    }
    broadcast("teams", { text: "Team added: " + result.team.name });
    res.status(201).json(result.team);                          // 201 = created
});

// Edit a team. ROUTE PARAMETER says WHICH team, BODY says the new values.
app.post("/api/teams/:id/edit", (req, res) => {
    const result = data.editTeam(req.params.id, req.body);
    if (result.error) {
        return res.status(result.notFound ? 404 : 400).json({ error: result.error });
    }
    broadcast("teams", { text: "Team updated: " + result.team.name });
    res.json(result.team);
});

// Remove a team (and its fixtures).
app.post("/api/teams/:id/delete", (req, res) => {
    const result = data.removeTeam(req.params.id);
    if (result.error) {
        return res.status(result.notFound ? 404 : 400).json({ error: result.error });
    }
    broadcast("teams", { text: "Team removed: " + result.team.name });
    res.json({ removed: result.team.name });
});

// Enter (or correct) a match score. ROUTE PARAMETER = which fixture, BODY = { homeGoals, awayGoals }.
// After this, the next call to /api/table already includes the result: the standings update automatically.
app.post("/api/fixtures/:id/result", (req, res) => {
    const result = data.recordResult(req.params.id, req.body);
    if (result.error) {
        return res.status(result.notFound ? 404 : 400).json({ error: result.error });
    }
    const f = result.fixture;
    broadcast("result", { text: "Result recorded: " + f.home.name + " " + f.homeGoals + "-" + f.awayGoals + " " + f.away.name });
    res.json(f);
});


// 6. FILE DOWNLOAD and SERVER-SENT EVENTS
// Format values for the CSV file and handle quotes.
// Stop Excel from treating text as formulas, while keeping numbers unchanged.
function csvCell(value) {
    let text = String(value);
    if (typeof value === "string") {
        const first = text.charAt(0);
        if (first === "=" || first === "+" || first === "-" || first === "@") {
            text = "'" + text;
        }
    }
    return '"' + text.split('"').join('""') + '"';
}

// /download/table for premier-league-table.csv
app.get("/download/table", (req, res, next) => {
    let csv = "Position,Team,Played,Won,Drawn,Lost,GoalsFor,GoalsAgainst,GoalDifference,Points\n";
    for (const r of data.computeTable()) {
        csv += [r.position, r.name, r.played, r.won, r.drawn, r.lost, r.gf, r.ga, r.gd, r.points]
            .map(csvCell).join(",") + "\n";
    }

    // The file name is fixed in OUR code, never taken from the URL, so nobody can ask for other files
    const fileName = "premier-league-table.csv";
    const filePath = path.join(DOWNLOAD_DIR, fileName);

    fs.writeFile(filePath, csv, (err) => {
        if (err) {
            return next(err);   // hand the error to our 500 handler
        }
        // res.download sets Content-Disposition: attachment so the browser saves the file instead of showing it
        res.download(filePath, fileName, (downloadErr) => {
            if (downloadErr) {
                console.error("Download failed:", downloadErr.message);
            }
        });
    });
});

// Server-sent events send live updates to all open pages.
// When a team or match result changes, all connected pages update automatically.
const sseClients = [];   // the response objects of every page that is currently listening

function broadcast(eventName, payload) {
    for (const client of sseClients) {
        client.write("event: " + eventName + "\ndata: " + JSON.stringify(payload) + "\n\n");
    }
}

app.get("/sse/updates", (req, res) => {
    // These headers tell the browser to keep this connection open and expect a stream of events
    res.set({
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache"
    });

    res.write("event: connected\ndata: {}\n\n");   // tells the page the stream is up
    sseClients.push(res);

    // When the browser closes the page the request emits "close": forget this client
    req.on("close", () => {
        const index = sseClients.indexOf(res);
        if (index !== -1) {
            sseClients.splice(index, 1);
        }
    });
});

// A route that fails on purpose so we can demonstrate the custom 500 page: visit /boom
app.get("/boom", (req, res) => {
    throw new Error("Deliberate test error");
});
// 7. CUSTOM 404 AND 500 HANDLERS


// 404: no route above matched, so the request falls all the way down to here.
app.use((req, res) => {
    res.status(404).sendFile(path.join(PAGES_DIR, "404.html"));
});

// 500: Express recognises an ERROR handler by its FOUR parameters (err, req, res, next).
// It runs when a route throws or calls next(err).
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).sendFile(path.join(PAGES_DIR, "500.html"));
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
});
