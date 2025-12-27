# Release Scripts

## create-release.sh

Interactive script to create a new release of the Film EXIF Editor desktop app.

### Usage

```bash
./scripts/create-release.sh
```

### What it does

1. Shows current version
2. Prompts for new version number
3. Updates `packages/desktop/package.json`
4. Creates git commit with version bump
5. Creates git tag (e.g., `v0.1.0`)
6. Pushes to GitHub
7. Triggers automated builds via GitHub Actions

### Example

```
$ ./scripts/create-release.sh

🚀 Film EXIF Editor - Release Creator
======================================

Current version: v0.0.1

Enter new version (e.g., 1.0.0):
0.1.0

📝 Release Summary:
  Old version: v0.0.1
  New version: v0.1.0

This will:
  1. Update version in packages/desktop/package.json
  2. Create a git commit with the version bump
  3. Create a git tag v0.1.0
  4. Push the tag to GitHub (which triggers the build)

Continue? (y/n)
y

✅ Release v0.1.0 created successfully!

🔄 GitHub Actions is now building your app for macOS, Windows, and Linux.
📦 Check progress at: https://github.com/YOUR_USERNAME/film-exif-editor/actions
📋 Release will be available at: https://github.com/YOUR_USERNAME/film-exif-editor/releases/tag/v0.1.0

⏱️  Build typically takes 15-20 minutes.
```

## Requirements

- Git configured with remote origin
- Clean working directory (commit changes first)
- On main/master branch
- Node.js installed (for reading package.json)

## Troubleshooting

### "Permission denied"
```bash
chmod +x scripts/create-release.sh
```

### "Not a git repository"
```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/film-exif-editor.git
```

### "Please commit your changes first"
```bash
git add .
git commit -m "your changes"
```
