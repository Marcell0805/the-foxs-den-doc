(function () {
  'use strict';

  var live = null;

  function esc(t) {
    var d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function denHref() {
    return document.body.getAttribute('data-nav-scope') === 'section' ? '../index.html' : 'index.html';
  }

  function stages() {
    var src = (window.UnindexedVerification && window.UnindexedVerification.stages) || {};
    return {
      NOT_YET: src.NOT_YET || 'NOT_YET',
      VERIFICATION_ATTEMPT: src.VERIFICATION_ATTEMPT || 'VERIFICATION_ATTEMPT',
      HUNTRESS_CONFIRMED: src.HUNTRESS_CONFIRMED || 'HUNTRESS_CONFIRMED',
      FUTURE_UNLOCKED: src.FUTURE_UNLOCKED || 'FUTURE_UNLOCKED'
    };
  }

  function defaultRoom() {
    return {
      kicker: 'The Den // Unindexed',
      lines: [
        'Well... this is interesting.',
        'Huntress detected.',
        'You found something that isn\'t quite ready yet.',
        'There are plans for this particular name...',
        '...but not yet, my dear Huntress.',
        'The Fox is still working on it.'
      ],
      statusLabel: 'Status',
      statusValue: 'Not yet',
      statusNote: 'Some things need a little more time before they become real.',
      wait: 'Wait...',
      question: 'Are you actually her?',
      yesLabel: 'Yes',
      noLabel: 'No',
      noLines: [
        'Oh... not the wife yet, I see.',
        'Strange.',
        'The Fox could have sworn otherwise. 🦊'
      ],
      yesLines: [
        'Oh.',
        'You actually are.',
        'Interesting.',
        'Let me verify that...'
      ],
      pendingLines: [
        'The check has started.',
        'Nothing is confirmed.',
        'The Fox will need more than a yes.'
      ],
      pendingStatus: 'Unconfirmed',
      returnLabel: 'Return to the Den'
    };
  }

  function mergeRoom(section) {
    var base = defaultRoom();
    var extra = (section && section.room) || {};
    Object.keys(extra).forEach(function (key) {
      if (extra[key] != null) base[key] = extra[key];
    });
    return base;
  }

  function linesHtml(lines, className) {
    return (lines || []).map(function (line) {
      return '<p class="' + className + '">' + esc(line) + '</p>';
    }).join('');
  }

  function openingLines(lines) {
    return (lines || []).map(function (line, i) {
      var cls = 'unindexed-line';
      if (i === 0) cls += ' is-lead';
      else if (i === 1) cls += ' is-strong';
      else if (String(line).toLowerCase().indexOf('not yet') !== -1) cls += ' is-accent';
      return '<p class="' + cls + '">' + esc(line) + '</p>';
    }).join('');
  }

  var FOX_MARK =
    '<svg class="unindexed-mark" viewBox="0 0 44 30" width="36" height="24" aria-hidden="true">' +
      '<path fill="#c4a36a" d="M7 22 L13 5 L18 15 L22 9 L26 15 L31 5 L37 22 C30 27 14 27 7 22Z"/>' +
      '<circle cx="17.2" cy="17.2" r="1.15" fill="#f6f1e6"/>' +
      '<circle cx="26.8" cy="17.2" r="1.15" fill="#f6f1e6"/>' +
      '<path fill="#f6f1e6" d="M20.2 19.2h3.6L22 22.2z"/>' +
    '</svg>';

  var PEAKS =
    '<svg class="unindexed-peaks" viewBox="0 0 72 22" width="58" height="18" aria-hidden="true">' +
      '<path fill="none" stroke="#c4a36a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" d="M4 20 L16 8 L24 15 L36 3 L46 14 L56 7 L68 20"/>' +
    '</svg>';

  var LEAF_RULE =
    '<div class="unindexed-rule" aria-hidden="true">' +
      '<span></span>' +
      '<svg viewBox="0 0 20 16" width="16" height="13"><path fill="#c4a36a" d="M10 1.2C14.2 4 16.4 8 15.4 12.2 12.6 8.4 11.2 5.6 10 3.4 8.8 5.6 7.4 8.4 4.6 12.2 3.6 8 5.8 4 10 1.2z"/><path fill="none" stroke="#f4ead9" stroke-width="0.7" d="M10 3.6 V13"/></svg>' +
      '<span></span>' +
    '</div>';

  function Room(mount, section) {
    this.mount = mount;
    this.section = section;
    this.cfg = mergeRoom(section);
    this.stages = stages();
    this.stage = this.stages.NOT_YET;
    this.confirmed = false;
    this.chosen = false;
    this.reduceMotion = prefersReducedMotion();
    this.ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this.signal = this.ac ? { signal: this.ac.signal } : {};
    this.root = null;
  }

  Room.prototype.mark = function () {
    if (!this.root) return;
    this.root.setAttribute('data-stage', this.stage);
    this.root.setAttribute('data-confirmed', this.confirmed ? 'true' : 'false');
  };

  Room.prototype.start = function () {
    this.renderShell();
    this.renderNotYet();
    this.bind();
  };

  Room.prototype.destroy = function () {
    if (this.ac) this.ac.abort();
    if (this.mount) this.mount.innerHTML = '';
    document.body.classList.remove('unindexed-active');
    this.root = null;
  };

  Room.prototype.renderShell = function () {
    this.mount.innerHTML =
      '<div class="unindexed-room" data-stage="' + esc(this.stage) + '" data-confirmed="false">' +
        '<div class="unindexed-scene" aria-hidden="true">' +
          '<div class="unindexed-glow"></div>' +
          '<span class="unindexed-firefly"></span>' +
        '</div>' +
        '<div class="unindexed-panel" tabindex="-1" role="status" aria-live="polite"></div>' +
      '</div>';
    this.root = this.mount.querySelector('.unindexed-room');
    document.body.classList.add('unindexed-active');
    this.mark();
  };

  Room.prototype.panel = function () {
    return this.root.querySelector('.unindexed-panel');
  };

  Room.prototype.focusPanel = function () {
    var panel = this.panel();
    if (panel && panel.focus) {
      try { panel.focus({ preventScroll: true }); } catch (err) { panel.focus(); }
    }
  };

  Room.prototype.statusHtml = function (value) {
    return '<p class="unindexed-status"><span>' + esc(this.cfg.statusLabel) + '</span> ' + esc(value) + '</p>';
  };

  Room.prototype.returnHtml = function () {
    return '<a class="unindexed-btn unindexed-return" href="' + esc(denHref()) + '">' + esc(this.cfg.returnLabel) + '</a>';
  };

  Room.prototype.renderNotYet = function () {
    var cfg = this.cfg;
    this.panel().innerHTML =
      '<h1>' + esc(cfg.kicker) + '</h1>' +
      FOX_MARK +
      '<div class="unindexed-copy">' + openingLines(cfg.lines) + '</div>' +
      this.statusHtml(cfg.statusValue) +
      PEAKS +
      '<p class="unindexed-note">' + esc(cfg.statusNote) + '</p>' +
      LEAF_RULE +
      '<div class="unindexed-ask">' +
        '<p class="unindexed-wait">' + esc(cfg.wait) + '</p>' +
        '<p class="unindexed-question">' + esc(cfg.question) + '</p>' +
        '<div class="unindexed-actions">' +
          '<button type="button" class="unindexed-btn unindexed-yes">' + esc(cfg.yesLabel) + '</button>' +
          '<button type="button" class="unindexed-btn unindexed-no">' + esc(cfg.noLabel) + '</button>' +
        '</div>' +
      '</div>';
    this.focusPanel();
  };

  Room.prototype.renderNo = function () {
    this.panel().innerHTML =
      '<h1>' + esc(this.cfg.kicker) + '</h1>' +
      '<div class="unindexed-copy">' + linesHtml(this.cfg.noLines, 'unindexed-line') + '</div>' +
      '<div class="unindexed-actions">' + this.returnHtml() + '</div>';
    this.focusPanel();
  };

  Room.prototype.renderYes = function () {
    this.panel().innerHTML =
      '<h1>' + esc(this.cfg.kicker) + '</h1>' +
      '<div class="unindexed-copy">' + linesHtml(this.cfg.yesLines, 'unindexed-line') + '</div>';
    this.focusPanel();
  };

  Room.prototype.renderPending = function () {
    if (this.root) this.root.classList.remove('is-checking');
    this.panel().innerHTML =
      '<h1>' + esc(this.cfg.kicker) + '</h1>' +
      '<div class="unindexed-copy">' + linesHtml(this.cfg.yesLines, 'unindexed-line') + '</div>' +
      '<div class="unindexed-pending">' + linesHtml(this.cfg.pendingLines, 'unindexed-line') + '</div>' +
      this.statusHtml(this.cfg.pendingStatus) +
      '<div class="unindexed-actions">' + this.returnHtml() + '</div>';
    this.focusPanel();
  };

  Room.prototype.bind = function () {
    var self = this;
    var opts = this.signal;
    this.root.addEventListener('click', function (e) {
      if (self.chosen) return;
      if (e.target.closest('.unindexed-yes')) self.chooseYes();
      else if (e.target.closest('.unindexed-no')) self.chooseNo();
    }, opts);
  };

  Room.prototype.chooseNo = function () {
    this.chosen = true;
    this.stage = this.stages.NOT_YET;
    this.confirmed = false;
    this.mark();
    if (this.root) this.root.classList.add('is-no');
    this.renderNo();
  };

  Room.prototype.chooseYes = function () {
    var self = this;
    var stageList = this.stages;
    this.chosen = true;
    this.stage = stageList.VERIFICATION_ATTEMPT;
    this.confirmed = false;
    this.mark();
    if (this.root) this.root.classList.add('is-checking');
    this.renderYes();

    var verify = window.UnindexedVerification && window.UnindexedVerification.verify;
    var resultPromise = Promise.resolve().then(function () {
      if (typeof verify !== 'function') {
        return { ok: false, confirmed: false, stage: stageList.VERIFICATION_ATTEMPT };
      }
      return verify({ stage: stageList.VERIFICATION_ATTEMPT, claimed: true });
    }).catch(function () {
      return { ok: false, confirmed: false, stage: stageList.VERIFICATION_ATTEMPT };
    });

    var beat = new Promise(function (resolve) {
      window.setTimeout(resolve, self.reduceMotion ? 0 : 2800);
    });

    Promise.all([resultPromise, beat]).then(function (pair) {
      if (!self.root) return;
      var result = pair[0] || {};
      var confirmed = result.ok === true &&
        result.confirmed === true &&
        result.stage === stageList.HUNTRESS_CONFIRMED;
      if (confirmed) {
        self.enterConfirmed();
        return;
      }
      self.stage = stageList.VERIFICATION_ATTEMPT;
      self.confirmed = false;
      self.mark();
      self.renderPending();
    });
  };

  Room.prototype.enterConfirmed = function () {
    this.stage = this.stages.HUNTRESS_CONFIRMED;
    this.confirmed = true;
    this.mark();
    if (this.root) this.root.classList.remove('is-checking');
    // Placeholder. Confirmed copy and FUTURE_UNLOCKED are not rendered yet.
    if (this.panel() && !this.panel().querySelector('.unindexed-return')) {
      var actions = document.createElement('div');
      actions.className = 'unindexed-actions';
      actions.innerHTML = this.returnHtml();
      this.panel().appendChild(actions);
    }
  };

  window.UnindexedRoom = {
    start: function (mount, section) {
      if (live) live.destroy();
      live = new Room(mount, section);
      live.start();
    },
    destroy: function () {
      if (!live) return;
      live.destroy();
      live = null;
    }
  };
})();
