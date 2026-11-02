#!/usr/bin/env python3
"""Jeff-Gate für CI: NeXify-Orakel (Jev) direkt, ohne nx-jeff-Abhängigkeit.

ENV: NX_ORAKEL_ENDPOINT, NX_ORAKEL_MODEL, NX_ORAKEL_KEY.
Exit: 0 = go, 1 = rueckfrage/no_go, 2 = Eingabefehler, 3 = Orakel nicht erreichbar.
"""
import argparse, json, os, sys, urllib.request, urllib.error

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--was", required=True)
    p.add_argument("--risiko", required=True)
    p.add_argument("--rollback", required=True)
    p.add_argument("--max-risiko", type=float, default=6.0)
    a = p.parse_args()

    endpoint = os.environ.get("NX_ORAKEL_ENDPOINT")
    model = os.environ.get("NX_ORAKEL_MODEL", "openrouter/typesafe/jev-1.13")
    key = os.environ.get("NX_ORAKEL_KEY")
    if not endpoint or not key:
        print(json.dumps({"verfuegbar": False, "entscheidung": "rueckfrage", "grund": "NX_ORAKEL_ENDPOINT/NX_ORAKEL_KEY fehlt"}))
        return 3

    body = json.dumps({
        "model": model,
        "state": {"aenderung": a.was, "risiko_beschreibung": a.risiko, "rollback": a.rollback},
        "questions": {
            "entscheidung": {"type": "choice", "instructions": "Soll die Änderung jetzt ausgeführt werden?",
                             "criteria": {"go": "go: ausführen", "no_go": "no_go: nicht ausführen", "rueckfrage": "rueckfrage: Betreiber fragen"}},
            "risiko": {"type": "score", "instructions": "Betriebsrisiko der Änderung", "criteria": ["0 = kein Risiko", "10 = Totalausfall"]},
            "reversibel": {"type": "noul", "instructions": "Ist die Änderung mit dem genannten Rollback vollständig rückgängig?"},
        },
    }).encode()
    req = urllib.request.Request(endpoint, data=body, method="POST",
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + key})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            out = json.loads(r.read()); http = r.status
    except urllib.error.HTTPError as e:
        out = {"error": e.read().decode(errors="replace")[:400]}; http = e.code
    except Exception as e:
        out = {"error": str(e)}; http = 0

    if http != 200 or "answers" not in out:
        print(json.dumps({"verfuegbar": False, "http": http, "entscheidung": "rueckfrage", "fehler": out.get("error")}))
        return 3
    ans = out["answers"]
    ent = ans["entscheidung"]["choice"]; conf = ans["entscheidung"].get("confidence", 0)
    risk = round(float(ans["risiko"]["score"]) * 10, 1)
    final = ent if (ent != "go" or (conf >= 0.6 and risk <= a.max_risiko)) else "rueckfrage"
    print(json.dumps({"verfuegbar": True, "entscheidung": final, "konfidenz": conf, "risiko_0_10": risk}))
    return 0 if final == "go" else 1

if __name__ == "__main__":
    sys.exit(main())
