/* global window, document, fetch */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var i18n = KCVA.i18n;
  if (!i18n) return;

  var grid = null;
  var leaders = null;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[character];
    });
  }

  function leaderMarkup(leader) {
    return (
      '<article class="leader-card" data-category="' +
      escapeHtml(leader.category || '') +
      '">' +
      '<h3 class="leader-name">' +
      escapeHtml(leader.name) +
      '</h3>' +
      '<p class="leader-role">' +
      escapeHtml(i18n.tText(leader.role)) +
      '</p>' +
      '</article>'
    );
  }

  function renderLeaders() {
    if (!grid || !leaders) return;
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = leaders.map(leaderMarkup).join('');
  }

  function renderError() {
    if (!grid) return;
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML =
      '<div class="leadership-state leadership-state--error">' +
      '<p>' +
      escapeHtml(i18n.t('about.leadershipError')) +
      '</p>' +
      '<button class="btn btn-outline-yellow" type="button" id="leadership-retry">' +
      escapeHtml(i18n.t('about.leadershipRetry')) +
      '</button>' +
      '</div>';
    var retry = document.getElementById('leadership-retry');
    if (retry) retry.addEventListener('click', loadLeaders);
  }

  function loadLeaders() {
    if (!grid) return;
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML =
      '<div class="leadership-state"><span class="loading-mark" aria-hidden="true"></span><p>' +
      escapeHtml(i18n.t('about.leadershipLoading')) +
      '</p></div>';

    fetch('/about-kcva/leadership.json', {
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Unable to load leadership.');
        return response.json();
      })
      .then(function (data) {
        leaders = Array.isArray(data) ? data : [];
        renderLeaders();
      })
      .catch(renderError);
  }

  i18n.ready.then(function () {
    grid = document.getElementById('leadership-grid');
    loadLeaders();

    document.addEventListener('kcva:languagechange', function () {
      if (leaders) renderLeaders();
      else if (grid && grid.querySelector('.leadership-state--error')) renderError();
    });
  });
})();
