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

//Data Storage
var DataPath = app.getPath('documents');
var index = new DataStore({filename: DataPath + "/savedpages/index", autoload: true});
//Logic
ipcMain.on('remove', (event, name) => {
  Delete(name);
  event.sender.send('removed-doc', name);
})
ipcMain.on('save', (event, page) => {
  index.findOne({"Name": page.Name}, function(err, doc){
    if(doc){
      event.sender.send('doc-exists')
    } else {
      Save(page, function(insertjson){
      event.sender.send('page', insertjson)
      });
    }
  })
  })


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
ipcMain.on('init', (event, arg) => {
  jetpack.dir(DataPath + "/savedpages")
  index.find({type:"website"}, function(err, docs){
    if(err) throw err;
    for(i = 0; i < docs.length; i++){
      event.sender.send('page', docs[i]);
    }
  })
})
//End Logic
//Functions
function Delete(name){
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
function Search(doc, searcharray, callback){
  request('GET', doc.URL).done(function(res){
    data = fs.readFileSync(DataPath + "/savedpages/" + doc.Name + ".html", 'utf8')
    for(i = 0; i < searcharray.length; i++){
      if(data.search(searcharray[i]) > -1){
        callback(false);
      } else {
        callback(true);
      }
    }
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
  mainWindow = new BrowserWindow({width: 600, height: 600, icon:"./Webwatcher.ico"})
  mainWindow.$ = $;
  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
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
