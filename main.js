'use strict';

const electron = require("electron");
const exec = require("child_process").exec;
const dialog = require("electron").dialog;
const fs = require("fs");
const sf = require("slice-file");
const ipc = electron.ipcMain;
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

ipc.on("convert", (event, arg) => {
  let seconds = 0;

  if (arg.audio && arg.image) {
    exec(`ffprobe "${arg.audio}" -show_entries stream=duration`, (error, stdout, stderr) => {
      seconds = parseFloat(stdout.match(/([0-9\.]+)$/m)[1]);
      console.log(seconds);

      // ffmpeg -progress block.txt -i path/to/input.mov -vcodec videocodec -acodec audiocodec path/to/output.flv 2>&1
      // ffmpeg -loop 1 -i image.png -i audio.mp3 -c:v libx264 -tune stillimage -c:a aac -strict experimental -b:a 192k -pix_fmt yuv420p -shortest out.mp4

      const filename = dialog.showSaveDialog(mainWindow, {
        title: "Select output filename",
        filters: [
          { name: 'H264 mp4', extensions: ["mp4"] }
        ]
      });

      if (filename) {
        fs.closeSync(fs.openSync("block.txt", "w"));

        exec(`ffmpeg -y -progress block.txt -loop 1 -i "${arg.image}" -i "${arg.audio}" -c:v libx264 -tune stillimage -c:a aac -strict experimental -b:a 192k -pix_fmt yuv420p -shortest "${filename}" 2>&1`, (error, stdout, stderr) => {
          console.log(error, stdout, stderr);

          event.sender.send("done", filename);
        });

        var xs = sf("block.txt");
        xs.follow(-11).on('data', function (chunk) {
          if (chunk.includes("out_time_ms")) {
            const secondsProgress = +chunk.toString("utf8").match(/=([0-9]+)$/m)[1] / 1000000;

            console.log(secondsProgress, "/", seconds, (secondsProgress / seconds) * 100, "%");

            event.sender.send("progress", (secondsProgress / seconds) * 100);
          }
        })
      } else {
        event.sender.send("cancel");
      }

    })
  }
});

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600});

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});
