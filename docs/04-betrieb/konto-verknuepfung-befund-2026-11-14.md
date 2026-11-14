# Konto-Verknüpfung über Google: Befund und Behebung · 14.11.2026

Zweig `claude/konto-verknuepfung-sicher`, Basis `main` `2396553`. Betrifft nur das Backend des Shop-Dienstes, `apps/shop-api/shop/accounts_api.py`. Keine Geheimniswerte, keine Kundendaten.

## 1. Befund

Nachgestellt am 14.11.2026 mit dem echten Router `accounts_api` und Attrappen statt MongoDB und Identitätsvermittler (kein Netz, keine Datenbank).

- `register` legt ein Konto mit beliebiger, unbestätigter Adresse an und startet sofort eine Sitzung.
- `google_session` suchte das Konto allein über die E-Mail-Adresse aus dem Profil des Vermittlers (`GOOGLE_SESSION_URL`), setzte bei einem Treffer nur `google_linked` und startete eine Sitzung. Passwort und vorhandene Sitzungen des Kontos blieben unberührt.

Folge (Pre-Account-Takeover):

1. Angreifer registriert die Adresse des Opfers mit eigenem Passwort (201, Sitzung).
2. Das Opfer meldet sich später mit Google an (200) und landet im Konto des Angreifers.
3. Die Sitzung des Angreifers gilt weiter (`/api/auth/me` 200), sein Passwort ebenfalls (`/api/auth/login` 200). Alles, was das Opfer im Konto hinterlegt, sieht der Angreifer.

Gegenprobe: Eine Google-Sitzung mit der Adresse eines Kontos mit Rolle `admin` erhielt eine Sitzung mit Rolle `admin`, ohne Passwort.

Erreichbarkeit: In Produktion antwortet der Shop-Dienst heute mit 503 (Laufzeit-Gate in `apps/shop-api/vercel_app.py`, `project_binding_unverified`). Mit gebundenem Dienst ist der Ablauf über denselben Einstieg sofort ausnutzbar; `accounts_api` steht in `MODULES` des Vercel-Einstiegs.

## 2. Behebung: verweigern statt zusammenführen

| Punkt | Stelle | Verhalten |
|---|---|---|
| Unbestätigtes Passwortkonto | `accounts_api.py`, `google_session`, Z. 213–214 | Trägt das Konto zur Adresse ein Passwortfeld (geprüft wird das Vorhandensein des Felds, auch leer oder `None` zählt) und ist `email_verified` nicht genau `True` (`"true"` oder `1` zählen nicht): 409 `account_exists_unverified` mit Hinweis auf Anmeldung mit Passwort oder „Passwort vergessen“. Keine Verknüpfung, keine Sitzung, nichts gelöscht, kein Passwort entfernt, keine Sitzung beendet. |
| Privilegierte Rollen | `google_session`, Z. 211–212 | Jede Rolle außer genau `customer` (im Code heute nur `admin`; auch `None`, leer, `Customer`, `ADMIN`; ein fehlendes Feld gilt als `customer`) wird über Google nicht angemeldet: 403 `google_login_not_allowed`. Gilt auch für bestätigte und schon verknüpfte Konten und für Rollen, die später hinzukommen. |
| Zurücksetzen bestätigt die Adresse | `reset_password`, Z. 191–192 | Setzt zusätzlich `email_verified = True`. Der Link kam im Postfach an, die Adresse ist damit belegt. Die vorhandenen Sitzungen werden wie bisher beendet. |
| Zurücksetzen widerruft API-Schlüssel | `reset_password`, Z. 194–195 | Alle noch aktiven API-Schlüssel des Kontos (`api_keys`, `tenant_id` = Konto) erhalten `revoked_at`. Schlüssel anderer Konten und schon widerrufene bleiben unverändert. Auch eigene Schlüssel des rechtmäßigen Inhabers werden widerrufen und müssen danach neu angelegt werden. |
| Neue Google-Konten | `google_session`, Z. 216 | Werden mit `email_verified = True` angelegt. |
| Verknüpfte, bestätigte Konten und Google-Konten ohne Passwort | unverändert | Anmeldung wie bisher (200). |

Wahl 403 statt 409 für privilegierte Rollen: 409 bedeutet hier „Konflikt, den der Inhaber der Adresse selbst lösen kann“ (Passwort zurücksetzen, danach Google). Für ein Admin-Konto führt dieser Weg nicht zum Ziel, die Anmeldung über Google bleibt gesperrt. Das ist eine Verweigerung aus Berechtigung, also 403; der Hinweis verweist auf die Anmeldung mit Passwort.

Ablauf für den rechtmäßigen Inhaber nach der Behebung: Google-Anmeldung → 409 → „Passwort vergessen“ → Link im eigenen Postfach → neues Passwort (Sitzungen, Passwort und API-Schlüssel des Angreifers sind damit ungültig, Adresse bestätigt; eingetragene Teammitglieder bleiben, siehe Abschnitt 3) → Google-Anmeldung 200 in dasselbe Konto.

