# Installing apps from The Fox's Den (Android)

Download APKs only from the official Fox's Den GitHub Pages site (see each app's detail page for the current link).

Example pattern:

**https://marcell0805.github.io/the-foxs-den-doc/downloads/active-huntress.apk**

## What to expect

Android shows extra prompts for apps installed outside the Google Play Store. That is normal for personal test builds.

1. Open the app's detail page on the Fox's Den portal and tap **Download APK**, or use the direct link above.
2. Open the downloaded file (Chrome, Files, or Google Drive).
3. If asked, allow **Install unknown apps** for that app.
4. If **Play Protect** warns the app is uncommon, tap **Install anyway** or **More details**, then proceed.
5. Open the app — branding should match the portal listing.

## Updating

If you already have an older test build with the same package name, you may need to **uninstall it first**, then install the new release.

**In-app updates:** when online, HuntressCookbook Mobile checks
`{pagesBaseUrl}/downloads/huntresscookbook-mobile/mobile-version.json` once per launch.
If a newer **build** is published, you get a prompt with release notes and a download link.
Recipe-only (content) updates still use the cookbook-hosted `mobile-content-manifest.json` referenced from that file.

Older APKs that still check `huntress-cookbook/downloads/mobile-version.json` get a **bridge** entry there pointing at the Fox's Den APK; after they install that build, future checks use Fox's Den only.

## For maintainers

**Preferred (APK + Fox's Den version JSON):**

```powershell
cd portal\scripts
.\publish-app-mobile.ps1 -AppId huntresscookbook-mobile -ReleaseNotes "Describe changes"
.\build-portal.ps1
```

**Active Huntress beta** (Chart preview / demo data on Trends):

```powershell
cd portal\scripts
.\publish-app-mobile.ps1 -AppId active-huntress -Channel beta -ReleaseNotes "Beta — Trends demo data"
.\build-portal.ps1
```

`-Channel beta` sets `assets/mobile_config.json` → `enableDemoData: true` **before** the release build so it is baked into `active-huntress-beta.apk`. Live (`-Channel live`, default) sets `enableDemoData: false`.

For apps with recipe/content OTA, set optional `contentOta` on the mobile entry in `data/apps-manifest.json`:

```json
"contentOta": {
  "downloadsRoot": "C:\\path\\to\\any-website\\downloads",
  "manifestFileName": "mobile-content-manifest.json",
  "manifestUrl": "https://example.github.io/any-website/downloads/mobile-content-manifest.json"
}
```

Or pass `-ContentDownloadsRoot`, `-ContentManifestUrl`, and/or `-ContentVersion` on the command line. This works for any companion website, not only the cookbook.

**Content export + bridge JSON** (recipe seed / images still published from the cookbook repo):

```powershell
cd path\to\huntress-cookbook\scripts
.\export-mobile-seed.ps1
.\publish-mobile.ps1 -SkipBuild -ReleaseNotes "Describe changes"
```

Commit `portal/downloads/` (including the APK) and push for GitHub Pages. Also commit cookbook `downloads/` when content or the bridge JSON changed.

Bump the **`+N`** build number in `pubspec.yaml` before every publish so update checks detect new APKs.
