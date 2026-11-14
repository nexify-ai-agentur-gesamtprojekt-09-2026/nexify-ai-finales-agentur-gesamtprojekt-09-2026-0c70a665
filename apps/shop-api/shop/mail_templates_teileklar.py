"""TEILEKLAR mail texts for workshop requests, TEILEKLAR enquiries and partner applications.

Rules for every text here: short, factual, Sie-Form. A text states only what the code has done. It names
no price, fee, "free of charge", deadline, response time or acceptance, because none of that is released.
All of these mails leave under the shop's own sender (mailer.sender(), brand TEILEKLAR).
"""
from html import escape

from .mail_templates import layout, para, table, text_footer

# One wording per machine-readable request state; the API returns the same sentence as `message`.
WORKSHOP_REQUEST_TEXT = {
    "eingegangen_bei_teileklar": "Ihre Anfrage ist bei TEILEKLAR eingegangen und gespeichert. Der Betrieb wurde von TEILEKLAR nicht benachrichtigt: "
                                 "Er ist ein Verzeichniseintrag ohne bestätigte Partnerschaft mit TEILEKLAR. Ein Termin ist nicht vereinbart. "
                                 "Den Betrieb erreichen Sie über die im Verzeichnis genannten Kontaktdaten.",
    "einbauwunsch_eingegangen": "Ihr Einbauwunsch ist bei TEILEKLAR eingegangen und gespeichert. Er richtet sich an TEILEKLAR, nicht an den Betrieb: "
                                "Der Betrieb ist ein Verzeichniseintrag ohne bestätigte Partnerschaft mit TEILEKLAR und wurde nicht benachrichtigt. "
                                "Ein Termin oder eine Vermittlung ist damit nicht zugesagt.",
    "eingegangen_partner_nicht_zugestellt": "Ihre Anfrage ist bei TEILEKLAR eingegangen und gespeichert. Sie wurde dem Betrieb noch nicht zugestellt. "
                                            "Ein Termin ist nicht vereinbart.",
}
WORKSHOP_REQUEST_STATUS = {
    "eingegangen_bei_teileklar": "Eingegangen bei TEILEKLAR – Betrieb nicht benachrichtigt, kein Termin",
    "einbauwunsch_eingegangen": "Einbauwunsch bei TEILEKLAR eingegangen – kein Termin",
    "eingegangen_partner_nicht_zugestellt": "Eingegangen bei TEILEKLAR – noch nicht zugestellt, kein Termin",
}
NOT_PARTNER_TEXT = "Dieser Betrieb ist kein TEILEKLAR-Partner. Bitte wenden Sie sich direkt an den Betrieb."


def workshop_receipt(req):
    state = req.get("state") or "eingegangen_bei_teileklar"
    title, body = WORKSHOP_REQUEST_STATUS[state], WORKSHOP_REQUEST_TEXT[state]
    rows = [("Vorgang", req["_id"]), ("Betrieb", req.get("workshop_name") or ""), ("Stand", title)]
    html = layout("Werkstattanfrage", title, para(escape(body)) + table(rows), title)
    return "Ihre Anfrage %s bei TEILEKLAR" % req["_id"], html, title + "\n\n" + body + "\n\n" + "\n".join("%s: %s" % r for r in rows) + text_footer()


def internal_workshop_request(req):
    """Operator notification. Internal only; the workshop itself is not a recipient."""
    rows = [("Vorgang", req["_id"]), ("Stand", req.get("state") or ""), ("Betrieb", "%s (%s)" % (req.get("workshop_name") or "", req.get("workshop_id") or "")),
            ("Name", req.get("name") or ""), ("E-Mail", req.get("email") or "")] + [(label, req[key]) for label, key in (("Telefon", "phone"), ("Fahrzeug", "vehicle")) if req.get(key)]
    title = "Neue Werkstattanfrage %s" % req["_id"]
    note = "Der Betrieb wurde nicht benachrichtigt. Die Anfrage liegt nur bei TEILEKLAR."
    html = layout("Intern", title, table(rows) + para(escape(note)) + para(escape(req.get("message") or "").replace("\n", "<br>")), "Neue Werkstattanfrage")
    return title, html, "\n".join("%s: %s" % r for r in rows) + "\n\n" + note + "\n\n" + (req.get("message") or "")


