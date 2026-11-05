// Pure-function unit tests for the shop client logic (apps/web/components/shop/api.ts): the PAngV
// Grundpreis math, the configured-vs-unavailable failure classification (D-010), the supplier image
// CSP allow-rule, delivery-window validation and the add-intent key. No network, DOM or React.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url), ts = require("typescript");
const source = readFileSync(new URL("../../web/components/shop/api.ts", import.meta.url), "utf8");
const out = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const mod = {exports: {}};
vm.runInNewContext(out, {
  module: mod, exports: mod.exports,
  require(n) { throw new Error("unexpected import " + n); },
  crypto: globalThis.crypto, Intl, Date, URL, Math, Number, RegExp, Object, console,
  window: {dispatchEvent() { return true; }},
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
  fetch: () => { throw new Error("no network in unit test"); },
});
const api = mod.exports;
// basePrice/deliveryWindow return objects created inside the vm realm, so strict deepEqual would fail on
// the cross-realm prototype. Compare by value instead.
const sameShape = (actual, expected) => assert.equal(JSON.stringify(actual), JSON.stringify(expected));

test("basePrice computes the PAngV Grundpreis per base unit, half-up, else null", () => {
  sameShape(api.basePrice(500, 250, "g"), {cents: 2000, unit: "kg"});   // 5,00 € / 250 g → 20,00 €/kg
  sameShape(api.basePrice(199, 500, "ml"), {cents: 398, unit: "l"});    // 1,99 € / 500 ml → 3,98 €/l
  sameShape(api.basePrice(1000, 2, "kg"), {cents: 500, unit: "kg"});
  sameShape(api.basePrice(1000, 1, "m"), {cents: 1000, unit: "m"});
  for (const bad of [[null, 250, "g"], [-1, 250, "g"], [1.5, 250, "g"], [500, 0, "g"], [500, -3, "g"], [500, 250, "x"], [500, 250, null]])
    assert.equal(api.basePrice(bad[0], bad[1], bad[2]), null, "invalid input must yield null: " + JSON.stringify(bad));
});

test("catalogFailure marks only an explicit 503 setup answer as unconfigured", () => {
  assert.equal(api.catalogFailure({status: 503, error: "catalog_not_configured"}), "unconfigured");
  assert.equal(api.catalogFailure({status: 503, error: "runtime_binding_unavailable", body: {reason: "public_origin_unbound"}}), "unconfigured");
  // a configured-but-unreachable database is a connection failure, not a missing setup
  assert.equal(api.catalogFailure({status: 503, error: "runtime_binding_unavailable", body: {reason: "database_metadata_unavailable"}}), "unavailable");
  assert.equal(api.catalogFailure({status: 502, error: "bad_gateway"}), "unavailable");
  assert.equal(api.catalogFailure(null), "unavailable");
  assert.equal(api.catalogFailure({status: 503, error: "runtime_binding_unavailable", body: {}}), "unavailable");
});

test("supplierImageSource allows only a clean cdnbigbuy image URL", () => {
  assert.equal(api.supplierImageSource("https://cdnbigbuy.com/images/a/b.jpg"), "https://cdnbigbuy.com/images/a/b.jpg");
  for (const bad of ["https://cdnbigbuy.com/images/../secret.jpg", "https://evil.example/images/a.jpg",
                     "https://cdnbigbuy.com/images/a.gif", "https://cdnbigbuy.com/images/a b.jpg",
                     "http://cdnbigbuy.com/images/a.jpg", "", null, "https://cdnbigbuy.com/other/a.jpg"])
    assert.equal(api.supplierImageSource(bad), null, "must reject: " + bad);
});

test("deliveryWindow accepts only well-formed integer bounds", () => {
  sameShape(api.deliveryWindow(1, 3), {min: 1, max: 3});
  sameShape(api.deliveryWindow(2, 2), {min: 2, max: 2});
  for (const bad of [[3, 1], [0, 3], [null, 3], [1, null], [1.5, 3]])
    assert.equal(api.deliveryWindow(bad[0], bad[1]), null, "must reject: " + JSON.stringify(bad));
});

test("cartIntentKey is a unique add-prefixed key", () => {
  const a = api.cartIntentKey(), b = api.cartIntentKey();
  assert.ok(a.startsWith("add:") && b.startsWith("add:"));
  assert.notEqual(a, b);
});

test("money formats cents as de-DE euro", () => {
  assert.match(api.money(1999), /19,99/);
});
