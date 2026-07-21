# Builds portal-data.js, search-index.js, and section HTML shells from portal/data/*.json
param(
    [string]$PortalRoot = "",
    [switch]$SkipAppSync
)

$ErrorActionPreference = "Stop"
if (-not $PortalRoot) {
    $scriptDir = $PSScriptRoot
    if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
    $PortalRoot = Split-Path $scriptDir -Parent
}
$utf8 = [System.Text.UTF8Encoding]::new($false)
$dataDir = Join-Path $PortalRoot "data"
$sectionsDir = Join-Path $PortalRoot "sections"
$jsDir = Join-Path $PortalRoot "js"
$downloadsDir = Join-Path $PortalRoot "downloads"

$dataExclude = @("portal-settings.json", "nav.json", "apps-manifest.json")

function Read-Json([string]$path) {
    $text = [System.IO.File]::ReadAllText($path, $utf8)
    return $text | ConvertFrom-Json
}

function Write-JsonFile([string]$path, $obj) {
    $json = $obj | ConvertTo-Json -Depth 30 -Compress:$false
    [IO.File]::WriteAllText($path, $json, $utf8)
}

function Escape-JsString([string]$s) {
    if ($null -eq $s) { return "" }
    return ($s -replace '\\', '\\\\' -replace '"', '\"' -replace "`r", '' -replace "`n", '\n')
}

function Resolve-RepoPath([string]$baseDir, [string]$path) {
    if ([System.IO.Path]::IsPathRooted($path)) { return $path }
    return [System.IO.Path]::GetFullPath((Join-Path $baseDir $path))
}

function Parse-ReadmeContent([string]$readmeText) {
    $lines = $readmeText -split "`r?`n"
    $summary = ""
    $bodyLines = [System.Collections.Generic.List[string]]::new()
    $inDescription = $false
    $descriptionLines = [System.Collections.Generic.List[string]]::new()
    $skippedTitle = $false

    foreach ($line in $lines) {
        if (-not $skippedTitle -and $line -match '^\s*#\s+') {
            $skippedTitle = $true
            continue
        }
        if ($line -match '^\s*##\s+Description\s*$') {
            $inDescription = $true
            continue
        }
        if ($inDescription -and $line -match '^\s*##\s+') {
            $inDescription = $false
        }
        if ($inDescription) {
            $descriptionLines.Add($line)
        }
    }

    if ($descriptionLines.Count -gt 0) {
        $summary = ($descriptionLines | Where-Object { $_.Trim() -ne "" } | Select-Object -First 1).Trim()
        foreach ($l in $descriptionLines) { $bodyLines.Add($l) }
    } else {
        $paragraph = [System.Collections.Generic.List[string]]::new()
        $started = $false
        foreach ($line in $lines) {
            if (-not $skippedTitle -and $line -match '^\s*#\s+') { continue }
            if ($line -match '^\s*##\s+') {
                if ($started) { break }
                continue
            }
            if ($line.Trim() -eq "") {
                if ($paragraph.Count -gt 0) {
                    if (-not $summary) { $summary = ($paragraph -join " ").Trim() }
                    $bodyLines.Add(($paragraph -join " "))
                    $paragraph.Clear()
                    $started = $true
                }
                continue
            }
            if (-not $started -or $paragraph.Count -ge 0) {
                $paragraph.Add($line.Trim())
            }
        }
        if ($paragraph.Count -gt 0 -and -not $summary) {
            $summary = ($paragraph -join " ").Trim()
            $bodyLines.Add(($paragraph -join " "))
        }
    }

    if (-not $summary) { $summary = "Mobile app from The Foxs Den hub." }

    $blocks = @()
    $blockId = 0
    $current = [System.Collections.Generic.List[string]]::new()
    foreach ($line in $bodyLines) {
        if ($line.Trim() -eq "") {
            if ($current.Count -gt 0) {
                $blockId++
                $blocks += @{
                    id = "readme-$blockId"
                    heading = if ($blockId -eq 1) { "About" } else { $null }
                    content = ($current -join " ").Trim()
                    bullets = @()
                }
                $current.Clear()
            }
            continue
        }
        if ($line -match "^\s*[-*]\s+(.+)$") {
            if ($current.Count -gt 0) {
                $blockId++
                $blocks += @{
                    id = "readme-$blockId"
                    heading = if ($blockId -eq 1) { "About" } else { $null }
                    content = ($current -join " ").Trim()
                    bullets = @()
                }
                $current.Clear()
            }
            $blockId++
            $blocks += @{
                id = "readme-$blockId"
                heading = $null
                content = $null
                bullets = @($Matches[1].Trim())
            }
            continue
        }
        $current.Add($line.Trim())
    }
    if ($current.Count -gt 0) {
        $blockId++
        $blocks += @{
            id = "readme-$blockId"
            heading = if ($blocks.Count -eq 0) { "About" } else { $null }
            content = ($current -join " ").Trim()
            bullets = @()
        }
    }
    if ($blocks.Count -eq 0) {
        $blocks += @{
            id = "readme-1"
            heading = "About"
            content = $summary
            bullets = @()
        }
    }

    return @{ Summary = $summary; Blocks = $blocks }
}

