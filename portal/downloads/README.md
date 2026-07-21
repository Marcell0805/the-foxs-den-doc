# Installing apps from The Fox's Den (Android)

Download APKs only from the official Fox's Den portal (each app detail page has the current link).

Binaries are hosted on **GitHub Releases** (not committed to git). Example:

**https://github.com/Marcell0805/the-foxs-den-doc/releases/download/v1.0.0-b2/active-huntress.apk**

## What to expect

Android shows extra prompts for apps installed outside the Google Play Store. That is normal for personal test builds.

1. Open the app's detail page on the Fox's Den portal and tap **Download APK**, or use the direct release link above.
2. Open the downloaded file (Chrome, Files, or Google Drive).
3. If asked, allow **Install unknown apps** for that app.
4. If **Play Protect** warns the app is uncommon, tap **Install anyway** or **More details**, then proceed.
5. Open the app — branding should match the portal listing.

## Updating

If you already have an older test build with the same package name, you may need to **uninstall it first**, then install the new release.

**In-app updates:** when online, the app checks `{pagesBaseUrl}/downloads/{app-id}/mobile-version.json` once per launch. If a newer **build** is published, you get a prompt with release notes and a download link (same contract as The Huntress Cookbook mobile app).

## For maintainers

After `flutter build apk --release`, from this repo:

```powershell
cd portal\scripts
.\publish-app-mobile.ps1 -AppId active-huntress -ReleaseNotes "Describe changes" -SkipBuild
.\publish-apk-release.ps1 -AppId active-huntress
.\build-portal.ps1
```

Commit portal JSON / `mobile-version.json` (not the APK — it stays gitignored) and push for GitHub Pages.

Bump the **`+N`** build number in `pubspec.yaml` before every publish so update checks detect new APKs.
