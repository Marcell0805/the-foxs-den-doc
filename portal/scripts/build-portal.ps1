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
$fixedNavIds = @("about")
# Fixed sections kept out of nav / Fuse, but still generated into portal-data + HTML
$hiddenSectionIds = @("my-huntress")

function Read-Json([string]$path) {
    $text = [System.IO.File]::ReadAllText($path, $utf8)
    return $text | ConvertFrom-Json
}

function Write-JsonFile([string]$path, $obj) {
    $json = $obj | ConvertTo-Json -Depth 30 -Compress:$false
    [IO.File]::WriteAllText($path, $json, $utf8)
}

function Resolve-RepoPath([string]$baseDir, [string]$path) {
    if ([System.IO.Path]::IsPathRooted($path)) { return $path }
    return [System.IO.Path]::GetFullPath((Join-Path $baseDir $path))
}

function Strip-MarkdownLight([string]$text) {
    if (-not $text) { return $text }
    $t = [string]$text
    $t = [regex]::Replace($t, '\[([^\]]+)\]\([^)]+\)', '$1')
    $t = [regex]::Replace($t, '\*\*([^*]+)\*\*', '$1')
    $t = [regex]::Replace($t, '`([^`]+)`', '$1')
    $t = [regex]::Replace($t, '^\s*#+\s*', '')
    return $t.Trim()
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
            if ($line -match '^\s*#\s+') { continue }
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

    if (-not $summary) { $summary = "Project from The Foxs Den hub." }

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
                    content = (Strip-MarkdownLight ($current -join " "))
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
                    content = (Strip-MarkdownLight ($current -join " "))
                    bullets = @()
                }
                $current.Clear()
            }
            $blockId++
            $blocks += @{
                id = "readme-$blockId"
                heading = $null
                content = $null
                bullets = @((Strip-MarkdownLight $Matches[1].Trim()))
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
            content = (Strip-MarkdownLight ($current -join " "))
            bullets = @()
        }
    }
    if ($blocks.Count -eq 0) {
        $blocks += @{
            id = "readme-1"
            heading = "About"
            content = (Strip-MarkdownLight $summary)
            bullets = @()
        }
    }

    $summary = Strip-MarkdownLight $summary
    return @{ Summary = $summary; Blocks = $blocks }
}

function Format-ApkSize([long]$Bytes) {
    if ($Bytes -lt 1KB) { return "$Bytes B" }
    if ($Bytes -lt 1MB) { return ("{0:N1} KB" -f ($Bytes / 1KB)) }
    if ($Bytes -lt 1GB) { return ("{0:N1} MB" -f ($Bytes / 1MB)) }
    return ("{0:N2} GB" -f ($Bytes / 1GB))
}

function Get-ChannelVersionInfo {
    param(
        [string]$DownloadsDir,
        [string]$AppId,
        [string]$ApkFileName,
        [string]$PagesBaseUrl,
        [ValidateSet('live', 'beta')]
        [string]$Channel
    )

    $base = $PagesBaseUrl.TrimEnd('/')
    $apkUrl = "$base/downloads/$ApkFileName"
    $updateCheckUrl = if ($Channel -eq 'beta') {
        "$base/downloads/$AppId/beta/mobile-version.json"
    } else {
        "$base/downloads/$AppId/mobile-version.json"
    }

    $versionPath = if ($Channel -eq 'beta') {
        Join-Path $DownloadsDir "$AppId/beta/mobile-version.json"
    } else {
        Join-Path $DownloadsDir "$AppId/mobile-version.json"
    }

    $versionName = $null
    $buildNumber = $null
    $releaseNotes = $null
    if (Test-Path $versionPath) {
        $ver = Read-Json $versionPath
        $versionName = $ver.version
        $buildNumber = $ver.build
        $releaseNotes = $ver.releaseNotes
        if ($ver.apkUrl) { $apkUrl = $ver.apkUrl }
    }

    $apkPath = Join-Path $DownloadsDir $ApkFileName
    $hasApk = Test-Path $apkPath
    $sizeBytes = $null
    $sizeLabel = $null
    if ($hasApk) {
        $sizeBytes = [long](Get-Item $apkPath).Length
        $sizeLabel = Format-ApkSize $sizeBytes
    }

    return @{
        apkUrl = $apkUrl
        updateCheckUrl = $updateCheckUrl
        version = $versionName
        build = $buildNumber
        releaseNotes = $releaseNotes
        hasApk = $hasApk
        apkPath = $apkPath
        fileName = $ApkFileName
        sizeBytes = $sizeBytes
        sizeLabel = $sizeLabel
    }
}

