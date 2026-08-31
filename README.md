# The Fox's Den

Static portal for personal **websites, mobile apps, and Windows tools**: README-driven detail pages, APK/zip downloads on GitHub Pages, Live/Beta channels, and optional **per-project 4-digit code gates** before download / Open site.

## First run (local)

1. Open `portal/index.html` over HTTP (VS Code **Live Server**), not `file://`.
2. Site-wide password is **disabled** by default (`auth.enabled: false` in `portal/data/portal-settings.json`). Set `auth.enabled` to `true` only if you want the old whole-site gate again.
3. After editing manifest or data, run:

```powershell
cd portal\scripts
.\build-portal.ps1
```

## Apps manifest

Edit [`portal/data/apps-manifest.json`](portal/data/apps-manifest.json). Each entry:

| Field | Purpose |
|-------|---------|
| `id` | URL slug and folder under `downloads/<id>/` |
| `title` | Nav / landing label |
| `kind` | `mobile` (default), `website`, or `tool` — groups the landing list |
| `visible` | Default `true`. Set `false` to hide from nav, landing, and search |
| `available` | Clickable vs “coming soon” (also false when Live APK missing unless `allowWithoutApk`) |
| `status` | Badge: `live`, `beta`, `in_progress`, `planned`, `archived` — set in manifest or via publish `-Status` / Fox Publish **Portal status** |
| `icon` | Optional path under `portal/assets/` (default: `icons/<id>.png` if that file exists) |
| `features` | Optional `[{ "title": "...", "description": "..." }]` — shown on the product page Features grid |
| `whatsNew` | Optional human-readable changelog (falls back to release notes from publish) |
| `googlePlayUrl` | Optional Play Store URL; when omitted, mobile listings show **Google Play — Coming Soon** |
| `platform` | Optional display label (default: Android / Windows / Website from `kind`) |
| `codeProtected` | Optional. When `true`, show the fox-lock on landing/sidebar and require a code before Download / Open site |
| `unlockCode` | Optional 4-digit PIN used by the soft client-side gate (also set via Fox Publish **Code protected**) |
| `summaryOverride` | Optional clean About blurb (preferred over raw README text) |
| `repoPath` / `mobileRoot` | Paths for README + publish |
| `apkFileName` | Live APK under `portal/downloads/` |
| `beta` | Optional `{ apkFileName, apkSource }` or tool `{ packageFileName }` for a Beta download channel |
| `externalUrl` | For `kind: website` — “Open site” link |
| `allowWithoutApk` | List without a Live APK (websites default to this) |

**README convention:** optional `## Description`; otherwise the first paragraph after the title is the summary. If the README path is missing on the build machine, `build-portal.ps1` **keeps existing About/blocks** instead of wiping them to “Details coming soon.”

**Contact / About** live in `portal/data/portal-settings.json` (`contact`, `aboutBlurb`, `tagline`, `descriptor`). `build-portal.ps1` regenerates `about.json` and appends About to nav after apps (unless `showAbout` is false).

### Icons and screenshots

- **Project icons:** place `portal/assets/icons/<app-id>.png` (square, ~96px). Override with `"icon": "icons/custom.png"` in the manifest. **Fox Publish** and `publish-app-mobile.ps1` / `publish-app-tool.ps1` run `sync-portal-icon.ps1` to copy icons from the source repo automatically (Flutter `assets/branding/icon.png`, Android launcher, WinForms `Assets/*.ico`, etc.). `build-portal.ps1` backfills missing icons when the source repo is available on the build machine.
- **Screenshots:** add PNG/JPG/WebP files under `portal/assets/screenshots/<app-id>/` — discovered at build time and shown in a horizontal carousel on the product page.
- **Fox lock:** protected listings use `portal/assets/fox-lock*.png` (inline + unlock modal).

Set **`pagesBaseUrl`** in `portal-settings.json` to your GitHub Pages base (no trailing slash).

### Code protection (soft gate)

- Configure in **Fox Publish** (checkbox + 4-digit field) or set `codeProtected` / `unlockCode` in the manifest, then run `build-portal.ps1`.
- The portal stores unlock success in `sessionStorage` per project (same idea as the dedication page).
- **Limits:** APK/zip URLs on GitHub Pages remain public if someone has the link. Treat codes as shared family PINs, not secrets — **do not put unlock codes in commit messages or PR text**.
- **Future:** a “Request a code” action on the unlock modal (mailto / form that notifies you). Not built yet.

## Publish an APK (Live or Beta)

```powershell
cd portal\scripts
.\publish-app-mobile.ps1 -AppId active-huntress -Channel live -Status live -ReleaseNotes "Describe changes"
# or
.\publish-app-mobile.ps1 -AppId active-huntress -Channel beta -Status beta -ReleaseNotes "Beta: try X"
.\build-portal.ps1
```

- **Live:** `downloads/<apkFileName>` + `downloads/<id>/mobile-version.json` — sets `enableDemoData: false`
- **Beta:** `downloads/<beta.apkFileName>` + `downloads/<id>/beta/mobile-version.json` — sets `enableDemoData: true` (Active Huntress Chart preview)
- Optional **`-Status`** updates the portal badge (`live` / `beta` / `in_progress` / `planned`) in `apps-manifest.json` (also available in Fox Publish)
- Writes Flutter `assets/mobile_config.json` **before** the release build so `channel` / `enableDemoData` / `updateCheckUrl` are inside the APK
- Bump **`version:` in `pubspec.yaml`** (`1.0.0+2` — the **`+N` build** must increase every publish)

## AppGen round-trip

Use AppGen **Import from portal folder** after editing JSON, or edit `appgen.json`. Mobile apps should set `targets.mobile.publish.baseUrl` to this hub.

## Troubleshooting

- **Blank page** — serve via HTTP.
- **App shows “coming soon”** — Live APK missing; run `publish-app-mobile.ps1 -Channel live`.
- **Hidden app** — check `visible: false` in the manifest.
- **Update check never prompts** — increase `+N` in pubspec and republish; verify `updateCheckUrl` in `assets/mobile_config.json`.
- **Download asks for a code** — listing is `codeProtected`; use the PIN configured for that project (not the old site-wide password).

### Hidden pages (maintainers)

- Search phrase **`my huntress`** (Enter in Ctrl+K / landing search) → `portal/data/my-huntress.json` / `sections/my-huntress.html` (not in nav or Fuse). Page also asks for a private date code (`unlock` in that JSON).

## Commit and publish to GitHub

```powershell
cd D:\repos\The_Fox_s_Den Doc\portal\scripts
.\publish-app-mobile.ps1 -AppId active-huntress -ReleaseNotes "Your notes"
.\build-portal.ps1

cd D:\repos\The_Fox_s_Den Doc
git add portal appgen.json README.md .github .gitignore
```

Do **not** include unlock codes in the commit message.
