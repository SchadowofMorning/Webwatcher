var saver = module.exports;
const fs = require('fs')
const request = require('request')
const DataStore = require('nedb')

saver.SaveLink = function(url, name){
    var page = request(url)
    var file = fs.createWriteStream(__dirname + "/savedpages/" + name + ".html")
    page.pipe(file)
}
