# 0021 — brain als der eine MCP-Server mit Browser-Anmeldung (OAuth 2.1)

Status: **Entwurf (Stufe 1), nicht freigegeben, nicht gebaut.** Stand 16.11.2026.
Auftrag: Inhaber Pascal Courbois, 16.11.2026 06:30 UTC; Architekturvorgaben 1–8 und Stufenplan der koordinierenden Sitzung.
Grundlage: `docs/04-betrieb/brain-befund-2026-11-16.md` (Stufe 0), `docs/04-betrieb/aufraeumplan-2026-11-14.md`,
`docs/architecture/0017-brain-ingestion.md`, `docs/adr/0008-mandantentrennung-gemeinsames-schema.md`,
`config/mcp-server.json`, `config/brain/tools.json`, `config/brain/agents.json`, `docs/deployment/clerk-mcp.md`,
D-013, D-016, D-017, D-019.

Kennzeichnung: **IST** gemessen, **SOLL** dieser Entwurf, **ANNAHME** unbestätigt, **OFFEN** fehlt oder widerspricht.

## 1. Ziel und Abgrenzung

SOLL: Jeder MCP-Client (Claude Desktop, Claude Code, claude.ai, ChatGPT, Cursor, VS Code) verbindet sich mit
brain, indem der Mensch sich einmal im Browser anmeldet und zustimmt. Kein Schlüssel wird vorher irgendwo eingetragen.

IST (16.11.2026 06:28 UTC): `/mcp` antwortet 401 mit `Basic realm="traefik"`, alle OAuth-Metadaten 404. Dahinter
läuft `cognee-mcp`, dessen Backend `cognee` keinen Container hat. `cognee-mcp` nutzt ein einziges Dienst-Token,
es gibt also heute keine Trennung nach Mensch oder Mandant.

Nicht Ziel dieser ADR: Cognee wiederherstellen (Aufräumplan, Entscheidung 1), Daten migrieren, DNS ändern,
die übrigen Dienste zusammenführen (Stufe 6, eigene ADR je Dienst).

## 2. Bausteine

```
MCP-Client ──HTTPS──► Cloudflare ──► Traefik ──┬─ /mcp ……… brain-auth (Basic) ─► cognee-mcp   (ALT, unverändert, Rückweg)
                                               └─ /.well-known/oauth-*, /oauth/*, /v2/mcp
                                                       ─► brain-gate  (NEU)
                                                            ├─ Autorisierungsserver (AS): Metadaten, Registrierung, Anmeldung, Zustimmung, Token, Widerruf
                                                            ├─ Ressourcenserver (RS): prüft Token, Scope, Mandant; MCP Streamable HTTP
                                                            ├─ Werkzeug-Adapter je Backend (zuerst: Cognee-REST mit Mandanten-Identität)
                                                            └─ brain-gate-db (PostgreSQL 17, RLS erzwungen): Konten, Zulassung, Clients, Grants, Token-Hashes, Audit
```

- **Ein Dienst `brain-gate`** übernimmt AS und RS. Getrennte Dienste wären sauberer, verdoppeln aber Betrieb und
  Platte auf einem Server mit 97 % Belegung (Befund 14.11.). Die Trennung bleibt im Code (eigene Module, eigener
  Signatur-/Hash-Schlüssel je Zweck), damit ein späterer Wechsel des AS (zum Beispiel auf die Supabase-Instanz aus
  D-013) nur den AS-Teil betrifft.
- **Vorhandene Lösung vor Eigenbau:** Grundlage ist das offizielle MCP-SDK (Python), das Metadaten-, Registrierungs-,
  Autorisierungs-, Token- und Widerrufsrouten samt PKCE-Prüfung mitbringt; brain-gate liefert die Speicher- und
  Zulassungslogik dazu. ANNAHME: Umfang und Verhalten der SDK-Routen entsprechen dem; vor dem Bau gegen die
  installierte Version und den aktuellen Spezifikationstext prüfen (siehe Abschnitt 13). Passt das SDK nicht,
  wird eine gepflegte OAuth-Bibliothek (Authlib) verwendet, kein selbst geschriebenes Krypto.
- **Kein Durchreichen an `cognee-mcp`.** Ein Tor, das nur das bisherige Dienst-Token weiterreicht, übernähme die
  fehlende Mandantentrennung. brain-gate bietet eigene Werkzeuge an und ruft das Backend mit einer Identität je
  Mandant auf (Abschnitt 6).

