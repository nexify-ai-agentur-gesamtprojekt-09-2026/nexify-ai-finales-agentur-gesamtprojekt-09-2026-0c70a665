# Kontrollierter Shop-Namespace-Operator – vorbereitet, nicht ausgeführt

Basis ist Owner-Releasecommit a4b74dc9793d0d6b5a40878d690b03b80bcc80ea,
Parent b09fd93, unveränderter Tree7c4a289d40369dfc1745862a8467f9e9f21b3d07.
Laut Parent ist Previewdeployment dpl_AKHeHVZ7bwCWfuXyhsQ5AoMVPkko READY;
/api/health dort503 database_namespace_unapproved. Das ist ein berichteter
Plattformnachweis, keine durch diesen Operator ausgeführte Datenbankprüfung.
Keine Produktionsumschaltung, keine tatsächliche Namespaceanlage in diesem Paket.

## Fester Umfang

- Bestehendes Projekt prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh, vorhandener zugeordneter
  Atlasstore store_jCItPjCAFfPtsE8h. Der Code kann die Herkunft eines ENV-Werts
  nicht selbst als Storezuordnung zertifizieren; Root prüft diese Metadaten.
- Einziger Zielname ist der NEU geplante nexify_teileklar_shop_v1. Der Operator
  liest oder verändert niemals die Defaultdatenbank aus dem URI-Pfad.
- Vorhandene MONGODB_URI/MONGO_URL werden ausschließlich im bestehenden
  Backend-/Buildprozess verwendet. Keine URI-/Tokenargumente, dotenv-Dateien,
  env pull, Secretkopie, Browserbindung oder Ausgabe von Connectionwerten.
- Nur listCollections/indexInformation im Preflight, keine Dokumente/counts.
  Metadaten sind begrenzt. Unlesbare/zu große/fremde Metadaten führen zum Stop.
- Keine öffentliche Route, kein Lifespan-/Startuphook, kein Timer und keine
  Standard-Buildcommandänderung. vercel.json bleibt gegenüber a4b74dc unverändert.

## Bedienvertrag

Die folgenden Befehle gelten im Serviceverzeichnis apps/shop-api. Die
vorhandenen Serviceabhängigkeiten müssen installiert sein.

```text
python3 namespace_operator.py plan
python3 namespace_operator.py
python3 namespace_operator.py preflight
```

plan liest keine Umgebung und verbindet keine Datenbank. Es liefert den stabilen
Plan samt nicht geheimem SHA256. Ohne Argument wird ausschließlich preflight
gewählt. Ein erfolgreicher CLI-Exit bedeutet nur, dass das Prüfresultat vorliegt.
Nur state=empty_namespace_metadata bestätigt, dass beim aktuellen begrenzten
listCollections-Aufruf keine Collection oder View in diesem festen Ziel sichtbar
war. Ein vorhandenes Namespace wird nie als leer ausgegeben. Bei vollständigem
passendem Schema heißt der reine Lesestatus existing_schema_matches_read_only.
Andere vorhandene Namespaces bleiben existing_namespace_not_initialized_by_this_operation.
Keine Aussage über Anbieterfähigkeit, Datenqualität, Rollen oder Verkaufsfreigabe.

Eine spätere explizite Initialisierung benötigt den aktuellen Planhash:

```text
python3 namespace_operator.py init --confirm-plan-sha256 <SHA256-aus-plan>
```

Dieser Befehl wird hier NICHT gegen einen echten Store ausgeführt. Root führt ihn
nur als eigenen kontrollierten Operator-Schritt aus, nach bestätigter Projekt- und
Storezuordnung und ohne konkurrierende direkte Datenbankwriter. Der Code prüft
Leere unmittelbar selbst erneut; ein früherer Report ersetzt diese Prüfung nicht.

## Eigentumsnachweis und Abbruch

MongoDB kann create mit identischem Namen und identischen Optionen als
No-op erfolgreich beantworten. Deshalb ist gleicher create-Aufruf KEIN Mutex.
Der erste source_manifests-Validator erhält eine neue128-Bit-Laufkennung in seiner
Description: fester Projekt-/Namespacemarker plus /claim/ und32kleineHexzeichen.
Andere Initialisierungen haben abweichende Optionen und können diesen Claim nicht
als eigenen übernehmen. Das anschließende Metadatenreadback prüft genau die eigene
Laufkennung. Die Kennung ist Prüfmetadatum, kein Zugangsschlüssel. Kollisionen
zufälliger128-Bit-Kennungen sind praktisch vernachlässigbar; kein100%-Versprechen.

Alle weiteren Collections werden nur durch denselben Aufruf neu erstellt, mit den
festen Options-/Schemawerten. Vor und nach jeder Collectionanlage wird die eigene
Metadatenmenge geprüft. Der Aufruf legt18Collections und17zusätzliche Indizes an;
_id-Indizes entstehen durch MongoDB selbst. Keine Accounts, Produkte, Preise,
Bestellungen, Mails, Freigaben oder sonstigen Geschäftsdokumente werden angelegt.
Keine collMod-, Drop-, Delete-, Update- oder Migrationsoperation. Der Adapter
akzeptiert die eng begrenzte Claimdescription ausschließlich für source_manifests;
alle übrigen Schema-/Index-/Projekt-/Authprüfungen bleiben erhalten.

