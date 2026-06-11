import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerMiscHandlers } from '../handlers/misc'

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

describe('registerMiscHandlers', () => {
  let ipc: ReturnType<typeof makeFakeIpc>
  let store: ReturnType<typeof makeStore>
  let forceCloseValue: boolean

  beforeEach(() => {
    vi.clearAllMocks()
    ipc = makeFakeIpc()
    store = makeStore({})
    forceCloseValue = false

    registerMiscHandlers({
      ipcMain: ipc.ipcMain as any,
      getStore: () => store as any,
      getMainWindow: () => null,
      getForceCloseWindow: () => forceCloseValue,
      setForceCloseWindow: (v) => { forceCloseValue = v },
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
})