function Sync-AboutFromSettings {
    param(
        [string]$DataDir,
        $Settings
    )

    $aboutPath = Join-Path $DataDir "about.json"
    $blurb = if ($Settings.aboutBlurb) { $Settings.aboutBlurb } else {
        "I build personal websites and Android apps. Reach out if you want to try a build or collaborate."
    }
    $skillBullets = [System.Collections.Generic.List[string]]::new()
    if ($Settings.aboutSkills) {
        foreach ($s in @($Settings.aboutSkills)) {
            if ($s) { $skillBullets.Add([string]$s) }
        }
    }
    $email = if ($Settings.contact -and $Settings.contact.email) { $Settings.contact.email } else { "" }
    $github = if ($Settings.contact -and $Settings.contact.github) { $Settings.contact.github } else { "" }
    $linkedin = if ($Settings.contact -and $Settings.contact.linkedin) { $Settings.contact.linkedin } else { "" }

    $bullets = [System.Collections.Generic.List[string]]::new()
    if ($github) { $bullets.Add("GitHub: $github") }
    if ($linkedin) { $bullets.Add("LinkedIn: $linkedin") }

    $contactContent = if ($email) { "Email: $email" } else { "Contact details are listed below." }

    $searchKeywords = [System.Collections.Generic.List[string]]::new()
    foreach ($k in @("email", "github", "linkedin", "contact")) { $searchKeywords.Add($k) }
    foreach ($s in $skillBullets) { $searchKeywords.Add($s) }

    $about = [ordered]@{
        id = "about"
        title = "About"
        status = "live"
        kind = "about"
        tags = @("about", "contact")
        searchKeywords = $searchKeywords.ToArray()
        summary = "Who is behind The Fox's Den, and how to get in touch."
        sidebarNote = "Password gate stays on until the site is fully public."
        contact = @{
            email = $email
            github = $github
            linkedin = $linkedin
        }
        blocks = @(
            @{
                id = "intro"
                heading = "About me"
                content = $blurb
                bullets = $skillBullets.ToArray()
            },
            @{
                id = "contact"
                heading = "Contact"
                content = $contactContent
                bullets = $bullets.ToArray()
            }
        )
    }
    Write-JsonFile $aboutPath $about
}

