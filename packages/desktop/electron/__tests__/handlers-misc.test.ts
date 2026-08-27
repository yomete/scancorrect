import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as nodePath from 'path'

vi.mock('../updater', () => ({
  isUpdateDownloaded: vi.fn(),
}))

vi.mock('electron-updater', () => ({
  autoUpdater: { quitAndInstall: vi.fn() },
}))

import { registerMiscHandlers } from '../handlers/misc'
import { isUpdateDownloaded } from '../updater'
import { autoUpdater } from 'electron-updater'

const mockIsUpdateDownloaded = vi.mocked(isUpdateDownloaded)
const mockQuitAndInstall = vi.mocked(autoUpdater.quitAndInstall)
const mockQuitApp = vi.fn()

function makeFakeIpc() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  const ipcMain = {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) => {
      handlers.set(channel, fn)
    }
  }
  const invoke = (channel: string, ...args: unknown[]) => {
    const fn = handlers.get(channel)
    if (!fn) throw new Error(`No handler for ${channel}`)
    return fn({} as Electron.IpcMainInvokeEvent, ...args)
  }
  return { ipcMain, invoke }
}

function makeStore(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...initial }
  return {
    get: (key: string, def?: unknown) => (key in data ? data[key] : def),
    set: (key: string, val: unknown) => { data[key] = val },
    delete: (key: string) => { delete data[key] },
  }
}

describe('collect-image-paths', () => {
  let ipc: ReturnType<typeof makeFakeIpc>
  let dir: string

  beforeEach(() => {
    ipc = makeFakeIpc()
    registerMiscHandlers({
      ipcMain: ipc.ipcMain as never,
      getStore: (() => makeStore()) as never,
      getMainWindow: () => null,
      getForceCloseWindow: () => false,
      setForceCloseWindow: () => {},
      quitApp: () => {},
      dialog: {} as never,
    })
    dir = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'scancorrect-collect-'))
  })

  afterAll(() => { /* temp dirs are left to the OS */ })

  const write = (name: string, body = 'x') => {
    const p = nodePath.join(dir, name)
    fs.mkdirSync(nodePath.dirname(p), { recursive: true })
    fs.writeFileSync(p, body)
    return p
  }

  it('expands a dropped folder into the images inside it', async () => {
    write('roll/a.jpg'); write('roll/b.tif'); write('roll/notes.txt')
    const result = await ipc.invoke('collect-image-paths', [nodePath.join(dir, 'roll')]) as
      { files: string[]; folders: number; unsupported: number }

    expect(result.files).toHaveLength(2)
    expect(result.files.map((f) => nodePath.basename(f)).sort()).toEqual(['a.jpg', 'b.tif'])
    expect(result.folders).toBe(1)
    expect(result.unsupported).toBe(1)
  })

  it('counts unsupported files and ignores hidden ones', async () => {
    const jpg = write('scan.jpg')
    const raw = write('scan.NEF')
    const hidden = write('.DS_Store')
    const result = await ipc.invoke('collect-image-paths', [jpg, raw, hidden]) as
      { files: string[]; folders: number; unsupported: number }

    expect(result.files).toEqual([jpg])
    expect(result.unsupported).toBe(1)   // the NEF; never the hidden file
    expect(result.folders).toBe(0)
  })

  it('reports a path that does not exist as unsupported rather than throwing', async () => {
    const result = await ipc.invoke('collect-image-paths', [nodePath.join(dir, 'gone.jpg')]) as
      { files: string[]; unsupported: number }

    expect(result.files).toEqual([])
    expect(result.unsupported).toBe(1)
  })
})

