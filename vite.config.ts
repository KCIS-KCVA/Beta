import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function discoverHtmlInputs(): Record<string, string> {
  const inputs: Record<string, string> = {}
  const addPage = (key: string, relativePath: string) => {
    const absolutePath = path.resolve(rootDir, relativePath)
    if (fs.existsSync(absolutePath)) inputs[key] = absolutePath
  }

  addPage('main', 'index.html')
  addPage('events-index', 'events/index.html')
  addPage('about', 'about/index.html')
  addPage('media-hub', 'media-hub/index.html')
  addPage('sponsorship', 'sponsorship/index.html')
  addPage('404', '404.html')

  const eventsRoot = path.resolve(rootDir, 'events')
  if (fs.existsSync(eventsRoot)) {
    fs.readdirSync(eventsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((entry) => {
        const pagePath = path.join(eventsRoot, entry.name, 'index.html')
        if (fs.existsSync(pagePath)) {
          inputs[`event-${entry.name}`] = pagePath
        }
      })
  }

  return inputs
}

function copyEventStaticAssets(): Plugin {
  return {
    name: 'kcva-copy-event-static-assets',
    apply: 'build',
    closeBundle() {
      const eventsRoot = path.resolve(rootDir, 'events')
      const distEvents = path.resolve(rootDir, 'dist/events')
      if (!fs.existsSync(eventsRoot)) return

      fs.readdirSync(eventsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .forEach((entry) => {
          const sourceDir = path.join(eventsRoot, entry.name)
          if (!fs.existsSync(path.join(sourceDir, 'index.html'))) return

          const targetDir = path.join(distEvents, entry.name)
          fs.mkdirSync(targetDir, { recursive: true })

          ;['event-data.json', 'session-hero-image.png', 'sponsors.png'].forEach((file) => {
            const source = path.join(sourceDir, file)
            if (fs.existsSync(source)) {
              fs.copyFileSync(source, path.join(targetDir, file))
            }
          })
        })
    },
  }
}

export default defineConfig({
  publicDir: 'public',
  plugins: [copyEventStaticAssets()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: discoverHtmlInputs(),
    },
  },
})
