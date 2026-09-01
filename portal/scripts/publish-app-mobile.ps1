param(
    [Parameter(Mandatory = $true)]
    [string]$AppId,
    [ValidateSet('live', 'beta')]
    [string]$Channel = "live",
    [ValidateSet('live', 'beta', 'in_progress', 'planned')]
    [string]$Status,
    [string]$MobileRoot = "",
    [string]$ApkPath = "",
    [string]$ReleaseNotes = "Mobile app update.",
    [string]$PagesBaseUrl = "",
    [string]$PortalRoot = "",
    [string]$ContentManifestUrl = "",
    [string]$ContentVersion = "",
    # Local downloads folder of any companion website that hosts mobile-content-manifest.json
    [string]$ContentDownloadsRoot = "",
    [ValidateSet('apk', 'aab', 'both')]
    [string]$BuildTarget = "apk",
    [string]$PlaySignedApkPath = "",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$utf8 = [System.Text.UTF8Encoding]::new($false)

function Resolve-FlutterCommand {
    $cmd = Get-Command flutter -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $bins = @()
    if ($env:FLUTTER_ROOT) {
        $bins += (Join-Path $env:FLUTTER_ROOT.Trim('"') "bin")
    }
    $bins += @(
        (Join-Path $env:USERPROFILE "source\flutter\bin"),
        (Join-Path $env:USERPROFILE "flutter\bin"),
        (Join-Path $env:USERPROFILE "dev\flutter\bin"),
        (Join-Path $env:LOCALAPPDATA "flutter\bin"),
        "C:\flutter\bin",
        "C:\src\flutter\bin",
        "C:\tools\flutter\bin"
    )

    foreach ($bin in $bins) {
        if (-not (Test-Path $bin)) { continue }
        $bat = Join-Path $bin "flutter.bat"
        $exe = Join-Path $bin "flutter.exe"
        if (Test-Path $bat) {
            if ($env:PATH -notlike "*$bin*") {
                $env:PATH = "$bin;$env:PATH"
            }
            return $bat
        }
        if (Test-Path $exe) {
            if ($env:PATH -notlike "*$bin*") {
                $env:PATH = "$bin;$env:PATH"
            }
            return $exe
        }
    }

    return $null
}

function Test-ReleaseSigning([string]$apkPath) {
    try {
        $sig = & jarsigner -verify -verbose -certs $apkPath 2>&1 | Out-String
        if ($sig -match 'CN=Android Debug') {
            return $false
        }
        return $true
    } catch {
        return $true
    }
}

function Assert-ReleaseKeyProperties([string]$mobileRoot) {
    $keyProps = Join-Path $mobileRoot "android\key.properties"
    if (-not (Test-Path $keyProps)) {
        throw "Missing android/key.properties at $mobileRoot. Copy android/key.properties.example and configure your upload keystore before Play or release publish."
    }
}

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

$distribution = if ($app.distribution) { [string]$app.distribution } else { "apk" }
$storeUrl = $null
if ($app.googlePlayUrl) { $storeUrl = [string]$app.googlePlayUrl }
elseif ($app.playStoreUrl) { $storeUrl = [string]$app.playStoreUrl }

# Write mobile_config BEFORE flutter build so channel / enableDemoData ship inside the APK.
$mobileConfigPath = Join-Path $MobileRoot "assets/mobile_config.json"
$enableDemoData = ($Channel -eq 'beta')
$config = @{
    appName = $app.title
    updateCheckUrl = $updateCheckUrl
    channel = $Channel
    enableDemoData = $enableDemoData
}
if ($storeUrl) { $config.storeUrl = $storeUrl }
if ($distribution) { $config.distribution = $distribution }
if (Test-Path $mobileConfigPath) {
    $existing = Read-Json $mobileConfigPath
    foreach ($prop in $existing.PSObject.Properties) {
        if ($prop.Name -notin @('appName', 'updateCheckUrl', 'channel', 'enableDemoData')) {
            $config[$prop.Name] = $prop.Value
        }
    }
}
New-Item -ItemType Directory -Force -Path (Split-Path $mobileConfigPath -Parent) | Out-Null
Write-JsonFile $mobileConfigPath $config
Write-Host ("Updated {0} (channel={1}, enableDemoData={2}) - baked into APK on next build" -f $mobileConfigPath, $Channel, $enableDemoData)

$aabPath = Join-Path $MobileRoot "build\app\outputs\bundle\release\app-release.aab"
$needsAab = ($BuildTarget -in @('aab', 'both')) -and ($Channel -ne 'beta')
$needsApkBuild = ($BuildTarget -in @('apk', 'both')) -and (-not $PlaySignedApkPath)
if ($needsAab -or $needsApkBuild) {
    if ($needsAab) {
        Assert-ReleaseKeyProperties $MobileRoot
    }
    $flutter = Resolve-FlutterCommand
    if (-not $flutter) {
        throw "Flutter SDK not found. Add flutter\bin to PATH (this machine has it under %USERPROFILE%\source\flutter\bin), then retry."
    }
    Write-Host "Using Flutter: $flutter"

    Push-Location $MobileRoot
    try {
        Write-Host "Running flutter pub get..."
        & $flutter pub get
        if ($LASTEXITCODE -ne 0) { throw "flutter pub get failed with exit code $LASTEXITCODE" }
        if ($needsAab) {
            Write-Host "Running flutter build appbundle --release..."
            & $flutter build appbundle --release
            if ($LASTEXITCODE -ne 0) { throw "flutter build appbundle --release failed with exit code $LASTEXITCODE" }
            if (-not (Test-Path $aabPath)) {
                throw "AAB not found at $aabPath after build."
            }
            Write-Host "Built AAB: $aabPath"
        }
        if ($needsApkBuild) {
            if ($distribution -eq 'both' -and $Channel -eq 'live') {
                Write-Host "Skipping local APK build (Play-signed APK expected via -PlaySignedApkPath)."
            } else {
                Write-Host "Running flutter build apk --release..."
                & $flutter build apk --release
                if ($LASTEXITCODE -ne 0) { throw "flutter build apk --release failed with exit code $LASTEXITCODE" }
            }
        }
    }
    finally {
        Pop-Location
    }
} else {
    Write-Warning "SkipBuild: ensure assets/mobile_config.json was present when this APK was built (channel=$Channel)."
}

if ($PlaySignedApkPath) {
    if (-not (Test-Path $PlaySignedApkPath)) {
        throw "Play-signed APK not found at $PlaySignedApkPath"
    }
    $ApkPath = $PlaySignedApkPath
    Write-Host "Using Play-signed APK: $ApkPath"
}

if (-not $SkipBuild -and $needsAab -and -not (Test-Path $aabPath)) {
    throw "AAB not found at $aabPath."
}

if ($BuildTarget -eq 'aab' -and -not $PlaySignedApkPath) {
    Write-Host "AAB-only build complete. Upload to Play before copying APK to portal."
    if ($Status) {
        $updatedApps = @()
        foreach ($entry in $manifest.apps) {
            if ($entry.id -eq $AppId) { $entry.status = $Status }
            $updatedApps += $entry
        }
        $manifest.apps = $updatedApps
        Write-JsonFile $manifestPath $manifest
        Write-Host "Updated apps-manifest.json status for $AppId -> $Status"
    }
    return
}

if (-not (Test-Path $ApkPath)) {
    throw "APK not found at $ApkPath. Build first or pass -ApkPath."
}

if ($ApkPath -match '(?i)debug') {
    throw "Refusing to publish a debug APK ($ApkPath). Use app-release.apk."
}

try {
    if (-not (Test-ReleaseSigning $ApkPath)) {
        if ($distribution -eq 'both' -or $needsAab) {
            throw "APK appears debug-signed. Configure android/key.properties and rebuild for release signing."
        }
        Write-Warning "APK appears debug-signed. Configure android/key.properties and rebuild for release signing."
    }
} catch { }

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
Write-Host ('APK size: {0} ({1} bytes)' -f $sizeLabel, $sizeBytes)

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
if ($storeUrl) { $versionManifest.storeUrl = $storeUrl }
if ($distribution) { $versionManifest.distribution = $distribution }
if ($ContentVersion -and $ContentManifestUrl) {
    $versionManifest.contentVersion = $ContentVersion
    $versionManifest.contentManifestUrl = $ContentManifestUrl
}
$versionPath = Join-Path $versionDir "mobile-version.json"
Write-JsonFile $versionPath $versionManifest
Write-Host "Wrote $versionPath (build $buildNumber, version $versionName, $sizeLabel)"

$iconScript = Join-Path $PSScriptRoot "sync-portal-icon.ps1"
if (Test-Path $iconScript) {
    & $iconScript -AppId $AppId -PortalRoot $PortalRoot -SourceRoot $MobileRoot -Kind "mobile"
}

Write-Host ""
Write-Host "Done. Run build-portal.ps1, then commit portal/downloads/ and push for GitHub Pages."
Write-Host "  channel=$Channel enableDemoData=$enableDemoData"

if ($Status) {
    $app.status = $Status
    $updatedApps = @()
    foreach ($entry in $manifest.apps) {
        if ($entry.id -eq $AppId) {
            $entry.status = $Status
        }
        $updatedApps += $entry
    }
    $manifest.apps = $updatedApps
    Write-JsonFile $manifestPath $manifest
    Write-Host "Updated apps-manifest.json status for $AppId -> $Status"
}