describe('registerMiscHandlers', () => {
  let ipc: ReturnType<typeof makeFakeIpc>
  let store: ReturnType<typeof makeStore>
  let forceCloseValue: boolean

  beforeEach(() => {
    vi.clearAllMocks()
    ipc = makeFakeIpc()
    store = makeStore({})
    forceCloseValue = false
    mockIsUpdateDownloaded.mockReturnValue(false)

    registerMiscHandlers({
      ipcMain: ipc.ipcMain as any,
      getStore: () => store as any,
      getMainWindow: () => null,
      getForceCloseWindow: () => forceCloseValue,
      setForceCloseWindow: (v) => { forceCloseValue = v },
      quitApp: mockQuitApp,
      dialog: {
        showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
      } as any,
    })
  })

  describe('mapbox token', () => {
    it('get-mapbox-token returns undefined initially', async () => {
      expect(await ipc.invoke('get-mapbox-token')).toBeUndefined()
    })

    it('set-mapbox-token stores the token', async () => {
      await ipc.invoke('set-mapbox-token', 'pk.abc123')
      expect(store.get('mapboxAccessToken')).toBe('pk.abc123')
    })

    it('set-mapbox-token with undefined deletes the token', async () => {
      store.set('mapboxAccessToken', 'pk.abc123')
      await ipc.invoke('set-mapbox-token', undefined)
      expect(store.get('mapboxAccessToken')).toBeUndefined()
    })

    it('get-mapbox-token returns stored token', async () => {
      store.set('mapboxAccessToken', 'pk.abc123')
      expect(await ipc.invoke('get-mapbox-token')).toBe('pk.abc123')
    })
  })

  describe('last-used profile', () => {
    it('get-last-used-profile returns null initially', async () => {
      expect(await ipc.invoke('get-last-used-profile')).toBeNull()
    })

    it('set-last-used-profile stores the profile id', async () => {
      await ipc.invoke('set-last-used-profile', 'profile-1')
      expect(store.get('lastUsedProfile')).toBe('profile-1')
    })

    it('get-last-used-profile returns stored id', async () => {
      store.set('lastUsedProfile', 'profile-1')
      expect(await ipc.invoke('get-last-used-profile')).toBe('profile-1')
    })

    it('set-last-used-profile with null deletes the stored id', async () => {
      store.set('lastUsedProfile', 'profile-1')
      await ipc.invoke('set-last-used-profile', null)
      expect(store.get('lastUsedProfile')).toBeUndefined()
      expect(await ipc.invoke('get-last-used-profile')).toBeNull()
    })
  })

  describe('show-open-dialog', () => {
    it('returns undefined when mainWindow is null', async () => {
      const result = await ipc.invoke('show-open-dialog')
      expect(result).toBeUndefined()
    })
  })

  describe('force-close-window', () => {
    it('sets forceCloseWindow and calls window.close', async () => {
      const mockClose = vi.fn()
      const mockWindow = { close: mockClose }
      const ipc2 = makeFakeIpc()
      registerMiscHandlers({
        ipcMain: ipc2.ipcMain as any,
        getStore: () => store as any,
        getMainWindow: () => mockWindow as any,
        getForceCloseWindow: () => forceCloseValue,
        setForceCloseWindow: (v) => { forceCloseValue = v },
        dialog: {} as any,
      })

      await ipc2.invoke('force-close-window')
      expect(forceCloseValue).toBe(true)
      expect(mockClose).toHaveBeenCalled()
    })
  })

  describe('install-update-now', () => {
    it('does nothing when an update has not been downloaded', async () => {
      await ipc.invoke('install-update-now')

      expect(mockQuitApp).not.toHaveBeenCalled()
      expect(mockQuitAndInstall).not.toHaveBeenCalled()
    })

    it('quits rather than installing directly, so the unsaved-changes guard runs', async () => {
      mockIsUpdateDownloaded.mockReturnValue(true)

      await ipc.invoke('install-update-now')

      expect(mockQuitApp).toHaveBeenCalled()
      // quitAndInstall would skip the guard; autoInstallOnAppQuit lands the
      // update on the way down instead
      expect(mockQuitAndInstall).not.toHaveBeenCalled()
    })
  })
})
