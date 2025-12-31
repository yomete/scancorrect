# ScanCorrect Enhanced Metadata Feature - Implementation Plan

## Overview

This document outlines the implementation plan for adding comprehensive metadata editing capabilities to ScanCorrect, including location geocoding, exposure settings, film stock information, and enhanced profile management.

---

## Interview Summary - Key Decisions

### Geocoding & Location
- **Service**: Nominatim (OpenStreetMap) - free, privacy-friendly, 1 req/sec rate limit
- **Input UX**: Manual search button (type location, click Search)
- **Ambiguous results**: Show dropdown list for user to select correct location
- **Bulk assignment**: Prompt user when conflicts exist with individual locations
- **GPS data**: Latitude/Longitude only (no altitude)
- **Manual GPS**: Available behind "Advanced" toggle for power users
- **Error handling**: Inline error messages in the location field

### Metadata Fields to Add
1. **Location** (GPSLatitude, GPSLongitude)
2. **ISO** (ISO tag)
3. **Aperture** (FNumber) - display as f/X
4. **Shutter Speed** (ExposureTime) - display as fractions (1/125), store as decimal
5. **Film Stock** (ImageDescription tag)
6. **Date** (DateTimeOriginal) - date only, no time, write time as 12:00:00
7. **Focal Length** (FocalLength) - with optional 35mm equivalent display
8. **Exposure Compensation** (ExposureBiasValue) - shows calculated effective ISO

### Value Input Style
- **Constrained dropdowns** with standard values
- **Custom values allowed** and persisted for future use
- Format-specific values:
  - Aperture: Display f/X, store raw number
  - Shutter: Display fractions, convert to ExposureTime decimal
  - ISO: Standard film ISOs + custom
  - Focal length: Common values + custom
  - Exposure comp: Standard EV stops

### 35mm Equivalent - Supported Formats
- 35mm (1.0x crop factor)
- Medium Format 6x4.5 (0.62x)
- Medium Format 6x6 (0.55x)
- Medium Format 6x7 (0.5x)
- Large Format 4x5 (0.27x)

### Profile System
- **Extend existing profiles** to include default metadata values
- **Auto-populate on drop**: When images dropped, profile defaults fill in automatically
- **Multi-step wizard** for profile creation:
  - Step 1: Camera info (Make, Model, Lens)
  - Step 2: Default exposure (ISO, Aperture, Shutter, Focal Length, EV)
  - Step 3: Default location & film stock
  - **Skippable steps** with "Skip" button

### UI Changes
- **Card grid view** showing file name/icon (no thumbnails to avoid performance issues)
- **Checkbox selection** for bulk operations
- **Selection resets** after each bulk action
- **Sort order**: Alphabetical by filename
- **Manual clear only** - results persist until user clears or drops new images

### EXIF Reading & Merge
- **Show existing EXIF** data when images are dropped
- **Side-by-side comparison** for conflicts (Existing: X | New: Y) with radio buttons
- **Highlight scanner metadata** - hardcoded list of scanner brands (Epson, Nikon, Plustek, Canon, etc.)

### Save & Undo
- **Save immediately** when metadata assigned (no staging)
- **Full undo feature** - keep backup files, add Undo button
- **Backup retention**: Session only (deleted when app closes)
- **File lock handling**: Skip locked files, continue with others, report failures

### History & Keyboard
- **Full processing log** - detailed log of all edits with timestamps and values
- **Standard keyboard shortcuts**: Cmd/Ctrl+A (select all), Cmd/Ctrl+S (save), Escape (close modals)

---

## Technical Implementation

### Phase 1: Data Model Updates

#### 1.1 Extended CameraProfile Interface

```typescript
// electron/main.ts
interface CameraProfile {
  id: string
  name: string
  make: string
  model: string
  lens?: string
  // New default metadata fields
  defaults?: {
    iso?: number
    aperture?: number          // Store as raw number (2.8, not "f/2.8")
    shutterSpeed?: number      // Store as decimal seconds (0.008 for 1/125)
    focalLength?: number       // Actual focal length in mm
    filmFormat?: string        // For 35mm equivalent calculation
    exposureComp?: number      // EV value (-2, -1, 0, +1, +2, etc.)
    filmStock?: string         // Written to ImageDescription
    location?: {
      name: string             // Display name
      latitude: number
      longitude: number
    }
  }
}
```

