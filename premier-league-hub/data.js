// data.js
// This file stores the teams and match information for my Premier League Hub.
// The data is stored in arrays, so it resets when the server restarts.

// teams stores the club names, IDs and stadiums.
// fixtures stores the matches, scores and results.

// The league table is calculated using the match results.
// When a new score is added, the table updates based on that result.

// module.exports allows server.js to use the functions in this file.
const FEATURED_ID = 1;   // Arsenal: the club that gets the dashboard and cannot be removed
const MAX_GOALS = 20;

let nextTeamId = 9;
let nextFixtureId = 1;

let teams = [
    { id: 1, name: "Arsenal",     stadium: "Emirates Stadium" },
    { id: 2, name: "Man City",    stadium: "Etihad Stadium" },
    { id: 3, name: "Liverpool",   stadium: "Anfield" },
    { id: 4, name: "Chelsea",     stadium: "Stamford Bridge" },
    { id: 5, name: "Tottenham",   stadium: "Tottenham Hotspur Stadium" },
    { id: 6, name: "Newcastle",   stadium: "St James' Park" },
    { id: 7, name: "Aston Villa", stadium: "Villa Park" },
    { id: 8, name: "Man United",  stadium: "Old Trafford" }
];

let fixtures = [];

// This function helps create the starting matches.
// If no score is added, the match is upcoming.
function addFixture(matchday, homeId, awayId, homeGoals, awayGoals) {
    const played = homeGoals !== undefined;
    fixtures.push({
        id: nextFixtureId++,
        matchday: matchday,
        homeId: homeId,
        awayId: awayId,
        played: played,
        homeGoals: played ? homeGoals : null,
        awayGoals: played ? awayGoals : null
    });
}

// Matchdays 1-4 are played, matchdays 5-8 are still to come.
// (Team ids: 1 Arsenal, 2 Man City, 3 Liverpool, 4 Chelsea, 5 Tottenham, 6 Newcastle, 7 Aston Villa, 8 Man United)
addFixture(1, 1, 8, 3, 0);
addFixture(1, 2, 5, 2, 1);
addFixture(1, 3, 6, 2, 0);
addFixture(1, 4, 7, 1, 1);

addFixture(2, 7, 1, 1, 2);
addFixture(2, 5, 4, 1, 2);
addFixture(2, 3, 2, 1, 1);
addFixture(2, 6, 8, 2, 1);

addFixture(3, 1, 3, 2, 2);
addFixture(3, 2, 4, 3, 1);
addFixture(3, 5, 8, 2, 2);
addFixture(3, 6, 7, 0, 1);

addFixture(4, 4, 1, 1, 3);
addFixture(4, 8, 2, 0, 2);
addFixture(4, 7, 5, 2, 2);
addFixture(4, 6, 3, 1, 3);

addFixture(5, 1, 5);
addFixture(5, 2, 7);
addFixture(5, 3, 4);
addFixture(5, 8, 6);

addFixture(6, 6, 1);
addFixture(6, 4, 2);
addFixture(6, 5, 3);
addFixture(6, 7, 8);

addFixture(7, 1, 2);
addFixture(7, 3, 7);
addFixture(7, 4, 8);
addFixture(7, 5, 6);

addFixture(8, 8, 1);
addFixture(8, 2, 6);
addFixture(8, 5, 7);
addFixture(8, 4, 3);


// Teams


// Ids reach us as STRINGS from URLs and form bodies ("3"), so we convert with Number().
// Returns undefined if there is no such team (Number("abc") is NaN, which matches nothing).
function getTeamById(id) {
    return teams.find(t => t.id === Number(id));
}

function nameOf(id) {
    const team = getTeamById(id);
    return team ? team.name : "Unknown";
}

function getTeams() {
    return teams
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(t => ({ id: t.id, name: t.name, stadium: t.stadium, featured: t.id === FEATURED_ID }));
}

// Shared validation for adding and editing a team.
// ignoreId lets a team keep its own name when we edit it (otherwise it would clash with itself).
// Returns { error } or { name, stadium }.
function checkTeamInput(input, ignoreId) {
    input = input || {}; 

    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (name.length < 2 || name.length > 30) {
        return { error: "Team name must be between 2 and 30 characters." };
    }

    const clash = teams.find(t => t.id !== ignoreId && t.name.toLowerCase() === name.toLowerCase());
    if (clash) {
        return { error: "There is already a team called " + clash.name + "." };
    }

    let stadium = typeof input.stadium === "string" ? input.stadium.trim() : "";
    if (stadium.length > 40) {
        return { error: "Stadium name can be at most 40 characters." };
    }
    if (stadium === "") {
        stadium = "To be confirmed";
    }

    return { name: name, stadium: stadium };
}

function addTeam(input) {
    const checked = checkTeamInput(input, null);
    if (checked.error) return { error: checked.error };

    const team = { id: nextTeamId++, name: checked.name, stadium: checked.stadium };
    teams.push(team);
    return { team: team };
}

function editTeam(id, input) {
    const team = getTeamById(id);
    if (!team) return { error: "Team not found.", notFound: true };

    const checked = checkTeamInput(input, team.id);
    if (checked.error) return { error: checked.error };

    team.name = checked.name;
    team.stadium = checked.stadium;
    return { team: team };
}

