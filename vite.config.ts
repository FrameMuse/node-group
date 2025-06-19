import path from "path"
import { defineConfig } from "vite"
import { externalizeDeps } from "vite-plugin-externalize-deps"


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [externalizeDeps({ peerDeps: true })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: false,
    outDir: "build",
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: "./src/index.ts",
      formats: ["es"],
      fileName: "index"
    }
  },
  esbuild: {
    treeShaking: true,
    minifyIdentifiers: false,
    keepNames: false
  },
})