#### 1.2 Image Metadata State Interface

```typescript
// src/types.ts
interface ImageFile {
  path: string
  filename: string
  existingExif?: ExifData       // Read from file
  pendingChanges?: ExifData     // User modifications
  mergeDecisions?: MergeDecision[] // User choices for conflicts
  selected: boolean
  status: 'pending' | 'processing' | 'success' | 'error'
  error?: string
}

interface ExifData {
  make?: string
  model?: string
  lens?: string
  iso?: number
  aperture?: number
  shutterSpeed?: number
  focalLength?: number
  exposureComp?: number
  filmStock?: string
  location?: {
    name: string
    latitude: number
    longitude: number
  }
  dateOriginal?: string        // YYYY-MM-DD format
}

interface MergeDecision {
  field: keyof ExifData
  choice: 'keep' | 'overwrite'
}
```

#### 1.3 Processing Log Entry

```typescript
interface ProcessingLogEntry {
  id: string
  timestamp: Date
  filePath: string
  filename: string
  profileUsed?: string
  changesApplied: Partial<ExifData>
  success: boolean
  error?: string
  backupPath?: string          // For undo functionality
}
```

#### 1.4 Custom Values Storage

```typescript
interface CustomValues {
  isoValues: number[]          // User-added ISO values
  apertureValues: number[]     // User-added aperture values
  shutterSpeeds: number[]      // User-added shutter speeds (as decimals)
  focalLengths: number[]       // User-added focal lengths
}
```

### Phase 2: Backend/IPC Changes

#### 2.1 New IPC Handlers

```typescript
// electron/main.ts - New handlers to add

// Geocoding
ipcMain.handle('geocode-location', async (_, query: string) => {
  // Call Nominatim API with 1 req/sec rate limiting
  // Return array of results for user selection
})

// Read existing EXIF
ipcMain.handle('read-exif', async (_, filePath: string) => {
  // Use exiftool.read() to get current metadata
  // Return structured ExifData object
})

// Write EXIF with backup
ipcMain.handle('write-exif', async (_, filePath: string, data: ExifData) => {
  // Remove -overwrite_original flag to keep backups
  // Return backup file path for undo tracking
})

// Undo/restore from backup
ipcMain.handle('restore-backup', async (_, filePath: string, backupPath: string) => {
  // Restore original file from backup
})

// Cleanup session backups
ipcMain.handle('cleanup-backups', async (_, backupPaths: string[]) => {
  // Delete backup files on session end
})

// Custom values management
ipcMain.handle('get-custom-values', async () => {
  // Return stored custom dropdown values
})

ipcMain.handle('save-custom-value', async (_, field: string, value: number) => {
  // Add custom value to stored list
})

// Processing log
ipcMain.handle('get-processing-log', async () => {
  // Return full processing history
})

ipcMain.handle('add-log-entry', async (_, entry: ProcessingLogEntry) => {
  // Add entry to processing log
})

ipcMain.handle('clear-processing-log', async () => {
  // Clear all log entries
})
```

#### 2.2 Nominatim Integration

```typescript
// electron/geocoding.ts
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const RATE_LIMIT_MS = 1000

let lastRequestTime = 0

export async function geocodeLocation(query: string): Promise<GeocodingResult[]> {
  // Enforce rate limiting
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()

  const url = new URL(NOMINATIM_BASE)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '5')

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'ScanCorrect/1.0 (film-exif-editor)'  // Required by Nominatim
    }
  })

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`)
  }

  const results = await response.json()
  return results.map((r: any) => ({
    displayName: r.display_name,
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    type: r.type
  }))
}

