// Standard film ISO values
export const STANDARD_ISO = [
  25, 50, 64, 100, 125, 160, 200, 400, 800, 1600, 3200
] as const

// Standard aperture values (f-stops)
export const STANDARD_APERTURES = [
  1.0, 1.2, 1.4, 1.8, 2.0, 2.4, 2.8, 3.2, 3.5, 4.0, 4.5, 5.6,
  6.3, 7.1, 8.0, 9.0, 10, 11, 13, 14, 16, 18, 20, 22, 32, 45, 64
] as const

// Shutter speed with display value and decimal representation
export interface ShutterSpeed {
  display: string // Human-readable format (e.g., "1/125")
  value: number // ExposureTime decimal (e.g., 0.008)
}

export const STANDARD_SHUTTER_SPEEDS: readonly ShutterSpeed[] = [
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
] as const

// Standard focal lengths in mm
export const STANDARD_FOCAL_LENGTHS = [
  14, 18, 20, 24, 28, 35, 40, 50, 55, 58, 75, 85, 90, 100,
  105, 135, 180, 200, 300, 400, 500, 600
] as const

// Exposure compensation values in EV
export const STANDARD_EV = [
  -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3
] as const

// Film format with name and crop factor for 35mm equivalent calculation
export interface FilmFormat {
  name: string
  cropFactor: number
}

export const FILM_FORMATS: readonly FilmFormat[] = [
  { name: '35mm Full Frame', cropFactor: 1.0 },
  { name: 'Medium Format 6x4.5', cropFactor: 0.62 },
  { name: 'Medium Format 6x6', cropFactor: 0.55 },
  { name: 'Medium Format 6x7', cropFactor: 0.5 },
  { name: 'Large Format 4x5', cropFactor: 0.27 },
] as const

// Known scanner brands for detecting scanner metadata
export const SCANNER_BRANDS = [
  'epson',
  'nikon', // Nikon scanners (Coolscan)
  'plustek',
  'canon', // Canon scanners (not cameras - detected by model patterns)
  'microtek',
  'pacific image',
  'reflecta',
  'braun',
  'minolta', // Dimage scanners
  'polaroid', // SprintScan
  'imacon',
  'hasselblad', // Flextight scanners
  'pakon',
  'frontier', // Fuji Frontier
  'noritsu',
  'sp-3000',
  'digitizer',
] as const

// Common film stocks for suggestions
export const COMMON_FILM_STOCKS = [
  // Color Negative
  'Kodak Portra 160',
  'Kodak Portra 400',
  'Kodak Portra 800',
  'Kodak Gold 200',
  'Kodak Ektar 100',
  'Kodak ColorPlus 200',
  'Kodak UltraMax 400',
  'Fujifilm Pro 400H',
  'Fujifilm Superia 400',
  'Fujifilm C200',
  // Black & White
  'Kodak Tri-X 400',
  'Kodak T-Max 100',
  'Kodak T-Max 400',
  'Ilford HP5 Plus 400',
  'Ilford Delta 100',
  'Ilford Delta 400',
  'Ilford FP4 Plus 125',
  'Ilford Pan F Plus 50',
  // Slide Film
  'Kodak Ektachrome E100',
  'Fujifilm Velvia 50',
  'Fujifilm Velvia 100',
  'Fujifilm Provia 100F',
] as const

// Helper function to format aperture for display
export function formatAperture(value: number): string {
  return `f/${value}`
}

// Helper function to get shutter speed display from value
export function getShutterSpeedDisplay(value: number): string {
  const speed = STANDARD_SHUTTER_SPEEDS.find(s => Math.abs(s.value - value) < 0.0001)
  if (speed) return speed.display
  if (value >= 1) return `${value}"`
  return `1/${Math.round(1 / value)}`
}

// Helper function to calculate 35mm equivalent focal length
export function calculate35mmEquivalent(focalLength: number, cropFactor: number): number {
  return Math.round(focalLength * cropFactor)
}

// Helper function to format exposure compensation for display
export function formatExposureComp(value: number): string {
  if (value === 0) return '0 EV'
  return `${value > 0 ? '+' : ''}${value} EV`
}
