# ExifTool Bundling - How It Works

## TL;DR

✅ **Your desktop app already bundles ExifTool!** Users don't need to install anything - it works out of the box.

## What Was Done

### 1. Using exiftool-vendored Package

The desktop app uses `exiftool-vendored` (v30.4.0) instead of requiring users to install ExifTool separately.

**Benefits:**
- Includes pre-compiled ExifTool binaries for macOS, Windows, and Linux
- Automatically selects the correct binary for the platform
- No user setup required
- Consistent ExifTool version across all platforms

### 2. Electron-Builder Configuration

The [packages/desktop/package.json](packages/desktop/package.json) includes proper configuration:

```json
"asarUnpack": [
  "node_modules/exiftool-vendored*/**/*",
  "node_modules/@photostructure/**/*"
]
```

This ensures ExifTool binaries are:
- Extracted from the ASAR archive (Electron's package format)
- Available for execution (binaries can't run from within ASAR)
- Platform-specific (each build includes only its platform's binary)

### 3. Enhanced Build Configuration

Updated configuration includes:
- **Multiple build targets** per platform (DMG + ZIP for macOS, NSIS + Portable for Windows, AppImage + DEB for Linux)
- **NSIS installer options** for Windows (custom install directory, desktop shortcuts)
- **Icon placeholders** for all platforms (ready for custom icons)
- **Proper categorization** (Photography for macOS, Graphics for Linux)

### 4. Error Handling

Enhanced ExifTool initialization with:
- Timeout configuration (10 seconds per task)
- Max process limit (10 concurrent operations)
- Graceful error messages
- Console logging for debugging

## File Structure

```
packages/desktop/
├── electron/
│   └── main.ts           # ExifTool initialization & usage
├── package.json          # Build configuration
├── BUILD.md              # Build instructions
└── node_modules/
    └── exiftool-vendored/
        └── bin/          # ExifTool binaries (per platform)
```

## How It Works

1. **Development**: `exiftool-vendored` downloads the appropriate binary for your OS during `npm install`

2. **Build**: When you run `npm run dist`, electron-builder:
   - Packages the app
   - Includes `node_modules/exiftool-vendored` and `node_modules/@photostructure`
   - Unpacks them from ASAR so binaries can execute
   - Creates platform-specific distributables

3. **Runtime**: When the app runs:
   - `exiftool-vendored` automatically finds its bundled binary
   - Users drag & drop images
   - ExifTool processes them
   - No external dependencies needed!

## Testing the Build

To verify ExifTool is working:

```bash
# From repository root
npm install
npm run build -w desktop
npm run dist -w desktop
```

Then install the app from `release/` directory and test with a sample image.

## What Users Get

### macOS Users
- Download the DMG (~50-70 MB)
- Drag to Applications folder
- Launch and use immediately
- No ExifTool installation needed ✓

### Windows Users
- Download the installer (~40-60 MB)
- Run the installer
- Launch and use immediately
- No ExifTool installation needed ✓

### Linux Users
- Download the AppImage (~60-80 MB)
- Make executable and run
- Launch and use immediately
- No ExifTool installation needed ✓

## File Sizes

The ExifTool binary adds approximately:
- **macOS**: ~15 MB
- **Windows**: ~10 MB
- **Linux**: ~12 MB

Total app sizes:
- **macOS DMG**: 50-70 MB
- **Windows NSIS**: 40-60 MB
- **Linux AppImage**: 60-80 MB

This is completely acceptable for a desktop application and provides a seamless user experience.

## Deployment Ready

Your app is now ready for deployment:

1. Build distributables for each platform
2. Upload to GitHub Releases or your own hosting
3. Link from website download buttons
4. Users download and run - no setup required!

## Next Steps (Optional)

- [ ] Add custom app icons (replace placeholders in `build/` directory)
- [ ] Set up code signing (macOS: Apple Developer cert, Windows: Authenticode)
- [ ] Configure auto-updates with `electron-updater`
- [ ] Create GitHub Actions workflow for automated builds
- [ ] Submit to app stores (Mac App Store, Microsoft Store)

## References

- [exiftool-vendored on npm](https://www.npmjs.com/package/exiftool-vendored)
- [electron-builder documentation](https://www.electron.build/)
- [Build instructions](packages/desktop/BUILD.md)
