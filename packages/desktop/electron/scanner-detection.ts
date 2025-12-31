/**
 * Scanner Detection Module
 *
 * Detects scanner metadata in EXIF data to help users identify when
 * they need to replace scanner-generated camera information with
 * actual film camera metadata.
 */

/**
 * Known scanner manufacturers and model identifiers.
 * This list covers consumer film scanners, professional lab scanners,
 * and dedicated film digitizers.
 */
export const SCANNER_BRANDS: readonly string[] = [
  'epson',
  'nikon',          // Nikon Coolscan series
  'plustek',
  'canon',          // Canon scanners (CanoScan series)
  'microtek',
  'pacific image',
  'reflecta',
  'braun',
  'minolta',        // Minolta Dimage scanners
  'polaroid',       // Polaroid SprintScan
  'imacon',
  'hasselblad',     // Hasselblad Flextight scanners
  'pakon',
  'frontier',       // Fuji Frontier lab scanners
  'noritsu',
  'sp-3000',        // Noritsu SP-3000
  'digitizer'
] as const

/**
 * Checks if the given make/model combination likely indicates scanner metadata.
 *
 * @param make - The camera make from EXIF data
 * @param model - The camera model from EXIF data
 * @returns true if the metadata appears to be from a scanner
 */
export function isLikelyScannerMetadata(make?: string, model?: string): boolean {
  const combined = `${make || ''} ${model || ''}`.toLowerCase()
  return SCANNER_BRANDS.some(brand => combined.includes(brand))
}

/**
 * Returns a user-friendly warning message if scanner metadata is detected.
 *
 * @param make - The camera make from EXIF data
 * @param model - The camera model from EXIF data
 * @returns A warning message if scanner detected, null otherwise
 */
export function getScannerWarning(make?: string, model?: string): string | null {
  if (!isLikelyScannerMetadata(make, model)) {
    return null
  }

  const combined = `${make || ''} ${model || ''}`.trim()
  return `Scanner metadata detected: "${combined}". This appears to be from a film scanner rather than the original camera.`
}
