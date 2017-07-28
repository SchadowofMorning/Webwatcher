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
const request = require('request')
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let $ = require('jquery');

//Data Storage
var DataPath = "./";
var index = new DataStore({filename: DataPath + "/index", autoload: true});
//Logic
ipcMain.on('update-config', (event, path) =>{

  dialog.showOpenDialog({properties:['openDirectory']}, function(folderPath){
    index.update({type:"UserSettings"}, {$set: {DataPath: folderPath}}, function(err, updateconf){
      if(err) throw err;
    })
    console.log(folderPath);
    event.sender.send('SetPath', folderPath);
    DataPath = folderPath;
  })
})
ipcMain.on('save', (event, page) =>{
    /*var html = request(page.URL);
    console.log(html);
        jetpack.write("./" + page.Name + ".html", html)
*/
    request.get(page.URL).pipe(jetpack.createWriteStream('./savedpages/' + page.Name + '.html'))
    var insertjson = {
      "Changes": false,
      "type": "website"
    }
    insertjson.Name = page.Name;
    insertjson.URL = page.URL;
    index.insert(insertjson);
    event.sender.send('page', insertjson)
  })
ipcMain.on('compare', (event, arg) => {
  index.find({"type":"website"}, function(err, docs){
    for(i = 0; i < docs.length; i++){
      var cdoc = docs[i];
      var data = fs.readFileSync("./savedpages/" + cdoc.Name + ".html");
        var page = request(cdoc.URL, function(err, resp, body){
          console.log(body);
          if(data == body){
            index.update({_id: cdoc.ID}, {$set: {Changes:false}}, function(err, updateval){
              if(err) throw err;
              event.sender.send('update-false', cdoc.Name + "-changescell")
            })
          } else {
            index.update({_id: cdoc.ID}, {$set: {Changes:true}}, function(err, updateval){
              if(err) throw err;
              event.sender.send('update-true', cdoc.Name + "-changescell")
            })
          }
          })

    }
  })
})
ipcMain.on('init', (event, arg) => {

  index.find({type:"UserSettings"}, function(err, docs){
      if(docs.length == 0){
        index.insert({type:"UserSettings", DataPath:"./"})
      } else {
        event.sender.send('SetPath', docs.DataPath)
      }
  })
  index.find({type:"website"}, function(err, docs){
    if(err) throw err;
    for(i = 0; i < docs.length; i++){
      event.sender.send('page', docs[i]);
    }
  })




})
//End Logic

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600, icon:"./Webwatcher.ico"})
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
