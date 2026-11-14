"""Policy-Prüfer: lässt nur Modell-Ports zu, die `config/llm-policy.json` entsprechen.

Die erlaubte Kennung und Denkstufe stehen ausschließlich in der Policy-Datei;
dieses Modul enthält keine Modellkennung. Abweichung heißt Verweigerung – es
gibt keinen stillen Ersatz, keine Normalisierung und keinen Rückfall.

Geprüft wird an drei Stellen:
1. `zulassen(port)`: Selbstauskunft des Ports (Kennung, Denkstufe, kein stiller Ersatz).
2. bei jedem Aufruf: Die Selbstauskunft darf sich nicht geändert haben, und die
   Antwort muss melden, dass genau das Policy-Modell bedient hat.
3. `pruefe_anfrage(anfrage)`: die fertige, serialisierbare Anfrage an den Router
   (Gegenstück zur Prüfung in packages/agent-runtime/model-agent.ts). Die genaue
   Draht-Form des Routers ist noch nicht belegt; siehe Architektur-Notiz.

Dieses Modul ruft kein Modell auf und liest keine Zugangsdaten.
"""
from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Mapping

from .ports import Laufsicht, ModellPort, Modellantwort, Modellbindung
from .typen import KernFehler

_VERBOTENE_FELDER = frozenset({"models", "fallbacks", "fallback", "fallback_model", "fallback_models",
                               "model_fallbacks", "route"})
_SIEGEL = object()


class PolicyFehler(KernFehler):
    """Modell-Port, Anfrage oder Policy-Datei entsprechen nicht der Vorgabe."""


@dataclass(frozen=True, slots=True)
class Modellvorgabe:
    kennung: str
    reasoning_effort: str


def _vorgabe(roh: object) -> Modellvorgabe:
    if (not isinstance(roh, Mapping) or type(roh.get("id")) is not str or not roh["id"].strip()
            or roh["id"] != roh["id"].strip() or type(roh.get("reasoning_effort")) is not str
            or not roh["reasoning_effort"]):
        raise PolicyFehler("policy_nicht_unterstuetzt")
    return Modellvorgabe(roh["id"], roh["reasoning_effort"])