def internal_request(doc):
    """TEILEKLAR enquiry from the public form (e.g. partner enquiry): TEILEKLAR brand, TEILEKLAR number."""
    rows = [("Vorgang", doc["number"]), ("Art", doc.get("kind", "contact")), ("Name", doc["name"]), ("E-Mail", doc["email"]), ("Firma", doc.get("company") or "–")] \
        + [(label, doc[key]) for label, key in (("Telefon", "phone"), ("Seite", "page_path")) if doc.get(key)]
    title = "Neue TEILEKLAR-Anfrage %s" % doc["number"]
    html = layout("Intern", title, table(rows) + para(escape(doc["message"]).replace("\n", "<br>")), "Neue TEILEKLAR-Anfrage")
    return title, html, "\n".join("%s: %s" % r for r in rows) + "\n\n" + doc["message"]


# Partner application: one neutral sentence per status. No conditions, no cost statement, no promise.
APPLICATION_TEXT = {
    "eingegangen": "Ihr Partnerantrag ist bei TEILEKLAR eingegangen. Diese Nachricht bestätigt nur den Eingang; eine Aufnahme ist damit nicht zugesagt.",
    "in_pruefung": "Ihr Partnerantrag wird von TEILEKLAR geprüft. Eine Aufnahme ist damit nicht zugesagt.",
    "rueckfrage": "Zu Ihrem Partnerantrag hat TEILEKLAR eine Rückfrage. Bitte antworten Sie auf diese Nachricht.",
    "freigegeben": "Ihr Partnerantrag wurde von TEILEKLAR freigegeben. Die Freigabe ist noch keine Veröffentlichung in der Werkstattsuche.",
    "abgelehnt": "Ihr Partnerantrag wurde von TEILEKLAR nicht angenommen.",
    "zurueckgezogen": "Ihr Partnerantrag wurde zurückgezogen und wird nicht weiter bearbeitet.",
    "verfallen": "Ihr Partnerantrag wird nicht weiter bearbeitet, weil eine Rückfrage offen geblieben ist. Ein neuer Antrag ist möglich.",
}
APPLICATION_LABEL = {"eingegangen": "Eingegangen", "in_pruefung": "In Prüfung", "rueckfrage": "Rückfrage", "freigegeben": "Freigegeben",
                     "abgelehnt": "Nicht angenommen", "zurueckgezogen": "Zurückgezogen", "verfallen": "Verfallen"}


def application_status(application, note=""):
    """Mail to the applicant. `note` is the operator's text for the applicant (query or reason), never the internal log."""
    status = application["status"]
    title = "Partnerantrag %s: %s" % (application["number"], APPLICATION_LABEL[status])
    rows = [("Vorgang", application["number"]), ("Betrieb", application.get("company") or ""), ("Stand", APPLICATION_LABEL[status])]
    extra = para(escape(note).replace("\n", "<br>")) if note else ""
    html = layout("Partnerantrag", title, para(escape(APPLICATION_TEXT[status])) + extra + table(rows), title)
    text = title + "\n\n" + APPLICATION_TEXT[status] + ("\n\n" + note if note else "") + "\n\n" + "\n".join("%s: %s" % r for r in rows) + text_footer()
    return title, html, text


def internal_application(application):
    rows = [("Vorgang", application["number"]), ("Betrieb", application.get("company") or ""), ("Ansprechperson", application.get("contact_name") or ""),
            ("E-Mail", application.get("email") or ""), ("Verzeichniseintrag (Angabe)", application.get("claimed_workshop_id") or "–")]
    title = "Neuer Partnerantrag %s" % application["number"]
    html = layout("Intern", title, table(rows) + para(escape(application.get("message") or "").replace("\n", "<br>")), "Neuer Partnerantrag")
    return title, html, "\n".join("%s: %s" % r for r in rows) + "\n\n" + (application.get("message") or "")
