# Deployment Guide - Film EXIF Editor

This guide explains how to deploy the Film EXIF Editor desktop app with automated builds and releases.

## Overview

The deployment process is fully automated using GitHub Actions:
1. **Make changes** to the desktop app
2. **Run release script** to create a new version tag
3. **GitHub Actions automatically builds** for macOS, Windows, and Linux
4. **GitHub Release is created** with downloadable installers
5. **Link to releases** from your website

## Quick Start

### First Time Setup

1. **Push your code to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/film-exif-editor.git
   git push -u origin main
   ```

2. **Create your first release**
   ```bash
   ./scripts/create-release.sh
   ```
   Enter version `0.1.0` when prompted.

3. **Wait for builds** (~15-20 minutes)
   - Check progress: https://github.com/YOUR_USERNAME/film-exif-editor/actions
   - Builds run in parallel for all platforms

4. **Download links are ready!**
   - Go to: https://github.com/YOUR_USERNAME/film-exif-editor/releases
   - Copy download URLs for each platform
   - Add to website download buttons

## Release Workflow

### Standard Release Process

```bash
# 1. Make your changes
git add .
git commit -m "feat: add new feature"

# 2. Create a release (this handles everything)
./scripts/create-release.sh
```

The script will:
- ✅ Ask for the new version number
- ✅ Update `packages/desktop/package.json`
- ✅ Create a git commit
- ✅ Create a git tag (e.g., `v0.2.0`)
- ✅ Push to GitHub
- ✅ Trigger automated builds

### What Happens on GitHub

When you push a version tag:

1. **Build Job** (runs on 3 machines in parallel):
   - macOS runner builds DMG and ZIP
   - Windows runner builds NSIS installer and portable exe
   - Linux runner builds AppImage and DEB

2. **Release Job**:
   - Collects all build artifacts
   - Creates GitHub Release with version tag
   - Uploads all installers to the release
   - Generates release notes from commits

### Versioning

Use [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)
- **MAJOR**: Breaking changes (rare for desktop apps)
- **MINOR**: New features (e.g., `0.1.0` → `0.2.0`)
- **PATCH**: Bug fixes (e.g., `0.1.0` → `0.1.1`)

Examples:
- `0.1.0` - Initial release
- `0.2.0` - Added new EXIF fields support
- `0.2.1` - Fixed crash bug
- `1.0.0` - First stable release

## Download URLs

After a release builds, you'll have these URLs:

### Latest Release (Always up-to-date)
```
https://github.com/YOUR_USERNAME/film-exif-editor/releases/latest/download/Film-EXIF-Editor-{version}.dmg
https://github.com/YOUR_USERNAME/film-exif-editor/releases/latest/download/Film-EXIF-Editor-Setup-{version}.exe
https://github.com/YOUR_USERNAME/film-exif-editor/releases/latest/download/Film-EXIF-Editor-{version}.AppImage
```

### Specific Version
Replace `v0.1.0` with your version:
```
https://github.com/YOUR_USERNAME/film-exif-editor/releases/download/v0.1.0/Film-EXIF-Editor-0.1.0.dmg
https://github.com/YOUR_USERNAME/film-exif-editor/releases/download/v0.1.0/Film-EXIF-Editor-Setup-0.1.0.exe
https://github.com/YOUR_USERNAME/film-exif-editor/releases/download/v0.1.0/Film-EXIF-Editor-0.1.0.AppImage
```

## Linking from Website

Update your website download buttons with GitHub release URLs:

### Option 1: Use "Latest" URLs (Recommended)
```tsx
// packages/website/app/page.tsx
<button onClick={() => window.location.href = 'https://github.com/YOUR_USERNAME/film-exif-editor/releases/latest'}>
  Download for macOS
</button>
```

### Option 2: Direct Download Links
```tsx
const GITHUB_RELEASES = 'https://github.com/YOUR_USERNAME/film-exif-editor/releases/latest/download';

<button onClick={() => window.location.href = `${GITHUB_RELEASES}/Film-EXIF-Editor-latest.dmg`}>
  Download for macOS
