# Premier League Hub

A small Premier League management server with an Arsenal dashboard.
Built with Node.js and Express for the Advanced Internet Programming midterm.

## Run it

    npm install
    npm start        # then open http://localhost:3000

## Pages

| URL | What it does |
|---|---|
| `/` | League table (calculated from results), latest results, Arsenal snapshot, CSV download |
| `/arsenal` | Arsenal dashboard: position, record, form, results, upcoming fixtures |
| `/fixtures` | All fixtures. Enter or correct a score, and the table updates automatically |
| `/teams` | Add, edit and remove teams (Arsenal is the featured club and cannot be removed) |
| `/anything-else` | Custom 404 page |
| `/boom` | Fails on purpose to show the custom 500 page |
| `/api/getName` | Returns the site name as JSON (called by the class website) |
| `/api/getImage` | Returns the site picture (called by the class website) |

## Files

- `server.js` - routes, middleware, download, server-sent events, 404/500 handlers (comments map each milestone)
- `data.js` - in-memory teams and fixtures, plus the functions that calculate the table and validate input
- `pages/` - the HTML pages
- `public/` - CSS, client JavaScript (AJAX helper, live updates), badge image

Data is in memory, so changes reset when the server restarts. All clubs and results are sample data.

## Deploy (same pipeline as Week 1)

`git init`, commit, push to GitHub, then create a Render Web Service
(build command `npm install`, start command `npm start`).
