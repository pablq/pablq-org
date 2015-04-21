var http = require("http"),
    path = require("path"),
    fs = require("fs"),
    port = Number(process.env.PORT || 5000);

var requestHandler = function (req, res) {

    if (req.method !== "GET") {

        res.writeHead(501, { "Content-Type" : "text/plain" });
        res.end("CANNOT " + req.method + "\n");

    } else {

        var filePath;

        if (req.url === "/")
            filePath = "./index.html";
        else
            filePath = "." + req.url;

        switch (path.extname(filePath)) {
            case ".gif":
                contentType = "image/gif";
                break;
            case ".png":
                contentType = "image/png";
                break;
            case ".js":
                contentType = "text/javascript";
                break;
            case ".css":
                contentType = "text/css";
                break;
            case ".txt":
                contentType = "text/plain";
                break;
            case ".pdf":
                contentType = "application/pdf";
                break;
            default:
                contentType = "text/html";
        }

        fs.exists(filePath, function(exists) {
            
            if (exists) {

                fs.readFile(filePath, function(err, content) {
                    
                    if (err) {
                        
                        res.writeHead(500, { "Content-Type" : "text/plain" });
                        res.end("SERVER ERROR\n");

                    } else {

                        console.log("Serving:", filePath.replace("./",""));
                        res.writeHead(200, { "Content-Type" : contentType });
                        res.end(content);
                    }
                });

            } else {

                res.writeHead(404, { "Content-Type" : "text/plain" });
                res.end("FILE NOT FOUND\n");
            }
        });
    }
}

http.createServer(requestHandler).listen(port);
