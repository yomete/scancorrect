import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerProfileHandlers } from '../handlers/profiles'

// Helper: fake ipcMain that records handlers
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

// Helper: fake store
function makeStore(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...initial }
  return {
    get: (key: string, def?: unknown) => (key in data ? data[key] : def),
    set: (key: string, val: unknown) => { data[key] = val },
    delete: (key: string) => { delete data[key] },
    _data: data,
  }
}

describe('registerProfileHandlers', () => {
  let ipc: ReturnType<typeof makeFakeIpc>
  let store: ReturnType<typeof makeStore>

  beforeEach(() => {
    ipc = makeFakeIpc()
    store = makeStore({
      profiles: [],
      customValues: { isoValues: [], apertureValues: [], shutterSpeeds: [], focalLengths: [] },
      processingLog: [],
    })
    registerProfileHandlers({ ipcMain: ipc.ipcMain as any, getStore: () => store as any })
  })

  describe('profiles', () => {
    it('get-profiles returns empty array initially', async () => {
      const result = await ipc.invoke('get-profiles')
      expect(result).toEqual([])
    })

    it('save-profile adds a new profile', async () => {
      const profile = { id: 'p1', name: 'Canon FM', make: 'Canon', model: 'FM' }
      await ipc.invoke('save-profile', profile)
      const profiles = await ipc.invoke('get-profiles')
      expect(profiles).toEqual([profile])
    })

    it('save-profile updates an existing profile', async () => {
      const profile = { id: 'p1', name: 'Canon FM', make: 'Canon', model: 'FM' }
      await ipc.invoke('save-profile', profile)
      const updated = { ...profile, name: 'Canon FM Updated' }
      await ipc.invoke('save-profile', updated)
      const profiles = await ipc.invoke('get-profiles') as unknown[]
      expect(profiles).toHaveLength(1)
      expect((profiles[0] as any).name).toBe('Canon FM Updated')
    })

    it('delete-profile removes a profile', async () => {
      const profile = { id: 'p1', name: 'Canon FM', make: 'Canon', model: 'FM' }
      await ipc.invoke('save-profile', profile)
      await ipc.invoke('delete-profile', 'p1')
      const profiles = await ipc.invoke('get-profiles')
      expect(profiles).toEqual([])
    })
  })

  describe('processing log', () => {
    it('get-processing-log returns empty array initially', async () => {
      const result = await ipc.invoke('get-processing-log')
      expect(result).toEqual([])
    })

    it('add-log-entry prepends to the log', async () => {
      const entry = { id: 'e1', timestamp: '2024-01-01', filePath: '/a.jpg', filename: 'a.jpg', changesApplied: {}, success: true }
      await ipc.invoke('add-log-entry', entry)
      const log = await ipc.invoke('get-processing-log') as unknown[]
      expect(log).toHaveLength(1)
      expect(log[0]).toEqual(entry)
    })

    it('add-log-entry caps at 1000 entries', async () => {
      // Pre-fill to 1000
      store.set('processingLog', Array.from({ length: 1000 }, (_, i) => ({ id: `e${i}` })))
      const newEntry = { id: 'new', timestamp: '2024-01-01', filePath: '/a.jpg', filename: 'a.jpg', changesApplied: {}, success: true }
      await ipc.invoke('add-log-entry', newEntry)
      const log = await ipc.invoke('get-processing-log') as unknown[]
      expect(log).toHaveLength(1000)
      expect((log[0] as any).id).toBe('new')
    })

    it('clear-processing-log empties the log', async () => {
      const entry = { id: 'e1', timestamp: '2024-01-01', filePath: '/a.jpg', filename: 'a.jpg', changesApplied: {}, success: true }
      await ipc.invoke('add-log-entry', entry)
      await ipc.invoke('clear-processing-log')
      const log = await ipc.invoke('get-processing-log')
      expect(log).toEqual([])
    })
  })
})
