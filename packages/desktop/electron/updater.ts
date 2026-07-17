import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'
import { app } from 'electron'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours
let updateDownloaded = false

export function isUpdateDownloaded(): boolean {
  return updateDownloaded
}

export function _resetUpdateDownloadedForTest(): void {
  updateDownloaded = false
}

function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || !app.isPackaged
}

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  // Only run in packaged production builds, and never in NSIS portable installs
  if (isDev() || process.env.PORTABLE_EXECUTABLE_DIR) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true
    const win = getMainWindow()
    if (win) {
      win.webContents.send('update-ready', info.version)
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err?.message ?? err)
  })

  // Initial check
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] initial check failed:', err?.message ?? err)
  })

  // Periodic check
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] periodic check failed:', err?.message ?? err)
    })
  }, CHECK_INTERVAL_MS)
}
