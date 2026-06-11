import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerThumbnailHandlers } from '../handlers/thumbnail-handlers'

// Mock fs so we don't touch disk
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

import * as fs from 'fs'

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

  describe('cache read/write', () => {
    it('get-cached-thumbnail returns null when no cache hit', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const result = await ipc.invoke('get-cached-thumbnail', '/absolute/test.jpg')
      expect(result).toBeNull()
    })

    it('get-cached-thumbnail returns cached data', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('data:image/jpeg;base64,abc')
      const result = await ipc.invoke('get-cached-thumbnail', '/absolute/test.jpg')
      expect(result).toBe('data:image/jpeg;base64,abc')
    })

    it('cache-thumbnail writes to disk', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.writeFileSync).mockImplementation(() => {})
      const result = await ipc.invoke('cache-thumbnail', '/absolute/test.jpg', 'data:image/jpeg;base64,abc')
      expect(result).toBe(true)
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('get-cached-thumbnail rejects relative paths', async () => {
      await expect(ipc.invoke('get-cached-thumbnail', 'relative/test.jpg')).rejects.toThrow('Invalid file path')
    })

    it('cache-thumbnail rejects relative paths', async () => {
      await expect(ipc.invoke('cache-thumbnail', 'relative/test.jpg', 'data:x')).rejects.toThrow('Invalid file path')
    })
  })
})
