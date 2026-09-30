// NeXify AI · Preis- und Abrechnungskern (reine Funktionen, getestet in nexify-preis.test.js)
var NexifyPreis = (function () {
  const round6 = (x) => Math.round(x * 1e6) / 1e6;
  const cent = (x) => Math.round(x * 100) / 100;
  const EU = ['AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR','HU','IE','IT','LT','LU','LV','MT','PL','PT','RO','SE','SI','SK'];
  // Variante A: Aufschlag auf EK (×1,45) · Variante B: 45 % Marge am Endpreis (÷0,55) — Entscheidung E1
  const vkNetto = (ek, variante) => round6(variante === 'marge' ? ek / 0.55 : ek * 1.45);
  const ekUsd = (tin, tout, preisInMio, preisOutMio) => round6(tin * preisInMio / 1e6 + tout * preisOutMio / 1e6);
  const positionCent = (ekListeEur, variante) => cent(ekListeEur.reduce((s, ek) => s + (variante === 'marge' ? ek / 0.55 : ek * 1.45), 0));
  function steuersatz(k) {
    if (k.land === 'NL') return 0.21;
    if (EU.includes(k.land)) return k.ustId && k.viesOk ? 0 : 'klaeren';
    return 0;
  }
  function vermerk(k) {
    const s = steuersatz(k);
    if (k.land === 'NL') return '';
    if (s === 0 && EU.includes(k.land)) return 'Steuerschuldnerschaft des Leistungsempfängers (BTW verlegd)';
    if (s === 0) return 'Nicht im Inland steuerbar';
    return 'Steuerliche Behandlung vor Rechnungsstellung klären';
  }
  function schwelle(verbraucht, budget) {
    if (budget <= 0) return 'stopp';
    const q = verbraucht / budget * 100;
    return q >= 100 ? 'stopp' : q >= 80 ? 'warnung80' : q >= 50 ? 'hinweis50' : 'ok';
  }
  function darfAnfragen(z) {
    if (z.kredit != null && (z.offen || 0) > z.kredit) return false;
    if (z.verbraucht < z.budget) return true;
    return z.modus === 'weich' && !!z.kritisch;
  }
  function ledger() {
    const gebucht = new Map();
    return { buche: (id, betrag) => { if (!gebucht.has(id)) gebucht.set(id, round6(betrag)); }, summe: () => round6([...gebucht.values()].reduce((a, b) => a + b, 0)) };
  }
  return { round6, cent, vkNetto, ekUsd, positionCent, steuersatz, vermerk, schwelle, darfAnfragen, ledger };
})();
