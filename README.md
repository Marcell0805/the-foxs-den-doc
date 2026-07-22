# The Fox's Den

Password-gated static portal for personal **websites and mobile apps**: README-driven detail pages, APK downloads on GitHub Pages, Live/Beta channels, and per-app **`mobile-version.json`** for in-app updates (same contract as The Huntress Cookbook mobile app).

## First run (local)

1. Open `portal/index.html` over HTTP (VS Code **Live Server**), not `file://`.
2. Default portal password: `the_fox_s_den` (see `portal/data/portal-settings.json`).
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
| `kind` | `mobile` (default) or `website` — groups the landing list |
| `visible` | Default `true`. Set `false` to hide from nav, landing, and search |
| `available` | Clickable vs “coming soon” (also false when Live APK missing unless `allowWithoutApk`) |
| `status` | Badge: `live`, `beta`, `in_progress`, `planned` |
| `repoPath` / `mobileRoot` | Paths for README + publish |
| `apkFileName` | Live APK under `portal/downloads/` |
| `beta` | Optional `{ apkFileName, apkSource }` for a Beta download channel |
| `externalUrl` | For `kind: website` — “Open site” link |
| `allowWithoutApk` | List without a Live APK (websites default to this) |

**README convention:** optional `## Description`; otherwise the first paragraph after the title is the summary.

**Contact / About** live in `portal/data/portal-settings.json` (`contact`, `aboutBlurb`). `build-portal.ps1` regenerates `about.json` and appends About to nav after apps.

Set **`pagesBaseUrl`** in `portal-settings.json` to your GitHub Pages base (no trailing slash).

## Publish an APK (Live or Beta)

```powershell
cd portal\scripts
.\publish-app-mobile.ps1 -AppId active-huntress -Channel live -ReleaseNotes "Describe changes"
# or
.\publish-app-mobile.ps1 -AppId active-huntress -Channel beta -ReleaseNotes "Beta: try X"
.\build-portal.ps1
```

- **Live:** `downloads/<apkFileName>` + `downloads/<id>/mobile-version.json`
- **Beta:** `downloads/<beta.apkFileName>` + `downloads/<id>/beta/mobile-version.json`
- Bump **`version:` in `pubspec.yaml`** (`1.0.0+2` — the **`+N` build** must increase every publish).
- Refreshes Flutter `assets/mobile_config.json` **`updateCheckUrl`** for that channel.

## AppGen round-trip

Use AppGen **Import from portal folder** after editing JSON, or edit `appgen.json`. Mobile apps should set `targets.mobile.publish.baseUrl` to this hub.

## Troubleshooting

- **Blank page** — serve via HTTP.
- **App shows “coming soon”** — Live APK missing; run `publish-app-mobile.ps1 -Channel live`.
- **Hidden app** — check `visible: false` in the manifest.
- **Update check never prompts** — increase `+N` in pubspec and republish; verify `updateCheckUrl` in `assets/mobile_config.json`.

### Hidden pages (maintainers)

- Search phrase **`my huntress`** (Enter in Ctrl+K / landing search) → `portal/data/my-huntress.json` / `sections/my-huntress.html` (not in nav or Fuse).

## Commit and publish to GitHub

```powershell
cd D:\repos\The_Fox_s_Den Doc\portal\scripts
.\publish-app-mobile.ps1 -AppId active-huntress -ReleaseNotes "Your notes"
.\build-portal.ps1

cd D:\repos\The_Fox_s_Den Doc
git add portal appgen.json README.md .github .gitignore
git commit -m "Publish portal and active-huntress build"
git push -u origin main
```

### GitHub Pages

1. Push to **`main`**.
2. **Settings → Pages → Source: GitHub Actions**.
3. Site URL should match **`pagesBaseUrl`** (workflow publishes **`portal/`** as the site root).

### Security note

The portal **password** is in committed JSON/JS (client-side only). APKs and `mobile-version.json` are public URLs by design.
