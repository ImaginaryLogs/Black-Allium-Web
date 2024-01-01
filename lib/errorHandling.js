import * as process from 'process';

function logger(req, res, err, isReveal, customMessage){
    if (isReveal){
        var color = "\u001b[0;15m"
        var reqMethod = req.method;
        switch(reqMethod)
        {
            case "GET":
                color = "\u001b[1;32m";
                break;
            case "POST":
                color = "\u001b[1;33m";
                break;
            case "PUT":
                color = "\u001b[1;36m";
                break;
            case "DELETE":
                color = "\u001b[1;31m";
                break;
        }
        var baseURL = req.baseUrl;
        if (baseURL == "")
        {
            baseURL = "/pub";
        }
        console.log("\u001b[0;33m"+baseURL, color +`${reqMethod}`, "\u001b[0;15m" + req.originalUrl);
        if (reqMethod == "POST") {
            console.log("\u001b[0;33m"+" \\->REQ:", "\u001b[0;15m");
            console.log(req.body);
        }
        if (res.statusCode == 200) {
            if (customMessage != ""){
                console.log("\u001b[0;32m"+" \\->RES:", "\u001b[0;15m" + customMessage);
            } else {
                console.log("\u001b[0;32m"+" \\->RES:", "\u001b[0;15m" + req.path.substr(req.path.lastIndexOf('/') + 1));
            }
        } else {
            console.log("\u001b[1;31m"+` \\->ERR (${res.statusCode}):`, "\u001b[0;15m" + err.message)
            console.error("\n", err);
        }
    }
}

export default logger;

