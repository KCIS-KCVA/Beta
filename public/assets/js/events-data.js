/* global window, document, fetch, Intl, Date */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var VALID_STATUSES = ['scheduled', 'live', 'completed'];
  var VALID_SPORTS = ['volleyball', 'frisbee', 'basketball'];

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

  function icon(paths, viewBox) {
    return (
      '<svg viewBox="' +
      (viewBox || '0 0 24 24') +
      '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      paths +
      '</svg>'
    );
  }

  var icons = {
    search: icon('<circle cx="11" cy="11" r="7"></circle><path d="m16.5 16.5 4 4"></path>'),
    calendar: icon(
      '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path>',
    ),
    list: icon('<path d="M8 6h13M8 12h13M8 18h13"></path><path d="M3 6h.01M3 12h.01M3 18h.01"></path>'),
    chevronLeft: icon('<path d="m15 18-6-6 6-6"></path>'),
    chevronRight: icon('<path d="m9 18 6-6-6-6"></path>'),
    arrowRight: icon('<path d="M5 12h14M13 6l6 6-6 6"></path>'),
    arrowUpRight: icon('<path d="M7 17 17 7M7 7h10v10"></path>'),
    external: icon('<path d="M14 4h6v6M20 4l-9 9"></path><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"></path>'),
    copy: icon(
      '<rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>',
    ),
    check: icon('<path d="m5 12 4 4L19 6"></path>'),
    mail: icon('<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path>'),
    chat: icon(
      '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.4 9.4 0 0 1-3.8-.8L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5Z"></path>',
    ),
    pin: icon(
      '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle>',
    ),
    events: icon(
      '<path d="M8 4h8v3a4 4 0 0 1-8 0V4Z"></path><path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3M12 11v6M8 21h8M10 17h4"></path>',
    ),
    media: icon(
      '<rect x="3" y="5" width="14" height="14" rx="2"></rect><path d="m17 10 4-2v8l-4-2"></path><circle cx="10" cy="12" r="3"></circle>',
    ),
    sponsorship: icon(
      '<path d="M4 12h4l3 3h3l3-3h3"></path><path d="M8 12V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5M4 12v6h16v-6"></path>',
    ),
    about: icon(
      '<circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0"></path><path d="M16 5a3 3 0 0 1 0 6M18 20a6 6 0 0 0-2-4.5"></path>',
    ),
    volleyball: icon(
      '<circle cx="12" cy="12" r="9"></circle><path d="M12 3c3 4 4 8 4 13M4.5 8c4 1 8 2 12 7M5 17c2-4 6-6 13-5"></path>',
    ),
    frisbee: icon(
      '<ellipse cx="12" cy="10" rx="9" ry="5"></ellipse><path d="M4 12.5c2.5 2.8 13.5 2.8 16 0M7 16.5c1.8 2.2 8.2 2.2 10 0"></path>',
    ),
    basketball: icon(
      '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3v18M5.6 5.6c4 3 8.8 3 12.8 0M5.6 18.4c4-3 8.8-3 12.8 0"></path>',
    ),
  };

  function sportIcon(sport) {
    return icons[VALID_SPORTS.indexOf(sport) !== -1 ? sport : 'volleyball'];
  }

  function statusFromEvent(event, now) {
    if (event.statusOverride && VALID_STATUSES.indexOf(event.statusOverride) !== -1) {
      return event.statusOverride;
    }

    var current = now || new Date();
    var resultsTimestamp = Date.parse(event.resultsReleaseDate || '');
    var eventTimestamp = Date.parse((event.date || '') + 'T00:00:00+08:00');

    if (Number.isFinite(resultsTimestamp) && current.getTime() >= resultsTimestamp) {
      return 'completed';
    }
    if (Number.isFinite(eventTimestamp) && current.getTime() >= eventTimestamp) {
      return 'live';
    }
    return 'scheduled';
  }

  function academicSeason(date) {
    var current = date || new Date();
    var startYear = current.getMonth() >= 7 ? current.getFullYear() : current.getFullYear() - 1;
    return (
      String(startYear % 100).padStart(2, '0') +
      '-' +
      String((startYear + 1) % 100).padStart(2, '0')
    );
  }

  function activeSeason(index) {
    if (!index) return '';
    if (!index.autoSeason) return index.currentSeason || '';
    var computed = academicSeason(new Date());
    var hasEvents = (index.events || []).some(function (event) {
      return event.season === computed;
    });
    return hasEvents || !index.currentSeason ? computed : index.currentSeason;
  }

  function completedCount(index, season) {
    var targetSeason = season || activeSeason(index);
    return (index.events || []).filter(function (event) {
      return event.season === targetSeason && statusFromEvent(event) === 'completed';
    }).length;
  }

  function sortByDateDesc(events) {
    return (events || []).slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }

  function parseDateParts(dateString) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString || ''));
    if (!match) return null;
    return {
      year: Number(match[1]),
      month: Number(match[2]) - 1,
      day: Number(match[3]),
    };
  }

  function formatMonthLabel(year, month, lang) {
    try {
      return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Shanghai',
      }).format(new Date(Date.UTC(year, month, 1)));
    } catch (error) {
      return year + '-' + String(month + 1).padStart(2, '0');
    }
  }

  function fetchIndex() {
    return fetch('/data/events.index.json', {
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    }).then(function (response) {
      if (!response.ok) throw new Error('Unable to load events index.');
      return response.json();
    });
  }

  function sportBadgeMarkup(event) {
    var label = event.sportLabel
      ? KCVA.i18n.tText(event.sportLabel)
      : KCVA.i18n.t('event.sport.' + (event.sport || 'volleyball'));
    return (
      '<span class="sport-chip" data-sport="' +
      escapeHtml(event.sport || 'volleyball') +
      '">' +
      sportIcon(event.sport) +
      '<span>' +
      escapeHtml(label) +
      '</span></span>'
    );
  }

  function statusBadgeMarkup(status) {
    return (
      '<span class="status-chip" data-status="' +
      escapeHtml(status) +
      '">' +
      escapeHtml(KCVA.i18n.t('event.status.' + status)) +
      '</span>'
    );
  }

  KCVA.events = {
    VALID_STATUSES: VALID_STATUSES,
    VALID_SPORTS: VALID_SPORTS,
    icons: icons,
    sportIcon: sportIcon,
    escapeHtml: escapeHtml,
    statusFromEvent: statusFromEvent,
    academicSeason: academicSeason,
    activeSeason: activeSeason,
    completedCount: completedCount,
    sortByDateDesc: sortByDateDesc,
    parseDateParts: parseDateParts,
    formatMonthLabel: formatMonthLabel,
    fetchIndex: fetchIndex,
    sportBadgeMarkup: sportBadgeMarkup,
    statusBadgeMarkup: statusBadgeMarkup,
  };
})();