function Sync-AppsFromManifest {
    param(
        [string]$DataDir,
        [string]$DownloadsDir,
        [string]$PagesBaseUrl,
        $Settings
    )

    $manifestPath = Join-Path $DataDir "apps-manifest.json"
    if (-not (Test-Path $manifestPath)) {
        Write-Warning "No apps-manifest.json - skipping app sync."
        return
    }

    Sync-AboutFromSettings -DataDir $DataDir -Settings $Settings

    $manifest = Read-Json $manifestPath
    $navItems = [System.Collections.Generic.List[object]]::new()
    $num = 0
    $base = $PagesBaseUrl.TrimEnd('/')

    foreach ($app in $manifest.apps) {
        $visible = $true
        if ($null -ne $app.visible) { $visible = [bool]$app.visible }
        if (-not $visible) {
            Write-Host "Skipping hidden app: $($app.id)"
            continue
        }

        $num++
        $id = $app.id
        $kind = if ($app.kind) { $app.kind } else { "mobile" }
        $repoPath = ""
        if ($app.repoPath) {
            $repoPath = Resolve-RepoPath $DataDir $app.repoPath
        } elseif ($app.mobileRoot) {
            $repoPath = Resolve-RepoPath $DataDir $app.mobileRoot
        }
        $readmeRel = if ($app.readme) { $app.readme } else { "README.md" }
        $readmePath = if ($repoPath) { Join-Path $repoPath $readmeRel } else { "" }

        $parsed = @{ Summary = $app.title; Blocks = @(@{
            id = "about"; heading = "About"; content = "Details coming soon."; bullets = @()
        }) }
        if ($readmePath -and (Test-Path $readmePath)) {
            $readmeText = [IO.File]::ReadAllText($readmePath, $utf8)
            $parsed = Parse-ReadmeContent $readmeText
        } elseif (($kind -eq 'website' -or $kind -eq 'tool') -and $app.note) {
            $parsed = @{
                Summary = if ($app.summaryOverride) { $app.summaryOverride } else { $app.note }
                Blocks = @(@{
                    id = "about"
                    heading = "About"
                    content = $app.note
                    bullets = @()
                })
            }
        } elseif ($readmePath) {
            Write-Warning "README not found for $id at $readmePath"
        }

        if ($app.summaryOverride) {
            $parsed.Summary = [string]$app.summaryOverride
        }

        $apkFileName = $app.apkFileName
        if (-not $apkFileName) { $apkFileName = "$id.apk" }

        $packageFileName = if ($app.packageFileName) { $app.packageFileName } else { "$id-win-x64.zip" }
        $packagePath = Join-Path $DownloadsDir $packageFileName
        $hasPackage = Test-Path $packagePath
        $toolVersionPath = Join-Path $DownloadsDir "$id/tool-version.json"
        $toolVersion = $null
        $toolBuild = $null
        $toolNotes = $null
        $toolSizeBytes = $null
        $toolSizeLabel = $null
        $toolPublishedAt = $null
        if ($kind -eq 'tool' -and (Test-Path $toolVersionPath)) {
            $tv = Read-Json $toolVersionPath
            $toolVersion = $tv.version
            $toolBuild = $tv.build
            $toolNotes = $tv.releaseNotes
            $toolSizeBytes = $tv.sizeBytes
            $toolSizeLabel = $tv.sizeLabel
            $toolPublishedAt = $tv.publishedAt
            if ($tv.packageUrl) { }
        }
        if ($hasPackage -and -not $toolSizeBytes) {
            $toolSizeBytes = [long](Get-Item $packagePath).Length
            $toolSizeLabel = Format-ApkSize $toolSizeBytes
        }

        $live = Get-ChannelVersionInfo -DownloadsDir $DownloadsDir -AppId $id -ApkFileName $apkFileName -PagesBaseUrl $base -Channel live
        if (-not $live.hasApk -and $kind -eq 'mobile') {
            Write-Warning "APK missing for $id at $($live.apkPath) (run publish-app-mobile.ps1)"
        }
        if ($kind -eq 'tool' -and -not $hasPackage) {
            Write-Warning "Tool package missing for $id at $packagePath (run publish-app-tool.ps1)"
        }

        $available = $true
        if ($null -ne $app.available) { $available = [bool]$app.available }
        $allowWithoutApk = [bool]$app.allowWithoutApk -or ($kind -eq 'website')
        if ($kind -eq 'mobile' -and -not $live.hasApk -and -not $allowWithoutApk) { $available = $false }
        if ($kind -eq 'website' -and -not $app.externalUrl) { $available = $false }
        if ($kind -eq 'tool' -and -not $hasPackage) { $available = $false }

        $websiteNote = if ($app.note) { [string]$app.note } else { "Website project." }
        $toolNote = if ($app.note) { [string]$app.note } elseif ($toolNotes) { [string]$toolNotes } else { "Windows tool package." }
        $publishedAt = if ($app.publishedAt) { [string]$app.publishedAt } elseif ($toolPublishedAt) { [string]$toolPublishedAt } else { $null }

        $section = [ordered]@{
            id = $id
            title = $app.title
            status = if ($app.status) { $app.status } else { "live" }
            kind = $kind
            tags = @($app.tags)
            searchKeywords = @()
            summary = if ($app.summaryOverride) { $app.summaryOverride } else { $parsed.Summary }
            blocks = $parsed.Blocks
            sidebarNote = if ($kind -eq 'website') {
                $websiteNote
            } elseif ($kind -eq 'tool') {
                if ($hasPackage) { "Download the zip, extract, and run." } else { "Package not published yet." }
            } elseif ($live.hasApk) {
                "Official APK is hosted on GitHub Pages."
            } else {
                "APK not published yet."
            }
            version = if ($kind -eq 'tool') { $toolVersion } else { $live.version }
            build = if ($kind -eq 'tool') { $toolBuild } else { $live.build }
            releaseNotes = if ($kind -eq 'website') { $websiteNote } elseif ($kind -eq 'tool') { $toolNote } else { $live.releaseNotes }
            updateCheckUrl = if ($kind -eq 'tool') { "$base/downloads/$id/tool-version.json" } else { $live.updateCheckUrl }
        }

        if ($kind -eq 'website') {
            if ($app.externalUrl) {
                $section.externalUrl = $app.externalUrl
            }
            if ($publishedAt) {
                $section.publishedAt = $publishedAt
            }
            $section.note = $websiteNote
        } elseif ($kind -eq 'tool') {
            $section.package = @{
                downloadUrl = "$base/downloads/$packageFileName"
                fileName = $packageFileName
                label = "Download zip"
                channel = "tool"
                version = $toolVersion
                build = $toolBuild
                sizeBytes = $toolSizeBytes
                sizeLabel = $toolSizeLabel
                available = $hasPackage
            }
            if ($publishedAt) { $section.publishedAt = $publishedAt }
            $section.note = $toolNote
        } else {
            $section.apk = @{
                downloadUrl = $live.apkUrl
                fileName = $apkFileName
                label = "Download Live APK"
                channel = "live"
                version = $live.version
                build = $live.build
                sizeBytes = $live.sizeBytes
                sizeLabel = $live.sizeLabel
            }
        }

        if ($app.beta -and $kind -eq 'mobile') {
            $betaFile = if ($app.beta.apkFileName) { $app.beta.apkFileName } else { "$id-beta.apk" }
            $beta = Get-ChannelVersionInfo -DownloadsDir $DownloadsDir -AppId $id -ApkFileName $betaFile -PagesBaseUrl $base -Channel beta
            if ($beta.hasApk -or $app.beta) {
                $section.apkBeta = @{
                    downloadUrl = $beta.apkUrl
                    fileName = $betaFile
                    label = "Download Beta APK"
                    channel = "beta"
                    version = $beta.version
                    build = $beta.build
                    releaseNotes = $beta.releaseNotes
                    updateCheckUrl = $beta.updateCheckUrl
                    available = $beta.hasApk
                    sizeBytes = $beta.sizeBytes
                    sizeLabel = $beta.sizeLabel
                }
            }
            if (-not $beta.hasApk) {
                Write-Warning "Beta APK missing for $id at $($beta.apkPath) (optional; publish with -Channel beta)"
            }
        }

        Write-JsonFile (Join-Path $DataDir "$id.json") $section

        $navItems.Add([ordered]@{
            id = $id
            num = $num
            file = "$id.html"
            label = $app.title
            available = $available
            kind = $kind
            status = $section.status
        })
    }

    # Append fixed About after apps
    $aboutNum = $num + 1
    $navItems.Add([ordered]@{
        id = "about"
        num = $aboutNum
        file = "about.html"
        label = "About"
        available = $true
        kind = "about"
        status = "live"
    })

    Write-JsonFile (Join-Path $DataDir "nav.json") @{ items = $navItems.ToArray() }
    Write-Host "Synced $($navItems.Count) nav item(s) (apps + About) from apps-manifest.json"
}

  function Get-SearchText($doc) {
    $parts = [System.Collections.Generic.List[string]]::new()
    if ($doc.title) { $parts.Add($doc.title) }
    if ($doc.summary) { $parts.Add($doc.summary) }
    if ($doc.note) { $parts.Add($doc.note) }
    if ($doc.publishedAt) { $parts.Add($doc.publishedAt) }
    if ($doc.externalUrl) { $parts.Add($doc.externalUrl) }
    if ($doc.package -and $doc.package.fileName) { $parts.Add($doc.package.fileName) }
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
    Sync-AppsFromManifest -DataDir $dataDir -DownloadsDir $downloadsDir -PagesBaseUrl $pagesBaseUrl -Settings $settings
}

