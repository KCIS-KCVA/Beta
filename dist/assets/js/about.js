/* global window, document, fetch */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var i18n = KCVA.i18n;
  if (!i18n) return;

  var grid = null;
  var leaders = null;

  var TIERS = [
    { key: 'executive', titleKey: 'about.tierExecutive' },
    { key: 'business', titleKey: 'about.tierBusiness' },
    { key: 'operations', titleKey: 'about.tierOperations' },
  ];

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

  function tierFor(category) {
    return (
      TIERS.filter(function (tier) {
        return tier.key === category;
      })[0] || TIERS[2]
    );
  }

  function slugFor(leader) {
    if (leader.slug) return leader.slug;
    return String(leader.name || '')
      .toLowerCase()
      .replace(/[\s.]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function roleLines(leader) {
    var lines = String(i18n.tText(leader.role) || '')
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
    if (leader.externalRole) {
      lines.push(i18n.tText(leader.externalRole));
    }
    return lines;
  }

  function roleMarkup(leader) {
    return roleLines(leader)
      .map(function (line) {
        return '<span class="leader-role-line">' + escapeHtml(line) + '</span>';
      })
      .join('');
  }

  function leaderMarkup(leader) {
    var slug = slugFor(leader);
    return (
      '<a class="leader-card" href="/about-kcva/' +
      encodeURIComponent(slug) +
      '">' +
      (leader.image
        ? '<span class="leader-photo-wrap"><img class="leader-photo" src="' +
          escapeHtml(leader.image) +
          '" alt="' +
          escapeHtml(leader.name) +
          '" loading="lazy" decoding="async"></span>'
        : '') +
      '<span class="leader-card-body">' +
      '<span class="leader-name">' +
      escapeHtml(leader.name) +
      '</span>' +
      '<span class="leader-role">' +
      roleMarkup(leader) +
      '</span>' +
      '</span>' +
      '</a>'
    );
  }

  function renderLeaders() {
    if (!grid || !leaders) return;
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = TIERS.map(function (tier) {
      var tierLeaders = leaders.filter(function (leader) {
        return tierFor(leader.category).key === tier.key;
      });

      if (!tierLeaders.length) return '';

      return (
        '<section class="leader-tier leader-tier--' +
        tier.key +
        '">' +
        '<div class="leader-tier-head"><h3>' +
        escapeHtml(i18n.t(tier.titleKey)) +
        '</h3></div>' +
        '<div class="leader-tier-cards">' +
        tierLeaders.map(leaderMarkup).join('') +
        '</div></section>'
      );
    }).join('');
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
    if (grid) loadLeaders();

    document.addEventListener('kcva:languagechange', function () {
      if (leaders) renderLeaders();
      else if (grid && grid.querySelector('.leadership-state--error')) renderError();
    });
  });
})();
