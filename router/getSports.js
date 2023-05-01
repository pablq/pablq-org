var https = require("https"),
    http = require("http"),
    queryString = require("querystring");

module.exports = (args, req, res) => {

    var leagues = [ "mlb", "nba", "nfl", "nhl" ],
        league = args[0];

    if (leagues.indexOf(league) === -1) {
        res.writeHead(501, { "Content-Type" : "text/plain" });
        res.end("CANNOT GET " + league);

    } else {
        var commonCallback = (error, games) => {
            if (error) {
                res.writeHead(500, { "Content-Type" : "text/plain" });
                res.end("SERVER ERROR\n");
            } else {
                res.writeHead(200, { "Content-Type" : "text/json",
                                     "Cache-Control" : "no-cache",
                                     "Access-Control-Allow-Origin": "*" });
                res.end(JSON.stringify(games));
            }
        }

        if (league === "nhl") {
            requestNhlGamesData(commonCallback);
        } else {
            requestGamesData(league, (err, data) => {

                var decodeURIComponent = function (c) {
                        c = c.replace(/%(A|B|C)\w{1}(%20)+/,"");
                        return c.replace(/%20/g," ");
                    },
                    parseQueryString = function (qs) {
                        return queryString.parse(qs, null, null, { decodeURIComponent: decodeURIComponent });
                    };

                commonCallback(err, getGames(parseQueryString(data ?? "[]"), league));
            });
        }
    }
};

function requestGamesData (league, cb) {
    var options = {
            hostname: "www.espn.com",
            path: "/" + league + "/bottomline/scores",
            method: "GET"
        },
        commonCallback = function (err, res, data) {
            if (err) { cb(err); return; }
            cb(null, data);
        };

    makeRequest(https, options, (err, res, data) => {
        if (res.statusCode == 302 && 
            res.headers.location && 
            res.headers.location.includes("http:")) {
            makeRequest(http, res.headers.location, commonCallback);
        } else {
            commonCallback(err, res, data);
        }
    });
}

function requestNhlGamesData(cb) {
    var options = {
            hostname: "statsapi.web.nhl.com",
            path: "/api/v1/schedule/games",
            method: "GET"
        },
        commonCallback = function (err, res, data) {
            if (err) { cb(err); return; }
            try {
                var games = [];
                var json = JSON.parse(data)
                if (json.dates && json.dates[0] && json.dates[0].games) {
                    var numRequests = json.dates[0].games.length;
                    console.log("og num requests" + numRequests);
                    json.dates[0].games.forEach((game) => {
                        var game = {
                            "headline" : game.teams.away.team.name + " " + game.teams.away.score + " " + game.teams.home.team.name + " " + game.teams.home.score,
                            "p1": game.status.detailedState,
                            "link" : "https://statsapi.web.nhl.com" + game.link,
                            "lineCount": 1,
                        }
                        getNhlGameDetail(game.link, (detail) => {
                            if (detail) {
                                detail = JSON.parse(detail);
                                game.p2 = detail.liveData.linescore.currentPeriodOrdinal + " period w/" + detail.liveData.linescore.currentPeriodTimeRemaining + " remaining.";
                                game.lineCount = 2;
                            }
                            games.push(game);
                            numRequests -= 1;
                            console.log(numRequests);
                            if (numRequests <= 0) {
                                cb(null, games);                
                            }   
                        });
                    });
                }
                
            } catch (exception) {
                cb(exception, null);
            }            
        };

    makeRequest(https, options, (err, res, data) => {
        if (res.statusCode == 302 && 
            res.headers.location && 
            res.headers.location.includes("http:")) {
            makeRequest(http, res.headers.location, commonCallback);
        } else {
            commonCallback(err, res, data);
        }
    });
}

function getNhlGameDetail(link, cb) {
    var options = {
            hostname: "statsapi.web.nhl.com",
            path: link,
            method: "GET"
        };
    makeRequest(https, options, (err, res, data) => {
        if (res.statusCode == 302 && 
            res.headers.location && 
            res.headers.location.includes("http:")) {
            makeRequest(http, res.headers.location, commonCallback);
        } else {
            if (err) {
                cb(null);
            } else {
                cb(data);
            }
        }
    });
}

function makeRequest (protocol, target, cb) {
    var req = protocol.request(target, (res) => {

        var data = "";

        res.setEncoding("utf8");

        res.on("data", (chunk) => {
            data += chunk;
        });

        res.on("end", () => {
            cb(null, res, data);
        });
    });

    req.on("error", (error) => {
        cb(error, res);
    });

    req.end();
}

function getGames (data, league) {
    var count,
        totalCount = parseInt(data[league + "_s_count"]),
        keys = Object.keys(data),
        games = [];

    for (count = 0; count < totalCount; count += 1) {

        (() => {

            var game = { _id: count + 1 },
                match = new RegExp("^" + league + "_s_(url|left|right)" + (count + 1).toString() + "(_|$)"),
                kIndex = 0,
                key;

            while (kIndex < keys.length) {
                key = keys[kIndex];

                if (key.search(match) > -1) {

                    game[key] = data[key];
                    keys.splice(kIndex, 1);

                } else {

                    kIndex += 1;
                }
            }
            games.push(formatGame(game,league));

        })();
    }
    return games;
}

function formatGame(game, league) {

    var formatted = {},
        id = game._id,
        count = parseInt(game[league + "_s_right" + id + "_count"]),
        i;

    for (i = 0; i < count; i += 1) {

        formatted["p" + (i + 1)] = game[league + "_s_right" + id + "_" + (i + 1)];
    }

    formatted.lineCount = count;
    formatted.headline = game[league + "_s_left" + id];
    formatted.link = game[league + "_s_url" + id];

    return formatted;
}
