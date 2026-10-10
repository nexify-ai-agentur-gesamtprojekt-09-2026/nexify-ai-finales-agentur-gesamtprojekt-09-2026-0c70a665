# Factory-Worker

## Zweck
Automatisiert die Umsetzung von Issues, die eine `target:`-Zeile enthalten. Der Worker erzeugt den Dateiinhalt per LLM, legt einen Branch an und oeffnet einen MR.

## Ablauf
1. Issue mit `target: <pfad>` wird angelegt.
2. Worker liest Issue-Body und Zielpfad.
3. LLM erzeugt den vollstaendigen Dateiinhalt.
4. Adapter schreibt Datei, committet, pusht Branch.
5. MR wird gegen den Default-Branch geoeffnet.
6. CI laeuft auf dem MR.
7. Review durch Maintainer.
8. Release nach Merge.

## Modellroute
`openrouter/deepseek-v4.1-flash` ueber `ai-router.nexifyai.cloud`.

## Aufruf
```
node tools/factory-worker.mjs --issue <iid>
```

## Hinweise
- Ohne `target:`-Zeile wird das Issue ignoriert.
- Der Worker committet nur die Zieldatei.
- Fehlgeschlagene CI blockiert den Merge.
