export interface WindowBounds {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized?: boolean
}

export const MIN_WINDOW_WIDTH = 600
export const MIN_WINDOW_HEIGHT = 400

/**
 * Validate stored window bounds against the given list of displays.
 * Returns bounds with width/height clamped to minimum sizes.
 * Drops x/y if the position would be off all displays.
 * Pure function — pass `screen.getAllDisplays()` as the second argument.
 */
export function validateWindowBounds(
  bounds: WindowBounds,
  displays: Array<{ workArea: { x: number; y: number; width: number; height: number } }>
): WindowBounds {
  const width = Math.max(bounds.width, MIN_WINDOW_WIDTH)
  const height = Math.max(bounds.height, MIN_WINDOW_HEIGHT)

  // If no position stored, just return validated size
  if (bounds.x === undefined || bounds.y === undefined) {
    return { width, height }
  }

  const margin = 50 // require at least 50px of the window to be on-screen
  const isOnScreen = displays.some(d => {
    const { x: dx, y: dy, width: dw, height: dh } = d.workArea
    return (
      bounds.x! + width - margin >= dx &&
      bounds.x! + margin <= dx + dw &&
      bounds.y! + height - margin >= dy &&
      bounds.y! + margin <= dy + dh
    )
  })

  if (!isOnScreen) {
    return { width, height }
  }

  return { x: bounds.x, y: bounds.y, width, height, isMaximized: bounds.isMaximized }
}
