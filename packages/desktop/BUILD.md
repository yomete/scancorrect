# Building Film EXIF Editor Desktop App

This guide explains how to build distributable packages of the Film EXIF Editor desktop application.

## Overview

The desktop app uses `exiftool-vendored`, which **automatically bundles ExifTool binaries** for all platforms. Users do not need to install ExifTool separately - it's completely self-contained!

## Prerequisites

- Node.js 16+ and npm
- For macOS builds: macOS with Xcode Command Line Tools
- For Windows builds: Windows (or use CI/CD)
- For Linux builds: Linux (or use CI/CD)

## Quick Build

### Development Build
```bash
# From the root of the monorepo
npm install

# Start development server
npm run dev -w desktop
```

### Production Build (Current Platform)
```bash
# From the root of the monorepo
npm run build -w desktop
npm run dist -w desktop
```

The built app will be in `/release` directory at the root of the monorepo.

## Build Outputs

### macOS
- **DMG**: Disk image for easy drag-and-drop installation
- **ZIP**: Portable archive format

### Windows
- **NSIS Installer**: Full installer with options for install directory and shortcuts
- **Portable**: Standalone executable that doesn't require installation

### Linux
- **AppImage**: Universal Linux package that works on most distributions
- **DEB**: Debian/Ubuntu package

## How ExifTool Bundling Works

1. **exiftool-vendored package**: This npm package includes pre-compiled ExifTool binaries for macOS, Windows, and Linux
2. **asarUnpack configuration**: The `package.json` includes:
   ```json
   "asarUnpack": [
     "node_modules/exiftool-vendored*/**/*",
     "node_modules/@photostructure/**/*"
   ]
   ```
   This ensures ExifTool binaries are extracted from the ASAR archive so they can execute

3. **Automatic binary selection**: `exiftool-vendored` automatically selects the correct binary for the platform

## Build Scripts

From the `packages/desktop` directory:

```bash
# Clean build artifacts
npm run clean

# Build app (compile TypeScript + bundle React)
npm run build

# Create distributable for current platform
npm run dist

# Create unpacked build for testing (faster, no installer)
npm run pack
```

## Testing the Build

After building, test the distributable:

### macOS
```bash
open ../../release/Film\ EXIF\ Editor-0.0.1.dmg
```

### Windows
```bash
start ../../release/Film EXIF Editor Setup 0.0.1.exe
```

### Linux
```bash
chmod +x ../../release/Film\ EXIF\ Editor-0.0.1.AppImage
../../release/Film\ EXIF\ Editor-0.0.1.AppImage
```

## Verifying ExifTool is Bundled

To verify ExifTool is working in the built app:

1. Open the app
2. Create a test camera profile (e.g., "Nikon F3", Make: "Nikon", Model: "F3")
3. Drop a test image onto the app
4. Select your profile and process the image
5. Check the EXIF data - Make and Model should be updated

If this works without any ExifTool installation, the bundling is successful!

## File Size

Expected approximate sizes:
- **macOS DMG**: ~50-70 MB (includes ExifTool binary for macOS)
- **Windows NSIS**: ~40-60 MB (includes ExifTool binary for Windows)
- **Linux AppImage**: ~60-80 MB (includes ExifTool binary for Linux)

The ExifTool binary adds ~10-15 MB per platform.

## Troubleshooting

### Build fails with "ExifTool not found"
This shouldn't happen with `exiftool-vendored`. If it does:
- Ensure `exiftool-vendored` is in `dependencies` (not `devDependencies`)
- Run `npm install` to ensure all packages are installed
- Check that `asarUnpack` configuration includes the ExifTool paths

### App crashes on launch
- Check the electron-builder output for errors
- Try the unpacked build first: `npm run pack`
- Look at the console logs in the unpacked app

### ExifTool binary not working in production
- Verify `asarUnpack` includes both:
  - `node_modules/exiftool-vendored*/**/*`
  - `node_modules/@photostructure/**/*`
- Check that the binary has execute permissions (Linux/macOS)

## CI/CD Considerations

For automated builds:

### GitHub Actions Example
```yaml
- name: Build Desktop App
  run: |
    npm install
    npm run build -w desktop
    npm run dist -w desktop

- name: Upload Artifacts
  uses: actions/upload-artifact@v3
  with:
    name: desktop-builds
    path: release/*
```

### Multi-Platform Builds
Use GitHub Actions matrix strategy to build for all platforms:
```yaml
strategy:
  matrix:
    os: [macos-latest, windows-latest, ubuntu-latest]
runs-on: ${{ matrix.os }}
```

## Deployment

Once built, you can:
1. Upload to GitHub Releases
2. Host on your own CDN/server
3. Submit to app stores (Mac App Store, Microsoft Store)
4. Link directly from the website's download buttons

## Next Steps

- Add app icons (currently placeholders)
- Configure code signing for macOS/Windows
- Set up auto-updates with electron-updater
- Add crash reporting
