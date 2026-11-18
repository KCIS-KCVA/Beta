/* global window, document */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var i18n = KCVA.i18n;
  if (!i18n) return;

  var LAST_FOCUSED = null;

  var closeIcon =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var arrowIcon =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function withLanguage(path) {
    try {
      var lang = new URLSearchParams(window.location.search).get('lang');
      if (!lang) return path;
      return path + (path.indexOf('?') === -1 ? '?' : '&') + 'lang=' + encodeURIComponent(lang);
    } catch (error) {
      return path;
    }
  }

  function normalizedPath() {
    var pathname = window.location.pathname.replace(/\/index\.html$/, '/');
    if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
    return pathname || '/';
  }

  function isCurrent(path) {
    var current = normalizedPath();
    if (path === '/') return current === '/';
    return current === path || current.indexOf(path + '/') === 0;
  }

  function buildNavLinks(className) {
    var t = i18n.t;
    var items = [
      { key: 'nav.home', path: '/' },
      { key: 'nav.events', path: '/events/' },
      { key: 'nav.mediaHub', path: '/media-hub/' },
      { key: 'nav.sponsorship', path: '/sponsorship/' },
      { key: 'nav.about', path: '/about/' },
    ];

    return items
      .map(function (item, index) {
        var active = isCurrent(item.path === '/' ? '/' : item.path.replace(/\/$/, ''));
        return (
          '<a class="' +
          className +
          (active ? ' is-active' : '') +
          '" href="' +
          withLanguage(item.path) +
          '"' +
          (active ? ' aria-current="page"' : '') +
          '>' +
          (className === 'drawer-link'
            ? '<span class="drawer-link-label"><span class="drawer-link-index" aria-hidden="true">' +
              String(index + 1).padStart(2, '0') +
              '</span>' +
              t(item.key) +
              '</span><span class="drawer-link-dash" aria-hidden="true"></span>'
            : t(item.key)) +
          '</a>'
        );
      })
      .join('');
  }

  function languageToggleMarkup(extraClass) {
    var lang = i18n.getLanguage();
    return (
      '<button class="lang-toggle ' +
      (extraClass || '') +
      '" type="button" aria-label="' +
      i18n.t('language.switch') +
      '">' +
      '<span class="' +
      (lang === 'en' ? 'lang-active' : '') +
      '">' +
      i18n.t('language.en') +
      '</span>' +
      '<span class="lang-sep" aria-hidden="true">|</span>' +
      '<span class="' +
      (lang === 'zh' ? 'lang-active' : '') +
      '">' +
      i18n.t('language.zh') +
      '</span>' +
      '</button>'
    );
  }

  function headerMarkup() {
    var t = i18n.t;
    return (
      '<header class="site-header">' +
      '<div class="shell nav-shell">' +
      '<div class="nav-left">' +
      '<a class="brand" href="' +
      withLanguage('/') +
      '" aria-label="KCVA home">' +
      '<img class="brand-logo h-8 w-auto" src="/images/logo.png" alt="KCVA" width="700" height="223">' +
      '</a>' +
      '<nav class="primary-nav" aria-label="' +
      t('nav.primary') +
      '">' +
      buildNavLinks('nav-link') +
      '</nav>' +
      '</div>' +
      '<div class="nav-lang">' +
      languageToggleMarkup('') +
      '</div>' +
      '<button class="nav-toggle" type="button" aria-label="' +
      t('nav.openMenu') +
      '" aria-expanded="false" aria-controls="mobile-navigation">' +
      '<span class="nav-toggle-bars" aria-hidden="true"><span></span><span></span><span></span></span>' +
      '</button>' +
      '</div>' +
      '</header>' +
      '<div class="drawer-layer" id="mobile-navigation" hidden>' +
      '<button class="drawer-backdrop js-close-drawer" type="button" tabindex="-1" aria-label="' +
      t('nav.closeMenu') +
      '"></button>' +
      '<aside class="drawer" role="dialog" aria-modal="true" aria-label="' +
      t('nav.mobile') +
      '">' +
      '<div class="drawer-head">' +
      '<a class="brand" href="' +
      withLanguage('/') +
      '" aria-label="KCVA home">' +
      '<img class="drawer-logo" src="/images/logo.png" alt="KCVA" width="700" height="223">' +
      '</a>' +
      '<button class="drawer-close js-close-drawer" type="button" aria-label="' +
      t('nav.closeMenu') +
      '">' +
      closeIcon +
      '</button>' +
      '</div>' +
      '<nav class="drawer-nav" aria-label="' +
      t('nav.mobile') +
      '">' +
      buildNavLinks('drawer-link') +
      '</nav>' +
      '<div class="drawer-foot">' +
      '<p class="drawer-foot-label">' +
      t('language.switch') +
      '</p>' +
      languageToggleMarkup('') +
      '</div>' +
      '</aside>' +
      '</div>'
    );
  }

  function footerMarkup() {
    var t = i18n.t;
    return (
      '<footer class="site-footer">' +
      '<div class="shell">' +
      '<img class="footer-logo h-10 w-auto" src="/images/logo.png" alt="KCVA" width="700" height="223">' +
      '<div class="footer-main">' +
      '<div class="footer-col">' +
      '<h2 class="footer-heading">' +
      t('footer.stayConnected') +
      '</h2>' +
      '<ul class="footer-links">' +
      '<li><a href="mailto:hello@kcva.com.cn">' +
      t('footer.email') +
      '</a></li>' +
      '<li><a href="https://www.instagram.com/" target="_blank" rel="noreferrer">' +
      t('footer.instagram') +
      '</a></li>' +
      '<li><a href="https://www.youtube.com/" target="_blank" rel="noreferrer">' +
      t('footer.youtube') +
      '</a></li>' +
      '<li><a href="https://www.douyin.com/" target="_blank" rel="noreferrer">' +
      t('footer.douyin') +
      '</a></li>' +
      '</ul>' +
      '</div>' +
      '<div class="footer-col">' +
      '<h2 class="footer-heading">' +
      t('footer.coreServices') +
      '</h2>' +
      '<ul class="footer-links">' +
      '<li><a href="' +
      withLanguage('/events/') +
      '">' +
      t('footer.events') +
      '</a></li>' +
      '<li><a href="' +
      withLanguage('/media-hub/') +
      '">' +
      t('footer.mediaHub') +
      '</a></li>' +
      '<li><a href="' +
      withLanguage('/sponsorship/') +
      '">' +
      t('footer.sponsorship') +
      '</a></li>' +
      '<li><a href="' +
      withLanguage('/about/') +
      '">' +
      t('footer.about') +
      '</a></li>' +
      '</ul>' +
      '</div>' +
      '<div class="footer-right">' +
      '<p class="footer-org">' +
      t('footer.org') +
      '</p>' +
      '<p class="footer-slogan">“' +
      t('footer.slogan') +
      '”</p>' +
      '<p class="footer-address">' +
      t('footer.address') +
      '</p>' +
      '</div>' +
      '</div>' +
      '<div class="footer-bottom">' +
      t('footer.copyright') +
      '</div>' +
      '</div>' +
      '</footer>'
    );
  }

  function setPageInert(inert) {
    ['.site-header', '#main', '.site-footer'].forEach(function (selector) {
      var element = document.querySelector(selector);
      if (!element) return;
      if (inert) element.setAttribute('inert', '');
      else element.removeAttribute('inert');
    });
  }

  function closeDrawer(returnFocus) {
    var layer = document.getElementById('mobile-navigation');
    var toggle = document.querySelector('.nav-toggle');
    if (!layer) return;

    layer.hidden = true;
    document.body.classList.remove('no-scroll');
    setPageInert(false);
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', i18n.t('nav.openMenu'));
    }
    if (returnFocus && LAST_FOCUSED && typeof LAST_FOCUSED.focus === 'function') {
      LAST_FOCUSED.focus();
    }
    LAST_FOCUSED = null;
  }

  function openDrawer() {
    var layer = document.getElementById('mobile-navigation');
    var toggle = document.querySelector('.nav-toggle');
    if (!layer || !toggle) return;

    LAST_FOCUSED = document.activeElement;
    layer.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', i18n.t('nav.closeMenu'));
    document.body.classList.add('no-scroll');
    setPageInert(true);

    window.setTimeout(function () {
      var closeButton = layer.querySelector('.drawer-close');
      if (closeButton) closeButton.focus();
    }, 30);
  }

  function bindInteractions() {
    var toggle = document.querySelector('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var layer = document.getElementById('mobile-navigation');
        if (!layer || layer.hidden) openDrawer();
        else closeDrawer(true);
      });
    }

    document.querySelectorAll('.js-close-drawer').forEach(function (button) {
      button.addEventListener('click', function () {
        closeDrawer(true);
      });
    });

    document.querySelectorAll('.lang-toggle').forEach(function (button) {
      button.addEventListener('click', function () {
        closeDrawer(false);
        i18n.toggleLanguage();
      });
    });

    document.querySelectorAll('.drawer-link').forEach(function (link) {
      link.addEventListener('click', function () {
        closeDrawer(false);
      });
    });
  }

  function render() {
    var header = document.getElementById('global-header');
    var footer = document.getElementById('global-footer');

    document.body.classList.remove('no-scroll');
    setPageInert(false);
    LAST_FOCUSED = null;

    if (header) header.innerHTML = headerMarkup();
    if (footer) footer.innerHTML = footerMarkup();
    bindInteractions();
  }

  i18n.ready.then(render);
  document.addEventListener('kcva:languagechange', function () {
    render();
  });

  document.addEventListener('keydown', function (event) {
    var layer = document.getElementById('mobile-navigation');
    if (!layer || layer.hidden) return;

    if (event.key === 'Escape') {
      closeDrawer(true);
      return;
    }

    if (event.key !== 'Tab') return;
    var focusable = layer.querySelectorAll(
      'a[href], button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  if (window.matchMedia) {
    var desktop = window.matchMedia('(min-width: 768px)');
    var onChange = function (event) {
      if (event.matches) closeDrawer(false);
    };
    if (desktop.addEventListener) desktop.addEventListener('change', onChange);
    else if (desktop.addListener) desktop.addListener(onChange);
  }

  /* Small helper for pages that want an arrow beside a text link. */
  KCVA.layout = {
    arrowIcon: arrowIcon,
  };
})();
