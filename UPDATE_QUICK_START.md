# Quick Start: Publishing Updates

## Step 1: Prepare a New Release

Update the version in `package.json`:
```bash
npm version patch  # 2.6.1 → 2.6.2
# or
npm version minor  # 2.6.1 → 2.7.0
# or
npm version major  # 2.6.1 → 3.0.0
```

## Step 2: Push the Tag

```bash
git push origin main
git push origin v2.6.2  # Replace with your version
```

## Step 3: Wait for GitHub Actions

The workflow will automatically:
- ✅ Build for Windows, macOS, and Linux
- ✅ Create a GitHub release
- ✅ Upload installers
- ✅ Publish update metadata

## Step 4: Users Get Updated

Packaged apps will automatically:
- Detect the new version within 4 hours (or on next launch)
- Download the update in the background
- Notify the user when ready
- Install on app quit or immediate restart

## That's It!

No manual steps needed. The entire update distribution is automated.

## Environment Variables (Optional)

For private repositories, set `GH_TOKEN` in GitHub Secrets:
1. Go to Settings → Secrets and variables → Actions
2. Add `GH_TOKEN` with a personal access token
3. The workflow already uses it automatically

## Testing Before Release

To test without affecting users:

1. Create a **draft release** or **pre-release** on GitHub
2. Upload your test builds manually
3. Change app version locally to test update detection
4. Delete the draft when done

---

**Note**: The current implementation is production-ready. Just push a tag, and users will receive updates automatically!
