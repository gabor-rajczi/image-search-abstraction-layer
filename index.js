var apiKey = process.env.API_KEY;
var cx = process.env.CX;
var port = process.env.PORT || 8080;
var mongoUrl = process.env.MONGODB;

var https = require("https");
var express = require("express");
var client = require("mongodb").MongoClient;
var app = express();

function getSearchResult(serachURL, onError, onEnd) {
    https.get(serachURL, function(res){
    var data=[];

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



function connectToDb(runAtSucces, runAtError){
    client.connect(mongoUrl, function(err, db){
        if (err){
            runAtError(err);
        }
        else {
            runAtSucces(db);
        }
    })
}

function running(){
    console.log("App is running on port "+port+"!");
}


app.get("/api/imagesearch/:searchTerm", function(req, res){
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
    function saveSearchToDb(db){
        var objectToSave = {term: searchTerm, when: new Date().toISOString()};
        db.collection("searchTerm").insertOne(objectToSave, function(err, result){
            if (err){
                catchError(err);
            }
            db.close();
        });
    }
    getSearchResult(serachURL, catchError,parseSearchResult);
    connectToDb(saveSearchToDb, catchError);
});

app.get("/api/latest/imagesearch/", function(req, res){
    var latestTerms=[];
    function catchError(err){
        res.status(500).send(err);
    }
    function parseSearchResult(result){
        res.status(200).send(result);
    }
    function listLastTenTerm(db){
        var cursor = db.collection("searchTerm").find({}, {"limit":10}).sort({when:-1});
        cursor.each(function(err, doc){
            if (err){
                catchError(err)
            }
            else if (doc === null){
                parseSearchResult(latestTerms.map(function(value){
                    return {term: value.term, when: value.when};
                }));
            }
            else {
                latestTerms.push(doc);
            }
        });
        db.close();
    }
    connectToDb(listLastTenTerm, catchError);
});

app.listen(port, running);