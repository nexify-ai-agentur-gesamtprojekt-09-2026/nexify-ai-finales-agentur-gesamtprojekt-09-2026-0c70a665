/* NeXify · Graphite-Skin für Hermes WebUI (geprüft an v0.52.492).
   Nutzt nur die dokumentierte Schnittstelle window.registerHermesSkin (docs/EXTENSIONS.md,
   „Registering a custom theme (skin)“) und fügt eigene, eindeutig benannte Elemente hinzu.
   Ruft keine API der Oberfläche auf, sendet nichts, liest keine Gespräche.
   Farbwerte: config/design-tokens.json (Pfad im Kommentar). */
(function () {
  'use strict';
  if (window.__nexifyGraphite) return;
  window.__nexifyGraphite = true;

  var KEY = 'nexify-graphite';
  var VORGABE = 'nexify-skin-vorgabe';   // einmalige Vorauswahl je Browser, danach gilt die Wahl des Nutzers
  var ICON = '/extensions/icons/icon-192.png';
  var ICON_GROSS = '/extensions/icons/icon-512.png';
  var MANIFEST = '/extensions/app-manifest.json';
  var GRUND = '#1B1E1D';                 // color.dunkel.grund

  var SKIN = {
    name: 'NeXify Graphite', value: KEY, label: 'NeXify Graphite', scheme: 'dark',
    colors: ['#1B1E1D', '#A8C76A', '#ECEFEC'],   // dunkel.grund, marke.lime, dunkel.schrift
    tokens: {
      '--bg': '#1B1E1D', '--sidebar': '#222625', '--surface': '#2A2E2C', '--surface2': '#303634',
      '--text': '#ECEFEC', '--text2': '#CDD3CF', '--muted': '#B4BAB6',
      '--accent': '#A8C76A', '--accent-hover': '#B4CF7C', '--accent-text': '#C7DA98',
      '--accent-contrast': '#162010', '--border': '#363A38', '--border2': '#4A4F4C',
      '--code-bg': '#1E2220', '--code-text': '#C7DA98', '--link': '#A8C76A',
      '--success': '#6FE3CF', '--warning': '#FFC24A', '--danger': '#FF8A7A', '--info': '#38BDF8',
      '--user-bubble': '#303634', '--sidebar-text': '#ECEFEC'
    }
  };

  function speicher(lesen, name, wert) {
    try { return lesen ? window.localStorage.getItem(name) : window.localStorage.setItem(name, wert); }
    catch (e) { return null; }
  }

  // Einmalige Vorauswahl: nur wenn dieser Browser noch keinen anderen Skin gewählt hat.
  if (!speicher(true, VORGABE)) {
    var bisher = (speicher(true, 'hermes-skin') || '').toLowerCase();
    if (!bisher || bisher === 'default') speicher(false, 'hermes-skin', KEY);
    speicher(false, VORGABE, '1');
  }

  var versuche = 0;
  function registrieren() {
    if (typeof window.registerHermesSkin === 'function') { window.registerHermesSkin(SKIN); return; }
    if (++versuche < 100) window.setTimeout(registrieren, 50);
  }

  function aktiv() { return document.documentElement.getAttribute('data-skin') === KEY; }

  function wortmarke(mitClaim) {
    var w = document.createElement('span');
    w.className = 'nx-wortmarke';
    w.setAttribute('role', 'img');
    w.setAttribute('aria-label', 'NeXify AI');
    var x = document.createElement('span');
    x.className = 'nx-x'; x.textContent = 'X';
    w.appendChild(document.createTextNode('Ne')); w.appendChild(x); w.appendChild(document.createTextNode('ify AI'));
    if (mitClaim) {
      var c = document.createElement('span');
      c.className = 'nx-claim'; c.textContent = 'Chat it. Automate it.';
      w.appendChild(c);
    }
    return w;
  }

  function marke() {
    var kopf = document.querySelector('.app-titlebar-icon');
    if (kopf && !kopf.querySelector('.nx-wortmarke')) { kopf.removeAttribute('aria-hidden'); kopf.appendChild(wortmarke(false)); }
    var leer = document.querySelector('.empty-logo');
    if (leer && !leer.querySelector('.nx-wortmarke')) leer.appendChild(wortmarke(true));
  }

  // Icons und Web-App-Manifest folgen dem Skin; beim Abwählen kehren die Originale zurück.
  function zeichen() {
    var an = aktiv();
    var liste = document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"],link[rel="manifest"]');
    for (var i = 0; i < liste.length; i++) {
      var l = liste[i];
      if (!l.hasAttribute('data-nx-original')) l.setAttribute('data-nx-original', l.getAttribute('href') || '');
      var ziel = l.rel === 'manifest' ? MANIFEST : (l.rel === 'apple-touch-icon' ? ICON_GROSS : ICON);
      var soll = an ? ziel : l.getAttribute('data-nx-original');
      if (l.getAttribute('href') !== soll) {
        if (an && l.rel !== 'manifest' && l.rel !== 'apple-touch-icon') { l.removeAttribute('sizes'); l.type = 'image/png'; }
        l.setAttribute('href', soll);
      }
    }
    var farbe = document.getElementById('hermes-theme-color');
    if (farbe && an && farbe.getAttribute('content') !== GRUND) farbe.setAttribute('content', GRUND);
  }

  function lauf() { marke(); zeichen(); }

  function start() {
    registrieren();
    lauf();
    // Die Oberfläche setzt Skin und Kopfzeile selbst neu; darauf reagieren statt in Schleife zu pollen.
    new MutationObserver(lauf).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin', 'class'] });
    var meta = document.getElementById('hermes-theme-color');
    if (meta) new MutationObserver(zeichen).observe(meta, { attributes: true, attributeFilter: ['content'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
