import { describe, it, expect } from 'vitest'
import {
  isLikelyScannerMetadata,
  getScannerWarning,
  SCANNER_BRANDS
} from '../scanner-detection'

describe('scanner-detection', () => {
  describe('SCANNER_BRANDS', () => {
    it('should contain known scanner brands', () => {
      expect(SCANNER_BRANDS).toContain('epson')
      expect(SCANNER_BRANDS).toContain('nikon')
      expect(SCANNER_BRANDS).toContain('plustek')
      expect(SCANNER_BRANDS).toContain('canon')
      expect(SCANNER_BRANDS).toContain('frontier')
      expect(SCANNER_BRANDS).toContain('noritsu')
    })

    it('should have at least 16 brands', () => {
      expect(SCANNER_BRANDS.length).toBeGreaterThanOrEqual(16)
    })
  })

  describe('isLikelyScannerMetadata', () => {
    it('should return true for Epson scanners', () => {
      expect(isLikelyScannerMetadata('EPSON', 'Perfection V850')).toBe(true)
      expect(isLikelyScannerMetadata('Epson', 'V600')).toBe(true)
    })

    it('should return true for Nikon scanners', () => {
      expect(isLikelyScannerMetadata('NIKON', 'COOLSCAN V')).toBe(true)
      expect(isLikelyScannerMetadata('Nikon', 'Super Coolscan 5000')).toBe(true)
    })

    it('should return true for Plustek scanners', () => {
      expect(isLikelyScannerMetadata('Plustek', 'OpticFilm 8200i')).toBe(true)
    })

    it('should return true for lab scanners', () => {
      expect(isLikelyScannerMetadata('Fuji', 'Frontier SP-3000')).toBe(true)
      expect(isLikelyScannerMetadata('Noritsu', 'HS-1800')).toBe(true)
    })

    it('should return true when scanner is in model only', () => {
      expect(isLikelyScannerMetadata('', 'Epson V850')).toBe(true)
      expect(isLikelyScannerMetadata(undefined, 'Nikon Coolscan')).toBe(true)
    })

    it('should return true when scanner is in make only', () => {
      expect(isLikelyScannerMetadata('Plustek', '')).toBe(true)
      expect(isLikelyScannerMetadata('Epson', undefined)).toBe(true)
    })

    it('should be case-insensitive', () => {
      expect(isLikelyScannerMetadata('EPSON', 'V850')).toBe(true)
      expect(isLikelyScannerMetadata('epson', 'v850')).toBe(true)
      expect(isLikelyScannerMetadata('EpSoN', 'V850')).toBe(true)
    })

    it('should return false for real cameras (non-scanner brands)', () => {
      expect(isLikelyScannerMetadata('SONY', 'A7 III')).toBe(false)
      expect(isLikelyScannerMetadata('FUJIFILM', 'X-T4')).toBe(false)
      expect(isLikelyScannerMetadata('Leica', 'M10')).toBe(false)
      expect(isLikelyScannerMetadata('Pentax', 'K-1')).toBe(false)
    })

    // Note: Canon is detected as scanner since CanoScan scanners exist
    // This is a known limitation - the detection is conservative
    it('should detect Canon as potential scanner (CanoScan series)', () => {
      expect(isLikelyScannerMetadata('Canon', 'CanoScan 9000F')).toBe(true)
    })

    it('should return false for empty/undefined values', () => {
      expect(isLikelyScannerMetadata(undefined, undefined)).toBe(false)
      expect(isLikelyScannerMetadata('', '')).toBe(false)
    })

    it('should return true for generic digitizer', () => {
      expect(isLikelyScannerMetadata('', 'Film Digitizer')).toBe(true)
    })

    it('should return true for Hasselblad Flextight', () => {
      expect(isLikelyScannerMetadata('Hasselblad', 'Flextight X5')).toBe(true)
    })

    it('should return true for Imacon scanners', () => {
      expect(isLikelyScannerMetadata('Imacon', 'Flextight 848')).toBe(true)
    })

    it('should return true for Pakon scanners', () => {
      expect(isLikelyScannerMetadata('Pakon', 'F335')).toBe(true)
    })
  })

  describe('getScannerWarning', () => {
    it('should return warning message for scanner metadata', () => {
      const warning = getScannerWarning('Epson', 'V850')
      expect(warning).not.toBeNull()
      expect(warning).toContain('Scanner metadata detected')
      expect(warning).toContain('Epson V850')
    })

    it('should include make and model in warning', () => {
      const warning = getScannerWarning('Nikon', 'Coolscan V')
      expect(warning).toContain('Nikon Coolscan V')
    })

    it('should handle model only', () => {
      const warning = getScannerWarning('', 'Frontier SP-3000')
      expect(warning).not.toBeNull()
      expect(warning).toContain('Frontier SP-3000')
    })

    it('should handle make only', () => {
      const warning = getScannerWarning('Epson', '')
      expect(warning).not.toBeNull()
      expect(warning).toContain('Epson')
    })

    it('should return null for real camera metadata (non-scanner brands)', () => {
      expect(getScannerWarning('Sony', 'A7R IV')).toBeNull()
      expect(getScannerWarning('Leica', 'M10')).toBeNull()
      expect(getScannerWarning('Pentax', 'K-1')).toBeNull()
    })

    it('should return null for empty metadata', () => {
      expect(getScannerWarning(undefined, undefined)).toBeNull()
      expect(getScannerWarning('', '')).toBeNull()
    })

    it('should trim whitespace from combined string', () => {
      const warning = getScannerWarning('  Epson  ', '  V850  ')
      expect(warning).toContain('Epson')
      expect(warning).toContain('V850')
    })

    it('should mention film scanner in the message', () => {
      const warning = getScannerWarning('Epson', 'V850')
      expect(warning).toContain('film scanner')
    })
  })
})
