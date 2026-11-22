"""Offline serializer and component checks. No shop/DB/provider is initialized."""
import ast
import json
from pathlib import Path
import subprocess
import types
import unittest

ROOT = Path(__file__).resolve().parents[1]


def presentation_functions():
    tree = ast.parse((ROOT / "apps/shop-api/shop/catalog_api.py").read_text())
    nodes = [node for node in tree.body if
             isinstance(node, ast.Import) and any(a.name == "re" for a in node.names)
             or isinstance(node, ast.ImportFrom) and node.module == "urllib.parse"
             or isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "SUPPLIER_IMAGE_HOSTS" for t in node.targets)
             or isinstance(node, ast.FunctionDef) and node.name in ("supplier_image", "present")]
    scope = {"pricing": types.SimpleNamespace(config=types.SimpleNamespace(VAT_PERCENT=19))}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), "catalog_presentation", "exec"), scope)
    return scope


class ProductPresentationIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.functions = presentation_functions()

    def product(self, **fields):
        return self.functions["present"]({"_id": "bb-1", "name": "Supplier product", **fields}, {"price_released": False}, full=True)

    def test_unknown_stock_is_not_zero_or_false(self):
        for value in (None, True, False, -1, "0", 1.5, 2**53):
            with self.subTest(value=value):
                row = self.product(stock=value)
                self.assertIsNone(row["stock"])
                self.assertIsNone(row["in_stock"])
                self.assertEqual(row["stock_status"], "unknown")
        self.assertIsNone(self.product()["stock"])

    def test_known_zero_and_positive_stock_remain_distinct(self):
        zero, positive = self.product(stock=0), self.product(stock=3)
        self.assertEqual((zero["stock"], zero["in_stock"]), (0, False))
        self.assertEqual((positive["stock"], positive["in_stock"]), (3, True))

    def test_only_exact_supplier_original_candidates_survive(self):
        valid = "https://cdnbigbuy.com/images/V0103601_000_MKT5.jpg"
        invalid = [None, 7, "http://cdnbigbuy.com/images/a.jpg", "//cdnbigbuy.com/images/a.jpg",
                   "https://cdnbigbuy.com.evil.example/images/a.jpg", "https://evil.example/a.jpg",
                   "https://user@cdnbigbuy.com/images/a.jpg", "https://cdnbigbuy.com:443/images/a.jpg",
                   "https://cdnbigbuy.com/images/a.svg", "https://cdnbigbuy.com/images/a.jpg?x=1",
                   "https://cdnbigbuy.com/images/../a.jpg", "https://cdnbigbuy.com/images/%2e%2e/a.jpg",
                   "https://cdnbigbuy.com/images/a.jpg#x", "https://cdnbigbuy.com/images/a\\.jpg",
                   "https://cdnbigbuy.com/images/a\n.jpg", "data:image/png;base64,abc",
                   "/media/generated/product.webp", "/api/shop/image?src=https://evil.example/a.jpg"]
        for value in invalid:
            with self.subTest(value=value):
                self.assertIsNone(self.functions["supplier_image"](value))
        row = self.product(images=[*invalid, valid, valid])
        self.assertEqual(row["image"], valid)
        self.assertEqual(row["images"], [valid])
        self.assertEqual(row["image_status"], "supplier_original")
        for malformed in (None, "https://cdnbigbuy.com/images/a.jpg", {"url": valid}, []):
            self.assertIsNone(self.product(images=malformed)["image"])

    def test_frontend_filters_images_and_shows_error_and_unknown_stock(self):
        script = r'''
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ts = require('./apps/web/node_modules/typescript');
let state = null;
const jsx = (type, props) => ({type, props});
const apiSource = fs.readFileSync('apps/web/components/shop/api.ts', 'utf8');
function load(source, modules) {
  const output = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exports = {};
  vm.runInNewContext(output, {exports, require:n => {if (!(n in modules)) throw new Error(n); return modules[n];}, Intl, URL, Date, Number});
  return exports;
}
const api = load(apiSource, {});
const src = 'https://cdnbigbuy.com/images/V0103601_000_MKT5.jpg';
assert.equal(api.supplierImageSource(src), src);
for (const bad of ['https://evil.example/a.jpg','/media/generated.webp','/api/shop/image?src=x','https://cdnbigbuy.com/images/../a.jpg','https://cdnbigbuy.com/images/a.svg','https://cdnbigbuy.com:443/images/a.jpg']) assert.equal(api.supplierImageSource(bad), null);
const card = load(fs.readFileSync('apps/web/components/shop/ProductCard.tsx','utf8'), {
  'react':{useState:()=>[state, value=>{state=value;}]},
  'react/jsx-runtime':{jsx,jsxs:jsx}, '../Router':{SiteLink:'a'}, './api':api, './ProductPlaceholder':{ProductPlaceholder:'placeholder'},
  '../Workspace':{useUI:()=>({locale:'de'})},
  '../../../../config/shop-interface-copy.json':{default:JSON.parse(fs.readFileSync('config/shop-interface-copy.json','utf8'))}
});
let view = card.ProductImage({src,alt:'Actual product'});
const img = view.props.children;
assert.equal(img.type,'img'); assert.equal(img.props.style.objectFit,'contain');
assert.equal(img.props.referrerPolicy,'no-referrer');
img.props.onError();
view=card.ProductImage({src,alt:'Actual product'});
assert.equal(view.props.children.type,'placeholder');
assert.equal(view.props.children.props.label,'Lieferantenbild konnte nicht geladen werden');
view=card.ProductImage({src:src.replace('MKT5','MKT6'),alt:'Next variant'});
assert.equal(view.props.children.type,'img');
view=card.ProductImage({src:'/media/ai-product.webp',alt:'Product'});
assert.equal(view.props.children.type,'placeholder');
assert.equal(view.props.children.props.label,'Kein Lieferantenbild verfügbar');
assert(card.StockLabel({stock:null}).props.children.includes('unbekannt'));
// Befund cubic (PR #219): die echte Platzhalter-Komponente prüfen, nicht nur den Mock.
const copyJson = JSON.parse(fs.readFileSync('config/shop-interface-copy.json','utf8'));
for (const locale of ['de','nl','fr','en']) assert.ok(copyJson[locale].placeholderCaption, locale);
assert.equal(view.props.children.props.caption, copyJson.de.placeholderCaption);
const ph = load(fs.readFileSync('apps/web/components/shop/ProductPlaceholder.tsx','utf8'), {'react':{useId:()=>':r1:'}, 'react/jsx-runtime':{jsx,jsxs:jsx}});
const svg = ph.ProductPlaceholder({label:'Kein Lieferantenbild verfügbar', caption:copyJson.en.placeholderCaption});
assert.equal(svg.type,'svg'); assert.equal(svg.props.role,'img'); assert.equal(svg.props['aria-label'],'Kein Lieferantenbild verfügbar');
const flat = node => node == null || typeof node !== 'object' ? [node] : [node, ...[].concat(node.props?.children ?? []).flatMap(flat)];
const nodes = flat(svg);
assert.ok(nodes.includes(copyJson.en.placeholderCaption), 'lokalisierte Unterzeile');
const texts = nodes.filter(n => n && n.type === 'text');
// fester dunkler Grund: Schrift aus dem hellen Dunkel-Token, nicht aus dem themenabhängigen Text-Token
for (const t of texts) assert.equal(t.props.style.fill, 'var(--color-dunkel-licht)');
assert(card.StockLabel({stock:0}).props.children.includes('nicht auf Lager'));
console.log(JSON.stringify({passed:true}));
'''
        result = subprocess.run(["node", "-e", script], cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(json.loads(result.stdout)["passed"])


if __name__ == "__main__":
    unittest.main()
