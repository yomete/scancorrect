import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerLocationHandlers } from '../handlers/locations'

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

describe('registerLocationHandlers', () => {
  let ipc: ReturnType<typeof makeFakeIpc>
  let store: ReturnType<typeof makeStore>

  beforeEach(() => {
    ipc = makeFakeIpc()
    store = makeStore({
      savedLocations: [],
      locationHistory: [],
    })
    registerLocationHandlers({ ipcMain: ipc.ipcMain as any, getStore: () => store as any })
  })

  describe('saved locations CRUD', () => {
    it('get-saved-locations returns empty initially', async () => {
      expect(await ipc.invoke('get-saved-locations')).toEqual([])
    })

    it('save-location adds a new location', async () => {
      const loc = { id: 'l1', name: 'Paris', latitude: 48.8, longitude: 2.3, usageCount: 0, lastUsedAt: '' }
      await ipc.invoke('save-location', loc)
      const locations = await ipc.invoke('get-saved-locations') as unknown[]
      expect(locations).toHaveLength(1)
    })

    it('save-location updates existing location', async () => {
      const loc = { id: 'l1', name: 'Paris', latitude: 48.8, longitude: 2.3, usageCount: 0, lastUsedAt: '' }
      await ipc.invoke('save-location', loc)
      const updated = { ...loc, name: 'Paris Updated' }
      await ipc.invoke('save-location', updated)
      const locations = await ipc.invoke('get-saved-locations') as unknown[]
      expect(locations).toHaveLength(1)
      expect((locations[0] as any).name).toBe('Paris Updated')
    })

    it('delete-saved-location removes the location', async () => {
      const loc = { id: 'l1', name: 'Paris', latitude: 48.8, longitude: 2.3, usageCount: 0, lastUsedAt: '' }
      await ipc.invoke('save-location', loc)
      await ipc.invoke('delete-saved-location', 'l1')
      expect(await ipc.invoke('get-saved-locations')).toEqual([])
    })

    it('increment-location-usage increments count and updates lastUsedAt', async () => {
      const loc = { id: 'l1', name: 'Paris', latitude: 48.8, longitude: 2.3, usageCount: 0, lastUsedAt: '' }
      await ipc.invoke('save-location', loc)
      await ipc.invoke('increment-location-usage', 'l1')
      const locations = await ipc.invoke('get-saved-locations') as any[]
      expect(locations[0].usageCount).toBe(1)
      expect(locations[0].lastUsedAt).not.toBe('')
    })
  })

  describe('location history', () => {
    it('get-location-history returns empty initially', async () => {
      expect(await ipc.invoke('get-location-history')).toEqual([])
    })

    it('add-to-location-history prepends', async () => {
      const entry = { query: 'Paris', timestamp: '2024-01-01', results: [] }
      await ipc.invoke('add-to-location-history', entry)
      const history = await ipc.invoke('get-location-history') as unknown[]
      expect(history).toHaveLength(1)
      expect((history[0] as any).query).toBe('Paris')
    })

    it('add-to-location-history caps at 50 entries', async () => {
      store.set('locationHistory', Array.from({ length: 50 }, (_, i) => ({ query: `q${i}` })))
      await ipc.invoke('add-to-location-history', { query: 'new', timestamp: '', results: [] })
      const history = await ipc.invoke('get-location-history') as unknown[]
      expect(history).toHaveLength(50)
      expect((history[0] as any).query).toBe('new')
    })

    it('clear-location-history empties the history', async () => {
      await ipc.invoke('add-to-location-history', { query: 'Paris', timestamp: '', results: [] })
      await ipc.invoke('clear-location-history')
      expect(await ipc.invoke('get-location-history')).toEqual([])
    })
  })
})
