# M-10 · Backup/Restore-Test · Nachweis

**Zeit:** 2026-09-30T10:34:00Z · **Umgebung:** DUS

## Ergebnis

| Prüfung | Wert |
|---|---|
| Backup erzeugt (`node tools/backup.mjs`) | `nexify-2026-09-30T10-33-56.tar.gz`, 1,8 MB |
| Einträge im Archiv | 427 |
| Restore-Test (tar -xzf in Temp) | erfolgreich |
| Inhalt verifiziert | `config/design-tokens.json` enthält `#D7FA50` (4×) |
| Rotation | keep 7 (`backup.mjs`) |

## Ablauf

```bash
cd /opt/ai-stack/design_handoff_nexify_gesamtloesung
node tools/backup.mjs
tar -tzf /opt/nexifyai/backup/nexify/nexify-*.tar.gz | wc -l
tar -xzf /opt/nexifyai/backup/nexify/nexify-*.tar.gz -C /tmp/…   # Restore-Test
```

## Kernaussage

Sicherung läuft, Restore ist erprobt, Rotation vorhanden. Jeff-Verify (`tools/jeff-backup.mjs`)
ist im Backup-Werkzeug eingebunden.
