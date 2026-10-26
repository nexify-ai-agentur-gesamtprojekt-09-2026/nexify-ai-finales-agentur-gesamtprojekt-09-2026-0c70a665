# Presenter für Pascal, NeX und AIFly: technische Auswahl

Stand **26.10.2026**, öffentliche Quellen geprüft zwischen 09:47 und 09:49 UTC.
Empfehlung: **vorhandene, freigegebene Aufnahmen zuerst mit eigenen React-Bedienelementen ausliefern**. Eine optionale Seitentour folgt nur bei tatsächlichem Bedarf; ein Live-Avatar ist ein eigener späterer Integrationsschritt.

Der Nutzeranhang `virtuele_presenters_concept.md` ist eine Gedankenhilfe. Seine historische YAOTI-Darstellung wurde hier nicht nachrecherchiert. Die Annahme, WebM mit Alphakanal funktioniere allgemein in modernen Browsern, ist keine hinreichende technische Grundlage. Auch stummes Autoplay ist keine Garantie und wird für den empfohlenen Einstieg nicht benötigt.

Alle genauen Paketversionen, Registry-/Archiv-/Dokument-Hashes, Abrufzeitpunkte, Lizenzfundstellen und offenen Voraussetzungen stehen in [presenter-options.json](../../config/research/presenter-options.json). Acht npm-Archive wurden gegen ihre veröffentlichten SHA-512-Integritätswerte geprüft und ihre mitgelieferten README-/Lizenzdateien gelesen. Es wurde kein Paket installiert, kein Providerkonto angemeldet und kein kostenpflichtiger Aufruf ausgeführt.

## Sieben passende Bausteine

| Baustein | Quellenbefund | Eignung und konkrete Grenze |
|---|---|---|
| **Eigene Clips + native Mediensteuerung; optional Video.js/Media Chrome** | `video.js@10.2.0`: Apache-2.0. Dieses Paket enthält laut README selbst keinen Player mehr. React verwendet `@videojs/react@10.2.0`, dessen Peerbereiche React/ReactDOM 18 oder 19 umfassen. `media-chrome@4.19.4`: MIT, dokumentierte React-Wrapper. | Erste Wahl für bereits vorhandene Runway-Clips und freigegebenes ElevenLabs-Audio. Zunächst reicht gegebenenfalls HTML-`video`/`audio`. Erst bei belegtem Bedarf **einen** Player ergänzen. Media Chrome verweist inzwischen auf die gemeinsame Video.js-Weiterentwicklung; beide Systeme nicht vorsorglich stapeln. SDK-Lizenz überträgt keine Bild-/Stimmrechte. |
| **Driver.js 1.10.2** | MIT im veröffentlichten Archiv; README nennt Tastatursteuerung. Keine React-Peerabhängigkeit. | Kleine, frameworkunabhängige Tour-/Hervorhebungsoption. React muss Instanz, Fokus, Zielverfügbarkeit und Aufräumen bei Seitenwechseln steuern. Keine React-19-Laufzeitprüfung durch diese Recherche. |
| **React Joyride 3.2.0** | MIT; veröffentlichte Peerbereiche `react: 16.8 - 19` und `react-dom: 16.8 - 19`. README nennt kontrollierten Zustand, Fokusführung, Tastatur und ARIA. | Alternative zu Driver.js, wenn kontrollierter React-Zustand und eigene Tooltip-Komponenten benötigt werden. Eine pauschale Behauptung fehlender React-19-Unterstützung wäre für diese Version falsch. Tatsächliche Integration in React 19.3.1 bleibt zu testen. |
| **Shepherd.js 15.3.0** | Registry: AGPL-3.0. Mitgelieferte Lizenz und README beschreiben AGPL-/kommerzielle Doppellizenzierung und verlangen für kommerzielle Produkte bzw. umsatzgenerierende Unternehmen eine kommerzielle Lizenz. | Funktional passende Tourlösung, aber keine Standardempfehlung für die Agentur. Vor Adoption die tatsächlich geltenden kommerziellen Bedingungen klären. Ein anders lizenzierter React-Wrapper hebt die Kernlizenz nicht auf. Dies ist eine Wiedergabe der Anbieterbedingungen, keine Rechtsberatung. |
| **HeyGen LiveAvatar Web SDK 0.0.19** | `@heygen/liveavatar-web-sdk`: MIT. README dokumentiert backendseitig beschafftes Sessiontoken sowie Start/Stop. **Mikrofon ist standardmäßig an und nicht stummgeschaltet.** | Optionaler Live-Video-Pilot. Für NeXify ausdrücklich `voiceChat.defaultMuted: true` bzw. Textmodus wählen und erst nach Nutzeraktion starten. API-Key bleibt im Backend. Das SDK nennt keinen React-Peerbereich; native React-Kapselung und Browserprüfung sind erforderlich. SaaS-/Avatarrechte sind separat. |
| **D-ID Client SDK 3.0.8** | `@d-id/client-sdk`: MIT. README unterscheidet `chat()` mit dem Agenten-LLM und `speak()` für vorgegebenen Text. Import ist laut README SSR-sicher; tatsächliches Verbinden benötigt einen Browser. | Alternative zu HeyGen für einen späteren Live-Video-Pilot. Native eigene Oberfläche statt Studio-/Dashboard-Iframe. Das tatsächliche Agenten-, Credential- und Sitzungsschema zuerst verifizieren; keine pauschale Erlaubnis, einen Provider-API-Key im Browser zu hinterlegen. |
| **ElevenLabs React SDK 1.19.1** | `@elevenlabs/react`: MIT; React-Peerbereich `>=16.8.0`. README und React-Dokumentation behandeln Sprach-/Textgespräche. Sprachgespräche benötigen Mikrofonzugriff. | Optionaler Sprachbegleiter, **kein Video-Avatar-Renderer**. Bestehendes TTS über Composio und eine direkte ElevenLabs-Livesitzung sind verschiedene Integrationen. Vorhandene Stimme oder Voice-ID belegt keine Live-Agenten-Konfiguration. Text bleibt ohne Mikrofon nutzbar. |

