# Factory-Betrieb (server-seitig)

Der Factory-Intake laeuft als systemd-Dienst/Timer auf srv1941843 und ist unabhaengig
von Chat oder Mac:

- Unit: nexify-factory-intake.service (oneshot), Timer: nexify-factory-intake.timer (alle 10 min, Persistent).
- Aktion: liest GitLab-Issues mit Label factory-task, fuehrt den Adapter aus, schreibt Ergebnis zurueck, schliesst bei Merge.
- Token: aus OpenBao (nexify/data/gitlab), kein Klartext-Secret im Dienst.
- Nachweis: systemctl status nexify-factory-intake.service; journalctl -u nexify-factory-intake.service.
