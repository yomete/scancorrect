# ScanCorrect Enhanced Metadata Feature - Implementation Plan

> **Status as of 2026-06-11: phases below largely shipped (v0.3.2).**
> Remaining open items are listed in the "Remaining Steps to Complete" section below.
> New planned work lives in `plans/README.md`.

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

## New Feature: Per-Image Editing, Thumbnails & Bulk Date

### Interview Summary (January 2026)

#### Edit Model
- **Staged edits**: Changes accumulate in memory, written to disk on explicit "Save All"
- **Profile as template**: Profile pre-fills fields, user can override per-image
- **Warn on exit**: Block app close with unsaved changes dialog

#### Per-Image Editing
- **Right sidebar layout**: Grid on left, editor panel on right (min window: 1024px)
- **Click behavior**: Clicking an image deselects others and opens it in sidebar
- **Multi-select**: Shows mixed state with "Multiple values" indicator, edits apply immediately to all selected
- **Inline diff**: Show original→new side-by-side, "Restore" button to revert
- **Full keyboard nav**: Tab through fields, Enter saves, Escape cancels

#### Thumbnails
- **Source**: Extract embedded JPEG via exiftool (ThumbnailImage/PreviewImage tags)
- **Loading**: Async with spinners, images pop in as ready
- **Sizing**: Native size, CSS object-fit for consistent display
- **Fallback**: File type icons (current behavior) when extraction fails
- **Cache**: User setting to enable/disable persistent disk cache

#### Date Handling
- **Date only**: No time component handling
- **Smart propagation**: Set date for first image, propagates to all selected
- **Propagation order**: Filename sort (alphabetical/numerical)
- **UI location**: Integrated into sidebar (works for single and multi-select)

#### Conflict Resolution
- **Smart default**: Auto-override scanner-detected fields, preserve user-set fields
- **Scanner indicator**: Small badge/icon on fields that replaced scanner values
- **Per-field control**: User can override smart defaults field-by-field

#### Visual Indicators
- **Staged changes**: Colored border on grid thumbnails with pending changes
- **Scanner replaced**: Icon next to affected field labels in sidebar

#### State Management
- **Zustand**: New store for images, selection, and edits (replaces prop drilling)

#### Save/Discard
- **Save location**: Prominent button in toolbar
- **Discard all**: Prominent button near Save, with confirmation dialog

#### Sidebar Details
- **Thumbnail size**: Larger preview (300-400px) at top for single image
- **Field visibility**: Show only populated fields + "Add field" dropdown
- **Add field prefill**: Pre-fills from profile defaults if available

---

## Architecture

### New Dependencies
```json
{
  "zustand": "^4.x"
}
```

### File Structure
```
packages/desktop/src/
├── store/
│   ├── index.ts                    # Store exports
│   ├── imageStore.ts               # Zustand store for images/selection/edits
│   └── settingsStore.ts            # User preferences (cache setting, etc.)
├── components/
│   ├── Sidebar/
│   │   ├── index.ts
│   │   ├── ImageSidebar.tsx        # Main sidebar container
│   │   ├── SingleImageEditor.tsx   # Editor for single selected image
│   │   ├── MultiImageEditor.tsx    # Editor for multiple selected images
│   │   ├── FieldEditor.tsx         # Individual field with diff display
│   │   ├── AddFieldDropdown.tsx    # Dropdown to add empty fields
│   │   └── SidebarThumbnail.tsx    # Large thumbnail preview
│   ├── ImageGrid/
│   │   ├── ImageCard.tsx           # Updated with thumbnail support
│   │   └── ThumbnailPlaceholder.tsx # Spinner/fallback states
│   └── Toolbar/
│       ├── SaveDiscardButtons.tsx  # Save All / Discard All buttons
│       └── UnsavedIndicator.tsx    # Visual indicator of pending changes
├── hooks/
│   ├── useThumbnailExtraction.ts   # Hook for async thumbnail loading
│   └── useUnsavedChangesWarning.ts # Hook for exit warning
└── types.ts                        # Updated types
```

