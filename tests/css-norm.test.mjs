import test from "node:test";
import assert from "node:assert/strict";
import { pruefeCss, naechster } from "../tools/css-norm.mjs";

test("rastet Schrift und Abstand auf die Design-Norm, bei Gleichstand nach oben", () => {
  assert.equal(naechster(10, [8, 12]), 12);
  const { befunde, text } = pruefeCss(".a{font-size:11px;padding:10px 6px;gap:16px}");
  assert.equal(text, ".a{font-size:12px;padding:12px 8px;gap:16px}");
  assert.deepEqual(befunde.map((b) => [b.ist, b.soll]), [[11, 12], [10, 12], [6, 8]]);
});

test("lässt Ausdrücke, Variablen und eigene Eigenschaften unberührt", () => {
  const css = ".a{padding:calc(10px + 2%);margin:var(--x, 10px);gap:4px;--t:13px;font-size:clamp(13px,2vw,15px)}";
  assert.deepEqual(pruefeCss(css), { befunde: [], text: css });
});

test("begrenzt Fließtext auf 68 Zeichen und meldet Radien nur", () => {
  const { befunde, text } = pruefeCss(".p{max-width:76ch;border-radius:10px}");
  assert.equal(text, ".p{max-width:68ch;border-radius:10px}");
  assert.deepEqual(befunde.map((b) => [b.art, b.erzwungen]), [["zeilenlaenge", true], ["radius", false]]);
});

test("erlaubt 1-px-Verlaufsrahmen über padding mit mask-composite", () => {
  const css = ".r::after{padding:1px;mask-composite:exclude}.s{padding:1px}";
  const { befunde, text } = pruefeCss(css);
  assert.equal(text, ".r::after{padding:1px;mask-composite:exclude}.s{padding:0px}");
  assert.equal(befunde.length, 1);
});
