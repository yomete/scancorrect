# Quick Start: Deploy Your App in 5 Minutes

## Step 1: Push to GitHub (1 min)

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/film-exif-editor.git
git push -u origin main
```

## Step 2: Create Your First Release (1 min)

```bash
./scripts/create-release.sh
```

When prompted, enter: `0.1.0`

This will:
- ✅ Update version in package.json
- ✅ Create git tag `v0.1.0`
- ✅ Push to GitHub
- ✅ Trigger automated builds

## Step 3: Wait for Builds (15-20 min)

Check build progress:
```
https://github.com/YOUR_USERNAME/film-exif-editor/actions
```

GitHub Actions will build for:
- 🍎 macOS (DMG + ZIP)
- 🪟 Windows (NSIS Installer + Portable)
- 🐧 Linux (AppImage + DEB)

## Step 4: Get Download Links (1 min)

Once builds complete, go to:
```
https://github.com/YOUR_USERNAME/film-exif-editor/releases/latest
```

Copy the download URLs for each platform.

## Step 5: Update Website Download Buttons (2 min)

Edit `packages/website/app/page.tsx`:

```tsx
// Replace YOUR_USERNAME with your GitHub username
const GITHUB_RELEASES = 'https://github.com/YOUR_USERNAME/film-exif-editor/releases/latest';

// macOS button (line 86)
<button
  onClick={() => window.open(`${GITHUB_RELEASES}`, '_blank')}
  className="bg-slate-800 text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-black hover:scale-105 transition-all duration-300 shadow-xl shadow-black/50"
>
  Download for macOS
</button>

// Windows button (line 89)
<button
  onClick={() => window.open(`${GITHUB_RELEASES}`, '_blank')}
  className="bg-slate-800 text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-black hover:scale-105 transition-all duration-300 shadow-xl shadow-black/50"
>
  Download for Windows
</button>

// Linux button (line 92)
<button
  onClick={() => window.open(`${GITHUB_RELEASES}`, '_blank')}
  className="bg-slate-800 text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-black hover:scale-105 transition-all duration-300 shadow-xl shadow-black/50"
>
  Download for Linux
</button>
```

## Done! 🎉

Your app is now:
- ✅ Built for all platforms
- ✅ Available for download on GitHub
- ✅ Linked from your website

## Future Releases

Whenever you want to release a new version:

```bash
# Make your changes
git add .
git commit -m "feat: add new feature"

# Create new release
./scripts/create-release.sh
```

Enter new version (e.g., `0.2.0`) and GitHub Actions handles the rest!

## What's Next?

### Optional Enhancements

1. **Deploy Website** (5 min)
   - Push to Vercel: `vercel deploy`
   - Or Netlify, GitHub Pages, etc.

2. **Code Signing** (1 hour)
   - See [DEPLOYMENT.md](DEPLOYMENT.md#code-signing-optional-but-recommended)
   - Prevents "untrusted developer" warnings
   - Requires Apple Developer ($99/year) + Code signing cert

3. **Custom Domain** (10 min)
   - Buy domain (e.g., `filmexifeditor.com`)
   - Point to Vercel/Netlify
   - Update DNS records

4. **Analytics** (30 min)
   - Add Google Analytics to website
   - Track download counts via GitHub API
   - Add error reporting to desktop app (Sentry)

5. **Auto-Updates** (2 hours)
   - Implement `electron-updater`
   - Users get updates automatically
   - See electron-updater docs

## Troubleshooting

### Build Failed?
- Check: https://github.com/YOUR_USERNAME/film-exif-editor/actions
- Click failed workflow → Expand failed step
- Common issue: TypeScript errors (fix locally first)

### Download Links Don't Work?
- Wait for all 3 builds to complete
- Check GitHub Releases page for uploaded files
- Verify URL matches exact filename

### Need Help?
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guide
- Check [packages/desktop/BUILD.md](packages/desktop/BUILD.md) for build docs
- Open an issue on GitHub

## Summary

| Task | Time | Status |
|------|------|--------|
| Push to GitHub | 1 min | ⬜ |
| Create release | 1 min | ⬜ |
| Wait for builds | 15-20 min | ⬜ |
| Get download links | 1 min | ⬜ |
| Update website | 2 min | ⬜ |
| **Total** | **~20 min** | ⬜ |

After the initial 20 minutes, future releases take only **1 minute** (just run the script)!