### Electron IPC Additions
```typescript
// New handlers in electron/main.ts
'extract-thumbnail': (filePath: string) => Promise<string | null>  // Returns base64 or null
'get-cache-setting': () => Promise<boolean>
'set-cache-setting': (enabled: boolean) => Promise<void>
'get-cached-thumbnail': (filePath: string) => Promise<string | null>
'cache-thumbnail': (filePath: string, base64: string) => Promise<void>
```

---

## Implementation Steps

### Phase 1: State Management Foundation

#### 1.1 Install Zustand
```bash
cd packages/desktop && npm install zustand
```

#### 1.2 Create Image Store
Create `src/store/imageStore.ts`:
- Migrate `images`, `selectedIds` state from App.tsx
- Add `pendingChanges` map keyed by image path
- Actions: `addImages`, `removeImages`, `selectImage`, `updatePendingChanges`, `discardAllChanges`, `discardImageChanges`
- Selectors: `getSelectedImages`, `hasUnsavedChanges`, `getImageWithPendingChanges`

#### 1.3 Create Settings Store
Create `src/store/settingsStore.ts`:
- `thumbnailCacheEnabled: boolean`
- Persist to electron-store

#### 1.4 Refactor App.tsx
- Remove image/selection state, use store hooks
- Keep profile state (separate concern)
- Simplify component to layout + orchestration

---

### Phase 2: Thumbnail Extraction

#### 2.1 Add IPC Handler for Thumbnail Extraction
In `electron/main.ts`:
```typescript
ipcMain.handle('extract-thumbnail', async (_, filePath: string) => {
  try {
    const tags = await exiftool.read(filePath, ['-ThumbnailImage', '-PreviewImage', '-b']);
    const thumbnail = tags.ThumbnailImage || tags.PreviewImage;
    if (thumbnail && Buffer.isBuffer(thumbnail)) {
      return `data:image/jpeg;base64,${thumbnail.toString('base64')}`;
    }
    return null;
  } catch {
    return null;
  }
});
```

#### 2.2 Add Thumbnail Caching IPC
- `get-cached-thumbnail`: Read from temp directory by hash of file path
- `cache-thumbnail`: Write base64 to temp directory
- `clear-thumbnail-cache`: Delete all cached thumbnails

#### 2.3 Create useThumbnailExtraction Hook
```typescript
function useThumbnailExtraction(filePath: string): {
  thumbnail: string | null;
  loading: boolean;
  error: boolean;
}
```
- Check cache first (if enabled)
- Extract via IPC
- Cache result (if enabled)
- Return loading/error states

#### 2.4 Update ImageCard Component
- Accept `thumbnail` prop (base64 string or null)
- Show spinner while loading
- Show image when available
- Fall back to file type icon on error/null
- Add colored border when image has pending changes

#### 2.5 Update ImageGrid
- Use `useThumbnailExtraction` for each image
- Pass thumbnail data to ImageCard

---

### Phase 3: Sidebar Editor

#### 3.1 Create Sidebar Container
`ImageSidebar.tsx`:
- Fixed width (320px)
- Scrollable content
- Conditional render based on selection count:
  - 0 selected: "Select an image to edit"
  - 1 selected: `<SingleImageEditor />`
  - 2+ selected: `<MultiImageEditor />`

#### 3.2 Create SingleImageEditor
- Large thumbnail at top (300px max height)
- Filename display
- List of populated fields using `<FieldEditor />`
- "Add field" dropdown at bottom
- Scanner replaced badges on affected fields

#### 3.3 Create MultiImageEditor
- Count indicator: "Editing X images"
- Smaller/no thumbnail (or grid of tiny thumbs)
- Fields show "Multiple values" when values differ
- Edits apply immediately to all selected (update store)
- Date field with smart propagation

#### 3.4 Create FieldEditor Component
Props: `field`, `existingValue`, `pendingValue`, `onRestore`, `onChange`, `scannerReplaced`
- Show label with optional scanner-replaced icon
- If values differ: inline diff display (existing → pending)
- Edit input appropriate to field type (text, dropdown, date picker)
- "Restore" button when modified

#### 3.5 Create AddFieldDropdown
- List all available fields not currently shown
- On select: add field with profile default (if exists) or empty
- Group by category if helpful (Camera, Exposure, Other)

#### 3.6 Update App Layout
- CSS Grid or Flexbox: `[grid | sidebar]`
- Enforce minimum window width: 1024px
- Sidebar always visible (no collapse needed per decisions)

