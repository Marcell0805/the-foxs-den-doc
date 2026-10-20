# The Fox's Den (legacy GitHub Pages stub)

Old StreamForge, Huntress Cookbook Mobile, Active Huntress, and FFS builds still request version JSON from:

`https://marcell0805.github.io/the-foxs-den-doc/...`

This repo is only that old host. Humans see `index.html`. Apps read the JSON files under `downloads/`. Packages themselves stay on `https://den.foxbytelabs.co.za`.

## Publish

1. Create an empty GitHub repo named `the-foxs-den-doc` under the **Marcell0805** user (not FoxByteLabs).
2. Push this folder to that repo.
3. GitHub → Settings → Pages → Deploy from branch `main` / root (`/`).
4. Confirm these URLs return JSON, not HTML:
   - `/downloads/streamforge/tool-version.json`
   - `/downloads/huntresscookbook-mobile/mobile-version.json`
   - `/downloads/active-huntress/mobile-version.json`
   - `/downloads/ffs/mobile-version.json`

Leave this site in place after the first hop. New app builds check den.foxbytelabs.co.za; old installs still need these paths.

## After each Den publish

Copy the matching `tool-version.json` / `mobile-version.json` from The Fox's Den `portal/downloads/` into this stub (URLs should already be den.foxbytelabs.co.za). The `build` number must be **greater than** the installed app or the in-app updater will ignore it:

- StreamForge: greater than 12
- Huntress Cookbook Mobile: greater than 18
- Active Huntress: greater than 5
- FFS: greater than 31
