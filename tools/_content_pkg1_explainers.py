"""Complete Paket 1 for user-visible kasse/cart EXPLAINER copy ONLY.
Edits body/outcome/next_action.label in config/page-explainers.json (tk-cart, tk-checkout).
Does NOT touch module titles (media-registry binding context_title===title.de) nor media-registry
nor preview-coverage. Byte-stable serializer."""
import json
import subprocess
from pathlib import Path

p = Path("config/page-explainers.json")
raw = p.read_text(encoding="utf-8")
d = json.loads(raw)
indent = 1 if (json.dumps(d, ensure_ascii=False, indent=1) + "\n") == raw else 2
by = {pg["page_id"]: pg for pg in d["pages"]}


def L(de, nl, fr):
    return {"de": de, "nl": nl, "fr": fr}


def mod(pid, mid):
    return next(m for m in by[pid]["modules"] if m["id"] == mid)


m = mod("tk-cart", "tk-cart-explain-1")
m["body"] = L(
    "Im Warenkorb führen Sie Ihre ausgewählten Teile zusammen und behalten den Überblick. Es wird nichts bestellt und keine Zahlung ausgelöst. An der Kasse fassen wir alles zusammen und klären Preis, Lieferung und Bezahlung, bevor etwas verbindlich wird.",
    "In de winkelwagen brengt u uw gekozen onderdelen samen en houdt u het overzicht. Er wordt niets besteld en geen betaling gestart. Bij de kassa vatten we alles samen en bespreken we prijs, levering en betaling voordat er iets bindend wordt.",
    "Dans le panier, vous réunissez les pièces choisies et gardez une vue d’ensemble. Rien n’est commandé et aucun paiement n’est déclenché. Au paiement, nous récapitulons tout et clarifions prix, livraison et règlement avant tout engagement.",
)
m["outcome"] = L("Den nächsten Schritt zur Kasse verstehen.", "De volgende stap naar de kassa begrijpen.", "Comprendre l’étape suivante vers le paiement.")
m["next_action"]["label"] = L("Weiter zur Kasse", "Verder naar de kassa", "Vers le paiement")

m = mod("tk-cart", "tk-cart-explain-2")
m["body"] = L(
    "Sie können jederzeit weitere Teile suchen und Ihrem Warenkorb hinzufügen. Beschreiben Sie Fahrzeug und gewünschtes Teil – wir helfen, die passende Auswahl zu finden.",
    "U kunt op elk moment meer onderdelen zoeken en aan uw winkelwagen toevoegen. Beschrijf voertuig en gewenst onderdeel – wij helpen de juiste keuze te vinden.",
    "Vous pouvez à tout moment rechercher d’autres pièces et les ajouter au panier. Décrivez le véhicule et la pièce souhaitée – nous vous aidons à trouver le bon choix.",
)
m["outcome"] = L("Die Teilesuche erneut öffnen.", "De onderdelenzoektocht opnieuw openen.", "Rouvrir la recherche de pièces.")
m["next_action"]["label"] = L("Teil suchen", "Onderdeel zoeken", "Rechercher une pièce")

m = mod("tk-checkout", "tk-checkout-explain-1")
m["body"] = L(
    "Für Ihre Bestellung brauchen wir Artikel, Preis, Versand und die nötigen Verbraucherinformationen. Der direkte Online-Kauf mit Sofortzahlung ist derzeit noch nicht verfügbar – bis dahin nehmen wir Ihre Bestellung persönlich auf und zeigen Ihnen die nächsten Schritte.",
    "Voor uw bestelling hebben we artikel, prijs, verzending en de nodige consumenteninformatie nodig. Direct online kopen met onmiddellijke betaling is op dit moment nog niet beschikbaar – tot die tijd nemen we uw bestelling persoonlijk op en tonen we u de volgende stappen.",
    "Pour votre commande, il nous faut l’article, le prix, la livraison et les informations consommateurs nécessaires. L’achat en ligne direct avec paiement immédiat n’est pas encore disponible – en attendant, nous enregistrons votre commande personnellement et vous indiquons les prochaines étapes.",
)
m["outcome"] = L("Die nächsten Schritte zur Bestellung sehen.", "De volgende stappen voor de bestelling zien.", "Voir les prochaines étapes de la commande.")

p.write_text(json.dumps(d, ensure_ascii=False, indent=indent) + "\n", encoding="utf-8")
left = subprocess.run(["grep", "-c", "nicht zum Kauf freigegeben", "config/page-explainers.json"], capture_output=True, text=True).stdout.strip()
print("page-explainers.json updated (indent=%d); explainer old-phrase count:" % indent, left)