Abbruch, Timeout, fremde Collection oder veränderte eigene Metadaten: Stop.
Teilweise bestätigte DDL wird mit incomplete_readback_required und bestätigten
Zählern ausgewiesen. Der letzte Write kann trotz Timeout committed sein.
Keine automatischen Write-Retries, kein Resume, kein Rollback und kein Löschen.
Ein zweiter Init-Aufruf verweigert jedes bereits vorhandene Namespace. Root führt
nur den lesenden Preflight aus und entscheidet gesondert über eine Teilanlage.

## Möglicher bestehender Vercel-Operatorpfad

Vercel Services unterstützt einen servicebezogenen buildCommand; Projekt-ENVs
stehen im Buildkontext bereit. Ein öffentlicher Bootstrapendpoint oder eine neue
Remote-Shell ist dafür nicht erforderlich. Der technisch vorbereitete Weg ist
jedoch noch NICHT mit realen Storemetadaten ausgeführt:

1. Root prüft am exakten bestehenden Projekt/Previewziel die Storebindung und
   vorhandenen DB-Rechte. Keine neue Berechtigung aus einem Fehler ableiten.
2. Root erstellt bei Bedarf einen isolierten einmaligen Operator-Previewquellstand
   mit gleicher Anwendung und ausschließlich diesem Shop-buildCommand:
   python3 prepare_vercel.py && python3 namespace_operator.py preflight
   Keine globale Projekteinstellung, Productionpromotion oder Domainzuweisung.
   Der normale Releasebranch behält unverändert python3 prepare_vercel.py.
3. Nur den festen JSON-Report aus den bestehenden Buildlogs lesen. Kein env dump,
   keine Connectionwerte exportieren. Fehlende Verbindung/Rechte sind ein echter
   Befund und kein Anlass für SSH/Core-Fallback oder neue Secrets.
4. Nach positiver leerer Metadatenprüfung kann Root einen separat kontrollierten
   einmaligen Init-Build mit aktuellem Planhash vorsehen. Vor dessen Start muss
   die neue Adapterfassung mit Claimunterstützung Bestandteil des Kandidaten sein.
   Auch dieser Aufruf prüft selbst erneut auf Leere. Danach keinen Init-Build
   blind wiederholen oder dessen Buildcommand dauerhaft im Release lassen.
5. Preflight erneut lesend rücklesen; anschließend Runtimekonfiguration getrennt
   abgleichen. DB_NAME muss zum festen Plan passen. Falls ein abweichender
   URI-Defaultpfad vorliegt, bleibt der normale Adapter absichtlich fail-closed;
   eine sichere Connection-/Namenskonfiguration ist ein gesonderter Owner-Schritt.
   Kein URI wird vom Operator verändert. Exakter PUBLIC_ORIGIN und bestätigte
   SHOP_VAT_PERCENT sowie Provider-/Preis-/Versandregeln bleiben separate Gates.

Voraussetzungen: vorhandene Projektintegration liefert die URI auch an den
gewählten Buildkontext; Atlas ist von dort erreichbar; bestehende Rechte erlauben
listCollections/listIndexes und für init createCollection/createIndex. Keine
dieser Laufzeitvoraussetzungen wird aus einer Paketinstallation behauptet.
Operator-Buildcompute ist bestehende Vercelnutzung, hier nicht neu ausgelöst oder
bepreist; Root hält Kosten-/Zielbindung vor Ausführung ein.

## Zahlungsmodus und reine Authlesewege

Einzig neu freigegeben vom Zahlungsmodusguard: GET/HEAD /api/auth/me. Der aktuelle
Callgraph ist me → session_user → sessions.find_one(token_hash) → users.find_one
→ public_user. Keine Sessionverlängerung, Bereinigung, Mail oder Provideraktion.
Der reale Projekt-/Namespace-/Schema-/Indexguard bleibt davor. Ohne gültige
Sitzung401, mit bestätigter eigener Sitzung öffentliche Benutzerprojektion;
kein Clientheader vergibt Rollen. Cookie-/Bearerprüfung bleibt bestehend.

Login/Register/Logout/Reset/Google sind Schreib- oder externe Wege und bleiben
von dieser kleinen Leseausnahme unberührt. Cart-GET und Order-GET können schreiben
oder beim Provider abgleichen und bleiben bei unbekanntem Modus gesperrt. Kein
Default-live, keine Schlüsselaliasierung, keine kosmetische503-zu200-Umschaltung.
Die derzeit fehlende Namespacekonfiguration wird dadurch nicht behoben.

## Nachweisgrenzen und Rückweg

Tests verwenden ausschließlich synthetische Sessions und Metadaten-/DDL-Fakes,
inklusive echtem Mongo-No-op-Verhalten, Konkurrenten, Teilanlage, falschem Plan,
fremdem Namespace, begrenzter Metadatenmenge und redigierter CLI-Ausgabe.
Keine produktiven Dokumente/Secrets gelesen, keine Datenbankverbindung ausgelöst.
Ein Code-/Deploymentrollback löscht keine neue oder teilweise angelegte Struktur.
Vorherige Releasefassung a4b74dc bleibt erhalten; Claimformat v2 muss beim
Rückwechsel berücksichtigt werden, sonst sperrt der ältere Adapter absichtlich.

Offizielle Quellen:
- https://vercel.com/docs/services/config-reference
- https://vercel.com/docs/environment-variables
- https://www.mongodb.com/docs/manual/reference/command/create/
- https://pymongo.readthedocs.io/en/stable/api/pymongo/database.html
