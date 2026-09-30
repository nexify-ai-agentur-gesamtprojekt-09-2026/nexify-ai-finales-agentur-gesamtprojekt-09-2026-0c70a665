# ADR-0005 · Kein verteiltes Training für Stufe-0-Adapter

**Status:** vorgeschlagen · **Datum:** 28.09.2026 · **Umkehrbarkeit:** hoch (Schwellen in `config/lernen.json → training.verteilung`)

## 1 · Kontext
| Faktor | Befund |
|---|---|
| Was trainiert wird | LoRA/QLoRA-Adapter (SFT, danach DPO) je Bereich auf einem Basismodell, frühestens ab 500 Paaren (`config/lernen.json`) |
| Hardware | kein GPU-Knoten (Annahme A-04); Entscheidung offen |
| Team | eine Person + Agenten; kein Cluster-Betrieb |
| Fachlage | Sharding (ZeRO, FSDP) und Tensor-/Pipeline-Parallelismus lösen Speicherprobleme bei Modellen, die nicht auf eine GPU passen; bei Modellen, die passen, kostet es nur Kommunikation. Tensor-Parallel gehört auf NVLink innerhalb eines Knotens, Multi-Node braucht praktisch InfiniBand. |

## 2 · Optionen
| | A · 1 GPU, QLoRA, kein Sharding | B · FSDP2 auf mehreren GPUs | C · DeepSpeed/Megatron-Cluster |
|---|---|---|---|
| Pro | einfach, billig, Adapter in Minuten bis Stunden | trägt größere Basismodelle | beliebige Größe |
| Contra | Basismodell bis ca. 14B | Mehrkosten ohne belegten Bedarf | Betrieb übersteigt Teamgröße; kein Geschäftsfall |

## 3 · Entscheidung
**A.** Erst wenn eine Schwelle aus `training.verteilung.schwellen` belegt erreicht ist, wird B geprüft (neue ADR). C ist ausgeschlossen.

## 4 · Folgen
Kein DeepSpeed, kein Megatron im Stack. Training läuft als Worker-Auftrag `lernen` auf dem GPU-Knoten, sobald beschlossen; Ergebnis geht über `promotion()` und `rollout()` (Canary 5 → 25 → 100 %).

## 5 · Nachtrag 28.09.2026 · MoE-Training und verteiltes RLHF
- **MoE-Training** (Skill mixture-of-experts-training-routing): nicht einschlägig. Wir trainieren Adapter auf einem fertigen Basismodell, keine Router. Ein MoE-Basismodell (z. B. Mixtral-Klasse) wäre zulässig; dann gilt: Speicher nach Gesamtparametern planen, nicht nach aktiven; LoRA nur auf Attention-Schichten, Router einfrieren.
- **Verteiltes RLHF** (Skill llm-rlhf-verteiltes-training: OpenRLHF, verl, slime, miles, torchforge): nicht einschlägig unter 30B und ohne eigenen Rollout-Cluster. Für DPO auf Präferenzpaaren reicht TRL auf einer GPU. Schwelle für eine neue ADR: Präferenztraining auf einem Basismodell ≥ 30B oder GRPO mit eigener Rollout-Engine.
