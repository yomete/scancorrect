import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted — define the mock object inside the factory, then
// retrieve it via the module in each test.
vi.mock('electron-updater', () => {
  const mockAutoUpdater = {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    checkForUpdates: vi.fn().mockResolvedValue(null),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
  }
  return { autoUpdater: mockAutoUpdater }
})

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

// Import after mocks are registered
import { initAutoUpdater } from '../updater'
import { autoUpdater } from 'electron-updater'
import { app } from 'electron'

const mockAutoUpdater = autoUpdater as unknown as {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  checkForUpdates: ReturnType<typeof vi.fn>
  quitAndInstall: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
}

const mockApp = app as unknown as { isPackaged: boolean }

describe('initAutoUpdater', () => {
  const getMainWindow = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockAutoUpdater.autoDownload = false
    mockAutoUpdater.autoInstallOnAppQuit = false
    mockApp.isPackaged = false
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
    mockApp.isPackaged = true
    process.env.NODE_ENV = 'production'

    const fakeWindow = { webContents: { send: vi.fn() } }
    getMainWindow.mockReturnValue(fakeWindow)

    initAutoUpdater(getMainWindow)

    const updateDownloadedCall = mockAutoUpdater.on.mock.calls.find(
      ([event]: [string]) => event === 'update-downloaded'
    )
    expect(updateDownloadedCall).toBeDefined()

    const listener = updateDownloadedCall![1] as (info: { version: string }) => void
    listener({ version: '0.4.0' })

    expect(fakeWindow.webContents.send).toHaveBeenCalledWith('update-ready', '0.4.0')
  })

  it('does not throw when mainWindow is null on update-downloaded', () => {
    mockApp.isPackaged = true
    process.env.NODE_ENV = 'production'

    getMainWindow.mockReturnValue(null)

    initAutoUpdater(getMainWindow)

    const updateDownloadedCall = mockAutoUpdater.on.mock.calls.find(
      ([event]: [string]) => event === 'update-downloaded'
    )
    expect(updateDownloadedCall).toBeDefined()

    const listener = updateDownloadedCall![1] as (info: { version: string }) => void
    expect(() => listener({ version: '0.4.0' })).not.toThrow()
  })
})
