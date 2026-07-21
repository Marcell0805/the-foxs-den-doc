# The Fox's Den — App showcase

Password-gated static portal listing personal **AppGen** Flutter apps: README-driven detail pages, APK downloads on GitHub Pages, and per-app **`mobile-version.json`** for in-app update checks (same contract as The Huntress Cookbook mobile app).

## First run (local)

1. Open `portal/index.html` over HTTP (VS Code **Live Server**), not `file://`.
2. Default portal password: `the_fox_s_den` (see `portal/data/portal-settings.json`).
3. After editing manifest or data, run:

```powershell
cd portal\scripts
.\build-portal.ps1
```

## Apps manifest

Edit [`portal/data/apps-manifest.json`](portal/data/apps-manifest.json). Each entry needs:

| Field | Purpose |
|-------|---------|
| `id` | URL slug and folder name under `downloads/<id>/` |
| `title` | Nav label |
| `repoPath` / `mobileRoot` | Paths to the Flutter project (for README + publish) |
| `readme` | Usually `README.md` |
| `apkFileName` | Stable APK name under `portal/downloads/` |

**README convention:** optional `## Description` section; otherwise the first paragraph after the title becomes the summary.

Set **`pagesBaseUrl`** in `portal/data/portal-settings.json` to your GitHub Pages base (no trailing slash), e.g. `https://marcell0805.github.io/the-foxs-den-doc`.

## Publish an APK to the hub

```powershell
cd portal\scripts
.\publish-app-mobile.ps1 -AppId active-huntress -ReleaseNotes "Describe changes"
.\build-portal.ps1
```

Then commit `portal/downloads/` and push.

- Bump **`version:` in `pubspec.yaml`** (`1.0.0+2` — the **`+N` build** must increase every publish).
- `publish-app-mobile.ps1` copies the APK, writes `downloads/<app-id>/mobile-version.json`, and refreshes the mobile project's `assets/mobile_config.json` **`updateCheckUrl`**.

## AppGen round-trip

Use AppGen **Import from portal folder** after editing JSON, or edit `appgen.json` Portal section to match. Mobile apps should set `targets.mobile.publish.baseUrl` to this hub and use Fox's Den publish script when `portalRepoPath` is configured (see AppGen docs).

## Troubleshooting

- **Blank page** — serve via HTTP.
- **App shows “coming soon”** — APK missing; run `publish-app-mobile.ps1`.
- **Update check never prompts** — increase `+N` in pubspec and republish; verify `updateCheckUrl` in `assets/mobile_config.json`.

## Commit and publish to GitHub

The hub lives in **this repo** only (`The_Fox_s_Den Doc`). App repos (e.g. Active Huntress Mobile) are committed separately.

### First-time setup

```powershell
cd D:\repos\The_Fox_s_Den Doc
git init
git branch -M main
git remote add origin https://github.com/Marcell0805/the-foxs-den-doc.git
```

Use your real GitHub repo URL if the name differs.

### What to commit

| Include | Why |
|---------|-----|
| `portal/` (HTML, CSS, JS, `data/`, scripts) | The static site |
| `portal/downloads/` (APKs + `*/mobile-version.json`) | Public install + in-app updates |
| Generated `portal/js/portal-data.js`, `search-index.js`, `portal/data/*.json` (except manifest-only churn) | Pages works without running PowerShell on GitHub |
| `apps-manifest.json`, `portal-settings.json` | Source config (manifest uses **local paths** for README sync on your machine) |
| `appgen.json`, root `README.md` | AppGen round-trip |
| `.github/workflows/github-pages.yml` | Deploy on push |

Run **`build-portal.ps1`** and **`publish-app-mobile.ps1`** locally before committing so downloads and bundled JS match.

### Routine commit

```powershell
cd D:\repos\The_Fox_s_Den Doc\portal\scripts
.\publish-app-mobile.ps1 -AppId active-huntress -ReleaseNotes "Your notes"   # when APK changed
.\build-portal.ps1

cd D:\repos\The_Fox_s_Den Doc
git add portal appgen.json README.md .github .gitignore
git status
git commit -m "Publish portal and active-huntress build"
git push -u origin main
```

### GitHub Pages

1. Push to **`main`**.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. After the workflow succeeds, the site URL should match **`pagesBaseUrl`** in `portal/data/portal-settings.json` (no `/portal` suffix when using the included workflow, because it publishes the **contents** of `portal/` as the site root).

Example: `https://marcell0805.github.io/the-foxs-den-doc/` → APK at `…/downloads/active-huntress.apk`.

### APK files

Same pattern as Huntress Cookbook: commit release APKs under `portal/downloads/` and serve them from GitHub Pages (typically ~50–70 MB — under GitHub’s 100 MB file limit).

Publish flow:

```powershell
.\publish-app-mobile.ps1 -AppId active-huntress -ReleaseNotes "Your notes"
.\build-portal.ps1
# then commit portal/ (including downloads/*.apk) and push
```

If an APK ever approaches 100 MB, build a smaller split APK (`flutter build apk --release --split-per-abi`) and publish the `arm64-v8a` artifact instead.

### Security note

The portal **password** is in committed JSON/JS (client-side gate only). APKs and `mobile-version.json` are public URLs by design.
