param(
    [Parameter(Mandatory = $true)]
    [string]$AppId,
    [string]$MobileRoot = "",
    [string]$ApkPath = "",
    [string]$ReleaseNotes = "Mobile app update.",
    [string]$PagesBaseUrl = "",
    [string]$PortalRoot = "",
    [switch]$SkipBuild
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
    $text = [System.IO.File]::ReadAllText($path, $utf8)
    return $text | ConvertFrom-Json
}

function Write-JsonFile([string]$path, $obj) {
    $dir = Split-Path $path -Parent
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    $json = $obj | ConvertTo-Json -Depth 10 -Compress:$false
    [IO.File]::WriteAllText($path, $json, $utf8)
}

if (-not (Test-Path $manifestPath)) {
    throw "Missing apps-manifest.json at $manifestPath"
}

$manifest = Read-Json $manifestPath
$app = $manifest.apps | Where-Object { $_.id -eq $AppId } | Select-Object -First 1
if (-not $app) {
    throw "App id '$AppId' not found in apps-manifest.json"
}

if (-not $MobileRoot) {
    $MobileRoot = $app.mobileRoot
    if (-not $MobileRoot) { $MobileRoot = $app.repoPath }
}
if (-not $MobileRoot) {
    throw "Set -MobileRoot or mobileRoot in manifest for $AppId"
}

$settingsPath = Join-Path $dataDir "portal-settings.json"
if (-not $PagesBaseUrl -and (Test-Path $settingsPath)) {
    $settings = Read-Json $settingsPath
    $PagesBaseUrl = $settings.pagesBaseUrl
}
if (-not $PagesBaseUrl) {
    throw "Set -PagesBaseUrl or pagesBaseUrl in portal-settings.json"
}
$PagesBaseUrl = $PagesBaseUrl.TrimEnd('/')

$apkFileName = $app.apkFileName
if (-not $apkFileName) { $apkFileName = "$AppId.apk" }

if (-not $ApkPath) {
    $rel = if ($app.apkSource) { $app.apkSource } else { "build\app\outputs\flutter-apk\app-release.apk" }
    $ApkPath = Join-Path $MobileRoot $rel
}

if (-not $SkipBuild) {
    Push-Location $MobileRoot
    try {
        Write-Host "Running flutter pub get..."
        & flutter pub get
        if ($LASTEXITCODE -ne 0) { throw "flutter pub get failed with exit code $LASTEXITCODE" }
        Write-Host "Running flutter build apk --release..."
        & flutter build apk --release
        if ($LASTEXITCODE -ne 0) { throw "flutter build apk --release failed with exit code $LASTEXITCODE" }
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path $ApkPath)) {
    throw "APK not found at $ApkPath. Build first or pass -ApkPath."
}

try {
    $sig = & jarsigner -verify -verbose -certs $ApkPath 2>&1 | Out-String
    if ($sig -match 'CN=Android Debug') {
        Write-Warning "APK appears debug-signed. Configure android/key.properties and rebuild for release signing."
    }
} catch { }

$pubspecPath = Join-Path $MobileRoot "pubspec.yaml"
if (-not (Test-Path $pubspecPath)) {
    throw "Missing pubspec.yaml at $MobileRoot"
}

$versionLine = (Get-Content $pubspecPath | Where-Object { $_ -match '^version:\s*' } | Select-Object -First 1)
if ($versionLine -notmatch 'version:\s*([0-9.]+)\+(\d+)') {
    throw "Could not parse version from pubspec.yaml (expected format: 1.0.0+1)"
}
$versionName = $Matches[1]
$buildNumber = [int]$Matches[2]

New-Item -ItemType Directory -Force -Path $downloadsDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $downloadsDir $AppId) | Out-Null

$apkDest = Join-Path $downloadsDir $apkFileName
Copy-Item $ApkPath $apkDest -Force
Write-Host "Copied APK to $apkDest"

$apkUrl = "$PagesBaseUrl/downloads/$apkFileName"
$updateCheckUrl = "$PagesBaseUrl/downloads/$AppId/mobile-version.json"

$versionManifest = @{
    version = $versionName
    build = $buildNumber
    apkUrl = $apkUrl
    releaseNotes = $ReleaseNotes
}
$versionPath = Join-Path $downloadsDir "$AppId/mobile-version.json"
Write-JsonFile $versionPath $versionManifest
Write-Host "Wrote $versionPath (build $buildNumber, version $versionName)"

$mobileConfigPath = Join-Path $MobileRoot "assets/mobile_config.json"
$config = @{
    appName = $app.title
    updateCheckUrl = $updateCheckUrl
}
if (Test-Path $mobileConfigPath) {
    $existing = Read-Json $mobileConfigPath
    foreach ($prop in $existing.PSObject.Properties) {
        if ($prop.Name -notin @('appName', 'updateCheckUrl')) {
            $config[$prop.Name] = $prop.Value
        }
    }
}
New-Item -ItemType Directory -Force -Path (Split-Path $mobileConfigPath -Parent) | Out-Null
Write-JsonFile $mobileConfigPath $config
Write-Host "Updated $mobileConfigPath"

Write-Host ""
Write-Host "Done. Run build-portal.ps1, then commit portal/downloads/ and push for GitHub Pages."
