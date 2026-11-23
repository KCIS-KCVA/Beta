/* global window, document, fetch */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var i18n = KCVA.i18n;
  var root = document.getElementById('profile-root');
  if (!i18n || !root) return;

  var slug = root.getAttribute('data-profile-slug') || '';
  var leader = null;

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

  function slugFor(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[\s.]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function roleLines() {
    var lines = String(i18n.tText(leader.role) || '')
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
    if (leader.externalRole) lines.push(i18n.tText(leader.externalRole));
    return lines;
  }

  function render() {
    if (!leader) return;
    var roles = roleLines()
      .map(function (line) {
        return '<span class="profile-role-line">' + escapeHtml(line) + '</span>';
      })
      .join('');

    root.innerHTML =
      '<div class="profile-head">' +
      '<div class="profile-copy">' +
      '<h1 class="profile-name">' +
      escapeHtml(leader.name) +
      '</h1>' +
      '<p class="profile-role">' +
      roles +
      '</p>' +
      '</div>' +
      '<figure class="profile-photo"><img src="' +
      escapeHtml(leader.image || '') +
      '" alt="' +
      escapeHtml(leader.name) +
      '" loading="eager" decoding="async"></figure>' +
      '</div>' +
      '<p class="profile-bio">' +
      escapeHtml(i18n.tText(leader.bio)) +
      '</p>' +
      (leader.bio2
        ? '<p class="profile-bio">' + escapeHtml(i18n.tText(leader.bio2)) + '</p>'
        : '');

    document.title = leader.name + ' | KCVA';
  }

  function renderError() {
    root.innerHTML =
      '<div class="profile-error"><p>' +
      escapeHtml(i18n.t('profile.notFound')) +
      '</p><a class="btn btn-outline-yellow" href="/about-kcva/#leadership">' +
      escapeHtml(i18n.t('profile.back')) +
      '</a></div>';
    document.title = i18n.t('profile.notFound') + ' | KCVA';
  }

  function load() {
    fetch('/about-kcva/leadership.json', { cache: 'no-cache', headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) throw new Error('Unable to load leadership.');
        return response.json();
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : [];
        leader =
          list.filter(function (item) {
            return item.slug === slug || slugFor(item.name) === slug;
          })[0] || null;
        if (leader) render();
        else renderError();
      })
      .catch(renderError);
  }

  i18n.ready.then(load);

  document.addEventListener('kcva:languagechange', function () {
    if (leader) render();
  });
})();
