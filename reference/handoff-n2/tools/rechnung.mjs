#!/usr/bin/env node
// Rechnung als XRechnung (UBL 2.1 XML) aus einer Buchung erzeugen.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(root, 'docs/generiert/rechnungen');

export function xrechnung({ nr, kunde, betragEur, name, datum }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ID>${nr}</cbc:ID>
  <cbc:IssueDate>${datum.slice(0,10)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyName><cbc:Name>NeXify</cbc:Name></cac:PartyName></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyName><cbc:Name>${kunde}</cbc:Name></cac:PartyName></cac:Party></cac:AccountingCustomerParty>
  <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="EUR">${betragEur}</cbc:LineExtensionAmount><cac:Item><cbc:Name>${name}</cbc:Name></cac:Item></cac:InvoiceLine>
  <cac:LegalMonetaryTotal><cbc:TaxExclusiveAmount currencyID="EUR">${betragEur}</cbc:TaxExclusiveAmount><cbc:PayableAmount currencyID="EUR">${betragEur}</cbc:PayableAmount></cac:LegalMonetaryTotal>
</Invoice>`;
}

// CLI: node tools/rechnung.mjs <nr> <kunde> <betragEur> <name>
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , nr = 'RG-TEST', kunde = 'kunde@example.com', betragEur = '9.99', name = 'NeXify AI one'] = process.argv;
  const datum = new Date().toISOString();
  const xml = xrechnung({ nr, kunde, betragEur, name, datum });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${nr}.xml`), xml);
  console.log(JSON.stringify({ nr, datei: `${nr}.xml`, zeichen: xml.length, xrechnung: true }));
}