interface GeocodingResult {
  displayName: string
  latitude: number
  longitude: number
  type: string
}
```

#### 2.3 Extended EXIF Writing

```typescript
// electron/exif.ts
export async function writeExifData(
  filePath: string,
  data: ExifData,
  keepBackup: boolean = true
): Promise<{ success: boolean; backupPath?: string; error?: string }> {

  const tags: Record<string, any> = {}

  if (data.make) tags.Make = data.make
  if (data.model) tags.Model = data.model
  if (data.lens) tags.LensModel = data.lens
  if (data.iso) tags.ISO = data.iso
  if (data.aperture) tags.FNumber = data.aperture
  if (data.shutterSpeed) tags.ExposureTime = data.shutterSpeed
  if (data.focalLength) tags.FocalLength = data.focalLength
  if (data.exposureComp) tags.ExposureBiasValue = data.exposureComp
  if (data.filmStock) tags.ImageDescription = data.filmStock

  if (data.location) {
    tags.GPSLatitude = data.location.latitude
    tags.GPSLongitude = data.location.longitude
    tags.GPSLatitudeRef = data.location.latitude >= 0 ? 'N' : 'S'
    tags.GPSLongitudeRef = data.location.longitude >= 0 ? 'E' : 'W'
  }

  if (data.dateOriginal) {
    // Convert YYYY-MM-DD to EXIF format YYYY:MM:DD HH:MM:SS
    tags.DateTimeOriginal = `${data.dateOriginal.replace(/-/g, ':')} 12:00:00`
  }

  const options = keepBackup ? [] : ['-overwrite_original']

  await exiftool.write(filePath, tags, options)

  const backupPath = keepBackup ? `${filePath}_original` : undefined
  return { success: true, backupPath }
}
```

#### 2.4 Scanner Detection

```typescript
// electron/scanner-detection.ts
const SCANNER_BRANDS = [
  'epson',
  'nikon',       // Nikon scanners (Coolscan)
  'plustek',
  'canon',       // Canon scanners (not cameras - detected by model patterns)
  'microtek',
  'pacific image',
  'reflecta',
  'braun',
  'minolta',     // Dimage scanners
  'polaroid',    // SprintScan
  'imacon',
  'hasselblad',  // Flextight scanners
  'pakon',
  'frontier',    // Fuji Frontier
  'noritsu',
  'sp-3000',
  'digitizer'
]

export function isLikelyScannerMetadata(make?: string, model?: string): boolean {
  const makeModel = `${make || ''} ${model || ''}`.toLowerCase()
  return SCANNER_BRANDS.some(brand => makeModel.includes(brand))
}
```

### Phase 3: UI Components

#### 3.1 New Components to Create

```
src/components/
├── ImageGrid/
│   ├── ImageGrid.tsx          # Card grid container with selection
│   ├── ImageCard.tsx          # Individual image card
│   └── ImageGrid.css
├── MetadataEditor/
│   ├── MetadataEditor.tsx     # Main editor panel
│   ├── LocationField.tsx      # Location search + geocoding
│   ├── ExposureFields.tsx     # ISO, aperture, shutter, focal length, EV
│   ├── FilmStockField.tsx     # Film stock with suggestions
│   ├── DateField.tsx          # Date picker
│   └── MergeConflict.tsx      # Side-by-side comparison UI
├── ProfileWizard/
│   ├── ProfileWizard.tsx      # Multi-step wizard container
│   ├── CameraStep.tsx         # Step 1: Camera info
│   ├── ExposureStep.tsx       # Step 2: Exposure defaults
│   └── LocationStep.tsx       # Step 3: Location & film defaults
├── BulkActions/
│   ├── BulkActionBar.tsx      # Bulk selection controls
│   └── BulkLocationModal.tsx  # Bulk location assignment
├── ProcessingLog/
│   ├── ProcessingLog.tsx      # Log viewer
│   └── LogEntry.tsx           # Individual log entry
└── common/
    ├── ConstrainedDropdown.tsx # Dropdown with custom value support
    └── KeyboardShortcuts.tsx   # Global keyboard handler
```

#### 3.2 ImageCard Component

```tsx
// src/components/ImageGrid/ImageCard.tsx
interface ImageCardProps {
  image: ImageFile
  selected: boolean
  onSelect: (selected: boolean) => void
  onClick: () => void
  showScannerWarning: boolean
}

