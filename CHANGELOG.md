# Changelog

All notable changes to ScanCorrect are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Fixed

- Release pipeline now emits the update manifests (`latest*.yml`) auto-update
  requires, runs the test suite before publishing, and fails on a
  tag/`package.json` version mismatch
- Saving no longer leaves changes marked as pending; a re-save can no longer
  overwrite the pristine backup of an original file
- Restoring a backup now reports failure honestly instead of always
  claiming success
- One invalid file in a dropped batch no longer discards EXIF reads for the
  whole batch
- The unsaved-changes prompt now actually blocks closing the window, and
  quitting on macOS no longer leaves a windowless app running
- GPX matching: new camera-clock timezone option fixes matches being offset
  by the computer's UTC offset

### Changed

- macOS builds are now universal (Intel + Apple Silicon)
- Packaged app no longer bundles development dependencies (smaller download)

### Earlier unreleased work

- Upgraded Electron 31 → 42
- Auto-update via `electron-updater` + GitHub Releases, with an update-ready
  pill in the app footer
- Window-bounds persistence across sessions
- Last-used camera profile restored across sessions
- Thumbnail cache reworked: orchestration moved to the main process, binary
  `.jpg` disk cache with LRU eviction
- Geocoding resilience: serial queue rate limiter, LRU result cache, retry,
  and a typed error shape propagated through IPC to the renderer
- IPC handlers extracted from `main.ts` into `electron/handlers/` modules
- ESLint flat config added for the desktop package; wired into CI
- Per-file and overall coverage thresholds enforced in CI

## [0.3.2] - 2026-06-07

- Fixed image previews: handle exiftool `BinaryField` values and add a
  full-image fallback when thumbnail extraction fails

## [0.3.1] - 2026-06-07

- Maintenance release

## [0.3.0]

- GPX track import with photo time-matching
- Interactive Mapbox map picker

## [0.2.x]

- Geocoding via Nominatim with saved locations and search history
- Custom value lists for metadata dropdowns

## [0.1.x]

- Initial releases: drag-and-drop batch image loading, camera profiles,
  EXIF read/write with automatic backups
