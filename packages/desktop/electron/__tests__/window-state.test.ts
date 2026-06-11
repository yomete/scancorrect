import { describe, it, expect } from 'vitest'
import { validateWindowBounds } from '../window-state'

const SINGLE_DISPLAY = [{ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }]
const EMPTY_DISPLAYS: typeof SINGLE_DISPLAY = []

describe('validateWindowBounds', () => {
  it('clamps width below minimum', () => {
    const result = validateWindowBounds({ width: 100, height: 500 }, SINGLE_DISPLAY)
    expect(result.width).toBe(600)
  })

  it('clamps height below minimum', () => {
    const result = validateWindowBounds({ width: 800, height: 200 }, SINGLE_DISPLAY)
    expect(result.height).toBe(400)
  })

  it('returns valid on-screen bounds unchanged', () => {
    const result = validateWindowBounds({ x: 100, y: 100, width: 800, height: 600 }, SINGLE_DISPLAY)
    expect(result).toEqual({ x: 100, y: 100, width: 800, height: 600, isMaximized: undefined })
  })

  it('drops x/y when position is off all screens', () => {
    const result = validateWindowBounds({ x: 99999, y: 99999, width: 800, height: 600 }, SINGLE_DISPLAY)
    expect(result.x).toBeUndefined()
    expect(result.y).toBeUndefined()
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
  })

  it('drops x/y when no displays are known', () => {
    const result = validateWindowBounds({ x: 0, y: 0, width: 800, height: 600 }, EMPTY_DISPLAYS)
    expect(result.x).toBeUndefined()
    expect(result.y).toBeUndefined()
  })

  it('returns size-only when no x/y stored', () => {
    const result = validateWindowBounds({ width: 1024, height: 768 }, SINGLE_DISPLAY)
    expect(result).toEqual({ width: 1024, height: 768 })
  })

  it('preserves isMaximized flag when on-screen', () => {
    const result = validateWindowBounds(
      { x: 0, y: 0, width: 800, height: 600, isMaximized: true },
      SINGLE_DISPLAY
    )
    expect(result.isMaximized).toBe(true)
  })

  it('works with multiple displays and position on second display', () => {
    const dualDisplays = [
      { workArea: { x: 0, y: 0, width: 1920, height: 1080 } },
      { workArea: { x: 1920, y: 0, width: 2560, height: 1440 } }
    ]
    const result = validateWindowBounds({ x: 2000, y: 100, width: 800, height: 600 }, dualDisplays)
    expect(result.x).toBe(2000)
    expect(result.y).toBe(100)
  })
})
