# Upload an APK as a GitHub Release asset and point portal metadata at it.
# APKs are gitignored (100 MB limit); Releases is the supported host.
param(
    [Parameter(Mandatory = $true)]
    [string]$AppId,
    [string]$ApkPath = "",
    [string]$Tag = "",
    [string]$ReleaseNotes = "Mobile app update.",
    [string]$Repo = "Marcell0805/the-foxs-den-doc",
    [string]$PortalRoot = "",
    [string]$GhPath = ""
)

$ErrorActionPreference = "Stop"
$utf8 = [System.Text.UTF8Encoding]::new($false)

if (-not $PortalRoot) {
    $scriptDir = $PSScriptRoot
    if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
    $PortalRoot = Split-Path $scriptDir -Parent
}

$dataDir = Join-Path $PortalRoot "data"
$downloadsDir = Join-Path $PortalRoot "downloads"
$manifestPath = Join-Path $dataDir "apps-manifest.json"

function Read-Json([string]$path) {
    return [System.IO.File]::ReadAllText($path, $utf8) | ConvertFrom-Json
}

function Write-JsonFile([string]$path, $obj) {
    $dir = Split-Path $path -Parent
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    $json = $obj | ConvertTo-Json -Depth 10 -Compress:$false
    [IO.File]::WriteAllText($path, $json, $utf8)
}

if (-not $GhPath) {
    $candidates = @(
        "$env:ProgramFiles\GitHub CLI\gh.exe",
        "$env:LOCALAPPDATA\Programs\GitHub CLI\gh.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $GhPath = $c; break }
    }
}
if (-not $GhPath) {
    $cmd = Get-Command gh -ErrorAction SilentlyContinue
    if ($cmd) { $GhPath = $cmd.Source }
}
if (-not $GhPath -or -not (Test-Path $GhPath)) {
    throw "GitHub CLI (gh) not found. Install from https://cli.github.com/ then run: gh auth login"
}

& $GhPath auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Not logged into GitHub CLI. Run: gh auth login"
}

if (-not (Test-Path $manifestPath)) {
    throw "Missing apps-manifest.json at $manifestPath"
}

$manifest = Read-Json $manifestPath
$app = $manifest.apps | Where-Object { $_.id -eq $AppId } | Select-Object -First 1
if (-not $app) {
    throw "App id '$AppId' not found in apps-manifest.json"
}

$apkFileName = if ($app.apkFileName) { $app.apkFileName } else { "$AppId.apk" }
if (-not $ApkPath) {
    $ApkPath = Join-Path $downloadsDir $apkFileName
}
if (-not (Test-Path $ApkPath)) {
    throw "APK not found at $ApkPath. Build/publish the APK first, or pass -ApkPath."
}

$versionPath = Join-Path $downloadsDir "$AppId/mobile-version.json"
$versionName = "1.0.0"
$buildNumber = 1
if (Test-Path $versionPath) {
    $ver = Read-Json $versionPath
    if ($ver.version) { $versionName = [string]$ver.version }
    if ($ver.build) { $buildNumber = [int]$ver.build }
    if ($ver.releaseNotes -and $ReleaseNotes -eq "Mobile app update.") {
        $ReleaseNotes = [string]$ver.releaseNotes
    }
}

if (-not $Tag) {
    $Tag = "v$versionName-b$buildNumber"
}

$apkUrl = "https://github.com/$Repo/releases/download/$Tag/$apkFileName"
$title = "$($app.title) $versionName (build $buildNumber)"
$notes = @"
$ReleaseNotes

**Download:** [$apkFileName]($apkUrl)
"@

Write-Host "Creating/updating release $Tag on $Repo ..."
$existing = & $GhPath release view $Tag -R $Repo 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Release $Tag already exists — uploading asset (clobber)..."
    & $GhPath release upload $Tag $ApkPath -R $Repo --clobber
    if ($LASTEXITCODE -ne 0) { throw "gh release upload failed" }
} else {
    & $GhPath release create $Tag $ApkPath -R $Repo --title $title --notes $notes
    if ($LASTEXITCODE -ne 0) { throw "gh release create failed" }
}

$versionManifest = @{
    version = $versionName
    build = $buildNumber
    apkUrl = $apkUrl
    releaseNotes = $ReleaseNotes
}
New-Item -ItemType Directory -Force -Path (Join-Path $downloadsDir $AppId) | Out-Null
Write-JsonFile $versionPath $versionManifest
Write-Host "Updated $versionPath -> $apkUrl"
Write-Host ""
Write-Host "Next: .\build-portal.ps1 then commit/push portal JSON (not the APK)."