## 3. Adressen und Parallelbetrieb (Stufe 3)

Kein neuer DNS-Name nötig. Alles bleibt auf `brain.nexifyai.cloud`; der alte Router `brain-mcp` (`/mcp`) und die
Middleware `brain-auth` bleiben unberührt.

| Zweck | Adresse |
|---|---|
| Ressource (Audience) | `https://brain.nexifyai.cloud/v2/mcp` |
| Ressourcen-Metadaten, RFC 9728 | `/.well-known/oauth-protected-resource/v2/mcp` und zusätzlich `/.well-known/oauth-protected-resource` |
| Issuer | `https://brain.nexifyai.cloud` (ohne Pfad, damit auch ältere Clients die Metadaten an der Wurzel finden) |
| AS-Metadaten, RFC 8414 | `/.well-known/oauth-authorization-server`; zusätzlich `/.well-known/openid-configuration` mit demselben Inhalt (MCP-Clients probieren beide) |
| Endpunkte | `/oauth/register`, `/oauth/authorize`, `/oauth/token`, `/oauth/revoke`, `/oauth/login`, `/oauth/consent`, `/konto` (Sitzungen, „überall abmelden“) |

Traefik: neuer Router nur über Labels des neuen Containers, Regel
`Host(brain.nexifyai.cloud) && (PathPrefix(/v2) || PathPrefix(/oauth) || PathPrefix(/konto) || PathPrefix(/.well-known/oauth-) || Path(/.well-known/openid-configuration))`.
Er ist länger als der Host-Router `cognee-x532` und gewinnt deshalb nach Traefiks Prioritätsregel; `/mcp` trifft er nicht.
Die Pfade antworten heute 404 (Befund) – es wird also nichts Bestehendes überdeckt.

Rückweg Stufe 3: Container `brain-gate` stoppen → Router verschwindet, die Pfade antworten wieder 404, `/mcp` war nie betroffen.

Umschaltung (Stufe 5, nur nach Freigabe): `/mcp` bekommt einen zweiten Router auf brain-gate mit höherer Priorität;
`brain-auth` und der alte Router bleiben in der Konfiguration, werden nur deaktiviert (Priorität), nicht entfernt.
Rückweg: Priorität zurück. `/v2/mcp` bleibt als zweite Ressource gültig, damit verbundene Clients nicht neu anmelden müssen.

## 4. Anmeldefluss

1. Client ruft `/v2/mcp` ohne Token → **401** mit
   `WWW-Authenticate: Bearer realm="brain", resource_metadata="https://brain.nexifyai.cloud/.well-known/oauth-protected-resource/v2/mcp", scope="brain:read"`.
   Jede 401 trägt diesen Kopf, bei ungültigem Token zusätzlich `error="invalid_token"`; fehlender Scope → **403**
   mit `error="insufficient_scope"` und dem nötigen Scope.
2. Client liest Ressourcen- und AS-Metadaten.
3. Client registriert sich selbst (Abschnitt 5) oder nutzt eine Client-ID-Metadaten-URL.
4. Browser: `/oauth/authorize` mit `response_type=code`, `code_challenge` (nur `S256`), `state`, `resource`
   (RFC 8707, muss exakt eine bekannte Ressource sein), `scope`, exakt registrierter `redirect_uri`.
5. Anmeldung des Menschen (Verfahren: Inhaberentscheidung E1), danach Zustimmungsseite: Client-Name **und**
   Ziel-Host der Weiterleitung, gewählter Mandant/Projekt, Scopes einzeln abwählbar, Hinweis „nicht verifiziert“
   bei unbekannten Hosts.
6. Code (einmalig, 60 s) an `redirect_uri`; Client tauscht ihn mit `code_verifier` gegen Zugriffs- und Refresh-Token.

Verboten und technisch abgewiesen: Implicit, Resource-Owner-Password, Client-Credentials für Menschen, `plain`-PKCE,
Code ohne PKCE, Token in der Adresse (`bearer_methods_supported: ["header"]`), Refresh ohne Rotation.

## 5. Selbstregistrierung (Vorgabe 2)

- **RFC 7591** unter `/oauth/register`, offen für jeden Client – die Registrierung erteilt **keine** Rechte.
  Rechte entstehen ausschließlich aus der Rolle des angemeldeten Menschen und seiner Zustimmung.
