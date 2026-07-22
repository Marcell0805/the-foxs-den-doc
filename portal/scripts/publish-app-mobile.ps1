param(
    [Parameter(Mandatory = $true)]
    [string]$AppId,
    [ValidateSet('live', 'beta')]
    [string]$Channel = "live",
    [string]$MobileRoot = "",
    [string]$ApkPath = "",
    [string]$ReleaseNotes = "Mobile app update.",
    [string]$PagesBaseUrl = "",
    [string]$PortalRoot = "",
    [string]$ContentManifestUrl = "",
    [string]$ContentVersion = "",
    # Local downloads folder of any companion website that hosts mobile-content-manifest.json
    [string]$ContentDownloadsRoot = "",
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

if ($Channel -eq 'beta') {
    if (-not $app.beta) {
        throw "App '$AppId' has no beta block in apps-manifest.json"
    }
    $apkFileName = if ($app.beta.apkFileName) { $app.beta.apkFileName } else { "$AppId-beta.apk" }
    $apkSourceRel = if ($app.beta.apkSource) { $app.beta.apkSource } elseif ($app.apkSource) { $app.apkSource } else { "build\app\outputs\flutter-apk\app-release.apk" }
    $versionDir = Join-Path $downloadsDir "$AppId\beta"
    $updateCheckUrl = "$PagesBaseUrl/downloads/$AppId/beta/mobile-version.json"
} else {
    $apkFileName = if ($app.apkFileName) { $app.apkFileName } else { "$AppId.apk" }
    $apkSourceRel = if ($app.apkSource) { $app.apkSource } else { "build\app\outputs\flutter-apk\app-release.apk" }
    $versionDir = Join-Path $downloadsDir $AppId
    $updateCheckUrl = "$PagesBaseUrl/downloads/$AppId/mobile-version.json"
}

if (-not $ApkPath) {
    $ApkPath = Join-Path $MobileRoot $apkSourceRel
}

# Debug APKs are huge and must never be published to Pages.
if ($ApkPath -match '(?i)debug') {
    $releaseFallback = Join-Path $MobileRoot "build\app\outputs\flutter-apk\app-release.apk"
    Write-Warning "apkSource points at a debug APK ($ApkPath). Switching to release: $releaseFallback"
    $ApkPath = $releaseFallback
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

if ($ApkPath -match '(?i)debug') {
    throw "Refusing to publish a debug APK ($ApkPath). Use app-release.apk."
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
New-Item -ItemType Directory -Force -Path $versionDir | Out-Null

$apkDest = Join-Path $downloadsDir $apkFileName
Copy-Item $ApkPath $apkDest -Force
Write-Host "Copied APK to $apkDest (channel: $Channel)"

function Format-ApkSize([long]$Bytes) {
    if ($Bytes -lt 1KB) { return "$Bytes B" }
    if ($Bytes -lt 1MB) { return ("{0:N1} KB" -f ($Bytes / 1KB)) }
    if ($Bytes -lt 1GB) { return ("{0:N1} MB" -f ($Bytes / 1MB)) }
    return ("{0:N2} GB" -f ($Bytes / 1GB))
}

$sizeBytes = [long](Get-Item $apkDest).Length
$sizeLabel = Format-ApkSize $sizeBytes
Write-Host "APK size: $sizeLabel ($sizeBytes bytes)"

$apkUrl = "$PagesBaseUrl/downloads/$apkFileName"

# Optional content OTA: any companion website can host mobile-content-manifest.json.
# Configure via -ContentManifestUrl / -ContentVersion / -ContentDownloadsRoot, or apps-manifest contentOta.
$contentOta = $app.contentOta
if (-not $ContentManifestUrl -and $contentOta -and $contentOta.manifestUrl) {
    $ContentManifestUrl = [string]$contentOta.manifestUrl
}
if (-not $ContentVersion -and $contentOta -and $contentOta.contentVersion) {
    $ContentVersion = [string]$contentOta.contentVersion
}
if (-not $ContentDownloadsRoot) {
    if ($contentOta -and $contentOta.downloadsRoot) {
        $ContentDownloadsRoot = [string]$contentOta.downloadsRoot
    } elseif ($app.contentDownloadsRoot) {
        $ContentDownloadsRoot = [string]$app.contentDownloadsRoot
    }
}

$manifestFileName = "mobile-content-manifest.json"
if ($contentOta -and $contentOta.manifestFileName) {
    $manifestFileName = [string]$contentOta.manifestFileName
}

if ((-not $ContentVersion -or -not $ContentManifestUrl) -and $ContentDownloadsRoot) {
    $localManifestPath = Join-Path $ContentDownloadsRoot $manifestFileName
    if (Test-Path $localManifestPath) {
        $localManifest = Read-Json $localManifestPath
        if (-not $ContentVersion) {
            $ContentVersion = [string]$localManifest.contentVersion
        }
        if (-not $ContentManifestUrl -and $contentOta -and $contentOta.manifestUrl) {
            $ContentManifestUrl = [string]$contentOta.manifestUrl
        }
        if (-not $ContentManifestUrl -and $app.contentManifestUrl) {
            $ContentManifestUrl = [string]$app.contentManifestUrl
        }
        if ($ContentVersion -and $ContentManifestUrl) {
            Write-Host "Attached content OTA from $localManifestPath ($ContentVersion)"
        } elseif ($ContentVersion -and -not $ContentManifestUrl) {
            Write-Warning "Found $manifestFileName but no contentManifestUrl (pass -ContentManifestUrl or set contentOta.manifestUrl in apps-manifest)."
        }
    } elseif ($ContentDownloadsRoot) {
        Write-Warning "Content downloads root set but missing $localManifestPath"
    }
}

$versionManifest = @{
    version = $versionName
    build = $buildNumber
    apkUrl = $apkUrl
    releaseNotes = $ReleaseNotes
    channel = $Channel
    sizeBytes = $sizeBytes
    sizeLabel = $sizeLabel
}
if ($ContentVersion -and $ContentManifestUrl) {
    $versionManifest.contentVersion = $ContentVersion
    $versionManifest.contentManifestUrl = $ContentManifestUrl
}
$versionPath = Join-Path $versionDir "mobile-version.json"
Write-JsonFile $versionPath $versionManifest
Write-Host "Wrote $versionPath (build $buildNumber, version $versionName, $sizeLabel)"

$mobileConfigPath = Join-Path $MobileRoot "assets/mobile_config.json"
$config = @{
    appName = $app.title
    updateCheckUrl = $updateCheckUrl
    channel = $Channel
}
if (Test-Path $mobileConfigPath) {
    $existing = Read-Json $mobileConfigPath
    foreach ($prop in $existing.PSObject.Properties) {
        if ($prop.Name -notin @('appName', 'updateCheckUrl', 'channel')) {
            $config[$prop.Name] = $prop.Value
        }
    }
}
New-Item -ItemType Directory -Force -Path (Split-Path $mobileConfigPath -Parent) | Out-Null
Write-JsonFile $mobileConfigPath $config
Write-Host "Updated $mobileConfigPath (updateCheckUrl → $Channel)"

Write-Host ""
Write-Host "Done. Run build-portal.ps1, then commit portal/downloads/ and push for GitHub Pages."
