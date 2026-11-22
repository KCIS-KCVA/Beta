/* global window, document, navigator */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var i18n = KCVA.i18n;
  if (!i18n) return;

  var toastTimer = null;
  var packageModal = null;
  var packageTrigger = null;
  var currentPackage = null;

  var PACKAGES = {
    title: {
      title: 'sponsorship.package1',
      summary: 'sponsorship.packageSummary1',
      benefits: [
        'sponsorship.packageBenefit1a',
        'sponsorship.packageBenefit1b',
        'sponsorship.packageBenefit1c',
        'sponsorship.packageBenefit1d',
      ],
    },
    court: {
      title: 'sponsorship.package2',
      summary: 'sponsorship.packageSummary2',
      benefits: [
        'sponsorship.packageBenefit2a',
        'sponsorship.packageBenefit2b',
        'sponsorship.packageBenefit2c',
        'sponsorship.packageBenefit2d',
      ],
    },
    partner: {
      title: 'sponsorship.package3',
      summary: 'sponsorship.packageSummary3',
      benefits: [
        'sponsorship.packageBenefit3a',
        'sponsorship.packageBenefit3b',
        'sponsorship.packageBenefit3c',
        'sponsorship.packageBenefit3d',
      ],
    },
  };

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

  function setPackageBackgroundInert(inert) {
    ['#global-header', '#main', '#global-footer'].forEach(function (selector) {
      var element = document.querySelector(selector);
      if (!element) return;
      if (inert) element.setAttribute('inert', '');
      else element.removeAttribute('inert');
    });
  }

  function fillPackage(key) {
    if (!packageModal || !PACKAGES[key]) return;
    var config = PACKAGES[key];
    packageModal.querySelector('.package-modal-title').textContent = i18n.t(config.title);
    packageModal.querySelector('.package-modal-summary').textContent = i18n.t(config.summary);
    packageModal.querySelector('.package-modal-list').innerHTML = config.benefits
      .map(function (benefitKey) {
        return '<li>' + escapeHtml(i18n.t(benefitKey)) + '</li>';
      })
      .join('');
  }

  function openPackage(key, trigger) {
    if (!packageModal || !PACKAGES[key]) return;
    currentPackage = key;
    fillPackage(key);
    packageTrigger = trigger || null;
    packageModal.hidden = false;
    document.body.classList.add('no-scroll');
    setPackageBackgroundInert(true);
    window.setTimeout(function () {
      var closeButton = packageModal.querySelector('.package-modal-close');
      if (closeButton) closeButton.focus();
    }, 20);
  }

  function closePackage(returnFocus) {
    if (!packageModal || packageModal.hidden) return;
    packageModal.hidden = true;
    currentPackage = null;
    document.body.classList.remove('no-scroll');
    setPackageBackgroundInert(false);
    if (returnFocus && packageTrigger && document.contains(packageTrigger)) {
      packageTrigger.focus();
    }
    packageTrigger = null;
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

    packageModal = document.getElementById('package-detail');

    document.querySelectorAll('[data-package]').forEach(function (button) {
      button.addEventListener('click', function () {
        openPackage(button.getAttribute('data-package'), button);
      });
    });

    if (packageModal) {
      packageModal.querySelectorAll('[data-package-close]').forEach(function (control) {
        control.addEventListener('click', function () {
          closePackage(true);
        });
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && packageModal && !packageModal.hidden) {
        closePackage(true);
      }
    });

    document.addEventListener('kcva:languagechange', function () {
      if (packageModal && !packageModal.hidden && currentPackage) fillPackage(currentPackage);
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
