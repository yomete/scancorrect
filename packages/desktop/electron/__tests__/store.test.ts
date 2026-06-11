import { describe, it, expect, beforeEach, vi } from 'vitest'

// Use the mock so we don't hit the real electron-store ESM import
vi.mock('electron-store')

// Reset the module between tests so storeInstance is cleared
beforeEach(async () => {
  vi.resetModules()
})

describe('getStore memoization', () => {
  it('returns the same instance across multiple calls after initStore()', async () => {
    // Re-import after resetModules so storeInstance starts null
    const { initStore: init, getStore: get } = await import('../store')
    await init()
    const a = get()
    const b = get()
    expect(a).toBe(b)
  })

  it('throws if called before initStore()', async () => {
    const { getStore: get } = await import('../store')
    expect(() => get()).toThrow('Store not initialized')
  })

  it('initStore() is idempotent — second call does not replace the instance', async () => {
    const { initStore: init, getStore: get } = await import('../store')
    await init()
    const first = get()
    await init()
    expect(get()).toBe(first)
  })
})
