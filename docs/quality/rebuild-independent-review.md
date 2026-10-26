# Unabhängige Gegenprüfung des UI-Rebuilds und der Domainkorrekturen

Stand: 26.10.2026. Prüfung durch eine von der Umsetzung getrennte Reviewerrolle.
Keine Produktivfreigabe, kein Liveadapter-, Browservollabnahme- oder WCAG-Nachweis.

## Ergebnis

Keine neuen materiellen Findings in den geprüften UI-Änderungen. Beide zuvor
reproduzierten Domainfehler sind im tatsächlichen Quellstand korrigiert.

- BYOK-Reservierungen speichern einen vollständigen Credential-Snapshot samt
  monotoner Bindingversion. SameRef-Änderungen und ein späteres Zurückwechseln
  dürfen alte Reservierungen nicht auf neue Credentials umhängen. Dispatch
  vergleicht den Snapshot; alte Reservierungen ohne Snapshot bleiben gesperrt.
- Konvertierungen persistieren Account, Tenant, Workspace, Plan, Terms und
  Billingbeleg einschließlich Bindinghash atomar mit dem Paidstatus. Exakte
  Replays sind idempotent; abweichende Terms/Billingbindungen werden abgewiesen.
  Ein alter Paidstatus ohne Receipt wird nicht nachträglich als belegt erklärt.
- Erneut ausgeführt: alle **13** isolierten Domainprüfungen, einschließlich
  echter Prozesswiederaufnahme und der neuen Binding-/Receiptgegenproben.

## UI-Prüfumfang

Gelesen und gegen den vorherigen Quellstand geprüft: `HomeContent`, `Workspace`,
`ExplainerSections`, `PresenterGuide`, ihre drei neuen Stylesheets, die
Importreihenfolge in React-Main/Next-Layout und der Standalonebuilder.

- Die Startseite rendert weiterhin sämtliche vorhandenen `home.sections` und
  alle gebundenen `home.actions`; Servicekarten und neue Texte kommen hinzu.
  Die bisherige Zusammenfassung bleibt im vorhandenen Überblickstext enthalten.
- Guidepräferenzen enthalten nur bekannte Journey-ID und Aktivierungszustand.
  Sie erzeugen keine Authentifizierung, Rolle, Mitgliedschaft oder Geschäftswirkung.
- Der Rebuild verändert weder Clerk-Aktivierung noch Private-Route-Projektion
  oder Tenant-/Visitor-Cookie-Verträge. Die Visitorverbindung ist keine SSO-Brücke.
- Offline bleiben Intentauswahl und Aufgabenansichten bedienbar. Mutierende
  Submitaktionen bleiben durch deaktivierte Buttons und zusätzlich `act()` mit
  `!ready` gesperrt; kein künstlicher Erfolgszustand wird dafür erzeugt.
- Pending-Videos erzeugen weiterhin keinen Player. Veröffentlichte Medien
  brauchen eigene lokale Video-/Captionpfade; kein Autoplay wurde ergänzt.
- Der Standalonebuilder bindet das neue Trio-Bild wie die bestehenden Assets
  ein, setzt den Offline-Schalter vor dem Entry und bewahrt die restriktive CSP.
  Der vorhandene Auth-Guard verhindert SDK-Aktivierung im Standalone-Modus.
- Neue Stylesheets referenzieren ausschließlich tatsächlich definierte Tokens.
  Responsive Browserprüfung und aktuelle Bild-/Screenshotabnahme erfolgen durch
  die zentrale Steuerung und werden hier nicht als eigene Messung ausgegeben.

## Offene Grenzen

Die Domain führt keine externen Modell-, Zahlungs-, Vault- oder IdP-Aktionen aus.
Ein Liveexecutor muss eine vertrauenswürdige Kostenobergrenze an die vollständige
Payload und tatsächliche Providerlimits binden. Lokale Reservierungsprüfungen
allein beweisen keinen zuschussfreien Livebetrieb. Ebenso sind fehlende reale
Presenter-Videos, produktive Clerk-Aktivierung und vollständige Betreiber-/Gateway-
Anbindungen durch diesen Review nicht erledigt.

Geprüfte SHA256-Snapshots:

| Datei | SHA256 |
| --- | --- |
| `apps/selfservice/domain.py` | `02f434bcb0c181eaa3ddf0f2d29435a55647f3cae53093e49a9cf10ac0235166` |
| `apps/web/components/HomeContent.tsx` | `01f0374bbf4a82d9ae84e7d1772dfe42dcfa0a265f8f93e8d174c95811b34d30` |
| `apps/web/components/Workspace.tsx` | `cbae51c844550118ce258b2ab8dd6154428de36c77c7c980660310f678c77689` |
| `apps/web/components/ExplainerSections.tsx` | `79b9bcc46e9be369d551ad60918a3ffc5e2b24653550d6b57b398c024791739d` |
| `apps/web/components/PresenterGuide.tsx` | `700b673d650b2331aba2741a9e3cde890d43ad05e353f205dc8c4fa369eb8772` |
