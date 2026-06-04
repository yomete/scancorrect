/**
 * Returns the basename of a path, handling both POSIX (`/`) and Windows (`\`)
 * separators. Splitting on a single separator is not enough — a Windows path
 * has no `/`, so `path.split('/').pop()` returns the whole path unchanged.
 */
export function getFilename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}
