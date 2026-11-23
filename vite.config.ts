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
  addPage('about-kcva', 'about-kcva/index.html')
  addPage('sponsorship', 'sponsorship/index.html')
  addPage('shop', 'shop/index.html')
  addPage('404', '404.html')

  const aboutRoot = path.resolve(rootDir, 'about-kcva')
  if (fs.existsSync(aboutRoot)) {
    fs.readdirSync(aboutRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((entry) => {
        const pagePath = path.join(aboutRoot, entry.name, 'index.html')
        if (fs.existsSync(pagePath)) {
          inputs[`profile-${entry.name}`] = pagePath
        }
      })
  }

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


function directoryTrailingSlashPlugin(): Plugin {
  const redirect = (req: any, res: any, next: () => void) => {
    if (!req.url || (req.method !== 'GET' && req.method !== 'HEAD')) {
      next()
      return
    }
    let pathname = ''
    let search = ''
    try {
      const url = new URL(req.url, 'http://localhost')
      pathname = decodeURIComponent(url.pathname)
      search = url.search
    } catch (error) {
      next()
      return
    }
    if (pathname === '/' || pathname.endsWith('/') || path.extname(pathname)) {
      next()
      return
    }
    const normalized = pathname.replace(/^\/+/, '')
    const candidate = path.resolve(rootDir, normalized, 'index.html')
    if (!candidate.startsWith(rootDir + path.sep) || !fs.existsSync(candidate)) {
      next()
      return
    }
    res.statusCode = 301
    res.setHeader('Location', pathname + '/' + search)
    res.end()
  }

  return {
    name: 'kcva-directory-trailing-slash',
    configureServer(server) {
      server.middlewares.use(redirect)
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect)
    },
  }
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

          ;['event-data.json', 'session-hero-image.png'].forEach((file) => {
            const source = path.join(sourceDir, file)
            if (fs.existsSync(source)) {
              fs.copyFileSync(source, path.join(targetDir, file))
            }
          })
        })

      const leadershipSource = path.resolve(rootDir, 'about-kcva/leadership.json')
      const leadershipTarget = path.resolve(rootDir, 'dist/about-kcva/leadership.json')
      if (fs.existsSync(leadershipSource)) {
        fs.mkdirSync(path.dirname(leadershipTarget), { recursive: true })
        fs.copyFileSync(leadershipSource, leadershipTarget)
      }
    },
  }
}

export default defineConfig({
  publicDir: 'public',
  plugins: [directoryTrailingSlashPlugin(), copyEventStaticAssets()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: discoverHtmlInputs(),
    },
  },
})
