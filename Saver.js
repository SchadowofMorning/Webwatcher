var saver = module.exports;
const fs = require('fs')
const request = require('request')
var index = require('./index.json')
saver.SaveLink = function(url, name){
    var page = request(url)
    var pageobj = {"Name":"" , "URL":""}
    var file = fs.createWriteStream(__dirname + "/savedpages/" + name + ".html")
    pageobj.Name = name;
    pageobj.URL = url;
    fs.writeFile( "./index.json", JSON.stringify(pageobj), function(err){
      if(err) throw err;
    })
    page.pipe(file)
}
