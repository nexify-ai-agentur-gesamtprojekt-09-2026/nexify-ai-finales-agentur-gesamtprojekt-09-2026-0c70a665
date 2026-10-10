# Lean GitLab-Factory-Adapter

Zweck: durchgaengiger, nichtdestruktiver Entwicklungsablauf auf dem eigenen GitLab,
solange kein externer Factory-Worker (Paperclip/NeX) real vorhanden ist.

## Ablauf
1. Auftrag entgegennehmen (Titel + Aenderung).
2. Isolierten Branch `factory/<slug>-<ts>` vom Basisbranch (`main`) ablegen.
3. Aenderung als Commit auf den Branch schreiben.
4. Merge Request gegen `main` oeffnen (`remove_source_branch: false`).
5. CI-Pipeline des MR abwarten und Ergebnis melden.

## Nichtdestruktiv
Kein Force-Push, keine Ref-Loeschung, kein Branch-Delete. `main` ist geschuetzt
(kein Force, Merge nur bei gruener Pipeline und aufgeloesten Diskussionen).

## Aufruf
```
GITLAB_TOKEN=... node tools/factory-adapter.mjs \
  --task "Kurztitel" --file docs/beispiel.md --content-file ./beispiel.md
```

## Status
Erster realer E2E-Nachweis: MR angelegt, Pipeline gruen (siehe Beleg unter
`/root/belege/duesseldorf-estate-recovery-20261010T1510Z/EVIDENCE.md`).
