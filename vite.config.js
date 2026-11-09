import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { generateRemap } from './src/design/generate-remap.mjs'

// Regenerate the redesign colour remap (src/design/generated/) from
// colors.json on start and whenever a source file or token file changes.
function designTokens() {
  return {
    name: 'design-tokens',
    buildStart() { generateRemap() },
    configureServer(server) {
      server.watcher.on('change', (f) => {
        if (/[\\/]src[\\/].*\.(jsx?|json)$/.test(f) && !/[\\/]generated[\\/]/.test(f)) generateRemap({ quiet: true })
      })
    },
  }
}

export default defineConfig({
  plugins: [designTokens(), react(), tailwindcss()],
  // design.html — the redesign's design-system reference page.
  build: { rollupOptions: { input: { main: 'index.html', design: 'design.html' } } },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
