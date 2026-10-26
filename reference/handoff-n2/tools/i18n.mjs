#!/usr/bin/env node
// Systemweite i18n (de Standard, nl/fr). Schlüssel aus config/i18n.json.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const I18N = JSON.parse(readFileSync(join(root, 'config/i18n.json'), 'utf8'));

export function t(schluessel, sprache = 'de') {
  const e = I18N.texte[schluessel];
  if (!e) return schluessel;
  return e[sprache] || e[I18N.default] || e.de;
}

// CLI (nur bei Direktaufruf, nicht bei Import)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , sprache = 'de'] = process.argv;
  console.log(JSON.stringify({
    sprache,
    produkte: [t('produkt.one', sprache), t('produkt.onePlus', sprache)],
    modelle: [t('modell.flash', sprache), t('modell.pro', sprache)],
    companion: t('companion', sprache),
    willkommen: t('willkommen', sprache),
  }, null, 2));
}
