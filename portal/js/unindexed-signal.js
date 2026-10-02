(function (root) {
  'use strict';

  // Two independent marks, plus either glued order.
  // Digests only — the phrases themselves are not stored here.
  var MARK_A = '6edcd602be95d29ea587a62958738ce294d0a616d7d5b4d860b042be7ffe44a2';
  var MARK_B = 'df75e2792285148c8fe3a21a0b3ea4294b860e534ea6da8c66e22be3a353ff3d';
  var EITHER = [
    '4aa7e33f0b7de50c39fed9eb5d1e3c1d9540be6456e06100947c83f29a860fa2',
    '8f7a2d1b7388c817235aadc78cbbcdb2ff6973ef25274a7d69bb83630de4815b'
  ];

  function normalize(raw) {
    return String(raw || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/[^a-z]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function candidates(normalized) {
    if (!normalized) return [];
    var tokens = normalized.split(' ');
    var list = tokens.slice();
    var i;
    for (i = 0; i < tokens.length - 1; i++) {
      list.push(tokens[i] + tokens[i + 1]);
    }
    return list;
  }

  function hex(buffer) {
    var view = new Uint8Array(buffer);
    var out = '';
    var i;
    for (i = 0; i < view.length; i++) {
      out += view[i].toString(16).padStart(2, '0');
    }
    return out;
  }

  function digest(text) {
    var subtle = (typeof crypto !== 'undefined' && crypto.subtle) ? crypto.subtle : null;
    if (!subtle || typeof TextEncoder === 'undefined') {
      return Promise.reject(new Error('digest unavailable'));
    }
    return subtle.digest('SHA-256', new TextEncoder().encode(text)).then(hex);
  }

  function matches(raw) {
    var normalized = normalize(raw);
    var list = candidates(normalized);
    if (!list.length) return Promise.resolve(false);
    return Promise.all(list.map(digest)).then(function (digests) {
      var found = {};
      digests.forEach(function (value) { found[value] = true; });
      if (EITHER.some(function (value) { return found[value]; })) return true;
      return !!(found[MARK_A] && found[MARK_B]);
    }).catch(function () {
      return false;
    });
  }

  root.UnindexedSignal = {
    matches: matches,
    page: 'unindexed.html'
  };
})(typeof window !== 'undefined' ? window : this);
