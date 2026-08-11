//@ts-nocheck
import screenshot from "screenshot-desktop"
import fs from "fs"
import path from "path"
import { app } from "electron"

export async function captureScreen(): Promise<string> {
  console.log("📸 Capturing screen...")

  const image = await screenshot({ format: "png" })

  const filePath = path.join(
    app.getPath("temp"),
    `screen-${Date.now()}.png`
  )

  fs.writeFileSync(filePath, image)

  const stats = fs.statSync(filePath)

  console.log("✅ Screenshot saved:", filePath)
  console.log("📦 File size:", (stats.size / 1024).toFixed(2), "KB")

  return filePath
}