"""Explicit operator CLI; default is metadata-only preflight, never an HTTP route.

Reads credentials only from the existing process environment. No dotenv/env pull,
URI flags, seeds, document reads, migrations, deletes, automatic retry or resume.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import logging
import os
import secrets
from typing import Mapping
from urllib.parse import urlsplit

from vercel_app import BindingError, CLAIM_COLLECTION, COLLECTIONS, INDEXES, PLANNED_NAMESPACE, PROJECT_ID, SCHEMA_MARKER, check_metadata, resolve_binding

MAX_METADATA_COLLECTIONS = 100
COLLECTION_OPTIONS = {
    "validator": {"$jsonSchema": {"bsonType": "object", "description": SCHEMA_MARKER}},
    "validationLevel": "strict", "validationAction": "error",
}
# Distinct per-run validator options are essential: Mongo create with identical
# options can succeed as a no-op. A fresh 128-bit run id distinguishes claims.
CREATION_ORDER = ("source_manifests",) + tuple(n for n in COLLECTIONS if n != "source_manifests")


class OperatorError(ValueError):
    """Fixed codes only: driver messages and environment values must not escape."""


def plan():
    return {"project_id": PROJECT_ID, "planned_namespace": PLANNED_NAMESPACE,
            "collection_options": COLLECTION_OPTIONS,
            "creation_order": list(CREATION_ORDER),
            "claim_protocol": {"collection": CLAIM_COLLECTION, "description_template": SCHEMA_MARKER + "/claim/<32 lowercase hex run id>", "same_options_create_is_not_a_lock": True},
            "indexes": {name: [{"keys": [[key, 1] for key in keys], "unique": unique,
                        **({"expireAfterSeconds": ttl} if ttl is not None else {})}
                       for keys, unique, ttl in specs] for name, specs in INDEXES.items()}}


def plan_digest():
    return hashlib.sha256(json.dumps(plan(), sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def connection_uri(env: Mapping[str, str]):
    if env.get("VERCEL_PROJECT_ID") != PROJECT_ID:
        raise OperatorError("project_binding_unverified")
    old, new = env.get("MONGO_URL", ""), env.get("MONGODB_URI", "")
    if old and new and old != new:
        raise OperatorError("database_configuration_conflict")
    uri = old or new
    try:
        value = urlsplit(uri)
        if not isinstance(uri, str) or not uri or value.scheme not in ("mongodb", "mongodb+srv") or not value.hostname or value.fragment:
            raise ValueError()
        if value.hostname.lower() in ("localhost", "127.0.0.1", "::1"):
            raise ValueError()
    except (ValueError, TypeError, AttributeError):
        raise OperatorError("database_binding_missing_or_unsuitable") from None
    # A connection URI's default database is NEVER selected or printed. This CLI
    # targets only the fixed NEW plan, independently of the runtime DB_NAME gate.
    return uri


async def metadata(database):
    if getattr(database, "name", None) != PLANNED_NAMESPACE:
        raise OperatorError("namespace_target_mismatch")
    cursor = await database.list_collections()
    rows = await cursor.to_list(length=MAX_METADATA_COLLECTIONS + 1)
    if len(rows) > MAX_METADATA_COLLECTIONS:
        raise OperatorError("namespace_metadata_limit")
    if any(not isinstance(row, dict) or not isinstance(row.get("name"), str) for row in rows):
        raise OperatorError("namespace_metadata_invalid")
    return rows


async def preflight(database):
    rows = await metadata(database)
    result = {"operation": "preflight", "project_id": PROJECT_ID,
              "planned_namespace": PLANNED_NAMESPACE, "plan_sha256": plan_digest(),
              "collection_count": len(rows), "writes": False,
              "business_documents_read": False, "runtime_or_provider_accepted": False}
    if not rows:
        result["state"] = "empty_namespace_metadata"
    elif len(rows) == len(COLLECTIONS) and {r["name"] for r in rows} == set(COLLECTIONS) and await check_metadata(database) is None:
        result["state"] = "existing_schema_matches_read_only"
    else:
        result["state"] = "existing_namespace_not_initialized_by_this_operation"
    return result


def collection_options(name, creation_id):
    description = SCHEMA_MARKER + "/claim/" + creation_id if name == CLAIM_COLLECTION else SCHEMA_MARKER
    return {**COLLECTION_OPTIONS, "validator": {"$jsonSchema": {"bsonType": "object", "description": description}}}


def validate_created(rows, owned, creation_id):
    """Only this invocation's newly created collection set may be extended."""
    if {row["name"] for row in rows} != set(owned) or len(rows) != len(owned):
        raise OperatorError("concurrent_namespace_change")
    for row in rows:
        options = row.get("options", {})
        if (row.get("type") != "collection" or not isinstance(options, dict)
                or set(options) - {"validator", "validationLevel", "validationAction", "capped"}
                or options.get("validator") != collection_options(row["name"], creation_id)["validator"]
                or options.get("validationLevel", "strict") != "strict"
                or options.get("validationAction", "error") != "error"
                or options.get("capped", False) is not False):
            raise OperatorError("created_collection_metadata_changed")