- Angenommen nur: `grant_types ⊆ {authorization_code, refresh_token}`, `response_types = [code]`,
  `token_endpoint_auth_method ∈ {none, client_secret_basic, client_secret_post}` (PKCE bleibt auch für vertrauliche Clients Pflicht).
  Ein im Antrag genannter `scope` wird gespeichert, aber nie über das Rollenrecht hinaus gewährt.
- `redirect_uris`: exakter Vergleich, keine Platzhalter. Zulässig sind `http://127.0.0.1`/`http://[::1]`/`http://localhost`
  mit beliebigem Port (RFC 8252, Port beim Vergleich ignoriert), private Schemata (`cursor://`, `vscode://` …) und
  `https`. Für `https`-Hosts ohne Eintrag in der Liste bekannter Client-Hosts (Inhaberentscheidung E3) zeigt die
  Zustimmungsseite eine deutliche Warnung; Vorschlag: zunächst nur bekannte Hosts zulassen, andere nach Freigabe.
- Rate-Limit: 10 Registrierungen je IP und Stunde, 200 je Tag gesamt; Antwort 429 mit `Retry-After`.
  Nie genutzte Registrierungen werden nach 30 Tagen **archiviert** (nicht gelöscht).
- Client-ID-Metadaten-Dokument (Client-ID ist eine `https`-Adresse): in `config/mcp-server.json` geplant und in
  neueren MCP-Fassungen bevorzugt. SOLL als zweiter Weg in Stufe 2b, mit Abruf nur über `https`, nur öffentliche
  Adressen (kein SSRF auf interne Netze), Größen- und Zeitgrenze, Zwischenspeicher. OFFEN: Widerspruch zwischen
  `config/mcp-server.json` (nur Metadaten-Dokument) und Vorgabe 2 (DCR) – dieser Entwurf löst ihn mit „beides, DCR zuerst“.

## 6. Scopes, Rollen, Mandanten (Vorgaben 5 und 6)

### 6.1 Scopes nach Fähigkeitsklassen (`config/brain/tools.json`)

| Scope | Klasse | Beispiele (erste Werkzeuge) |
|---|---|---|
| `brain:read` | A lesend | `brain.wer_bin_ich`, `brain.status`, `brain.suchen` |
| `brain:write` | B schreibend intern, nur Entwürfe/Signale | `brain.merken`, `brain.entwurf_anlegen` |
| `brain:execute` | B mit Ausführung (interne Abläufe starten, z. B. `cognify`) | `brain.verarbeiten` |
| – | C extern/Geld/Löschen/Nachricht an Dritte | **über MCP-Token nie erreichbar.** Hartsperren aus `config/brain/agents.json` gelten unabhängig vom Scope. |

`brain:admin` (Zulassungsliste, Clients, Audit lesen) ist kein OAuth-Scope, sondern nur in `/konto` mit frischer
Anmeldung der Rolle `inhaber` erreichbar.

### 6.2 Rollen

| Rolle | höchstens | Erster Bestand (Vorschlag, E2) |
|---|---|---|
| `inhaber` | read, write, execute | Pascal Courbois |
| `team` | read, write | – |
| `kunde` | read, nur eigener Mandant | – |
| `agent` | wie vom Inhaber je Agent zugeteilt; Agenten melden sich als eigener Eintrag an, nie mit dem Konto eines Menschen | – |

Gewährt wird: `angefragt ∩ Rollenrecht(Mensch, Mandant) ∩ Zustimmung`. Ändert sich die Rolle, gilt bei jeder
Token-Prüfung das neue Recht (Rolle wird je Anfrage aus der Datenbank gelesen, nicht aus dem Token geglaubt); eine
Herabstufung wirkt also sofort, eine Hochstufung erst nach neuer Zustimmung.

### 6.3 Mandantentrennung in der Datenbank

- Muster wie ADR-0008: Wurzeltabelle `mandant`, jede mandantenbezogene Tabelle mit `mandant_id NOT NULL`,
  `ENABLE` **und** `FORCE ROW LEVEL SECURITY`, Richtlinien mit `USING` **und** `WITH CHECK`.