class ModellPolicy:
    """Eingelesene Policy. Unbekannte oder gelockerte Policy-Formen werden abgelehnt."""

    def __init__(self, daten: Mapping[str, object]) -> None:
        if not isinstance(daten, Mapping) or type(daten.get("schema_version")) is not int \
                or daten["schema_version"] != 1:
            raise PolicyFehler("policy_nicht_unterstuetzt")
        modell = daten.get("model")
        self.__standard = _vorgabe(modell)
        endung = modell.get("required_suffix")
        if type(endung) is not str or not endung or not self.__standard.kennung.endswith(endung):
            raise PolicyFehler("policy_nicht_unterstuetzt")
        routing = daten.get("routing")
        if (not isinstance(routing, Mapping)
                or routing.get("silent_model_fallback") is not False
                or routing.get("silent_reasoning_downgrade") is not False
                or routing.get("automatic_tier_escalation_or_substitution") is not False
                or routing.get("unsupported_capability") != "deny_instead_of_substituting_a_model"
                or routing.get("final_serialized_provider_request_must_match_policy") is not True):
            raise PolicyFehler("policy_erlaubt_ersatz_und_wird_nicht_unterstuetzt")
        faelle: dict[str, Modellvorgabe] = {}
        benannt = daten.get("use_cases", {})
        if not isinstance(benannt, Mapping):
            raise PolicyFehler("policy_nicht_unterstuetzt")
        for name, fall in benannt.items():
            if not isinstance(fall, Mapping) or fall.get("silent_model_fallback") is not False:
                raise PolicyFehler("policy_erlaubt_ersatz_und_wird_nicht_unterstuetzt")
            faelle[name] = _vorgabe(fall.get("model"))
        self.__faelle = faelle

    @classmethod
    def aus_datei(cls, pfad: Path | str) -> "ModellPolicy":
        try:
            daten = json.loads(Path(pfad).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            raise PolicyFehler("policy_nicht_lesbar") from None
        return cls(daten)

    def vorgabe(self, anwendungsfall: str | None = None) -> Modellvorgabe:
        """Standardvorgabe oder die eines in der Policy BENANNTEN Anwendungsfalls."""
        if anwendungsfall is None:
            return self.__standard
        if type(anwendungsfall) is not str or anwendungsfall not in self.__faelle:
            raise PolicyFehler("anwendungsfall_nicht_in_policy")
        return self.__faelle[anwendungsfall]

    # ---- Prüfungen -------------------------------------------------------------------

    def pruefe_bindung(self, bindung: object, *, anwendungsfall: str | None = None,
                       stellvertreter_erlaubt: bool = False) -> Modellbindung:
        if type(bindung) is not Modellbindung:
            raise PolicyFehler("modellbindung_fehlt")
        if bindung.ist_stellvertreter is not False:
            # Ein Stellvertreter ist nie policy-konform; er ist nur für Tests und nur ausdrücklich zulässig.
            if bindung.ist_stellvertreter is True and stellvertreter_erlaubt is True:
                return bindung
            raise PolicyFehler("stellvertreter_nicht_zugelassen")
        soll = self.vorgabe(anwendungsfall)
        if type(bindung.kennung) is not str or bindung.kennung != soll.kennung:
            raise PolicyFehler("modellkennung_entspricht_nicht_der_policy")
        if bindung.reasoning_effort != soll.reasoning_effort:
            raise PolicyFehler("reasoning_entspricht_nicht_der_policy")
        if bindung.stiller_ersatz is not False:
            raise PolicyFehler("stiller_ersatz_ist_verboten")
        if type(bindung.route) is not str or not bindung.route:
            raise PolicyFehler("route_fehlt")
        return bindung

    def pruefe_anfrage(self, anfrage: object, *, anwendungsfall: str | None = None) -> None:
        """Prüft die fertige Anfrage, wie sie den eigenen Prozess verlassen würde."""
        soll = self.vorgabe(anwendungsfall)
        if not isinstance(anfrage, Mapping):
            raise PolicyFehler("anfrage_ungueltig")
        if anfrage.get("model") != soll.kennung:
            raise PolicyFehler("modellkennung_entspricht_nicht_der_policy")
        if _VERBOTENE_FELDER & set(anfrage):
            raise PolicyFehler("ersatzmodelle_in_anfrage_verboten")
        stufen = []
        if "reasoning" in anfrage:
            reasoning = anfrage["reasoning"]
            stufen.append(reasoning.get("effort") if isinstance(reasoning, Mapping) and set(reasoning) == {"effort"}
                          else None)
        if "reasoning_effort" in anfrage:
            stufen.append(anfrage["reasoning_effort"])
        if not stufen or any(stufe != soll.reasoning_effort for stufe in stufen):
            raise PolicyFehler("reasoning_entspricht_nicht_der_policy")
        if "provider" in anfrage:
            anbieter = anfrage["provider"]
            if (not isinstance(anbieter, Mapping) or anbieter.get("allow_fallbacks") is not False
                    or _VERBOTENE_FELDER & set(anbieter)):
                raise PolicyFehler("anbieter_ersatz_in_anfrage_verboten")

    def zulassen(self, port: object, *, anwendungsfall: str | None = None,
                 stellvertreter_erlaubt: bool = False) -> "ZugelassenerModellPort":
        """Einzige Tür zur Laufzeit: gibt den geprüften, versiegelten Port zurück."""
        if not isinstance(port, ModellPort) or isinstance(port, ZugelassenerModellPort):
            raise PolicyFehler("modell_port_fehlt")
        bindung = self.pruefe_bindung(port.bindung(), anwendungsfall=anwendungsfall,
                                      stellvertreter_erlaubt=stellvertreter_erlaubt)
        return ZugelassenerModellPort(_SIEGEL, port, bindung)


class ZugelassenerModellPort:
    """Von der Policy zugelassener Port. Entsteht nur über `ModellPolicy.zulassen`."""

    def __init__(self, siegel: object, port: ModellPort, bindung: Modellbindung) -> None:
        if siegel is not _SIEGEL:
            raise PolicyFehler("zulassung_nur_ueber_policy")
        self.__port, self.__bindung = port, bindung

    def bindung(self) -> Modellbindung:
        return self.__bindung

    def entscheiden(self, sicht: Laufsicht) -> Modellantwort:
        if self.__port.bindung() != self.__bindung:
            raise PolicyFehler("modellbindung_nach_zulassung_geaendert")
        antwort = self.__port.entscheiden(sicht)
        if self.__port.bindung() != self.__bindung:
            raise PolicyFehler("modellbindung_nach_zulassung_geaendert")
        if not self.__bindung.ist_stellvertreter:
            # Ein Ersatz durch den Anbieter zeigt sich im bedienenden Modell der Antwort.
            if type(antwort) is not Modellantwort or antwort.bedient_von != self.__bindung.kennung:
                raise PolicyFehler("antwort_nicht_vom_policy_modell")
        return antwort
