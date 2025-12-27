# ScanCorrect - Electron + React App

## Project Overview

This is an Electron + React desktop application for film photographers to easily fix camera metadata in scanned film images. The app provides a simple drag-and-drop interface similar to ImageOptim, where users can drop scanned images and automatically update the camera make/model metadata using stored camera profiles.

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Electron main process
- **EXIF Editing**: exiftool-vendored (bundled, no external installation required)
- **Data Storage**: electron-store for profiles
- **Build System**: electron-builder

## Key Features

1. **Simple Drag & Drop Interface**: Users drag images onto the app window
2. **Camera Profiles**: Create and save camera/lens combinations for reuse
3. **Batch Processing**: Process multiple images at once
4. **Real-time Feedback**: Show processing results for each file
5. **Persistent Storage**: Save profiles between app sessions

## File Structure

```
film-exif-editor/
├── package.json
├── electron/
│   ├── main.ts          # Main Electron process
│   ├── preload.ts       # Preload script for IPC
│   └── tsconfig.json    # TypeScript config for Electron
├── src/
│   ├── App.tsx          # Main React component
│   ├── App.css          # Styles
│   ├── main.tsx         # React entry point
│   └── vite-env.d.ts    # Vite types
├── vite.config.ts       # Vite configuration
└── tsconfig.json        # TypeScript config for React
```

## Dependencies

### Production Dependencies
- `react` + `react-dom`: UI framework
- `electron-store`: Persistent data storage for profiles
- `exiftool-vendored`: Bundled ExifTool binaries (no user installation required)

### Development Dependencies
- `electron`: Desktop app framework
- `vite`: Build tool and dev server
- `typescript`: Type safety
- `electron-builder`: App packaging and distribution
- `concurrently`: Run multiple commands
- `wait-on`: Wait for dev server to start

### ✅ No External Dependencies Required
The app bundles ExifTool using `exiftool-vendored`, so users don't need to install anything separately. The built app works out of the box on macOS, Windows, and Linux!

## Setup Instructions

1. **Initialize the project:**
   ```bash
   mkdir film-exif-editor
   cd film-exif-editor
   npm init -y
   ```

2. **Install dependencies:**
   ```bash
   npm install react react-dom electron-store exiftool-vendored
   npm install -D @types/react @types/react-dom @vitejs/plugin-react concurrently electron electron-builder typescript vite wait-on
   ```

3. **Create the file structure and copy the provided code files**

   Note: ExifTool is automatically bundled via `exiftool-vendored` - no separate installation required!

5. **Add additional config files:**

   **vite.config.ts:**
   ```typescript
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'
   
   export default defineConfig({
     plugins: [react()],
     base: './',
     build: {
       outDir: 'dist'
     }
   })
   ```

   **src/main.tsx:**
   ```typescript
   import React from 'react'
   import ReactDOM from 'react-dom/client'
   import App from './App.tsx'
   
   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <App />
     </React.StrictMode>,
   )
   ```

   **src/vite-env.d.ts:**
   ```typescript
   /// <reference types="vite/client" />
   ```

   **public/index.html:**
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8" />
     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
     <title>ScanCorrect</title>
   </head>
   <body>
     <div id="root"></div>
     <script type="module" src="/src/main.tsx"></script>
   </body>
   </html>
   ```

   **electron/tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "lib": ["ES2020"],
       "module": "commonjs",
       "moduleResolution": "node",
       "outDir": "../dist-electron",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "resolveJsonModule": true
     },
     "include": ["*.ts"]
   }
   ```

   **tsconfig.json (root):**
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "useDefineForClassFields": true,
       "lib": ["ES2020", "DOM", "DOM.Iterable"],
       "module": "ESNext",
       "skipLibCheck": true,
       "moduleResolution": "bundler",
       "allowImportingTsExtensions": true,
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": true,
       "jsx": "react-jsx",
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noFallthroughCasesInSwitch": true
     },
     "include": ["src"],
     "references": [{ "path": "./tsconfig.node.json" }]
   }
   ```

## Development Workflow

1. **Start development server:**
   ```bash
   npm run dev
   ```
   This runs both the Vite dev server and Electron concurrently.

2. **Build for production:**
   ```bash
   npm run build
   ```

3. **Create distributable:**
   ```bash
   npm run dist
   ```

## Core Functionality

### Profile Management
- Users can create camera profiles with make, model, and optional lens info
- Profiles are stored persistently using electron-store
- Dropdown selection for active profile

### Image Processing
- Drag and drop support for image files (JPG, JPEG, TIFF)
- Batch processing of multiple files
- Uses ExifTool via child process to modify EXIF data
- Real-time feedback showing success/failure for each file

### IPC Communication
- `get-profiles`: Retrieve saved profiles
- `save-profile`: Create or update a profile
- `delete-profile`: Remove a profile
- `edit-exif`: Process images with selected profile

## Technical Implementation Notes

1. **Security**: Uses context isolation and preload script for secure IPC
2. **File Handling**: Processes files in the main process using Node.js child_process
3. **Error Handling**: Graceful handling of ExifTool errors and file access issues
4. **UI State**: React state management for profiles, processing status, and results
5. **Styling**: Custom CSS with dark theme matching modern desktop apps

## Future Enhancements

- [ ] Add more EXIF fields (ISO, focal length, aperture)
- [ ] Image preview functionality
- [ ] Batch file renaming
- [ ] Profile import/export
- [ ] Support for additional image formats
- [ ] Undo functionality
- [ ] Progress indicators for large batches
- [ ] Settings panel with preferences

## Troubleshooting

- **File permissions**: App needs read/write access to image files
- **Large batches**: Consider implementing progress bars for better UX
- **Build issues**: See [BUILD.md](packages/desktop/BUILD.md) for detailed build instructions

## Build Notes

- App uses electron-builder for packaging
- Configured for macOS, Windows, and Linux
- ✅ **ExifTool is bundled** via `exiftool-vendored` - no separate installation required
- Built apps are fully self-contained and work out of the box
- See [BUNDLING-EXIFTOOL.md](BUNDLING-EXIFTOOL.md) for technical details
- See [packages/desktop/BUILD.md](packages/desktop/BUILD.md) for build instructions