- brain-gate verbindet sich als Rolle `brain_gate_app` **ohne** `BYPASSRLS`, nicht Tabelleneigentümer. Je Anfrage
  eine Transaktion mit `SET LOCAL app.mandant_id`, `app.projekt_id`, `app.subjekt_id` aus dem **in der Datenbank
  nachgeschlagenen** Token-Datensatz, nie aus Kopfzeilen oder Werkzeugargumenten. Fehlt der Wert, sieht die Rolle
  keine Zeile.
- Ein Token ist an genau **einen** Mandanten und **ein** Projekt gebunden (bei der Zustimmung gewählt). Wechsel = neue Zustimmung.
- Backend Cognee: je Mandant ein eigener Cognee-Benutzer bzw. -Mandant mit eigenen Datensätzen
  (`ENABLE_BACKEND_ACCESS_CONTROL=True` ist gesetzt). brain-gate wählt die Backend-Identität aus dem Mandanten des
  Tokens. Die Backend-Zugänge liegen in OpenBao, nicht in brain-gate-db und nie im Token.
- Grenze, ehrlich: Cognees eigene Daten liegen in LanceDB/Kuzu je Datensatz, **nicht** unter PostgreSQL-RLS.
  Dort trennt Cognees Rechtemodell plus getrennte Backend-Identität, nicht RLS (siehe Abschnitt 11).
- ADR-0017 bleibt bindend: ein Mandantenfilter ist keine Rollenprüfung. Rollen- und Scope-Prüfung geschehen
  vor jedem Werkzeugaufruf zusätzlich zur RLS.

## 7. Token und Laufzeiten (Vorgabe 4)

| Artefakt | Form | Laufzeit | Speicherung |
|---|---|---|---|
| Autorisierungscode | zufällig, 256 bit | 60 s, einmalig; Zweitnutzung widerruft den daraus entstandenen Grant | Hash |
| Zugriffstoken | **opak**, 256 bit | 10 min | nur HMAC-SHA-256 mit Server-Pfeffer |
| Refresh-Token | opak, 256 bit | 14 Tage ohne Nutzung, höchstens 30 Tage ab Zustimmung; danach neu anmelden | HMAC, mit Familien-ID |
| Anmeldesitzung im Browser | Cookie `__Host-brain_sid`, `Secure`, `HttpOnly`, `SameSite=Lax` | 12 h | Hash |

- **Opak statt JWT**, damit Widerruf sofort wirkt: jede Anfrage schlägt das Token in der Datenbank nach (ein
  indizierter Lesezugriff). Kein Token wird nur dekodiert und geglaubt.
- **Rotation:** jeder Refresh liefert ein neues Paar; das alte Refresh-Token ist sofort ungültig. Wird ein bereits
  rotiertes Refresh-Token erneut vorgelegt, wird die ganze Familie widerrufen und ein Audit-Ereignis „Wiederverwendung“
  mit Alarm geschrieben.
- **Widerruf:** `/oauth/revoke` nach RFC 7009 (Zugriffs- und Refresh-Token). **Überall abmelden** in `/konto`:
  widerruft alle Sitzungen, Grants, Refresh-Familien und Zugriffstoken des Menschen in einer Transaktion.
  Zulassung entziehen (Inhaber) wirkt genauso.
- Ressourcenbindung: ein Token gilt nur für die Ressource aus `resource`; `/v2/mcp`-Token werden an jeder anderen
  Ressource abgewiesen.

## 8. Wer sich anmelden darf (Vorgabe 8) – Entscheidung des Inhabers

Grundsatz SOLL: **ausdrückliche Zulassung**, keine offene Registrierung von Menschen. Eine Tabelle
`zulassung(subjekt, mandant, projekt, rolle, erteilt_von, erteilt_am, gueltig_bis, entzogen_am)`; Anmeldung ohne
gültigen Eintrag endet mit „nicht zugelassen“ und Audit-Eintrag, ohne Hinweis, ob das Konto existiert.

