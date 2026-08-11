import { defineConfig } from "electron-vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  main: {
    entry: "electron/main/index.ts",
    outDir: "dist-electron/main"
  },
  preload: {
    entry: "electron/preload/index.ts",
    outDir: "dist-electron/preload"
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "dist"
    }
  }
})