(function () {
  'use strict';

  function labsHomeUrl() {
    var host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '')
      return 'http://localhost:5297/';
    return 'https://foxbytelabs.co.za/';
  }

  function esc(t) {
    var d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  function statusLabel(status) {
    if (status === 'live') return 'Live';
    if (status === 'beta') return 'Beta';
    if (status === 'in_progress') return 'In Development';
    if (status === 'archived') return 'Archived';
    return 'Planned';
  }

  function statusBadge(status) {
    if (status === 'live') return '<span class="status-badge status-live">Live</span>';
    if (status === 'beta') return '<span class="status-badge status-beta">Beta</span>';
    if (status === 'in_progress') return '<span class="status-badge status-progress">In Development</span>';
    if (status === 'archived') return '<span class="status-badge status-archived">Archived</span>';
    return '<span class="status-badge status-planned">Planned</span>';
  }

  function assetsPrefix() {
    var scope = document.body.getAttribute('data-nav-scope') || 'landing';
    return scope === 'section' ? '../assets/' : 'assets/';
  }

  function foxLockQuery() {
    var s = window.DELTACORE_PORTAL && window.DELTACORE_PORTAL.settings;
    return s && s.assetVersion ? '?v=' + s.assetVersion : '';
  }

  function foxLockSlotHtml(codeProtected) {
    if (codeProtected) return foxLockHtml(false);
    return '<span class="fox-lock-slot" aria-hidden="true"></span>';
  }

  function foxLockHtml(modal) {
    // Larger source scaled down keeps the sidebar/landing lock sharp.
    var file = 'fox-lock-64.png';
    var px = modal ? '64' : '24';
    var cls = 'fox-lock' + (modal ? ' fox-lock--modal' : '');
    return '<img class="' + cls + '" src="' + esc(assetsPrefix() + file + foxLockQuery()) + '" alt="Code required" title="Code required" width="' + px + '" height="' + px + '" decoding="async">';
  }

  function appIconHtml(icon, label) {
    var src = assetsPrefix() + (icon || 'logo.png');
    return '<img class="app-icon" src="' + esc(src) + '" alt="" width="48" height="48" loading="lazy"' +
      (label ? ' title="' + esc(label) + '"' : '') + '>';
  }

  function productIconHtml(icon, label) {
    var src = assetsPrefix() + (icon || 'logo.png');
    return '<img class="product-icon" src="' + esc(src) + '" alt="" width="72" height="72" loading="lazy"' +
      (label ? ' title="' + esc(label) + '"' : '') + '>';
  }

  function formatSizeLabel(apk) {
    if (!apk) return '';
    if (apk.sizeLabel) return String(apk.sizeLabel);
    if (apk.sizeBytes != null && apk.sizeBytes !== '') {
      var n = Number(apk.sizeBytes);
      if (!isNaN(n) && n > 0) {
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
        return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      }
    }
    return '';
  }

  function defaultPlatform(section) {
    if (section.platform) return section.platform;
    if (section.kind === 'website') return 'Website';
    if (section.kind === 'tool') return 'Windows';
    if (section.kind === 'addon') return 'Chrome';
    return 'Android';
  }

  function kindLabel(section) {
    if (section.kind === 'website') return 'Website';
    if (section.kind === 'tool') return 'Desktop tool';
    if (section.kind === 'addon') return 'Browser add-on';
    if (section.kind === 'mobile') return 'Mobile App';
    return 'Project';
  }

  function getSettings() {
    return (window.DELTACORE_PORTAL && DELTACORE_PORTAL.settings) || {};
  }

  function isAboutVisible() {
    return getSettings().showAbout !== false;
  }

  function getNav() {
    return (window.DELTACORE_PORTAL && DELTACORE_PORTAL.nav && DELTACORE_PORTAL.nav.items) || [];
  }

  function getSection(id) {
    return window.DELTACORE_PORTAL && DELTACORE_PORTAL.sections && DELTACORE_PORTAL.sections[id];
  }

  var SVG_BACK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>';
  var SVG_HOME = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
  var SVG_PRINT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
  var SVG_SEARCH = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
  var SVG_MENU = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';

  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
  }

  function toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
  }

  function isDedicationPage() {
    return document.body.getAttribute('data-section-id') === 'my-huntress';
  }

  function isQuestPage() {
    return document.body.getAttribute('data-section-id') === 'berg-awaits';
  }

  function isUnindexedPage() {
    return document.body.getAttribute('data-section-id') === 'unindexed';
  }

  function isSecretExperiencePage() {
    return isDedicationPage() || isQuestPage() || isUnindexedPage();
  }

  function renderToolbar() {
    var mount = document.getElementById('portal-toolbar');
    if (!mount) return;
    var scope = document.body.getAttribute('data-nav-scope') || 'landing';
    var secret = isSecretExperiencePage();
    var assetPrefix = scope === 'section' ? '../' : '';
    var backHref = scope === 'section' ? '../index.html' : 'index.html';
    var homeHref = scope === 'section' ? '../index.html' : 'index.html';
    var backTitle = scope === 'section' ? 'Back to The Den home' : 'The Den home';
    var labsUrl = labsHomeUrl();
    var githubUrl = 'https://github.com/Marcell0805';
    var menuBtn = scope === 'section' && !secret
      ? '<button type="button" class="toolbar-btn toolbar-menu" id="toolbar-menu-btn" title="Menu" aria-label="Open menu">' + SVG_MENU + '</button>'
      : '';
    var brand =
      '<a class="toolbar-brand" href="' + homeHref + '" title="The Fox\'s Den">' +
        '<img class="toolbar-brand-logo" src="' + assetPrefix + 'assets/logo.png?v=denfox1" alt="" width="36" height="36" onerror="this.onerror=null;this.src=\'' + assetPrefix + 'assets/logo.svg\';">' +
        '<span class="toolbar-brand-text">' +
          '<span class="toolbar-brand-name">The Fox\'s Den</span>' +
          '<span class="toolbar-brand-kicker">Apps · Tools · Websites</span>' +
        '</span>' +
      '</a>';
    var ext = '<span class="toolbar-ext" aria-hidden="true">↗</span>';
    var links =
      '<nav class="toolbar-links" aria-label="Foxbyte Labs">' +
        '<a class="toolbar-link" href="' + labsUrl + '#enter" target="_blank" rel="noopener noreferrer">Destinations ' + ext + '</a>' +
        '<a class="toolbar-link" href="' + labsUrl + '#lab" target="_blank" rel="noopener noreferrer">Projects ' + ext + '</a>' +
        '<a class="toolbar-link" href="' + labsUrl + '#about" target="_blank" rel="noopener noreferrer">About ' + ext + '</a>' +
        '<a class="toolbar-link is-current" href="' + homeHref + '"' + (scope === 'landing' ? ' aria-current="page"' : '') + '>The Den</a>' +
        '<a class="toolbar-link" href="' + githubUrl + '" target="_blank" rel="noopener noreferrer">GitHub ' + ext + '</a>' +
      '</nav>';
    mount.outerHTML =
      '<header class="portal-toolbar no-print" aria-label="Page tools">' +
        '<div class="toolbar-inner">' +
          '<div class="toolbar-start">' +
            menuBtn +
            (scope === 'section'
              ? '<a href="' + backHref + '" class="toolbar-btn" title="' + backTitle + '" aria-label="' + backTitle + '">' + SVG_BACK + '</a>'
              : '') +
            brand +
          '</div>' +
          '<div class="toolbar-end">' +
            links +
            (secret ? '' : (scope === 'landing'
              ? '<button type="button" class="toolbar-search" id="toolbar-search-btn" title="Search (Ctrl+K)" aria-label="Search"><span class="toolbar-search-icon">' + SVG_SEARCH + '</span><span class="toolbar-search-label">Search projects…</span><kbd>Ctrl+K</kbd></button>'
              : '<button type="button" class="toolbar-btn" id="toolbar-search-btn" title="Search (Ctrl+K)" aria-label="Search">' + SVG_SEARCH + '</button>')) +
            (secret ? '' : '<button type="button" class="toolbar-btn toolbar-print" title="Print (Ctrl+P)" aria-label="Print">' + SVG_PRINT + '</button>') +
          '</div>' +
        '</div>' +
      '</header>';
    document.querySelectorAll('.toolbar-print').forEach(function (btn) {
      btn.addEventListener('click', function () { window.print(); });
    });
    var searchBtn = document.getElementById('toolbar-search-btn');
    if (searchBtn && window.DeltaCoreSearch) searchBtn.addEventListener('click', window.DeltaCoreSearch.open);
    var menu = document.getElementById('toolbar-menu-btn');
    if (menu) menu.addEventListener('click', toggleSidebar);
  }

  function ensureSidebarBackdrop() {
    if (document.querySelector('.sidebar-backdrop')) return;
    var backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop no-print';
    backdrop.addEventListener('click', closeSidebar);
    document.body.appendChild(backdrop);
  }

  function partitionNav() {
    var mobile = [];
    var websites = [];
    var tools = [];
    var addons = [];
    var about = [];
    var other = [];
    getNav().forEach(function (item) {
      if (item.kind === 'about') about.push(item);
      else if (item.kind === 'website') websites.push(item);
      else if (item.kind === 'tool') tools.push(item);
      else if (item.kind === 'addon') addons.push(item);
      else if (item.kind === 'mobile' || !item.kind) mobile.push(item);
      else other.push(item);
    });
    return { mobile: mobile, websites: websites, tools: tools, addons: addons, about: about, other: other };
  }

  function renderSidebarGroup(title, items, active, prefix) {
    if (!items.length) return '';
    var html = '<div class="sidebar-group">';
    if (title) html += '<h2 class="sidebar-group-title">' + esc(title) + '</h2>';
    html += '<ol>';
    items.forEach(function (item, i) {
      var label = (i + 1) + '. ' + item.label;
      var lock = foxLockSlotHtml(!!item.codeProtected);
      var badge = statusBadge(item.status || 'live');
      var icon = item.icon ? appIconHtml(item.icon, item.label) : '';
      if (item.id === active) {
        html += '<li class="active"><span class="sidebar-item-inner">' + icon + '<span class="sidebar-item-text">' + esc(label) + '</span>' + lock + badge + '</span></li>';
      } else if (item.available && item.file) {
        html += '<li><a href="' + prefix + item.file + '" class="sidebar-item-link"><span class="sidebar-item-inner">' + icon + '<span class="sidebar-item-text">' + esc(label) + '</span>' + lock + badge + '</span></a></li>';
      } else {
        html += '<li class="unavailable"><span class="sidebar-item-inner">' + icon + '<span class="sidebar-item-text">' + esc(label) + '</span>' + lock + badge + ' <em>(soon)</em></span></li>';
      }
    });
    html += '</ol></div>';
    return html;
  }

  function renderSidebarAbout(items, active, prefix) {
    if (!items.length) return '';
    var html = '<div class="sidebar-footer">';
    items.forEach(function (item) {
      var label = item.label || 'About';
      if (item.id === active) {
        html += '<div class="sidebar-footer-link active">' + esc(label) + '</div>';
      } else if (item.available && item.file) {
        html += '<a class="sidebar-footer-link" href="' + prefix + item.file + '">' + esc(label) + '</a>';
      } else {
        html += '<div class="sidebar-footer-link unavailable">' + esc(label) + '</div>';
      }
    });
    html += '</div>';
    return html;
  }

  function renderSidebar() {
    var aside = document.querySelector('[data-portal-sidebar]');
    if (!aside) return;
    if (isDedicationPage() || isUnindexedPage()) {
      aside.innerHTML = '';
      aside.hidden = true;
      return;
    }
    aside.hidden = false;
    ensureSidebarBackdrop();
    var active = document.body.getAttribute('data-section-id') || '';
    var scope = document.body.getAttribute('data-nav-scope') || 'section';
    var prefix = scope === 'section' ? '' : 'sections/';
    var groups = partitionNav();
    var html = '<div class="sidebar-scroll">';
    html += '<nav class="sidebar-nav">';
    html += renderSidebarGroup('Mobile apps', groups.mobile, active, prefix);
    html += renderSidebarGroup('Websites', groups.websites, active, prefix);
    html += renderSidebarGroup('Desktop tools', groups.tools, active, prefix);
    html += renderSidebarGroup('Browser add-ons', groups.addons, active, prefix);
    html += renderSidebarGroup('More', groups.other, active, prefix);
    html += '</nav>';
    var assetRoot = scope === 'section' ? '../' : '';
    html += '<figure class="den-aside-card"><img src="' + assetRoot + 'assets/small-ideas.png" alt="Small ideas build big places." width="240" height="140"></figure>';
    var section = getSection(active);
    if (section && section.sidebarNote) {
      html += '<div class="sidebar-note"><strong>Note</strong><p>' + esc(section.sidebarNote) + '</p></div>';
    }
    html += '</div>';
    if (isAboutVisible()) html += renderSidebarAbout(groups.about, active, prefix);
    aside.innerHTML = html;
    aside.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeSidebar);
    });
  }

  function linkifyContact(text) {
    var t = esc(text);
    t = t.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1">$1</a>');
    return t;
  }

  var ICO_ANDROID = '<svg class="meta-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.2 8.4 5.7 5.8a.7.7 0 0 1 1.2-.7l1.6 2.7A7.6 7.6 0 0 1 12 7c1.2 0 2.4.3 3.5.8l1.6-2.7a.7.7 0 1 1 1.2.7l-1.5 2.6A7 7 0 0 1 19 14v5a2 2 0 0 1-2 2h-1v-5H8v5H7a2 2 0 0 1-2-2v-5a7 7 0 0 1 2.2-5.6zM9 12.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>';
  var ICO_WINDOW = '<svg class="meta-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 9h18" stroke="currentColor" stroke-width="1.7"/></svg>';
  var ICO_GLOBE = '<svg class="meta-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 12h16M12 4c2.2 2.4 3.3 5.1 3.3 8S14.2 17.6 12 20c-2.2-2.4-3.3-5.1-3.3-8S9.8 6.4 12 4z" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
  var ICO_PUZZLE = '<svg class="meta-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 4h3a2 2 0 1 1 4 0h3v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 1-4 0H7v-3a2 2 0 1 0 0-4V4z"/></svg>';
  var ICO_LAYERS = '<svg class="meta-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M12 4 4 8l8 4 8-4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4"/></svg>';
  var ICO_SIZE = '<svg class="meta-ico" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="7" rx="7" ry="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path fill="none" stroke="currentColor" stroke-width="1.7" d="M5 7v10c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/></svg>';
  var ICO_DOWNLOAD = '<svg class="meta-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 4v10M8 10l4 4 4-4M5 19h14"/></svg>';
  var ICO_PLAY = '<svg class="meta-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 7.5v9l8-4.5-8-4.5z"/></svg>';
  var ICO_EXT = '<svg class="meta-ico meta-ico--sm" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M14 6h4v4M18 6l-8 8M10 6H7a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3"/></svg>';
  var ICO_CAL = '<svg class="meta-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M8 3.5v3M16 3.5v3M4 10h16"/></svg>';
  var ICO_FAQ = '<svg class="meta-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.7.3-1.2.9-1.2 1.6V14"/><circle cx="12" cy="17" r="0.8" fill="currentColor"/></svg>';
  var ICO_NOTE = '<svg class="meta-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M14 3.5V9h5.5M8.5 13h7M8.5 16.5h5"/></svg>';
  var ICO_BOOK = '<svg class="meta-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5z"/><path fill="none" stroke="currentColor" stroke-width="1.7" d="M5 5.5A2.5 2.5 0 0 1 7.5 8H19"/></svg>';

  function platformIcon(section) {
    var kind = section && section.kind;
    if (kind === 'website') return ICO_GLOBE;
    if (kind === 'tool') return ICO_WINDOW;
    if (kind === 'addon') return ICO_PUZZLE;
    return ICO_ANDROID;
  }

  function versionParts(section) {
    var ver = section.version || (section.apk && section.apk.version) || (section.package && section.package.version);
    var build = section.build != null && section.build !== '' ? section.build
      : (section.apk && section.apk.build != null ? section.apk.build : '');
    return { version: ver, build: build };
  }

  function sizeOf(section) {
    if (section.apk) return formatSizeLabel(section.apk);
    if (section.package) return formatSizeLabel(section.package);
    return '';
  }

  function renderMetaFacts(section) {
    var facts = [];
    facts.push({ icon: platformIcon(section), text: defaultPlatform(section) });
    var ver = versionParts(section);
    if (ver.version) {
      var label = 'v' + ver.version;
      if (ver.build !== '' && ver.build != null) label += '<small>(Build ' + esc(ver.build) + ')</small>';
      facts.push({ icon: ICO_LAYERS, html: label });
    }
    var size = sizeOf(section);
    if (size) facts.push({ icon: ICO_SIZE, text: size });
    if (!facts.length) return '';
    return '<ul class="meta-facts">' + facts.map(function (fact) {
      return '<li><span class="meta-facts-ico">' + fact.icon + '</span><span class="meta-facts-label">' +
        (fact.html || esc(fact.text)) + '</span></li>';
    }).join('') + '</ul>';
  }

  function renderDownloadChannel(apk, helpHref, sectionId, hideMeta) {
    if (!apk || !apk.downloadUrl) return '';
    var parts = [];
    if (!hideMeta) {
      if (apk.version) {
        var ver = 'v' + String(apk.version);
        if (apk.build != null && apk.build !== '') ver += ' (build ' + String(apk.build) + ')';
        parts.push(ver);
      }
      var sideSize = formatSizeLabel(apk);
      if (sideSize) parts.push(sideSize);
    }
    var meta = (!hideMeta && parts.length)
      ? '<span class="app-channel-meta">' + esc(parts.join(' · ')) + '</span>'
      : '';
    var disabled = apk.available === false;
    var btnClass = 'app-download-btn' + (apk.channel === 'beta' ? ' app-download-btn-beta' : '');
    var size = formatSizeLabel(apk);
    var inner = '<span class="btn-ico">' + ICO_DOWNLOAD + '</span><span class="btn-copy"><span class="btn-label">' +
      esc(apk.label || 'Download') + (disabled ? ' (not published)' : '') + '</span>' +
      (size ? '<span class="btn-sub">' + esc(size) + '</span>' : '') + '</span>';
    var link = disabled
      ? '<span class="' + btnClass + ' is-disabled" aria-disabled="true">' + inner + '</span>'
      : '<a href="' + esc(apk.downloadUrl) + '" class="' + btnClass + '" download' +
        (sectionId ? ' data-code-gate="' + esc(sectionId) + '"' : '') + '>' + inner + '</a>';
    return '<div class="app-channel app-action-block">' +
      link + meta +
      (helpHref ? '<a class="app-install-help" href="' + helpHref + '" target="_blank" rel="noopener">Install help ' + ICO_EXT + '</a>' : '') +
      '</div>';
  }

  function isSectionUnlocked(section) {
    if (!section || !section.codeProtected) return true;
    var unlock = section.unlock || {};
    var key = unlock.storageKey || ('the_fox_s_den_' + section.id + '_unlock');
    return sessionStorage.getItem(key) === '1';
  }

  function markSectionUnlocked(section) {
    var unlock = (section && section.unlock) || {};
    var key = unlock.storageKey || ('the_fox_s_den_' + (section && section.id) + '_unlock');
    sessionStorage.setItem(key, '1');
  }

  function promptCodeUnlock(section, onSuccess) {
    if (!section) { onSuccess(); return; }
    if (isSectionUnlocked(section)) { onSuccess(); return; }
    var unlock = section.unlock || {};
    var expected = String(unlock.code || '');
    var prompt = unlock.prompt || 'Enter the 4-digit code to continue';
    var hint = unlock.hint || '4-digit code';

    var existing = document.getElementById('code-gate');
    if (existing) existing.remove();

    var gate = document.createElement('div');
    gate.id = 'code-gate';
    gate.className = 'code-gate';
    gate.innerHTML =
      '<div class="code-gate-card" role="dialog" aria-modal="true" aria-labelledby="code-gate-title">' +
        '<div class="code-gate-brand">' + foxLockHtml(true) + '</div>' +
        '<h2 id="code-gate-title" class="code-gate-title">' + esc(section.title || 'Protected') + '</h2>' +
        '<p class="code-gate-prompt">' + esc(prompt) + '</p>' +
        '<form class="code-gate-form" id="code-gate-form">' +
          '<input type="text" id="code-gate-input" class="code-gate-input" inputmode="numeric" maxlength="4" pattern="\\d{4}" placeholder="' + esc(hint) + '" autocomplete="off" autofocus>' +
          '<p class="code-gate-error" id="code-gate-error" hidden>Incorrect code.</p>' +
          '<div class="code-gate-actions">' +
            '<button type="button" class="code-gate-cancel" id="code-gate-cancel">Cancel</button>' +
            '<button type="submit" class="code-gate-button">Unlock</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(gate);

    function close() { gate.remove(); }
    document.getElementById('code-gate-cancel').addEventListener('click', close);
    gate.addEventListener('click', function (e) { if (e.target === gate) close(); });
    document.getElementById('code-gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('code-gate-input');
      var error = document.getElementById('code-gate-error');
      if (String(input.value || '') === expected) {
        markSectionUnlocked(section);
        close();
        onSuccess();
      } else {
        error.hidden = false;
        input.value = '';
        input.focus();
      }
    });
  }

  function bindAboutFilter(mount) {
    var input = mount.querySelector('.about-faq-filter');
    if (!input) return;
    var items = mount.querySelectorAll('.about-filter-item');
    var empty = mount.querySelector('.about-filter-empty');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (el) {
        var hit = !q || (el.getAttribute('data-filter') || '').indexOf(q) !== -1;
        el.hidden = !hit;
        if (hit) shown += 1;
      });
      if (empty) empty.hidden = shown !== 0;
    });
  }

  function bindCodeGates(root, section) {
    if (!root || !section || !section.codeProtected) return;
    root.querySelectorAll('[data-code-gate]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (isSectionUnlocked(section)) return;
        e.preventDefault();
        var href = el.getAttribute('href');
        var target = el.getAttribute('target');
        promptCodeUnlock(section, function () {
          if (!href) return;
          if (target === '_blank') window.open(href, '_blank', 'noopener');
          else window.location.href = href;
        });
      });
    });
  }

  function whenAuthOk(fn) {
    if (document.documentElement.classList.contains('auth-ok')) {
      fn();
      return;
    }
    var obs = new MutationObserver(function () {
      if (document.documentElement.classList.contains('auth-ok')) {
        obs.disconnect();
        fn();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function createUnlockOverlay(withHeart) {
    var overlay = document.createElement('div');
    overlay.className = 'dedication-unlock';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML =
      '<div class="dedication-unlock-inner">' +
        '<p class="dedication-unlock-msg"></p>' +
        (withHeart ? '<div class="dedication-unlock-heart" hidden aria-hidden="true">♥</div>' : '') +
      '</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('dedication-revealing');
    return overlay;
  }

  function playTimedMessages(lines, opts, done) {
    opts = opts || {};
    if (prefersReducedMotion()) {
      done();
      return;
    }

    var perMsg = opts.perMsg != null ? opts.perMsg : 2000;
    var lastHold = opts.lastHold != null ? opts.lastHold : perMsg;
    var showHeartOnLast = !!opts.showHeartOnLast;
    var overlay = createUnlockOverlay(showHeartOnLast);
    var msg = overlay.querySelector('.dedication-unlock-msg');
    var heart = overlay.querySelector('.dedication-unlock-heart');

    function setMsg(text, showHeart) {
      msg.classList.remove('is-visible');
      if (heart) {
        heart.hidden = true;
        heart.classList.remove('is-visible');
      }
      window.setTimeout(function () {
        msg.textContent = text;
        msg.classList.add('is-visible');
        if (showHeart && heart) {
          heart.hidden = false;
          window.setTimeout(function () { heart.classList.add('is-visible'); }, 120);
        }
      }, 80);
    }

    var total = 0;
    lines.forEach(function (line, i) {
      var at = i * perMsg;
      var isLast = i === lines.length - 1;
      window.setTimeout(function () {
        setMsg(line, showHeartOnLast && isLast);
      }, at);
      if (isLast) total = at + lastHold;
    });

    window.setTimeout(function () {
      overlay.classList.add('is-leaving');
      window.setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        done();
      }, 700);
    }, total);
  }

  function portalAssetPrefix() {
    return document.body.getAttribute('data-nav-scope') === 'section' ? '../' : '';
  }

  function loadQuestModule(done) {
    var prefix = portalAssetPrefix();
    if (!document.getElementById('berg-awaits-css')) {
      var link = document.createElement('link');
      link.id = 'berg-awaits-css';
      link.rel = 'stylesheet';
      link.href = prefix + 'css/berg-awaits.css' + (foxLockQuery() ? foxLockQuery() + '&berg=18' : '?berg=18');
      document.head.appendChild(link);
    }
    if (window.BergAwaits) {
      done();
      return;
    }
    var existing = document.getElementById('berg-awaits-js');
    if (existing) {
      existing.addEventListener('load', done);
      return;
    }
    var script = document.createElement('script');
    script.id = 'berg-awaits-js';
    script.src = prefix + 'js/berg-awaits.js' + (foxLockQuery() ? foxLockQuery() + '&berg=18' : '?berg=18');
    script.onload = done;
    script.onerror = function () {
      done();
    };
    document.body.appendChild(script);
  }

  function bindQuestLeave() {
    function leave() {
      if (window.BergAwaits && typeof window.BergAwaits.destroy === 'function') {
        window.BergAwaits.destroy();
      }
    }
    document.querySelectorAll('.toolbar-brand, .toolbar-start a.toolbar-btn').forEach(function (el) {
      el.addEventListener('click', leave);
    });
  }

  function loadUnindexedModule(done) {
    var prefix = portalAssetPrefix();
    var q = foxLockQuery() ? foxLockQuery() + '&unindexed=8' : '?unindexed=8';
    var started = false;

    function startScripts() {
      if (started) return;
      started = true;
      loadChained();
    }

    function loadChained() {
      function loadRoom() {
        if (window.UnindexedRoom) {
          done();
          return;
        }
        var existing = document.getElementById('unindexed-js');
        if (existing) {
          existing.addEventListener('load', done);
          return;
        }
        var script = document.createElement('script');
        script.id = 'unindexed-js';
        script.src = prefix + 'js/unindexed.js' + q;
        script.onload = done;
        script.onerror = function () { done(); };
        document.body.appendChild(script);
      }

      if (window.UnindexedVerification) {
        loadRoom();
        return;
      }
      var verify = document.getElementById('unindexed-verify-js');
      if (verify) {
        verify.addEventListener('load', loadRoom);
        return;
      }
      var script = document.createElement('script');
      script.id = 'unindexed-verify-js';
      script.src = prefix + 'js/unindexed-verify.js' + q;
      script.onload = loadRoom;
      script.onerror = loadRoom;
      document.body.appendChild(script);
    }

    if (!document.getElementById('unindexed-css')) {
      var link = document.createElement('link');
      link.id = 'unindexed-css';
      link.rel = 'stylesheet';
      link.href = prefix + 'css/unindexed.css' + q;
      link.onload = startScripts;
      link.onerror = startScripts;
      document.head.appendChild(link);
      window.setTimeout(startScripts, 1500);
    } else {
      startScripts();
    }
  }

  function bindUnindexedLeave() {
    document.querySelectorAll('.toolbar-brand, .toolbar-start a.toolbar-btn').forEach(function (el) {
      el.addEventListener('click', function () {
        if (window.UnindexedRoom && typeof window.UnindexedRoom.destroy === 'function') {
          window.UnindexedRoom.destroy();
        }
      });
    });
  }

  function startUnindexed(mount, section) {
    var unlock = (section && section.unlock) || {};
    var lines = unlock.searchLines || ['UNINDEXED', 'A page the Den does not list.'];
    document.body.classList.add('unindexed-page');
    mount.innerHTML = '';
    playTimedMessages(lines, { perMsg: 1800, lastHold: 1600, showHeartOnLast: false }, function () {
      document.body.classList.remove('dedication-revealing');
      loadUnindexedModule(function () {
        if (window.UnindexedRoom && typeof window.UnindexedRoom.start === 'function') {
          window.UnindexedRoom.start(mount, section);
          bindUnindexedLeave();
        } else {
          mount.innerHTML = '<p>The Den could not open this page.</p>';
        }
      });
    });
  }

  function startBergQuest(mount, section) {
    var unlock = (section && section.unlock) || {};
    var lines = unlock.searchLines || ['SECRET QUEST DETECTED', 'THE BERG AWAITS'];
    document.body.classList.add('quest-page');
    mount.innerHTML = '';
    playTimedMessages(lines, { perMsg: 1800, lastHold: 1600, showHeartOnLast: false }, function () {
      document.body.classList.remove('dedication-revealing');
      loadQuestModule(function () {
        if (window.BergAwaits && typeof window.BergAwaits.start === 'function') {
          window.BergAwaits.start(mount, section);
          bindQuestLeave();
        } else {
          mount.innerHTML = '<p>The Berg could not be reached.</p>';
        }
      });
    });
  }

  function playDedicationUnlock(letter, section) {
    if (!letter) return;

    var unlock = (section && section.unlock) || {};
    var code = String(unlock.code || '0657');
    var storageKey = unlock.storageKey || 'the_fox_s_den_dedication_unlock';
    var prompt = unlock.prompt || 'The time the fox and huntress met on a quest and formed a bond that won\'t be broken…';
    var hint = unlock.hint || 'Four digits · MMdd';
    var successLines = unlock.successLines || [
      'The code to the hearts has been found…',
      'You are the one the heart has chosen.'
    ];
    var searchLines = unlock.searchLines || [
      'Searching…',
      'One hidden page found.',
      'Opening dedication…'
    ];
    var reduceMotion = prefersReducedMotion();

    function revealLetter() {
      letter.classList.remove('is-waiting');
      letter.classList.add('is-revealed');
      document.body.classList.remove('dedication-revealing');
    }

    function playSearchSequence(done) {
      playTimedMessages(searchLines, { perMsg: 2000, lastHold: 2000, showHeartOnLast: false }, done);
    }

    function playHeartSequence(done) {
      playTimedMessages(successLines, { perMsg: 2000, lastHold: 3000, showHeartOnLast: true }, done);
    }

    function showCodeGate() {
      letter.classList.add('is-waiting');
      document.body.classList.add('dedication-revealing');

      var gate = document.createElement('div');
      gate.className = 'dedication-code-gate';
      gate.innerHTML =
        '<div class="dedication-code-panel">' +
          '<p class="dedication-code-prompt">' + esc(prompt) + '</p>' +
          '<form class="dedication-code-form" autocomplete="off">' +
            '<label class="dedication-code-label" for="dedication-code-input">' + esc(hint) + '</label>' +
            '<input id="dedication-code-input" class="dedication-code-input" type="password" inputmode="numeric" ' +
              'pattern="[0-9]*" maxlength="4" placeholder="····" aria-label="Four digit code">' +
            '<p class="dedication-code-error" hidden>That isn\'t the day the quest began.</p>' +
            '<button type="submit" class="dedication-code-submit">Open</button>' +
          '</form>' +
        '</div>';
      document.body.appendChild(gate);

      var input = gate.querySelector('#dedication-code-input');
      var error = gate.querySelector('.dedication-code-error');
      var form = gate.querySelector('.dedication-code-form');

      window.setTimeout(function () { input.focus(); }, 50);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var entered = String(input.value || '').replace(/\D/g, '');
        if (entered === code) {
          try { sessionStorage.setItem(storageKey, '1'); } catch (err) { /* ignore */ }
          gate.classList.add('is-leaving');
          window.setTimeout(function () {
            if (gate.parentNode) gate.parentNode.removeChild(gate);
            playHeartSequence(revealLetter);
          }, reduceMotion ? 0 : 450);
        } else {
          error.hidden = false;
          input.value = '';
          input.focus();
        }
      });
    }

    whenAuthOk(function () {
      var already = false;
      try { already = sessionStorage.getItem(storageKey) === '1'; } catch (err) { already = false; }

      letter.classList.add('is-waiting');
      document.body.classList.add('dedication-revealing');

      playSearchSequence(function () {
        if (already) {
          revealLetter();
          return;
        }
        showCodeGate();
      });
    });
  }

  function renderDedication(section) {
    var html = '<article class="dedication-letter">';
    var markSrc = (section.mark && section.mark.src) || '../assets/cookbook-icon.png';
    var markAlt = (section.mark && section.mark.alt) || '';
    html += '<img class="dedication-mark" src="' + esc(markSrc) + '" alt="' + esc(markAlt) + '" width="64" height="64">';
    html += '<h1 class="dedication-title">' + esc(section.greeting || section.title || 'To My Huntress') + '</h1>';
    html += '<div class="dedication-body">';
    (section.paragraphs || []).forEach(function (p) {
      var text = String(p || '');
      var short = text.length < 48 && text.indexOf('.') === text.lastIndexOf('.');
      html += '<p' + (short ? ' class="dedication-emphasis"' : '') + '>' + esc(text) + '</p>';
    });
    html += '</div>';
    html += '<div class="dedication-flourish" aria-hidden="true"></div>';
    if (section.epilogue) {
      html += '<p class="dedication-epilogue">' + esc(section.epilogue) + '</p>';
    }
    html += '<footer class="dedication-closing">';
    html += '<p>' + esc(section.closing || 'With all my appreciation,') + '</p>';
    html += '<p class="dedication-signoff">' + esc(section.signoff || 'Your Fox') + '</p>';
    html += '</footer>';
    if (section.photo && section.photo.src) {
      html += '<figure class="dedication-photo">';
      html += '<img src="' + esc(section.photo.src) + '" alt="' + esc(section.photo.alt || section.photo.caption || '') + '" loading="lazy">';
      if (section.photo.caption) {
        html += '<figcaption>' + esc(section.photo.caption) + '</figcaption>';
      }
      html += '</figure>';
    }
    html += '</article>';
    return html;
  }

  function renderProductHeader(section) {
    return '<header class="product-header">' +
      productIconHtml(section.icon, section.title) +
      '<div class="product-header-text">' +
        '<p class="product-kind">' + esc(kindLabel(section)) + '</p>' +
        '<div class="product-title-row">' +
          '<h1>' + esc(section.title) + '</h1>' +
          statusBadge(section.status) +
        '</div>' +
        (section.summary ? '<p class="product-tagline">' + esc(section.summary) + '</p>' : '') +
      '</div>' +
    '</header>';
  }

  function renderProductMeta(section) {
    return renderMetaFacts(section);
  }

  function renderGooglePlayButton(section) {
    if (section.kind !== 'mobile') return '';
    var gate = section.codeProtected ? ' data-code-gate="' + esc(section.id) + '"' : '';
    var badge = '<img class="google-play-badge-img" src="' + esc(assetsPrefix() + 'google-play-badge.png') + '" alt="Get it on Google Play" width="180" height="70">';
    var inner;
    if (section.googlePlayUrl) {
      inner = '<a href="' + esc(section.googlePlayUrl) + '" class="google-play-badge" target="_blank" rel="noopener"' + gate + '>' + badge + '</a>';
    } else {
      inner = '<span class="google-play-badge is-disabled" aria-disabled="true" title="Google Play availability coming soon">' + badge + '</span>';
    }
    return '<div class="product-action-block product-action-block--play">' + inner + '</div>';
  }

  function installHelpHref(kind) {
    var scope = document.body.getAttribute('data-nav-scope') || 'landing';
    var prefix = scope === 'section' ? '../' : '';
    var id = kind === 'tool' ? 'windows' : (kind === 'addon' ? 'addon' : 'android');
    return prefix + 'install.html#' + id;
  }

  function renderProductActions(section) {
    var html = '<div class="product-actions">';
    var gateId = section.codeProtected ? section.id : null;
    if (section.kind === 'website' && section.externalUrl) {
      html += '<a href="' + esc(section.externalUrl) + '" class="app-download-btn" target="_blank" rel="noopener"' +
        (gateId ? ' data-code-gate="' + esc(gateId) + '"' : '') + '>Open site</a>';
    } else if (section.kind === 'tool') {
      var toolHelp = installHelpHref('tool');
      if (section.package) html += renderDownloadChannel(section.package, toolHelp, gateId, true);
      if (section.packageBeta) html += renderDownloadChannel(section.packageBeta, toolHelp, gateId, true);
    } else if (section.kind === 'addon') {
      if (section.storeUrl) {
        html += '<a href="' + esc(section.storeUrl) + '" class="app-download-btn" target="_blank" rel="noopener"' +
          (gateId ? ' data-code-gate="' + esc(gateId) + '"' : '') + '>Get on Chrome Web Store</a>';
      }
      var addonHelp = installHelpHref('addon');
      if (section.package) html += renderDownloadChannel(section.package, addonHelp, gateId, true);
      if (section.packageBeta) html += renderDownloadChannel(section.packageBeta, addonHelp, gateId, true);
      if (section.privacyUrl) {
        html += '<a href="' + esc(section.privacyUrl) + '" class="app-download-btn app-download-btn-secondary" target="_blank" rel="noopener">Privacy policy</a>';
      }
      html += '<p class="addon-install-hint">Prefer the Chrome Web Store when listed. Or <a href="' + esc(addonHelp) + '">read the install guide</a>.</p>';
    } else {
      var apkHelp = installHelpHref('mobile');
      if (section.apk) html += renderDownloadChannel(section.apk, apkHelp, gateId, true);
      if (section.apkBeta) html += renderDownloadChannel(section.apkBeta, apkHelp, gateId, true);
      html += renderGooglePlayButton(section);
    }
    html += '</div>';
    return html;
  }

  function renderWhatsNew(section) {
    var text = section.whatsNew || section.releaseNotes;
    if (!text) return '';
    var lines = String(text).split(/\r?\n/).filter(function (l) { return l.trim(); });
    var html = '<section class="whats-new"><div class="whats-new-head"><h2>What\'s New</h2></div>';
    if (lines.length <= 1) {
      html += '<p>' + esc(text) + '</p>';
    } else {
      html += '<ul>';
      lines.forEach(function (line) {
        var item = line.replace(/^[\s•\-]+/, '').trim();
        if (item) html += '<li>' + esc(item) + '</li>';
      });
      html += '</ul>';
    }
    html += '</section>';
    return html;
  }

  function renderFeatures(section) {
    var features = section.features || [];
    if (!features.length) return '';
    var html = '<section class="features-section"><h2>Features</h2><div class="features-grid">';
    features.forEach(function (f) {
      html += '<article class="feature-card">' +
        '<h3>' + esc(f.title || '') + '</h3>' +
        '<p>' + esc(f.description || '') + '</p>' +
      '</article>';
    });
    html += '</div></section>';
    return html;
  }

  function renderScreenshotCarousel(section) {
    var shots = section.screenshots || [];
    if (!shots.length) return '';
    var prefix = assetsPrefix();
    var html = '<section class="screenshots-section"><h2>Screenshots</h2>' +
      '<div class="screenshot-carousel" tabindex="0" role="region" aria-label="Screenshots">';
    shots.forEach(function (shot, i) {
      html += '<figure class="screenshot-slide">' +
        '<button type="button" class="screenshot-open" data-shot-index="' + i + '" aria-label="Open screenshot ' + (i + 1) + ' of ' + shots.length + '">' +
          '<img src="' + esc(prefix + shot) + '" alt="Screenshot ' + (i + 1) + '" loading="lazy">' +
        '</button>' +
      '</figure>';
    });
    html += '</div></section>';
    return html;
  }

  function renderTechDetails(section) {
    var parts = [];
    if (section.version) {
      var ver = 'Version ' + String(section.version);
      if (section.build != null && section.build !== '') ver += ' · Build ' + String(section.build);
      parts.push(ver);
    }
    var size = section.apk ? formatSizeLabel(section.apk) : (section.package ? formatSizeLabel(section.package) : '');
    if (size) parts.push(size);
    if (section.publishedAt) parts.push('Published ' + String(section.publishedAt));
    if (!parts.length) return '';
    return '<section class="tech-details"><p>' + esc(parts.join(' · ')) + '</p></section>';
  }

  function renderAboutPage(section) {
    var settings = getSettings();
    var c = settings.contact || section.contact || {};
    var blurb = (settings.aboutBlurb || '').trim();
    if (!blurb) {
      var blocksForBlurb = section.blocks || [];
      for (var bi = 0; bi < blocksForBlurb.length; bi++) {
        if (blocksForBlurb[bi].id === 'intro' && blocksForBlurb[bi].content) {
          blurb = String(blocksForBlurb[bi].content);
          break;
        }
      }
    }
    var skills = [];
    if (Array.isArray(settings.aboutSkills) && settings.aboutSkills.length) {
      skills = settings.aboutSkills;
    } else {
      var introBlock = null;
      var blocks = section.blocks || [];
      for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].id === 'intro') { introBlock = blocks[i]; break; }
      }
      if (introBlock && introBlock.bullets) skills = introBlock.bullets;
    }
    var siteUrl = (settings.pagesBaseUrl || '').replace(/\/$/, '');
    if (!siteUrl) siteUrl = '../index.html';
    var iconSrc = assetsPrefix() + (section.icon || 'logo.png');

    var html = '<article class="about-page">';
    html += '<header class="about-hero">';
    html += '<img class="about-hero-icon" src="' + esc(iconSrc) + '" alt="" width="112" height="112">';
    html += '<div class="about-hero-text">';
    html += '<p class="about-hero-greeting">Hey, I\u2019m Marcell \uD83D\uDC4B</p>';
    html += '<p class="about-hero-roles">Developer \u00B7 Builder \u00B7 Creator</p>';
    if (blurb) html += '<p class="about-hero-blurb">' + esc(blurb) + '</p>';
    html += '<div class="about-hero-actions">';
    if (c.email) {
      html += '<a class="about-hero-btn" href="mailto:' + esc(c.email) + '">Email</a>';
    }
    if (c.github) {
      html += '<a class="about-hero-btn about-hero-btn-ghost" href="' + esc(c.github) + '" target="_blank" rel="noopener">GitHub</a>';
    }
    html += '</div></div></header>';

    if (skills && skills.length) {
      html += '<section class="about-skills" aria-label="Skills">';
      html += '<h2>My Toolkit</h2>';
      html += '<div class="about-skill-badges">';
      skills.forEach(function (skill) {
        if (!skill) return;
        html += '<span class="about-skill-badge">' + esc(String(skill)) + '</span>';
      });
      html += '</div></section>';
    }

    html += '<section class="about-build" aria-label="What I build">';
    html += '<h2>What I build</h2>';
    html += '<div class="about-build-grid">';
    html += '<article class="about-build-card"><span class="about-build-emoji" aria-hidden="true">\uD83D\uDCF1</span><h3>Apps</h3><p>Android applications built to solve real problems.</p></article>';
    html += '<article class="about-build-card"><span class="about-build-emoji" aria-hidden="true">\uD83C\uDF10</span><h3>Websites</h3><p>Personal and collaborative web projects.</p></article>';
    html += '<article class="about-build-card"><span class="about-build-emoji" aria-hidden="true">\uD83D\uDEE0\uFE0F</span><h3>Desktop tools</h3><p>Windows utilities you download and run locally.</p></article>';
    html += '<article class="about-build-card"><span class="about-build-emoji" aria-hidden="true">\uD83D\uDD0C</span><h3>Browser add-ons</h3><p>Chrome extensions — Web Store or zip from this site.</p></article>';
    html += '</div></section>';

    html += '<section class="about-contact" aria-label="Contact">';
    html += '<h2>Say hello</h2>';
    html += '<div class="about-contact-cards">';
    if (c.email) {
      html += '<a class="about-contact-card" href="mailto:' + esc(c.email) + '">' +
        '<span class="about-contact-emoji" aria-hidden="true">\uD83D\uDCE7</span>' +
        '<span class="about-contact-label">Email</span>' +
        '<span class="about-contact-value">' + esc(c.email) + '</span></a>';
    }
    if (c.github) {
      html += '<a class="about-contact-card" href="' + esc(c.github) + '" target="_blank" rel="noopener">' +
        '<span class="about-contact-emoji" aria-hidden="true">\uD83D\uDC19</span>' +
        '<span class="about-contact-label">GitHub</span>' +
        '<span class="about-contact-value">' + esc(c.github.replace(/^https?:\/\//, '')) + '</span></a>';
    }
    html += '<a class="about-contact-card" href="' + esc(siteUrl) + '">' +
      '<span class="about-contact-emoji" aria-hidden="true">\uD83C\uDF10</span>' +
      '<span class="about-contact-label">Website</span>' +
      '<span class="about-contact-value">The Fox\u2019s Den</span></a>';
    html += '</div></section>';

    html += '</article>';
    return html;
  }

  function renderSection() {
    var mount = document.getElementById('section-content');
    var id = document.body.getAttribute('data-section-id');
    if (!mount || !id) return;
    var section = getSection(id);
    if (!section) {
      mount.innerHTML = '<p>Section not found.</p>';
      return;
    }

    if (id === 'unindexed' || section.kind === 'unindexed') {
      document.body.classList.add('unindexed-page');
      startUnindexed(mount, section);
      return;
    }

    if (id === 'berg-awaits' || section.kind === 'quest') {
      document.body.classList.add('quest-page');
      startBergQuest(mount, section);
      return;
    }

    if (id === 'my-huntress' || section.kind === 'dedication') {
      document.body.classList.add('dedication-page');
      document.body.setAttribute('data-section-id', 'my-huntress');
      mount.innerHTML = renderDedication(section);
      var letter = mount.querySelector('.dedication-letter');
      if (letter) playDedicationUnlock(letter, section);
      return;
    }

    if (id === 'about' || section.kind === 'about') {
      if (!isAboutVisible()) {
        mount.innerHTML = '<p class="section-summary">About is temporarily hidden.</p>';
        return;
      }
      mount.innerHTML = renderAboutPage(section);
      return;
    }

    mount.innerHTML = renderProjectPage(section);
    bindAboutFilter(mount);
    bindCodeGates(mount, section);
    bindProjectGallery(mount);
    bindProjectTabs(mount);
  }

  function formatPublished(iso) {
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!match) return '';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Number(match[3]) + ' ' + months[Number(match[2]) - 1] + ' ' + match[1];
  }

  function projectNavItem() {
    var id = document.body.getAttribute('data-section-id') || '';
    var items = (typeof catalogItems === 'function') ? catalogItems() : [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function renderProjectPage(section) {
    var shots = section.screenshots || [];
    var prefix = assetsPrefix();
    var features = section.features || [];
    var blocks = section.blocks || [];
    var faq = section.faq || [];
    var ver = versionParts(section);
    var size = sizeOf(section);
    var published = formatPublished(section.publishedAt);
    var kindName = kindLabel(section);
    var navItem = projectNavItem();
    var crumbKind = kindName;
    var html = '<div class="product-layout">';

    html += '<div class="product-hero-wrap">';
    html += '<p class="product-crumbs">Projects · ' + esc(crumbKind) + ' · ' + esc(section.title) + '</p>';
    html += '<header class="product-hero">';
    html += productIconHtml(section.icon, section.title);
    html += '<div class="product-hero-copy">';
    html += '<p class="product-kind">' + esc(kindName) + ' ' + statusBadge(section.status) + '</p>';
    html += '<h1>' + esc(section.title) + '</h1>';
    if (section.summary) html += '<p class="product-tagline">' + esc(section.summary) + '</p>';
    html += renderMetaFacts(section);
    html += '</div></header></div>';

    html += '<aside class="product-side">';
    html += '<section class="product-side-card"><h2>Project actions</h2>' + renderProductActions(section) + '</section>';
    html += '<section class="product-side-card"><h2>App information</h2><dl class="info-list">';
    html += '<div class="info-row info-row--solo"><span class="info-ico">' + platformIcon(section) + '</span><dt>' + esc(defaultPlatform(section)) + '</dt></div>';
    if (ver.version) {
      html += '<div class="info-row"><span class="info-ico">' + ICO_LAYERS + '</span><dt>Version</dt><dd>v' + esc(ver.version) +
        (ver.build !== '' && ver.build != null ? ' (Build ' + esc(ver.build) + ')' : '') + '</dd></div>';
    }
    if (size) html += '<div class="info-row"><span class="info-ico">' + ICO_SIZE + '</span><dt>Size</dt><dd>' + esc(size) + '</dd></div>';
    html += '<div class="info-row"><span class="info-ico"><span class="status-dot status-dot--' + esc(section.status || 'live') + '"></span></span><dt>Status</dt><dd>' + esc(statusLabel(section.status)) + '</dd></div>';
    if (published) html += '<div class="info-row"><span class="info-ico">' + ICO_CAL + '</span><dt>Last updated</dt><dd>' + esc(published) + '</dd></div>';
    html += '</dl></section>';
    html += '<section class="product-side-card"><h2>Quick links</h2><nav class="product-quick">';
    if (faq.length) html += '<a href="#faq"><span class="info-ico">' + ICO_FAQ + '</span><span>FAQ</span></a>';
    if (section.whatsNew || section.releaseNotes) html += '<a href="#changelog"><span class="info-ico">' + ICO_NOTE + '</span><span>Changelog</span></a>';
    if (section.roadmap) html += '<a href="#roadmap"><span class="info-ico">' + ICO_BOOK + '</span><span>Roadmap</span></a>';
    if (blocks.length) html += '<a href="#about"><span class="info-ico">' + ICO_NOTE + '</span><span>About</span></a>';
    html += '</nav></section>';
    var related = [];
    if (navItem) {
      related = catalogItems().filter(function (other) {
        return other.id !== navItem.id && other.file && kindFilterKey(other.kind) === kindFilterKey(navItem.kind);
      }).slice(0, 2);
    }
    if (related.length) {
      html += '<section class="product-side-card"><h2>Related projects</h2>';
      related.forEach(function (other) {
        var otherSection = getSection(other.id) || {};
        html += '<a class="den-related-item" href="' + esc(other.file) + '">' +
          appIconHtml(other.icon, other.label) +
          '<span><strong>' + esc(other.label) + '</strong><em>' + esc(otherSection.summary || '') + '</em></span>' +
          '<span class="den-related-go" aria-hidden="true">›</span></a>';
      });
      html += '</section>';
    }
    html += '</aside>';

    html += '<div class="product-body">';
    html += '<nav class="product-tabs" aria-label="On this page">';
    html += '<a href="#overview">Overview</a>';
    if (shots.length) html += '<a href="#screenshots">Screenshots</a>';
    if (features.length) html += '<a href="#features">Features</a>';
    if (blocks.length) html += '<a href="#about">About</a>';
    if (faq.length) html += '<a href="#faq">FAQ</a>';
    if (section.whatsNew || section.releaseNotes) html += '<a href="#changelog">Changelog</a>';
    if (section.roadmap) html += '<a href="#roadmap">Roadmap</a>';
    html += '</nav>';

    var summary = (section.summary || '').trim();
    var lead = section.title;
    var blurb = summary;
    var colon = summary.indexOf(':');
    if (colon > 8 && colon < 80) {
      lead = summary.slice(0, colon).trim();
      blurb = summary.slice(colon + 1).trim();
    }
    var eyebrow = features[0] && features[0].title ? features[0].title : kindName;
    html += '<section id="overview" class="product-showcase">';
    html += '<div class="product-showcase-copy">';
    html += '<p class="product-kind">' + esc(eyebrow) + '</p>';
    html += '<h2>' + esc(lead) + '</h2>';
    if (blurb) html += '<p>' + esc(blurb) + '</p>';
    html += renderProductActions(section);
    html += '</div>';
    if (shots.length) {
      var phone = section.kind === 'mobile' || !section.kind;
      html += '<div class="product-showcase-shots" data-kind="' + esc(section.kind || '') + '">';
      shots.slice(0, 3).forEach(function (shot, i) {
        var img = '<img src="' + esc(prefix + shot) + '" alt="Screenshot ' + (i + 1) + '">';
        html += phone ? '<div class="phone-frame">' + img + '</div>' : img;
      });
      html += '</div>';
    }
    html += '</section>';

    if (features.length) {
      var featureIcons = [
        '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6" rx="7" ry="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h8l1 2h3v10H4V9h3l1-2z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="14" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M8 10l4 4 4-4M5 19h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      ];
      html += '<section id="features" class="features-section"><h2>Features</h2><div class="features-grid">';
      features.forEach(function (feature, index) {
        html += '<article class="feature-card"><span class="feature-ico">' + featureIcons[index % featureIcons.length] + '</span><h3>' + esc(feature.title || '') + '</h3><p>' + esc(feature.description || '') + '</p></article>';
      });
      html += '</div></section>';
    }

    if (shots.length) {
      html += '<section id="screenshots" class="screenshots-section"><h2>Screenshots</h2>';
      html += '<div class="shot-gallery">';
      html += '<button type="button" class="shot-stage" data-shot-index="0"><img src="' + esc(prefix + shots[0]) + '" alt="Screenshot 1"></button>';
      html += '<div class="shot-strip">';
      html += '<button type="button" class="shot-nav shot-nav-prev" aria-label="Previous screenshots">‹</button>';
      html += '<div class="shot-thumbs">';
      shots.forEach(function (shot, i) {
        html += '<button type="button" class="shot-thumb' + (i === 0 ? ' is-active' : '') + '" data-shot-index="' + i + '">' +
          '<img src="' + esc(prefix + shot) + '" alt="Screenshot ' + (i + 1) + '"></button>';
      });
      html += '</div>';
      html += '<button type="button" class="shot-nav shot-nav-next" aria-label="Next screenshots">›</button>';
      html += '</div></div></section>';
    }

    if (blocks.length) {
      html += '<section id="about" class="about-app-section"><h2>About this app</h2>';
      blocks.forEach(function (block) {
        var blockText = (block.content || '').trim();
        var summaryText = (section.summary || '').trim();
        if (blockText && summaryText && blockText === summaryText && !(block.bullets && block.bullets.length)) return;
        html += '<div class="content-block" id="' + esc(block.id || '') + '">';
        if (block.heading) html += '<h3>' + esc(block.heading) + '</h3>';
        if (block.content) html += '<p>' + esc(block.content) + '</p>';
        if (block.bullets && block.bullets.length) {
          html += '<ul>';
          block.bullets.forEach(function (li) { html += '<li>' + esc(li) + '</li>'; });
          html += '</ul>';
        }
        html += '</div>';
      });
      html += '</section>';
    }

    if (faq.length) {
      html += '<section id="faq" class="about-app-section"><h2>FAQ</h2>';
      html += '<input type="search" class="about-faq-filter" placeholder="Search these questions" aria-label="Filter FAQ">';
      html += '<div class="faq-list">';
      faq.forEach(function (item) {
        var heading = item.heading || 'Question';
        var content = item.content || '';
        var search = (heading + ' ' + content).toLowerCase();
        html += '<details class="faq-item about-filter-item" data-filter="' + esc(search) + '" id="' + esc(item.id || '') + '">';
        html += '<summary>' + esc(heading) + '</summary>';
        html += '<p>' + esc(content).replace(/\n/g, '<br>') + '</p>';
        html += '</details>';
      });
      html += '</div><p class="about-filter-empty" hidden>No matching questions.</p></section>';
    }

    if (section.whatsNew || section.releaseNotes) {
      html += '<section id="changelog" class="whats-new"><div class="whats-new-head"><h2>Changelog</h2></div>';
      if (ver.version) html += '<p class="changelog-version">v' + esc(ver.version) + '</p>';
      html += '<ul>';
      String(section.whatsNew || section.releaseNotes).split(/\r?\n/).forEach(function (line) {
        var item = line.replace(/^[\s•\-]+/, '').trim();
        if (!item || /^version\b/i.test(item)) return;
        html += '<li>' + esc(item) + '</li>';
      });
      html += '</ul></section>';
    }

    if (section.roadmap) {
      html += '<section id="roadmap" class="whats-new"><h2>Roadmap</h2><ul>';
      var roadmapLines = Array.isArray(section.roadmap) ? section.roadmap : String(section.roadmap).split(/\r?\n/);
      roadmapLines.forEach(function (line) {
        var item = String(line).replace(/^[\s•\-]+/, '').trim();
        if (item) html += '<li>' + esc(item) + '</li>';
      });
      html += '</ul></section>';
    }

    html += '</div></div>';
    return html;
  }

  function bindProjectGallery(mount) {
    var gallery = mount.querySelector('.shot-gallery');
    if (!gallery) return;
    var stage = gallery.querySelector('.shot-stage img');
    var buttons = gallery.querySelectorAll('.shot-thumb');
    var items = [];
    buttons.forEach(function (btn) {
      var img = btn.querySelector('img');
      items.push({ src: img.getAttribute('src'), alt: img.getAttribute('alt') || 'Screenshot' });
    });
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var index = Number(btn.getAttribute('data-shot-index') || 0);
        if (stage && items[index]) {
          stage.src = items[index].src;
          stage.alt = items[index].alt;
        }
        buttons.forEach(function (other) { other.classList.remove('is-active'); });
        btn.classList.add('is-active');
      });
    });
    var stageBtn = gallery.querySelector('.shot-stage');
    if (stageBtn) {
      stageBtn.addEventListener('click', function () {
        var active = gallery.querySelector('.shot-thumb.is-active');
        var index = active ? Number(active.getAttribute('data-shot-index') || 0) : 0;
        openScreenshotLightbox(items, index, stageBtn);
      });
    }
    var strip = gallery.querySelector('.shot-thumbs');
    var prev = gallery.querySelector('.shot-nav-prev');
    var next = gallery.querySelector('.shot-nav-next');
    function stepStrip(dir) {
      if (!strip) return;
      var thumb = strip.querySelector('.shot-thumb');
      var amount = (thumb ? thumb.getBoundingClientRect().width + 8 : 110) * 2;
      strip.scrollBy({ left: dir * amount, behavior: 'smooth' });
    }
    if (prev) prev.addEventListener('click', function () { stepStrip(-1); });
    if (next) next.addEventListener('click', function () { stepStrip(1); });
  }

  function bindProjectTabs(mount) {
    var links = mount.querySelectorAll('.product-tabs a');
    if (!links.length) return;
    var sections = [];
    links.forEach(function (link) {
      var id = (link.getAttribute('href') || '').replace('#', '');
      var el = id ? document.getElementById(id) : null;
      if (el) sections.push({ link: link, el: el });
      link.addEventListener('click', function (e) {
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (history.replaceState) history.replaceState(null, '', '#' + id);
      });
    });
    function mark() {
      var current = sections[0];
      sections.forEach(function (entry) {
        if (entry.el.getBoundingClientRect().top <= 140) current = entry;
      });
      links.forEach(function (link) { link.classList.remove('is-active'); });
      if (current) current.link.classList.add('is-active');
    }
    window.addEventListener('scroll', mark, { passive: true });
    mark();
  }

  var LANDING_GROUP_LIMIT = 10;

  function renderNavGroup(title, items) {
    if (!items.length) return '';
    var html = '<section class="landing-group"><h2 class="landing-group-title">' + esc(title) + '</h2><ol class="landing-nav">';
    function renderItem(item, index, extra) {
      var n = index + 1;
      var badge = statusBadge(item.status || 'live');
      var lock = foxLockSlotHtml(!!item.codeProtected);
      var icon = item.icon ? appIconHtml(item.icon, item.label) : '';
      var cls = extra ? ' class="landing-nav-extra"' : '';
      var hiddenAttr = extra ? ' hidden' : '';
      if (item.available && item.file) {
        return '<li' + cls + hiddenAttr + '><a href="sections/' + item.file + '" class="landing-nav-link">' + icon +
          '<span class="landing-nav-label">' + n + '. ' + esc(item.label) + '</span>' +
          lock + badge + '</a></li>';
      }
      return '<li class="unavailable' + (extra ? ' landing-nav-extra' : '') + '"' + hiddenAttr + '>' + icon +
        '<span class="landing-nav-label">' + n + '. ' + esc(item.label) + '</span>' +
        lock + badge + ' <em>(coming soon)</em></li>';
    }
    items.forEach(function (item, i) {
      html += renderItem(item, i, i >= LANDING_GROUP_LIMIT);
    });
    if (items.length > LANDING_GROUP_LIMIT) {
      var more = items.length - LANDING_GROUP_LIMIT;
      html += '<li class="landing-nav-toggle-wrap">' +
        '<button type="button" class="landing-nav-toggle" data-more-count="' + more + '" aria-expanded="false">' +
        'Show ' + more + ' more' +
        '</button></li>';
    }
    html += '</ol></section>';
    return html;
  }

  function catalogItems() {
    var groups = partitionNav();
    return []
      .concat(groups.mobile, groups.websites, groups.tools, groups.addons, groups.other)
      .filter(function (item) { return item && item.id && item.id !== 'about'; });
  }

  function kindFilterKey(kind) {
    if (kind === 'mobile') return 'mobile';
    if (kind === 'website') return 'website';
    if (kind === 'tool') return 'tool';
    if (kind === 'addon') return 'addon';
    return 'other';
  }

  function sectionForItem(item) {
    return getSection(item.id) || {};
  }

  function itemMetaLine(item) {
    var section = sectionForItem(item);
    var bits = [];
    bits.push(defaultPlatform(section.kind ? section : { kind: item.kind }));
    var ver = section.version || (section.apk && section.apk.version) || (section.package && section.package.version);
    if (ver) {
      var label = 'v' + ver;
      var build = section.build != null && section.build !== '' ? section.build : (section.apk && section.apk.build);
      if (build != null && build !== '') label += ' (Build ' + build + ')';
      bits.push(label);
    }
    var size = section.apk ? formatSizeLabel(section.apk) : (section.package ? formatSizeLabel(section.package) : '');
    if (size) bits.push(size);
    return bits.join(' · ');
  }

  function renderWorkshopCard(item, featured) {
    var section = sectionForItem(item);
    var href = item.file ? ('sections/' + item.file) : '#';
    var summary = section.summary || '';
    var shot = (section.screenshots && section.screenshots[0]) ? (assetsPrefix() + section.screenshots[0]) : '';
    var cls = 'den-card' + (featured ? ' den-card--feature' : '');
    var html = '<article class="' + cls + '" data-kind="' + esc(kindFilterKey(item.kind)) + '" data-project-id="' + esc(item.id) + '">';
    html += '<button type="button" class="den-card-hit" data-select="' + esc(item.id) + '">';
    html += appIconHtml(item.icon, item.label);
    html += '<span class="den-card-copy">';
    html += '<span class="den-card-kicker">' + esc(kindLabel(section.kind ? section : { kind: item.kind })) + '</span>';
    html += '<span class="den-card-title">' + esc(item.label) + '</span>';
    if (summary) html += '<span class="den-card-summary">' + esc(summary) + '</span>';
    html += '<span class="den-card-meta">' + esc(itemMetaLine(item)) + '</span>';
    html += '</span>';
    html += statusBadge(item.status || 'live');
    html += '</button>';
    if (featured && shot) {
      html += '<img class="den-card-shot" src="' + esc(shot) + '" alt="">';
    }
    if (item.file) {
      html += '<a class="den-card-open" href="' + esc(href) + '" aria-label="Open ' + esc(item.label) + '">›</a>';
    }
    html += '</article>';
    return html;
  }

  function renderLandingActions(section) {
    var html = '<div class="product-actions den-detail-actions">';
    var gateId = section.codeProtected ? section.id : null;
    var help = installHelpHref(section.kind || 'mobile');
    if (section.kind === 'website' && section.externalUrl) {
      html += '<a href="' + esc(section.externalUrl) + '" class="app-download-btn" target="_blank" rel="noopener"' +
        (gateId ? ' data-code-gate="' + esc(gateId) + '"' : '') + '>Open site</a>';
    } else if (section.kind === 'tool' || section.kind === 'addon') {
      if (section.kind === 'addon' && section.storeUrl) {
        html += '<a href="' + esc(section.storeUrl) + '" class="app-download-btn" target="_blank" rel="noopener"' +
          (gateId ? ' data-code-gate="' + esc(gateId) + '"' : '') + '>Get on Chrome Web Store</a>';
      }
      if (section.package) html += renderDownloadChannel(section.package, help, gateId, true);
      if (section.packageBeta) html += renderDownloadChannel(section.packageBeta, help, gateId, true);
    } else {
      if (section.apk) html += renderDownloadChannel(section.apk, help, gateId, true);
      if (section.apkBeta) html += renderDownloadChannel(section.apkBeta, help, gateId, true);
      html += renderGooglePlayButton(section);
    }
    html += '</div>';
    return html;
  }

  function renderWorkshopDetail(item) {
    var mount = document.querySelector('[data-den-detail]');
    if (!mount || !item) return;
    var section = sectionForItem(item);
    var href = item.file ? ('sections/' + item.file) : '';
    var html = '<div class="den-detail-card">';
    html += '<p class="den-detail-label">Project details</p>';
    html += '<header class="den-detail-head">';
    html += productIconHtml(item.icon || section.icon, item.label);
    html += '<div>';
    html += '<p class="den-card-kicker">' + esc(kindLabel(section.kind ? section : { kind: item.kind })) + ' ' + statusBadge(item.status || section.status || 'live') + '</p>';
    html += '<h2>' + esc(section.title || item.label) + '</h2>';
    html += '</div></header>';
    if (section.summary) html += '<p class="den-detail-summary">' + esc(section.summary) + '</p>';
    html += renderMetaFacts(section.kind ? section : { kind: item.kind });
    html += renderLandingActions(section.id ? section : { id: item.id, kind: item.kind });
    if (href && (section.whatsNew || section.releaseNotes)) {
      html += '<section class="whats-new den-detail-news" id="den-changelog"><div class="whats-new-head"><h2>What\'s New</h2>' +
        '<a class="whats-new-all" href="' + esc(href) + '">View all →</a></div><ul>';
      String(section.whatsNew || section.releaseNotes).split(/\r?\n/).forEach(function (line) {
        var itemText = line.replace(/^[\s•\-]+/, '').trim();
        if (itemText) html += '<li>' + esc(itemText) + '</li>';
      });
      html += '</ul></section>';
    }
    var related = catalogItems().filter(function (other) {
      return other.id !== item.id && kindFilterKey(other.kind) === kindFilterKey(item.kind);
    }).slice(0, 2);
    if (related.length) {
      html += '<section class="den-related"><h2>Related projects</h2>';
      related.forEach(function (other) {
        var otherSection = sectionForItem(other);
        html += '<a class="den-related-item" href="sections/' + esc(other.file) + '">' +
          appIconHtml(other.icon, other.label) +
          '<span><strong>' + esc(other.label) + '</strong><em>' + esc(otherSection.summary || '') + '</em></span>' +
          '<span class="den-related-go" aria-hidden="true">›</span></a>';
      });
      html += '</section>';
    }
    if (href) html += '<a class="den-detail-page" href="' + esc(href) + '">Open full project page →</a>';
    html += '</div>';
    mount.innerHTML = html;
    if (section.id) bindCodeGates(mount, section);
    mount.querySelectorAll('[data-project-id], .den-card').forEach(function () {});
    document.querySelectorAll('.den-card').forEach(function (card) {
      card.classList.toggle('is-selected', card.getAttribute('data-project-id') === item.id);
    });
  }

  function renderWorkshop() {
    var items = catalogItems();
    var rail = document.querySelector('[data-den-rail]');
    var catalog = document.querySelector('[data-portal-landing-nav]');
    if (!rail || !catalog) return;

    var counts = { all: items.length, mobile: 0, website: 0, tool: 0, addon: 0 };
    items.forEach(function (item) {
      var key = kindFilterKey(item.kind);
      if (counts[key] != null) counts[key] += 1;
    });

    rail.innerHTML =
      '<button type="button" class="den-rail-all is-active" data-filter="all"><span>All projects</span><em>' + counts.all + '</em></button>' +
      '<p class="den-rail-label">Categories</p>' +
      '<button type="button" class="den-rail-link" data-filter="mobile"><span>Mobile apps</span><em>' + counts.mobile + '</em></button>' +
      '<button type="button" class="den-rail-link" data-filter="website"><span>Websites</span><em>' + counts.website + '</em></button>' +
      '<button type="button" class="den-rail-link" data-filter="tool"><span>Desktop tools</span><em>' + counts.tool + '</em></button>' +
      '<button type="button" class="den-rail-link" data-filter="addon"><span>Browser add-ons</span><em>' + counts.addon + '</em></button>' +
      '<p class="den-rail-label">Quick links</p>' +
      '<a class="den-rail-link" href="sections/ffs.html">FAQ</a>' +
      '<a class="den-rail-link" href="#den-changelog">Changelog</a>' +
      '<a class="den-rail-link" href="sections/about.html">About</a>' +
      '<figure class="den-aside-card"><img src="assets/small-ideas.png" alt="Small ideas build big places."></figure>';

    var featured = items.filter(function (item) { return item.id === 'ffs'; })[0] || items[0];
    var html = '<div class="den-filters">';
    html += '<button type="button" class="den-filter is-active" data-filter="all">All</button>';
    html += '<button type="button" class="den-filter" data-filter="mobile">Mobile apps</button>';
    html += '<button type="button" class="den-filter" data-filter="website">Websites</button>';
    html += '<button type="button" class="den-filter" data-filter="tool">Desktop tools</button>';
    html += '<button type="button" class="den-filter" data-filter="addon">Browser add-ons</button>';
    html += '<span class="den-filter-count">' + counts.all + ' projects</span></div>';
    if (featured) {
      html += '<h2 class="den-block-title">Featured project</h2>';
      html += renderWorkshopCard(featured, true);
    }
    html += '<h2 class="den-block-title">All projects</h2><div class="den-grid">';
    items.forEach(function (item) {
      if (featured && item.id === featured.id) return;
      html += renderWorkshopCard(item, false);
    });
    html += '</div>';
    catalog.innerHTML = html;

    function applyFilter(key) {
      document.querySelectorAll('[data-filter]').forEach(function (el) {
        el.classList.toggle('is-active', el.getAttribute('data-filter') === key);
      });
      catalog.querySelectorAll('.den-card').forEach(function (card) {
        var show = key === 'all' || card.getAttribute('data-kind') === key;
        card.hidden = !show;
      });
      var visible = items.filter(function (item) {
        return key === 'all' || kindFilterKey(item.kind) === key;
      });
      var count = catalog.querySelector('.den-filter-count');
      if (count) count.textContent = visible.length + (visible.length === 1 ? ' project' : ' projects');
    }

    document.querySelectorAll('[data-filter]').forEach(function (btn) {
      if (btn.tagName !== 'BUTTON') return;
      btn.addEventListener('click', function () {
        applyFilter(btn.getAttribute('data-filter'));
      });
    });

    catalog.querySelectorAll('[data-select]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-select');
        var item = items.filter(function (entry) { return entry.id === id; })[0];
        if (item) renderWorkshopDetail(item);
      });
    });

    if (featured) renderWorkshopDetail(featured);
  }

  function renderLandingNav() {
    if (document.querySelector('[data-den-workshop]')) {
      renderWorkshop();
      return;
    }
    var mount = document.querySelector('[data-portal-landing-nav]');
    if (!mount) return;
    var groups = partitionNav();
    var html = '';
    html += renderNavGroup('Mobile apps', groups.mobile);
    html += renderNavGroup('Websites', groups.websites);
    html += renderNavGroup('Desktop tools', groups.tools);
    html += renderNavGroup('Browser add-ons', groups.addons);
    html += renderNavGroup('More', groups.other);
    if (!html) html = '<p class="landing-empty">No projects listed yet.</p>';
    mount.innerHTML = html;
    mount.querySelectorAll('.landing-nav-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var wrap = btn.closest('.landing-group');
        if (!wrap) return;
        var extras = wrap.querySelectorAll('.landing-nav-extra');
        var open = btn.getAttribute('aria-expanded') === 'true';
        extras.forEach(function (li) { li.hidden = open; });
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        btn.textContent = open
          ? ('Show ' + (btn.getAttribute('data-more-count') || '') + ' more')
          : 'Show less';
      });
    });
  }

  function renderContactFooter() {
    var mount = document.querySelector('[data-portal-contact-footer]');
    if (!mount) return;
    if (!isAboutVisible()) {
      mount.innerHTML = '';
      mount.hidden = true;
      return;
    }
    mount.hidden = false;
    var c = getSettings().contact || {};
    var parts = [];
    if (c.email) parts.push('<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>');
    if (c.github) parts.push('<a href="' + esc(c.github) + '" target="_blank" rel="noopener">GitHub</a>');
    if (c.linkedin) parts.push('<a href="' + esc(c.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>');
    mount.innerHTML = parts.length ? parts.join('<span class="landing-footer-sep" aria-hidden="true">·</span>') : '';
  }

  function renderLearnMore() {
    var el = document.querySelector('.landing-learn-more');
    if (!el) return;
    el.hidden = !isAboutVisible();
  }

  var shotLightbox = null;
  var shotItems = [];
  var shotIndex = 0;
  var shotReturnFocus = null;

  function ensureScreenshotLightbox() {
    if (shotLightbox) return shotLightbox;
    var root = document.createElement('div');
    root.className = 'shot-lightbox';
    root.hidden = true;
    root.innerHTML =
      '<div class="shot-lightbox__backdrop" data-shot-close></div>' +
      '<div class="shot-lightbox__dialog" role="dialog" aria-modal="true" aria-label="Screenshot viewer" tabindex="-1">' +
        '<button type="button" class="shot-lightbox__close" data-shot-close aria-label="Close">×</button>' +
        '<button type="button" class="shot-lightbox__nav shot-lightbox__nav--prev" data-shot-prev aria-label="Previous screenshot">‹</button>' +
        '<figure class="shot-lightbox__stage">' +
          '<img alt="">' +
          '<figcaption class="shot-lightbox__caption"></figcaption>' +
        '</figure>' +
        '<button type="button" class="shot-lightbox__nav shot-lightbox__nav--next" data-shot-next aria-label="Next screenshot">›</button>' +
      '</div>';
    document.body.appendChild(root);

    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-shot-close]')) closeScreenshotLightbox();
      else if (e.target.closest('[data-shot-prev]')) stepScreenshot(-1);
      else if (e.target.closest('[data-shot-next]')) stepScreenshot(1);
    });

    var stage = root.querySelector('.shot-lightbox__stage');
    var swipeX = 0;
    var swiping = false;
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      swiping = true;
      swipeX = e.clientX;
    });
    stage.addEventListener('pointerup', function (e) {
      if (!swiping) return;
      swiping = false;
      var dx = e.clientX - swipeX;
      if (dx > 48) stepScreenshot(-1);
      else if (dx < -48) stepScreenshot(1);
    });
    stage.addEventListener('pointercancel', function () { swiping = false; });

    document.addEventListener('keydown', function (e) {
      if (!shotLightbox || shotLightbox.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeScreenshotLightbox();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepScreenshot(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepScreenshot(-1);
      }
    });

    shotLightbox = root;
    return root;
  }

  function showScreenshot(index) {
    if (!shotItems.length) return;
    shotIndex = (index + shotItems.length) % shotItems.length;
    var item = shotItems[shotIndex];
    var root = ensureScreenshotLightbox();
    var img = root.querySelector('.shot-lightbox__stage img');
    var caption = root.querySelector('.shot-lightbox__caption');
    img.src = item.src;
    img.alt = item.alt;
    caption.textContent = (shotIndex + 1) + ' of ' + shotItems.length;
    var single = shotItems.length < 2;
    root.querySelector('[data-shot-prev]').hidden = single;
    root.querySelector('[data-shot-next]').hidden = single;
  }

  function stepScreenshot(delta) {
    showScreenshot(shotIndex + delta);
  }

  function openScreenshotLightbox(items, index, returnFocus) {
    shotItems = items;
    shotReturnFocus = returnFocus || null;
    var root = ensureScreenshotLightbox();
    showScreenshot(index);
    root.hidden = false;
    document.body.classList.add('shot-lightbox-open');
    var dialog = root.querySelector('.shot-lightbox__dialog');
    if (dialog) dialog.focus();
  }

  function closeScreenshotLightbox() {
    if (!shotLightbox || shotLightbox.hidden) return;
    shotLightbox.hidden = true;
    document.body.classList.remove('shot-lightbox-open');
    var img = shotLightbox.querySelector('.shot-lightbox__stage img');
    if (img) img.removeAttribute('src');
    if (shotReturnFocus && shotReturnFocus.focus) shotReturnFocus.focus();
    shotReturnFocus = null;
  }

  function enhanceScreenshotCarousels() {
    document.querySelectorAll('.screenshot-carousel').forEach(function (carousel) {
      if (carousel.dataset.swipeReady === '1') return;
      carousel.dataset.swipeReady = '1';

      var dragging = false;
      var startX = 0;
      var startScroll = 0;
      var moved = false;
      var suppressClick = false;

      function openFromButton(btn) {
        var buttons = carousel.querySelectorAll('.screenshot-open');
        var items = [];
        buttons.forEach(function (el) {
          var img = el.querySelector('img');
          if (!img) return;
          items.push({ src: img.getAttribute('src') || '', alt: img.getAttribute('alt') || 'Screenshot' });
        });
        var index = Number(btn.getAttribute('data-shot-index')) || 0;
        openScreenshotLightbox(items, index, btn);
      }

      carousel.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        dragging = true;
        moved = false;
        startX = e.clientX;
        startScroll = carousel.scrollLeft;
        carousel.classList.add('is-dragging');
        try { carousel.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });

      carousel.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var dx = e.clientX - startX;
        if (Math.abs(dx) > 4) moved = true;
        carousel.scrollLeft = startScroll - dx;
      });

      function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        carousel.classList.remove('is-dragging');
        if (!moved && e.type === 'pointerup') {
          var hit = document.elementFromPoint(e.clientX, e.clientY);
          var btn = hit && hit.closest ? hit.closest('.screenshot-open') : null;
          if (btn && carousel.contains(btn)) {
            suppressClick = true;
            openFromButton(btn);
          }
        }
        try { carousel.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }

      carousel.addEventListener('pointerup', endDrag);
      carousel.addEventListener('pointercancel', endDrag);

      // Swallow the click that follows a swipe or an already-opened viewer.
      carousel.addEventListener('click', function (e) {
        if (moved || suppressClick) {
          e.preventDefault();
          e.stopPropagation();
          moved = false;
          suppressClick = false;
        }
      }, true);

      carousel.addEventListener('keydown', function (e) {
        var step = Math.max(200, Math.floor(carousel.clientWidth * 0.8));
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          carousel.scrollBy({ left: step, behavior: 'smooth' });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          carousel.scrollBy({ left: -step, behavior: 'smooth' });
        }
      });
    });
  }

  function init() {
    if (isDedicationPage()) document.body.classList.add('dedication-page');
    if (isQuestPage()) document.body.classList.add('quest-page');
    if (isUnindexedPage()) document.body.classList.add('unindexed-page');
    renderToolbar();
    renderSidebar();
    renderSection();
    enhanceScreenshotCarousels();
    renderLandingNav();
    renderContactFooter();
    renderLearnMore();
    var settings = getSettings();
    var tagline = document.querySelector('[data-portal-tagline]');
    if (tagline && settings.tagline) tagline.textContent = settings.tagline;
    var descriptor = document.querySelector('[data-portal-descriptor]');
    if (descriptor) {
      var desc = settings.descriptor || '';
      descriptor.textContent = desc;
      descriptor.hidden = !desc;
    }
    var landingTitle = document.querySelector('[data-portal-title]');
    if (landingTitle && settings.portalName) landingTitle.textContent = settings.portalName;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