| Option | Wie | Für | Gegen | Kosten |
|---|---|---|---|---|
| **A · Passkey (WebAuthn) mit Einladung** – Empfehlung | Inhaber erzeugt in `/konto` eine Einladung (einmalig, 24 h); der Eingeladene legt einen Passkey an | phishing-resistent, kein Passwort gespeichert, kein Fremddienst | etwas mehr Bauaufwand (Bibliothek `py_webauthn`); Verlust aller Passkeys braucht einen Wiederherstellungsweg (zweiter Passkey Pflicht) | 0 € |
| B · Anmeldung über GitHub, Zulassung nach GitHub-Nutzer-ID | brain-gate ist OAuth-Client bei GitHub | schnellster Weg zum Nachweis in Stufe 4 | Sicherheit hängt am GitHub-Konto; braucht ein GitHub-OAuth-App-Geheimnis, das der Inhaber anlegt und über das sichere Formular einträgt | 0 € |
| C · Clerk als Identitätsanbieter | brain-gate vertraut `clerk.nexifyai.de` | vorhandene Konto-Oberfläche | `clerk.nexifyai.de` hat laut `docs/deployment/clerk-mcp.md` kein DNS → DNS-Änderung (Hartsperre, Inhaber); zusätzliche Abhängigkeit | Tarif prüfen |

Empfehlung: **A** als Ziel. Wenn der Nachweis schnell gebraucht wird: B zusätzlich, nur für Rolle `inhaber`, später abschaltbar.

## 9. Audit (Vorgabe 7)

- Tabelle `audit_ereignis` (append-only): Zeit (UTC, Server), Ereignisart, Subjekt, Client-ID, Mandant, Projekt,
  Scope, Werkzeug, Argument-Hash (keine Klartext-Argumente, keine Token), Ergebnis (`erlaubt`/`abgewiesen` + Grund,
  `fehler`), Dauer, IP-Präfix (/24 bzw. /48), Anfrage-ID, `vorheriger_hash`, `hash`.
- Unveränderlich: `brain_gate_app` hat nur `INSERT`; ein Trigger verweigert `UPDATE`/`DELETE` auch dem Eigentümer;
  Hash-Kette über alle Zeilen; täglicher Kettenkopf nach R2 (`nexify-agentur-pucket`, Schreibrecht OFFEN) in Stufe 6.
- Ereignisse mindestens: Registrierung, Anmeldung ok/abgewiesen, Zustimmung, Token ausgestellt/erneuert/widerrufen,
  Refresh-Wiederverwendung, jeder Werkzeugaufruf, jede 401/403, Zulassung erteilt/entzogen, „überall abmelden“.
- Lesbar nur für `inhaber` in `/konto`; Export als JSONL.

## 10. Sicherheitsgrenzen, die Stufe 2 zuerst als Test schreibt

Jeder Test muss gegen den heutigen Stand (kein brain-gate) scheitern und gegen den Bau bestehen:

1. fremder Mandant: Token für Mandant A liest/schreibt keine Zeile von B (echte PostgreSQL, RLS aktiv, als `brain_gate_app`).
2. abgelaufenes Zugriffstoken → 401 `invalid_token` mit `resource_metadata`.
3. widerrufenes Token (einzeln, über Familie, über „überall abmelden“) → 401 sofort.
4. fehlender Scope → 403 `insufficient_scope`; Klasse-C-Werkzeug ist mit keinem Scope erreichbar.
5. PKCE: fehlende Challenge, `plain`, falscher Verifier, wiederverwendeter Code → abgewiesen.
6. Redirect-Manipulation: abweichender Pfad, Port bei Nicht-Loopback, Zusatzparameter, offene Weiterleitung, fremder Host → abgewiesen, **ohne** Weiterleitung (Fehler im Browser anzeigen).
7. falsche Ressource (`resource` fehlt oder fremd) und Token einer anderen Ressource → abgewiesen.
8. Refresh-Wiederverwendung → Familie widerrufen, Audit-Ereignis vorhanden.
9. nicht zugelassener Mensch → keine Zustimmungsseite, kein Code.
10. Registrierung mit `implicit`/`password`/`client_credentials` oder Platzhalter-Redirect → 400; Rate-Limit → 429.
11. Audit: jede der obigen Abweisungen erzeugt genau ein Ereignis; `UPDATE`/`DELETE` auf `audit_ereignis` scheitert.

## 11. Was dieser Entwurf NICHT leistet

- Er repariert **Cognee nicht**. Ohne laufenden Cognee-Dienst liefern Brain-Werkzeuge über den neuen Weg nur
  `brain.wer_bin_ich` und `brain.status` (der Anmeldeweg ist trotzdem beweisbar).
- Cognees eigene Speicher (LanceDB, Kuzu) stehen **nicht** unter PostgreSQL-RLS; dort trennt Cognees Rechtemodell
  plus eigene Backend-Identität je Mandant. Ein Fehler in Cognees Rechteprüfung wäre durch RLS nicht abgefangen.
