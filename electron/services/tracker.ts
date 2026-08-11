//@ts-nocheck
import { captureScreen } from "./screenshot"
import { uploadScreenshot } from "./uploader"
import fs from "fs"

let interval: NodeJS.Timeout | null = null
let activeAttendanceId: string | null = null

const TEST_INTERVAL = 10 * 1000 // 🔥 10 seconds for testing

export function startTracking(attendanceId: string) {
  if (interval) {
    console.log("⚠️ Tracking already running")
    return
  }

  console.log("🚀 Tracking started")
  activeAttendanceId = attendanceId

  interval = setInterval(async () => {
    try {
      if (!activeAttendanceId) return

      console.log("⏱ Taking screenshot at", new Date().toLocaleTimeString())

      const filePath = await captureScreen()

      await uploadScreenshot(filePath, activeAttendanceId)

      // optional: delete temp file after upload
      fs.unlinkSync(filePath)

      console.log("🗑 Temp file deleted")
    } catch (err) {
      console.log("❌ Tracking error:", err)
    }
  }, TEST_INTERVAL)
}

export function stopTracking() {
  if (interval) {
    clearInterval(interval)
    interval = null
    activeAttendanceId = null
    console.log("🛑 Tracking stopped")
  }
}