---

### Phase 4: Bulk Date with Smart Propagation

#### 4.1 Add DateField to Sidebar
- Standard date input (existing DateField component)
- In multi-select mode: shows "Multiple values" or common date
- On change: propagate to all selected images

#### 4.2 Implement Smart Propagation
When date is set in multi-select mode:
1. Get selected images
2. Sort by filename (alphabetical/numerical)
3. Apply same date to all
4. Update store with new pending changes

---

### Phase 5: Conflict Resolution and Scanner Detection

#### 5.1 Enhance Scanner Detection
- Current: detects scanner make/model
- Add: flag in image state `hasScannerMetadata: boolean`
- Auto-apply profile to scanner-detected images

#### 5.2 Smart Default Behavior
When profile applied to image with existing EXIF:
- If field has scanner value → override with profile
- If field has non-scanner value → keep existing (user can override)
- Track which fields were scanner-replaced

#### 5.3 Scanner Replaced Badge
- Small icon component (e.g., `<ScannerReplacedIcon />`)
- Tooltip: "Replaced scanner metadata"
- Display next to field label in FieldEditor

---

### Phase 6: Save/Discard Flow

#### 6.1 Create SaveDiscardButtons Component
- "Save All Changes" button (primary)
- "Discard All" button (secondary/danger)
- Disabled states when no pending changes
- Count indicator: "X images modified"

#### 6.2 Implement Save All
1. Get all images with pending changes from store
2. For each: call `writeExif` IPC with merged data
3. Update image status in store (processing → success/error)
4. Clear pending changes on success
5. Show success/error summary

#### 6.3 Implement Discard All
1. Show confirmation dialog: "Discard changes to X images?"
2. On confirm: call `discardAllChanges` in store
3. Reset all pending changes to empty

#### 6.4 Unsaved Changes Warning
Create `useUnsavedChangesWarning` hook:
- Listen to `beforeunload` event
- If `hasUnsavedChanges`: show native dialog
- Block close until confirmed

Add Electron handler for window close:
```typescript
mainWindow.on('close', (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    // Show dialog via IPC
  }
});
```

---

### Phase 7: Visual Polish

#### 7.1 Pending Changes Border
In ImageCard CSS:
```css
.image-card--has-changes {
  border: 2px solid var(--accent-color);
}
```

#### 7.2 Loading States
- Thumbnail: Spinner overlay on card
- Save operation: Disable buttons, show progress

#### 7.3 Keyboard Navigation
- Tab order through sidebar fields
- Enter in field: move to next field
- Escape: blur current field
- Global: Cmd+S to save all

---

## Type Updates

```typescript
// src/types.ts additions

interface ImageFile {
  // ... existing fields ...
  thumbnail?: string;           // base64 data URL
  thumbnailLoading?: boolean;
  thumbnailError?: boolean;
  hasScannerMetadata?: boolean;
  scannerReplacedFields?: string[];  // ['make', 'model', etc.]
}

interface FieldDiff {
  field: string;
  existingValue: string | number | null;
  pendingValue: string | number | null;
  scannerReplaced: boolean;
}
```

---

## Testing Checklist

### Per-Image Editing
- [ ] Click image → opens in sidebar
- [ ] Edit field → shows diff
- [ ] Restore button → reverts to original
- [ ] Multi-select → shows mixed state
- [ ] Edit in multi-select → applies to all
- [ ] Add field → shows dropdown, prefills from profile
- [ ] Keyboard navigation works

### Thumbnails
- [ ] TIFF with embedded preview → shows thumbnail
- [ ] JPG → shows thumbnail
- [ ] File without preview → shows icon fallback
- [ ] Loading state shows spinner
- [ ] Cache enabled → faster on reload
- [ ] Cache disabled → extracts every time

### Bulk Date
- [ ] Set date in multi-select → applies to all
- [ ] Propagation follows filename order
- [ ] Works with smart propagation

### Conflict Resolution
- [ ] Scanner image → auto-replaces scanner fields
- [ ] Non-scanner image → preserves existing values
- [ ] Scanner badge shows on replaced fields
- [ ] Can override smart defaults manually