async def initialize(database, *, confirmed_plan_sha256):
    if confirmed_plan_sha256 != plan_digest():
        raise OperatorError("plan_confirmation_missing_or_stale")
    # A prior report is never trusted as current emptiness; recheck immediately.
    first = await preflight(database)
    if first["state"] != "empty_namespace_metadata":
        raise OperatorError("namespace_not_empty_no_changes_allowed")
    creation_id = secrets.token_hex(16)  # Run metadata, NOT an access key or credential.
    created, index_count = [], 0
    try:
        for name in CREATION_ORDER:
            validate_created(await metadata(database), created, creation_id)
            # The FIRST collection carries this invocation's distinct validator.
            # A competing invocation has different options and is rejected;
            # identical-option create success must never be treated as a lock.
            collection = await database.create_collection(name, check_exists=False, **collection_options(name, creation_id))
            created.append(name)
            validate_created(await metadata(database), created, creation_id)
            for number, (keys, unique, ttl) in enumerate(INDEXES.get(name, [])):
                options = {"unique": unique, "name": f"nexify_plan_{number}"}
                if ttl is not None:
                    options["expireAfterSeconds"] = ttl
                await collection.create_index([(key, 1) for key in keys], **options)
                index_count += 1
        if await check_metadata(database) is not None:
            raise OperatorError("post_init_metadata_not_ready")
    except Exception:
        # A timeout may have committed the last DDL. Never blindly retry or drop.
        return {"operation": "init", "state": "incomplete_readback_required",
                "initialization_run_id": creation_id, "writes_may_have_committed": True, "acknowledged_collections": len(created), "acknowledged_indexes": index_count,
                "automatic_retry": False, "automatic_rollback": False,
                "business_documents_read": False, "runtime_or_provider_accepted": False}
    return {"operation": "init", "state": "new_schema_initialized",
            "planned_namespace": PLANNED_NAMESPACE, "plan_sha256": plan_digest(),
            "initialization_run_id": creation_id, "metadata_writes": True, "created_collections": len(created), "created_indexes": index_count,
            "seeded_documents": 0, "runtime_or_provider_accepted": False}


class SafeParser(argparse.ArgumentParser):
    def error(self, message):
        raise OperatorError("invalid_operator_arguments")


def arguments(argv=None):
    parser = SafeParser(description="Metadata-only by default; no URI or credential arguments.")
    parser.add_argument("operation", choices=("preflight", "init", "plan"), nargs="?", default="preflight")
    parser.add_argument("--confirm-plan-sha256")
    return parser.parse_args(argv)


async def operate(env, args, *, client_factory=None):
    uri = connection_uri(env)
    if args.operation == "init" and args.confirm_plan_sha256 != plan_digest():
        raise OperatorError("plan_confirmation_missing_or_stale")
    if client_factory is None:
        from motor.motor_asyncio import AsyncIOMotorClient
        client_factory = AsyncIOMotorClient
    # No connection happens at module import, application startup or plan render.
    client = client_factory(uri, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000, socketTimeoutMS=5000, retryWrites=False, retryReads=False)
    try:
        from pymongo.write_concern import WriteConcern
        database = client.get_database(PLANNED_NAMESPACE, write_concern=WriteConcern(w="majority", wtimeout=5000))
        if args.operation == "init":
            # Fail before any mutation if the explicit plan was not confirmed.
            return await asyncio.wait_for(initialize(database, confirmed_plan_sha256=args.confirm_plan_sha256), timeout=90)
        result = await asyncio.wait_for(preflight(database), timeout=15)
        try:
            resolve_binding(env)
            result["runtime_configuration"] = "aligned_metadata_still_required"
        except BindingError as error:
            result["runtime_configuration"] = str(error)
        return result
    finally:
        client.close()


def main(argv=None):
    # Some drivers log exception objects/hostnames. Only fixed output is allowed.
    logging.disable(logging.CRITICAL)
    try:
        args = arguments(argv)
        if args.operation == "plan":
            print(json.dumps({"operation": "plan", "plan_sha256": plan_digest(), "plan": plan()}, sort_keys=True))
            return 0
        result = asyncio.run(operate(dict(os.environ), args))
        print(json.dumps(result, sort_keys=True))
        return int(result["state"] == "incomplete_readback_required")
    except OperatorError as error:
        print(json.dumps({"operation": "operator", "state": "blocked", "reason": str(error)}))
    except BaseException:
        print(json.dumps({"operation": "operator", "state": "unconfirmed_readback_required", "reason": "operator_failed_or_interrupted"}))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
