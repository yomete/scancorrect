# Payment Integration Plan

## Current Status: Quota System ✅ Complete

The monthly quota system for the free tier is implemented:
- **108 transformations/month** (3 rolls of 36 exposures)
- **Calendar month reset** (1st of each month)
- **Hard block** when exhausted with upgrade modal
- **UI indicator** in footer showing usage

## Next: Lemon Squeezy Integration

### Why Lemon Squeezy?

| Feature | Lemon Squeezy |
|---------|---------------|
| Fees | 5% + $0.50 per transaction |
| License keys | Built-in |
| Tax handling | Full MoR (EU VAT, global) |
| Approval time | ~48 hours |
| Acquired by | Stripe (July 2024) |

On a €25 sale, you net ~€23.25 after fees.

### Step 1: Create Lemon Squeezy Account

1. Go to [lemonsqueezy.com](https://lemonsqueezy.com)
2. Sign up and verify your account
3. Complete business verification (may take 24-48 hours)

### Step 2: Create Product

1. Create a new Store (or use default)
2. Add Product:
   - **Name:** ScanCorrect Pro - Lifetime License
   - **Price:** €25 (one-time)
   - **Type:** Software License
3. Configure License Key settings:
   - Activation limit: 3 (allows 3 machines)
   - Key format: Default or custom
4. Note down:
   - Product ID
   - Variant ID
   - Store ID

### Step 3: Get API Credentials

1. Go to Settings → API
2. Create an API key with these scopes:
   - `licenses:read`
   - `licenses:validate`
   - `licenses:activate`
   - `licenses:deactivate`
3. Note down:
   - API Key
   - Webhook signing secret (create a webhook endpoint)

### Step 4: Implementation Tasks

#### 4.1 License Validation Module
Create `packages/desktop/electron/license.ts`:
- Validate license key against Lemon Squeezy API
- Activate/deactivate license on machine
- Handle offline grace period (7 days suggested)
- Store license locally in electron-store

#### 4.2 IPC Handlers
Add to `packages/desktop/electron/main.ts`:
- `activate-license` - Validate and activate license key
- `get-license-status` - Return current license state
- `deactivate-license` - For transferring to another machine

#### 4.3 License Activation UI
Create `packages/desktop/src/components/LicenseActivation/`:
- `LicenseActivationModal.tsx` - Enter license key form
- `LicenseStatus.tsx` - Show current license status in settings

#### 4.4 Upgrade Flow
Update `packages/desktop/src/components/QuotaExhaustedModal.tsx`:
- Link "Upgrade to Pro" button to Lemon Squeezy checkout URL
- Or embed Lemon Squeezy checkout overlay

#### 4.5 Website Updates
Update `packages/website/`:
- Change pricing to €25 lifetime only (remove monthly)
- Add "Buy Now" button linking to Lemon Squeezy checkout
- Add license activation instructions

### Step 5: Testing

1. Create a test product in Lemon Squeezy (sandbox mode)
2. Generate test license keys
3. Test activation/deactivation flow
4. Test offline grace period
5. Test quota bypass for paid users

## API Reference

### Validate License Key
```bash
curl -X POST https://api.lemonsqueezy.com/v1/licenses/validate \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"license_key": "YOUR_LICENSE_KEY"}'
```

### Activate License
```bash
curl -X POST https://api.lemonsqueezy.com/v1/licenses/activate \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "license_key": "YOUR_LICENSE_KEY",
    "instance_name": "MacBook Pro"
  }'
```

### Deactivate License
```bash
curl -X POST https://api.lemonsqueezy.com/v1/licenses/deactivate \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "license_key": "YOUR_LICENSE_KEY",
    "instance_id": "INSTANCE_ID"
  }'
```

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `electron/license.ts` | License validation logic |
| `electron/main.ts` | Add license IPC handlers |
| `electron/preload.ts` | Expose license methods |
| `src/components/LicenseActivation/` | Activation UI |
| `src/components/QuotaExhaustedModal.tsx` | Connect upgrade button |
| `packages/website/app/page.tsx` | Update pricing section |

## Environment Variables (for builds)

```env
LEMON_SQUEEZY_API_KEY=your_api_key
LEMON_SQUEEZY_STORE_ID=your_store_id
LEMON_SQUEEZY_PRODUCT_ID=your_product_id
LEMON_SQUEEZY_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/xxx
```

## Timeline Checklist

- [ ] Create Lemon Squeezy account
- [ ] Set up product and license keys
- [ ] Get API credentials
- [ ] Implement license validation module
- [ ] Add IPC handlers
- [ ] Create activation UI
- [ ] Connect upgrade button
- [ ] Update website pricing
- [ ] Test full purchase → activation flow
- [ ] Ship!
