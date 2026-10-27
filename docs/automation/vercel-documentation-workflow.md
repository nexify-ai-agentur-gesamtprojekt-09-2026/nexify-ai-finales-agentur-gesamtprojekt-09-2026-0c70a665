# Vercel-Lösungen dokumentationsgetreu wiederverwenden

Nutzerauftrag vom 26.10.2026: verfügbare Plattformlösungen eigenständig prüfen,
gezielt übernehmen und das Wissen für folgende Arbeiten erhalten. Dieser
Repositoryvertrag ist eine wiederverwendbare Erinnerung, keine behauptete
vollständige Langzeiterinnerung aller Dokumentation oder aller Chats.

1. Konkrete Funktion und Rechte-/Daten-/Kostenkontext festlegen. Die vorhandene
   Anwendung, Quellen und bereits verbundenen Dienste prüfen.
2. Den offiziellen Index nutzen und relevante Seiten mit ihren Voraussetzungen,
   verknüpften Seiten, aktuellen Referenzen und installierten Typen abgleichen.
   Lesestatus pro Quelle unterscheiden; ein Bulkdownload ersetzt keine Prüfung.
3. Bestehenden offiziellen Baustein bevorzugen. Installierte/publizierte Version,
   Engines, Peers, Lizenz und zugehörige Migrationshinweise verifizieren.
   Keine parallelen oder ungeprüften Installationshooks.
4. Methoden, Transport und Provider-Wire tatsächlich testen. SDK-Mocks und
   injizierter Fakefetch verifizieren SDK-Verhalten ohne kostenpflichtige Calls.
   Konfiguration oder Dokumentationsbeispiel nicht als Liveintegration melden.
5. Auth, Mandant, Idempotenz, Budget und dauerhaften Zustand getrennt durchsetzen.
   Kein Clientclaim oder Modelltext erteilt Rechte. Bei unklarem externem Ergebnis
   abgleichen; nicht blind wiederholen oder kostenlos abrechnen.
6. Eigene NeXify-Oberfläche, Accessibility und die realen Nutzerwege prüfen.
   Build, Typen, Negativtests, Browser und unabhängige Gegenprüfung nachweisen.
7. Geprüfte Version, Quellen, Integrationsentscheidung und Grenzen zusammen mit
   der Implementierung speichern. Bei Versions-/Policyänderung erneut prüfen.

Aktueller Katalog: `config/research/vercel-platform-options.json`. Die
Architektur-/Versionsprüfung steht unter
`config/integrations/vercel-agent-runtime.json`; tatsächliche Laufzeit-/SDK-
Prüfungen werden separat von den dort aufgelisteten Testplänen geführt.

Der erste öffentliche Functionpfad ist eine klar gekennzeichnete, deterministische
Orientierung über öffentliche Seitentexte. Er verwendet das echte AI-SDK-
Streamingprotokoll, aber kein Sprachmodell und keine Konten-, Termin-, Versand-
oder Geldaktion. Normale Vercel-Hostingkosten sind damit nicht als kostenlos
zugesagt. Die aktuelle Vorschau bleibt zugriffsgeschützt; Rate-/Budget-/Datenschutz-
und Betriebsprüfungen gehören vor einen allgemeinen Produktionsstart.

Der interne Agent benutzt das echte ToolLoopAgent-Protokoll mit ausschließlich
öffentlichem Lesewerkzeug. Sein OpenRouter-Adapter ist mit Dummykey/Fakefetch
geprüft, öffentlich nicht aufrufbar und liest keine Credentials aus der Umgebung.
Live-KI benötigt weiterhin verifizierten Zugang, sichere Schlüsselbindung und
finanzierte, dauerhafte Reservierung/Abrechnung. Diese Voraussetzungen werden
durch die SDK-Installation nicht erzeugt.