$nav = Read-Json (Join-Path $dataDir "nav.json")

# Remove legacy section JSON not in nav (keep about + hidden dedications)
$navIds = @($nav.items | ForEach-Object { $_.id })
$keepSectionIds = @($fixedNavIds) + @($hiddenSectionIds)
Get-ChildItem $dataDir -Filter "*.json" | ForEach-Object {
    if ($_.Name -in $dataExclude) { return }
    $doc = Read-Json $_.FullName
    if ($doc.id -and ($navIds -notcontains $doc.id) -and ($keepSectionIds -notcontains $doc.id)) {
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

    # Hidden dedications stay in portal-data / HTML but never in Fuse
    if ($hiddenSectionIds -contains $id -or $doc.hidden) { return }

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
if (-not $portalName) { $portalName = "The Foxs Den" }

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

# Cache-bust data scripts so GitHub Pages / browsers don't keep showing stale "coming soon" nav.
$portalDataBytes = [IO.File]::ReadAllBytes((Join-Path $jsDir "portal-data.js"))
$searchBytes = [IO.File]::ReadAllBytes((Join-Path $jsDir "search-index.js"))
$sha = [System.Security.Cryptography.SHA256]::Create()
try {
    $hashBytes = $sha.ComputeHash($portalDataBytes + $searchBytes)
} finally {
    $sha.Dispose()
}
$cacheBust = ([BitConverter]::ToString($hashBytes) -replace '-', '').Substring(0, 12).ToLowerInvariant()

$sectionTemplatePath = Join-Path $PSScriptRoot "section-shell.html"
$sectionTemplate = [IO.File]::ReadAllText($sectionTemplatePath, $utf8)
$sectionTemplate = $sectionTemplate -replace '\{\{PORTAL_NAME\}\}', ($portalName -replace '&', '&amp;')
$sectionTemplate = $sectionTemplate -replace 'portal-data\.js(\?v=[^"]*)?', "portal-data.js?v=$cacheBust"
$sectionTemplate = $sectionTemplate -replace 'search-index\.js(\?v=[^"]*)?', "search-index.js?v=$cacheBust"

foreach ($key in $sections.Keys) {
    $doc = $sections[$key]
    $html = $sectionTemplate -replace '\{\{ID\}\}', $doc.id -replace '\{\{TITLE\}\}', ($doc.title -replace '&', '&amp;')
    [IO.File]::WriteAllText((Join-Path $sectionsDir "$($doc.id).html"), $html, $utf8)
}

# Keep index.html in sync with the same cache buster
$indexPath = Join-Path $PortalRoot "index.html"
if (Test-Path $indexPath) {
    $indexHtml = [IO.File]::ReadAllText($indexPath, $utf8)
    $indexHtml = $indexHtml -replace 'portal-data\.js(\?v=[^"]*)?', "portal-data.js?v=$cacheBust"
    $indexHtml = $indexHtml -replace 'search-index\.js(\?v=[^"]*)?', "search-index.js?v=$cacheBust"
    [IO.File]::WriteAllText($indexPath, $indexHtml, $utf8)
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
Write-Host "Cache-bust query: v=$cacheBust"
Write-Host "Generated $($sections.Count) section HTML files"
