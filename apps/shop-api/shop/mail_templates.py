"""Brand e-mail templates (layout from prototypen/E-Mail-Transaktional-Angebot.html) with plain-text alternatives, Sie-Form."""
from html import escape

from .config import PUBLIC_ORIGIN

SELLER = "NeXify AI (by NeXify), Inhaber Pascal Courbois · Graaf van Loonstraat 1E, 5921 JA Venlo, Niederlande · KvK 90483944 · mail@nexifyai.cloud"
LEGAL = [("AGB", "/teileklar/rechtliches#agb"), ("Widerrufsbelehrung", "/teileklar/rechtliches#widerruf"),
         ("Muster-Widerrufsformular", "/teileklar/rechtliches#widerrufsformular"), ("Datenschutz", "/datenschutz")]
FONT = "font-family:Arial,Helvetica,sans-serif;"


def money(cents):
    return ("%.2f" % (cents / 100)).replace(".", ",") + " €"


def layout(kicker, title, blocks_html, preheader, brand="TEILEKLAR"):
    legal = " · ".join('<a href="%s%s" style="color:#3D454A;">%s</a>' % (PUBLIC_ORIGIN, path, label) for label, path in LEGAL)
    return f"""<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)}</title></head>
<body style="margin:0;padding:0;background-color:#F2F3EF;"><div style="display:none;max-height:0;overflow:hidden;">{escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F2F3EF;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:16px;">
<tr><td style="background-color:#14191C;padding:28px 40px;border-radius:16px 16px 0 0;" align="center"><table role="presentation"><tr><td style="width:24px;height:24px;background-color:#C8F04B;border-radius:99px;font-size:0;">&nbsp;</td><td style="padding-left:10px;{FONT}font-size:20px;font-weight:bold;color:#FFFFFF;">{brand}</td></tr></table></td></tr>
<tr><td style="padding:40px 40px 8px;{FONT}color:#14191C;"><p style="margin:0 0 18px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#646769;font-family:'Courier New',monospace;">{escape(kicker)}</p>
<h1 style="margin:0 0 20px;font-size:23px;line-height:1.35;">{escape(title)}</h1></td></tr>
{blocks_html}
<tr><td style="padding:24px 40px 32px;border-top:1px solid #E5E7E1;{FONT}font-size:12px;line-height:1.6;color:#646769;">{legal}<br>{escape(SELLER)}</td></tr>
</table></td></tr></table></body></html>"""


def para(text):
    return f'<tr><td style="padding:0 40px 16px;{FONT}font-size:15px;line-height:1.6;color:#3D454A;">{text}</td></tr>'


def table(rows):
    cells = "".join(f'<tr><td style="padding:8px 0;border-top:1px solid #E5E7E1;font-size:13px;color:#646769;">{escape(a)}</td><td align="right" style="padding:8px 0;border-top:1px solid #E5E7E1;font-size:13px;color:#14191C;">{escape(b)}</td></tr>' for a, b in rows)
    return f'<tr><td style="padding:0 40px 24px;"><table role="presentation" width="100%" style="background-color:#F7F8F5;border:1px solid #E2E4E0;border-radius:12px;"><tr><td style="padding:14px 20px;{FONT}"><table role="presentation" width="100%">{cells}</table></td></tr></table></td></tr>'


def button(label, url):
    return f'<tr><td style="padding:0 40px 24px;"><a href="{escape(url)}" style="display:inline-block;background-color:#C8F04B;color:#14191C;{FONT}font-size:15px;font-weight:bold;text-decoration:none;padding:14px 22px;border-radius:999px;">{escape(label)}</a></td></tr>'


def text_footer():
    return "\n\n" + "\n".join("%s: %s%s" % (label, PUBLIC_ORIGIN, path) for label, path in LEGAL) + "\n\n" + SELLER


NEXT_STEPS = ["Wir prüfen Ihre Bestellung und geben sie an den Lieferanten weiter.",
              "Der Versand erfolgt durch den Lieferanten. Sobald das Paket unterwegs ist, erhalten Sie eine E-Mail mit Sendungsnummer.",
              "Sie können den Vertrag innerhalb von 14 Tagen ohne Angabe von Gründen widerrufen. Nutzen Sie dafür die Widerrufsbelehrung und das Muster-Widerrufsformular."]


def order_lines(order):
    rows = [("%d × %s (SKU %s)" % (l["quantity"], l["name"], l["sku"]), money(l["line_cents"])) for l in order["lines"]]
    rows += [("Zwischensumme", money(order["subtotal_cents"])), ("Versand", money(order["shipping_cents"])),
             ("Gesamt inkl. MwSt.", money(order["total_cents"])), ("enthaltene MwSt. (%s %%)" % order["vat_percent"], money(order["vat_included_cents"]))]
    return rows


def address_text(a):
    return "%s %s, %s, %s %s, %s" % (a.get("first_name", ""), a.get("last_name", ""), a.get("street", ""), a.get("zip", ""), a.get("city", ""), a.get("country", ""))


