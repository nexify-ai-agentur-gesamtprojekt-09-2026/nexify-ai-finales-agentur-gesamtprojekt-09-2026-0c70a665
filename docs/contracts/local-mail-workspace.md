# Lokaler Mail-Arbeitsplatz · MAIL-LOCAL-01

Scope: vorhandener geschützter `/intern/workspace`, gemeinsame Shell und Tokens,
Gmail und Hostinger als getrennte Provider. Ein bestehender Webwriter koordiniert
disjunkte lokale Kern-/UI-Arbeiten und unabhängige Gegenprüfung. Ausgangspunkt
`c58ad90cf841d10010ffc8e9fb7cca777fdbb61b`. Keine zweite App oder Maildatenbank.

## Tatsächlich ausführbarer lokaler Schnitt

`tools/mail_workspace.py` ergänzt explizit initialisierte `mail_*`-Tabellen in
derselben vorhandenen Remediation-SQLite-Datenbank. Jede Identität umfasst Tenant,
Projekt, Provider, Mailbox und opaque Provider-Nachrichtenreferenz. Gleicher Betreff
oder gleiche RFC-Message-ID führt nicht zur Zusammenlegung. Fehlende RFC-ID bleibt
null. Der spätere Hostingeradapter muss insbesondere Folder/UID-Kontext erhalten;
eine nackte Ordner-UID ist keine globale Nachrichten-ID.

Nur ein vertrauenswürdiger lokaler Import kann Konten deklarieren und begrenzte
Quellseiten liefern. Keine App-Provideranmeldung ist dadurch angeschlossen.
Quellrevision und lokale Revision bleiben getrennt; veraltete oder widersprüchliche
Quellupdates rollen die gesamte Seite zurück. Cursorfolge, wiederholte Cursor,
partielle Traversierung und Snapshotgrenzen werden geprüft. Unvollständige Seiten
löschen keinen Bestand und werden nicht als vollständiger Remote-Sync ausgegeben.
Die angezeigte Vollständigkeit betrifft nur den begrenzten lokalen Importvertrag,
nicht aktuelle Providerabdeckung, Zustellung oder Freshness.

Die gemeinsame Ansicht zeigt Absender, Empfänger, Provider, lokale Lesemarkierung,
Aufgabenstatus, Archivstatus und explizite Providerklassifikation. Gelesen bedeutet
nicht erledigt. Werbung/Sicherheit nur nach vorhandenen Quellmetadaten, keine
automatische Einstufung oder Abbestellung. Archiv/Undo betrifft ausschließlich den
lokalen Zustand, keine Providerarchivierung. Es gibt keine Löschfunktion.

Reply/Reply-all verwenden die Quell-Antwortadresse, sonst den Absender; die eigene
Adresse wird ausgeschlossen. Forward startet ohne Empfänger. To/Cc/Bcc/Reply-To
sind sichtbar. Das Empfangskonto ist als Absender fest gebunden; Reply-To ist in
diesem Schnitt leer oder die eigene Kontoadresse. Fremde Absender werden nicht
erlaubt. Text- und HTML-Signatur werden getrennt gespeichert. HTML bleibt inert,
auch in gespeicherten Entwürfen. Nachrichten werden ausschließlich als Text
dargestellt; Anhänge nur als begrenzte Metadaten, kein Abruf, Upload, Ausführen oder
Nachladen externer Bilder. Weiterleitung enthält nur den vorhandenen Text; kein
Versprechen einer vollständigen MIME-/Anhangweiterleitung.

Entwürfe persistieren atomar als `prepared`, Versandstatus `unavailable`, Connector
`not_connected`. Gleicher Schlüssel und identischer Inhalt lesen denselben Entwurf
zurück; veränderter Inhalt unter gleichem Schlüssel wird abgewiesen. Erwartete
Revision verhindert Vorbereiten auf einer zwischenzeitlich geänderten Nachricht.
Gespeicherte Entwürfe lassen sich nach Reload wieder lesend öffnen. Die UI hält
denselben Schlüssel für die Wiederholung eines unveränderten unklaren Requests
innerhalb der aktiven Sitzung; sie startet nach Reload keine automatische Mutation.
Lokale Statusmutationen verwenden optimistische Revision und werden bei unklarem
Ergebnis erst neu gelesen. Keine Mailwirkung wird wiederholt.

