import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron-updater before importing updater
const mockAutoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  checkForUpdates: vi.fn().mockResolvedValue(null),
  quitAndInstall: vi.fn(),
  on: vi.fn(),
}

vi.mock('electron-updater', () => ({
  autoUpdater: mockAutoUpdater,
}))

// Mock electron app
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getVersion: vi.fn().mockReturnValue('0.3.2'),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
}))

import { initAutoUpdater } from '../updater'

describe('initAutoUpdater', () => {
  const getMainWindow = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockAutoUpdater.autoDownload = false
    mockAutoUpdater.autoInstallOnAppQuit = false
    delete process.env.PORTABLE_EXECUTABLE_DIR
    process.env.NODE_ENV = 'test'
  })

  it('no-ops in dev/test mode (app.isPackaged = false)', () => {
    initAutoUpdater(getMainWindow)
    expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('no-ops when PORTABLE_EXECUTABLE_DIR is set', () => {
    process.env.PORTABLE_EXECUTABLE_DIR = '/some/dir'
    initAutoUpdater(getMainWindow)
    expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('registers update-downloaded listener that sends update-ready to window', () => {
    // Simulate packaged production build
    const { app } = require('electron')
    app.isPackaged = true
    process.env.NODE_ENV = 'production'

    const fakeWindow = { webContents: { send: vi.fn() } }
    getMainWindow.mockReturnValue(fakeWindow)

    initAutoUpdater(getMainWindow)

    // Find the update-downloaded listener registered via .on()
    const updateDownloadedCall = mockAutoUpdater.on.mock.calls.find(
      ([event]) => event === 'update-downloaded'
    )
    expect(updateDownloadedCall).toBeDefined()

    // Trigger it
    const listener = updateDownloadedCall![1]
    listener({ version: '0.4.0' })

    expect(fakeWindow.webContents.send).toHaveBeenCalledWith('update-ready', '0.4.0')

    // Reset
    app.isPackaged = false
    process.env.NODE_ENV = 'test'
  })

  it('does not send to window if mainWindow is null', () => {
    const { app } = require('electron')
    app.isPackaged = true
    process.env.NODE_ENV = 'production'

    getMainWindow.mockReturnValue(null)

    initAutoUpdater(getMainWindow)

    const updateDownloadedCall = mockAutoUpdater.on.mock.calls.find(
      ([event]) => event === 'update-downloaded'
    )
    expect(updateDownloadedCall).toBeDefined()

    // Should not throw
    const listener = updateDownloadedCall![1]
    expect(() => listener({ version: '0.4.0' })).not.toThrow()

    app.isPackaged = false
    process.env.NODE_ENV = 'test'
  })
})