def order_confirmation(order):
    url = PUBLIC_ORIGIN + "/teileklar/bestellung/" + order["_id"]
    rows = [("Bestellnummer", order["number"])] + order_lines(order) + [("Rechnungs- und Lieferadresse", address_text(order["address"])), ("Zahlungsart", "Revolut (Karte / Revolut Pay), bezahlt")]
    html = layout("Bestellbestätigung", "Vielen Dank, Ihre Bestellung %s ist bezahlt." % order["number"],
                  para("Guten Tag %s, wir haben Ihre Zahlung erhalten. Hier ist Ihre Bestellung im Überblick." % escape(order["address"].get("first_name", ""))) + table(rows)
                  + para("<strong>Was passiert als Nächstes</strong><br>" + "<br>".join(escape(s) for s in NEXT_STEPS)) + button("Bestellung ansehen", url),
                  "Bestellung %s bezahlt" % order["number"])
    text = ("Vielen Dank, Ihre Bestellung %s ist bezahlt.\n\n" % order["number"] + "\n".join("%s: %s" % r for r in rows)
            + "\n\nWas passiert als Nächstes\n- " + "\n- ".join(NEXT_STEPS) + "\n\nBestellung ansehen: " + url + text_footer())
    return "Bestellbestätigung %s" % order["number"], html, text


def internal_new_order(order):
    rows = [("Bestellnummer", order["number"]), ("Kunde", order["address"].get("email", ""))] + order_lines(order) + [("Adresse", address_text(order["address"]))]
    html = layout("Intern", "Neue bezahlte Bestellung %s" % order["number"], table(rows) + button("Im Admin öffnen", PUBLIC_ORIGIN + "/teileklar/admin"), "Neue Bestellung")
    return "Neue Bestellung %s" % order["number"], html, "\n".join("%s: %s" % r for r in rows) + "\n\nAdmin: " + PUBLIC_ORIGIN + "/teileklar/admin"


def order_status(order, status):
    url = PUBLIC_ORIGIN + "/teileklar/bestellung/" + order["_id"]
    if status == "in_bearbeitung":
        title, body = "Ihre Bestellung %s ist in Bearbeitung." % order["number"], "Wir bereiten Ihre Bestellung für den Versand vor. Sobald das Paket unterwegs ist, erhalten Sie die Sendungsnummer."
        rows = [("Bestellnummer", order["number"])]
    else:
        title, body = "Ihre Bestellung %s ist unterwegs." % order["number"], "Ihr Paket wurde an den Versanddienstleister übergeben."
        rows = [("Bestellnummer", order["number"]), ("Versanddienstleister", order.get("carrier") or "–"), ("Sendungsnummer", order.get("tracking_number", ""))]
    html = layout("Bestellstatus", title, para(escape(body)) + table(rows) + button("Bestellung ansehen", url), title)
    return title, html, title + "\n\n" + body + "\n\n" + "\n".join("%s: %s" % r for r in rows) + "\n\nBestellung ansehen: " + url + text_footer()


def welcome(user):
    html = layout("Willkommen", "Ihr TEILEKLAR-Konto ist eingerichtet.", para("Sie können sich ab sofort mit %s anmelden, Bestellungen verfolgen und Ihren Warenkorb geräteübergreifend nutzen." % escape(user["email"])) + button("Zum Shop", PUBLIC_ORIGIN + "/teileklar/shop"), "Konto eingerichtet")
    return "Willkommen bei TEILEKLAR", html, "Ihr TEILEKLAR-Konto ist eingerichtet.\n\nAnmeldung mit: %s\nShop: %s/teileklar/shop" % (user["email"], PUBLIC_ORIGIN) + text_footer()


def password_reset(link):
    html = layout("Passwort", "Neues Passwort festlegen", para("Über den Button legen Sie ein neues Passwort fest. Der Link gilt 60 Minuten und nur einmal. Falls Sie das nicht angefordert haben, ignorieren Sie diese E-Mail.") + button("Passwort festlegen", link), "Passwort zurücksetzen")
    return "Passwort zurücksetzen", html, "Neues Passwort festlegen (gültig 60 Minuten, nur einmal):\n" + link + "\n\nFalls Sie das nicht angefordert haben, ignorieren Sie diese E-Mail." + text_footer()


def workshop_receipt(req):
    rows = [("Anfrage", req["_id"]), ("Werkstatt", req.get("workshop_name") or ""), ("Status", "Anfrage gesendet – noch kein Termin")]
    html = layout("Werkstattanfrage", "Anfrage gesendet – noch kein Termin", para("Ihre Anfrage ist gespeichert. Ein Termin entsteht erst, wenn die Werkstatt ihn bestätigt. Die Werkstatt ist ein Verzeichnisbetrieb, kein TEILEKLAR-Vertragspartner.") + table(rows), "Anfrage gesendet")
    return "Ihre Werkstattanfrage %s" % req["_id"], html, "Anfrage gesendet – noch kein Termin\n\n" + "\n".join("%s: %s" % r for r in rows) + text_footer()


def internal_request(doc):
    rows = [("Vorgang", doc["number"]), ("Art", doc.get("kind", "contact")), ("Name", doc["name"]), ("E-Mail", doc["email"]), ("Firma", doc.get("company") or "–")]
    html = layout("Intern", "Neue Anfrage %s" % doc["number"], table(rows) + para(escape(doc["message"]).replace("\n", "<br>")), "Neue Anfrage", brand="NeXify AI")
    return ("Partneranfrage " if doc.get("kind") == "partner" else "Anfrage ") + doc["number"], html, "\n".join("%s: %s" % r for r in rows) + "\n\n" + doc["message"]
