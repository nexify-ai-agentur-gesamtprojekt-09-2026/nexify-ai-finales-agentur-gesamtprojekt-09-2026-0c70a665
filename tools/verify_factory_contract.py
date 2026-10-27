#!/usr/bin/env python3
"""Offline consistency gates for the proposed Factory contract, not a live API test."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

METHODS = {"get", "post", "put", "patch", "delete", "head", "options"}
ROOT = Path(__file__).resolve().parents[1]
# Deliberate review boundary: a document must not make a privileged operation
# public merely by adding its name to its own extension-field allowlist.
PUBLIC_OPERATIONS = {
    ("post", "/v1/auth/register"): "registerAccount",
    ("post", "/v1/auth/login"): "loginWithPassword",
    ("post", "/v1/auth/magic-link"): "requestMagicLink",
    ("post", "/v1/auth/magic-link/consume"): "consumeMagicLink",
    ("post", "/v1/auth/mfa/verify"): "verifyLoginMfa",
    ("post", "/v1/auth/password/reset-requests"): "requestPasswordReset",
    ("post", "/v1/auth/password/reset"): "resetPasswordWithBoundToken",
    ("post", "/v1/auth/email/verify"): "verifyAccountEmail",
    ("post", "/v1/auth/device/code"): "startTerminalDeviceAuthorization",
    ("post", "/v1/auth/device/token"): "pollApprovedTerminalAccessToken",
    ("get", "/v1/public/content/{slug}"): "readPublishedContent",
    ("get", "/v1/public/legal/{documentKey}"): "readPublishedLegalVersion",
    ("get", "/v1/public/prices"): "readPublishedPriceCatalog",
    ("post", "/v1/requests"): "createInquiry",
    ("post", "/v1/payments/revolut/webhook"): "receiveRevolutWebhook",
    ("get", "/v1/shop/products"): "listPublishedProducts",
    ("get", "/v1/shop/products/{productId}"): "readPublishedProduct",
    ("post", "/v1/shop/carts"): "createCart",
    ("post", "/v1/public/fitment/checks"): "checkCompatibility",
    ("get", "/v1/partners/{partnerId}/availability"): "readPublicAppointmentSlots",
    ("post", "/v1/partner-applications"): "applyAsPartner",
    ("get", "/v1/public/media/{assetId}"): "readPublishedHeroMedia",
}
SCHEME_CONTRACTS = {
    "BrowserSession": {"type": "apiKey", "in": "cookie", "name": "nx_session"},
    "CsrfToken": {"type": "apiKey", "in": "header", "name": "X-CSRF-Token"},
    "UserBearer": {"type": "http", "scheme": "bearer"},
    "ApiKey": {"type": "http", "scheme": "bearer"},
    "GuestCapability": {"type": "apiKey", "in": "header", "name": "X-NX-Guest-Capability"},
}
INFERENCE_OPERATIONS = {("post", path) for path in
                        ("/v1/chat/completions", "/v1/messages", "/v1/embeddings", "/v1/estimate")}
GUEST_OPERATIONS = {("get", "/v1/shop/carts/{cartId}"), ("put", "/v1/shop/carts/{cartId}/items"),
                    ("post", "/v1/shop/orders"), ("get", "/v1/shop/orders/{orderId}")}


def source_path(root, relative):
    """Never accept a catalog path outside its declared repository."""
    if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
        raise ValueError("source path must be repository-relative")
    path = root / relative
    parts = Path(relative).parts
    if any(part == ".git" or part.startswith(".env") for part in parts):
        raise ValueError("private source locations are not contract evidence")
    if ".." in parts or not path.resolve().is_relative_to(root.resolve()):
        raise ValueError("source path escapes repository")
    if path.is_symlink():
        raise ValueError("source symlink is not a versioned regular-file assertion")
    return path


def validate_catalog(catalog, roots):
    errors, ids, actual = [], set(), {repo: set() for repo in roots}
    pages = catalog.get("pages", [])
    if not pages:
        errors.append("Empty page catalog")
    for page in pages:
        repo, relative = page.get("repository"), page.get("path")
        if repo not in roots:
            errors.append("Catalog: unknown repository")
            continue
        try:
            if Path(relative).suffix.lower() not in {".html", ".htm"}:
                raise ValueError("page catalog accepts HTML only")
            path = source_path(roots[repo], relative)
            raw = path.read_bytes()
            if hashlib.sha256(raw).hexdigest() != page.get("sha256"):
                errors.append(f"Catalog: source hash mismatch {repo}:{relative}")
        except (OSError, ValueError):
            errors.append(f"Catalog: invalid or unavailable source {repo}:{relative}")
        page_id = page.get("page_id")
        if page_id != f"{repo}:{relative}" or page_id in ids:
            errors.append("Catalog: invalid or duplicate page identity")
        ids.add(page_id)
        actual[repo].add(relative)
        if not page.get("purpose", {}).get("text") or not page.get("derived", {}).get("domains"):
            errors.append(f"Catalog: missing purpose/domain {page_id}")
    for repo, root in roots.items():
        try:
            output = subprocess.check_output(["git", "-C", str(root), "ls-files", "-z"], stderr=subprocess.DEVNULL)
            tracked = {p for p in output.decode().split("\0") if Path(p).suffix.lower() in {".html", ".htm"}
                       and not (repo == "N1" and p.startswith("reference/handoff-n2/"))}
            missing = tracked - actual[repo]
            if missing:
                errors.append(f"Catalog: {repo} omits {len(missing)} tracked HTML pages")
        except (OSError, subprocess.CalledProcessError):
            errors.append(f"Catalog: {repo} tracked-file enumeration unavailable")
    if catalog.get("coverage", {}).get("html_catalogued") != len(pages):
        errors.append("Catalog: declared page count does not match contents")
    return errors


def validate_sources(document, roots):
    errors = []
    for path, method, op in operations(document):
        for ref in op.get("x-source-refs", []):
            repo = ref.get("repository")
            if repo == "USER":
                if not ref.get("path") or not ref.get("kind"):
                    errors.append("User source must be explicitly described")
                continue
            try:
                if repo not in roots or not source_path(roots[repo], ref.get("path")).is_file():
                    raise ValueError("missing source")
            except (OSError, ValueError):
                errors.append(f"{method.upper()} {path}: invalid source reference")
    return errors


def operations(document):
    for path, item in document.get("paths", {}).items():
        for method, operation in item.items():
            if method in METHODS:
                yield path, method, operation


def local_references(document):
    """Check every local JSON pointer, including escaped slashes and tildes."""
    errors = []

    def walk(value):
        if isinstance(value, dict):
            if "$ref" in value:
                ref = value["$ref"]
                if not isinstance(ref, str) or not ref.startswith("#/"):
                    errors.append("Only bundled local $refs are permitted")
                else:
                    current = document
                    try:
                        for key in ref[2:].split("/"):
                            current = current[key.replace("~1", "/").replace("~0", "~")]
                    except (KeyError, TypeError):
                        errors.append(f"Unresolved local reference: {ref}")
            for item in value.values():
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(document)
    return errors


def validate_document(document, page_ids=None):
    """Project security invariants in addition to OpenAPI schema validation."""
    errors = local_references(document)
    if document.get("openapi") != "3.1.0":
        errors.append("Expected OpenAPI 3.1.0")
    if document.get("x-contract-state") != "proposed_target_not_runtime":
        errors.append("Contract must explicitly distinguish target from runtime")
    entries = list(operations(document))
    if not entries:
        errors.append("Empty operation catalog")
    known_schemes = document.get("components", {}).get("securitySchemes", {})
    for name, definition in known_schemes.items():
        expected = SCHEME_CONTRACTS.get(name)
        if expected is None or any(definition.get(key) != value for key, value in expected.items()):
            errors.append(f"Unreviewed credential scheme or transport: {name}")
    ids = set()
    actual_public = set()
    for path, method, op in entries:
        label = f"{method.upper()} {path}"
        operation_id = op.get("operationId")
        if not operation_id or operation_id in ids:
            errors.append(f"{label}: missing or duplicated operationId")
        ids.add(operation_id)
        if op.get("x-implementation-status") != "proposed_not_implemented":
            errors.append(f"{label}: unverified runtime claim")
        if not op.get("x-source-refs"):
            errors.append(f"{label}: no source references")
        if not op.get("tags"):
            errors.append(f"{label}: no domain")
        if not isinstance(op.get("security"), list):
            errors.append(f"{label}: explicit security required")
            continue
        if not op["security"]:
            actual_public.add(operation_id)
            if PUBLIC_OPERATIONS.get((method, path)) != operation_id:
                errors.append(f"{label}: operation unexpectedly public")
        auth = op.get("x-authorization", {})
        required = ("roles", "scopes", "tenant_binding", "ownership", "mfa", "approval_class")
        if any(key not in auth for key in required):
            errors.append(f"{label}: incomplete authorization policy")
        if not isinstance(auth.get("roles"), list) or not auth.get("roles"):
            errors.append(f"{label}: roles must be explicit and nonempty")
        if not isinstance(auth.get("scopes"), list):
            errors.append(f"{label}: scopes must be explicit")
        if "x-global-authorization" in document and auth.get("deny_by_default") is not True:
            errors.append(f"{label}: deny-by-default policy missing")
        if op["security"] and auth.get("tenant_binding") not in {"account_bound_no_implicit_tenant"}:
            # Tenant selectors are never permissions. Their presence makes the
            # required identity/membership check unambiguous to generated clients.
            parameters = list(op.get("parameters", [])) + list(document.get("paths", {}).get(path, {}).get("parameters", []))
            selector = any(p.get("$ref") == "#/components/parameters/TenantId" or
                           (p.get("in") == "header" and p.get("name") == "X-Tenant-ID" and p.get("required") is True)
                           for p in parameters)
            if auth.get("tenant_binding") == "authenticated_membership_and_database_rls" and not selector:
                errors.append(f"{label}: private tenant operation lacks explicit selector")
        for alternative in op["security"]:
            if not isinstance(alternative, dict) or not alternative:
                errors.append(f"{label}: empty security alternative")
                continue
            family = set(alternative)
            allowed = ({"BrowserSession", "CsrfToken"}, {"UserBearer"}, {"ApiKey"}, {"GuestCapability"})
            if method not in {"post", "put", "patch", "delete"}:
                allowed = allowed + ({"BrowserSession"},)
            if family not in allowed:
                errors.append(f"{label}: unsupported credential alternative")
            for scheme in alternative:
                if scheme not in known_schemes:
                    errors.append(f"{label}: undefined security scheme {scheme}")
            if method in {"post", "put", "patch", "delete"} and "BrowserSession" in alternative:
                if "CsrfToken" not in alternative:
                    errors.append(f"{label}: browser mutation without CSRF")
            if "ApiKey" in alternative and (method, path) not in INFERENCE_OPERATIONS:
                errors.append(f"{label}: inference API key escapes its boundary")
            if "GuestCapability" in alternative and (method, path) not in GUEST_OPERATIONS:
                errors.append(f"{label}: guest capability escapes its resource boundary")
        if method in {"post", "put", "patch", "delete"} and not op.get("x-idempotency"):
            errors.append(f"{label}: mutation lacks idempotency/replay policy")
        if page_ids is not None:
            for page_id in op.get("x-page-ids", []):
                if page_id not in page_ids:
                    errors.append(f"{label}: unknown page {page_id}")
    if "x-public-operation-ids" in document and set(document["x-public-operation-ids"]) != actual_public:
        errors.append("Public operation manifest does not match explicit security")
    return errors


def validate_coverage(document, catalog):
    """Recompute coverage rather than accepting a self-declared green count."""
    errors, expected, mapped = [], set(), set()
    domains = set(catalog.get("domain_vocabulary", []))
    for page in catalog.get("pages", []):
        expected.update(page.get("derived", {}).get("proposed_required_operations", []))
    for path, method, op in operations(document):
        mapped.update(op.get("x-capabilities", []))
        if set(op.get("tags", [])) - domains:
            errors.append(f"{method.upper()} {path}: unknown page-domain tag")
    missing = expected - mapped
    if missing:
        errors.append(f"Coverage: {len(missing)} page capabilities lack an operation")
    declaration = document.get("x-capability-coverage", {})
    if set(declaration.get("catalog_capabilities", [])) != expected:
        errors.append("Coverage: stale catalog capability declaration")
    return errors


def validate_media(media):
    errors = []
    if media.get("contract_state") != "proposed_target_not_runtime":
        errors.append("Media: unverified runtime claim")
    expected = {"nex": "Lbm7qDmJUxIxpWx9qhZO", "aifly": "feTHtWuEJFLTOWyoreyy", "user": "feTHtWuEJFLTOWyoreyy"}
    people = media.get("participants", [])
    slots = [person.get("slot") for person in people]
    if len(slots) != len(set(slots)) or set(slots) != set(expected):
        errors.append("Media: participant bindings missing or duplicated")
    for person in people:
        binding = person.get("voice_binding") or {}
        if binding.get("voice_id") != expected.get(person.get("slot")):
            errors.append("Media: voice mapping differs from explicit user instruction")
    access = media.get("access", {})
    if access.get("default") != "deny" or access.get("provider_credentials_in_browser") is not False:
        errors.append("Media: unsafe provider access")
    if access.get("generic_provider_execute_endpoint") is not False:
        errors.append("Media: generic provider execution bridge")
    if media.get("video_provider", {}).get("service") != "runway":
        errors.append("Media: Runway video source missing")
    if media.get("provider", {}).get("service") != "elevenlabs":
        errors.append("Media: ElevenLabs audio source missing")
    if media.get("presentation", {}).get("audible_autoplay") is not False:
        errors.append("Media: audible autoplay enabled")
    return errors


def validate_media_plan(plan):
    """Keep multilingual scripts and the unexecuted casting gate in sync."""
    errors = []
    locales = {"de", "nl", "fr"}
    if plan.get("state") != "draft_not_submitted":
        errors.append("Media plan: unverified execution state")
    execution = plan.get("execution", {})
    if (execution.get("provider_jobs_started") != 0
            or execution.get("audio_files_generated") != 0
            or execution.get("video_files_generated") != 0
            or execution.get("published") is not False):
        errors.append("Media plan: provider work claimed without runtime evidence")

    casting = plan.get("voice_casting", {})
    if casting.get("state") != "provider_asset_inventory_and_audition_required":
        errors.append("Media plan: casting inventory gate missing")
    comparison = casting.get("comparison_script", {})
    if set(comparison) != locales or any(not str(comparison[key]).strip() for key in locales):
        errors.append("Media plan: DE/NL/FR comparison scripts incomplete")

    jobs = plan.get("jobs", [])
    by_slot = {job.get("participant_slot"): job for job in jobs}
    if len(jobs) != len(by_slot) or set(by_slot) != {"nex", "aifly", "user"}:
        errors.append("Media plan: presenter jobs missing or duplicated")
    for slot, job in by_slot.items():
        scripts = job.get("script_drafts", {})
        if set(scripts) != locales or any(not str(scripts[key]).strip() for key in locales):
            errors.append(f"Media plan: {slot} DE/NL/FR hero scripts incomplete")
        if job.get("text_status") != "editorial_ready_pending_voice_audition":
            errors.append(f"Media plan: {slot} text/audition boundary missing")
    if by_slot.get("aifly", {}).get("voice_assignment_status") != "recast_preferred_from_existing_provider_assets":
        errors.append("Media plan: AIFly distinct-voice decision missing")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--repo-n2", type=Path)
    args = parser.parse_args()
    folder = args.root / "docs/contracts"
    try:
        document = json.loads((folder / "factory.openapi.json").read_text())
        media = json.loads((folder / "hero-media.json").read_text())
        media_plan = json.loads((folder / "hero-production-plan.json").read_text())
        catalog = json.loads((folder / "prototype-pages.json").read_text())
        bundled_reference = args.root / "reference/handoff-n2"
        roots = {"N1": args.root, "N2": args.repo_n2 or (bundled_reference if bundled_reference.is_dir()
                 else args.root.parent / "nexify-ai-finales-agentur-gesamtprojekt-09-2026")}
        page_ids = {page["page_id"] for page in catalog.get("pages", [])}
        errors = (validate_document(document, page_ids) + validate_media(media)
                  + validate_media_plan(media_plan)
                  + validate_catalog(catalog, roots) + validate_sources(document, roots)
                  + validate_coverage(document, catalog))
    except (OSError, ValueError, TypeError) as exc:
        print(f"Contract input failure: {type(exc).__name__}")
        return 1
    for error in errors:
        print(f"FAIL: {error}")
    if errors:
        return 1
    print(f"Contract policy gates OK: {len(list(operations(document)))} target operations; no live integration claim")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
