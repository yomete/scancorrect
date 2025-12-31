import { useEffect, useCallback } from 'react'

/**
 * Configuration object mapping key combinations to handler functions.
 *
 * Key format examples:
 * - 'mod+a' - Cmd on Mac, Ctrl on Windows/Linux
 * - 'mod+s' - Save
 * - 'mod+z' - Undo
 * - 'mod+shift+a' - Deselect all
 * - 'Escape' - Close modals
 * - 'Delete' or 'Backspace' - Remove selected
 */
export interface ShortcutConfig {
  [key: string]: () => void
}

interface ParsedShortcut {
  key: string
  mod: boolean
  shift: boolean
  alt: boolean
}

const isMac = (): boolean => {
  if (typeof navigator !== 'undefined') {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0
  }
  return false
}

const parseShortcut = (shortcut: string): ParsedShortcut => {
  const parts = shortcut.toLowerCase().split('+')
  const key = parts[parts.length - 1]

  return {
    key,
    mod: parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
  }
}

const isEditableElement = (element: EventTarget | null): boolean => {
  if (!element || !(element instanceof HTMLElement)) {
    return false
  }

  const tagName = element.tagName.toLowerCase()

  if (tagName === 'input' || tagName === 'textarea') {
    return true
  }

  if (element.isContentEditable) {
    return true
  }

  return false
}

const matchesShortcut = (
  event: KeyboardEvent,
  parsed: ParsedShortcut
): boolean => {
  const mac = isMac()
  const modKey = mac ? event.metaKey : event.ctrlKey

  if (parsed.mod && !modKey) return false
  if (!parsed.mod && modKey) return false
  if (parsed.shift !== event.shiftKey) return false
  if (parsed.alt !== event.altKey) return false

  const eventKey = event.key.toLowerCase()

  if (parsed.key === 'escape' && eventKey === 'escape') return true
  if (parsed.key === 'delete' && (eventKey === 'delete' || eventKey === 'backspace')) return true
  if (parsed.key === 'backspace' && eventKey === 'backspace') return true

  return eventKey === parsed.key
}

/**
 * A React hook for handling global keyboard shortcuts.
 *
 * Features:
 * - Cross-platform modifier key support ('mod' = Cmd on Mac, Ctrl on Windows/Linux)
 * - Automatically prevents default browser behavior for matched shortcuts
 * - Ignores shortcuts when focus is in input, textarea, or contenteditable elements
 * - Cleans up event listeners on unmount
 *
 * @param shortcuts - Configuration object mapping key combinations to handler functions
 *
 * @example
 * ```typescript
 * useKeyboardShortcuts({
 *   'mod+a': selectAllImages,
 *   'mod+s': saveAllChanges,
 *   'mod+z': undoLastBatch,
 *   'mod+shift+a': deselectAll,
 *   'Escape': closeModals,
 *   'Delete': removeSelected,
 * })
 * ```
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) {
        return
      }

      for (const [shortcut, handler] of Object.entries(shortcuts)) {
        const parsed = parseShortcut(shortcut)

        if (matchesShortcut(event, parsed)) {
          event.preventDefault()
          event.stopPropagation()
          handler()
          return
        }
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

export default useKeyboardShortcuts
