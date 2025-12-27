#!/bin/bash

# Film EXIF Editor - Create Release Script
# This script helps you create a new release with proper versioning

set -e

echo "🚀 Film EXIF Editor - Release Creator"
echo "======================================"
echo ""

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./packages/desktop/package.json').version")
echo "Current version: v$CURRENT_VERSION"
echo ""

# Ask for new version
echo "Enter new version (e.g., 1.0.0):"
read NEW_VERSION

# Validate version format
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "❌ Error: Invalid version format. Use semantic versioning (e.g., 1.0.0)"
  exit 1
fi

echo ""
echo "📝 Release Summary:"
echo "  Old version: v$CURRENT_VERSION"
echo "  New version: v$NEW_VERSION"
echo ""
echo "This will:"
echo "  1. Update version in packages/desktop/package.json"
echo "  2. Create a git commit with the version bump"
echo "  3. Create a git tag v$NEW_VERSION"
echo "  4. Push the tag to GitHub (which triggers the build)"
echo ""
echo "Continue? (y/n)"
read CONFIRM

if [ "$CONFIRM" != "y" ]; then
  echo "❌ Release cancelled"
  exit 0
fi

# Update version in package.json
echo ""
echo "📝 Updating version in package.json..."
cd packages/desktop
npm version $NEW_VERSION --no-git-tag-version
cd ../..

# Commit the version change
echo "📝 Creating git commit..."
git add packages/desktop/package.json
git commit -m "chore: bump version to v$NEW_VERSION"

# Create git tag
echo "🏷️  Creating git tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Push commit and tag
echo "🚀 Pushing to GitHub..."
git push origin main
git push origin "v$NEW_VERSION"

echo ""
echo "✅ Release v$NEW_VERSION created successfully!"
echo ""
echo "🔄 GitHub Actions is now building your app for macOS, Windows, and Linux."
echo "📦 Check progress at: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
echo "📋 Release will be available at: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/tag/v$NEW_VERSION"
echo ""
echo "⏱️  Build typically takes 15-20 minutes."
