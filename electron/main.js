const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron')
const path = require('path')
const http = require('http')
const { spawn } = require('child_process')

let mainWindow = null
let tray = null
let nextServerProcess = null
const NEXT_PORT = 3210

// ─── First-run DB setup ───
function ensureDatabase() {
  const dbDir = path.join(app.getPath('userData'), 'db')
  const fs = require('fs')
  const dbPath = path.join(dbDir, 'custom.db')

  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

  // Create empty DB file if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    fs.closeSync(fs.openSync(dbPath, 'w'))
  }

  return dbPath
}

// ─── Poll until the Next.js server responds ───
function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.resume()
        resolve()
      })
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Next.js server did not start in time'))
        } else {
          setTimeout(tryOnce, 300)
        }
      })
    }
    tryOnce()
  })
}

// ─── Launch the bundled standalone Next.js server ───
function startNextServer() {
  return new Promise((resolve, reject) => {
    const dbPath = ensureDatabase()

    const standaloneRoot = app.isPackaged
      ? path.join(process.resourcesPath, 'standalone')
      : path.join(__dirname, '..', '.next', 'standalone')
    const serverEntry = path.join(standaloneRoot, 'server.js')

    if (!require('fs').existsSync(serverEntry)) {
      reject(new Error(
        `Next.js standalone server not found at:\n${serverEntry}\n\n` +
        `Run "npm run build" (with output: 'standalone' in next.config.ts) before starting/packaging the desktop app.`
      ))
      return
    }

    nextServerProcess = spawn(process.execPath, [serverEntry], {
      cwd: standaloneRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(NEXT_PORT),
        HOSTNAME: '127.0.0.1',
        DATABASE_URL: `file:${dbPath}`,
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: 'pipe',
    })

    nextServerProcess.stdout.on('data', (d) => console.log('[Next]', d.toString().trim()))
    nextServerProcess.stderr.on('data', (d) => console.error('[Next]', d.toString().trim()))
    nextServerProcess.on('error', (err) => reject(err))
    nextServerProcess.on('exit', (code) => {
      console.log('[ServingSync] Next.js server exited with code', code)
    })

    waitForServer(`http://127.0.0.1:${NEXT_PORT}`).then(resolve).catch(reject)
  })
}

function stopNextServer() {
  if (nextServerProcess && !nextServerProcess.killed) {
    nextServerProcess.kill()
    nextServerProcess = null
  }
}

// ─── Window Management ───
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'ServingSync POS — Restaurant Management',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
  } else {
    try {
      await startNextServer()
      mainWindow.loadURL(`http://127.0.0.1:${NEXT_PORT}`)
    } catch (err) {
      console.error('[ServingSync] Failed to start:', err)
      const { dialog } = require('electron')
      dialog.showErrorBox('ServingSync failed to start', String(err && err.message ? err.message : err))
      app.quit()
      return
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: '🍽️ Open ServingSync', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: '❌ Quit', click: () => { app.isQuitting = true; app.quit() } },
  ])
  tray.setToolTip('ServingSync POS')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

// ─── App Lifecycle ───
app.whenReady().then(async () => {
  await createWindow()
  if (app.isPackaged) createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
  stopNextServer()
})
