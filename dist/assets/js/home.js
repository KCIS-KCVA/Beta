/* global window, document */
(function () {
  'use strict';

  var KCVA = (window.KCVA = window.KCVA || {});
  var i18n = KCVA.i18n;
  var eventsApi = KCVA.events;
  if (!i18n || !eventsApi) return;

  function setHeroBackground(index) {
    var hero = document.getElementById('home-hero-bg');
    var event = (index.events || [])[0];
    if (!hero || !event || !event.heroImage) return;
    hero.style.backgroundImage = 'url("' + String(event.heroImage).replace(/"/g, '%22') + '")';
  }

  function boot() {
    eventsApi.fetchIndex().then(setHeroBackground).catch(function () {
      // The hero keeps its dark fallback if the index cannot be loaded.
    });
  }

  i18n.ready.then(boot);
})();
