//@ts-nocheck
import axios from "axios"
import fs from "fs"
import FormData from "form-data"

export async function uploadScreenshot(
  filePath: string,
  attendanceId: string
) {
  console.log("⬆️ Uploading screenshot...")

  const form = new FormData()
  form.append("screenshot", fs.createReadStream(filePath))
  form.append("attendanceId", attendanceId)

  const start = Date.now()

  const response = await axios.post(
    "YOUR_API_URL/tracking/upload",
    form,
    {
      headers: form.getHeaders(),
    }
  )

  const duration = Date.now() - start

  console.log("✅ Upload success")
  console.log("⏳ Upload time:", duration, "ms")
  console.log("📡 Server response:", response.status)
}