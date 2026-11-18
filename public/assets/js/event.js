/* global window, document, fetch, location, navigator, URL, URLSearchParams */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var i18n = KCVA.i18n;
  var root = document.getElementById('event-root');
  if (!i18n || !root) return;

  var eventData = null;
  var statusOverride = null;
  var lastError = null;
  var toastTimer = null;
  var lastStateSignature = null;

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

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function safeUrl(value) {
    var url = String(value == null ? '' : value).trim();
    if (!url) return '#';
    if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
    if (/^(\/|\.{0,2}\/|#)/.test(url)) return url;
    return '#';
  }


  function getStatusOverride() {
    try {
      var params = new URLSearchParams(window.location.search);
      var value = params.get('status') || params.get('previewStatus');
      return value === 'scheduled' || value === 'live' || value === 'completed'
        ? value
        : null;
    } catch (error) {
      return null;
    }
  }

  function parseTimestamp(value) {
    if (!value) return NaN;
    var timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : NaN;
  }

  function getDeadlines() {
    return (eventData && eventData.deadlines) || {};
  }

  function resolveStatus() {
    if (statusOverride) return statusOverride;

    var deadlines = getDeadlines();
    var now = Date.now();
    var eventTimestamp = parseTimestamp(deadlines.eventDate);
    var resultsTimestamp = parseTimestamp(deadlines.resultsReleaseDate);

    if (Number.isFinite(eventTimestamp) && now < eventTimestamp) return 'scheduled';
    if (Number.isFinite(resultsTimestamp) && now < resultsTimestamp) return 'live';
    return 'completed';
  }

  function hasUrl(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  function resolveActionTime(status) {
    var deadlines = getDeadlines();
    var now = Date.now();
    var registrationTimestamp = parseTimestamp(deadlines.registrationDeadline);
    var ticketTimestamp = parseTimestamp(deadlines.ticketDeadline);
    var previewScheduled = statusOverride === 'scheduled';
    var registrationAllowed = false;
    var ticketAllowed = false;

    if (status === 'scheduled') {
      registrationAllowed =
        previewScheduled ||
        !Number.isFinite(registrationTimestamp) ||
        now <= registrationTimestamp;
      ticketAllowed =
        previewScheduled || !Number.isFinite(ticketTimestamp) || now <= ticketTimestamp;
    } else if (status === 'live') {
      ticketAllowed = true;
    }

    return {
      playerRegistration: status === 'scheduled' && registrationAllowed,
      volunteerRegistration: status === 'scheduled' && registrationAllowed,
      buyTickets: (status === 'scheduled' && ticketAllowed) || status === 'live',
      watchReplay: status === 'completed',
      liveGallery: status === 'live' || status === 'completed',
    };
  }

  function actionIsEnabled(url, isTimeAllowed) {
    return hasUrl(url) && Boolean(isTimeAllowed);
  }

  function stateSignature() {
    var status = resolveStatus();
    var times = resolveActionTime(status);
    var actions = getActions();
    return [
      status,
      actionIsEnabled(actions.playerRegistrationUrl, times.playerRegistration),
      actionIsEnabled(actions.volunteerRegistrationUrl, times.volunteerRegistration),
      actionIsEnabled(actions.buyTicketsUrl, times.buyTickets),
      actionIsEnabled(actions.gameReplayUrl, times.watchReplay),
      actionIsEnabled(actions.livePhotoGalleryUrl, times.liveGallery),
    ].join('|');
  }

  function getDescription() {
    var description = (eventData && eventData.description) || {};
    return description[i18n.getLanguage()] || description.en || [];
  }

  function getSportKey() {
    return eventData && eventData.sport === 'frisbee' ? 'frisbee' : 'volleyball';
  }

  function getSportLabel() {
    if (eventData && eventData.sportLabel) return i18n.tText(eventData.sportLabel);
    return i18n.t('event.sport.' + getSportKey());
  }

  function getActions() {
    return (eventData && eventData.actions) || {};
  }

  function getDivisions() {
    return (
      (eventData && eventData.standings && eventData.standings.divisions) || []
    );
  }

  function formatDeadline(value) {
    return escapeHtml(i18n.formatDateLabel(value || ''));
  }

  function externalAttributes(url) {
    return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
  }

  function renderActionButton(label, url, isTimeAllowed, variant, id) {
    var enabled = actionIsEnabled(url, isTimeAllowed) && variant !== 'disabled';

    if (!enabled) {
      return (
        '<button class="action-btn action-btn--disabled" type="button" id="' +
        escapeAttr(id) +
        '" disabled aria-disabled="true">' +
        escapeHtml(label) +
        '</button>'
      );
    }

    var target = safeUrl(url);
    return (
      '<a class="action-btn action-btn--' +
      variant +
      '" id="' +
      escapeAttr(id) +
      '" href="' +
      escapeAttr(target) +
      '"' +
      externalAttributes(target) +
      '>' +
      escapeHtml(label) +
      '</a>'
    );
  }

  function renderActionGroups(status) {
    var actions = getActions();
    var deadlines = getDeadlines();
    var times = resolveActionTime(status);
    var replayEnabled = actionIsEnabled(actions.gameReplayUrl, times.watchReplay);
    var galleryEnabled = actionIsEnabled(actions.livePhotoGalleryUrl, times.liveGallery);
    var galleryVariant =
      galleryEnabled && !replayEnabled ? 'solid' : galleryEnabled ? 'outline' : 'disabled';

    return (
      '<div class="action-group">' +
      '<p class="action-group-label">' +
      escapeHtml(i18n.t('event.registrationCloses')) +
      '</p>' +
      '<p class="action-group-date">' +
      formatDeadline(deadlines.registrationDeadline) +
      '</p>' +
      '<div class="action-group-buttons">' +
      renderActionButton(
        i18n.t('event.playerRegistration'),
        actions.playerRegistrationUrl,
        times.playerRegistration,
        'solid',
        'action-player-registration',
      ) +
      renderActionButton(
        i18n.t('event.volunteerRegistration'),
        actions.volunteerRegistrationUrl,
        times.volunteerRegistration,
        'outline',
        'action-volunteer-registration',
      ) +
      '</div>' +
      '</div>' +
      '<div class="action-group">' +
      '<p class="action-group-label">' +
      escapeHtml(i18n.t('event.ticketSalesEnd')) +
      '</p>' +
      '<p class="action-group-date">' +
      formatDeadline(deadlines.ticketDeadline) +
      '</p>' +
      '<div class="action-group-buttons">' +
      renderActionButton(
        i18n.t('event.buyTickets'),
        actions.buyTicketsUrl,
        times.buyTickets,
        'outline',
        'action-buy-tickets',
      ) +
      '</div>' +
      '</div>' +
      '<div class="action-group">' +
      '<p class="action-group-label">' +
      escapeHtml(i18n.t('event.replayAvailable')) +
      '</p>' +
      '<p class="action-group-date">' +
      formatDeadline(deadlines.resultsReleaseDate) +
      '</p>' +
      '<div class="action-group-buttons">' +
      renderActionButton(
        i18n.t('event.watchReplay'),
        actions.gameReplayUrl,
        times.watchReplay,
        'solid',
        'action-watch-replay',
      ) +
      renderActionButton(
        i18n.t('event.livePhotoGallery'),
        actions.livePhotoGalleryUrl,
        times.liveGallery,
        galleryVariant,
        'action-live-gallery',
      ) +
      '</div>' +
      '</div>'
    );
  }

  function renderHero() {
    var heroImage = './session-hero-image.png';
    return (
      '<section class="event-hero" aria-labelledby="event-title">' +
      '<div class="event-hero-media"><img src="' +
      escapeAttr(heroImage) +
      '" alt="" fetchpriority="high"></div>' +
      '<div class="event-hero-content"><div class="shell">' +
      '<span class="sport-badge">' +
      escapeHtml(getSportLabel()) +
      '</span>' +
      '<h1 id="event-title">' +
      escapeHtml(i18n.tText(eventData.title)) +
      '</h1>' +
      '<p class="event-hero-subtitle">' +
      escapeHtml(i18n.tText(eventData.subtitle)) +
      '</p>' +
      '</div></div></section>'
    );
  }

  function renderDescription() {
    var paragraphs = getDescription();
    if (!Array.isArray(paragraphs)) return '';
    return paragraphs
      .map(function (paragraph) {
        return '<p>' + escapeHtml(i18n.tText(paragraph)) + '</p>';
      })
      .join('');
  }

  function renderDateCards() {
    var dates = eventData.dates || [];
    if (!Array.isArray(dates)) return '';

    return dates
      .map(function (date) {
        return (
          '<div class="date-card">' +
          '<div class="date-month">' +
          escapeHtml(i18n.formatMonth(date.month || '')) +
          '</div>' +
          '<div class="date-day">' +
          escapeHtml(date.day || '') +
          '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  function getMapLinks() {
    var venue = eventData.venue || {};
    var searchQuery = venue.searchQuery || i18n.tText(venue.name) || '';
    var encodedQuery = encodeURIComponent(searchQuery);
    var links = [];

    links.push({
      url:
        venue.appleMapsUrl ||
        (searchQuery ? 'https://maps.apple.com/?q=' + encodedQuery : ''),
      label: i18n.t('event.openApple'),
    });
    links.push({
      url:
        venue.googleMapsUrl ||
        (searchQuery
          ? 'https://www.google.com/maps/search/?api=1&query=' + encodedQuery
          : ''),
      label: i18n.t('event.openGoogle'),
    });
    links.push({
      url:
        venue.amapUrl ||
        (searchQuery ? 'https://uri.amap.com/search?keyword=' + encodedQuery : ''),
      label: i18n.t('event.openAmap'),
    });

    return links
      .filter(function (link) {
        return Boolean(link.url);
      })
      .map(function (link) {
        return (
          '<a href="' +
          escapeAttr(safeUrl(link.url)) +
          '"' +
          externalAttributes(link.url) +
          '>' +
          escapeHtml(link.label) +
          '</a>'
        );
      })
      .join('');
  }

  function renderMainSplit(status) {
    var venue = eventData.venue || {};
    var statusText = i18n.t('event.status.' + status);

    return (
      '<section class="event-section">' +
      '<div class="shell event-split">' +
      '<div class="event-content">' +
      '<div class="event-description">' +
      renderDescription() +
      '</div>' +
      '<h2 class="event-label">' +
      escapeHtml(i18n.t('event.date')) +
      '</h2>' +
      '<div class="date-cards">' +
      renderDateCards() +
      '</div>' +
      '<h2 class="event-label">' +
      escapeHtml(i18n.t('event.location')) +
      '</h2>' +
      '<div class="location-card">' +
      '<p class="location-name">' +
      escapeHtml(i18n.tText(venue.name)) +
      '</p>' +
      '<p class="location-address">' +
      escapeHtml(i18n.tText(venue.address)) +
      '</p>' +
      '</div>' +
      '<div class="map-links">' +
      getMapLinks() +
      '</div>' +
      '</div>' +
      '<aside class="action-sidebar" aria-label="' +
      escapeAttr(i18n.tText(eventData.title)) +
      '">' +
      '<p class="status-label" data-status="' +
      status +
      '" aria-live="polite">' +
      escapeHtml(statusText) +
      '</p>' +
      '<div class="action-card">' +
      '<h2 class="action-title">' +
      escapeHtml(i18n.tText(eventData.title)) +
      '</h2>' +
      '<p class="action-meta">' +
      escapeHtml(i18n.tText(venue.name)) +
      '<span class="meta-sep" aria-hidden="true">·</span>' +
      escapeHtml(
        typeof eventData.dateRangeLabel === 'object'
          ? i18n.tText(eventData.dateRangeLabel)
          : eventData.dateRangeLabel || '',
      ) +
      '</p>' +
      '<hr class="action-divider">' +
      renderActionGroups(status) +
      '</div>' +
      '</aside>' +
      '</div></section>'
    );
  }

  function renderSponsors() {
    var sponsorImage = './sponsors.png';
    return (
      '<section class="sponsor-strip" aria-label="' +
      escapeAttr(i18n.t('event.partners')) +
      '"><div class="sponsor-inner"><img class="sponsor-banner" src="' +
      escapeAttr(sponsorImage) +
      '" alt="Sponsors" width="1264" height="100" loading="lazy" decoding="async" onerror="this.parentElement.style.display=\'none\'"></div></section>'
    );
  }

  function tableHeaders() {
    var headers = [
      'event.table.position',
      'event.table.team',
      'event.table.played',
      'event.table.wins',
      'event.table.losses',
    ];

    if (getSportKey() === 'frisbee') {
      headers.push('event.table.diff', 'event.table.sotg', 'event.table.points');
    } else {
      headers.push('event.table.sets', 'event.table.points');
    }

    return headers
      .map(function (key) {
        return '<th scope="col">' + escapeHtml(i18n.t(key)) + '</th>';
      })
      .join('');
  }

  function tableRows(division) {
    var rows = division.rows || [];
    return rows
      .map(function (row) {
        var topThree = Number(row.position) >= 1 && Number(row.position) <= 3;
        var cells = [
          row.position,
          row.team,
          row.played,
          row.won,
          row.lost,
          row.setsOrDiff,
        ];

        if (getSportKey() === 'frisbee') {
          cells.push(row.sotg == null ? '-' : row.sotg);
        }

        cells.push(row.points);

        return (
          '<tr' +
          (topThree ? ' class="is-top-three"' : '') +
          '>' +
          cells
            .map(function (cell) {
              return '<td>' + escapeHtml(cell == null ? '-' : cell) + '</td>';
            })
            .join('') +
          '</tr>'
        );
      })
      .join('');
  }

  function safeId(value) {
    return String(value || 'division')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function resultsPendingMarkup() {
    return (
      '<div class="results-notice">' +
      escapeHtml(
        i18n.t('event.resultsPending', {
          date: i18n.formatDateLabel(getDeadlines().resultsReleaseDate || ''),
        }),
      ) +
      '</div>'
    );
  }

  function renderResults(status) {
    if (status !== 'completed') return resultsPendingMarkup();

    var divisions = getDivisions();
    if (!Array.isArray(divisions) || divisions.length === 0) {
      return resultsPendingMarkup();
    }

    return divisions
      .map(function (division) {
        var divisionId = safeId(division.id);
        var divisionTitle = i18n.tText(division.title);
        return (
          '<div class="division" id="results-' +
          escapeAttr(divisionId) +
          '">' +
          '<div class="division-head">' +
          '<div><h2 class="division-kicker">' +
          escapeHtml(divisionTitle) +
          '</h2><p class="division-subtitle">' +
          escapeHtml(i18n.t('event.results')) +
          '</p></div>' +
          '<button class="share-btn" type="button" data-division="' +
          escapeAttr(divisionId) +
          '" aria-label="' +
          escapeAttr(i18n.t('event.share') + ' ' + divisionTitle) +
          '">' +
          escapeHtml(i18n.t('event.share')) +
          '</button>' +
          '</div>' +
          '<div class="table-wrap" tabindex="0" role="region" aria-label="' +
          escapeAttr(i18n.t('event.tableLabel', { division: divisionTitle })) +
          '"><table class="results-table"><caption class="sr-only">' +
          escapeHtml(i18n.t('event.tableLabel', { division: divisionTitle })) +
          '</caption><thead><tr>' +
          tableHeaders() +
          '</tr></thead><tbody>' +
          tableRows(division) +
          '</tbody></table></div>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderOrganizers() {
    var organizers = eventData.organizers || [];
    return organizers
      .map(function (organizer) {
        return (
          '<div class="organizer">' +
          '<p class="organizer-name">' +
          escapeHtml(organizer.name) +
          '</p>' +
          '<p class="organizer-role">' +
          escapeHtml(i18n.tText(organizer.role)) +
          '</p>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderVolunteers() {
    var volunteers = eventData.volunteers || [];
    return (
      '<div class="volunteers-grid">' +
      volunteers
        .map(function (volunteer) {
          return (
            '<div class="volunteer-row">' +
            '<span class="volunteer-name">' +
            escapeHtml(volunteer.name) +
            '</span>' +
            '<span class="volunteer-role">' +
            escapeHtml(i18n.tText(volunteer.role)) +
            '</span>' +
            '</div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderLowerSections(status) {
    return (
      '<div class="shell event-lower">' +
      '<section class="results-section" aria-label="' +
      escapeAttr(i18n.t('event.results')) +
      '">' +
      renderResults(status) +
      '</section>' +
      '<section class="people-section">' +
      '<h2 class="people-title">' +
      escapeHtml(i18n.t('event.organizersTitle')) +
      '</h2>' +
      '<p class="people-subtitle">' +
      escapeHtml(i18n.t('event.organizersSubtitle')) +
      '</p>' +
      '<div class="people-card"><div class="organizers-grid">' +
      renderOrganizers() +
      '</div></div>' +
      '</section>' +
      '<section class="people-section">' +
      '<h2 class="people-title">' +
      escapeHtml(i18n.t('event.supportTitle')) +
      '</h2>' +
      '<p class="people-subtitle">' +
      escapeHtml(i18n.t('event.supportSubtitle')) +
      '</p>' +
      '<div class="people-card">' +
      renderVolunteers() +
      '</div>' +
      '</section>' +
      '</div>'
    );
  }

  function showToast(message) {
    var toast = document.getElementById('kcva-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'kcva-toast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.innerHTML =
        '<span class="toast-check" aria-hidden="true">✓</span><span data-toast-text></span>';
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

  function bindShareButtons() {
    document.querySelectorAll('.share-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        var divisionId = button.getAttribute('data-division');
        var division = getDivisions().filter(function (item) {
          return safeId(item.id) === divisionId;
        })[0];

        if (!division || !KCVA.sharePoster || typeof KCVA.sharePoster.open !== 'function') {
          showToast(i18n.t('event.posterError'));
          return;
        }

        button.setAttribute('aria-busy', 'true');

        Promise.resolve(
          KCVA.sharePoster.open({
            eventData: eventData,
            division: division,
            onToast: showToast,
          }),
        )
          .catch(function () {
            showToast(i18n.t('event.posterError'));
          })
          .then(function () {
            button.removeAttribute('aria-busy');
          });
      });
    });
  }

  function bindImageFallbacks() {
    var heroImage = root.querySelector('.event-hero-media img');
    if (heroImage) {
      heroImage.addEventListener('error', function () {
        heroImage.style.display = 'none';
      });
    }

    var sponsorImage = root.querySelector('.sponsor-inner img');
    if (sponsorImage) {
      sponsorImage.addEventListener('error', function () {
        sponsorImage.parentElement.style.display = 'none';
      });
    }
  }

  function scrollToHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var id = decodeURIComponent(hash);
    window.setTimeout(function () {
      var target = document.getElementById(id);
      if (!target) return;
      var reduceMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }, 80);
  }

  function setDocumentTitle() {
    document.title = i18n.tText(eventData.title) + ' - Events | KCVA';
  }

  function render() {
    if (!eventData) return;
    var status = resolveStatus();

    root.innerHTML =
      renderHero() +
      renderMainSplit(status) +
      renderSponsors() +
      renderLowerSections(status);

    bindShareButtons();
    bindImageFallbacks();
    setDocumentTitle();
    lastStateSignature = stateSignature();

    if (window.location.hash) scrollToHash();
  }

  function renderError(error) {
    var notFound = error && error.status === 404;
    var title = notFound ? i18n.t('event.notFoundTitle') : i18n.t('event.loadErrorTitle');
    var body = notFound ? i18n.t('event.notFoundBody') : i18n.t('event.loadErrorBody');
    document.title = 'Events | KCVA';
    root.innerHTML =
      '<div class="event-error">' +
      '<p class="eyebrow">KCVA</p>' +
      '<h1>' +
      escapeHtml(title) +
      '</h1>' +
      '<p>' +
      escapeHtml(body) +
      '</p>' +
      '<a class="btn btn-outline-yellow" href="/events/">' +
      escapeHtml(i18n.t('footer.events')) +
      '</a>' +
      (notFound
        ? ''
        : '<button class="btn btn-outline" type="button" id="event-retry">' +
          escapeHtml(i18n.t('event.retry')) +
          '</button>') +
      '</div>';

    var retry = document.getElementById('event-retry');
    if (retry) {
      retry.addEventListener('click', function () {
        window.location.reload();
      });
    }
  }

  function loadEvent() {
    root.setAttribute('aria-busy', 'true');
    var dataUrl = './event-data.json';

    return fetch(dataUrl, { cache: 'no-cache', headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) {
          var error = new Error('Unable to load event data');
          error.status = response.status;
          throw error;
        }
        return response.json();
      })
      .then(function (data) {
        eventData = data;
        lastError = null;
        statusOverride = getStatusOverride();
        root.setAttribute('aria-busy', 'false');
        render();
      })
      .catch(function (error) {
        lastError = error;
        root.setAttribute('aria-busy', 'false');
        renderError(error);
      });
  }

  i18n.ready.then(function () {
    statusOverride = getStatusOverride();
    loadEvent();
  });

  document.addEventListener('kcva:languagechange', function () {
    if (eventData) render();
    else if (lastError) renderError(lastError);
  });

  window.addEventListener('popstate', function () {
    if (!eventData) return;
    var nextOverride = getStatusOverride();
    if (nextOverride !== statusOverride) {
      statusOverride = nextOverride;
      render();
    }
  });

  window.setInterval(function () {
    if (!eventData) return;
    if (stateSignature() !== lastStateSignature) render();
  }, 30000);

  document.addEventListener('visibilitychange', function () {
    if (!eventData || document.visibilityState !== 'visible') return;
    if (stateSignature() !== lastStateSignature) render();
  });
})();
