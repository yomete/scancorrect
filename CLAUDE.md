# ScanCorrect

Desktop app for film photographers to fix EXIF metadata on scanned images. Electron 42 + React 18 + Vite + TypeScript, organized as an npm workspaces monorepo.

## Monorepo layout

```
film-exif-editor/
├── packages/
│   ├── desktop/               # Electron app (main deliverable)
│   │   ├── electron/          # Main process: main.ts + handlers/ (IPC), exif.ts, gpx.ts,
│   │   │                      #   geocoding.ts, mapbox.ts, thumbnails.ts, updater.ts,
│   │   │                      #   store.ts, window-state.ts, spotlight.ts, preload.ts
│   │   ├── src/               # React UI
│   │   │   ├── store/         # Zustand stores: imageStore.ts, locationStore.ts, settingsStore.ts
│   │   │   ├── components/    # UI components (Sidebar, ImageGrid, MetadataEditor, etc.)
│   │   │   ├── constants/     # metadata.ts — standard ISO/aperture/shutter/focal values
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── types.ts       # Shared TypeScript interfaces
│   │   │   └── App.tsx        # Root component
│   │   └── package.json
│   ├── website/               # Next.js 16 / React 19 / Tailwind 4 marketing site
│   └── shared/                # Common types + utils (src/types.ts, src/utils.ts)
├── package.json               # Workspace root (Node ≥20, npm ≥10)
└── plans/                     # Implementation plans; see plans/README.md
```

## Run / build / test

All commands run from the **repo root** unless noted. Desktop-specific test commands run from `packages/desktop`.

| Task | Command |
|---|---|
| Dev (desktop + website) | `npm run dev` |
| Dev desktop only | `npm run dev:desktop` (Vite on :5173 + Electron) |
| Dev website only | `npm run dev:website` (Next.js on :3001) |
| Build all | `npm run build` |
| Build desktop | `npm run build:desktop` |
| Package desktop | `npm run dist` |
| Typecheck all | `npm run typecheck` |
| Unit tests | `cd packages/desktop && npm run test` (vitest) |
| Integration tests | `cd packages/desktop && npm run test:integration` (real exiftool) |
| E2E tests | `cd packages/desktop && npm run test:e2e` (Playwright) |
| Smoke tests | `cd packages/desktop && npm run test:smoke` (requires packaged app) |

`test:smoke` requires a packaged app — run `npm run pack` first.

## Architecture notes

**IPC boundary**: preload (`packages/desktop/electron/preload.ts`) exposes `window.electronAPI` via `contextBridge`. All file I/O, EXIF reading/writing, geocoding, and GPX parsing happen in the main process. The renderer never touches Node APIs directly.

**exiftool-vendored**: bundled; no user installation required. Lifecycle managed in `electron/main.ts` — `exiftool.end()` called on app quit.

**electron-store**: persists camera profiles, custom dropdown values, processing log, saved locations, thumbnail-cache setting, Mapbox token, window bounds, and last-used profile.

**Backups**: on every EXIF write, backups are stored under `userData/backups` (initialized in `main.ts`). Restore via `restore-backup` IPC handler.

**State management**: Zustand (`src/store/`) — `imageStore` owns loaded images + pending changes + selection; `locationStore` owns saved locations + history; `settingsStore` owns user preferences (cache toggle, etc.).

## Conventions

- Git commits: title-only messages (no body), and never add AI co-author/attribution lines (no `Co-Authored-By`, no "Generated with" footers).
- Git branches: no `claude/` prefix — name branches after the work itself (e.g. `mobile-responsive-layout`).
- TypeScript strict mode throughout; `noUnusedLocals`/`noUnusedParameters` enforced.
- `electron/` uses CommonJS (`"module": "commonjs"`); `src/` uses ESNext modules via Vite.
- No semicolons in `electron/` source (match existing style before editing).
- Test layers: vitest unit (`src/__tests__`, `electron/__tests__`), vitest integration (`vitest.integration.config.ts`), Playwright E2E (`playwright.config.ts`), Playwright smoke (`playwright.smoke.config.ts`).
- Mocks live in `packages/desktop/electron/__mocks__` (electron-store, exiftool-vendored).

## Shipped features (as of v0.3.2)

- Drag-and-drop batch image loading (JPG, JPEG, TIFF)
- Camera profiles with defaults: ISO, aperture, shutter speed, focal length, exposure compensation, film stock, location
- EXIF read/write with automatic backups + restore (`restore-backup` handler)
- Scanner-metadata detection (hardcoded brand list in `electron/scanner-detection.ts`)
- Geocoding via Nominatim (free, rate-limited); saved locations + search history
- GPX track import with photo time-matching (paid tier)
- Interactive Mapbox map picker (paid tier; token via `VITE_MAPBOX_TOKEN` or user settings)
- Thumbnails with disk cache (exiftool extracts embedded JPEG; async loading with spinners)
- Processing log (persisted in electron-store)
- Custom value lists for dropdowns (persisted)
- Dark / light / system theme
- macOS signed + notarized releases via GitHub Actions
- Auto-update via `electron-updater` + GitHub Releases (update-ready pill in the Footer)
- Window-bounds persistence across sessions

## Roadmap

See `plans/README.md` for planned work.
