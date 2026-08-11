//@ts-nocheck
import { app, BrowserWindow,ipcMain } from "electron"
import path from "path"

import { startTracking, stopTracking } from "./services/tracker"

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true
    }
  })

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:3001")
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"))
  }
}


let previewWindow: BrowserWindow | null = null

function openPreview(filePath: string) {
  if (!previewWindow) {
    previewWindow = new BrowserWindow({
      width: 800,
      height: 600,
    })
  }

  previewWindow.loadURL(`file://${filePath}`)
}

ipcMain.handle("tracking:start", (_, attendanceId) => {
  startTracking(attendanceId)
})

ipcMain.handle("tracking:stop", () => {
  stopTracking()
})


app.whenReady().then(createWindow)