- Er schützt nicht vor einem kompromittierten Gerät des angemeldeten Menschen: ein gestohlenes Refresh-Token gilt
  bis zu 30 Tage, es sei denn, es wird widerrufen oder die Wiederverwendung erkannt. Keine Gerätebindung (DPoP) in Stufe 2.
- Er verhindert nicht, dass ein zugelassener Mensch einem bösartigen Client zustimmt; dagegen helfen nur die
  Zustimmungsseite mit Ziel-Host und die Liste bekannter Hosts (E3).
- Kein Single-Sign-on mit `nexifyai.de`, keine Kunden-Selbstregistrierung, keine Abrechnung je Aufruf.
- Kein Hochverfügbarkeitsbetrieb: ein Container, ein Server; fällt srv1941843, fällt brain (wie heute).
- Er ersetzt `brain-auth` und den LibreChat-Zugang über `librechat_default` nicht in Stufe 3; LibreChat erreicht
  `cognee-mcp` intern weiterhin ohne Wand. Das bleibt bis zur Umschaltung ein offener Punkt.
- Er führt keine Modellaufrufe ein. Falls Werkzeuge später Cognee-`cognify` auslösen, gilt
  `deepseek/deepseek-v4.1-flash-1017`, Reasoning `high`; IST in der Compose-Datei ist der Vorgabewert ohne 1017 (Befund).

## 12. Rückweg je Stufe

| Stufe | Änderung | Rückweg |
|---|---|---|
| 2 | nur Code und Tests im Repo | Zweig verwerfen |
| 3 | neuer Container `brain-gate` + `brain-gate-db` (eigenes Compose-Projekt, Images auf Digest), eigene Volumes | Projekt stoppen; Volumes bleiben (nichts löschen); `/mcp` unberührt |
| 4 | echter Client verbindet sich | Grant widerrufen |
| 5 | zweiter Router auf `/mcp` mit höherer Priorität | Priorität zurück; alter Router und `brain-auth` sind nie entfernt |

## 13. Entscheidungen, die beim Inhaber liegen

| Nr | Frage | Vorschlag |
|---|---|---|
| E1 | Anmeldeverfahren | A Passkey mit Einladung (B GitHub nur als schneller Nachweis) |
| E2 | Erste Zulassung | nur Pascal Courbois, Rolle `inhaber`, Mandant `nexify`, Projekt `brain` |
| E3 | Bekannte Client-Hosts für `https`-Weiterleitungen | `claude.ai`, `chatgpt.com`; andere erst nach Freigabe |
| E4 | Stufe 3 aufstellen (neuer Container und Traefik-Labels auf srv1941843, Serveränderung nach D-016) | ja, nach grüner Stufe 2 und mit Platte < 95 % |
| E5 | Datenbank | eigener `postgres:17-alpine` im Projekt `brain-gate` jetzt; Umzug auf die Supabase-Instanz nach D-013, sobald deren Adresse belegt ist |
| E6 | Server-Geheimnisse (Token-Pfeffer, DB-Passwort) | auf dem Server in OpenBao erzeugen, nie im Repository oder Chat; Inhaber bestätigt das Verfahren |
| E7 | Lesender Mess-Container für `dynamic.yml` und Plattenstand | ja (einmalig, `restart: "no"`, nur `:ro`) |
| E8 | Cognee wiederherstellen (Aufräumplan, Entscheidung 1) | parallel als eigener Auftrag; ohne ihn bleibt brain inhaltlich leer |

## 14. Vor dem Bau zu prüfen (OFFEN)

- Aktueller Text der MCP-Autorisierungsspezifikation und die Fassung, die die genannten Clients sprechen
  (`config/mcp-server.json` nennt `2026-07-28`; in dieser Sitzung nicht gegen die Quelle geprüft).
- Ob claude.ai, ChatGPT, Cursor und VS Code heute DCR, Client-ID-Metadaten oder beides verwenden und welche
  `token_endpoint_auth_method` sie registrieren (ANNAHME: alle unterstützen DCR mit PKCE).
- Version und Auth-Bausteine des MCP-SDK für Python; `py_webauthn` (falls E1 = A).
- Cloudflare vor Traefik: dass `/.well-known/*` nicht zwischengespeichert und `Authorization` unverändert durchgereicht wird.
