const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const {ipcMain, webContents, dialog} = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')
const jetpack = require('fs-jetpack');
const http = require('http')
var DataStore = require('nedb')
const request = require('then-request')
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let $ = require('jquery');
var SearchStringExists = false;
//Data Storage
var DataPath = app.getPath('documents');
var index = new DataStore({filename: DataPath + "/savedpages/index", autoload: true});
//Events

//Remove Document Event
ipcMain.on('remove', (event, name) => {
  Delete(name);
  event.sender.send('removed-doc', name);
})
//Save Document Event
ipcMain.on('save', (event, page) => {
  index.findOne({"Name": page.Name}, function(err, doc){
    if(doc){
      event.sender.send('error-msg', 'Name bereits vergeben');
    } else {
      Save(page, function(insertjson){
      event.sender.send('page', insertjson)
      });
    }
  })
  })
  //Save Search String Event
  ipcMain.on('save-search', (event, searchstr) => {
    var searchstring = searchstr;
    index.findOne({type:"searchobject"}, function(err, res){
      if(err) throw err;
      if(res){
        index.update({_id: res._id}, {$set: {"SearchString": searchstring} }, function(err, numReplaced){
          if(err) throw err;
          console.log(numReplaced);
        })
      } else {
        index.insert({"type":"searchobject", "SearchString": searchtring});
        console.log(searchstr);
      }
    })
  })

  //Search Event
ipcMain.on('search', (event, arg) => {
  index.find({"type":"website"}, function(err, results){
    if(err) throw err;
    var doc = {};
    for(i=0; i < results.length; i++ ){
      Search(results[i], function(name, hits){
        if(hits === false){
          event.sender.send("hit", "Die Suchwerte müssen erst gespeichert werden");
        } else {
          doc.hits = hits;
          doc.Name = name;
          event.sender.send('hit', doc);
          }
        })

    }
  })
})
//Compare Event
ipcMain.on('compare', (event, arg) => {
  index.find({"type":"website"}, function(err, docs){
    for(i = 0; i < docs.length; i++){
      Compare(docs[i], function(val, name){
        if(val == true){
          event.sender.send('update-true', name + "-changescell")
        } else {
          event.sender.send('update-false', name + "-changescell")
        }
      })
      }
    })
  })
//Initialization Event
ipcMain.on('init', (event, arg) => {
  jetpack.dir(DataPath + "/savedpages")
  index.find({type:"website"}, function(err, docs){
    if(err) throw err;
    for(i = 0; i < docs.length; i++){
      event.sender.send('page', docs[i]);
    }
  })
  index.findOne({type:"searchobject"}, function(err, doc){
    if(doc == null){
      index.insert({type:"searchobject"});
    } else {
      event.sender.send('searchobject', doc.SearchString);
    }
  })
})

//End Events
//Functions
function Delete(name){
  jetpack.remove(DataPath + "/savedpages/" + name + ".html");
  index.remove({"type":"website", "Name": name}, {}, function(err, numRemoved){
    if(err) throw err;
    console.log("Entry Removed:" + name);
  })
}
function Save(page, cb){
  request('GET', page.URL).done(function(res) {
    jetpack.write(DataPath + '/savedpages/' + page.Name + '.html', res.getBody());
    var insertjson = {
      "Changes": false,
      "type": "website"
    }
    insertjson.Date = Date();
    insertjson.Name = page.Name;
    insertjson.URL = page.URL;
    index.insert(insertjson);
    cb(insertjson);
  })
}
function Search(doc, callback){
  var data;
  var searcharray;
  request('GET', doc.URL).done(function(res){
    data = String(res.getBody());
    data = data.toLowerCase();
    index.findOne({"type":"searchobject"}, function(err, searchdoc){
      if(err) throw err;
      if(searchdoc == null){
        console.log("Creating Entry:SearchString");
        index.insert({"type":"searchobject","SearchString":""});
        callback(false);
      } else {
        searcharray = searchdoc.SearchString.toLowerCase().split(",");
        console.log("searcharray:" + searcharray);
        for(i = 0; i < searcharray.length; i++){
          var searchresult = data.search(searcharray[i]);
          console.log("word:" + searcharray[i]);
          console.log("times:" + searchresult);
          if(searchresult > -1){
            callback(doc.Name, true);
          } else {
            callback(doc.Name, 0);
          }
        }
      }
    })
  })
}
function Compare(doc, cb){
  request('GET', doc.URL).done(function(res) {
    data = jetpack.read(DataPath + "/savedpages/" + doc.Name + ".html", 'utf8');
    if(data == res.getBody()){
      index.update({"Name": doc.Name}, {$set: {Changes:false}}, function(err, updateval){
        if(err) throw err;
        console.log(doc.Name);
        cb(false, doc.Name);
      })
    } else {
      index.update({"Name": doc.Name}, {$set: {Changes:true}}, function(err, updateval){
        if(err) throw err;
        console.log(doc.Name);
        cb(true, doc.Name);
        request('GET', doc.URL).done(function(result){
          jetpack.remove(DataPath + "/savedpages/" + doc.Name + ".html")
          jetpack.write(DataPath + '/savedpages/' + doc.Name + '.html', result.getBody());
        })
      })
    }
  })
}

//End Functions
function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1140, height: 600, icon:"./Webwatcher.ico", frame: false})
  mainWindow.$ = $;
  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, '/webapp/index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
