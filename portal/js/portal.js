(function () {
  'use strict';

  function esc(t) {
    var d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  function statusBadge(status) {
    if (status === 'live') return '<span class="status-badge status-live">Live</span>';
    if (status === 'beta') return '<span class="status-badge status-beta">Beta</span>';
    if (status === 'in_progress') return '<span class="status-badge status-progress">In Progress</span>';
    return '<span class="status-badge status-planned">Planned</span>';
  }

  function getSettings() {
    return (window.DELTACORE_PORTAL && DELTACORE_PORTAL.settings) || {};
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

  function renderToolbar() {
    var mount = document.getElementById('portal-toolbar');
    if (!mount) return;
    var scope = document.body.getAttribute('data-nav-scope') || 'landing';
    var dedication = isDedicationPage();
    var backHref = scope === 'section' ? '../index.html' : 'index.html';
    var homeHref = scope === 'section' ? '../index.html' : 'index.html';
    var backTitle = scope === 'section' ? 'Back to portal home' : 'Portal home';
    var menuBtn = scope === 'section' && !dedication
      ? '<button type="button" class="toolbar-btn toolbar-menu" id="toolbar-menu-btn" title="Menu" aria-label="Open menu">' + SVG_MENU + '</button>'
      : '';
    mount.outerHTML =
      '<header class="portal-toolbar no-print" aria-label="Page tools">' +
        '<div class="toolbar-inner">' +
          '<div class="toolbar-start">' +
            menuBtn +
            (scope === 'section'
              ? '<a href="' + backHref + '" class="toolbar-btn" title="' + backTitle + '">' + SVG_BACK + '</a>'
              : '') +
            '<a href="' + homeHref + '" class="toolbar-btn" title="Home" style="' + (scope === 'landing' ? 'display:none' : '') + '">' + SVG_HOME + '</a>' +
          '</div>' +
          '<div class="toolbar-end">' +
            (dedication ? '' : '<button type="button" class="toolbar-btn" id="toolbar-search-btn" title="Search (Ctrl+K)">' + SVG_SEARCH + '</button>') +
            (dedication ? '' : '<button type="button" class="toolbar-btn toolbar-print" title="Print (Ctrl+P)">' + SVG_PRINT + '</button>') +
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
    var about = [];
    var other = [];
    getNav().forEach(function (item) {
      if (item.kind === 'about') about.push(item);
      else if (item.kind === 'website') websites.push(item);
      else if (item.kind === 'tool') tools.push(item);
      else if (item.kind === 'mobile' || !item.kind) mobile.push(item);
      else other.push(item);
    });
    return { mobile: mobile, websites: websites, tools: tools, about: about, other: other };
  }

  function renderSidebarGroup(title, items, active, prefix) {
    if (!items.length) return '';
    var html = '<div class="sidebar-group">';
    if (title) html += '<h2 class="sidebar-group-title">' + esc(title) + '</h2>';
    html += '<ol>';
    items.forEach(function (item, i) {
      var label = (i + 1) + '. ' + item.label;
      if (item.id === active) {
        html += '<li class="active">' + esc(label) + '</li>';
      } else if (item.available && item.file) {
        html += '<li><a href="' + prefix + item.file + '">' + esc(label) + '</a></li>';
      } else {
        html += '<li class="unavailable">' + esc(label) + ' <em>(soon)</em></li>';
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
    if (isDedicationPage()) {
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
    html += renderSidebarGroup('Tools', groups.tools, active, prefix);
    html += renderSidebarGroup('More', groups.other, active, prefix);
    html += '</nav>';
    var section = getSection(active);
    if (section && section.sidebarNote) {
      html += '<div class="sidebar-note"><strong>Note</strong><p>' + esc(section.sidebarNote) + '</p></div>';
    }
    html += '</div>';
    html += renderSidebarAbout(groups.about, active, prefix);
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

  function renderDownloadChannel(apk, helpHref) {
    if (!apk || !apk.downloadUrl) return '';
    var parts = [];
    if (apk.version) {
      var ver = 'v' + String(apk.version);
      if (apk.build != null && apk.build !== '') ver += ' (build ' + String(apk.build) + ')';
      parts.push(ver);
    }
    if (apk.sizeLabel) parts.push(String(apk.sizeLabel));
    else if (apk.sizeBytes != null && apk.sizeBytes !== '') {
      var n = Number(apk.sizeBytes);
      if (!isNaN(n) && n > 0) {
        if (n < 1024) parts.push(n + ' B');
        else if (n < 1024 * 1024) parts.push((n / 1024).toFixed(1) + ' KB');
        else if (n < 1024 * 1024 * 1024) parts.push((n / (1024 * 1024)).toFixed(1) + ' MB');
        else parts.push((n / (1024 * 1024 * 1024)).toFixed(2) + ' GB');
      }
    }
    var meta = parts.length
      ? '<span class="app-channel-meta">' + esc(parts.join(' · ')) + '</span>'
      : '';
    var disabled = apk.available === false;
    var btnClass = 'app-download-btn' + (apk.channel === 'beta' ? ' app-download-btn-beta' : '');
    var link = disabled
      ? '<span class="' + btnClass + ' is-disabled" aria-disabled="true">' + esc(apk.label || 'Download') + ' (not published)</span>'
      : '<a href="' + esc(apk.downloadUrl) + '" class="' + btnClass + '" download>' + esc(apk.label || 'Download APK') + '</a>';
    return '<div class="app-channel">' +
      link + meta +
      (helpHref ? ' <a class="app-install-help" href="' + helpHref + '" target="_blank" rel="noopener">Install help</a>' : '') +
      '</div>';
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
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function revealLetter() {
      letter.classList.remove('is-waiting');
      letter.classList.add('is-revealed');
      document.body.classList.remove('dedication-revealing');
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
      if (reduceMotion) {
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

  function renderSection() {
    var mount = document.getElementById('section-content');
    var id = document.body.getAttribute('data-section-id');
    if (!mount || !id) return;
    var section = getSection(id);
    if (!section) {
      mount.innerHTML = '<p>Section not found.</p>';
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

    var html = '<header class="section-header">' +
      '<h1>' + esc(section.title) + '</h1>' +
      statusBadge(section.status) +
      '</header>';
    if (section.summary) html += '<p class="section-summary">' + esc(section.summary) + '</p>';

    if (section.kind === 'website' && section.externalUrl) {
      html += '<p class="app-download-wrap">' +
        '<a href="' + esc(section.externalUrl) + '" class="app-download-btn" target="_blank" rel="noopener">Open site</a>' +
        '</p>';
      var siteMeta = [];
      if (section.publishedAt) siteMeta.push('Published ' + String(section.publishedAt));
      if (section.note) siteMeta.push(String(section.note));
      else if (section.releaseNotes) siteMeta.push(String(section.releaseNotes));
      if (siteMeta.length) {
        html += '<p class="app-channel-meta">' + esc(siteMeta.join(' · ')) + '</p>';
      }
    } else if (section.kind === 'tool' && section.package) {
      html += '<div class="app-download-wrap">';
      html += renderDownloadChannel(section.package, null);
      html += '</div>';
      var toolMeta = [];
      if (section.publishedAt) toolMeta.push('Published ' + String(section.publishedAt));
      if (section.note) toolMeta.push(String(section.note));
      else if (section.releaseNotes) toolMeta.push(String(section.releaseNotes));
      if (toolMeta.length) {
        html += '<p class="app-channel-meta">' + esc(toolMeta.join(' · ')) + '</p>';
      }
      html += '<p class="section-summary">Extract the zip and run the .exe. No installer required.</p>';
    } else if (section.apk || section.apkBeta) {
      html += '<div class="app-download-wrap">';
      if (section.apk) html += renderDownloadChannel(section.apk, '../downloads/README.md');
      if (section.apkBeta) html += renderDownloadChannel(section.apkBeta, '../downloads/README.md');
      html += '</div>';
    } else if (section.version) {
      html += '<p class="app-version-meta">Version ' + esc(section.version);
      if (section.build != null && section.build !== '') html += ' (build ' + esc(String(section.build)) + ')';
      html += '</p>';
    }

    if (id === 'about') {
      var settings = getSettings();
      var c = settings.contact || section.contact || {};
      html += '<div class="about-contact-cards">';
      if (c.email) {
        html += '<a class="about-contact-card" href="mailto:' + esc(c.email) + '"><span class="about-contact-label">Email</span><span>' + esc(c.email) + '</span></a>';
      }
      if (c.github) {
        html += '<a class="about-contact-card" href="' + esc(c.github) + '" target="_blank" rel="noopener"><span class="about-contact-label">GitHub</span><span>' + esc(c.github.replace(/^https?:\/\//, '')) + '</span></a>';
      }
      if (c.linkedin) {
        html += '<a class="about-contact-card" href="' + esc(c.linkedin) + '" target="_blank" rel="noopener"><span class="about-contact-label">LinkedIn</span><span>Marcell van Niekerk</span></a>';
      }
      html += '</div>';
    }

    (section.blocks || []).forEach(function (b) {
      if (id === 'about' && b.id === 'contact') return;
      html += '<section class="content-block" id="' + esc(b.id || '') + '">';
      if (b.heading) html += '<h2>' + esc(b.heading) + '</h2>';
      if (b.content) {
        html += '<p>' + (id === 'about' ? linkifyContact(b.content) : esc(b.content)) + '</p>';
      }
      if (b.bullets && b.bullets.length) {
        html += '<ul>';
        b.bullets.forEach(function (li) {
          html += '<li>' + (id === 'about' ? linkifyContact(li) : esc(li)) + '</li>';
        });
        html += '</ul>';
      }
      html += '</section>';
    });
    mount.innerHTML = html;
  }

  var LANDING_GROUP_LIMIT = 10;

  function renderNavGroup(title, items) {
    if (!items.length) return '';
    var html = '<section class="landing-group"><h2 class="landing-group-title">' + esc(title) + '</h2><ol class="landing-nav">';
    function renderItem(item, index, extra) {
      var n = index + 1;
      var badge = item.status === 'beta' ? ' <span class="status-badge status-beta">Beta</span>' : '';
      var cls = extra ? ' class="landing-nav-extra"' : '';
      var hiddenAttr = extra ? ' hidden' : '';
      if (item.available && item.file) {
        return '<li' + cls + hiddenAttr + '><a href="sections/' + item.file + '"><span class="landing-nav-label">' + n + '. ' + esc(item.label) + '</span>' + badge + '</a></li>';
      }
      return '<li class="unavailable' + (extra ? ' landing-nav-extra' : '') + '"' + hiddenAttr + '><span class="landing-nav-label">' + n + '. ' + esc(item.label) + '</span>' + badge + ' <em>(coming soon)</em></li>';
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

  function renderLandingNav() {
    var mount = document.querySelector('[data-portal-landing-nav]');
    if (!mount) return;
    var groups = partitionNav();
    var html = '';
    html += renderNavGroup('Mobile apps', groups.mobile);
    html += renderNavGroup('Websites', groups.websites);
    html += renderNavGroup('Tools', groups.tools);
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
    var c = getSettings().contact || {};
    var parts = [];
    if (c.email) parts.push('<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>');
    if (c.github) parts.push('<a href="' + esc(c.github) + '" target="_blank" rel="noopener">GitHub</a>');
    if (c.linkedin) parts.push('<a href="' + esc(c.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>');
    mount.innerHTML = parts.length ? parts.join('<span class="landing-footer-sep" aria-hidden="true">·</span>') : '';
  }

  function init() {
    if (isDedicationPage()) document.body.classList.add('dedication-page');
    renderToolbar();
    renderSidebar();
    renderSection();
    renderLandingNav();
    renderContactFooter();
    var settings = getSettings();
    var tagline = document.querySelector('[data-portal-tagline]');
    if (tagline && settings.tagline) tagline.textContent = settings.tagline;
    var landingTitle = document.querySelector('[data-portal-title]');
    if (landingTitle && settings.portalName) landingTitle.textContent = settings.portalName;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
