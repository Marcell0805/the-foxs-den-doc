(function () {
  'use strict';

  var fuse = null;
  var modal = null;

  var SECRET_PAGES = {
    'myhuntress': 'my-huntress.html',
    'my huntress': 'my-huntress.html',
    'drakenberg': 'berg-awaits.html',
    'drakensberg': 'berg-awaits.html',
    'ek is lief vir jou': 'ek-is-lief-vir-jou.html'
  };

  var STATUS_LABELS = {
    live: 'Live',
    in_progress: 'In progress'
  };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || 'Planned';
  }

  function sectionHref(url) {
    var href = url.indexOf('sections/') === 0 ? url : 'sections/' + url;
    if (document.body.getAttribute('data-nav-scope') !== 'landing') {
      href = '../' + href;
    }
    return href;
  }

  function initFuse() {
    var index = window.DEN_SEARCH_INDEX || [];
    if (typeof Fuse === 'undefined') return;
    fuse = new Fuse(index, {
      keys: ['title', 'text', 'section', 'tags'],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true
    });
  }

  function renderResults(query, container) {
    container.replaceChildren();

    if (!fuse || !query.trim()) {
      container.append(el('p', 'search-hint', 'Type to search vision, architecture, PetroMan, alerts, M1…'));
      return;
    }

    var results = fuse.search(query, { limit: 12 });
    if (!results.length) {
      container.append(el('p', 'search-empty', 'No results. Try: telemetry, fuel, MVP, integration.'));
      return;
    }

    var list = el('ul', 'search-results');
    results.forEach(function (result) {
      var item = result.item;
      var link = el('a');
      link.href = sectionHref(item.url);
      link.append(
        el('span', 'search-result-title', item.title),
        el('span', 'search-result-meta', item.section + ' · ' + statusLabel(item.status))
      );
      var row = el('li');
      row.append(link);
      list.append(row);
    });
    container.append(list);
  }

  function openSecret(secretPage) {
    close();
    var onLanding = document.body.getAttribute('data-nav-scope') === 'landing';
    location.href = onLanding ? 'sections/' + secretPage : secretPage;
  }

  function normalizedQuery(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function ensureModal() {
    if (modal) return modal;

    var input = el('input', 'search-modal-input');
    input.type = 'search';
    input.id = 'search-modal-input';
    input.placeholder = 'Search portal… (Ctrl+K)';
    input.autocomplete = 'off';

    var results = el('div', 'search-modal-results');
    results.id = 'search-modal-results';

    var card = el('div', 'search-modal-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Search portal');
    card.append(
      input,
      results,
      el('p', 'search-modal-footer no-print', 'Powered by local index · no server required')
    );

    var backdrop = el('div', 'search-modal-backdrop');
    backdrop.setAttribute('data-close', '');
    backdrop.addEventListener('click', close);

    modal = el('div', 'search-modal');
    modal.id = 'search-modal';
    modal.hidden = true;
    modal.append(backdrop, card);
    document.body.appendChild(modal);

    input.addEventListener('input', function () {
      renderResults(input.value, results);
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Enter') return;

      var query = normalizedQuery(input.value);
      var secretPage = SECRET_PAGES[query] || SECRET_PAGES[query.replace(/\s+/g, '')];
      if (secretPage) {
        event.preventDefault();
        openSecret(secretPage);
        return;
      }

      var signal = window.UnindexedSignal;
      if (!signal || typeof signal.matches !== 'function') return;
      event.preventDefault();
      signal.matches(String(input.value || '')).then(function (hit) {
        if (hit) openSecret(signal.page);
      });
    });

    return modal;
  }

  function open() {
    ensureModal();
    modal.hidden = false;
    var input = document.getElementById('search-modal-input');
    input.value = '';
    renderResults('', document.getElementById('search-modal-results'));
    setTimeout(function () { input.focus(); }, 50);
  }

  function close() {
    if (modal) modal.hidden = true;
  }

  document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      open();
    }
  });

  window.DenSearch = { open: open, close: close };

  function initLandingSearch() {
    var landing = document.getElementById('landing-search');
    if (!landing) return;
    landing.addEventListener('focus', function () { open(); landing.blur(); });
    landing.addEventListener('click', function () { open(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initFuse();
      initLandingSearch();
    });
  } else {
    initFuse();
    initLandingSearch();
  }
})();
