/* global window, document, localStorage */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var i18n = KCVA.i18n;
  if (!i18n) return;

  var STORAGE_KEY = 'kcva_cookie_consent_v1';
  var layer = null;
  var lastTrigger = null;
  var toastTimer = null;

  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writeConsent(preferences) {
    var record = {
      necessary: true,
      analytics: Boolean(preferences.analytics),
      functional: Boolean(preferences.functional),
      marketing: Boolean(preferences.marketing),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (error) {
      // The UI still closes if storage is unavailable; the choice is not persisted.
    }
    return record;
  }

  function toggleMarkup(category, titleKey, descriptionKey) {
    return (
      '<label class="cookie-option">' +
      '<span class="cookie-option-copy">' +
      '<span class="cookie-option-title" data-i18n="' +
      titleKey +
      '"></span>' +
      '<span class="cookie-option-desc" data-i18n="' +
      descriptionKey +
      '"></span>' +
      '</span>' +
      '<span class="cookie-switch">' +
      '<input type="checkbox" data-cookie-category="' +
      category +
      '">' +
      '<span class="cookie-switch-track" aria-hidden="true"><span></span></span>' +
      '</span>' +
      '</label>'
    );
  }

  function buildLayer() {
    var wrapper = document.createElement('div');
    wrapper.className = 'cookie-layer';
    wrapper.id = 'kcva-cookie-layer';
    wrapper.hidden = true;
    wrapper.innerHTML =
      '<div class="cookie-backdrop" data-cookie-close></div>' +
      '<section class="cookie-panel" role="dialog" aria-modal="true" aria-labelledby="cookie-title" tabindex="-1">' +
      '<button class="cookie-close" type="button" data-cookie-close aria-label="Close cookie preferences" data-i18n-aria-label="cookies.close">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>' +
      '</button>' +
      '<div class="cookie-brand" aria-hidden="true"><img src="/images/logo.png" alt="KCVA"></div>' +
      '<div class="cookie-body">' +
      '<p class="cookie-eyebrow" data-i18n="cookies.eyebrow">PRIVACY</p>' +
      '<h2 id="cookie-title" data-i18n="cookies.title">Cookie preferences</h2>' +
      '<p class="cookie-intro" data-i18n="cookies.intro"></p>' +
      '<div class="cookie-options">' +
      '<div class="cookie-option cookie-option--static">' +
      '<span class="cookie-option-copy"><span class="cookie-option-title" data-i18n="cookies.necessaryTitle"></span><span class="cookie-option-desc" data-i18n="cookies.necessaryDesc"></span></span>' +
      '<span class="cookie-always" data-i18n="cookies.alwaysActive"></span>' +
      '</div>' +
      toggleMarkup('analytics', 'cookies.analyticsTitle', 'cookies.analyticsDesc') +
      toggleMarkup('functional', 'cookies.functionalTitle', 'cookies.functionalDesc') +
      toggleMarkup('marketing', 'cookies.marketingTitle', 'cookies.marketingDesc') +
      '</div>' +
      '<p class="cookie-legal" data-i18n="cookies.legal"></p>' +
      '</div>' +
      '<div class="cookie-footer">' +
      '<div class="cookie-actions">' +
      '<button class="cookie-btn cookie-btn--ghost" type="button" data-cookie-action="reject" data-i18n="cookies.rejectAll"></button>' +
      '<button class="cookie-btn cookie-btn--outline" type="button" data-cookie-action="save" data-i18n="cookies.save"></button>' +
      '<button class="cookie-btn cookie-btn--primary" type="button" data-cookie-action="accept" data-i18n="cookies.acceptAll"></button>' +
      '</div>' +
      '<button class="cookie-dns" type="button" data-cookie-action="donotsell" data-i18n="cookies.doNotSell"></button>' +
      '</div>' +
      '</section>';
    document.body.appendChild(wrapper);
    i18n.applyTranslations(wrapper);
    return wrapper;
  }

  function inputs() {
    return layer ? layer.querySelectorAll('[data-cookie-category]') : [];
  }

  function preferencesFromInputs() {
    var prefs = { analytics: false, functional: false, marketing: false };
    inputs().forEach(function (input) {
      prefs[input.getAttribute('data-cookie-category')] = Boolean(input.checked);
    });
    return prefs;
  }

  function applyPreferences(prefs) {
    var current = prefs || { analytics: false, functional: false, marketing: false };
    inputs().forEach(function (input) {
      input.checked = Boolean(current[input.getAttribute('data-cookie-category')]);
    });
  }

  function setBackgroundInert(inert) {
    ['#global-header', '#main', '#global-footer'].forEach(function (selector) {
      var element = document.querySelector(selector);
      if (!element) return;
      if (inert) element.setAttribute('inert', '');
      else element.removeAttribute('inert');
    });
  }

  function showToast(message) {
    var toast = document.getElementById('kcva-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'kcva-toast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.innerHTML =
        '<span class="toast-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"></path></svg></span><span data-toast-text></span>';
      document.body.appendChild(toast);
    }
    toast.querySelector('[data-toast-text]').textContent = message;
    window.clearTimeout(toastTimer);
    window.requestAnimationFrame(function () {
      toast.classList.add('is-visible');
    });
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2400);
  }

  function closeLayer(returnFocus) {
    if (!layer || layer.hidden) return;
    layer.hidden = true;
    document.body.classList.remove('no-scroll');
    setBackgroundInert(false);
    if (returnFocus && lastTrigger && document.contains(lastTrigger)) {
      lastTrigger.focus();
    }
    lastTrigger = null;
  }

  function saveAndClose(prefs, announce) {
    writeConsent(prefs);
    closeLayer(true);
    if (announce) showToast(i18n.t('cookies.saved'));
  }

  function openLayer(trigger) {
    if (!layer) layer = buildLayer();
    var stored = readConsent();
    applyPreferences(stored || null);
    var candidate = trigger || document.activeElement;
    lastTrigger =
      candidate && candidate !== document.body && candidate !== document.documentElement && typeof candidate.focus === 'function'
        ? candidate
        : null;
    layer.hidden = false;
    document.body.classList.add('no-scroll');
    setBackgroundInert(true);
    window.setTimeout(function () {
      var closeButton = layer.querySelector('.cookie-close');
      if (closeButton) closeButton.focus();
    }, 20);
  }

  function handleClose() {
    var stored = readConsent();
    if (stored) {
      closeLayer(true);
      return;
    }
    saveAndClose({}, false);
  }

  i18n.ready.then(function () {
    layer = buildLayer();
    // Close controls and consent options.
    layer.addEventListener('click', function (event) {
      var action = event.target.closest('[data-cookie-action]');
      if (action) {
        var type = action.getAttribute('data-cookie-action');
        if (type === 'accept') {
          saveAndClose({ analytics: true, functional: true, marketing: true }, true);
        } else if (type === 'reject') {
          saveAndClose({}, true);
        } else if (type === 'save') {
          saveAndClose(preferencesFromInputs(), true);
        } else if (type === 'donotsell') {
          var prefs = preferencesFromInputs();
          prefs.analytics = false;
          prefs.functional = false;
          prefs.marketing = false;
          saveAndClose(prefs, true);
        }
        return;
      }
      if (event.target.closest('[data-cookie-close]')) handleClose();
    });

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-cookie-settings]');
      if (!trigger) return;
      event.preventDefault();
      openLayer(trigger);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && layer && !layer.hidden) handleClose();
    });

    document.addEventListener('kcva:languagechange', function () {
      if (layer) i18n.applyTranslations(layer);
    });

    if (!readConsent()) {
      window.setTimeout(function () {
        openLayer(null);
      }, 400);
    }
  });
})();
