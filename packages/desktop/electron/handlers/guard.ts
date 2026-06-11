import * as path from 'path'

export function assertAbsolutePath(p: string): void {
  if (!path.isAbsolute(p) || p.includes('\0')) {
    throw new Error(`Invalid file path: must be absolute and must not contain null bytes`)
  }
}
