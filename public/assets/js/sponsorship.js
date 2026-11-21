/* global window, document, navigator */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var i18n = KCVA.i18n;
  if (!i18n) return;

  var toastTimer = null;

  function showToast(message) {
    var toast = document.getElementById('kcva-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'kcva-toast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.innerHTML =
        '<span class="toast-check" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"></path></svg>' +
        '</span><span data-toast-text></span>';
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

  function fallbackCopy(value) {
    var textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } finally {
      textarea.remove();
    }
  }

  function copyValue(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value).catch(function () {
        fallbackCopy(value);
      });
    }
    fallbackCopy(value);
    return Promise.resolve();
  }

  i18n.ready.then(function () {
    document.querySelectorAll('[data-copy]').forEach(function (button) {
      button.addEventListener('click', function () {
        var value = button.getAttribute('data-copy') || '';
        var messageKey = button.getAttribute('data-copy-message') || 'sponsorship.copiedEmail';
        copyValue(value)
          .then(function () {
            showToast(i18n.t(messageKey));
          })
          .catch(function () {
            showToast(i18n.t('sponsorship.copyFailed'));
          });
      });
    });

    document.querySelectorAll('.activation-trigger').forEach(function (button) {
      button.addEventListener('click', function () {
        var expanded = button.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(button.getAttribute('aria-controls'));
        var toggle = button.querySelector('.activation-toggle');

        button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        if (panel) panel.hidden = expanded;
        if (toggle) toggle.textContent = expanded ? '+' : '−';
      });
    });
  });
})();
