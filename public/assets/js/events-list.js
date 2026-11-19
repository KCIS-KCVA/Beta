/* global window, document, URL, URLSearchParams, Intl, Date */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var i18n = KCVA.i18n;
  var eventsApi = KCVA.events;
  if (!i18n || !eventsApi) return;

  var PAGE_SIZE = 10;
  var STATUS_VALUES = ['all', 'completed', 'live', 'scheduled'];
  var SPORT_VALUES = ['all', 'volleyball', 'frisbee', 'basketball'];
  var VIEW_VALUES = ['list', 'calendar'];

  var state = {
    q: '',
    status: 'all',
    sport: 'all',
    view: 'list',
    page: 1,
  };

  var index = null;
  var allEvents = [];
  var filteredEvents = [];
  var calendarYear = 0;
  var calendarMonth = 0;
  var calendarInitialized = false;

  var el = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    el.form = byId('events-search-form');
    el.input = byId('events-search-input');
    el.count = byId('events-result-count');
    el.listView = byId('events-list-view');
    el.list = byId('events-list');
    el.calendarView = byId('events-calendar-view');
    el.calendarMonthLabel = byId('calendar-month-label');
    el.calendarWeekdays = byId('calendar-weekdays');
    el.calendarGrid = byId('calendar-grid');
    el.calendarAgenda = byId('calendar-agenda');
    el.calendarPrev = byId('calendar-prev');
    el.calendarNext = byId('calendar-next');
    el.pagination = byId('events-pagination');
    el.results = byId('events-results');
  }

  function isValid(value, allowed) {
    return allowed.indexOf(value) !== -1;
  }

  function readStateFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var status = params.get('status') || 'all';
    var sport = params.get('sport') || 'all';
    var view = params.get('view') || 'list';
    var page = Number(params.get('page') || 1);

    state.q = (params.get('q') || '').trim();
    state.status = isValid(status, STATUS_VALUES) ? status : 'all';
    state.sport = isValid(sport, SPORT_VALUES) ? sport : 'all';
    state.view = isValid(view, VIEW_VALUES) ? view : 'list';
    state.page = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  }

  function syncUrl() {
    var url = new URL(window.location.href);
    var params = url.searchParams;

    if (state.q) params.set('q', state.q);
    else params.delete('q');

    if (state.status !== 'all') params.set('status', state.status);
    else params.delete('status');

    if (state.sport !== 'all') params.set('sport', state.sport);
    else params.delete('sport');

    params.set('view', state.view);
    params.set('page', String(state.page));

    window.history.replaceState(
      window.history.state,
      '',
      url.pathname + '?' + params.toString() + url.hash,
    );
  }

  function hasActiveFilters() {
    return Boolean(state.q) || state.status !== 'all' || state.sport !== 'all';
  }

  function localizedText(value) {
    if (value && typeof value === 'object') {
      return [value.en || '', value.zh || ''].join(' ');
    }
    return String(value || '');
  }

  function eventStatus(event) {
    return eventsApi.statusFromEvent(event);
  }

  function eventHaystack(event) {
    return [
      localizedText(event.title),
      localizedText(event.subtitle),
      localizedText(event.venue),
      localizedText(event.sportLabel),
      event.sport,
      event.dateLabel,
    ]
      .join(' ')
      .toLowerCase();
  }

  function applyFiltersAndSort() {
    var query = state.q.toLowerCase();

    filteredEvents = eventsApi.sortByDateDesc(
      allEvents.filter(function (event) {
        if (query && eventHaystack(event).indexOf(query) === -1) return false;
        if (state.status !== 'all' && eventStatus(event) !== state.status) return false;
        if (state.sport !== 'all' && event.sport !== state.sport) return false;
        return true;
      }),
    );
  }

  function initCalendarMonth() {
    if (calendarInitialized) return;
    var latest = eventsApi.sortByDateDesc(allEvents)[0];
    var parts = latest ? eventsApi.parseDateParts(latest.date) : null;
    var now = new Date();
    calendarYear = parts ? parts.year : now.getFullYear();
    calendarMonth = parts ? parts.month : now.getMonth();
    calendarInitialized = true;
  }

  function updateControlStates() {
    document.querySelectorAll('[data-filter-status]').forEach(function (button) {
      var active = button.getAttribute('data-filter-status') === state.status;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    document.querySelectorAll('[data-filter-sport]').forEach(function (button) {
      var active = button.getAttribute('data-filter-sport') === state.sport;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    document.querySelectorAll('[data-view]').forEach(function (button) {
      var active = button.getAttribute('data-view') === state.view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function updateViews() {
    if (!el.listView || !el.calendarView) return;
    el.listView.hidden = state.view !== 'list';
    el.calendarView.hidden = state.view !== 'calendar';
    if (el.pagination) {
      el.pagination.hidden = state.view !== 'list' || state.pageCount <= 1;
    }
  }

  function updateCounter() {
    if (!el.count) return;
    if (!hasActiveFilters()) {
      el.count.hidden = true;
      el.count.textContent = '';
      return;
    }

    el.count.hidden = false;
    el.count.textContent = i18n.t(
      filteredEvents.length === 1 ? 'events.countActiveOne' : 'events.countActive',
      { count: filteredEvents.length },
    );
  }

  function pinIcon() {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>'
    );
  }

  function eventCardMarkup(event) {
    var status = eventStatus(event);
    var title = i18n.tText(event.title);
    var subtitle = i18n.tText(event.subtitle);
    var venue = i18n.tText(event.venue);

    return (
      '<article class="event-list-card">' +
      '<a class="event-list-link" href="' +
      eventsApi.escapeHtml(event.url) +
      '">' +
      '<div class="event-list-main">' +
      '<div class="event-list-topline">' +
      eventsApi.sportBadgeMarkup(event) +
      eventsApi.statusBadgeMarkup(status) +
      '<time class="event-list-date" datetime="' +
      eventsApi.escapeHtml(event.date) +
      '">' +
      eventsApi.escapeHtml(event.dateLabel) +
      '</time>' +
      '</div>' +
      '<h2 class="event-list-title">' +
      eventsApi.escapeHtml(title) +
      '</h2>' +
      '<p class="event-list-subtitle">' +
      eventsApi.escapeHtml(subtitle) +
      '</p>' +
      '<p class="event-list-venue">' +
      pinIcon() +
      '<span>' +
      eventsApi.escapeHtml(venue) +
      '</span>' +
      '</p>' +
      '</div>' +
      '<span class="event-list-cta">' +
      i18n.t('events.viewEvent') +
      eventsApi.icons.arrowRight +
      '</span>' +
      '</a>' +
      '</article>'
    );
  }

  function emptyMarkup(title, body, showReset) {
    return (
      '<div class="events-empty">' +
      eventsApi.icons.search +
      '<h2>' +
      eventsApi.escapeHtml(title) +
      '</h2>' +
      '<p>' +
      eventsApi.escapeHtml(body) +
      '</p>' +
      (showReset
        ? '<button class="events-reset" type="button" data-reset-filters>' +
          eventsApi.escapeHtml(i18n.t('events.reset')) +
          '</button>'
        : '') +
      '</div>'
    );
  }

  function renderList() {
    if (!el.list) return;
    var totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * PAGE_SIZE;
    var pageEvents = filteredEvents.slice(start, start + PAGE_SIZE);

    if (!pageEvents.length) {
      el.list.innerHTML = emptyMarkup(
        hasActiveFilters() ? i18n.t('events.noResults') : i18n.t('events.empty'),
        hasActiveFilters() ? i18n.t('events.noResultsBody') : i18n.t('events.emptyBody'),
        hasActiveFilters(),
      );
    } else {
      el.list.innerHTML = pageEvents.map(eventCardMarkup).join('');
    }

    state.pageCount = totalPages;
    renderPagination();
  }

  function renderPagination() {
    if (!el.pagination) return;
    if (state.pageCount <= 1 || state.view !== 'list') {
      el.pagination.hidden = true;
      el.pagination.innerHTML = '';
      return;
    }

    var buttons = [];
    buttons.push(
      '<button class="pagination-arrow" type="button" data-page="' +
        (state.page - 1) +
        '" aria-label="' +
        eventsApi.escapeHtml(i18n.t('events.prev')) +
        '"' +
        (state.page === 1 ? ' disabled' : '') +
        '>' +
        eventsApi.icons.chevronLeft +
        '</button>',
    );

    for (var pageNumber = 1; pageNumber <= state.pageCount; pageNumber += 1) {
      buttons.push(
        '<button class="pagination-page' +
          (pageNumber === state.page ? ' is-active' : '') +
          '" type="button" data-page="' +
          pageNumber +
          '" aria-label="' +
          eventsApi.escapeHtml(i18n.t('events.pageAria', { page: pageNumber })) +
          '"' +
          (pageNumber === state.page ? ' aria-current="page"' : '') +
          '>' +
          pageNumber +
          '</button>',
      );
    }

    buttons.push(
      '<button class="pagination-arrow" type="button" data-page="' +
        (state.page + 1) +
        '" aria-label="' +
        eventsApi.escapeHtml(i18n.t('events.next')) +
        '"' +
        (state.page === state.pageCount ? ' disabled' : '') +
        '>' +
        eventsApi.icons.chevronRight +
        '</button>',
    );

    el.pagination.innerHTML = buttons.join('');
    el.pagination.hidden = false;
  }

  function weekdayLabels() {
    var labels = [];
    var formatter = new Intl.DateTimeFormat(i18n.getLanguage() === 'zh' ? 'zh-CN' : 'en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    });
    for (var day = 0; day < 7; day += 1) {
      labels.push(formatter.format(new Date(Date.UTC(2024, 0, 7 + day))));
    }
    return labels;
  }

  function eventsInMonth(year, month) {
    return filteredEvents.filter(function (event) {
      var parts = eventsApi.parseDateParts(event.date);
      return parts && parts.year === year && parts.month === month;
    });
  }

  function calendarEventMarkup(event) {
    var status = eventStatus(event);
    var title = i18n.tText(event.title);
    return (
      '<a class="calendar-event" data-status="' +
      eventsApi.escapeHtml(status) +
      '" href="' +
      eventsApi.escapeHtml(event.url) +
      '" aria-label="' +
      eventsApi.escapeHtml(title + ', ' + event.dateLabel) +
      '">' +
      eventsApi.sportIcon(event.sport) +
      '<span class="calendar-event-label">' +
      eventsApi.escapeHtml(title) +
      '</span>' +
      '<span class="calendar-event-dot" aria-hidden="true"></span>' +
      '</a>'
    );
  }

  function agendaMarkup(monthEvents) {
    if (!monthEvents.length) {
      return (
        '<div class="calendar-agenda">' +
        '<h3>' +
        eventsApi.escapeHtml(i18n.t('events.calendarAgenda')) +
        '</h3><p class="calendar-agenda-empty">' +
        eventsApi.escapeHtml(i18n.t('events.noMonthEvents')) +
        '</p></div>'
      );
    }

    return (
      '<div class="calendar-agenda"><h3>' +
      eventsApi.escapeHtml(i18n.t('events.calendarAgenda')) +
      '</h3>' +
      monthEvents
        .map(function (event) {
          var status = eventStatus(event);
          return (
            '<a class="calendar-agenda-item" href="' +
            eventsApi.escapeHtml(event.url) +
            '">' +
            '<span class="calendar-agenda-date">' +
            eventsApi.escapeHtml(event.dateLabel) +
            '</span>' +
            '<span class="calendar-agenda-title">' +
            eventsApi.escapeHtml(i18n.tText(event.title)) +
            '</span>' +
            eventsApi.statusBadgeMarkup(status) +
            eventsApi.icons.arrowRight +
            '</a>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderCalendar() {
    if (!el.calendarGrid || !el.calendarMonthLabel) return;

    var monthEvents = eventsInMonth(calendarYear, calendarMonth);
    var firstDay = new Date(Date.UTC(calendarYear, calendarMonth, 1)).getUTCDay();
    var daysInMonth = new Date(Date.UTC(calendarYear, calendarMonth + 1, 0)).getUTCDate();
    var now = new Date();
    var todayDate =
      now.getFullYear() +
      '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getDate()).padStart(2, '0');

    el.calendarMonthLabel.textContent = eventsApi.formatMonthLabel(
      calendarYear,
      calendarMonth,
      i18n.getLanguage(),
    );

    el.calendarWeekdays.innerHTML = weekdayLabels()
      .map(function (label) {
        return '<span>' + eventsApi.escapeHtml(label) + '</span>';
      })
      .join('');

    var cells = [];
    for (var blank = 0; blank < firstDay; blank += 1) {
      cells.push('<div class="calendar-day is-empty" aria-hidden="true"></div>');
    }

    for (var day = 1; day <= daysInMonth; day += 1) {
      var dateKey =
        calendarYear +
        '-' +
        String(calendarMonth + 1).padStart(2, '0') +
        '-' +
        String(day).padStart(2, '0');
      var dayEvents = monthEvents.filter(function (event) {
        var parts = eventsApi.parseDateParts(event.date);
        return parts && parts.day === day;
      });
      cells.push(
        '<div class="calendar-day' +
          (dayEvents.length ? ' has-events' : '') +
          (dateKey === todayDate ? ' is-today' : '') +
          '">' +
          '<span class="calendar-day-number">' +
          day +
          '</span>' +
          '<div class="calendar-day-events">' +
          dayEvents.map(calendarEventMarkup).join('') +
          '</div></div>',
      );
    }

    var remainder = cells.length % 7;
    if (remainder) {
      for (var extra = 0; extra < 7 - remainder; extra += 1) {
        cells.push('<div class="calendar-day is-empty" aria-hidden="true"></div>');
      }
    }

    el.calendarGrid.innerHTML = cells.join('');
    el.calendarAgenda.innerHTML = agendaMarkup(monthEvents);
  }

  function render() {
    applyFiltersAndSort();
    state.pageCount = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
    if (state.page > state.pageCount) state.page = state.pageCount;

    syncUrl();
    updateControlStates();
    updateCounter();
    updateViews();
    renderList();
    renderCalendar();
  }

  function boot() {
    cacheElements();
    readStateFromUrl();
    if (el.input) el.input.value = state.q;

    eventsApi
      .fetchIndex()
      .then(function (data) {
        index = data;
        allEvents = data.events || [];
        initCalendarMonth();
        render();
      })
      .catch(function () {
        if (el.list) {
          el.list.innerHTML =
            '<div class="events-empty">' +
            eventsApi.icons.search +
            '<h2>' +
            eventsApi.escapeHtml(i18n.t('events.loadError')) +
            '</h2><button class="btn btn-outline-yellow" type="button" id="events-retry">' +
            eventsApi.escapeHtml(i18n.t('common.retry')) +
            '</button></div>';
        }
        if (el.count) el.count.hidden = true;
        if (el.pagination) el.pagination.hidden = true;
        var retry = document.getElementById('events-retry');
        if (retry) retry.addEventListener('click', function () { window.location.reload(); });
      });
  }

  function bindEvents() {
    cacheElements();

    if (el.form) {
      el.form.addEventListener('submit', function (event) {
        event.preventDefault();
        state.q = el.input ? el.input.value.trim() : '';
        state.page = 1;
        render();
      });
    }

    document.querySelectorAll('[data-filter-status]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.status = button.getAttribute('data-filter-status') || 'all';
        state.page = 1;
        render();
      });
    });

    document.querySelectorAll('[data-filter-sport]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.sport = button.getAttribute('data-filter-sport') || 'all';
        state.page = 1;
        render();
      });
    });

    document.querySelectorAll('[data-view]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.view = button.getAttribute('data-view') || 'list';
        render();
      });
    });

    if (el.calendarPrev) {
      el.calendarPrev.addEventListener('click', function () {
        calendarMonth -= 1;
        if (calendarMonth < 0) {
          calendarMonth = 11;
          calendarYear -= 1;
        }
        renderCalendar();
      });
    }

    if (el.calendarNext) {
      el.calendarNext.addEventListener('click', function () {
        calendarMonth += 1;
        if (calendarMonth > 11) {
          calendarMonth = 0;
          calendarYear += 1;
        }
        renderCalendar();
      });
    }

    if (el.list) {
      el.list.addEventListener('click', function (event) {
        var reset = event.target.closest('[data-reset-filters]');
        if (!reset) return;
        state.q = '';
        state.status = 'all';
        state.sport = 'all';
        state.page = 1;
        if (el.input) {
          el.input.value = '';
          el.input.focus();
        }
        render();
      });
    }

    if (el.pagination) {
      el.pagination.addEventListener('click', function (event) {
        var button = event.target.closest('button[data-page]');
        if (!button || button.disabled) return;
        var page = Number(button.getAttribute('data-page'));
        if (!Number.isFinite(page) || page < 1) return;
        state.page = page;
        render();
        if (el.results) el.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  i18n.ready.then(function () {
    bindEvents();
    boot();
  });

  document.addEventListener('kcva:languagechange', function () {
    if (index) render();
  });
})();