### Save/Discard
- [ ] Save All → writes to disk
- [ ] Discard All → shows confirmation
- [ ] Close with unsaved → shows warning
- [ ] Pending changes → colored border on cards

---

## Migration Notes

### Breaking Changes
- None expected (additive features)

### State Migration
- Existing App.tsx state moves to Zustand
- Profile state remains in App.tsx (or separate store later)
- No user data migration needed

### Performance Considerations
- Thumbnail extraction is async, won't block UI
- Large batches (100+ images): Consider virtualized grid
- Cache helps with repeated sessions

---

## Future Enhancements (Out of Scope)

- Time component handling for dates
- Collapsible sidebar for narrow screens
- Drag-and-drop field reordering
- Undo/redo stack for individual edits
- Image preview lightbox
- Batch rename based on metadata

---

## Technical Implementation (Original Plan)

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

---

## Enhanced Location Tagging - Premium Features (January 2026)

### Overview

Added premium location tagging features to differentiate free/paid tiers in ScanCorrect. These features provide a compelling upgrade path for users who need advanced location workflows.

### What Was Implemented

#### Feature Tier System
| Feature | Tier | Status |
|---------|------|--------|
| Location search (Nominatim) | Free | Existing |
| Manual coordinates | Free | Existing |
| Location history (recent 10) | Free | ✅ Implemented |
| Saved locations (3 max) | Free | ✅ Implemented |
| Saved locations (unlimited) | Paid | ✅ Implemented |
| Interactive Mapbox map picker | Paid | ✅ Implemented |
| GPX track import with time matching | Paid | ✅ Implemented |

#### New Files Created

**Feature System:**
- `packages/desktop/src/features/featureFlags.ts` - Zustand store for tier management
- `packages/desktop/src/components/FeatureGate/FeatureGate.tsx` - Component for gating paid features

**Location Management:**
- `packages/desktop/src/store/locationStore.ts` - Zustand store for saved locations & history
- `packages/desktop/src/components/SavedLocations/SavedLocationsList.tsx`
- `packages/desktop/src/components/SavedLocations/SavedLocationItem.tsx`

**Map Picker (Paid Feature):**
- `packages/desktop/electron/mapbox.ts` - Mapbox reverse geocoding
- `packages/desktop/src/components/MapPicker/MapPicker.tsx` - Interactive Mapbox GL JS map
- `packages/desktop/src/components/MapPicker/MapPickerModal.tsx`

**GPX Import (Paid Feature):**
- `packages/desktop/electron/gpx.ts` - GPX parsing & photo matching algorithm
- `packages/desktop/src/components/GPXImport/GPXImportModal.tsx`
- `packages/desktop/src/components/GPXImport/GPXMatchResults.tsx`

**Enhanced LocationField:**
- `packages/desktop/src/components/MetadataEditor/LocationFieldEnhanced.tsx` - All features integrated

#### Modified Files
- `packages/desktop/src/types.ts` - New type definitions for location features
- `packages/desktop/electron/main.ts` - IPC handlers for saved locations, history, GPX, tier
- `packages/desktop/electron/preload.ts` - Exposed new APIs to renderer
- `packages/desktop/electron/exif.ts` - Full timestamp extraction (dateTimeOriginal) for GPX matching

---

### Remaining Steps to Complete

#### 1. Mapbox API Token Configuration
**Priority: High | Effort: Low**

The Mapbox map picker requires an access token to function.

- [ ] Create a Mapbox account and generate an access token at https://mapbox.com
- [ ] Add `VITE_MAPBOX_TOKEN` to your `.env` file:
  ```
  VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
  ```
- [ ] For production builds, add the token to your CI/CD environment variables
- [ ] Consider adding a user settings panel where users can input their own token

#### 2. Integrate LocationFieldEnhanced into the App
**Priority: High | Effort: Medium**

Replace the existing `LocationField` with `LocationFieldEnhanced` to enable all new features.

**Files to update:**
- [ ] `packages/desktop/src/components/Sidebar/SingleImageEditor.tsx`
  - Replace `LocationField` import with `LocationFieldEnhanced`
  - Pass `onOpenGPXImport` callback prop
- [ ] `packages/desktop/src/components/ProfileWizard/LocationStep.tsx`
  - Replace `LocationField` with `LocationFieldEnhanced`
