"""Switches. Default is OFF: only the exact value "on" enables anything, and a feature additionally
needs the master switch. A typo, an empty value or a missing variable therefore keeps today's behaviour."""
from __future__ import annotations

import os
from typing import Mapping

MASTER = "NEXIFY_SUITE"
FEATURES = ("EMAIL_VERIFICATION", "BILLING", "BYO_LLM")


def suite_enabled(env: Mapping[str, str] | None = None) -> bool:
    return (os.environ if env is None else env).get(MASTER) == "on"


def feature_enabled(name: str, env: Mapping[str, str] | None = None) -> bool:
    if name not in FEATURES:
        raise ValueError("unknown_suite_feature")
    values = os.environ if env is None else env
    return suite_enabled(values) and values.get("%s_%s" % (MASTER, name)) == "on"
