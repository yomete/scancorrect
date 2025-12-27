# GitHub Actions Fixes

## Issues Found

1. **Node.js version mismatch**: Workflows were using Node 18, but `exiftool-vendored` requires Node 20+
2. **package-lock.json out of sync**: Dependencies versions didn't match between package.json and lockfile
3. **Missing icon files**: electron-builder configuration referenced non-existent icon files
4. **electron-builder directory configuration**: Missing `app` directory specification and `package.json` in files

## Fixes Applied

### 1. Updated Node.js Version

**Files Changed:**
- `.github/workflows/release.yml` - Changed from Node 18 → Node 20
- `.github/workflows/build.yml` - Changed from Node 18 → Node 20

**Why:** `exiftool-vendored@30.4.0` requires Node.js 20 or higher. The error message showed:
```
npm warn EBADENGINE   required: { node: '>=20.0.0' }
npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
```

### 2. Synced package-lock.json

**Command Run:**
```bash
npm install --package-lock-only
```

**Why:** The lockfile had outdated versions:
- `@types/react@18.3.24` vs `@types/react@18.3.27`
- `tailwindcss@3.4.17` vs `tailwindcss@3.4.19`
- `csstype@3.1.3` vs `csstype@3.2.3`

### 3. Removed Missing Icon References

**File Changed:**
- `packages/desktop/package.json` - Removed `icon` fields from build config

**Why:** electron-builder was looking for:
- `build/icon.icns` (macOS)
- `build/icon.ico` (Windows)
- `build/icon.png` (Linux)

These files don't exist yet, so electron-builder will use default Electron icons. You can add custom icons later.

### 4. Fixed electron-builder Directory Configuration

**File Changed:**
- `packages/desktop/package.json` - Added `app` directory and `package.json` to files array

**Changes Made:**
```json
"directories": {
  "output": "../../release",
  "app": "."  // Added this
},
"files": [
  "dist/**/*",
  "dist-electron/**/*",
  "package.json",  // Added this
  "node_modules/**/*"
]
```

**Why:** electron-builder needs to know:
- Where the app root is (`app: "."`)
- To include `package.json` for Electron app metadata
- Error was: `/Users/runner/.../packages/desktop not a file`

## Next Steps

Commit and push these fixes:

```bash
git add .github/workflows/build.yml .github/workflows/release.yml package-lock.json package.json .nvmrc packages/desktop/package.json
git commit -m "fix: update GitHub Actions to Node 20, sync dependencies, and remove missing icons"
git push
```

Then create a new release to test:

```bash
./scripts/create-release.sh
# Enter version: 0.1.0
```

## What to Expect

The builds should now:
- ✅ Use Node.js 20 (compatible with exiftool-vendored)
- ✅ Install dependencies without sync errors
- ✅ Complete successfully for all 3 platforms

Build time: ~15-20 minutes

## Monitoring

Watch the build progress:
```
https://github.com/YOUR_USERNAME/film-exif-editor/actions
```

If successful, you'll see:
- ✅ Green checkmarks for all 3 platform builds
- 📦 GitHub Release created with 6 downloadable files
- 🎉 Ready to link from your website!

## Troubleshooting

If builds still fail:

1. **Check the Actions tab** for detailed error logs
2. **Test locally** with Node 20:
   ```bash
   nvm use 20  # or install Node 20
   npm ci
   npm run build -w desktop
   ```
3. **Verify dependencies** are installed correctly:
   ```bash
   npm list exiftool-vendored
   # Should show: exiftool-vendored@30.4.0
   ```

## Future Prevention

To prevent this issue:

1. **Update .nvmrc file** to specify Node 20:
   ```bash
   echo "20" > .nvmrc
   ```

2. **Add engines field** to root package.json:
   ```json
   {
     "engines": {
       "node": ">=20.0.0",
       "npm": ">=10.0.0"
     }
   }
   ```

3. **Use the same Node version locally** as in CI/CD