// Removing a team also removes every fixture that involves it,
// otherwise fixtures would point at a team that no longer exists.
function removeTeam(id) {
    const team = getTeamById(id);
    if (!team) return { error: "Team not found.", notFound: true };
    if (team.id === FEATURED_ID) {
        return { error: team.name + " is the featured club and cannot be removed." };
    }

    teams = teams.filter(t => t.id !== team.id);
    fixtures = fixtures.filter(f => f.homeId !== team.id && f.awayId !== team.id);
    return { team: team };
}


// League table: calculated from the played fixtures, never stored


// Add one match result to a row, from that team's point of view.
function applyResult(row, scored, conceded) {
    row.played++;
    row.gf += scored;
    row.ga += conceded;
    if (scored > conceded) {
        row.won++;
        row.points += 3;
    } else if (scored === conceded) {
        row.drawn++;
        row.points += 1;
    } else {
        row.lost++;
    }
    row.gd = row.gf - row.ga;
}

function computeTable() {
    const rows = teams.map(t => ({
        id: t.id,
        name: t.name,
        played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, gd: 0, points: 0,
        featured: t.id === FEATURED_ID
    }));

    const rowById = {};
    rows.forEach(r => { rowById[r.id] = r; });

    for (const f of fixtures) {
        if (!f.played) continue;
        applyResult(rowById[f.homeId], f.homeGoals, f.awayGoals);
        applyResult(rowById[f.awayId], f.awayGoals, f.homeGoals);
    }

    // Sort by points, then goal difference, then goals scored, then name
    rows.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
    rows.forEach((row, index) => { row.position = index + 1; });
    return rows;
}


// Fixtures and results


// A fixture with the team names filled in, ready to send to the browser.
function describeFixture(f) {
    return {
        id: f.id,
        matchday: f.matchday,
        played: f.played,
        homeGoals: f.homeGoals,
        awayGoals: f.awayGoals,
        home: { id: f.homeId, name: nameOf(f.homeId), featured: f.homeId === FEATURED_ID },
        away: { id: f.awayId, name: nameOf(f.awayId), featured: f.awayId === FEATURED_ID }
    };
}

// filters: { status: "played" | "upcoming", teamId: number, matchday: number }
function getFixtures(filters) {
    filters = filters || {};
    let list = fixtures.slice();

    if (filters.status === "played") list = list.filter(f => f.played);
    if (filters.status === "upcoming") list = list.filter(f => !f.played);
    if (filters.teamId) list = list.filter(f => f.homeId === filters.teamId || f.awayId === filters.teamId);
    if (filters.matchday) list = list.filter(f => f.matchday === filters.matchday);

    list.sort((a, b) => a.matchday - b.matchday || a.id - b.id);
    return list.map(describeFixture);
}

// Check if the score entered is valid.
// Return the number if it's valid, or null if it's not.
function parseGoals(value) {
    if (value === undefined || value === null || String(value).trim() === "") return null;
    const goals = Number(value);
    if (!Number.isInteger(goals) || goals < 0 || goals > MAX_GOALS) return null;
    return goals;
}

// Enter (or correct) the score of a fixture. Once it is recorded, the table includes it automatically.
function recordResult(fixtureId, input) {
    input = input || {};
    const fixture = fixtures.find(f => f.id === Number(fixtureId));
    if (!fixture) return { error: "Fixture not found.", notFound: true };

    const homeGoals = parseGoals(input.homeGoals);
    const awayGoals = parseGoals(input.awayGoals);
    if (homeGoals === null || awayGoals === null) {
        return { error: "Goals must be whole numbers from 0 to " + MAX_GOALS + "." };
    }

    fixture.played = true;
    fixture.homeGoals = homeGoals;
    fixture.awayGoals = awayGoals;
    return { fixture: describeFixture(fixture) };
}


// Arsenal dashboard


function getDashboard() {
    const team = getTeamById(FEATURED_ID);
    const table = computeTable();
    const row = table.find(r => r.id === FEATURED_ID);

    const mine = fixtures
        .filter(f => f.homeId === FEATURED_ID || f.awayId === FEATURED_ID)
        .sort((a, b) => a.matchday - b.matchday || a.id - b.id);

    // Played matches, seen from our club's side (oldest first)
    const results = mine.filter(f => f.played).map(f => {
        const isHome = f.homeId === FEATURED_ID;
        const scored = isHome ? f.homeGoals : f.awayGoals;
        const conceded = isHome ? f.awayGoals : f.homeGoals;
        return {
            matchday: f.matchday,
            opponent: nameOf(isHome ? f.awayId : f.homeId),
            venue: isHome ? "Home" : "Away",
            score: scored + "-" + conceded,
            result: scored > conceded ? "W" : scored === conceded ? "D" : "L"
        };
    });

    const upcoming = mine.filter(f => !f.played).map(f => {
        const isHome = f.homeId === FEATURED_ID;
        return {
            id: f.id,
            matchday: f.matchday,
            opponent: nameOf(isHome ? f.awayId : f.homeId),
            venue: isHome ? "Home" : "Away"
        };
    });

    return {
        team: team,
        position: row.position,
        totalTeams: table.length,
        row: row,
        leader: table[0].name,
        gapToLeader: table[0].points - row.points,
        form: results.slice(-5).map(r => r.result),   // last five results, oldest first
        results: results.slice().reverse(),           // most recent first
        upcoming: upcoming,
        nextMatch: upcoming.length > 0 ? upcoming[0] : null
    };
}

module.exports = {
    FEATURED_ID,
    getTeams,
    getTeamById,
    addTeam,
    editTeam,
    removeTeam,
    computeTable,
    getFixtures,
    recordResult,
    getDashboard
};
