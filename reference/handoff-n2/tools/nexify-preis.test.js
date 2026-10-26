// Tests zuerst (TDD). Ausführen: new Function(tests + impl)() über run_script.
function runTests(P) {
  const r = []; const eq = (n, a, b) => r.push([n, Math.abs(a - b) < 1e-9 || a === b, a, b]);
  // Preisformel
  eq('A: EK 100 -> 145', P.vkNetto(100, 'aufschlag'), 145);
  eq('B: EK 100 -> 181,818182', P.vkNetto(100, 'marge'), 181.818182);
  eq('B: Marge am VK = 45 %', P.round6(1 - 100 / P.vkNetto(100, 'marge')), 0.45);
  eq('Anfrage EK_USD 2000/500 @3/15', P.ekUsd(2000, 500, 3, 15), 0.0135);
  eq('EK EUR bei 0,92', P.round6(P.ekUsd(2000, 500, 3, 15) * 0.92), 0.01242);
  // Rundung: intern 6 Stellen, Rechnung je Position auf Cent
  eq('10.000 Anfragen, A, Cent', P.positionCent(Array(10000).fill(0.01242), 'aufschlag'), 180.09);
  // Steuer
  eq('NL Unternehmen 21 %', P.steuersatz({ land: 'NL', ustId: 'NL1', viesOk: true }), 0.21);
  eq('DE mit gültiger USt-IdNr. 0 %', P.steuersatz({ land: 'DE', ustId: 'DE1', viesOk: true }), 0);
  eq('DE ohne gültige USt-IdNr. = offen', P.steuersatz({ land: 'DE', ustId: '', viesOk: false }), 'klaeren');
  eq('CH nicht steuerbar', P.steuersatz({ land: 'CH' }), 0);
  eq('Vermerk DE', P.vermerk({ land: 'DE', ustId: 'DE1', viesOk: true }), 'Steuerschuldnerschaft des Leistungsempfängers (BTW verlegd)');
  // Schwellen und Sperre
  eq('49 % -> keine Meldung', P.schwelle(49, 100), 'ok');
  eq('50 % -> Hinweis', P.schwelle(50, 100), 'hinweis50');
  eq('80 % -> Warnung', P.schwelle(80, 100), 'warnung80');
  eq('100 % weich -> nur kritisch', P.darfAnfragen({ verbraucht: 100, budget: 100, modus: 'weich', kritisch: false }), false);
  eq('100 % weich, kritischer Schlüssel -> läuft', P.darfAnfragen({ verbraucht: 100, budget: 100, modus: 'weich', kritisch: true }), true);
  eq('100 % hart, kritisch -> gesperrt', P.darfAnfragen({ verbraucht: 100, budget: 100, modus: 'hart', kritisch: true }), false);
  eq('Kreditrahmen überschritten -> gesperrt', P.darfAnfragen({ verbraucht: 10, budget: 100, modus: 'weich', kritisch: true, offen: 1001, kredit: 1000 }), false);
  // Idempotenz
  const L = P.ledger(); L.buche('req-1', 0.5); L.buche('req-1', 0.5); eq('Doppelbuchung verhindert', L.summe(), 0.5);
  return r;
}
