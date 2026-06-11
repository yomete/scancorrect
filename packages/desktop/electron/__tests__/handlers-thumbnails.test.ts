import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerThumbnailHandlers } from '../handlers/thumbnail-handlers'

// Mock the thumbnails module so we don't touch disk or electron APIs
vi.mock('../thumbnails', () => ({
  getThumbnail: vi.fn(),
}))

import { getThumbnail } from '../thumbnails'

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

describe('registerThumbnailHandlers', () => {
  let ipc: ReturnType<typeof makeFakeIpc>
  let store: ReturnType<typeof makeStore>

  beforeEach(() => {
    vi.clearAllMocks()
    ipc = makeFakeIpc()
    store = makeStore({ thumbnailCacheEnabled: true })
    registerThumbnailHandlers({
      ipcMain: ipc.ipcMain as any,
      exiftool: {} as any,
      getStore: () => store as any,
    })
  })

  describe('cache settings', () => {
    it('get-cache-setting returns store value', async () => {
      expect(await ipc.invoke('get-cache-setting')).toBe(true)
    })

    it('set-cache-setting updates the store', async () => {
      await ipc.invoke('set-cache-setting', false)
      expect(store.get('thumbnailCacheEnabled')).toBe(false)
    })
  })

  describe('extract-thumbnail delegates to getThumbnail', () => {
    it('returns data URL on success', async () => {
      vi.mocked(getThumbnail).mockResolvedValue('data:image/jpeg;base64,abc')
      const result = await ipc.invoke('extract-thumbnail', '/absolute/test.jpg')
      expect(result).toBe('data:image/jpeg;base64,abc')
      expect(getThumbnail).toHaveBeenCalledWith('/absolute/test.jpg', {}, { cacheEnabled: true })
    })

    it('passes cacheEnabled=false when store is false', async () => {
      store.set('thumbnailCacheEnabled', false)
      vi.mocked(getThumbnail).mockResolvedValue(null)
      await ipc.invoke('extract-thumbnail', '/absolute/test.jpg')
      expect(getThumbnail).toHaveBeenCalledWith('/absolute/test.jpg', {}, { cacheEnabled: false })
    })

    it('rejects relative paths', async () => {
      await expect(ipc.invoke('extract-thumbnail', 'relative/test.jpg')).rejects.toThrow('Invalid file path')
    })
  })

  describe('removed channels', () => {
    it('get-cached-thumbnail is not registered', () => {
      expect(() => ipc.invoke('get-cached-thumbnail', '/absolute/test.jpg')).toThrow('No handler for get-cached-thumbnail')
    })

    it('cache-thumbnail is not registered', () => {
      expect(() => ipc.invoke('cache-thumbnail', '/absolute/test.jpg', 'data:x')).toThrow('No handler for cache-thumbnail')
    })
  })
})