Es gibt bewusst keinen Dispatcher: `sending`, `sent`, `failed` und `unknown` sind
noch keine implementierten Versandzustände. Ein unbekannter gespeicherter Zustand
sperrt die Ausgabe statt ihn zu `prepared` oder Erfolg zu normalisieren. Bevor ein
echter Versandadapter hinzukommt, sind dauerhafte Claims, begrenzte Versuche,
Provider-Reconciliation bei Timeout/Crash und diese Zustandsübergänge separat zu
implementieren und abzunehmen. Keine SMTP-Brücke und kein Import von
`tools/mail.mjs`; dessen historischer CLI-Pfad wird nicht ausgeführt.

## Bestehende Authgrenze und HTTP-Vertrag

`MailAppBackend` verwendet unverändert `LocalAppBackend._authorize`: vorhandene
`status`-Berechtigung für Reads, `submit` für lokale Entwurfs-/Statusänderungen.
Session kommt nur vom vertrauenswürdigen serverseitigen Resolver. Browserfelder
Tenant/Rolle/Absender sind keine Autorität. Abgelaufene/widerrufene Session401,
falsche Rolle403, fremder Scope404, falsche Felder400, Revisions-/Keykonflikte409,
fehlender/defekter Datenspeicher503. Antworten private,no-store.

GET `/api/internal/workspace/mail`: `{schema_version:'local-mail-1',
binding:'local_only',mailboxes:[...],outbox:[...]}`. POST `action:prepare` nimmt
Provider, Mailbox, Nachrichtenreferenz, erwartete Revision, Modus, Empfängergruppen,
Text, getrennte Signaturen und Idempotenzschlüssel. POST `action:local_state`
nimmt dieselbe Identität/Revision und explizite Read-/Task-/Archivfelder.
Keine Provisionierung, Quellimporte oder Send/Delete-Operation über diesen Adapter.

Die tatsächliche Next-Route bleibt **503**, innerhalb der unveränderten
`/api/internal/workspace`-Proxygrenze. Identitäts-/Membershipauflösung und Transport
in die bestehende persistente Runtime sind nicht gebunden. Keine Fixturecookies
oder Clientclaims im Produktionspfad. Die öffentliche Besucher-CSRF-Session wird
für Mail ausdrücklich nicht wiederverwendet. Vor einer realen Bindung muss der
verifizierte private Transport eigene Origin-/CSRF-Prüfung, Rechte je Mailbox,
Rate-Limits und begrenzte Provider-Retries nachweisen. Bestehendes MCP ist keine
App-Credentialbindung. Leere/unverbundene Zustände sind kein bestätigtes leeres
Livepostfach.

## Hostinger-Primärquellen und konkrete Eingangsgrenze

