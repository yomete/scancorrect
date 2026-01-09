import { vi } from 'vitest'

interface StoreData {
  [key: string]: unknown
}

class MockElectronStore {
  private data: StoreData = {}

  constructor(options?: { defaults?: StoreData }) {
    if (options?.defaults) {
      this.data = { ...options.defaults }
    }
  }

  get<T>(key: string): T | undefined
  get<T>(key: string, defaultValue: T): T
  get<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.data[key]
    if (value === undefined) {
      return defaultValue
    }
    return value as T
  }

  set(key: string, value: unknown): void
  set(obj: StoreData): void
  set(keyOrObj: string | StoreData, value?: unknown): void {
    if (typeof keyOrObj === 'string') {
      this.data[keyOrObj] = value
    } else {
      Object.assign(this.data, keyOrObj)
    }
  }

  delete(key: string): void {
    delete this.data[key]
  }

  has(key: string): boolean {
    return key in this.data
  }

  clear(): void {
    this.data = {}
  }

  get store(): StoreData {
    return { ...this.data }
  }

  get size(): number {
    return Object.keys(this.data).length
  }

  // Helper for tests to reset state
  _reset(): void {
    this.data = {}
  }

  // Helper for tests to set initial data
  _setData(data: StoreData): void {
    this.data = { ...data }
  }
}

export default MockElectronStore

// Also export a mock instance for tests that need it
export const createMockStore = (defaults?: StoreData) => new MockElectronStore({ defaults })

// Mock for vi.mock usage
export const mockElectronStore = vi.fn().mockImplementation((options?: { defaults?: StoreData }) => {
  return new MockElectronStore(options)
})
