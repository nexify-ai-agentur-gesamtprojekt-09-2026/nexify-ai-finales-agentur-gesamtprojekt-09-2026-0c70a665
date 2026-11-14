#!/usr/bin/env python3
"""Prüft das Lösungs- und Zugangsregister (config/loesungsregister.json).

Nur lesend und offline: kein Netz, kein Schlüssel, keine Aussage über einen Dienst.
Geprüft werden Schema, eindeutige Kennungen, Tags und „wann_nutzen“ je Lösung,
die Übereinstimmung der lesbaren Fassung (docs/04-betrieb/loesungsregister.md) mit
der JSON-Quelle und – vor allem – dass keine der geprüften Dateien einen
Geheimniswert enthält. Das Register nennt Zugänge nur mit Bezeichnung und
Ablageort; der Wert liegt ausschließlich im jeweiligen Geheimnisspeicher.

Aufruf:
  python3 tools/check_loesungsregister.py             prüfen (Exit 1 bei Befund)
  python3 tools/check_loesungsregister.py --write-md  lesbare Fassung neu erzeugen

Ein grüner Lauf belegt die Form des Registers, nicht den Zustand der Dienste.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTER = "config/loesungsregister.json"
MARKDOWN = "docs/04-betrieb/loesungsregister.md"
# Diese Dateien werden zusätzlich auf Geheimniswerte durchsucht.
SCANNED = (
    REGISTER,
    MARKDOWN,
    "docs/04-betrieb/aufraeumplan-2026-11-14.md",
    ".claude/skills/nexify-loesungsregister/SKILL.md",
)

ZUSTAENDE = ("läuft belegt", "läuft unbelegt", "defekt", "geplant", "stillgelegt", "nicht verfolgt")
ROLLEN = ("tragend", "doppelt", "abzulösen", "unklar")
TOP_KEYS = {"schema_version", "stand", "hinweis", "geheimnisspeicher", "loesungen"}
LOESUNG_KEYS = {
    "id", "name", "tags", "kategorie", "zweck", "ort", "zustand", "entscheidung",
    "rolle_im_plan", "zugaenge", "wann_nutzen", "nicht_nutzen_fuer", "abhaengigkeiten",
}
ZUSTAND_KEYS = {"status", "beleg", "stand"}
ROLLE_KEYS = {"art", "bleibt", "frage", "hinweis"}
ZUGANG_KEYS = {
    "bezeichnung", "art", "ablageort", "rechteumfang", "erstellt",
    "offengelegt", "erneuerung_faellig", "hinweis",
}
ZUGANG_PFLICHT = ZUGANG_KEYS - {"hinweis"}
ID_FORM = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
TAG_FORM = re.compile(r"^[a-zäöüß0-9]+([-.:][a-zäöüß0-9]+)*$")
KUNDE_TAG = re.compile(r"^kunde:[a-z0-9]{2,12}$")
DATUM = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ENTSCHEIDUNG = re.compile(r"^(keine|D-\d{3}(, D-\d{3})*)( \(.+\))?$")
BELEG_DATEI = re.compile(r"`([A-Za-z0-9_.\-/]+\.(?:md|json|py|mjs|yaml|yml|sh))(?::\d+(?:-\d+)?)?`")

# Nicht geheime Kennungen, die wie Zufallsfolgen aussehen. Bewusst hier im Code
# und nicht in der Datendatei: eine neue Ausnahme braucht eine Codeänderung mit Review.
ERLAUBTE_KENNUNGEN = {
    "a112f895c19e0d65f6f64b3e89f747f8": "Cloudflare-Konto-ID (steht in jeder Dashboard-Adresse, kein Zugang)",
    "prj_lKQEWQKzjqq4Ifvmwy6dh1XCIgVR": "Vercel-Projektkennung (bereits in AGENTS.md, kein Zugang)",
}

_VOR = r"(?<![A-Za-z0-9])"
GEHEIMNIS_MUSTER = (
    ("Schlüssel mit Präfix sk-", re.compile(_VOR + r"sk-[A-Za-z0-9_\-]{16,}")),
    ("Schlüssel mit Präfix sk_", re.compile(_VOR + r"sk_[A-Za-z0-9_]{16,}")),
    ("GitHub-Token", re.compile(_VOR + r"(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})")),
    ("Cloudflare-Token", re.compile(_VOR + r"cf(?:at|ut|ast|k)_[A-Za-z0-9_\-]{16,}")),
    ("Resend-Schlüssel", re.compile(_VOR + r"re_[A-Za-z0-9_]{16,}")),
    ("Composio-Schlüssel", re.compile(_VOR + r"ck_[A-Za-z0-9_\-]{8,}")),
    ("Slack-Token", re.compile(_VOR + r"xox[abposr]-[A-Za-z0-9\-]{10,}")),
    ("Slack-Webhook", re.compile(r"hooks\.slack\.com/services/[A-Za-z0-9/]{8,}")),
    ("AWS-Zugangskennung", re.compile(_VOR + r"(?:AKIA|ASIA)[0-9A-Z]{16}")),
    ("JWT", re.compile(_VOR + r"eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}")),
    ("privater Schlüssel", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("Bearer-Wert", re.compile(r"\bBearer\s+[A-Za-z0-9_\-.=+/]{20,}")),
    ("Zugangsdaten in Adresse", re.compile(r"[a-z][a-z0-9+.\-]*://[^\s/:@`]+:[^\s/@`]+@")),
)
HEX_FOLGE = re.compile(r"(?<![0-9A-Za-z])[0-9a-fA-F]{32,}(?![0-9A-Za-z])")
ZUFALLSFOLGE = re.compile(r"(?<![A-Za-z0-9+_=])[A-Za-z0-9+_=]{32,}(?![A-Za-z0-9+_=])")


class RegisterError(ValueError):
    pass


def find_secrets(text: str) -> list[str]:
    """Liefert je Fund eine Beschreibung ohne den Wert (nur Art, Zeile, Länge)."""
    hits: list[str] = []
    seen: set[tuple[int, int]] = set()

    def add(kind: str, match: re.Match) -> None:
        value = match.group(0)
        if value in ERLAUBTE_KENNUNGEN or (match.start(), match.end()) in seen:
            return
        seen.add((match.start(), match.end()))
        line = text.count("\n", 0, match.start()) + 1
        hits.append(f"Zeile {line}: {kind} ({len(value)} Zeichen)")

    for kind, pattern in GEHEIMNIS_MUSTER:
        for match in pattern.finditer(text):
            add(kind, match)
    for match in HEX_FOLGE.finditer(text):
        add("Hex-Folge ab 32 Zeichen", match)
    for match in ZUFALLSFOLGE.finditer(text):
        value = match.group(0)
        if re.search(r"[0-9]", value) and re.search(r"[a-z]", value) and re.search(r"[A-Z]", value):
            add("lange Zufallsfolge", match)
    return hits


def _text(value, where: str, errors: list[str], minimum: int = 3) -> None:
    if not isinstance(value, str) or len(value.strip()) < minimum:
        errors.append(f"{where}: Text fehlt oder ist zu kurz")


def validate(data) -> list[str]:
    """Schema, eindeutige Kennungen, Pflichtangaben. Gibt Fehlertexte zurück."""
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["Register ist kein Objekt"]
    if set(data) != TOP_KEYS:
        errors.append(f"Kopf: Schlüssel weichen ab: {sorted(set(data) ^ TOP_KEYS)}")
    if data.get("schema_version") != 1:
        errors.append("Kopf: schema_version muss 1 sein")
    if not DATUM.match(str(data.get("stand", ""))):
        errors.append("Kopf: stand muss JJJJ-MM-TT sein")
    _text(data.get("hinweis"), "Kopf.hinweis", errors, 20)
    stores = data.get("geheimnisspeicher")
    if not isinstance(stores, list) or not stores or not all(isinstance(x, str) and x.strip() for x in stores):
        errors.append("Kopf: geheimnisspeicher muss eine nicht leere Liste von Texten sein")
    items = data.get("loesungen")
    if not isinstance(items, list) or not items:
        return errors + ["loesungen fehlt oder ist leer"]

    ids: list[str] = []
    for number, item in enumerate(items, 1):
        if not isinstance(item, dict):
            errors.append(f"Lösung {number}: kein Objekt")
            continue
        where = str(item.get("id") or f"Lösung {number}")
        if set(item) != LOESUNG_KEYS:
            errors.append(f"{where}: Schlüssel weichen ab: {sorted(set(item) ^ LOESUNG_KEYS)}")
        if not isinstance(item.get("id"), str) or not ID_FORM.match(item["id"]):
            errors.append(f"{where}: id muss klein, mit Ziffern und Bindestrichen geschrieben sein")
        else:
            ids.append(item["id"])
        for key in ("name", "kategorie"):
            _text(item.get(key), f"{where}.{key}", errors, 2)
        for key in ("zweck", "ort", "wann_nutzen", "nicht_nutzen_fuer"):
            _text(item.get(key), f"{where}.{key}", errors, 10)

        tags = item.get("tags")
        if not isinstance(tags, list) or len(tags) < 2:
            errors.append(f"{where}: mindestens zwei Tags nötig")
        else:
            if len(set(tags)) != len(tags):
                errors.append(f"{where}: Tag doppelt")
            for tag in tags:
                if not isinstance(tag, str) or not TAG_FORM.match(tag):
                    errors.append(f"{where}: Tag {tag!r} ist nicht klein geschrieben oder enthält unzulässige Zeichen")
                elif tag.startswith("kunde:") and not KUNDE_TAG.match(tag):
                    errors.append(f"{where}: Kunden-Tag {tag!r} darf nur ein Kürzel tragen")

        zustand = item.get("zustand")
        if not isinstance(zustand, dict) or set(zustand) != ZUSTAND_KEYS:
            errors.append(f"{where}.zustand: braucht genau status, beleg, stand")
        else:
            if zustand["status"] not in ZUSTAENDE:
                errors.append(f"{where}.zustand.status: {zustand['status']!r} ist kein zulässiger Zustand")
            _text(zustand["beleg"], f"{where}.zustand.beleg", errors, 10)
            if not DATUM.match(str(zustand["stand"])):
                errors.append(f"{where}.zustand.stand: Datum JJJJ-MM-TT nötig")
            for ref in BELEG_DATEI.findall(str(zustand["beleg"])):
                if not (ROOT / ref).is_file():
                    errors.append(f"{where}.zustand.beleg: Datei {ref} gibt es nicht")

        if not isinstance(item.get("entscheidung"), str) or not ENTSCHEIDUNG.match(item["entscheidung"]):
            errors.append(f"{where}.entscheidung: D-Nummer(n) oder „keine“, Zusatz nur in Klammern")

        rolle = item.get("rolle_im_plan")
        if not isinstance(rolle, dict) or not set(rolle) <= ROLLE_KEYS or "art" not in rolle:
            errors.append(f"{where}.rolle_im_plan: braucht art, dazu höchstens bleibt, frage, hinweis")
        else:
            if rolle["art"] not in ROLLEN:
                errors.append(f"{where}.rolle_im_plan.art: {rolle['art']!r} ist keine zulässige Rolle")
            if rolle["art"] == "doppelt":
                _text(rolle.get("bleibt"), f"{where}.rolle_im_plan.bleibt (was bleibt)", errors)
            if rolle["art"] == "unklar":
                _text(rolle.get("frage"), f"{where}.rolle_im_plan.frage", errors, 10)
            for key in ("bleibt", "frage", "hinweis"):
                if key in rolle:
                    _text(rolle[key], f"{where}.rolle_im_plan.{key}", errors)

        zugaenge = item.get("zugaenge")
        if not isinstance(zugaenge, list):
            errors.append(f"{where}.zugaenge: Liste nötig (leer, wenn es keinen Zugang gibt)")
        else:
            for index, zugang in enumerate(zugaenge, 1):
                spot = f"{where}.zugaenge[{index}]"
                if not isinstance(zugang, dict) or not ZUGANG_PFLICHT <= set(zugang) or not set(zugang) <= ZUGANG_KEYS:
                    errors.append(f"{spot}: Felder weichen ab (zulässig: {sorted(ZUGANG_KEYS)}); ein Feld für den Wert gibt es nicht")
                    continue
                for key in ("bezeichnung", "art", "ablageort", "rechteumfang", "erstellt"):
                    _text(zugang[key], f"{spot}.{key}", errors, 2)
                for key in ("offengelegt", "erneuerung_faellig"):
                    if not isinstance(zugang[key], bool):
                        errors.append(f"{spot}.{key}: ja/nein als true/false")
                if zugang["offengelegt"] is True and zugang["erneuerung_faellig"] is not True:
                    errors.append(f"{spot}: offengelegter Zugang ohne fällige Erneuerung")

        deps = item.get("abhaengigkeiten")
        if not isinstance(deps, list) or not all(isinstance(x, str) and x.strip() for x in deps):
            errors.append(f"{where}.abhaengigkeiten: Liste von Texten nötig")

    for duplicate in sorted({x for x in ids if ids.count(x) > 1}):
        errors.append(f"Kennung doppelt: {duplicate}")
    known = set(ids)
    for item in items:
        if isinstance(item, dict) and isinstance(item.get("abhaengigkeiten"), list):
            for dep in item["abhaengigkeiten"]:
                if isinstance(dep, str) and ID_FORM.match(dep) and dep not in known:
                    errors.append(f"{item.get('id')}: Abhängigkeit {dep} ist keine Kennung im Register")
    return errors


def _cell(value) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def _ja(value: bool) -> str:
    return "ja" if value else "nein"


def _rolle(rolle: dict) -> str:
    text = rolle["art"]
    if rolle.get("bleibt"):
        text += f" → bleibt: {rolle['bleibt']}"
    if rolle.get("frage"):
        text += f" → Frage: {rolle['frage']}"
    if rolle.get("hinweis"):
        text += f" ({rolle['hinweis']})"
    return text


def render_markdown(data: dict) -> str:
    """Erzeugt die lesbare Fassung deterministisch aus der JSON-Quelle."""
    items = data["loesungen"]
    out: list[str] = []
    out.append("# Lösungs- und Zugangsregister · Stand " + data["stand"])
    out.append("")
    out.append(
        "<!-- Erzeugt aus config/loesungsregister.json mit `python3 tools/check_loesungsregister.py --write-md`. "
        "Nicht von Hand ändern: die Prüfung vergleicht diese Datei mit der Quelle. -->"
    )
    out.append("")
    out.append(data["hinweis"])
    out.append("")
    out.append("**Dieses Register enthält keinen Geheimniswert.** Werte liegen ausschließlich hier:")
    out.append("")
    out.extend(f"- {store}" for store in data["geheimnisspeicher"])
    out.append("")
    out.append(
        "Vorgehen, Pflege und Umgang mit Schlüsseln aus dem Chat: `.claude/skills/nexify-loesungsregister/SKILL.md`. "
        "Prüfung: `python3 tools/check_loesungsregister.py` (Teil von `make governance-check`)."
    )
    out.append("")

    out.append("## Zählung")
    out.append("")
    out.append("| Zustand | Anzahl |")
    out.append("|---|---|")
    for status in ZUSTAENDE:
        out.append(f"| {status} | {sum(1 for x in items if x['zustand']['status'] == status)} |")
    out.append(f"| **gesamt** | **{len(items)}** |")
    out.append("")
    out.append("| Rolle im Plan | Anzahl |")
    out.append("|---|---|")
    for art in ROLLEN:
        out.append(f"| {art} | {sum(1 for x in items if x['rolle_im_plan']['art'] == art)} |")
    out.append("")

    out.append("## Übersicht")
    out.append("")
    out.append("| Kennung | Lösung | Kategorie | Zustand | Rolle im Plan | Entscheidung | Tags |")
    out.append("|---|---|---|---|---|---|---|")
    for item in items:
        out.append(
            "| `{id}` | {name} | {kat} | {zustand} | {rolle} | {ent} | {tags} |".format(
                id=item["id"], name=_cell(item["name"]), kat=_cell(item["kategorie"]),
                zustand=item["zustand"]["status"], rolle=_cell(item["rolle_im_plan"]["art"]),
                ent=_cell(item["entscheidung"]), tags=" ".join(f"`{t}`" for t in item["tags"]),
            )
        )
    out.append("")

    out.append("## Zugänge mit fälliger Erneuerung")
    out.append("")
    due = [(x, z) for x in items for z in x["zugaenge"] if z["erneuerung_faellig"]]
    if due:
        out.append("| Lösung | Bezeichnung | Art | Ablageort des Werts | offengelegt | Hinweis |")
        out.append("|---|---|---|---|---|---|")
        for item, zugang in due:
            out.append(
                f"| `{item['id']}` | {_cell(zugang['bezeichnung'])} | {_cell(zugang['art'])} | "
                f"{_cell(zugang['ablageort'])} | {_ja(zugang['offengelegt'])} | {_cell(zugang.get('hinweis', '–'))} |"
            )
    else:
        out.append("Keine.")
    out.append("")

    out.append("## Offene Fragen an den Inhaber")
    out.append("")
    for item in items:
        if item["rolle_im_plan"]["art"] == "unklar":
            out.append(f"- `{item['id']}` ({_cell(item['name'])}): {item['rolle_im_plan']['frage']}")
    out.append("")

    out.append("## Lösungen im Einzelnen")
    for item in items:
        out.append("")
        out.append(f"### {item['name']} · `{item['id']}`")
        out.append("")
        out.append("- **Tags:** " + " ".join(f"`{t}`" for t in item["tags"]))
        out.append(f"- **Kategorie:** {item['kategorie']}")
        out.append(f"- **Zweck:** {item['zweck']}")
        out.append(f"- **Ort:** {item['ort']}")
        out.append(
            f"- **Zustand:** {item['zustand']['status']} (Stand {item['zustand']['stand']}). Beleg: {item['zustand']['beleg']}"
        )
        out.append(f"- **Entscheidung:** {item['entscheidung']}")
        out.append(f"- **Rolle im Plan:** {_rolle(item['rolle_im_plan'])}")
        out.append(f"- **Wann nutzen:** {item['wann_nutzen']}")
        out.append(f"- **Nicht nutzen für:** {item['nicht_nutzen_fuer']}")
        deps = item["abhaengigkeiten"]
        out.append("- **Abhängigkeiten:** " + (", ".join(f"`{d}`" if ID_FORM.match(d) else d for d in deps) if deps else "keine"))
        if item["zugaenge"]:
            out.append("")
            out.append("| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |")
            out.append("|---|---|---|---|---|---|---|---|")
            for zugang in item["zugaenge"]:
                out.append(
                    f"| {_cell(zugang['bezeichnung'])} | {_cell(zugang['art'])} | {_cell(zugang['ablageort'])} | "
                    f"{_cell(zugang['rechteumfang'])} | {_cell(zugang['erstellt'])} | {_ja(zugang['offengelegt'])} | "
                    f"{_ja(zugang['erneuerung_faellig'])} | {_cell(zugang.get('hinweis', '–'))} |"
                )
        else:
            out.append("- **Zugänge:** keine erfasst")
    return "\n".join(out) + "\n"


def load(root: Path = ROOT) -> dict:
    path = root / REGISTER
    if not path.is_file():
        raise RegisterError(f"{REGISTER} fehlt")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RegisterError(f"{REGISTER} ist kein gültiges JSON: {exc}") from exc


def check(root: Path = ROOT) -> list[str]:
    errors: list[str] = []
    try:
        data = load(root)
    except RegisterError as exc:
        return [str(exc)]
    errors.extend(validate(data))
    if not errors:
        markdown = root / MARKDOWN
        if not markdown.is_file():
            errors.append(f"{MARKDOWN} fehlt (erzeugen mit --write-md)")
        elif markdown.read_text(encoding="utf-8") != render_markdown(data):
            errors.append(f"{MARKDOWN} weicht von {REGISTER} ab (neu erzeugen mit --write-md)")
    for name in SCANNED:
        path = root / name
        if not path.is_file():
            errors.append(f"{name} fehlt")
            continue
        for hit in find_secrets(path.read_text(encoding="utf-8")):
            errors.append(f"{name}: möglicher Geheimniswert – {hit}")
    return errors


def main(argv: list[str]) -> int:
    if argv == ["--write-md"]:
        try:
            data = load()
        except RegisterError as exc:
            print(f"FEHLER: {exc}")
            return 1
        errors = validate(data)
        if errors:
            for error in errors:
                print(f"FEHLER: {error}")
            return 1
        (ROOT / MARKDOWN).write_text(render_markdown(data), encoding="utf-8")
        print(f"{MARKDOWN} geschrieben ({len(data['loesungen'])} Lösungen)")
        return 0
    if argv:
        print(__doc__)
        return 2
    errors = check()
    if errors:
        for error in errors:
            print(f"FEHLER: {error}")
        print(f"loesungsregister: {len(errors)} Befund(e)")
        return 1
    data = load()
    zugaenge = sum(len(x["zugaenge"]) for x in data["loesungen"])
    print(
        f"loesungsregister: {len(data['loesungen'])} Lösungen, {zugaenge} Zugänge, "
        f"{len(SCANNED)} Dateien ohne Geheimniswert, lesbare Fassung stimmt überein"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
