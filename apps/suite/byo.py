"""Customer's own model access (BYO): safety scaffold only. No provider adapter, no model call.

Rules taken from config/selfservice-policy.json (llm.byok) and config/llm-policy.json, enforced here:
  * the key is handed to a vault port at once; this code keeps and stores only an opaque `vaultref:<32 hex>`
    (same shape as apps/selfservice/domain.py and db/foundation/002);
  * key material never appears in repr/str/JSON/pickle of the carrier, in errors, or in log records;
  * the choice between own key and the managed route is explicit per organisation, there is no default;
  * a missing, invalid, revoked or unreachable own key is an error for the customer and NEVER a silent
    switch to the managed (NeXify-paid) route.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Iterable, Protocol

VAULT_REF = re.compile(r"vaultref:[a-f0-9]{32}")
PROVIDER_REF = re.compile(r"[a-z0-9_]{1,40}")
# Shapes of common credentials; a second net below the "never log it" rule, not a replacement for it.
_SECRET_SHAPES = re.compile(r"(?i)(bearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:sk|rk|pk|key|tok)[-_][A-Za-z0-9._-]{12,}|\b[A-Za-z0-9_-]{40,}\b)")
REDACTED = "[redacted]"


class LlmUnavailable(Exception):
    """Fixed code for the customer-facing error. Never carries key material."""
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


class SecretValue:
    """Carrier for key material on its way into the vault. Opaque everywhere except `reveal()`."""
    __slots__ = ("_SecretValue__value",)

    def __init__(self, value: str):
        if not isinstance(value, str) or not 8 <= len(value) <= 4096 or any(ord(c) < 33 for c in value):
            raise LlmUnavailable("byo_key_malformed")
        self.__value = value

    def reveal(self) -> str:
        return self.__value

    def __repr__(self):
        return "SecretValue(%s)" % REDACTED

    __str__ = __repr__

    def __format__(self, spec):
        return repr(self)

    def __reduce__(self):
        raise TypeError("SecretValue is not serialisable")

    def __eq__(self, other):
        return NotImplemented

    __hash__ = None


class Vault(Protocol):
    """Port. Which vault is used is an owner decision; the repository has only a test stand-in."""
    def store(self, *, organisation_id: str, provider_ref: str, secret: str) -> str: ...
    def resolve(self, *, organisation_id: str, reference: str) -> str | None: ...
    def revoke(self, *, organisation_id: str, reference: str) -> None: ...


@dataclass(frozen=True)
class Binding:
    organisation_id: str
    mode: str                 # "byo" | "managed"
    provider_ref: str | None
    vault_ref: str | None
    status: str = "active"    # "active" | "revoked"


@dataclass(frozen=True)
class Route:
    mode: str
    provider_ref: str | None
    credential: SecretValue | None


class LlmBindings:
    """One active binding per organisation. Holds references only; `records()` is safe to persist or dump."""

    def __init__(self, vault: Vault, *, allowed_providers: Iterable[str] = (), managed_route_available: bool = False):
        self.vault = vault
        self.allowed_providers = frozenset(allowed_providers)   # empty until the owner releases providers
        self.managed_route_available = managed_route_available
        self._active: dict = {}
        self._history: list = []

    def records(self):
        return list(self._history)

    def _retire(self, organisation_id):
        current = self._active.pop(organisation_id, None)
        if current is not None:
            revoked = Binding(current.organisation_id, current.mode, current.provider_ref, current.vault_ref, "revoked")
            self._history[self._history.index(current)] = revoked
            if current.vault_ref:
                self.vault.revoke(organisation_id=organisation_id, reference=current.vault_ref)

    def _activate(self, binding):
        self._retire(binding.organisation_id)
        self._active[binding.organisation_id] = binding
        self._history.append(binding)
        return binding

    def bind_byo(self, organisation_id: str, provider_ref: str, secret: SecretValue) -> Binding:
        if not isinstance(secret, SecretValue):
            raise LlmUnavailable("byo_key_must_arrive_as_secret_value")
        if not isinstance(provider_ref, str) or not PROVIDER_REF.fullmatch(provider_ref) or provider_ref not in self.allowed_providers:
            raise LlmUnavailable("byo_provider_not_released")
        try:
            reference = self.vault.store(organisation_id=organisation_id, provider_ref=provider_ref, secret=secret.reveal())
        except Exception:
            raise LlmUnavailable("vault_unavailable") from None
        if not isinstance(reference, str) or not VAULT_REF.fullmatch(reference):
            raise LlmUnavailable("vault_returned_no_opaque_reference")
        return self._activate(Binding(organisation_id, "byo", provider_ref, reference))

    def choose_managed(self, organisation_id: str) -> Binding:
        """Explicit choice by the organisation's owner. Availability and entitlement are checked at use."""
        return self._activate(Binding(organisation_id, "managed", None, None))

    def revoke(self, organisation_id: str) -> None:
        self._retire(organisation_id)

    def route(self, organisation_id: str) -> Route:
        """Decides which route a request of this organisation takes. Raises instead of guessing."""
        binding = self._active.get(organisation_id)
        if binding is None:
            raise LlmUnavailable("llm_choice_required")
        if binding.mode == "managed":
            if self.managed_route_available is not True:
                raise LlmUnavailable("managed_route_not_available")
            return Route("managed", None, None)
        # Own key chosen: every failure below stays a BYO failure. There is deliberately no branch to "managed".
        try:
            material = self.vault.resolve(organisation_id=organisation_id, reference=binding.vault_ref)
        except Exception:
            raise LlmUnavailable("byo_key_unavailable") from None
        if not material:
            raise LlmUnavailable("byo_key_unavailable")
        return Route("byo", binding.provider_ref, SecretValue(material))

    @staticmethod
    def provider_rejected(status_code: int) -> LlmUnavailable:
        """Maps the customer's provider answer to a customer-facing code; never a reason to change route."""
        return LlmUnavailable({401: "byo_key_rejected_by_provider", 403: "byo_key_rejected_by_provider",
                               402: "byo_provider_quota_exhausted", 429: "byo_provider_quota_exhausted"}.get(status_code, "byo_provider_error"))


def redact(text: str, known: Iterable[str] = ()) -> str:
    text = str(text)
    for value in known:
        if value:
            text = text.replace(value, REDACTED)
    return _SECRET_SHAPES.sub(lambda m: m.group(0) if VAULT_REF.fullmatch(m.group(0)) else REDACTED, text)


class RedactingFilter(logging.Filter):
    """Attach to handlers of code that touches BYO routes: formats the record, then scrubs credential shapes."""

    def filter(self, record):
        try:
            message = record.getMessage()
        except Exception:
            message = str(record.msg)
        record.msg, record.args = redact(message), None
        if record.exc_info:
            record.exc_text = redact(logging.Formatter().formatException(record.exc_info))
            record.exc_info = None
        return True
