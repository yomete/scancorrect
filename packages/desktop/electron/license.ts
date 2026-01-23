import * as os from 'os'

const POLAR_API_BASE = 'https://api.polar.sh/v1'
const POLAR_ORG_ID = 'b9f91173-37e0-4b89-9acb-0cb4f66ad64c'
const OFFLINE_GRACE_DAYS = 7

export interface LicenseStatus {
  key: string
  valid: boolean
  activationId?: string
  machineName?: string
  activatedAt?: string
  lastValidatedAt?: string
  offlineGracePeriodEnd?: string
}

interface PolarValidateResponse {
  id: string
  organization_id: string
  user_id: string
  benefit_id: string
  key: string
  status: 'granted' | 'revoked' | 'disabled'
  limit_activations: number | null
  usage: number
  limit_usage: number | null
  validations: number
  last_validated_at: string | null
  expires_at: string | null
}

interface PolarActivateResponse {
  id: string
  license_key_id: string
  label: string
  meta: Record<string, unknown>
  created_at: string
  modified_at: string | null
}

interface PolarError {
  type: string
  detail: string
}

function getMachineName(): string {
  return os.hostname() || 'Unknown Machine'
}

export async function validateLicenseKey(key: string): Promise<{ valid: boolean; error?: string; data?: PolarValidateResponse }> {
  try {
    const response = await fetch(`${POLAR_API_BASE}/license-keys/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        organization_id: POLAR_ORG_ID,
      }),
    })

    if (!response.ok) {
      const error = await response.json() as PolarError
      return { valid: false, error: error.detail || 'Invalid license key' }
    }

    const data = await response.json() as PolarValidateResponse

    if (data.status !== 'granted') {
      return { valid: false, error: `License is ${data.status}` }
    }

    return { valid: true, data }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Network error validating license'
    }
  }
}

export async function activateLicense(key: string): Promise<{ success: boolean; error?: string; activationId?: string; machineName?: string }> {
  const machineName = getMachineName()

  try {
    const response = await fetch(`${POLAR_API_BASE}/license-keys/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        organization_id: POLAR_ORG_ID,
        label: machineName,
      }),
    })

    if (!response.ok) {
      const error = await response.json() as PolarError

      if (response.status === 400 && error.detail?.includes('activation limit')) {
        return { success: false, error: 'Maximum activations reached. Please deactivate another device first.' }
      }

      return { success: false, error: error.detail || 'Failed to activate license' }
    }

    const data = await response.json() as PolarActivateResponse

    return {
      success: true,
      activationId: data.id,
      machineName: data.label,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error activating license'
    }
  }
}

export async function deactivateLicense(key: string, activationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${POLAR_API_BASE}/license-keys/deactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        organization_id: POLAR_ORG_ID,
        activation_id: activationId,
      }),
    })

    if (!response.ok) {
      const error = await response.json() as PolarError
      return { success: false, error: error.detail || 'Failed to deactivate license' }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error deactivating license'
    }
  }
}

export function calculateOfflineGraceEnd(): string {
  const gracePeriodEnd = new Date()
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + OFFLINE_GRACE_DAYS)
  return gracePeriodEnd.toISOString()
}

export function isWithinOfflineGrace(offlineGracePeriodEnd?: string): boolean {
  if (!offlineGracePeriodEnd) return false
  return new Date() < new Date(offlineGracePeriodEnd)
}

export async function validateAndUpdateLicense(
  storedLicense: LicenseStatus | undefined,
  updateStore: (license: LicenseStatus | undefined, tier: 'free' | 'paid') => void
): Promise<{ valid: boolean; license?: LicenseStatus }> {
  if (!storedLicense?.key) {
    return { valid: false }
  }

  const result = await validateLicenseKey(storedLicense.key)

  if (result.valid) {
    const updatedLicense: LicenseStatus = {
      ...storedLicense,
      valid: true,
      lastValidatedAt: new Date().toISOString(),
      offlineGracePeriodEnd: calculateOfflineGraceEnd(),
    }
    updateStore(updatedLicense, 'paid')
    return { valid: true, license: updatedLicense }
  }

  // Validation failed - check offline grace period
  if (isWithinOfflineGrace(storedLicense.offlineGracePeriodEnd)) {
    return { valid: true, license: storedLicense }
  }

  // Grace period expired - revoke license
  updateStore(undefined, 'free')
  return { valid: false }
}