Offizielle Einstiege:

- [Driver.js Installation](https://driverjs.com/docs/installation), [Joyride Getting Started](https://react-joyride.com/docs/getting-started).
- [Shepherd-Repository](https://github.com/shipshapecode/shepherd), besonders die Lizenz der tatsächlich gepinnten Version.
- [Video.js React Installation](https://videojs.org/docs/guides/installation/react), [Media-Chrome-Repository](https://github.com/muxinc/media-chrome).
- [HeyGen LiveAvatar SDK](https://github.com/heygen-com/live-avatar-js-sdk), [D-ID Agents SDK](https://github.com/de-id/agents-sdk), [D-ID SDK Overview](https://docs.d-id.com/reference/agents-sdk-overview).
- [ElevenLabs React SDK](https://elevenlabs.io/docs/eleven-agents/libraries/react).

Die versuchten Pfade `https://www.media-chrome.org/docs/en/react` und `https://docs.liveavatar.com/docs/getting-started` lieferten **404**. Für diese Optionen stützt sich der Befund daher auf das tatsächliche Paket-README und die verifizierte Lizenz; eine erfolgreich gelesene Dokumentationsseite wird nicht vorgetäuscht. Repository-Einstiege sind weiterführende Links; die gehashten Paketdateien sind die hier konkret geprüften Versionsquellen.

## Einbau in das vorhandene NeXify-System

Die vorhandene [Workspace-Komponente](../../apps/web/components/Workspace.tsx), der [Routeradapter](../../apps/web/components/Router.tsx) und die [portable React-Anwendung](../../apps/site/src/main.tsx) bleiben die gemeinsame Oberfläche. Der seitliche Begleiter kann dadurch bei normalem Seitenwechsel bestehen bleiben. Eigene Steuerung, Texte, Tokens und DE/NL/FR-Fassungen haben Vorrang vor fremden Beispielskins. Hier wurde noch kein Presenter implementiert.

Ein späterer Presenter bindet Seite, Anwendungskontext, Auftritt, Sprache und Medienversion. Pascal, NeX und AIFly erhalten explizite Medienreferenzen; keine automatische Stimm-/Personenzuordnung aus einem Foto. Ein Wechsel zwischen NeXify und TEILEKLAR ist keine gemeinsame Identität oder Mandantenfreigabe. Private Seiten bleiben hinter ihrer bestehenden Authgrenze; eine Tour kann diese Grenze nicht übergehen.

Die Stimmzuordnung aus [hero-media.md](../contracts/hero-media.md) bleibt unverändert: NeX `Lbm7qDmJUxIxpWx9qhZO`, AIFly und Nutzer jeweils `feTHtWuEJFLTOWyoreyy`. Dies sind Nutzerreferenzen, keine neu geprüften Konto- oder Nutzungsrechte. Vorhandene Runway-/ElevenLabs-Medien wurden in dieser Recherche nicht gelesen. Der nächste Arbeitsschritt ist deshalb ein autorisiertes Assetinventar mit Hashes, vorhandenen Varianten und Rechtebelegen, keine vorsorgliche Neugenerierung.

Touren führen durch vorhandene Funktionen. Sie lösen keine Bestellung, Zahlung, Nachricht oder Terminbestätigung aus. Sprache oder Avatar dürfen nur tatsächlich erreichte Zustände erklären: PDF-Entwurf, vorgemerkter Versand, angefragter Termin und Marketingentwurf bleiben getrennte Zustände. Ein Provider-Chat ist keine allgemeine Berechtigung für Business-Tools.

Für Livebetrieb braucht es einen engen serverseitigen Sessionvertrag, Provider-Kontobindung, begrenzte Laufzeit, Quota und Aufräumen beim Schließen. Ein anonymer öffentlicher Begleiter benötigt eine ausdrücklich begrenzte BFF-Funktion; ein allgemeiner Operator-Key darf nicht in den Browser gelangen. Dies ist ein vorgeschlagener Integrationsschnitt, kein vorhandener Endpunkt. Ein unklar ausgegangener kostenpflichtiger Start wird vor erneutem Start abgeglichen; Seitenwechsel dürfen keine neue bezahlte Sitzung starten.

## Browser, Bedienung und Datenschutz als Abnahmepunkte

- **Medien:** Poster zuerst, Wiedergabe auf Wunsch, kein Tonautoplay. `play()`-Ablehnung behandeln. `playsinline` und stummes Video können Autoplay ermöglichen, ersetzen aber keinen Fehlerpfad. Siehe [MDN Autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
- **Transparenz:** WebM-Alpha nicht als universelles Format festlegen. Apples [HEVC Video with Alpha](https://developer.apple.com/videos/play/wwdc2019/506/) belegt historisch Safari-Unterstützung für diesen eigenen Formatpfad, keine aktuelle Geräteabnahme. Tatsächliche Assets auf iOS/Safari und Chromium/Firefox prüfen; normale Video-/Posterfassung vorhalten.
- **Zugänglichkeit:** Untertitel und Transkript, verständliche Play/Pause/Stopp-/Schließen-Tasten, Tastaturbedienung, sichtbarer Fokus und Rückgabe des Fokus. Nichts darf Navigation oder den bestehenden mobilen Dialog verdecken. [Reduced Motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) beachten; kein erzwungener Dauerschleifen-Avatar. Paket-ARIA oder Tastaturangaben sind keine WCAG-/DIN-Zertifizierung des Produkts.
- **Personenbezug:** Rechte für Gesicht, Stimme, Aufnahmen und kommerzielle Verbreitung an konkrete Versionen binden. KI-Kennzeichnung auf die tatsächliche Ausgabe abstimmen. Vor Live-Mikrofonstart Zweck erklären und Einwilligungs-/Berechtigungsablauf prüfen; Ablehnung erhält Textbedienung.
- **Datenfluss:** Tatsächliche Regionen, AVV/DPA, gegebenenfalls SCC nach bestehender R-06, Subprozessoren, Aufbewahrung und Löschung prüfen. EU-Zielmarkt oder MIT-Lizenz sind kein Nachweis einer EU-Verarbeitung. Keine personenbezogenen Medien, Gesprächsinhalte oder Secrets für eine bloße Bibliotheksbewertung hochladen.
- **Ausfall:** Fehlender Clip, verweigertes Mikrofon, Offlinezustand, abgelaufene Sitzung oder erschöpftes Budget führen zu Text, Poster und vorhandenen Seitenaktionen. Kein erfolgreicher Provideraufruf wird simuliert. Das statische Backup kann vorhandene Medien zeigen, bietet dadurch aber keine Live-Sitzung oder Backendverfügbarkeit.

## Prioritäten und noch benötigte Budgetgrundlagen

1. **P0 Bestand:** autorisiert vorhandene Clips/Audios lesen und Pascal/NeX/AIFly, Seite, Sprache, Rechte und Hash zuordnen. Nur tatsächlich fehlende Varianten in die Erzeugungsliste aufnehmen.
2. **P1 Wiedergabe:** ein nativer, schließbarer Presenter mit Poster, Untertiteln, Textalternative und optional gewöhnlichem Video statt Alpha. Bestehende Komponenten weiterverwenden. Erst nach Bedarf Media Chrome oder Video.js React auswählen.
3. **P2 Führung:** genau eine Tourbibliothek ausprobieren. Driver.js als kleiner frameworkunabhängiger Kandidat; Joyride als kontrollierte React-Alternative. Fokus, Seitenwechsel, reduzierte Bewegung und Mobilansicht praktisch prüfen.
4. **P3 Livepilot:** erst bei belegtem Nutzen **einen** Videoanbieter oder eine Sprachlösung auswählen. Echte Sessions mit Abbruch, Wiederverbindung und Kostenbegrenzung prüfen. Shepherd bleibt bis zur Lizenzentscheidung zurückgestellt.

Für die Entscheidung fehlen keine erfundenen Pauschalpreise, sondern konkrete Eingaben: vorhandene Providerlizenzen und Kontingente; Clipanzahl, Länge, Auflösung und Sprachen; erlaubtes einmaliges und laufendes Budget; parallele Livebesucher; maximale Sitzungsdauer, Idle-Abbruch und Verlängerung; tatsächliche Abrechnungseinheit und Planrechte; Speicher-/Auslieferungskosten; Aufwand für Schnitt, Untertitel, Rechte- und Sprachprüfung. Anbieterbeträge, Latenz-/Konversionswerte oder Einsparungen wurden hier nicht behauptet.

Diese Recherche enthält **keine REA-Messung**. Eine getrennte REA-Prüfung muss ihren tatsächlichen Zielcode und eigenen Evidenznachweis benennen. Paketlizenzprüfung ersetzt außerdem keine vollständige transitive Lizenz-/Supply-Chain-Prüfung vor Installation.
