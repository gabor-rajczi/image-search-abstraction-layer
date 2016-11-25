var apiKey = process.env.API_KEY;
var cx = process.env.CX;
var port = process.env.PORT || 8080;

var https = require("https");
var express = require("express");
var app = express();

function getSearchResult(serachURL, onError, onEnd) {
    https.get(serachURL, function(res){
    var data=[];
    //console.log('statusCode:', res.statusCode);
    //console.log('headers:', res.headers);
    
    res.on('data', function(d){
        data.push(d);
    });
    res.on('end', function(){
        var result = JSON.parse(data.join(""));
        if (result.items){
            result = result.items.map(function(value){
                return {
                    url: value.link,
                    snippet: value.snippet,
                    context: value.image.contextLink,
                };
            });
        }
        onEnd(result);
      });
    }).on('error', onError);
}

function running(){
    console.log("App is running on port "+port+"!");
}


app.get("/:searchTerm", function(req, res){
    var searchTerm = req.params.searchTerm;
    var q = encodeURI(searchTerm);
    var serachURL = "https://www.googleapis.com/customsearch/v1?key="+apiKey+"&cx="+cx+"&searchType=image&fields=items(link,snippet,image/contextLink),searchInformation/totalResults&q="+q;

    if (req.query.offset){
        var start = req.query.offset;
        serachURL+="&start="+start;
    }
    function catchError(err){
        res.status(500).send(err);
    }
    function parseSearchResult(result){
        res.status(200).send(result);
    }
    getSearchResult(serachURL, catchError,parseSearchResult);
});


app.listen(port, running);