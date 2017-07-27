const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const {ipcMain, webContents} = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')
const http = require('http')
const saver = require('./Saver.js')
var DataStore = require('nedb')
const request = require('request')
const folder = "./"
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
//Data Storage
fs.readdirSync(folder, (err, files) =>{

})
var index = new DataStore({filename: folder + "/index", autoload: true});

//Logic
ipcMain.on('save', (event, page) =>{
  saver.SaveLink(page.uri, page.name)
  index.insert({Name: page.name, URL: page.uri, Changes: false, type:"website"})
  event.sender.send('page', {"Name": page.name, "URL": page.uri, Changes: false})
})
ipcMain.on('compare', (event, arg) => {
  index.find({"type":"website"}, function(err, docs){
    for(i = 0; i < docs.length; i++){
      console.log(docs[i]);
      var filename = docs[i].Name;
      var url = docs[i].URL;
      var ID = docs[i]._id;
      var data = fs.readFileSync(__dirname + "/savedpages/" + filename + ".html");
        console.log(data);
        var page = request(url, function(err, resp, body){
          console.log(body);
          if(data == body){
            index.update({_id: ID}, {$set: {Changes:false}}, function(err, updateval){
              if(err) throw err;
              event.sender.send('update-false', filename + "-changescell")
            })
          } else {
            index.update({_id: ID}, {$set: {Changes:true}}, function(err, updateval){
              if(err) throw err;
              event.sender.send('update-true', filename + "-changescell")
            })
          }
        })

    }
  })
})
ipcMain.on('init', (event, arg) => {

  index.findOne({type:"UserSettings"}, function(err, doc){
      if(doc == null){
        index.insert({type:"UserSettings", DataPath:"./"})
      } else {
        event.sender.send('SetupUser', doc)
      }
  })
  index.find({type:"website"}, function(err, docs){
    if(err) throw err;
    console.log(docs)
    for(i = 0; i < docs.length; i++){
      event.sender.send('page', docs[i]);
    }
  })




})
//End Logic

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600, icon:"./Webwatcher.ico"})

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