function Sync-AppsFromManifest {
    param(
        [string]$DataDir,
        [string]$DownloadsDir,
        [string]$PagesBaseUrl
    )

    $manifestPath = Join-Path $DataDir "apps-manifest.json"
    if (-not (Test-Path $manifestPath)) {
        Write-Warning "No apps-manifest.json - skipping app sync."
        return
    }

    $manifest = Read-Json $manifestPath
    $navItems = [System.Collections.Generic.List[object]]::new()
    $num = 0
    $base = $PagesBaseUrl.TrimEnd('/')

    foreach ($app in $manifest.apps) {
        $num++
        $id = $app.id
        $repoPath = Resolve-RepoPath $DataDir $app.repoPath
        $readmeRel = if ($app.readme) { $app.readme } else { "README.md" }
        $readmePath = Join-Path $repoPath $readmeRel

        $parsed = @{ Summary = $app.title; Blocks = @(@{
            id = "about"; heading = "About"; content = "Details coming soon."; bullets = @()
        }) }
        if (Test-Path $readmePath) {
            $readmeText = [IO.File]::ReadAllText($readmePath, $utf8)
            $parsed = Parse-ReadmeContent $readmeText
        } else {
            Write-Warning "README not found for $id at $readmePath"
        }

        $apkFileName = $app.apkFileName
        if (-not $apkFileName) { $apkFileName = "$id.apk" }

        $versionName = $null
        $buildNumber = $null
        $releaseNotes = $null
        $apkUrl = "$base/downloads/$apkFileName"
        $updateCheckUrl = "$base/downloads/$id/mobile-version.json"

        $versionPath = Join-Path $DownloadsDir "$id/mobile-version.json"
        if (Test-Path $versionPath) {
            $ver = Read-Json $versionPath
            $versionName = $ver.version
            $buildNumber = $ver.build
            $releaseNotes = $ver.releaseNotes
            if ($ver.apkUrl) { $apkUrl = $ver.apkUrl }
        }

        $apkPath = Join-Path $DownloadsDir $apkFileName
        $hasApk = Test-Path $apkPath
        if (-not $hasApk) {
            Write-Warning "APK missing for $id at $apkPath (run publish-app-mobile.ps1)"
        }

        $available = $true
        if ($null -ne $app.available) { $available = [bool]$app.available }
        if (-not $hasApk -and -not $app.allowWithoutApk) { $available = $false }

        $section = [ordered]@{
            id = $id
            title = $app.title
            status = if ($app.status) { $app.status } else { "live" }
            tags = @($app.tags)
            searchKeywords = @()
            summary = if ($app.summaryOverride) { $app.summaryOverride } else { $parsed.Summary }
            blocks = $parsed.Blocks
            sidebarNote = if ($hasApk) { "Official APK is hosted on GitHub Pages." } else { "APK not published yet." }
            version = $versionName
            build = $buildNumber
            releaseNotes = $releaseNotes
            updateCheckUrl = $updateCheckUrl
            apk = @{
                downloadUrl = $apkUrl
                fileName = $apkFileName
                label = "Download APK"
            }
        }

        Write-JsonFile (Join-Path $DataDir "$id.json") $section

        $navItems.Add([ordered]@{
            id = $id
            num = $num
            file = "$id.html"
            label = $app.title
            available = $available
        })
    }

    Write-JsonFile (Join-Path $DataDir "nav.json") @{ items = $navItems.ToArray() }
    Write-Host "Synced $($navItems.Count) app(s) from apps-manifest.json"
}

function Get-SearchText($doc) {
    $parts = [System.Collections.Generic.List[string]]::new()
    if ($doc.title) { $parts.Add($doc.title) }
    if ($doc.summary) { $parts.Add($doc.summary) }
    if ($doc.searchKeywords) { foreach ($k in $doc.searchKeywords) { $parts.Add($k) } }
    if ($doc.tags) { foreach ($t in $doc.tags) { $parts.Add($t) } }
    if ($doc.version) { $parts.Add($doc.version) }
    if ($doc.blocks) {
        foreach ($b in $doc.blocks) {
            if ($b.heading) { $parts.Add($b.heading) }
            if ($b.content) { $parts.Add($b.content) }
            if ($b.bullets) { foreach ($x in $b.bullets) { $parts.Add($x) } }
        }
    }
    return ($parts -join ' ')
}

