Lokale Integrationspräzisierung: [current-main-integration.md](../contracts/current-main-integration.md). Der sichtbare Headerzugang führt zur route-lokalen Konto-/An-/Abmeldung; er behauptet keinen Sitzungsstatus. Kein globaler SDK-Lifecycle oder Header-UserButton wird im integrierten Kandidaten angeboten.

# Sprint-Contract: sichtbarer Anmelde- und Abmeldeweg

Feature: F-008. Die öffentliche React-Site zeigt bei deaktivierter Authentifizierung
einen ehrlichen Anmeldeweg und bei geladener Clerk-Sitzung den eigenen Konto-/
Abmeldezugang. Anmeldung erzeugt keine Mandanten-, Rollen- oder Fachberechtigung.

Abnahme: Typen und Site-/Next-Build, Auth-Gegenproben, 44-Pixel-Kontrolle,
DE/NL/FR, Desktop/Mobil, gespeicherte Browserbindung und vollständige lokale
Integrationsprüfung. Echte Clerk-Anmeldung, SMS/MFA, Membership, Workspace-Daten
und bestätigte Hintergrundarbeit benötigen weiterhin ihre eigenen Liveadapter.