- [ ] `packages/desktop/src/components/BulkActions/BulkLocationModal.tsx`
  - Add "Pick on Map" and "From GPX" buttons using `FeatureButton`

#### 3. Add GPX Import to Bulk Actions
**Priority: High | Effort: Medium**

Wire up the GPX import modal to the bulk action bar.

- [ ] Add GPX import button to `BulkActionBar.tsx`:
  ```tsx
  <FeatureButton feature="gpxImport" onClick={() => setShowGPXModal(true)}>
    <Icon icon="mdi:map-marker-path" /> Import GPX
  </FeatureButton>
  ```
- [ ] Add `GPXImportModal` to App.tsx or parent component
- [ ] Pass selected images with their `dateTimeOriginal` to the modal
- [ ] Handle the `onApply` callback to update pending changes for matched images

#### 4. Load User Tier from Storage
**Priority: Medium | Effort: Low**

Currently the tier defaults to 'free'. Connect it to persistent storage.

- [ ] Add `useEffect` in App.tsx to load tier on startup:
  ```tsx
  useEffect(() => {
    window.electronAPI.getUserTier().then(tier => {
      useFeatureFlags.getState().setTier(tier)
    })
  }, [])
  ```
- [ ] Create a settings UI to toggle tier (for testing/development)
- [ ] Eventually: integrate with license server or payment provider

#### 5. Upgrade Prompts & CTAs
**Priority: Medium | Effort: Medium**

Make the upgrade prompts link to an actual upgrade flow.

- [ ] Update `UpgradePrompt` in `FeatureGate.tsx` to include a real upgrade link
- [ ] Decide on upgrade destination:
  - Website pricing page
  - In-app purchase (if using Electron's native purchasing)
  - License key input modal
- [ ] Track upgrade prompt impressions for analytics

#### 6. Settings Panel for Mapbox Token
**Priority: Low | Effort: Medium**

Allow power users to provide their own Mapbox token.

- [ ] Add "Location" section to app settings (if settings panel exists)
- [ ] Input field for custom Mapbox token with "Test" button
- [ ] Save custom token via `window.electronAPI.setMapboxToken()`
- [ ] Show success/error feedback for token validation

#### 7. Testing Checklist
**Priority: High | Effort: Medium**

- [ ] **Saved Locations**
  - Save a location
  - Toggle favorite
  - Delete a location
  - Verify 3-location limit for free tier
  - Verify unlimited for paid tier

- [ ] **Location History**
  - Search for a location → appears in history
  - Pick from map → appears in history
  - Apply from GPX → appears in history
  - History limited to 10 entries

- [ ] **Map Picker (requires Mapbox token)**
  - Modal opens correctly
  - Click on map places marker
  - Reverse geocode shows location name
  - Apply button sets location value
  - Locked behind paid tier gate

- [ ] **GPX Import (requires test GPX file)**
  - Import GPX file opens dialog
  - Track is parsed correctly
  - Time tolerance slider works
  - Photo matching shows confidence levels
  - Apply to selected images works
  - Locked behind paid tier gate

#### 8. Documentation Updates
**Priority: Low | Effort: Low**

- [ ] Update README.md with new features
- [ ] Add section about free vs paid features
- [ ] Document Mapbox token setup for developers
- [ ] Add GPX import to feature list on website

---

### Quick Testing Commands

```bash
# Set tier to paid for testing all features
# In browser console after app loads:
useFeatureFlags.getState().setTier('paid')

# Check current tier
useFeatureFlags.getState().currentTier

# Reset to free tier
useFeatureFlags.getState().setTier('free')
```

### Dependencies Added

```json
{
  "mapbox-gl": "^3.x",
  "fast-xml-parser": "^4.x",
  "@types/mapbox-gl": "^3.x" (dev)
}
```

### Architecture Notes

- **Feature flags** use Zustand for reactive state, stored in electron-store for persistence
- **Saved locations** stored in electron-store, synced to Zustand on app load
- **GPX matching** uses binary search for efficiency; timestamps must be in ISO format
- **Mapbox** requires network access; falls back to coordinates-only if reverse geocode fails
- **EXIF timestamps** now include full time component (`dateTimeOriginal`) for GPX matching