// Display:
// - Checkbox for selection
// - File icon (no thumbnail)
// - Filename
// - Status indicator (pending/processing/success/error)
// - Scanner warning icon if detected
// - Brief metadata summary
```

#### 3.3 LocationField Component

```tsx
// src/components/MetadataEditor/LocationField.tsx
interface LocationFieldProps {
  value?: { name: string; latitude: number; longitude: number }
  onChange: (location: LocationValue | undefined) => void
  error?: string
}

// Features:
// - Text input for location search
// - "Search" button (manual trigger)
// - Dropdown for ambiguous results
// - "Advanced" toggle revealing lat/long inputs
// - Inline error display
// - Clear button
```

#### 3.4 ConstrainedDropdown Component

```tsx
// src/components/common/ConstrainedDropdown.tsx
interface ConstrainedDropdownProps<T> {
  label: string
  value: T | undefined
  options: T[]
  customValues: T[]
  onChange: (value: T) => void
  onAddCustom: (value: T) => void
  formatDisplay: (value: T) => string
  parseInput: (input: string) => T | null
  placeholder?: string
}

// Features:
// - Standard value options
// - Custom values section (user-added)
// - "Add custom value" option at bottom
// - Input validation for custom values
```

#### 3.5 MergeConflict Component

```tsx
// src/components/MetadataEditor/MergeConflict.tsx
interface MergeConflictProps {
  field: string
  existingValue: any
  newValue: any
  choice: 'keep' | 'overwrite'
  onChange: (choice: 'keep' | 'overwrite') => void
  isScannerData: boolean
}

// Display:
// - Field label
// - "Existing: [value]" with radio button
// - "New: [value]" with radio button
// - Scanner warning icon if applicable
// - Visual styling: scanner data in amber, selected choice highlighted
```

#### 3.6 ProfileWizard Component

```tsx
// src/components/ProfileWizard/ProfileWizard.tsx
interface ProfileWizardProps {
  isOpen: boolean
  onClose: () => void
  onSave: (profile: CameraProfile) => void
  editingProfile?: CameraProfile  // For editing existing profiles
}

// Steps:
// 1. Camera Info (required): Name, Make, Model, Lens
// 2. Exposure Defaults (optional): ISO, Aperture, Shutter, Focal Length, Format, EV
// 3. Location & Film (optional): Default location, Film stock

// Navigation:
// - Step indicator at top
// - Back/Next buttons
// - "Skip" button on steps 2 & 3
// - "Save" button on final step (or after skip)
```

### Phase 4: State Management

#### 4.1 Main App State

```typescript
// src/App.tsx - Extended state
interface AppState {
  // Existing
  profiles: CameraProfile[]
  selectedProfileId: string | null

  // New
  images: ImageFile[]
  selectedImageIds: Set<string>
  customValues: CustomValues
  processingLog: ProcessingLogEntry[]
  sessionBackups: Map<string, string>  // filePath -> backupPath

