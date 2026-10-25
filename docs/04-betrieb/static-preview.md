# Lokale statische Vorschau

`node server.mjs` startet die lokale Vorschau (`PORT`, Standard 3000). Die Startseite
bleibt `apps-index.html`; die Prototypenübersicht liegt als eigene Vorschauseite
in `preview-prototypes.html`, außerhalb der manifestgeschützten Referenzen.
Standardmäßig bindet der Server nur an `127.0.0.1`. Eine andere Bind-Adresse muss
ausdrücklich über `HOST` gesetzt werden; dies ersetzt keine Deployment-Freigabe.

Der Server liefert ausschließlich die beiden Einstiegseiten, die Token-CSS-Datei,
die vorhandene UI-Vorschau samt Komponenten-CSS und statische Webdateien unter
`prototypen/`. Repository-Konfiguration, Quelltext außerhalb der Browserreferenzen,
Dotfiles und das Manifest bleiben gesperrt. Symbolische Links werden aufgelöst;
auch ihr tatsächliches Ziel muss innerhalb der freigegebenen Vorschaupfade liegen.

`/prototypen` leitet mit 308 auf `/prototypen/` weiter und erhält Queryparameter.
`/prototypen/` und `/prototypen/index.html` liefern die Übersicht mit denselben
25 Referenzlinks. Ihr expliziter Basispfad erhält korrekte Links auch beim direkten
Abruf von `/preview-prototypes.html`. GET und HEAD werden unterstützt.

`prototypen/index.html` ist bytegetreu aus Commit
`bf4a6b3ae62cec0e923c4822e155ddc5a8827199` wiederhergestellt. Die historische
Manifestprüfsumme bleibt unverändert. Die später hinzugefügte Navigation ist
dadurch erhalten, ohne die geschützte Referenz für einen Vorschauzweck zu ändern.

Prüfung: `python3 -m unittest discover -s tests -p 'test_static_preview.py' -v`.
Der Test startet einen eigenen Server auf einem freien Port und prüft die Aliase,
Redirects, HEAD sowie Inhalt und Erreichbarkeit aller 25 Referenzseiten.
Weitere Gegenproben prüfen private und kodierte Pfade, Traversal sowie Symlinks
zu privaten Dateien innerhalb und außerhalb eines isolierten Test-Checkouts.

Diese Routen gelten für den Node-Vorschauserver. `vercel.json` veröffentlicht
weiterhin ausschließlich `prototypen/`; dort bleibt der originale Einstieg mit
Weiterleitung auf Cloud v12. Die neue Übersicht wird durch diesen bestehenden
Vercel-Ausgabevertrag nicht veröffentlicht. Eine Änderung dieses Vertrags oder
ein Deployment gehört nicht zu dieser lokalen Reparatur.
