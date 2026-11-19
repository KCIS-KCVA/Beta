/* global window, document, navigator, URL, File, Image, setTimeout, clearTimeout */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var i18n = KCVA.i18n;
  var activeModal = null;

  var SANS =
    '"Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

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

  function loadImage(source) {
    return new Promise(function (resolve) {
      var image = new Image();
      var settled = false;
      var timer = window.setTimeout(function () {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 1800);

      image.crossOrigin = 'anonymous';
      image.onload = function () {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(image);
      };
      image.onerror = function () {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(null);
      };
      image.src = source;
    });
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxWidth) {
    var lines = [];
    String(text || '')
      .split('\n')
      .forEach(function (paragraph) {
        var words = paragraph.trim().split(/\s+/).filter(Boolean);
        var line = '';

        words.forEach(function (word) {
          var candidate = line ? line + ' ' + word : word;
          if (ctx.measureText(candidate).width <= maxWidth) {
            line = candidate;
            return;
          }

          if (line) lines.push(line);

          if (ctx.measureText(word).width > maxWidth) {
            var chunk = '';
            Array.from(word).forEach(function (character) {
              if (ctx.measureText(chunk + character).width > maxWidth && chunk) {
                lines.push(chunk);
                chunk = character;
              } else {
                chunk += character;
              }
            });
            line = chunk;
          } else {
            line = word;
          }
        });

        if (line) lines.push(line);
      });

    return lines.length ? lines : [''];
  }

  function drawCenteredSpacedText(ctx, text, centerX, y, spacing) {
    var characters = Array.from(String(text));
    var widths = characters.map(function (character) {
      return ctx.measureText(character).width;
    });
    var total = widths.reduce(function (sum, width) {
      return sum + width;
    }, 0);
    total += Math.max(0, characters.length - 1) * spacing;

    var x = centerX - total / 2;
    characters.forEach(function (character, index) {
      ctx.fillText(character, x + widths[index] / 2, y);
      x += widths[index] + spacing;
    });
  }

  function sportLabel(eventData) {
    if (eventData && eventData.sportLabel) return i18n.tText(eventData.sportLabel);
    return i18n.t(
      'event.sport.' + (eventData && eventData.sport === 'frisbee' ? 'frisbee' : 'volleyball'),
    );
  }

  function sessionSlug() {
    var segments = window.location.pathname.split('/').filter(Boolean);
    var eventsIndex = segments.indexOf('events');
    return eventsIndex !== -1 && segments[eventsIndex + 1]
      ? decodeURIComponent(segments[eventsIndex + 1])
      : 'event';
  }

  function posterFilename(division) {
    var base = sessionSlug().replace(/-\d{2}-\d{2}$/, '');
    var divisionId = String(division.id || 'division')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-');
    return 'kcva-' + base + '-' + divisionId + '-results.jpg';
  }

  function buildPosterCanvas(eventData, division) {
    var canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    var ctx = canvas.getContext('2d');
    if (!ctx) return Promise.reject(new Error('Canvas 2D is unavailable.'));

    var rows = (division && division.rows) || [];
    var divisionTitle = i18n.tText(division.title);
    var eventTitle = i18n.tText(eventData.title);
    var venue = (eventData.venue && i18n.tText(eventData.venue.name)) || '';
    var deadlines = eventData.deadlines || {};
    var dateLabel = i18n.formatDateLabel(deadlines.eventDate || eventData.dateRangeLabel || '');
    var meta = dateLabel + (venue ? ' • ' + venue : '');
    var sport =
      eventData.sport === 'frisbee'
        ? 'frisbee'
        : eventData.sport === 'basketball'
          ? 'basketball'
          : 'volleyball';
    var isFrisbee = sport === 'frisbee';
    var isBasketball = sport === 'basketball';

    return Promise.all([loadImage('/images/logo.png'), document.fonts ? document.fonts.ready : Promise.resolve()]).then(
      function (results) {
        var logo = results[0];

        // Base canvas and card
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 1080, 1350);
        roundedRect(ctx, 48, 48, 984, 1254, 8);
        ctx.fillStyle = '#121212';
        ctx.fill();
        ctx.strokeStyle = '#2B2B2B';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Logo
        if (logo) {
          ctx.drawImage(logo, 80, 78, 200, 64);
        } else {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 50px Georgia, "Times New Roman", serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText('KCVA', 80, 126);
        }

        // Sport pill
        var badgeText = sportLabel(eventData).toUpperCase();
        ctx.font = '700 17px ' + SANS;
        var badgeWidth = Math.max(156, ctx.measureText(badgeText).width + 42);
        var badgeX = 1000 - badgeWidth;
        var badgeY = 84;
        roundedRect(ctx, badgeX, badgeY, badgeWidth, 40, 4);
        ctx.fillStyle = '#1A1A1A';
        ctx.fill();
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#FFDF00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + 20);

        // Event title
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 46px ' + SANS;
        var titleLines = wrapText(ctx, eventTitle, 910).slice(0, 3);
        var titleY = 214;
        titleLines.forEach(function (line, index) {
          ctx.fillText(line, 80, titleY + index * 56);
        });

        var afterTitleY = titleY + (titleLines.length - 1) * 56;
        var metaY = afterTitleY + 48;
        ctx.fillStyle = '#A3A3A3';
        ctx.font = '500 21px ' + SANS;
        var metaLines = wrapText(ctx, meta, 910).slice(0, 2);
        metaLines.forEach(function (line, index) {
          ctx.fillText(line, 80, metaY + index * 29);
        });

        var divisionY = metaY + (metaLines.length - 1) * 29 + 54;
        ctx.fillStyle = '#FFDF00';
        ctx.font = '800 34px ' + SANS;
        ctx.fillText(
          divisionTitle.toUpperCase() + ' — ' + i18n.t('event.results').toUpperCase(),
          80,
          divisionY,
        );

        var tableTop = divisionY + 26;
        var tableX = 64;
        var tableWidth = 952;
        var headerHeight = 58;
        var maxTableBottom = 1120;
        var availableRowsHeight = maxTableBottom - tableTop - headerHeight;
        var rowHeight =
          availableRowsHeight > 0 && rows.length > 0
            ? Math.floor(availableRowsHeight / rows.length)
            : 78;
        rowHeight = Math.min(106, Math.max(56, rowHeight));
        var tableHeight = headerHeight + rows.length * rowHeight;

        roundedRect(ctx, tableX, tableTop, tableWidth, tableHeight, 6);
        ctx.fillStyle = '#0B0B0B';
        ctx.fill();
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.save();
        roundedRect(ctx, tableX, tableTop, tableWidth, tableHeight, 6);
        ctx.clip();
        ctx.fillStyle = '#161616';
        ctx.fillRect(tableX, tableTop, tableWidth, headerHeight);
        ctx.restore();

        var columns;
        if (isFrisbee) {
          columns = [
            { key: 'position', label: i18n.t('event.posShort'), x: 116, align: 'center' },
            { key: 'team', label: i18n.t('event.table.team'), x: 174, align: 'left' },
            { key: 'played', label: i18n.t('event.table.played'), x: 486, align: 'center' },
            { key: 'won', label: i18n.t('event.table.wins'), x: 558, align: 'center' },
            { key: 'lost', label: i18n.t('event.table.losses'), x: 632, align: 'center' },
            { key: 'setsOrDiff', label: i18n.t('event.table.diff'), x: 725, align: 'center' },
            { key: 'sotg', label: i18n.t('event.table.sotg'), x: 835, align: 'center' },
            { key: 'points', label: i18n.t('event.table.points'), x: 954, align: 'center' },
          ];
        } else if (isBasketball) {
          columns = [
            { key: 'position', label: i18n.t('event.posShort'), x: 112, align: 'center' },
            { key: 'team', label: i18n.t('event.table.team'), x: 168, align: 'left' },
            { key: 'played', label: i18n.t('event.table.played'), x: 470, align: 'center' },
            { key: 'won', label: i18n.t('event.table.wins'), x: 536, align: 'center' },
            { key: 'lost', label: i18n.t('event.table.losses'), x: 602, align: 'center' },
            { key: 'pf', label: i18n.t('event.table.pf'), x: 680, align: 'center' },
            { key: 'pa', label: i18n.t('event.table.pa'), x: 750, align: 'center' },
            { key: 'diff', label: i18n.t('event.table.diff'), x: 825, align: 'center' },
            { key: 'points', label: i18n.t('event.table.points'), x: 954, align: 'center' },
          ];
        } else {
          columns = [
            { key: 'position', label: i18n.t('event.posShort'), x: 134, align: 'center' },
            { key: 'team', label: i18n.t('event.table.team'), x: 190, align: 'left' },
            { key: 'played', label: i18n.t('event.table.played'), x: 552, align: 'center' },
            { key: 'won', label: i18n.t('event.table.wins'), x: 632, align: 'center' },
            { key: 'lost', label: i18n.t('event.table.losses'), x: 712, align: 'center' },
            { key: 'setsOrDiff', label: i18n.t('event.table.sets'), x: 816, align: 'center' },
            { key: 'points', label: i18n.t('event.table.points'), x: 954, align: 'center' },
          ];
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 16px ' + SANS;
        ctx.textBaseline = 'middle';
        columns.forEach(function (column) {
          ctx.textAlign = column.align;
          ctx.fillText(column.label.toUpperCase(), column.x, tableTop + headerHeight / 2 + 1);
        });

        ctx.fillStyle = '#222222';
        ctx.fillRect(tableX, tableTop + headerHeight, tableWidth, 1.5);

        rows.forEach(function (row, index) {
          var rowTop = tableTop + headerHeight + index * rowHeight;
          var centerY = rowTop + rowHeight / 2 + 1;
          var color = row.position <= 3 ? '#E0BF22' : '#E5E5E5';

          var rowData = {};
          Object.keys(row).forEach(function (key) {
            rowData[key] = row[key];
          });
          if (isBasketball && (rowData.diff == null || rowData.diff === '')) {
            var difference = Number(rowData.pf || 0) - Number(rowData.pa || 0);
            rowData.diff = difference > 0 ? '+' + difference : String(difference);
          }

          ctx.fillStyle = color;
          columns.forEach(function (column) {
            ctx.textAlign = column.align;
            ctx.font =
              column.key === 'team'
                ? '700 22px ' + SANS
                : column.key === 'position'
                  ? '700 22px ' + SANS
                  : '500 21px ' + SANS;
            ctx.fillText(String(rowData[column.key] == null ? '-' : rowData[column.key]), column.x, centerY);
          });

          if (index < rows.length - 1) {
            ctx.fillStyle = '#222222';
            ctx.fillRect(tableX, rowTop + rowHeight, tableWidth, 1.5);
          }
        });

        // Footer watermark
        var footerY = 1238;
        ctx.fillStyle = '#222222';
        ctx.fillRect(80, footerY - 54, 920, 1.5);
        ctx.fillStyle = '#777777';
        ctx.font = '600 17px ' + SANS;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        drawCenteredSpacedText(
          ctx,
          'KC VARSITY ASSOCIATION • SHANGHAI',
          540,
          footerY,
          3,
        );

        return canvas;
      },
    );
  }

  function canvasToJpeg(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(
        function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('The poster could not be encoded.'));
        },
        'image/jpeg',
        0.95,
      );
    });
  }

  function closeActiveModal() {
    if (!activeModal) return;
    activeModal.cleanup();
    activeModal = null;
  }

  function downloadBlob(blobUrl, filename) {
    var link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function openModal(blob, filename, shareTitle, onToast) {
    closeActiveModal();

    var previousFocus = document.activeElement;
    var blobUrl = URL.createObjectURL(blob);
    var background = ['#global-header', '#main', '#global-footer']
      .map(function (selector) {
        return document.querySelector(selector);
      })
      .filter(Boolean);
    var overlay = document.createElement('div');
    overlay.className = 'poster-modal';
    overlay.innerHTML =
      '<button class="poster-backdrop" type="button" tabindex="-1" aria-label="' + escapeHtml(i18n.t('event.close')) + '"></button>' +
      '<div class="poster-dialog" role="dialog" aria-modal="true" aria-labelledby="poster-modal-title">' +
      '<div class="poster-head"><div><p class="poster-eyebrow">KCVA</p><h2 class="poster-title" id="poster-modal-title">' +
      escapeHtml(i18n.t('event.posterPreview')) +
      '</h2></div><button class="poster-close" type="button" aria-label="' +
      escapeHtml(i18n.t('event.close')) +
      '">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</button></div>' +
      '<img class="poster-preview" alt="' +
      escapeHtml(i18n.t('event.posterAlt')) +
      '">' +
      '<div class="poster-actions">' +
      '<button class="btn btn-solid" type="button" data-poster-share>' +
      escapeHtml(i18n.t('event.shareNow')) +
      '</button>' +
      '<a class="btn btn-outline" download="' +
      escapeHtml(filename) +
      '" data-poster-download>' +
      escapeHtml(i18n.t('event.downloadJpg')) +
      '</a>' +
      '</div></div>';

    var preview = overlay.querySelector('.poster-preview');
    preview.src = blobUrl;
    var downloadLink = overlay.querySelector('[data-poster-download]');
    downloadLink.href = blobUrl;

    var file = new File([blob], filename, { type: 'image/jpeg' });
    var shareButton = overlay.querySelector('[data-poster-share]');

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab') return;
      var focusable = overlay.querySelectorAll(
        'button:not([disabled]):not([tabindex="-1"]), a[href], [tabindex]:not([tabindex="-1"])',
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
    }

    function close() {
      if (!overlay.isConnected) return;
      overlay.remove();
      document.removeEventListener('keydown', onKeydown);
      document.body.classList.remove('no-scroll');
      background.forEach(function (element) {
        element.removeAttribute('inert');
      });
      URL.revokeObjectURL(blobUrl);
      activeModal = null;
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    }

    function share() {
      var canShareFiles = false;
      try {
        canShareFiles =
          typeof navigator.share === 'function' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] });
      } catch (error) {
        canShareFiles = false;
      }

      if (!canShareFiles) {
        downloadBlob(blobUrl, filename);
        if (typeof onToast === 'function') onToast(i18n.t('event.shareUnavailable'));
        return;
      }

      navigator
        .share({ files: [file], title: shareTitle })
        .then(function () {
          close();
        })
        .catch(function (error) {
          if (error && error.name === 'AbortError') return;
          downloadBlob(blobUrl, filename);
          if (typeof onToast === 'function') onToast(i18n.t('event.shareUnavailable'));
        });
    }

    overlay.querySelector('.poster-backdrop').addEventListener('click', close);
    overlay.querySelector('.poster-close').addEventListener('click', close);
    shareButton.addEventListener('click', share);
    downloadLink.addEventListener('click', function () {
      if (typeof onToast === 'function') {
        window.setTimeout(function () {
          onToast(i18n.t('event.posterDownloaded'));
        }, 120);
      }
    });
    document.addEventListener('keydown', onKeydown);
    document.body.classList.add('no-scroll');
    background.forEach(function (element) {
      element.setAttribute('inert', '');
    });
    document.body.appendChild(overlay);
    overlay.querySelector('.poster-close').focus();

    activeModal = { cleanup: close };
  }

  function open(options) {
    var eventData = options && options.eventData;
    var division = options && options.division;
    if (!eventData || !division || !i18n) return Promise.reject(new Error('Missing poster data.'));

    return buildPosterCanvas(eventData, division)
      .then(canvasToJpeg)
      .then(function (blob) {
        var filename = posterFilename(division);
        var title =
          i18n.tText(eventData.title) +
          ' — ' +
          i18n.tText(division.title) +
          ' ' +
          i18n.t('event.results');
        openModal(blob, filename, title, options.onToast);
        return true;
      });
  }

  KCVA.sharePoster = { open: open };
})();
