var http = require("http"),
    qs = require("querystring");

module.exports = (sport, req, res) {

    requestFromESPN("mlb", function(err, games) {
        if (err) {
            res.writeHead(500, { "Content-Type" : "text/plain" });
            res.end("SERVER ERROR\n");
        } else {
            res.writeHead(200, { "Content-Type" : "text/json" });
            res.end(JSON.stringify(games));
        }
    });
}

function requestFromESPN (league, cb) {
        
    var path = "/bottomline/scores",
        options = {
            hostname: "sports.espn.go.com",
            path: "/" + league + path,
            port: 80,
            method: "GET"
        },
        gameReq;

    gameReq = http.request(options, (gameRes) => {

        var data = "";
        gameRes.setEncoding("utf8");
        gameRes.on("data", (chunk) => {
            data += chunk;
        });
        gameRes.on("end", () => {
            var games = getGames(qs.parse(data), league);
            cb(null, games);
        });
    });

    gameReq.on("error", (error) => {
        cb(error);
    });

    gameReq.end();
}

function getGames (data, league) {

    var count,
        totalCount = parseInt(data[league + "_s_count"]),
        keys = Object.keys(data),
        games = [];

    for (count = 0; count < totalCount; count += 1) {

        (function () {

            var game = { _id: count + 1 },
                match,
                kIndex = 0,
                key;

            match = new RegExp("^" + league + "_s_(url|left|right)" + (count + 1).toString() + "(_|$)");

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
        })()
    }
    return games;
}

function formatGame(game,league) {

    var formatted = {},
        id = game._id,
        count = parseInt(game[league + "_s_right" + id + "_count"]),
        i;
    
    for (i = 0; i < count; i += 1) {
        formatted["p" + (i + 1)] = game[league+ "_s_right" + id + "_" + (i + 1)];
    }
    formatted.lineCount = count;
    formatted.headline = game[league+"_s_left" + id];
    formatted.link = game[league+"_s_url" + id];

    return formatted;
}
