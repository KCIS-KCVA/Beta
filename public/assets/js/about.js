/* global window, document, fetch */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var i18n = KCVA.i18n;
  if (!i18n) return;

  var grid = null;
  var leaders = null;
  var modal = null;
  var lastTrigger = null;

  var TIERS = [
    { key: 'executive', titleKey: 'about.tierExecutive', index: '01' },
    { key: 'business', titleKey: 'about.tierBusiness', index: '02' },
    { key: 'operations', titleKey: 'about.tierOperations', index: '03' },
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
    return TIERS.filter(function (tier) {
      return tier.key === category;
    })[0] || TIERS[2];
  }

  function arrowIcon() {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>'
    );
  }

  function leaderMarkup(leader, index, featured) {
    var externalRole = leader.externalRole ? i18n.tText(leader.externalRole) : '';
    return (
      '<button class="leader-card' +
      (featured ? ' leader-card--featured' : '') +
      '" type="button" data-leader-index="' +
      index +
      '" aria-haspopup="dialog" aria-controls="leader-profile">' +
      '<span class="leader-card-top"><span class="leader-index">' +
      String(index + 1).padStart(2, '0') +
      '</span></span>' +
      '<span class="leader-name">' +
      escapeHtml(leader.name) +
      '</span>' +
      '<span class="leader-role">' +
      escapeHtml(i18n.tText(leader.role)) +
      '</span>' +
      (externalRole
        ? '<span class="leader-external">' + escapeHtml(externalRole) + '</span>'
        : '') +
      '<span class="leader-open">' +
      escapeHtml(i18n.t('about.viewProfile')) +
      arrowIcon() +
      '</span>' +
      '</button>'
    );
  }

  function renderLeaders() {
    if (!grid || !leaders) return;
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = TIERS.map(function (tier) {
      var tierLeaders = leaders
        .map(function (leader, index) {
          return { leader: leader, index: index };
        })
        .filter(function (item) {
          return tierFor(item.leader.category).key === tier.key;
        });

      if (!tierLeaders.length) return '';

      var featured = '';
      var cards = tierLeaders;

      if (tier.key === 'executive' && tierLeaders.length > 1) {
        featured =
          '<div class="leader-featured">' +
          leaderMarkup(tierLeaders[0].leader, tierLeaders[0].index, true) +
          '</div>';
        cards = tierLeaders.slice(1);
      }

      return (
        '<section class="leader-tier leader-tier--' +
        tier.key +
        '">' +
        '<div class="leader-tier-head"><span class="leader-tier-index" aria-hidden="true">' +
        tier.index +
        '</span><h3>' +
        escapeHtml(i18n.t(tier.titleKey)) +
        '</h3></div>' +
        featured +
        '<div class="leader-tier-cards">' +
        cards
          .map(function (item) {
            return leaderMarkup(item.leader, item.index, false);
          })
          .join('') +
        '</div></section>'
      );
    }).join('');
  }

  function setBackgroundInert(inert) {
    ['#global-header', '#main', '#global-footer'].forEach(function (selector) {
      var element = document.querySelector(selector);
      if (!element) return;
      if (inert) element.setAttribute('inert', '');
      else element.removeAttribute('inert');
    });
  }

  function closeProfile(returnFocus) {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    setBackgroundInert(false);
    if (returnFocus && lastTrigger && document.contains(lastTrigger)) {
      lastTrigger.focus();
    }
    lastTrigger = null;
  }

  function openProfile(index, trigger) {
    if (!modal || !leaders || !leaders[index]) return;
    var leader = leaders[index];
    var tier = tierFor(leader.category);
    var externalRole = leader.externalRole ? i18n.tText(leader.externalRole) : '';

    modal.querySelector('.leader-modal-tier').textContent = i18n.t(tier.titleKey);
    modal.querySelector('.leader-modal-name').textContent = leader.name;
    modal.querySelector('.leader-modal-role').textContent = i18n.tText(leader.role);
    modal.querySelector('.leader-modal-bio').textContent = i18n.tText(leader.bio);

    var external = modal.querySelector('.leader-modal-external');
    external.textContent = externalRole;
    external.hidden = !externalRole;

    lastTrigger = trigger || null;
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    setBackgroundInert(true);
    window.setTimeout(function () {
      var closeButton = modal.querySelector('.leader-modal-close');
      if (closeButton) closeButton.focus();
    }, 20);
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
    modal = document.getElementById('leader-profile');

    if (grid) {
      grid.addEventListener('click', function (event) {
        var card = event.target.closest('.leader-card');
        if (!card) return;
        openProfile(Number(card.getAttribute('data-leader-index')), card);
      });
    }

    if (modal) {
      modal.querySelectorAll('[data-leader-close]').forEach(function (control) {
        control.addEventListener('click', function () {
          closeProfile(true);
        });
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal && !modal.hidden) {
        closeProfile(true);
      }
    });

    loadLeaders();

    document.addEventListener('kcva:languagechange', function () {
      closeProfile(false);
      if (leaders) renderLeaders();
      else if (grid && grid.querySelector('.leadership-state--error')) renderError();
    });
  });
})();
