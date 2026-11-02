import assert from 'node:assert/strict';
import test from 'node:test';
import {buildSeoState} from '../src/seo-state.mjs';

const localized=value=>({de:value,nl:`NL ${value}`,fr:`FR ${value}`,en:`EN ${value}`});
const page={id:'websites',path:'/leistungen/websites',localizedTitle:localized('Websites mit Substanz'),localizedSummary:localized('Gestaltung, Text und Technik aus einem Konzept.')};

test('route metadata binds title description canonical locale and WebPage schema',()=>{
  const state=buildSeoState({page,locale:'nl',pathname:page.path,origin:'https://example.test'});
  assert.equal(state.title,'NL Websites mit Substanz · NeXify AI');
  assert.equal(state.description,'NL Gestaltung, Text und Technik aus einem Konzept.');
  assert.equal(state.canonical,'https://example.test/leistungen/websites');
  assert.equal(state.ogLocale,'nl_NL');
  assert.equal(state.language,'nl-NL');
  const webPage=state.structuredData['@graph'].find(item=>item['@type']==='WebPage');
  assert.equal(webPage.url,state.canonical);
  assert.equal(webPage.inLanguage,'nl-NL');
  assert.equal(webPage.description,state.description);
});

test('unproven dynamic detail stays on the registered route base canonical',()=>{
  const detail={...page,id:'tk-product',path:'/teileklar/produkt'};
  const state=buildSeoState({page:detail,locale:'de',pathname:'/teileklar/produkt/bremse-123',origin:'https://example.test'});
  assert.equal(state.canonical,'https://example.test/teileklar/produkt');
});

test('unknown route is excluded from archives and never becomes its own canonical URL',()=>{
  const state=buildSeoState({page:undefined,locale:'fr',pathname:'/privat',origin:'https://example.test'});
  assert.equal(state.canonical,'https://example.test/');
  assert.equal(state.robots,'noindex,nofollow,noarchive');
  assert.equal(state.title,'Page indisponible · NeXify AI');
  assert.equal(state.structuredData['@graph'].some(item=>item['@type']==='WebPage'),false);
});

test('standalone file origin falls back to the reviewed public origin without throwing',()=>{
  const state=buildSeoState({page,locale:'de',pathname:page.path,origin:'null'});
  assert.equal(state.canonical,'https://nexify-ai-factory-20261101.workspace-vo-0220.chatgpt.site/leistungen/websites');
});