  // UI state
  isProcessing: boolean
  showProfileWizard: boolean
  showProcessingLog: boolean
  showBulkLocationModal: boolean
}
```

#### 4.2 Keyboard Shortcuts

```typescript
// src/hooks/useKeyboardShortcuts.ts
const shortcuts = {
  'mod+a': selectAllImages,
  'mod+s': saveAllChanges,
  'mod+z': undoLastBatch,
  'Escape': closeModals,
  'Delete': removeSelectedImages,
  'mod+shift+a': deselectAllImages,
}
```

### Phase 5: Standard Dropdown Values

#### 5.1 ISO Values
```typescript
const STANDARD_ISO = [25, 50, 64, 100, 125, 160, 200, 400, 800, 1600, 3200]
```

#### 5.2 Aperture Values
```typescript
const STANDARD_APERTURES = [
  1.0, 1.2, 1.4, 1.8, 2.0, 2.4, 2.8, 3.2, 3.5, 4.0, 4.5, 5.6,
  6.3, 7.1, 8.0, 9.0, 10, 11, 13, 14, 16, 18, 20, 22, 32, 45, 64
]
```

#### 5.3 Shutter Speed Values
```typescript
// Display value -> ExposureTime decimal
const STANDARD_SHUTTER_SPEEDS = [
  { display: '30"', value: 30 },
  { display: '15"', value: 15 },
  { display: '8"', value: 8 },
  { display: '4"', value: 4 },
  { display: '2"', value: 2 },
  { display: '1"', value: 1 },
  { display: '1/2', value: 0.5 },
  { display: '1/4', value: 0.25 },
  { display: '1/8', value: 0.125 },
  { display: '1/15', value: 0.0667 },
  { display: '1/30', value: 0.0333 },
  { display: '1/60', value: 0.0167 },
  { display: '1/125', value: 0.008 },
  { display: '1/250', value: 0.004 },
  { display: '1/500', value: 0.002 },
  { display: '1/1000', value: 0.001 },
  { display: '1/2000', value: 0.0005 },
  { display: '1/4000', value: 0.00025 },
  { display: '1/8000', value: 0.000125 },
]
```

#### 5.4 Focal Length Values
```typescript
const STANDARD_FOCAL_LENGTHS = [
  14, 18, 20, 24, 28, 35, 40, 50, 55, 58, 75, 85, 90, 100,
  105, 135, 180, 200, 300, 400, 500, 600
]
```

#### 5.5 Exposure Compensation Values
```typescript
const STANDARD_EV = [-3, -2.5, -2, -1.5, -1, -0.5, 0, +0.5, +1, +1.5, +2, +2.5, +3]
```

#### 5.6 Film Formats with Crop Factors
```typescript
const FILM_FORMATS = [
  { name: '35mm Full Frame', cropFactor: 1.0 },
  { name: 'Medium Format 6x4.5', cropFactor: 0.62 },
  { name: 'Medium Format 6x6', cropFactor: 0.55 },
  { name: 'Medium Format 6x7', cropFactor: 0.5 },
  { name: 'Large Format 4x5', cropFactor: 0.27 },
]
```

### Phase 6: User Flows

#### 6.1 Basic Image Processing Flow

1. User drops image files onto DropZone
2. App filters for supported formats (jpg, jpeg, tiff, tif)
3. App reads existing EXIF for each file (parallel)
4. Images appear in card grid, sorted alphabetically by filename
5. If profile selected, profile defaults auto-populate pending changes
6. App identifies scanner metadata and shows warnings
7. For fields with conflicts, side-by-side comparison shown
8. User can:
   - Edit individual image metadata
   - Select multiple images with checkboxes
   - Apply bulk location/metadata to selection
9. When user modifies a value, it's saved immediately to file
10. Backup file created for each edited file
11. Success/error shown per file
12. Processing log updated
13. "Undo" available for session
14. On app close, backup files deleted

#### 6.2 Profile Creation Flow

1. User clicks "Add Profile" button
2. Profile wizard opens
3. Step 1 - Camera Info:
   - Enter profile name (required)
   - Enter camera make (required)
   - Enter camera model (required)
   - Enter lens (optional)
   - Click Next
4. Step 2 - Exposure Defaults (can skip):
   - Select default ISO from dropdown
   - Select default aperture
   - Select default shutter speed
   - Select default focal length
   - Select film format (for 35mm equivalent)
   - Select exposure compensation
   - Click Next or Skip
5. Step 3 - Location & Film (can skip):
   - Search and select default location
   - Enter default film stock
   - Click Save or Skip
6. Profile saved and auto-selected

#### 6.3 Bulk Location Assignment Flow

1. User selects multiple images via checkboxes
2. User clicks "Set Location" in bulk action bar
3. Bulk location modal opens
4. User searches for location using Nominatim
5. User selects from results dropdown
6. User clicks "Apply"
7. App checks for images with existing locations
8. If conflicts exist, prompt: "X images have existing locations. Overwrite?"
   - Options: "Overwrite All", "Skip Existing", "Cancel"
9. Location written to selected files immediately
10. Selection cleared
11. Results shown per file

### Phase 7: Implementation Order

#### Sprint 1: Foundation
1. Update CameraProfile interface with defaults
2. Implement extended EXIF writing function
3. Add read-exif IPC handler
4. Create ImageFile state structure
5. Build basic ImageGrid component

#### Sprint 2: Core Metadata UI
1. Build ConstrainedDropdown component
2. Build MetadataEditor component
3. Implement exposure fields (ISO, aperture, shutter, focal length)
4. Add exposure compensation with effective ISO display
5. Implement film stock field

#### Sprint 3: Geocoding & Location
1. Implement Nominatim geocoding service with rate limiting
2. Build LocationField component
3. Add location search and dropdown selection
4. Implement manual GPS coordinate entry (advanced mode)
5. Add inline error handling for geocoding

#### Sprint 4: Profile Wizard
1. Build ProfileWizard multi-step container
2. Build CameraStep component
3. Build ExposureStep component
4. Build LocationStep component
5. Implement step skipping logic

#### Sprint 5: EXIF Reading & Merge
1. Implement scanner detection logic
2. Build MergeConflict component
3. Add side-by-side comparison UI
4. Wire up merge decisions to write flow
5. Add scanner metadata highlighting

#### Sprint 6: Bulk Operations & Selection
1. Implement checkbox selection in ImageCard
2. Build BulkActionBar component
3. Build BulkLocationModal
4. Implement conflict prompt for bulk operations
5. Add selection reset after actions

#### Sprint 7: Undo & History
1. Modify write to keep backup files
2. Track session backups
3. Implement restore-backup handler
4. Build undo UI
5. Implement session cleanup on app close

#### Sprint 8: Processing Log
1. Define ProcessingLogEntry schema
2. Add electron-store for log persistence
3. Build ProcessingLog component
4. Build LogEntry component
5. Wire up log creation on each process

#### Sprint 9: Custom Values & Keyboard
1. Implement custom values storage
2. Add "Add custom value" to dropdowns
3. Persist custom values between sessions
4. Implement keyboard shortcuts
5. Add 35mm equivalent calculation display

#### Sprint 10: Date & Polish
1. Build DateField component with date picker
2. Implement DateTimeOriginal writing
3. Final UI polish and responsive design
4. Error state improvements
5. Testing and bug fixes

---

## File Changes Summary

### Modified Files
- `packages/desktop/electron/main.ts` - New IPC handlers, extended write function
- `packages/desktop/electron/preload.ts` - Expose new IPC methods
- `packages/desktop/src/App.tsx` - Extended state, new flows
- `packages/desktop/src/App.css` - Updated styles
- `packages/desktop/src/components/DropZone.tsx` - Integration with ImageGrid
- `packages/desktop/src/components/ProfileModal.tsx` - Replace with ProfileWizard
- `packages/desktop/src/components/Footer.tsx` - Add new action buttons

### New Files
- `packages/desktop/electron/geocoding.ts` - Nominatim integration
- `packages/desktop/electron/exif.ts` - Extended EXIF read/write
- `packages/desktop/electron/scanner-detection.ts` - Scanner brand detection
- `packages/desktop/src/types.ts` - TypeScript interfaces
- `packages/desktop/src/constants/metadata.ts` - Standard dropdown values
- `packages/desktop/src/hooks/useKeyboardShortcuts.ts` - Keyboard handler
- `packages/desktop/src/components/ImageGrid/` - Grid components
- `packages/desktop/src/components/MetadataEditor/` - Editor components
- `packages/desktop/src/components/ProfileWizard/` - Wizard components
- `packages/desktop/src/components/BulkActions/` - Bulk operation components
- `packages/desktop/src/components/ProcessingLog/` - Log components
- `packages/desktop/src/components/common/` - Shared components

---

## Technical Considerations

### Rate Limiting for Nominatim
- Implement request queue with 1-second minimum interval
- Show loading state during geocoding
- Cache recent searches in memory

### Performance
- Read EXIF in parallel for multiple files
- Write EXIF sequentially to avoid race conditions
- Lazy-load processing log entries

### Data Persistence
- Custom values stored in electron-store
- Processing log stored in electron-store
- Backup files stored alongside originals (session-scoped cleanup)

### Error Handling
- Network errors for geocoding: inline display, allow retry
- File lock errors: skip and report, continue with others
- EXIF write errors: report per-file, don't block batch

### Electron Security
- All file operations through IPC handlers
- Geocoding requests from main process (avoid CORS)
- Preload script exposes only necessary methods
