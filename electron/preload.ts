//@ts-nocheck
import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("tracking", {
  start: (attendanceId: string) =>
    ipcRenderer.invoke("tracking:start", attendanceId),
  stop: () => ipcRenderer.invoke("tracking:stop"),
})