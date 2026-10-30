"""Paket 3 — Nexify protected portals: remove internal jargon, customer sign-in copy.
Keeps source_refs/access/structure; DE/NL/FR consistent; byte-stable serializer."""
import json
from pathlib import Path

P = Path("config/site-map.json")
data = json.loads(P.read_text(encoding="utf-8"))
by_id = {p["id"]: p for p in data["pages"]}


def L(de, nl, fr):
    return {"de": de, "nl": nl, "fr": fr}


def set_portal(pid, title, summary, heading, body, login_label):
    p = by_id[pid]
    refs = p["sections"][0]["source_refs"]
    p["title"] = title
    p["summary"] = summary
    p["metadata"]["description"] = dict(summary)
    p["sections"] = [{"id": "ueberblick", "heading": heading, "body": body, "source_refs": refs}]
    p["next_actions"] = [{"type": "route", "target_id": "login", "label": login_label}]


set_portal(
    "customer-portal",
    L("Kundenbereich", "Klantgedeelte", "Espace client"),
    L("In Ihrem persönlichen Kundenbereich sehen Sie Ihre Projekte, Angebote und Dokumente an einem Ort. Melden Sie sich an, um Ihre Inhalte geschützt zu öffnen.",
      "In uw persoonlijke klantgedeelte ziet u uw projecten, offertes en documenten op één plek. Meld u aan om uw inhoud beschermd te openen.",
      "Dans votre espace client personnel, vous retrouvez vos projets, devis et documents au même endroit. Connectez-vous pour ouvrir vos contenus en toute sécurité."),
    L("Kundenbereich", "Klantgedeelte", "Espace client"),
    L("Hier bündeln Sie Angebote, Projektfortschritt und Dokumente. Zum Schutz Ihrer Daten ist dafür eine Anmeldung nötig; Sie sehen ausschließlich Ihre eigenen Inhalte.",
      "Hier bundelt u offertes, projectvoortgang en documenten. Ter bescherming van uw gegevens is aanmelden nodig; u ziet uitsluitend uw eigen inhoud.",
      "Vous y regroupez devis, avancement de projet et documents. Pour protéger vos données, une connexion est nécessaire ; vous ne voyez que vos propres contenus."),
    L("Anmelden", "Aanmelden", "Se connecter"),
)

set_portal(
    "api-console",
    L("API-Bereich", "API-gedeelte", "Espace API"),
    L("Im API-Bereich verwalten Sie Ihre Zugänge und sehen, wie Sie NeXify in eigene Anwendungen einbinden. Melden Sie sich an, um Ihre Schlüssel und Einstellungen geschützt zu verwalten.",
      "In het API-gedeelte beheert u uw toegangen en ziet u hoe u NeXify in eigen toepassingen integreert. Meld u aan om uw sleutels en instellingen beschermd te beheren.",
      "Dans l’espace API, vous gérez vos accès et voyez comment intégrer NeXify à vos applications. Connectez-vous pour gérer vos clés et paramètres en toute sécurité."),
    L("API-Bereich", "API-gedeelte", "Espace API"),
    L("Hier verwalten Sie Zugänge und Einstellungen für die Anbindung eigener Anwendungen. Zum Schutz Ihrer Zugangsdaten ist dafür eine Anmeldung nötig.",
      "Hier beheert u toegangen en instellingen voor de koppeling van eigen toepassingen. Ter bescherming van uw toegangsgegevens is aanmelden nodig.",
      "Vous gérez ici les accès et paramètres pour connecter vos propres applications. Pour protéger vos identifiants, une connexion est nécessaire."),
    L("Anmelden", "Aanmelden", "Se connecter"),
)

set_portal(
    "affiliate-portal",
    L("Partnerbereich", "Partnergedeelte", "Espace partenaire"),
    L("Im Partnerbereich sehen Partner ihre Empfehlungen, Konditionen und Abrechnungen. Melden Sie sich mit Ihrem Partnerzugang an, um Ihren geschützten Bereich zu öffnen.",
      "In het partnergedeelte zien partners hun aanbevelingen, voorwaarden en afrekeningen. Meld u aan met uw partnertoegang om uw beschermde gedeelte te openen.",
      "Dans l’espace partenaire, les partenaires voient leurs recommandations, conditions et décomptes. Connectez-vous avec votre accès partenaire pour ouvrir votre espace sécurisé."),
    L("Partnerbereich", "Partnergedeelte", "Espace partenaire"),
    L("Hier bündeln Sie Empfehlungen, Konditionen und Abrechnungen Ihrer Partnerschaft. Zum Schutz Ihrer Daten ist dafür eine Anmeldung mit Partnerzugang nötig.",
      "Hier bundelt u aanbevelingen, voorwaarden en afrekeningen van uw partnerschap. Ter bescherming van uw gegevens is aanmelden met partnertoegang nodig.",
      "Vous y regroupez recommandations, conditions et décomptes de votre partenariat. Pour protéger vos données, une connexion avec accès partenaire est nécessaire."),
    L("Mit Partnerzugang anmelden", "Aanmelden met partnertoegang", "Se connecter avec l’accès partenaire"),
)

P.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Nexify protected portals updated.")
