import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerGpxHandlers } from '../handlers/gpx-handlers'

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

// Minimal valid GPX string for parse test
const GPX_CONTENT = `<?xml version="1.0"?>
<gpx version="1.1" creator="test">
  <trk><trkseg>
    <trkpt lat="48.8" lon="2.3"><time>2024-01-01T12:00:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`

describe('registerGpxHandlers', () => {
  let ipc: ReturnType<typeof makeFakeIpc>
  let store: ReturnType<typeof makeStore>

  beforeEach(() => {
    ipc = makeFakeIpc()
    store = makeStore({ gpxTracks: [] })
    registerGpxHandlers({
      ipcMain: ipc.ipcMain as any,
      getStore: () => store as any,
      getMainWindow: () => null,
      dialog: {} as any,
    })
  })

  describe('GPX CRUD', () => {
    it('get-gpx-tracks returns empty initially', async () => {
      expect(await ipc.invoke('get-gpx-tracks')).toEqual([])
    })

    it('save-gpx-track appends a track', async () => {
      const track = { id: 't1', name: 'Track 1', points: [], filename: 'a.gpx', importedAt: '' }
      await ipc.invoke('save-gpx-track', track)
      const tracks = await ipc.invoke('get-gpx-tracks') as unknown[]
      expect(tracks).toHaveLength(1)
    })

    it('delete-gpx-track removes a track', async () => {
      const track = { id: 't1', name: 'Track 1', points: [], filename: 'a.gpx', importedAt: '' }
      await ipc.invoke('save-gpx-track', track)
      await ipc.invoke('delete-gpx-track', 't1')
      expect(await ipc.invoke('get-gpx-tracks')).toEqual([])
    })
  })

  describe('parse-gpx', () => {
    it('delegates to parseGPX and returns a GPXTrack', async () => {
      const result = await ipc.invoke('parse-gpx', GPX_CONTENT) as any
      expect(result).toHaveProperty('points')
      expect(Array.isArray(result.points)).toBe(true)
    })
  })

  describe('match-photos-to-gpx', () => {
    it('returns empty array when no images match', async () => {
      const track = await ipc.invoke('parse-gpx', GPX_CONTENT) as any
      const result = await ipc.invoke('match-photos-to-gpx', track, [], 30)
      expect(result).toEqual([])
    })
  })
})
