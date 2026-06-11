# ScanCorrect

A clean, minimal desktop application for film photographers to easily fix camera metadata in scanned film images. Built with Electron and React, inspired by ImageOptim's simple drag-and-drop interface.

This repository is organized as a monorepo containing:
- 🖥️ **Desktop App** - Electron application for EXIF editing
- 🌐 **Marketing Website** - Next.js landing page  
- 📦 **Shared** - Common types and utilities

![ScanCorrect Screenshot](https://via.placeholder.com/800x600/2d3748/ffffff?text=Film+EXIF+Editor)

## Features

- **Simple Drag & Drop Interface**: Drop images anywhere in the window to process them
- **Camera Profile Management**: Create and save camera/lens combinations for reuse
- **Batch Processing**: Process multiple images simultaneously
- **Real-time Feedback**: See processing results for each file instantly
- **Dark Mode Support**: Light, dark, and system theme options
- **Persistent Storage**: Profiles are saved between app sessions
- **Cross-platform**: Works on macOS, Windows, and Linux

## Supported File Formats

- JPEG (.jpg, .jpeg)
- TIFF (.tiff, .tif)

## Prerequisites

✅ **No external dependencies required!** ExifTool is bundled with the application.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/film-exif-editor.git
   cd film-exif-editor
   ```

2. Install dependencies for all packages:
   ```bash
   npm install
   ```

3. Start development servers:
   ```bash
   # Start both desktop app and website concurrently
   npm run dev
   
   # Or start individually:
   npm run dev:desktop    # Electron app on localhost:5173
   npm run dev:website    # Next.js site on localhost:3001
   ```

## Building for Production

### Build All Packages
```bash
npm run build
```

### Build Individual Packages
```bash
npm run build:desktop    # Build Electron app
npm run build:website    # Build Next.js website
```

### Package Desktop App
```bash
npm run dist             # Package for current platform
```

Built applications will be available in the `release/` directory at the repository root.
The built website will be in `packages/website/.next/` directory.

## Deployment

### Automated Releases (Recommended)

The project includes automated CI/CD with GitHub Actions:

1. **Create a release:**
   ```bash
   ./scripts/create-release.sh
   ```

2. **GitHub Actions automatically:**
   - Builds for macOS, Windows, and Linux
   - Creates a GitHub Release
   - Uploads installers for all platforms

3. **Download URLs available at:**
   ```
   https://github.com/YOUR_USERNAME/film-exif-editor/releases/latest
   ```

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide including:
- Setting up GitHub Actions
- Code signing (optional)
- Linking downloads from website
- Versioning and release management

## Usage

### Creating Camera Profiles

1. Click the "+" button in the footer
2. Fill in the camera details:
   - **Profile Name**: A descriptive name (e.g., "Nikon FM")
   - **Camera Make**: Manufacturer (e.g., "Nikon")
   - **Camera Model**: Model number (e.g., "FM")
   - **Lens**: Optional lens information (e.g., "50mm f/1.8")
3. Click "Save Profile"

### Processing Images

1. Select a camera profile from the dropdown (⋯ button)
2. Drag and drop image files onto the window, or click to browse
3. View processing results in real-time
4. Click "Clear Results" to reset for the next batch

### Theme Switching

Click the theme button in the footer to switch between:
- ☀️ Light mode
- 🌙 Dark mode  
- 🖥️ System (follows your OS preference)

## Development

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Electron (main process)
- **EXIF Processing**: ExifTool (bundled via exiftool-vendored)
- **Styling**: Tailwind CSS v4 (website) / custom CSS (desktop)
- **Icons**: Iconify React
- **Storage**: electron-store
- **Build**: electron-builder

### Monorepo Structure

```
film-exif-editor/
├── packages/
│   ├── desktop/         # Electron desktop application
│   │   ├── electron/    # Electron main process
│   │   ├── src/         # React UI components  
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── website/         # Next.js marketing website
│   │   ├── app/         # Next.js app directory
│   │   ├── public/      # Static assets
│   │   └── package.json
│   └── shared/          # Shared code and types
│       ├── src/
│       │   ├── types.ts  # Common TypeScript interfaces
│       │   ├── utils.ts  # Utility functions
│       │   └── index.ts  # Package exports
│       └── package.json
├── package.json         # Root workspace configuration
└── README.md
```

### Available Scripts

**Root workspace commands:**
- `npm run dev` - Start both desktop app and website concurrently
- `npm run dev:desktop` - Start only the desktop app
- `npm run dev:website` - Start only the marketing website
- `npm run build` - Build all packages
- `npm run build:desktop` - Build desktop app
- `npm run build:website` - Build website
- `npm run dist` - Package desktop app for distribution
- `npm run clean` - Clean all build outputs
- `npm run typecheck` - Run TypeScript checks on all packages

### IPC API

The app uses Electron's IPC for secure communication. `window.electronAPI` (exposed via `contextBridge` in `packages/desktop/electron/preload.ts`) includes: profile CRUD, EXIF read/write with backups, geocoding, thumbnail extraction/caching, processing log, custom values, saved locations, GPX import, Mapbox token management, and window controls. See `preload.ts` for the full `ElectronAPI` interface.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages: `git commit -m "Add feature description"`
5. Push to your fork: `git push origin feature-name`
6. Submit a pull request

## Troubleshooting

### File Permissions
The app needs read/write access to image files. On macOS, you may need to grant permissions in System Preferences > Security & Privacy.

### Large Image Batches
For processing many images, be patient as ExifTool processes each file individually for accuracy.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [ImageOptim](https://imageoptim.com/)'s clean interface design
- Uses [ExifTool](https://exiftool.org/) by Phil Harvey for EXIF manipulation (bundled via [exiftool-vendored](https://github.com/photostructure/exiftool-vendored.js))
- Icons provided by [Iconify](https://iconify.design/)

---

**Built for film photographers, by film photographers** 📸