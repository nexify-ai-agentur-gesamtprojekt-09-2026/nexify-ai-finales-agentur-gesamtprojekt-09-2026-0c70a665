"""Isolated test-only catalog. Never loaded by the production/dev server CLI."""
import argparse
import importlib.util
import json
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[4]


def module(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


gateway = module('test_shop_gateway', 'apps/agent-gateway/server.py')
commerce = module('test_shop_cart', 'apps/agent-gateway/cart.py')


def fixture(store):
    cart = commerce.LocalCart(store, tenant='synthetic-tenant', store_id='synthetic-store', currency='EUR',
                              catalog_version='fixture-v1', products={'fixture-a': 123, 'fixture-b': 456},
                              lifetime_seconds=3600, maximum_quantity=5)
    return commerce.LocalShop(cart, source_reference='synthetic_test_fixture_only', maximum_results=20,
                              records=[{'product_id': 'fixture-a', 'name': {'de': 'Testfilter', 'nl': 'Testfilter', 'fr': 'Filtre test'}, 'category_id': 'filters', 'category': {'de': 'Filter', 'nl': 'Filters', 'fr': 'Filtres'}},
                                       {'product_id': 'fixture-b', 'name': {'de': 'Testlampe', 'nl': 'Testlamp', 'fr': 'Lampe test'}, 'category_id': 'lights', 'category': {'de': 'Licht', 'nl': 'Verlichting', 'fr': 'Éclairage'}}])


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--fixture-test-run', action='store_true', required=True)
    parser.add_argument('--database', type=Path, required=True)
    parser.add_argument('--web-origin', required=True)
    parser.add_argument('--port', type=int, default=0)
    args = parser.parse_args()
    store = gateway.Store(args.database)
    server = gateway.build_server(store, port=args.port, web_origin=args.web_origin, shop=fixture(store))
    print(json.dumps({'port': server.server_port}), flush=True)
    server.serve_forever()
