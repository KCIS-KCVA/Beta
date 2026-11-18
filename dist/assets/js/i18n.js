/* global window, document, fetch, URL, URLSearchParams, localStorage */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var SUPPORTED = ['en', 'zh'];
  var STORAGE_KEY = 'kcva_lang';
  var state = {
    lang: 'en',
    dictionary: {},
    fallback: {},
    ready: null,
  };
  var languageRequestId = 0;

  function isSupported(value) {
    return SUPPORTED.indexOf(value) !== -1;
  }

  function readStoredLanguage() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return isSupported(value) ? value : null;
    } catch (error) {
      return null;
    }
  }

  function readQueryLanguage() {
    try {
      var value = new URLSearchParams(window.location.search).get('lang');
      return isSupported(value) ? value : null;
    } catch (error) {
      return null;
    }
  }

  function detectLanguage() {
    return readQueryLanguage() || readStoredLanguage() || 'en';
  }

  function persistLanguage(lang) {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      /* Storage is a progressive enhancement. */
    }
  }

  function applyDocumentLanguage() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.setAttribute('data-lang', state.lang);
  }

  function updateUrlLanguage(lang) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('lang', lang);
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    } catch (error) {
      /* The current language still applies without a URL update. */
    }
  }

  function loadDictionary(lang) {
    return fetch('/locales/' + lang + '.json', {
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Unable to load locale: ' + lang);
        return response.json();
      })
      .catch(function (error) {
        if (lang !== 'en') {
          return fetch('/locales/en.json', { cache: 'no-cache' })
            .then(function (response) {
              if (!response.ok) throw error;
              return response.json();
            })
            .catch(function () {
              return {};
            });
        }
        if (window.console && console.warn) {
          console.warn('[KCVA i18n]', error);
        }
        return {};
      });
  }

  function interpolate(value, vars) {
    if (!vars) return value;
    Object.keys(vars).forEach(function (key) {
      value = value.split('{' + key + '}').join(String(vars[key]));
    });
    return value;
  }

  function t(key, vars) {
    var value = state.dictionary[key];
    if (value == null) value = state.fallback[key];
    if (value == null) value = key;
    return interpolate(String(value), vars);
  }

  function tText(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (state.lang === 'zh') return value.zh || value.en || '';
    return value.en || value.zh || '';
  }

  function formatDateLabel(value, lang) {
    if (!value) return '';
    var targetLang = lang || state.lang;
    var text = String(value).trim();
    var timestamp = NaN;
    var monthNames = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    var readableDate = /^([A-Za-z]{3})[A-Za-z]*\s+(\d{1,2}),\s*(\d{4})$/.exec(text);

    if (readableDate && monthNames[readableDate[1]] != null) {
      timestamp = Date.UTC(
        Number(readableDate[3]),
        monthNames[readableDate[1]],
        Number(readableDate[2]),
      );
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      timestamp = Date.parse(text + 'T00:00:00+08:00');
    } else {
      timestamp = Date.parse(text);
    }

    if (Number.isNaN(timestamp)) return value;

    try {
      return new Intl.DateTimeFormat(targetLang === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Shanghai',
      }).format(new Date(timestamp));
    } catch (error) {
      return value;
    }
  }

  var monthMap = {
    Jan: '1月',
    Feb: '2月',
    Mar: '3月',
    Apr: '4月',
    May: '5月',
    Jun: '6月',
    Jul: '7月',
    Aug: '8月',
    Sep: '9月',
    Oct: '10月',
    Nov: '11月',
    Dec: '12月',
  };

  function formatMonth(value, lang) {
    if (!value) return '';
    var targetLang = lang || state.lang;
    if (targetLang !== 'zh') return value;
    return monthMap[value] || value;
  }

  function applyPageTitle() {
    var key = document.body && document.body.getAttribute('data-title-key');
    if (!key) return;
    document.title = key === 'nav.events' ? t(key) + ' | KCVA' : t(key) + ' - Events | KCVA';
  }

  function applyTranslations(root) {
    var scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach(function (element) {
      var key = element.getAttribute('data-i18n');
      if (!key) return;
      element.textContent = t(key);
    });

    scope.querySelectorAll('[data-i18n-aria-label]').forEach(function (element) {
      var key = element.getAttribute('data-i18n-aria-label');
      if (!key) return;
      element.setAttribute('aria-label', t(key));
    });

    scope.querySelectorAll('[data-i18n-title]').forEach(function (element) {
      var key = element.getAttribute('data-i18n-title');
      if (!key) return;
      element.setAttribute('title', t(key));
    });
  }

  function setLanguage(nextLanguage, options) {
    if (!isSupported(nextLanguage)) return Promise.resolve();
    var opts = options || {};
    var requestId = ++languageRequestId;

    state.lang = nextLanguage;
    persistLanguage(nextLanguage);
    if (opts.updateUrl !== false) updateUrlLanguage(nextLanguage);
    applyDocumentLanguage();

    return loadDictionary(nextLanguage).then(function (dictionary) {
      if (requestId !== languageRequestId) return;

      state.dictionary = dictionary;
      applyTranslations(document);
      applyPageTitle();
      document.dispatchEvent(
        new CustomEvent('kcva:languagechange', {
          detail: { lang: nextLanguage },
        }),
      );
    });
  }

  function toggleLanguage() {
    return setLanguage(state.lang === 'en' ? 'zh' : 'en');
  }

  state.lang = detectLanguage();
  persistLanguage(state.lang);
  applyDocumentLanguage();

  state.ready = Promise.all([
    loadDictionary('en'),
    state.lang === 'en' ? Promise.resolve(null) : loadDictionary(state.lang),
  ]).then(function (dictionaries) {
    state.fallback = dictionaries[0] || {};
    state.dictionary = dictionaries[1] || state.fallback;
    applyTranslations(document);
    applyPageTitle();
    document.dispatchEvent(
      new CustomEvent('kcva:i18nready', {
        detail: { lang: state.lang },
      }),
    );
  });

  KCVA.i18n = {
    ready: state.ready,
    t: t,
    tText: tText,
    formatDateLabel: formatDateLabel,
    formatMonth: formatMonth,
    setLanguage: setLanguage,
    toggleLanguage: toggleLanguage,
    applyTranslations: applyTranslations,
    getLanguage: function () {
      return state.lang;
    },
  };
})();
