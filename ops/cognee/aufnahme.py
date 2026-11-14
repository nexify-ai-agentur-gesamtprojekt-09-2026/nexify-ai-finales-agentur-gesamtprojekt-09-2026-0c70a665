#!/usr/bin/env python3
"""Aufnahme-Werkzeug: Agenturwissen aus diesem Repository in Cognee aufnehmen.

  python3 ops/cognee/aufnahme.py plan      Plan zeigen (ohne Netz, Standard)
  python3 ops/cognee/aufnahme.py senden    aufnehmen (nur mit Schaltern und Freigabe)
  python3 ops/cognee/aufnahme.py zustand   Erreichbarkeit lesen (nur mit Schalter)

Welche Dateien in welchen Datensatz gehen, steht in ``config/integrations/cognee.json``
(``quellen.aufnehmen``); ``quellen.nie_aufnehmen`` gewinnt immer. Ein Geheimnis-Muster in
irgendeiner Datei bricht den ganzen Lauf ab, bevor etwas gesendet wird. Gemeldet werden
Pfad, Größe und Prüfsumme, nie Inhalt. Der Graphbau (Modellkosten) gehört nicht zu
diesem Werkzeug.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import cognee_client as cc  # noqa: E402


def build_plan(root: Path, config: dict) -> dict:
    """Liest nur Dateien aus der Positivliste. Kein Netz."""
    quellen = config.get("quellen", {})
    limits = config.get("grenzen", {})
    never = quellen.get("nie_aufnehmen", [])
    max_bytes = int(limits.get("max_bytes_je_datei", 0))
    items, skipped, findings, seen = [], [], [], set()
    for rule in quellen.get("aufnehmen", []):
        for path in sorted(root.glob(rule["muster"])):
            relative = path.relative_to(root).as_posix()
            if relative in seen or not path.is_file() or path.is_symlink():
                continue
            seen.add(relative)
            if cc.excluded(relative, never):
                skipped.append({"pfad": relative, "grund": "nie_aufnehmen"})
                continue
            content = path.read_bytes()
            if not content or (max_bytes and len(content) > max_bytes):
                skipped.append({"pfad": relative, "grund": "leer_oder_zu_gross", "bytes": len(content)})
                continue
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                skipped.append({"pfad": relative, "grund": "kein_utf8"})
                continue
            hits = cc.find_secrets(text)
            if hits:
                findings.append({"pfad": relative, "funde": hits})
                continue
            items.append({"pfad": relative, "datensatz": rule["datensatz"], "bytes": len(content),
                          "sha256": hashlib.sha256(content).hexdigest(),
                          "dokument": cc.document_name(relative, content)})
    max_files = int(limits.get("max_dateien_je_lauf", 0))
    status = "plan"
    if findings:
        status = "geheimnis_gefunden"
    elif max_files and len(items) > max_files:
        status = "zu_viele_dateien"
    return {"status": status, "dateien": items, "ausgelassen": skipped, "geheimnis_funde": findings,
            "summe_bytes": sum(i["bytes"] for i in items), "grenze_dateien": max_files}


def send(root: Path, env, *, config=None, transport=None, sleep=None) -> dict:
    config = config if config is not None else cc.load_config()
    kwargs = {"config": config, "transport": transport}
    if sleep is not None:
        kwargs["sleep"] = sleep
    client = cc.CogneeClient(env, **kwargs)
    # Reihenfolge: erst Schalter, dann Plan lesen, dann senden. Ohne Schalter wird nicht einmal geplant gesendet.
    if not client.settings.enabled or not client.settings.ingest_enabled:
        return {"status": "aus", "gesendet": False,
                "grund": "COGNEE_ENABLED und COGNEE_INGEST_ENABLED müssen beide 1 sein"}
    plan = build_plan(root, config)
    if plan["status"] != "plan":
        return {"status": plan["status"], "gesendet": False,
                "geheimnis_funde": plan["geheimnis_funde"], "dateien": len(plan["dateien"])}
    results = []
    for item in plan["dateien"]:
        try:
            result = client.add_document(item["datensatz"], item["pfad"], (root / item["pfad"]).read_bytes())
        except cc.Abbruch as stop:
            # Ein Abbruch gilt für den ganzen Lauf: nichts Weiteres senden.
            return {**stop.als_ergebnis(), "gesendet": bool(results), "ergebnisse": results,
                    "abbruch_bei": item["pfad"]}
        result.pop("daten", None)
        results.append({"pfad": item["pfad"], **result})
        if result["status"] not in ("ok", "konflikt"):
            return {"status": "abgebrochen", "gesendet": True, "ergebnisse": results,
                    "abbruch_bei": item["pfad"]}
    return {"status": "ok", "gesendet": True, "ergebnisse": results, "netzaufrufe": client.calls}


def main(argv, env=os.environ) -> int:
    command = argv[1] if len(argv) > 1 else "plan"
    config = cc.load_config()
    if command == "plan":
        result = build_plan(cc.ROOT, config)
    elif command == "senden":
        result = send(cc.ROOT, env, config=config)
    elif command == "zustand":
        try:
            result = cc.CogneeClient(env, config=config).health()
        except cc.Abbruch as stop:
            result = stop.als_ergebnis()
    else:
        print(__doc__)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=1))
    return 0 if result["status"] in ("plan", "ok", "aus") else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
