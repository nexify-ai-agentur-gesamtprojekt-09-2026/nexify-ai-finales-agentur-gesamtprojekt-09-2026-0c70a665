// NeXify-Seitenhelfer: Sprache setzen, sanftes Einblenden beim Scrollen (nur Werbeseiten), reduzierte Bewegung respektieren.
(function () {
  var cfg = document.currentScript ? document.currentScript.dataset : {};
  document.documentElement.lang = cfg.lang || 'de';
  if (cfg.reveal === 'off') return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  var SEL = 'section h2, section article, section blockquote, section [role=tablist]';
  var MAX = +(cfg.max || 160), count = 0;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'none'; io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  function scan() {
    var list = document.querySelectorAll(SEL);
    for (var i = 0; i < list.length && count < MAX; i++) {
      var el = list[i]; if (el.dataset.nxr) continue; el.dataset.nxr = '1'; count++;
      var r = el.getBoundingClientRect(); if (r.top < window.innerHeight) continue;
      el.style.opacity = '0'; el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1)';
      io.observe(el);
    }
  }
  var t; var mo = new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 120); });
  function start() { scan(); mo.observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  setTimeout(function () { document.querySelectorAll('[data-nxr]').forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; }); }, 4000);
})();
