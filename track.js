/* Medición de la propuesta: visitas, tiempo, lectura, clics, preguntas y vídeos.
   Va a nuestro Umami (sin cookies). Cada acción se guarda con un nombre que se entiende solo.
   Albert se excluye abriendo una vez cualquier página con ?owner=1 */
(function () {
  'use strict';
  var SITE = '72b8f978-c80f-49a2-a511-6c3ac318eea0';
  var HOST = 'https://umami.2slval.easypanel.host';
  if (location.hostname !== 'pracmatik.github.io') return; /* pruebas en local: no cuentan */
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('owner') === '1') localStorage.setItem('umami.disabled', '1');
    if (q.get('owner') === '0') localStorage.removeItem('umami.disabled');
    if (localStorage.getItem('umami.disabled') === '1') return;
  } catch (e) { /* sin almacenamiento: se mide igual */ }

  if (navigator.webdriver) return; /* navegadores manejados por programas: no son personas */

  /* El contador solo arranca cuando una persona hace algo: mover el ratón, tocar, desplazar o teclear.
     Los robots cargan la página y se van sin hacer nada, así que no llegan a contar. */
  var arrancado = false;
  function arrancar() {
    if (arrancado) return;
    arrancado = true;
    var s = document.createElement('script');
    s.defer = true;
    s.src = HOST + '/script.js';
    s.setAttribute('data-website-id', SITE);
    document.head.appendChild(s);
  }
  ['pointermove', 'touchstart', 'scroll', 'keydown', 'wheel'].forEach(function (ev) {
    window.addEventListener(ev, arrancar, { once: true, passive: true });
  });

  var cola = [];
  function track(name) {
    name = String(name).replace(/\s+/g, ' ').trim().slice(0, 50);
    if (window.umami && window.umami.track) { try { window.umami.track(name); } catch (e) {} }
    else cola.push(name);
  }
  window.oxTrack = track;
  var vaciar = setInterval(function () {
    if (!(window.umami && window.umami.track)) return;
    clearInterval(vaciar);
    cola.splice(0).forEach(function (n) { window.umami.track(n); });
  }, 500);

  /* Latido cada 15 s con la pestaña visible: sirve para saber el tiempo real */
  setInterval(function () { if (arrancado && !document.hidden) track('tiempo'); }, 15000);

  /* Cuánto ha leído de la página */
  var marcas = {};
  window.addEventListener('scroll', function () {
    var h = document.documentElement;
    var pct = Math.round(((h.scrollTop || window.scrollY) + innerHeight) / Math.max(h.scrollHeight, 1) * 100);
    [50, 100].forEach(function (m) { if (pct >= m && !marcas[m]) { marcas[m] = 1; track('Lectura ' + m + ' %'); } });
  }, { passive: true });

  /* Clics en enlaces y botones */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('a, button, [data-track]');
    if (!el) return;
    track('Clic: ' + (el.getAttribute('data-track') || el.textContent || el.tagName));
  }, true);

  /* Desplegables (zona y beneficio del presupuesto, etc.) */
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.tagName !== 'SELECT') return;
    var op = el.options[el.selectedIndex];
    track('Cambia: ' + (op ? op.textContent : el.value));
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    /* Secciones vistas (cada una cuenta una vez por visita) */
    if ('IntersectionObserver' in window) {
      var vistas = {};
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var id = e.target.id || e.target.getAttribute('data-section');
          if (e.isIntersecting && id && !vistas[id]) { vistas[id] = 1; track('Ve: ' + id); }
        });
      }, { threshold: 0.4 });
      document.querySelectorAll('section[id], [data-section]').forEach(function (el) { io.observe(el); });
    }
    /* Vídeos: empieza, 25/50/75 % y termina */
    document.querySelectorAll('video[data-video]').forEach(function (v) {
      var n = 'Vídeo ' + v.getAttribute('data-video'), hitos = {};
      v.addEventListener('play', function () { if (!hitos[0]) { hitos[0] = 1; track(n + ': empieza'); } });
      v.addEventListener('ended', function () { track(n + ': termina'); });
      v.addEventListener('timeupdate', function () {
        if (!v.duration) return;
        var p = Math.floor(v.currentTime / v.duration * 4) * 25;
        if (p >= 25 && p < 100 && !hitos[p]) { hitos[p] = 1; track(n + ': ' + p + ' %'); }
      });
    });
  });
})();