</button>
```

### Option 3: Custom API (Advanced)
Fetch latest release info from GitHub API to show version numbers:
```tsx
// Example: Display "Download v0.1.0"
const response = await fetch('https://api.github.com/repos/YOUR_USERNAME/film-exif-editor/releases/latest');
const data = await response.json();
const version = data.tag_name; // "v0.1.0"
```

## Build Artifacts

Each release produces:

### macOS
- **DMG** (~50-70 MB): Standard drag-to-Applications installer
- **ZIP** (~50-70 MB): Portable archive format

### Windows
- **NSIS Installer** (~40-60 MB): Full Windows installer with options
- **Portable EXE** (~40-60 MB): Standalone executable (no installation)

### Linux
- **AppImage** (~60-80 MB): Universal Linux package
- **DEB** (~60-80 MB): Debian/Ubuntu package

## Continuous Integration

### Build Workflow (`.github/workflows/build.yml`)
- **Triggers**: Every push to `main` branch
- **Purpose**: Verify builds don't break
- **Artifacts**: Kept for 7 days (for testing)
- **No release**: Just builds, doesn't publish

### Release Workflow (`.github/workflows/release.yml`)
- **Triggers**: Push version tag (e.g., `v0.1.0`)
- **Purpose**: Create production releases
- **Artifacts**: Published as GitHub Release
- **Public**: Anyone can download

## Code Signing (Optional but Recommended)

For production apps, code signing prevents "untrusted developer" warnings.

### macOS Code Signing

1. **Get Apple Developer Account** ($99/year)
2. **Create Developer ID Certificate** in Xcode
3. **Export certificate** as P12 file
4. **Add GitHub Secrets**:
   - `MAC_CERT_P12_BASE64`: Base64-encoded P12 file
   - `MAC_CERT_PASSWORD`: Certificate password

```bash
# Convert P12 to base64
base64 -i certificate.p12 | pbcopy
# Paste into GitHub Secret
```

### macOS Notarization (Required for macOS 10.15+)

Add these secrets:
- `APPLE_ID`: Your Apple ID email
- `APPLE_APP_PASSWORD`: App-specific password

### Windows Code Signing

1. **Get Code Signing Certificate** (e.g., from DigiCert, ~$200/year)
2. **Export as P12 file**
3. **Add GitHub Secrets**:
   - `WIN_CERT_P12_BASE64`: Base64-encoded P12
   - `WIN_CERT_PASSWORD`: Certificate password

**Note**: Code signing is optional for initial releases. You can add it later.

## Troubleshooting

### Build Failed on GitHub Actions

1. Check the Actions tab: https://github.com/YOUR_USERNAME/film-exif-editor/actions
2. Click the failed workflow
3. Expand the failed step to see error logs

Common issues:
- **Missing dependencies**: Run `npm ci` locally to verify
- **TypeScript errors**: Run `npm run build -w desktop` locally
- **Build timeout**: Usually macOS notarization (optional, can disable)

### Release Not Created

- Ensure you pushed both commit AND tag:
  ```bash
  git push origin main
  git push origin v0.1.0
  ```
- Check that tag matches pattern `v*.*.*` (e.g., `v0.1.0`, not `0.1.0`)

### Download Links Don't Work

- Wait for all builds to complete (~15-20 min)
- Check GitHub Releases page to verify files uploaded
- Ensure URL matches exact filename (case-sensitive)

## GitHub Secrets Setup

Go to: Settings → Secrets and variables → Actions → New repository secret

Required secrets (for code signing only):
- `MAC_CERT_P12_BASE64`
- `MAC_CERT_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_PASSWORD`
- `WIN_CERT_P12_BASE64`
- `WIN_CERT_PASSWORD`

**Note**: App works without code signing, but users will see security warnings.

## Testing Before Release

### Test Builds Locally
```bash
# Build for your current platform
npm run build -w desktop
npm run dist -w desktop

# Test the installer from release/ directory
```

### Test on All Platforms (GitHub Actions)
1. Push to a branch (not main)
2. Create a test tag: `git tag v0.0.1-test && git push origin v0.0.1-test`
3. Check builds in Actions tab
4. Delete tag after testing: `git tag -d v0.0.1-test && git push origin :refs/tags/v0.0.1-test`

## Release Checklist

Before creating a release:

- [ ] Test app locally on your platform
- [ ] Update version number appropriately (semantic versioning)
- [ ] Update CHANGELOG.md with changes (optional)
- [ ] Commit all changes to main branch
- [ ] Run `./scripts/create-release.sh`
- [ ] Wait for GitHub Actions to complete
- [ ] Test download links from GitHub Releases
- [ ] Update website download buttons if needed
- [ ] Announce release (social media, blog, etc.)

## Monitoring

### Check Build Status
- **GitHub Actions**: https://github.com/YOUR_USERNAME/film-exif-editor/actions
- **Latest Release**: https://github.com/YOUR_USERNAME/film-exif-editor/releases/latest

### Analytics (Optional)
Consider adding:
- Download counters from GitHub API
- Error reporting (Sentry, BugSnag)
- Auto-updater (electron-updater)

## Next Steps

1. **Create your first release**: `./scripts/create-release.sh`
2. **Update website**: Add download links to landing page
3. **Set up analytics**: Track downloads and usage
4. **Add auto-updates**: Use electron-updater for seamless updates
5. **Submit to app stores**: Mac App Store, Microsoft Store (optional)

## Resources

- [electron-builder Documentation](https://www.electron.build/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Apple Developer Account](https://developer.apple.com/)
- [Code Signing Certificates](https://www.digicert.com/signing/code-signing-certificates)