Tests: `tests/test_shop_account_linking.py` (10 Tests, in `make test-py`). Die ersten fünf waren am Stand `main` 4 von 5 rot (Angriffsablauf 200 statt 409, fehlendes `email_verified` zweimal, Admin und künftige Rolle 200 statt 403); der Test zu verknüpften, bestätigten Konten sichert das unveränderte Verhalten und ist in beiden Ständen grün. Nach der unabhängigen Prüfung kamen fünf hinzu: schon verknüpftes unbestätigtes Passwortkonto (409, keine Schreiboperation, kein Cookie), `email_verified` als `"true"`/`1`/`"True"`/`None` (409), leeres oder `None`-Passwortfeld (409, am ersten Stand des Zweigs 200), Rollenwerte `None`/`""`/`Customer`/`ADMIN` (403 ohne Schreiboperation), Widerruf der API-Schlüssel beim Zurücksetzen (am ersten Stand des Zweigs rot).

## 3. Offen

- **Anzeige im Frontend.** `apps/web/components/shop/AuthForms.tsx` zeigt bei jedem Fehler der Google-Anmeldung „Die Anmeldung mit Google ist fehlgeschlagen.“ und wertet `detail.error` nicht aus. Die Datei liegt in einem gebundenen Verzeichnis (`config/text-resize-sources.json`, außerdem Shop-Belege); die Anzeige der Meldung zu 409 und 403 ist eine eigene Folgearbeit mit neuem Resize-Lauf. Bis dahin sieht der Nutzer nur den allgemeinen Text.
- **Bestandskonten in der Zieldatenbank.** Kein Konto aus der Zeit vor dieser Änderung trägt `email_verified`. Passwortkonten erhalten deshalb über Google 409, auch wenn sie schon verknüpft waren; das ist beabsichtigt, weil eine frühere Verknüpfung genau der hier beschriebene Angriff gewesen sein kann. Konten, die schon über Google mit einem fremden Passwortkonto zusammengeführt wurden, erkennt der Code nicht. Ob es solche Konten gibt, ist ungeprüft; der Dienst war nach heutigem Stand nie gebunden.
- **Mailversand ist Voraussetzung.** Für Passwortkonten führt der einzige Weg zu Google über „Passwort vergessen“. Ohne funktionierenden Versand der Mail zum Zurücksetzen (`mailer`, Resend; Zustand: `docs/04-betrieb/mailversand-zustand-2026-11-14.md`) bleibt der Inhaber bei 409 stehen. Kein Verlust von Daten, aber kein Weg zu Google.
- **Teammitglieder überleben das Zurücksetzen.** Einträge in `team_members` (Einladungen, `apps/shop-api/shop/nexify_api.py`), die ein Angreifer im Konto angelegt hat, bleiben nach dem Zurücksetzen bestehen. Heutige Wirkung gering: Es sind Einladungen ohne eigene Anmeldung, und `nexify_api` gehört nicht zur Vercel-Auslieferung (`MODULES` in `vercel_app.py`). Vor einer Inbetriebnahme des Portals zu klären.
- **API-Schlüssel und Vercel-Auslieferung.** Der Widerruf greift für `/api/v1/whoami`, den einzigen Endpunkt mit Kundenschlüssel; `nexify_api` ist heute nicht ausgeliefert.
- **Bekannte Grenzen, nicht behoben:**
  - Gleichzeitiges `register` während `google_session` für dieselbe Adresse ergibt 500 (`DuplicateKeyError` beim Anlegen des Google-Kontos, auf `main` schon so). Es entsteht kein zweites Konto und keine Verknüpfung.
  - Mehrere offene Links zum Zurücksetzen bleiben jeweils bis zu ihrem Ablauf (60 Minuten) gültig; ein eingelöster Link entwertet die übrigen nicht.
  - Die Meldungen zu 409 und 403 erscheinen im Frontend noch nicht (Folgearbeit `AuthForms.tsx`, oben).
- **`register` bleibt unverändert.** Registrierung mit fremder Adresse ist weiter möglich und startet eine Sitzung; das Konto ist nur nicht mehr über Google erreichbar. Eine Bestätigung der Adresse bei der Registrierung gehört zu G04 im Register (`config/acceptance-coverage.json`, „E-Mail-/Workspaceverifizierung“) und ist nicht Teil dieser Änderung.
- **Vermittler ohne Anwendungskennung.** `GOOGLE_SESSION_URL` liefert nur `email` und `name`, kein Merkmal, ob Google die Adresse bestätigt hat, und keine Bindung an eine eigene Anwendungskennung. Die Behebung vertraut dem Vermittler bei neuen Konten weiter.

## 4. Inhaberentscheidungen

1. **Eigene Google-Anbindung statt Vermittler.** Eigene OAuth-Anwendung mit Prüfung von `aud` und `email_verified` aus dem ID-Token, statt eines fremden Vermittlers ohne Anwendungskennung.
2. **Admin per Google ja oder nein.** Heute nein (403). Soll es möglich werden, dann nur mit eigener Anbindung (Punkt 1) und ausdrücklicher Zuordnung je Konto.
3. **Bestandskonten in der Zieldatenbank.** Vor dem Binden des Dienstes prüfen, ob Konten mit `google_linked` und Passwort bestehen, und über deren Behandlung entscheiden (Nutzer zum Zurücksetzen auffordern oder Sitzungen beenden).
4. **Mailversand zum Zurücksetzen.** Vor dem Binden des Dienstes belegen, dass die Mail zum Zurücksetzen tatsächlich zugestellt wird; sonst haben Passwortkonten keinen Weg zur Google-Anmeldung.
