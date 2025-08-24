# Film EXIF Editor

A clean, minimal desktop application for film photographers to easily fix camera metadata in scanned film images. Built with Electron and React, inspired by ImageOptim's simple drag-and-drop interface.

![Film EXIF Editor Screenshot](https://via.placeholder.com/800x600/2d3748/ffffff?text=Film+EXIF+Editor)

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

- **ExifTool**: Must be installed separately for EXIF editing functionality

### Installing ExifTool

**macOS:**
```bash
brew install exiftool
```

**Windows:**
Download from [exiftool.org](https://exiftool.org/) and add to PATH

**Linux:**
```bash
sudo apt-get install libimage-exiftool-perl
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/film-exif-editor.git
   cd film-exif-editor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Building for Production

### Build for Current Platform
```bash
npm run build
npm run dist
```

### Build for Specific Platforms
```bash
# macOS
npm run dist:mac

# Windows
npm run dist:win

# Linux
npm run dist:linux
```

Built applications will be available in the `dist/` directory.

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
- **Styling**: Tailwind CSS v3 with dark mode
- **Icons**: Iconify React
- **Storage**: electron-store
- **Build**: electron-builder

### Project Structure

```
film-exif-editor/
├── electron/
│   ├── main.ts          # Electron main process
│   └── preload.ts       # IPC preload script
├── src/
│   ├── components/      # React components
│   │   ├── DropZone.tsx
│   │   ├── Footer.tsx
│   │   ├── ProfileDropdown.tsx
│   │   ├── ProfileModal.tsx
│   │   └── ThemeSwitcher.tsx
│   ├── App.tsx          # Main React component
│   ├── ThemeContext.tsx # Theme management
│   └── types.ts         # TypeScript interfaces
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build React app
- `npm run electron:dev` - Start Electron in development
- `npm run electron:build` - Compile Electron TypeScript
- `npm run dist` - Build and package for distribution
- `npm run dist:mac` - Package for macOS
- `npm run dist:win` - Package for Windows  
- `npm run dist:linux` - Package for Linux

### IPC API

The app uses Electron's IPC for secure communication:

```typescript
interface ElectronAPI {
  getProfiles(): Promise<CameraProfile[]>
  saveProfile(profile: CameraProfile): Promise<void>
  deleteProfile(profileId: string): Promise<void>
  editExif(filePaths: string[], profile: CameraProfile): Promise<ProcessResult[]>
  showOpenDialog(): Promise<string[] | undefined>
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages: `git commit -m "Add feature description"`
5. Push to your fork: `git push origin feature-name`
6. Submit a pull request

## Troubleshooting

### ExifTool Not Found
Ensure ExifTool is installed and available in your system PATH:
```bash
exiftool -ver
```

### File Permissions
The app needs read/write access to image files. On macOS, you may need to grant permissions in System Preferences > Security & Privacy.

### Large Image Batches
For processing many images, be patient as ExifTool processes each file individually for accuracy.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [ImageOptim](https://imageoptim.com/)'s clean interface design
- Uses [ExifTool](https://exiftool.org/) by Phil Harvey for EXIF manipulation
- Icons provided by [Iconify](https://iconify.design/)

---

**Built for film photographers, by film photographers** 📸