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
| Unbestätigtes Passwortkonto | `accounts_api.py`, `google_session`, Z. 211–212 | Besteht zur Adresse ein Konto mit Passwort und `email_verified` ist nicht `True`: 409 `account_exists_unverified` mit Hinweis auf Anmeldung mit Passwort oder „Passwort vergessen“. Keine Verknüpfung, keine Sitzung, nichts gelöscht, kein Passwort entfernt, keine Sitzung beendet. |
| Privilegierte Rollen | `google_session`, Z. 209–210 | Jede Rolle außer `customer` (im Code heute nur `admin`) wird über Google nicht angemeldet: 403 `google_login_not_allowed`. Gilt auch für bestätigte und schon verknüpfte Konten und für Rollen, die später hinzukommen. |
| Zurücksetzen bestätigt die Adresse | `reset_password`, Z. 191–192 | Setzt zusätzlich `email_verified = True`. Der Link kam im Postfach an, die Adresse ist damit belegt. Die vorhandenen Sitzungen werden wie bisher beendet. |
| Neue Google-Konten | `google_session`, Z. 214 | Werden mit `email_verified = True` angelegt. |
| Verknüpfte, bestätigte Konten und Google-Konten ohne Passwort | unverändert | Anmeldung wie bisher (200). |

Wahl 403 statt 409 für privilegierte Rollen: 409 bedeutet hier „Konflikt, den der Inhaber der Adresse selbst lösen kann“ (Passwort zurücksetzen, danach Google). Für ein Admin-Konto führt dieser Weg nicht zum Ziel, die Anmeldung über Google bleibt gesperrt. Das ist eine Verweigerung aus Berechtigung, also 403; der Hinweis verweist auf die Anmeldung mit Passwort.

Ablauf für den rechtmäßigen Inhaber nach der Behebung: Google-Anmeldung → 409 → „Passwort vergessen“ → Link im eigenen Postfach → neues Passwort (Angreifersitzungen und -passwort sind damit ungültig, Adresse bestätigt) → Google-Anmeldung 200 in dasselbe Konto.

Tests: `tests/test_shop_account_linking.py` (5 Tests, in `make test-py`). Ohne die Änderung 4 von 5 rot (1 Fehlschlag Angriffsablauf 200 statt 409, 2 Fehler fehlendes `email_verified`, 1 Fehlschlag mit 4 Unterfällen Admin/künftige Rolle 200 statt 403); der fünfte Test sichert das unveränderte Verhalten verknüpfter Konten und ist in beiden Ständen grün.

## 3. Offen

- **Anzeige im Frontend.** `apps/web/components/shop/AuthForms.tsx` zeigt bei jedem Fehler der Google-Anmeldung „Die Anmeldung mit Google ist fehlgeschlagen.“ und wertet `detail.error` nicht aus. Die Datei liegt in einem gebundenen Verzeichnis (`config/text-resize-sources.json`, außerdem Shop-Belege); die Anzeige der Meldung zu 409 und 403 ist eine eigene Folgearbeit mit neuem Resize-Lauf. Bis dahin sieht der Nutzer nur den allgemeinen Text.
- **Bestandskonten in der Zieldatenbank.** Kein Konto aus der Zeit vor dieser Änderung trägt `email_verified`. Passwortkonten erhalten deshalb über Google 409, auch wenn sie schon verknüpft waren; das ist beabsichtigt, weil eine frühere Verknüpfung genau der hier beschriebene Angriff gewesen sein kann. Konten, die schon über Google mit einem fremden Passwortkonto zusammengeführt wurden, erkennt der Code nicht. Ob es solche Konten gibt, ist ungeprüft; der Dienst war nach heutigem Stand nie gebunden.
- **Mailversand ist Voraussetzung.** Für Passwortkonten führt der einzige Weg zu Google über „Passwort vergessen“. Ohne funktionierenden Versand der Mail zum Zurücksetzen (`mailer`, Resend; Zustand: `docs/04-betrieb/mailversand-zustand-2026-11-14.md`) bleibt der Inhaber bei 409 stehen. Kein Verlust von Daten, aber kein Weg zu Google.
- **`register` bleibt unverändert.** Registrierung mit fremder Adresse ist weiter möglich und startet eine Sitzung; das Konto ist nur nicht mehr über Google erreichbar. Eine Bestätigung der Adresse bei der Registrierung gehört zu G04 im Register (`config/acceptance-coverage.json`, „E-Mail-/Workspaceverifizierung“) und ist nicht Teil dieser Änderung.
- **Vermittler ohne Anwendungskennung.** `GOOGLE_SESSION_URL` liefert nur `email` und `name`, kein Merkmal, ob Google die Adresse bestätigt hat, und keine Bindung an eine eigene Anwendungskennung. Die Behebung vertraut dem Vermittler bei neuen Konten weiter.

## 4. Inhaberentscheidungen

1. **Eigene Google-Anbindung statt Vermittler.** Eigene OAuth-Anwendung mit Prüfung von `aud` und `email_verified` aus dem ID-Token, statt eines fremden Vermittlers ohne Anwendungskennung.
2. **Admin per Google ja oder nein.** Heute nein (403). Soll es möglich werden, dann nur mit eigener Anbindung (Punkt 1) und ausdrücklicher Zuordnung je Konto.
3. **Bestandskonten in der Zieldatenbank.** Vor dem Binden des Dienstes prüfen, ob Konten mit `google_linked` und Passwort bestehen, und über deren Behandlung entscheiden (Nutzer zum Zurücksetzen auffordern oder Sitzungen beenden).
4. **Mailversand zum Zurücksetzen.** Vor dem Binden des Dienstes belegen, dass die Mail zum Zurücksetzen tatsächlich zugestellt wird; sonst haben Passwortkonten keinen Weg zur Google-Anmeldung.
