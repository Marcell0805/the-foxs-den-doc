param(
    [Parameter(Mandatory = $true)]
    [string]$AppId,
    [Parameter(Mandatory = $true)]
    [string]$ZipPath,
    [string]$ReleaseNotes = "Tool update.",
    [string]$Version = "1.0.0",
    [int]$Build = 1,
    [string]$PagesBaseUrl = "",
    [string]$PortalRoot = ""
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

function Format-PackageSize([long]$Bytes) {
    if ($Bytes -lt 1KB) { return "$Bytes B" }
    if ($Bytes -lt 1MB) { return ("{0:N1} KB" -f ($Bytes / 1KB)) }
    if ($Bytes -lt 1GB) { return ("{0:N1} MB" -f ($Bytes / 1MB)) }
    return ("{0:N2} GB" -f ($Bytes / 1GB))
}

if (-not (Test-Path $manifestPath)) {
    throw "Missing apps-manifest.json at $manifestPath"
}
if (-not (Test-Path $ZipPath)) {
    throw "Zip not found at $ZipPath"
}

$manifest = Read-Json $manifestPath
$app = $manifest.apps | Where-Object { $_.id -eq $AppId } | Select-Object -First 1
if (-not $app) {
    throw "App id '$AppId' not found in apps-manifest.json"
}
if ($app.kind -ne 'tool') {
    throw "App '$AppId' kind is '$($app.kind)' — expected 'tool'"
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

$packageFileName = if ($app.packageFileName) { $app.packageFileName } else { "$AppId-win-x64.zip" }
if ($packageFileName -notmatch '\.zip$') { $packageFileName = "$packageFileName.zip" }

$versionDir = Join-Path $downloadsDir $AppId
New-Item -ItemType Directory -Force -Path $downloadsDir | Out-Null
New-Item -ItemType Directory -Force -Path $versionDir | Out-Null

$zipDest = Join-Path $downloadsDir $packageFileName
Copy-Item $ZipPath $zipDest -Force
Write-Host "Copied package to $zipDest"

$sizeBytes = [long](Get-Item $zipDest).Length
$sizeLabel = Format-PackageSize $sizeBytes
Write-Host "Package size: $sizeLabel ($sizeBytes bytes)"

$packageUrl = "$PagesBaseUrl/downloads/$packageFileName"
$publishedAt = (Get-Date).ToString("yyyy-MM-dd")

$versionManifest = @{
    version = $Version
    build = $Build
    packageUrl = $packageUrl
    releaseNotes = $ReleaseNotes
    channel = "tool"
    sizeBytes = $sizeBytes
    sizeLabel = $sizeLabel
    publishedAt = $publishedAt
}
$versionPath = Join-Path $versionDir "tool-version.json"
Write-JsonFile $versionPath $versionManifest
Write-Host "Wrote $versionPath (build $Build, version $Version, $sizeLabel)"

Write-Host ""
Write-Host "Done. Run build-portal.ps1, then commit portal/downloads/ and push for GitHub Pages."