Am 28.10.2026 gelesen: [Mail API](https://docs.hostinger.com/emails/mail-api) und
offizielle Quelltexte [SDK package.json](https://github.com/hostinger/mail-api-typescript-sdk/blob/main/package.json)
und [api.ts](https://github.com/hostinger/mail-api-typescript-sdk/blob/main/api.ts).
Die Paketquelle nennt **@hostinger/mail-sdk 1.19.6**, nicht den nur vermuteten Namen
`hostinger-mail-api-sdk`. Keine Installation. Gelesene Bytes SHA256:
package.json `6f840b5ca951e6ec1b3b66f26573db57e5da4fa3359a4eefdd9f7947b35d3b99`,
api.ts `79d56e1edd181c22ffd38e9430558aec02996614fa91edf207676f0d091ff80e`.
Das sind zeitgebundene gelesene Quellen, keine gepinnte installierte Abhängigkeit.

Die API bietet Account/Ordner/Nachrichten/Suche/Send/Webhooks. Listen unterstützen
page/perPage bis100. 429 verlangt Wartezeit, aber kein pauschales numerisches
Providerbudget wurde abgeleitet. Hostinger-Account-API und Mail-API akzeptieren
nicht gegenseitig ihre Tokens. Kein Token wurde gelesen oder übertragen.

Das SDK dokumentiert Webhookauthentifizierung als `Authorization: Bearer <secret>`.
Aus dieser Quelle ist keine HMAC-Signatur, Zeitstempel-/Replayfenster- oder
providerseitige Send-Idempotenzgarantie belegt. Der OpenAPI-/Detailseitenabruf war
auf diesem Lesepfad nicht erfolgreich; kein vollständiges Endpointaudit behauptet.
Die spätere Empfangsbindung benötigt den tatsächlich geltenden Payloadvertrag,
Authprüfung, dauerhaft begrenzte Deduplizierung und bestätigte Persistenz vor ACK.

Im Checkout kein Handler für `/api/email/hostinger-inbound`; Root-vercel.json nimmt
`/api/*` von der SPA-Umschreibung aus. Kein GET-/SPA200 als POST-Nachweis.
Parent meldet separat am28.10.16:49UTC den vorhandenen Webhook **disabled** und
www.cloud-DNS zu ChatGPT Sites. Das wurde hier nicht verändert und ist kein
vollständig reproduzierter aktueller Zustellbefund. Historische Fehlversuche vom
September sind keine heutige Ursachen-/Zustellabnahme. Kleinster nächster Schritt:
System-/Domainowner ordnet tatsächliche Handler-Runtime und aktuellen Payload-/
Authvertrag zu; Mailowner bestätigt bestehende zulässige Konto-/Mailboxbindung.
Erst danach isoliert Endpunkt/Persistenz prüfen, keine automatische Reaktivierung.

## Lokale Reproduktion und Rückweg

`python3 -m unittest discover -s tests -p 'test_mail*.py' -v`
und mit den bereits vorhandenen Browserwerkzeugen
`node apps/site/tests/browser-mail-workspace.mjs`. Letzteres bindet nur einen
Loopback-Testserver mit synthetischen Nachrichten und festen Test-Sessions an
die gemeinsame Komponente; echte Provider und alle externen Requests bleiben aus.
Es ist keine Browser→Clerk→Provider-Abnahme. Beleg und Quellhashes unter
`.local/mail-workspace/browser/report.json`; Screenshots bleiben lokal.

Rückweg: erhaltenen Basiscommit c58ad90 auschecken bzw. den einzelnen lokalen
Mailcommit reversieren. Keine bestehende Mail-/Produktionsdatenbank wurde migriert.
Bei späterer Übernahme würden zusätzliche `mail_*`-Tabellen bestehen bleiben;
kein Rollback löscht Benutzerbestand. Live-Mailversand, Syncscheduler, OAuth/Token-
Scopes, Webhookbetrieb, Providerarchivierung und qualifizierte Runtimeabnahme sind
getrennte offene Aufgaben, Owner Mail-/Identity-/Runtimebereich.

## Bestandsabgleich vor dem nächsten Ausbau

Die nachgereichte Paperclip-/mypad-Basis wird separat durch den Parent lesend
geprüft. Im hier verifizierten Checkout nennt `config/automation.json` Paperclip
nur `user_selected_not_verified`/`tool_exposed:false`; kein Mailadapter oder
mypad-Routenvertrag wurde im vorhandenen App-/Tool-/Vertragscode gefunden. Das ist
keine Aussage über den Funktionsumfang der externen Installation. Vor weiterem
Workplaceausbau müssen tatsächlicher Bestand, Identity-/Tenantvertrag und
gemeinsame Navigation abgeglichen werden. Dieser Schnitt fügt keine konkurrierende
Portalplattform, Google Workspace, Weiterleitung oder neue SMTP-Anmeldung hinzu.

Projekt-Skills und die eigenen Integrations-/Deliveryverträge wurden gelesen;
`project_skills.py verify` bestätigt fünf versionierte Projekt-Skillquellen.
Der geforderte Small-Business-Routerladepfad meldete `Source unavailable: LICENSE`.
Deshalb keine behauptete vollständige Nutzung oder Installation von44Skills und
kein Download/Setup aus dieser Lücke. CLI-/Serveragenten bleiben separate
Runtimezuständigkeiten; diese lokalen Teilaufgaben aktivieren keine davon.
