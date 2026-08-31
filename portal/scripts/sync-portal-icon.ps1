param(
    [Parameter(Mandatory = $true)]
    [string]$AppId,
    [string]$PortalRoot = "",
    [string]$SourceRoot = "",
    [string]$Kind = "",
    [string]$ProjectPath = "",
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$utf8 = [System.Text.UTF8Encoding]::new($false)

if (-not $PortalRoot) {
    $scriptDir = $PSScriptRoot
    if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
    $PortalRoot = Split-Path $scriptDir -Parent
}

function Write-IconLog([string]$Message) {
    if (-not $Quiet) { Write-Host $Message }
}

function Resolve-RepoPath([string]$baseDir, [string]$path) {
    if ([string]::IsNullOrWhiteSpace($path)) { return "" }
    if ([System.IO.Path]::IsPathRooted($path)) { return $path }
    return [System.IO.Path]::GetFullPath((Join-Path $baseDir $path))
}

function Read-Json([string]$path) {
    $text = [System.IO.File]::ReadAllText($path, $utf8)
    return $text | ConvertFrom-Json
}

function Write-JsonFile([string]$path, $obj) {
    $dir = Split-Path $path -Parent
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    $json = $obj | ConvertTo-Json -Depth 30 -Compress:$false
    [IO.File]::WriteAllText($path, $json, $utf8)
}

function Get-MobileIconCandidates([string]$root) {
    if (-not $root -or -not (Test-Path $root)) { return @() }
    return @(
        (Join-Path $root "assets\branding\icon.png"),
        (Join-Path $root "assets\branding\launcher_icon.png"),
        (Join-Path $root "assets\icon.png"),
        (Join-Path $root "web\favicon.png"),
        (Join-Path $root "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"),
        (Join-Path $root "android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"),
        (Join-Path $root "android\app\src\main\res\drawable-xxxhdpi\ic_launcher_foreground.png")
    )
}

function Get-ToolIconCandidates([string]$projectPath, [string]$repoPath) {
    $dirs = [System.Collections.Generic.List[string]]::new()
    if ($projectPath) {
        if (Test-Path $projectPath -PathType Leaf) {
            $parent = Split-Path $projectPath -Parent
            if ($parent) { $dirs.Add($parent) }
        } elseif (Test-Path $projectPath -PathType Container) {
            $dirs.Add($projectPath)
        }
    }
    if ($repoPath -and (Test-Path $repoPath)) { $dirs.Add($repoPath) }

    $candidates = [System.Collections.Generic.List[string]]::new()
    foreach ($dir in ($dirs | Select-Object -Unique)) {
        foreach ($name in @('app.ico', 'icon.ico', 'logo.ico', 'icon.png', 'logo.png', 'app.png')) {
            $candidates.Add((Join-Path $dir $name))
        }
        foreach ($sub in @('Assets', 'assets', 'Resources', 'resources')) {
            $subDir = Join-Path $dir $sub
            if (-not (Test-Path $subDir)) { continue }
            Get-ChildItem -Path $subDir -File -ErrorAction SilentlyContinue |
                Where-Object { $_.Extension -match '^\.(ico|png|jpg|jpeg|webp)$' -and $_.Name -notmatch 'splash|banner|screenshot' } |
                ForEach-Object { $candidates.Add($_.FullName) }
        }
    }
    return @($candidates | Select-Object -Unique)
}

function Get-WebsiteIconCandidates([string]$root) {
    if (-not $root -or -not (Test-Path $root)) { return @() }
    return @(
        (Join-Path $root "favicon.png"),
        (Join-Path $root "favicon.ico"),
        (Join-Path $root "assets\icon.png"),
        (Join-Path $root "assets\favicon.png"),
        (Join-Path $root "icon.png"),
        (Join-Path $root "images\icon.png")
    )
}

function Find-AppIconSource {
    param(
        [string]$SourceRoot,
        [string]$Kind,
        [string]$ProjectPath
    )
    $candidates = @()
    switch ($Kind) {
        'tool' { $candidates = Get-ToolIconCandidates -projectPath $ProjectPath -repoPath $SourceRoot }
        'website' { $candidates = Get-WebsiteIconCandidates -root $SourceRoot }
        default { $candidates = Get-MobileIconCandidates -root $SourceRoot }
    }
    foreach ($path in $candidates) {
        if ($path -and (Test-Path $path)) { return $path }
    }
    return $null
}

function Save-PortalIcon {
    param(
        [string]$SourcePath,
        [string]$DestPath,
        [int]$Size = 192
    )
    $destDir = Split-Path $DestPath -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }

    Add-Type -AssemblyName System.Drawing
    $ext = [System.IO.Path]::GetExtension($SourcePath).ToLowerInvariant()
    $img = $null
    try {
        if ($ext -eq '.ico') {
            $img = [System.Drawing.Bitmap]::FromFile($SourcePath)
        } else {
            $img = [System.Drawing.Image]::FromFile($SourcePath)
        }
        $bmp = New-Object System.Drawing.Bitmap $Size, $Size
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($img, 0, 0, $Size, $Size)
        $g.Dispose()
        $img.Dispose()
        $bmp.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
    } finally {
        if ($img) { $img.Dispose() }
    }
}

$dataDir = Join-Path $PortalRoot "data"
$manifestPath = Join-Path $dataDir "apps-manifest.json"
$assetsDir = Join-Path $PortalRoot "assets"
$iconsDir = Join-Path $assetsDir "icons"
$iconRel = "icons/$AppId.png"
$destPath = Join-Path $iconsDir "$AppId.png"

if (-not (Test-Path $manifestPath)) {
    if (-not $Quiet) { Write-Warning "Missing apps-manifest.json — skipping icon sync for $AppId" }
    return
}

$manifest = Read-Json $manifestPath
$app = $manifest.apps | Where-Object { $_.id -eq $AppId } | Select-Object -First 1
if (-not $app) {
    if (-not $Quiet) { Write-Warning "App '$AppId' not in manifest — skipping icon sync" }
    return
}

if (-not $Kind) { $Kind = if ($app.kind) { [string]$app.kind } else { "mobile" } }
if (-not $SourceRoot) {
    if ($app.mobileRoot) { $SourceRoot = [string]$app.mobileRoot }
    elseif ($app.repoPath) { $SourceRoot = [string]$app.repoPath }
}
if (-not $ProjectPath -and $app.projectPath) { $ProjectPath = [string]$app.projectPath }

$SourceRoot = Resolve-RepoPath $dataDir $SourceRoot
$ProjectPath = Resolve-RepoPath $dataDir $ProjectPath

$sourceIcon = Find-AppIconSource -SourceRoot $SourceRoot -Kind $Kind -ProjectPath $ProjectPath
if (-not $sourceIcon) {
    if (-not $Quiet) {
        Write-Warning "No icon found for $AppId under $SourceRoot (kind=$Kind)"
    }
    return
}

Save-PortalIcon -SourcePath $sourceIcon -DestPath $destPath
Write-IconLog "Synced portal icon for $AppId from $sourceIcon -> $destPath"

$updated = $false
foreach ($entry in $manifest.apps) {
    if ($entry.id -eq $AppId) {
        if ($entry.icon -ne $iconRel) {
            $entry.icon = $iconRel
            $updated = $true
        }
        break
    }
}
if ($updated) {
    Write-JsonFile $manifestPath $manifest
    Write-IconLog "Updated apps-manifest.json icon for $AppId -> $iconRel"
}
