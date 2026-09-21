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

  function isCoarsePointer() {
    return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function assetsPrefix() {
    return document.body.getAttribute('data-nav-scope') === 'section' ? '../assets/' : 'assets/';
  }

  function nl(text) {
    return esc(text).replace(/\n/g, '<br>');
  }

  function defaultQuest() {
    return {
      maxDodges: 8,
      dodgePadding: 14,
      dodgeArmMs: 1600,
      otterXP: 10,
      enableSound: false,
      heading: 'THE BERG AWAITS',
      subtitle: 'A secret expedition has been prepared...',
      intro: [
        'Huntress...',
        'The mountains are waiting.',
        'The Fox has prepared the expedition.'
      ],
      question: 'Are you excited for the Drakensberg?',
      yesLabel: 'YES! 🏹',
      noLabel: 'No... 🦊',
      noLabels: [
        'No... 🦊',
        'Still no.',
        'Not excited.',
        'I said no.',
        'Absolutely not.',
        'Nope.',
        'The Huntress declines.'
      ],
      noDialogue: [],
      dodgeMessages: [],
      acceptedTitle: 'QUEST ACCEPTED',
      acceptedBody: 'The Huntress has accepted the expedition.',
      acceptedItems: [],
      foxLines: [],
      sunsetKicker: 'The light is changing',
      sunsetTitle: 'The Berg keeps its promises',
      sunsetBody: 'The river is still talking. The escarpment is catching the last of the sun.',
      nightLine: 'Some adventures are worth looking up for. ✨',
      nightBody: 'Look up. The sky is not empty.',
      otterFound: {
        title: 'OTTER DISCOVERED!',
        body: 'The Huntress has found one of the rare creatures of the Berg.',
        xp: '+10 Huntress XP'
      },
      otterAgain: 'The otter refuses to elaborate.',
      constellation: {
        title: 'A constellation has been discovered.',
        body: 'Even the sky knows about the Fox and Huntress.'
      },
      allFoundTitle: 'Every creature found.',
      allFoundLine: "You've got the eyes of a true Huntress.",
      allFoundWaitLine: "Wait until it's night for a surprise...",
      finaleTitle: 'THE ADVENTURE AWAITS',
      finaleHeading: 'DRAKENSBERG EXPEDITION',
      finalePlace: '📍 Kezlyn Farm Cottages',
      finaleItems: [],
      finaleClose: [
        'Some adventures are planned.',
        'Some adventures just happen.',
        'This one is ours.'
      ],
      replayLabel: '↻ Replay the Adventure',
      returnLabel: '← Return to the Den'
    };
  }

  function mergeQuest(section) {
    var base = defaultQuest();
    var extra = (section && section.quest) || {};
    Object.keys(extra).forEach(function (key) {
      if (extra[key] != null) base[key] = extra[key];
    });
    return base;
  }

  function Quest(mount, section) {
    this.mount = mount;
    this.section = section;
    this.cfg = mergeQuest(section);
    this.timers = [];
    this.raf = 0;
    this.ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this.signal = this.ac ? { signal: this.ac.signal } : {};
    this.reduceMotion = prefersReducedMotion();
    this.coarse = isCoarsePointer();
    this.root = null;
    this.yesBtn = null;
    this.toastTimer = 0;
    this.resetState();
  }

  Quest.prototype.resetState = function () {
    this.phase = 'day';
    this.dodgeCount = 0;
    this.noIndex = 0;
    this.foxIndex = 0;
    this.completed = false;
    this.otterDived = false;
    this.celebrated = false;
    this.allFoundTeased = false;
    this.dodgeArmed = false;
    this.pointerMoved = false;
    this.lastPointer = null;
    this.discoveries = { fox: false, otter: false, eagle: false, butterfly: false, constellation: false };
  };

  Quest.prototype.after = function (ms, fn) {
    var id = window.setTimeout(fn, this.reduceMotion ? 0 : ms);
    this.timers.push(id);
    return id;
  };

  Quest.prototype.clearTimers = function () {
    this.timers.forEach(function (id) { window.clearTimeout(id); });
    this.timers = [];
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = 0;
    if (this.raf) window.cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  Quest.prototype.start = function () {
    this.renderShell();
    this.bind();
    this.showIntro();
    var self = this;
    this.after(this.cfg.dodgeArmMs || 1600, function () {
      self.dodgeArmed = true;
    });
    this.after(2800, this.showFoxLine.bind(this));
  };

  Quest.prototype.destroy = function () {
    this.clearTimers();
    if (this.ac) this.ac.abort();
    if (this.mount) this.mount.innerHTML = '';
    document.body.classList.remove('berg-quest-active');
    this.root = null;
    this.yesBtn = null;
  };

  Quest.prototype.renderShell = function () {
    var foxSrc = assetsPrefix() + 'berg/fox.jpg';
    var otterSrc = assetsPrefix() + 'berg/otter.jpg';
    var eagleSrc = assetsPrefix() + 'berg/eagle.png';
    var butterflySrc = assetsPrefix() + 'berg/butterfly.png';
    var landSrc = assetsPrefix() + 'berg/landscape.jpg';
    var stars = '';
    var i;
    for (i = 0; i < 48; i++) {
      stars += '<span class="berg-star' + (i % 7 === 0 ? ' is-bright' : '') +
        '" style="left:' + (4 + (i * 19) % 92) + '%;top:' + (6 + (i * 13) % 42) + '%"></span>';
    }

    var html = '' +
      '<div class="berg-quest" data-phase="day">' +
        '<div class="berg-stage">' +
          '<div class="berg-sky" aria-hidden="true"></div>' +
          '<div class="berg-backdrop" aria-hidden="true">' +
            '<img src="' + esc(landSrc) + '" alt="">' +
            '<div class="berg-tint"></div>' +
          '</div>' +
          '<div class="berg-sun" aria-hidden="true"></div>' +
          '<div class="berg-moon" aria-hidden="true"></div>' +
          '<div class="berg-stars" aria-hidden="true">' + stars + '</div>' +
          '<button type="button" class="berg-constellation" aria-label="A faint constellation">' +
            '<svg viewBox="0 0 160 110" width="160" height="110" aria-hidden="true">' +
              '<g fill="#f7f3e8" stroke="none">' +
                '<circle cx="28" cy="38" r="2.4"/>' +
                '<circle cx="46" cy="22" r="2.2"/>' +
                '<circle cx="62" cy="34" r="2.6"/>' +
                '<circle cx="52" cy="52" r="2.1"/>' +
                '<circle cx="36" cy="58" r="2"/>' +
                '<circle cx="88" cy="46" r="2.3"/>' +
                '<circle cx="108" cy="34" r="2.1"/>' +
                '<circle cx="124" cy="52" r="2.4"/>' +
                '<circle cx="112" cy="68" r="2"/>' +
              '</g>' +
              '<g class="berg-constellation-line" fill="none" stroke="#f7f3e8" stroke-width="1" opacity="0">' +
                '<path d="M28 38 L46 22 L62 34 L52 52 L36 58 L28 38"/>' +
                '<path d="M62 34 L88 46 L108 34 L124 52 L112 68"/>' +
              '</g>' +
            '</svg>' +
          '</button>' +
          '<div class="berg-cloud berg-cloud-a" aria-hidden="true"></div>' +
          '<div class="berg-cloud berg-cloud-b" aria-hidden="true"></div>' +
          '<div class="berg-cloud berg-cloud-c" aria-hidden="true"></div>' +
          '<div class="berg-cloud berg-cloud-d" aria-hidden="true"></div>' +
          '<button type="button" class="berg-eagle" aria-label="An eagle over the peaks">' +
            '<span class="berg-eagle-face">' +
              '<img src="' + esc(eagleSrc) + '" alt="">' +
            '</span>' +
          '</button>' +
          '<span class="berg-forest-perch" aria-hidden="true"></span>' +
          '<button type="button" class="berg-butterfly" aria-label="A butterfly in the grass">' +
            '<img src="' + esc(butterflySrc) + '" alt="">' +
          '</button>' +
          '<span class="berg-firefly" style="left:18%;bottom:28%;animation-delay:-1s"></span>' +
          '<span class="berg-firefly" style="left:42%;bottom:34%;animation-delay:-2.4s"></span>' +
          '<span class="berg-firefly" style="left:68%;bottom:26%;animation-delay:-3.1s"></span>' +
          '<span class="berg-firefly" style="left:81%;bottom:38%;animation-delay:-0.6s"></span>' +
          '<button type="button" class="berg-fox" aria-label="A fox on the hillside">' +
            '<img src="' + esc(foxSrc) + '" alt="">' +
          '</button>' +
          '<button type="button" class="berg-otter" aria-label="An otter in the water">' +
            '<img src="' + esc(otterSrc) + '" alt="">' +
          '</button>' +
          '<div class="berg-fireworks" aria-hidden="true"></div>' +
        '</div>' +
        '<aside class="berg-hud" aria-label="Berg discoveries">' +
          '<h2>Berg discoveries</h2>' +
          '<ul>' +
            '<li data-disc="fox" class="is-hidden">🦊 ?</li>' +
            '<li data-disc="otter" class="is-hidden">🦦 ?</li>' +
            '<li data-disc="eagle" class="is-hidden">🦅 ?</li>' +
            '<li data-disc="butterfly" class="is-hidden">🦋 ?</li>' +
          '</ul>' +
        '</aside>' +
        '<div class="berg-toast" role="status" aria-live="polite"></div>' +
        '<div class="berg-narrator" role="status" aria-live="polite"></div>' +
        '<div class="berg-panel"></div>' +
        '<button type="button" class="berg-btn berg-yes">' + esc(this.cfg.yesLabel) + '</button>' +
      '</div>';

    this.mount.innerHTML = html;
    this.root = this.mount.querySelector('.berg-quest');
    this.yesBtn = this.mount.querySelector('.berg-yes');
    document.body.classList.add('berg-quest-active');
    this.parkYes();
  };

  Quest.prototype.panel = function () {
    return this.root.querySelector('.berg-panel');
  };

  Quest.prototype.setPhase = function (phase) {
    this.phase = phase;
    if (this.root) this.root.setAttribute('data-phase', phase);
  };

  Quest.prototype.showIntro = function () {
    var cfg = this.cfg;
    var intro = (cfg.intro || []).map(function (line) {
      return '<p>' + esc(line) + '</p>';
    }).join('');
    this.panel().innerHTML =
      '<p class="berg-kicker">🏔️ Secret expedition</p>' +
      '<h1>' + esc(cfg.heading) + '</h1>' +
      '<p class="berg-subtitle">' + esc(cfg.subtitle) + '</p>' +
      '<div class="berg-copy">' +
        intro +
        '<p class="berg-question">' + esc(cfg.question) + '</p>' +
      '</div>' +
      '<div class="berg-actions">' +
        '<span class="berg-yes-slot" aria-hidden="true"></span>' +
        '<button type="button" class="berg-btn berg-btn-no">' + esc(cfg.noLabel) + '</button>' +
      '</div>';
    this.parkYes();
    this.yesBtn.hidden = false;
    this.yesBtn.textContent = cfg.yesLabel;
    this.yesBtn.setAttribute('aria-label', cfg.yesLabel);
  };

  Quest.prototype.parkYes = function () {
    if (!this.yesBtn || !this.root) return;
    this.yesBtn.classList.remove('is-loose');
    this.yesBtn.style.left = '';
    this.yesBtn.style.top = '';
    var slot = this.root.querySelector('.berg-yes-slot');
    if (slot && slot.parentNode) {
      slot.parentNode.insertBefore(this.yesBtn, slot);
    }
  };

  Quest.prototype.showToast = function (title, body, extra) {
    var el = this.root.querySelector('.berg-toast');
    if (!el) return;
    var html = title ? '<strong>' + esc(title) + '</strong>' : '';
    if (body) html += '<div>' + nl(body) + '</div>';
    if (extra) html += '<div>' + esc(extra) + '</div>';
    el.innerHTML = html;
    el.classList.add('is-visible');
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    var self = this;
    this.toastTimer = window.setTimeout(function () {
      el.classList.remove('is-visible');
    }, 2800);
  };

  Quest.prototype.showFoxLine = function () {
    var lines = this.cfg.foxLines || [];
    if (this.foxIndex >= lines.length) return;
    var el = this.root.querySelector('.berg-narrator');
    if (!el) return;
    el.innerHTML = '<div class="berg-narrator-label">🦊 Fox</div><div>' + esc(lines[this.foxIndex]) + '</div>';
    el.classList.add('is-visible');
    this.foxIndex += 1;
    var self = this;
    this.after(4200, function () {
      if (el) el.classList.remove('is-visible');
    });
  };

  Quest.prototype.updateHud = function () {
    var map = { fox: '🦊', otter: '🦦', eagle: '🦅', butterfly: '🦋' };
    var self = this;
    Object.keys(map).forEach(function (key) {
      var li = self.root.querySelector('[data-disc="' + key + '"]');
      if (!li) return;
      if (self.discoveries[key]) {
        li.textContent = map[key] + ' ✓';
        li.classList.add('is-found');
        li.classList.remove('is-hidden');
      } else {
        li.textContent = map[key] + ' ?';
        li.classList.add('is-hidden');
        li.classList.remove('is-found');
      }
    });
  };

  Quest.prototype.discover = function (kind, toast) {
    if (this.discoveries[kind]) return false;
    this.discoveries[kind] = true;
    this.updateHud();
    if (toast) this.showToast(toast.title, toast.body, toast.xp);
    this.maybeCelebrate();
    return true;
  };

  Quest.prototype.poke = function (el) {
    if (!el || this.reduceMotion) return;
    if (el._bergPokeDone) {
      el.removeEventListener('animationend', el._bergPokeDone);
      el._bergPokeDone = null;
    }
    el.classList.remove('is-reacting');
    void el.offsetWidth;
    el.classList.add('is-reacting');
    var self = this;
    this.after(800, function () {
      if (el) el.classList.remove('is-reacting');
    });
  };

  Quest.prototype.remainingHint = function () {
    var names = [
      { key: 'fox', name: 'the fox' },
      { key: 'otter', name: 'the otter' },
      { key: 'eagle', name: 'the eagle' },
      { key: 'butterfly', name: 'the butterfly' }
    ];
    var left = [];
    var i;
    for (i = 0; i < names.length; i++) {
      if (!this.discoveries[names[i].key]) left.push(names[i].name);
    }
    if (!left.length) {
      if (this.phase === 'night' || this.phase === 'finale') return '';
      return this.cfg.allFoundWaitLine || "Wait until it's night for a surprise...";
    }
    if (left.length === 4) {
      return 'The grass, the water, the sky — all pretending to be empty.';
    }
    if (left.length === 1) {
      return 'Still missing ' + left[0] + '. Typical.';
    }
    if (left.length === 2) {
      return left[0] + ' and ' + left[1] + ' still have not waved.';
    }
    return left[0] + ', ' + left[1] + ' and ' + left[2] + ' still have not waved.';
  };

  Quest.prototype.speakFox = function (line, ms) {
    var el = this.root && this.root.querySelector('.berg-narrator');
    if (!el || !line) return;
    el.innerHTML = '<div class="berg-narrator-label">🦊 Fox</div><div>' + esc(line) + '</div>';
    el.classList.add('is-visible');
    this.after(ms || 4800, function () {
      if (el) el.classList.remove('is-visible');
    });
  };

  Quest.prototype.allCreaturesFound = function () {
    var keys = ['fox', 'otter', 'eagle', 'butterfly'];
    var i;
    for (i = 0; i < keys.length; i++) {
      if (!this.discoveries[keys[i]]) return false;
    }
    return true;
  };

  Quest.prototype.isNightSky = function () {
    return this.phase === 'night' || this.phase === 'finale';
  };

  Quest.prototype.maybeCelebrate = function () {
    if (!this.allCreaturesFound()) return;
    if (!this.isNightSky()) {
      if (this.allFoundTeased) return;
      this.allFoundTeased = true;
      this.speakFox(this.cfg.allFoundWaitLine || "Wait until it's night for a surprise...", 5600);
      return;
    }
    if (this.celebrated) return;
    this.celebrated = true;
    var self = this;
    this.after(700, function () {
      if (!self.root) return;
      self.launchFireworks();
      self.speakFox(self.cfg.allFoundLine || "You've got the eyes of a true Huntress.", 5600);
    });
  };

  Quest.prototype.launchFireworks = function () {
    var host = this.root && this.root.querySelector('.berg-fireworks');
    if (!host) return;
    host.innerHTML = '';
    host.classList.add('is-live');
    if (this.reduceMotion) {
      var self = this;
      this.after(2200, function () {
        host.classList.remove('is-live');
        host.innerHTML = '';
      });
      return;
    }
    var colors = ['#e0b15a', '#f4efe4', '#e08a45', '#7ec8e3', '#c45c3a', '#f6e38b', '#f27a7a'];
    var burst;
    var i;
    for (burst = 0; burst < 5; burst++) {
      var cx = 18 + (burst * 16) + (burst % 2 ? 8 : 0);
      var cy = 16 + ((burst * 11) % 28);
      for (i = 0; i < 18; i++) {
        var angle = (i / 18) * Math.PI * 2;
        var dist = 48 + (i % 5) * 14;
        var el = document.createElement('span');
        el.className = 'berg-spark';
        el.style.left = cx + '%';
        el.style.top = cy + '%';
        el.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        el.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        el.style.background = colors[(i + burst) % colors.length];
        el.style.color = colors[(i + burst) % colors.length];
        el.style.animationDelay = (burst * 0.22) + (i % 3) * 0.04 + 's';
        host.appendChild(el);
      }
    }
    var self = this;
    this.after(3600, function () {
      host.classList.remove('is-live');
      host.innerHTML = '';
    });
  };

  Quest.prototype.handleNo = function () {
    var lines = this.cfg.noDialogue || [];
    var item = lines[Math.min(this.noIndex, lines.length - 1)] || {
      title: 'Are you sure?',
      body: 'The mountains disagree.'
    };
    var labels = this.cfg.noLabels || [this.cfg.noLabel];
    this.noIndex += 1;
    var noLabel = labels[Math.min(this.noIndex, labels.length - 1)] || this.cfg.noLabel;
    this.dodgeArmed = false;
    this.panel().innerHTML =
      '<p class="berg-kicker">🏔️ Secret expedition</p>' +
      '<h1>' + esc(this.cfg.heading) + '</h1>' +
      '<p class="berg-question">' + esc(this.cfg.question) + '</p>' +
      '<div class="berg-copy berg-no-reply">' +
        '<p class="berg-no-title">' + esc(item.title) + '</p>' +
        '<p>' + nl(item.body) + '</p>' +
      '</div>' +
      '<div class="berg-actions">' +
        '<span class="berg-yes-slot" aria-hidden="true"></span>' +
        '<button type="button" class="berg-btn berg-btn-no">' + esc(noLabel) + '</button>' +
      '</div>';
    this.parkYes();
    var self = this;
    this.after(900, function () { self.dodgeArmed = true; });
    if (this.noIndex === 2) this.showFoxLine();
  };

  Quest.prototype.catchable = function () {
    return this.reduceMotion || this.dodgeCount >= this.cfg.maxDodges;
  };

  Quest.prototype.clampYes = function (x, y) {
    var btn = this.yesBtn;
    var pad = 10;
    var w = btn.offsetWidth || 140;
    var h = btn.offsetHeight || 48;
    var maxX = Math.max(pad, (this.root.clientWidth || window.innerWidth) - w - pad);
    var maxY = Math.max(pad, (this.root.clientHeight || window.innerHeight) - h - pad);
    return {
      x: Math.min(maxX, Math.max(pad, x)),
      y: Math.min(maxY, Math.max(pad, y))
    };
  };

  Quest.prototype.viewportToStage = function (x, y) {
    var r = this.root.getBoundingClientRect();
    return { x: x - r.left, y: y - r.top };
  };

  Quest.prototype.looseYes = function () {
    if (!this.yesBtn || !this.root) return;
    if (this.yesBtn.classList.contains('is-loose')) return;
    var rect = this.yesBtn.getBoundingClientRect();
    var local = this.viewportToStage(rect.left, rect.top);
    this.root.appendChild(this.yesBtn);
    this.yesBtn.classList.add('is-loose');
    this.yesBtn.style.left = local.x + 'px';
    this.yesBtn.style.top = local.y + 'px';
  };

  Quest.prototype.perchYesOn = function (sel) {
    var target = this.root && this.root.querySelector(sel);
    if (!target || !this.yesBtn) return false;
    this.looseYes();
    void this.yesBtn.offsetWidth;
    var t = target.getBoundingClientRect();
    var origin = this.root.getBoundingClientRect();
    var w = this.yesBtn.offsetWidth || 140;
    var h = this.yesBtn.offsetHeight || 48;
    var pos = this.clampYes(
      t.left - origin.left + t.width / 2 - w / 2,
      t.top - origin.top - h - 12
    );
    this.yesBtn.style.left = pos.x + 'px';
    this.yesBtn.style.top = pos.y + 'px';
    return true;
  };

  Quest.prototype.dodgeFrom = function (px, py) {
    if (!this.yesBtn || this.catchable()) return;
    var rect = this.yesBtn.getBoundingClientRect();
    this.looseYes();
    this.dodgeCount += 1;
    var msgs = this.cfg.dodgeMessages || [];
    var msg = msgs.length ? msgs[(this.dodgeCount - 1) % msgs.length] : '';
    if (msg) this.showToast('', msg);

    var perch = null;
    if (/otter/i.test(msg)) perch = '.berg-otter';
    else if (/fox/i.test(msg)) perch = '.berg-fox';
    else if (/forest/i.test(msg)) perch = '.berg-forest-perch';
    if (perch && this.perchYesOn(perch)) return;

    var angle = Math.atan2(rect.top + rect.height / 2 - py, rect.left + rect.width / 2 - px);
    if (!isFinite(angle)) angle = Math.random() * Math.PI * 2;
    var dist = 56 + this.dodgeCount * 22;
    var hop = this.viewportToStage(
      rect.left + Math.cos(angle) * dist,
      rect.top + Math.sin(angle) * dist
    );
    var pos = this.clampYes(hop.x, hop.y);
    this.yesBtn.style.left = pos.x + 'px';
    this.yesBtn.style.top = pos.y + 'px';
  };

  Quest.prototype.maybeDodgePointer = function (e) {
    if (this.completed || this.phase !== 'day' || this.catchable() || this.coarse) return;
    if (!this.yesBtn || this.yesBtn.hidden) return;
    if (!this.dodgeArmed) {
      this.lastPointer = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!this.pointerMoved) {
      if (!this.lastPointer) {
        this.lastPointer = { x: e.clientX, y: e.clientY };
        return;
      }
      var moved = Math.abs(e.clientX - this.lastPointer.x) + Math.abs(e.clientY - this.lastPointer.y);
      if (moved < 12) return;
      this.pointerMoved = true;
    }
    var rect = this.yesBtn.getBoundingClientRect();
    var pad = this.cfg.dodgePadding != null ? this.cfg.dodgePadding : 14;
    var near = e.clientX >= rect.left - pad &&
      e.clientX <= rect.right + pad &&
      e.clientY >= rect.top - pad &&
      e.clientY <= rect.bottom + pad;
    if (near) this.dodgeFrom(e.clientX, e.clientY);
  };

  Quest.prototype.isCreatureTarget = function (el) {
    return !!(el && el.closest && el.closest('.berg-fox, .berg-otter, .berg-eagle, .berg-butterfly, .berg-constellation'));
  };

  Quest.prototype.onYesIntent = function (e) {
    if (this.completed || this.phase !== 'day') return;
    if (e && this.isCreatureTarget(e.target)) return;
    if (this.catchable()) {
      this.acceptQuest();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.dodgeFrom(e.clientX || (window.innerWidth / 2), e.clientY || (window.innerHeight / 2));
  };

  Quest.prototype.acceptQuest = function () {
    if (this.completed) return;
    this.completed = true;
    this.setPhase('accepted');
    this.parkYes();
    this.yesBtn.hidden = true;
    var cfg = this.cfg;
    var items = (cfg.acceptedItems || []).map(function (it) {
      return '<li>' + esc(it) + '</li>';
    }).join('');
    this.panel().innerHTML =
      '<p class="berg-kicker">The expedition begins</p>' +
      '<h2>' + esc(cfg.acceptedTitle) + '</h2>' +
      '<p class="berg-subtitle">' + esc(cfg.acceptedBody) + '</p>' +
      '<ul class="berg-list">' + items + '</ul>' +
      '<p class="berg-hint">Look around the Berg while the light changes.</p>' +
      '<div class="berg-actions">' +
        '<button type="button" class="berg-btn berg-btn-ghost berg-continue">Continue →</button>' +
      '</div>';
    this.showFoxLine();
    var self = this;
    this.after(10000, function () { self.enterSunset(); });
  };

  Quest.prototype.enterSunset = function () {
    if (!this.completed) return;
    if (this.phase === 'sunset' || this.phase === 'night' || this.phase === 'finale') return;
    this.setPhase('sunset');
    var cfg = this.cfg;
    var hint = this.remainingHint();
    this.panel().innerHTML =
      '<p class="berg-kicker">' + esc(cfg.sunsetKicker || 'The light is changing') + '</p>' +
      '<h2>' + esc(cfg.sunsetTitle || 'The Berg keeps its promises') + '</h2>' +
      '<p class="berg-subtitle">' + esc(cfg.sunsetBody || 'The river is still talking. The escarpment is catching the last of the sun.') + '</p>' +
      (hint ? '<p class="berg-hint">' + esc(hint) + '</p>' : '') +
      '<div class="berg-actions">' +
        '<button type="button" class="berg-btn berg-btn-ghost berg-continue">Continue →</button>' +
      '</div>';
    this.showFoxLine();
    var self = this;
    this.after(14000, function () { self.enterNight(); });
  };

  Quest.prototype.enterNight = function () {
    if (!this.completed || this.phase !== 'sunset') return;
    this.setPhase('night');
    this.panel().innerHTML =
      '<p class="berg-kicker">Night on the Berg</p>' +
      '<h2>' + esc(this.cfg.nightLine) + '</h2>' +
      '<p class="berg-subtitle">' + esc(this.cfg.nightBody || 'Look up. The sky is not empty.') + '</p>' +
      '<div class="berg-actions">' +
        '<button type="button" class="berg-btn berg-btn-ghost berg-continue">Continue →</button>' +
      '</div>';
    this.showFoxLine();
    var self = this;
    this.after(1400, function () { self.maybeCelebrate(); });
    this.after(20000, function () { self.showFinale(); });
  };

  Quest.prototype.advancePhase = function () {
    if (!this.completed || this.phase === 'day') return;
    if (this.phase === 'accepted') this.enterSunset();
    else if (this.phase === 'sunset') this.enterNight();
    else if (this.phase === 'night') this.showFinale();
  };

  Quest.prototype.showFinale = function () {
    if (!this.completed || this.phase !== 'night') return;
    this.setPhase('finale');
    this.maybeCelebrate();
    this.showFoxLine();
    var cfg = this.cfg;
    var items = (cfg.finaleItems || []).map(function (it) {
      return '<li>' + esc(it) + '</li>';
    }).join('');
    var close = (cfg.finaleClose || []).map(function (line) {
      return '<p>' + esc(line) + '</p>';
    }).join('');
    this.panel().innerHTML =
      '<p class="berg-kicker">Drakensberg expedition</p>' +
      '<h1>' + esc(cfg.finaleTitle) + '</h1>' +
      '<p class="berg-subtitle">' + esc(cfg.finaleHeading) + '</p>' +
      '<p>' + esc(cfg.finalePlace) + '</p>' +
      '<ul class="berg-list">' + items + '</ul>' +
      '<div class="berg-close">' + close + '</div>' +
      '<p class="berg-hearts">🦊 ❤️ 🏹</p>' +
      '<div class="berg-actions">' +
        '<button type="button" class="berg-btn berg-replay">' + esc(cfg.replayLabel) + '</button>' +
        '<a class="berg-btn berg-btn-ghost berg-return" href="../index.html">' + esc(cfg.returnLabel) + '</a>' +
      '</div>';
  };

  Quest.prototype.bind = function () {
    var self = this;
    var root = this.root;
    var opts = this.signal;

    root.addEventListener('pointermove', function (e) {
      self.maybeDodgePointer(e);
    }, opts);

    this.yesBtn.addEventListener('pointerdown', function (e) {
      if (self.phase !== 'day' || self.catchable()) return;
      if (e.pointerType === 'touch' || e.pointerType === 'pen' || self.coarse) {
        e.preventDefault();
        self.onYesIntent(e);
      }
    }, opts);

    this.yesBtn.addEventListener('click', function (e) {
      self.onYesIntent(e);
    }, opts);

    this.yesBtn.addEventListener('mouseenter', function (e) {
      if (!self.dodgeArmed || self.catchable() || self.coarse) return;
      self.dodgeFrom(e.clientX, e.clientY);
    }, opts);

    root.addEventListener('click', function (e) {
      if (self.isCreatureTarget(e.target)) return;
      var continueBtn = e.target.closest('.berg-continue');
      if (continueBtn) {
        e.preventDefault();
        self.advancePhase();
        return;
      }
      var noBtn = e.target.closest('.berg-btn-no');
      if (noBtn) {
        self.handleNo();
        return;
      }
      var replay = e.target.closest('.berg-replay');
      if (replay) {
        e.preventDefault();
        window.BergAwaits.replay();
        return;
      }
      var ret = e.target.closest('.berg-return');
      if (ret) {
        if (window.BergAwaits) window.BergAwaits.destroy();
      }
    }, opts);

    function creature(sel, kind, toast) {
      var el = root.querySelector(sel);
      if (!el) return;
      function hit(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        if (kind === 'constellation' && self.phase !== 'night' && self.phase !== 'finale') return;
        self.poke(el);
        if (kind === 'otter') {
          if (!self.discoveries.otter) {
            self.discover('otter', self.cfg.otterFound);
            self.otterDived = true;
          } else {
            self.showToast('', self.cfg.otterAgain);
          }
          return;
        }
        if (kind === 'constellation') {
          if (self.discoveries.constellation) return;
          self.discoveries.constellation = true;
          el.classList.add('is-found');
          self.showToast(self.cfg.constellation.title, self.cfg.constellation.body);
          return;
        }
        var names = { fox: 'Fox', eagle: 'Eagle', butterfly: 'Butterfly' };
        self.discover(kind, toast || {
          title: names[kind] + ' discovered',
          body: 'Another friend of the Berg.'
        });
      }
      el.addEventListener('click', hit, opts);
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          hit(e);
        }
      }, opts);
    }

    creature('.berg-otter', 'otter');
    creature('.berg-fox', 'fox', { title: 'Fox spotted', body: 'He was here the whole time.' });
    creature('.berg-eagle', 'eagle', { title: 'Eagle overhead', body: 'The Berg keeps watch.' });
    creature('.berg-butterfly', 'butterfly', { title: 'A butterfly', body: 'Small wings. Long journey.' });
    creature('.berg-constellation', 'constellation');
  };

  window.BergAwaits = {
    start: function (mount, section) {
      if (live) live.destroy();
      live = new Quest(mount, section);
      live.start();
    },
    replay: function () {
      if (!live) return;
      var mount = live.mount;
      var section = live.section;
      live.destroy();
      live = new Quest(mount, section);
      live.start();
    },
    destroy: function () {
      if (!live) return;
      live.destroy();
      live = null;
    }
  };
})();
