(function () {
  function getSettings() {
    return (window.DEN_PORTAL && DEN_PORTAL.settings) || {};
  }

  function getAuth() {
    return getSettings().auth || {};
  }

  function isAuthEnabled() {
    var auth = getAuth();
    if (auth.enabled === false) return false;
    if (auth.enabled === true) return true;
    // Older portals turn the gate on by storing a password and leaving enabled unset.
    return !!auth.password;
  }

  function getStorageKey() {
    return getAuth().storageKey || 'the_fox_s_den_portal_auth';
  }

  function getPassword() {
    return getAuth().password || 'the_fox_s_den';
  }

  function markUnlocked() {
    document.documentElement.classList.add('auth-ok');
  }

  function unlock() {
    sessionStorage.setItem(getStorageKey(), '1');
    markUnlocked();

    var gate = document.getElementById('auth-gate');
    if (gate) gate.remove();
  }

  function assetUrl(script, path) {
    if (!script) return path;
    return new URL(path, script.src).href;
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function showGate() {
    var script = document.querySelector('script[src*="auth.js"]');
    var settings = getSettings();

    var logo = element('img', 'auth-gate-logo');
    logo.alt = '';
    logo.src = assetUrl(script, '../assets/logo.png?v=denfox1');
    logo.addEventListener('error', function onLogoError() {
      logo.removeEventListener('error', onLogoError);
      logo.src = assetUrl(script, '../assets/logo.svg');
    });

    var input = element('input', 'auth-gate-input');
    input.type = 'password';
    input.id = 'auth-password';
    input.placeholder = 'Enter password';
    input.autocomplete = 'off';
    input.autofocus = true;

    var error = element('p', 'auth-gate-error', 'Incorrect password.');
    error.id = 'auth-error';
    error.hidden = true;

    var button = element('button', 'auth-gate-button', 'Enter');
    button.type = 'submit';

    var form = element('form', 'auth-gate-form');
    form.id = 'auth-form';
    form.append(input, error, button);
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (input.value === getPassword()) {
        unlock();
        return;
      }

      error.hidden = false;
      input.value = '';
      input.focus();
    });

    var card = element('div', 'auth-gate-card');
    card.append(
      logo,
      element('h2', 'auth-gate-title', settings.portalName || "The Fox's Den"),
      element('p', 'auth-gate-subtitle', settings.tagline || 'The collection of things that escaped the workshop.'),
      form
    );

    var gate = element('div', 'auth-gate');
    gate.id = 'auth-gate';
    gate.append(card);
    document.body.prepend(gate);
  }

  function init() {
    var alreadyIn = !isAuthEnabled() || sessionStorage.getItem(getStorageKey()) === '1';
    if (alreadyIn) {
      markUnlocked();
      return;
    }

    showGate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