# Load settings
$settings = Read-Json (Join-Path $dataDir "portal-settings.json")
$pagesBaseUrl = $settings.pagesBaseUrl
if (-not $pagesBaseUrl) {
    $pagesBaseUrl = "https://marcell0805.github.io/the-foxs-den-doc"
    Write-Warning "portal-settings.json missing pagesBaseUrl - using default $pagesBaseUrl"
}

if (-not $SkipAppSync) {
    Sync-AppsFromManifest -DataDir $dataDir -DownloadsDir $downloadsDir -PagesBaseUrl $pagesBaseUrl
}

$nav = Read-Json (Join-Path $dataDir "nav.json")

# Remove legacy section JSON not in nav
$navIds = @($nav.items | ForEach-Object { $_.id })
Get-ChildItem $dataDir -Filter "*.json" | ForEach-Object {
    if ($_.Name -in $dataExclude) { return }
    $doc = Read-Json $_.FullName
    if ($doc.id -and ($navIds -notcontains $doc.id)) {
        Remove-Item $_.FullName -Force
        Write-Host "Removed stale section data: $($_.Name)"
    }
}

$sections = @{}
$searchEntries = @()

Get-ChildItem $dataDir -Filter "*.json" | ForEach-Object {
    if ($_.Name -in $dataExclude) { return }
    $doc = Read-Json $_.FullName
    $id = $doc.id
    if (-not $id) { return }
    $sections[$id] = $doc

    $searchEntries += [ordered]@{
        id = $id
        title = $doc.title
        section = $doc.title
        url = "sections/$id.html"
        text = Get-SearchText $doc
        tags = @($doc.tags)
        status = $doc.status
    }

    if ($doc.blocks) {
        foreach ($b in $doc.blocks) {
            $blockId = if ($b.id) { "$id-$($b.id)" } else { "$id-block" }
            $blockText = @()
            if ($b.heading) { $blockText += $b.heading }
            if ($b.content) { $blockText += $b.content }
            if ($b.bullets) { $blockText += $b.bullets }
            $searchEntries += [ordered]@{
                id = $blockId
                title = if ($b.heading) { $b.heading } else { $doc.title }
                section = $doc.title
                url = "sections/$id.html#$($b.id)"
                text = ($blockText -join ' ')
                tags = @($doc.tags)
                status = $doc.status
            }
        }
    }
}

$sectionParts = @()
foreach ($key in ($sections.Keys | Sort-Object)) {
    $sectionJson = $sections[$key] | ConvertTo-Json -Depth 20 -Compress
    $sectionParts += "`"$key`":$sectionJson"
}
$sectionsJsObject = '{' + ($sectionParts -join ',') + '}'

$settingsJson = ($settings | ConvertTo-Json -Depth 20 -Compress)
$navJson = ($nav | ConvertTo-Json -Depth 20 -Compress)
$searchJson = ($searchEntries | ConvertTo-Json -Depth 10 -Compress)

$portalName = $settings.portalName
if (-not $portalName) { $portalName = "The Foxs Den - Apps" }

$portalDataJs = @"
window.DELTACORE_PORTAL = {
  settings: $settingsJson,
  nav: $navJson,
  sections: $sectionsJsObject
};
"@

$searchIndexJs = @"
window.DELTACORE_SEARCH_INDEX = $searchJson;
"@

[IO.File]::WriteAllText((Join-Path $jsDir "portal-data.js"), $portalDataJs, $utf8)
[IO.File]::WriteAllText((Join-Path $jsDir "search-index.js"), $searchIndexJs, $utf8)

$sectionTemplatePath = Join-Path $PSScriptRoot "section-shell.html"
$sectionTemplate = [IO.File]::ReadAllText($sectionTemplatePath, $utf8)
$sectionTemplate = $sectionTemplate -replace '\{\{PORTAL_NAME\}\}', ($portalName -replace '&', '&amp;')

foreach ($key in $sections.Keys) {
    $doc = $sections[$key]
    $html = $sectionTemplate -replace '\{\{ID\}\}', $doc.id -replace '\{\{TITLE\}\}', ($doc.title -replace '&', '&amp;')
    [IO.File]::WriteAllText((Join-Path $sectionsDir "$($doc.id).html"), $html, $utf8)
}

# Remove stale section HTML
Get-ChildItem $sectionsDir -Filter "*.html" | ForEach-Object {
    $sid = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
    if ($sections.Keys -notcontains $sid) {
        Remove-Item $_.FullName -Force
        Write-Host "Removed stale section HTML: $($_.Name)"
    }
}

Write-Host "Built portal-data.js ($($sections.Count) sections)"
Write-Host "Built search-index.js ($($searchEntries.Count) entries)"
Write-Host "Generated $($sections.Count) section HTML files"
