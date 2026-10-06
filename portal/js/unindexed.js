(function () {
  'use strict';

  var live = null;

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

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function fill(parent, nodes) {
    parent.replaceChildren.apply(parent, nodes.filter(Boolean));
  }

  function fromMarkup(markup) {
    var template = document.createElement('template');
    template.innerHTML = markup.trim();
    return template.content.firstElementChild;
  }

  function lineNodes(lines, className) {
    return (lines || []).map(function (line) {
      return el('p', className, line);
    });
  }

  function openingNodes(lines) {
    return (lines || []).map(function (line, index) {
      var className = 'unindexed-line';
      if (index === 0) className += ' is-lead';
      else if (index === 1) className += ' is-strong';
      else if (String(line).toLowerCase().indexOf('not yet') !== -1) className += ' is-accent';
      return el('p', className, line);
    });
  }

  function copyBlock(lines, className) {
    var block = el('div', 'unindexed-copy');
    fill(block, lineNodes(lines, className || 'unindexed-line'));
    return block;
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
    var scene = el('div', 'unindexed-scene');
    scene.setAttribute('aria-hidden', 'true');
    scene.append(el('div', 'unindexed-glow'), el('span', 'unindexed-firefly'));

    var panel = el('div', 'unindexed-panel');
    panel.tabIndex = -1;
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');

    var room = el('div', 'unindexed-room');
    room.setAttribute('data-stage', this.stage);
    room.setAttribute('data-confirmed', 'false');
    room.append(scene, panel);

    this.mount.replaceChildren(room);
    this.root = room;
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

  Room.prototype.statusNode = function (value) {
    var node = el('p', 'unindexed-status');
    node.append(el('span', '', this.cfg.statusLabel), document.createTextNode(' ' + value));
    return node;
  };

  Room.prototype.returnLink = function () {
    var link = el('a', 'unindexed-btn unindexed-return', this.cfg.returnLabel);
    link.href = denHref();
    return link;
  };

  Room.prototype.actionRow = function (nodes) {
    var row = el('div', 'unindexed-actions');
    fill(row, nodes);
    return row;
  };

  Room.prototype.choiceButtons = function () {
    var yes = el('button', 'unindexed-btn unindexed-yes', this.cfg.yesLabel);
    var no = el('button', 'unindexed-btn unindexed-no', this.cfg.noLabel);
    yes.type = 'button';
    no.type = 'button';
    return this.actionRow([yes, no]);
  };

  Room.prototype.renderNotYet = function () {
    var cfg = this.cfg;
    var copy = el('div', 'unindexed-copy');
    fill(copy, openingNodes(cfg.lines));

    var ask = el('div', 'unindexed-ask');
    ask.append(
      el('p', 'unindexed-wait', cfg.wait),
      el('p', 'unindexed-question', cfg.question),
      this.choiceButtons()
    );

    fill(this.panel(), [
      el('h1', '', cfg.kicker),
      fromMarkup(FOX_MARK),
      copy,
      this.statusNode(cfg.statusValue),
      fromMarkup(PEAKS),
      el('p', 'unindexed-note', cfg.statusNote),
      fromMarkup(LEAF_RULE),
      ask
    ]);
    this.focusPanel();
  };

  Room.prototype.renderNo = function () {
    fill(this.panel(), [
      el('h1', '', this.cfg.kicker),
      copyBlock(this.cfg.noLines),
      this.actionRow([this.returnLink()])
    ]);
    this.focusPanel();
  };

  Room.prototype.renderYes = function () {
    fill(this.panel(), [
      el('h1', '', this.cfg.kicker),
      copyBlock(this.cfg.yesLines)
    ]);
    this.focusPanel();
  };

  Room.prototype.renderPending = function () {
    if (this.root) this.root.classList.remove('is-checking');
    var pending = el('div', 'unindexed-pending');
    fill(pending, lineNodes(this.cfg.pendingLines, 'unindexed-line'));
    fill(this.panel(), [
      el('h1', '', this.cfg.kicker),
      copyBlock(this.cfg.yesLines),
      pending,
      this.statusNode(this.cfg.pendingStatus),
      this.actionRow([this.returnLink()])
    ]);
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
      this.panel().appendChild(this.actionRow([this.returnLink()]));
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
