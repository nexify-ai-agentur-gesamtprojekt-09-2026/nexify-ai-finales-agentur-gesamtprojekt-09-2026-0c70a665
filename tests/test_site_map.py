"""Validate the actual curated route graph; negative cases exercise closed boundaries."""
from copy import deepcopy
import json
from pathlib import Path
import re
import unittest
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def validate_site_map(data):
    def require(condition, message):
        if not condition:
            raise ValueError(message)

    locales = set(data['locales'])
    require(locales == {'de', 'nl', 'fr'} and data['default_locale'] == 'de', 'locale contract')

    def translated(value):
        require(isinstance(value, dict) and set(value) == locales, 'i18n key parity')
        require(all(isinstance(v, str) and v.strip() for v in value.values()), 'empty translated text')

    def safe_path(path):
        require(isinstance(path, str), 'path must be a string')
        decoded = path
        for _ in range(4):
            new = unquote(decoded)
            if new == decoded:
                break
            decoded = new
        parsed = urlsplit(decoded)
        require(decoded.startswith('/') and not decoded.startswith('//')
                and not parsed.scheme and not parsed.netloc and not parsed.query
                and not parsed.fragment and '\\' not in decoded
                and not any(segment in {'.', '..'} for segment in decoded.split('/')),
                'unsafe route or open redirect')
        require('/prototypen/' not in decoded and not decoded.endswith(('.html', '.htm')),
                'prototype route must not be published')

    pages = data['pages']
    ids = {p['id'] for p in pages}
    require(len(ids) == len(pages), 'duplicate route id')
    require(len({p['path'] for p in pages}) == len(pages), 'duplicate route path')
    by_id = {p['id']: p for p in pages}
    public = {p['id'] for p in pages if p['access']['visibility'] == 'public'}
    require(set(data['public_allowlist']) == public, 'public allowlist drift')
    require(data['home_id'] in public, 'public home missing')
    known_prototypes = {p['page_id'] for p in json.loads(
        (ROOT / 'docs/contracts/prototype-pages.json').read_text())['pages']}

    def public_target(target):
        require(target in ids, 'unknown target')
        require(target in public, 'nonpublic target exposed')

    for page in pages:
        safe_path(page['path'])
        require(page['metadata']['canonical_path'] == page['path'], 'canonical mismatch')
        require(page['metadata']['canonical_origin'] is None, 'unverified production canonical')
        require(page['site_context'] in data['site_contexts'], 'unknown site context')
        translated(page['title'])
        translated(page['summary'])
        translated(page['metadata']['description'])
        require(page['implementation_status'] in {'planned', 'implemented', 'reference_only'}, 'unknown status')
        require(page['sections'], 'empty page sections')
        require(len({s['id'] for s in page['sections']}) == len(page['sections']), 'duplicate section id')
        for section in page['sections']:
            translated(section['heading'])
            translated(section['body'])
            require(section['source_refs'], 'section has no source')
            for source in section['source_refs']:
                require((ROOT / source).is_file(), 'missing section source')
        require(page['prototype_page_ids'], 'missing prototype derivation')
        require(set(page['prototype_page_ids']) <= known_prototypes, 'unknown prototype source')
        if page['id'] in public:
            require(not page['access']['auth_required'] and not page['access']['roles'], 'public auth conflict')
            require(page['site_context'] != 'internal', 'internal page made public')
            require(page['shared_chat_required'] and page['cookie_preferences_first'], 'shared interaction missing')
        else:
            require(page['access']['auth_required'] and page['access']['roles'], 'protected roles missing')
            require(page['access']['site_membership_required'] and page['access']['tenant_required'],
                    'protected site/tenant boundary missing')
            require(page['metadata']['indexability'] == 'noindex,nofollow', 'private page indexable')
        require(page['next_actions'], 'dead-end page')
        for action in page['next_actions']:
            translated(action['label'])
            require(not any(k in action for k in ('url', 'href', 'redirect', 'redirect_url')), 'untyped redirect')
            if action['type'] == 'route':
                public_target(action['target_id'])
            elif action['type'] == 'chat':
                require(action['chat_intent'] in {'quote', 'booking', 'marketing'}, 'unknown chat intent')
                public_target(action['fallback_target_id'])
            else:
                require(False, 'unknown action type')

    graph = {id: set() for id in public}
    for context, settings in data['site_contexts'].items():
        targets = list(settings['navigation'])
        for group in settings['footer']:
            translated(group['label'])
            targets.extend(group['page_ids'])
        for target in targets:
            public_target(target)
        if context == 'internal':
            require(not targets, 'internal context navigation exposed')
        for page in pages:
            if page['id'] in public and page['site_context'] == context:
                graph[page['id']].update(targets)
    for target in data['navigation']:
        public_target(target)
    for group in data['footer']:
        translated(group['label'])
        for target in group['page_ids']:
            public_target(target)
    for page in pages:
        if page['id'] in public:
            graph[page['id']].update(a['target_id'] for a in page['next_actions'] if a['type'] == 'route')
            graph[page['id']].update(a['fallback_target_id'] for a in page['next_actions'] if a['type'] == 'chat')
    for link in data['inter_site_links']:
        public_target(link['target_id'])
        require(by_id[link['target_id']]['site_context'] == link['to_context'], 'cross-site target context mismatch')
        translated(link['label'])
        for page in pages:
            if page['id'] in public and page['site_context'] == link['from_context']:
                graph[page['id']].add(link['target_id'])

    visited = set()
    pending = [data['home_id']]
    while pending:
        current = pending.pop()
        if current not in visited:
            visited.add(current)
            pending.extend(graph[current] - visited)
    require(visited == public, 'unreachable public page/orphan')
    for journey in data['journeys']:
        for id in journey['steps']:
            public_target(id)
        for left, right in zip(journey['steps'], journey['steps'][1:]):
            require(right in graph[left], 'broken journey edge')
        require(set(journey['final_intents']) <= {'quote', 'booking', 'marketing'}, 'invalid journey intent')

    require(data['audience']['primary_market'] == 'DE' and data['audience']['target_share'] == .9
            and data['audience']['measurement_status'] == 'business_target_not_analytics_fact',
            'market target misrepresented')
    require(data['operator_context']['legal_country_context'] == 'NL', 'operator country relabelled')
    require(data['customer_portal_entry']['functional_login'] is False
            and data['customer_portal_entry']['data_entry_enabled'] is False, 'unverified login promoted')
    public_target(data['customer_portal_entry']['target_id'])
    require(data['shared_interaction']['privacy']['cross_top_level_domain_consent_assumed'] is False,
            'cross-domain consent assumed')
    require(data['identity_boundaries']['cross_top_level_domain_sso'] == 'not_implemented_not_assumed',
            'cross-domain SSO assumed')
    require(data['identity_boundaries']['protected_content_in_public_client_props'] is False,
            'private client payload allowed')
    require(not data['publication_gate']['production_release_claimed'], 'production release invented')
    require(not data['source_policy']['numeric_prices_embedded']
            and not data['source_policy']['legal_texts_generated_or_automatically_translated'],
            'protected price/legal content generated')
    footer_ids = {id for settings in data['site_contexts'].values()
                  for group in settings['footer'] for id in group['page_ids']}
    require({'imprint','privacy','terms','ai-notice','accessibility','cookies','tk-legal'} <= footer_ids,
            'legal page available only via chat')
    return {'routes':len(pages), 'public':len(public), 'protected':len(pages)-len(public)}


class SiteMapContracts(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / 'config/site-map.json').read_text())

    def test_actual_full_route_graph_is_reachable_and_source_bound(self):
        result = validate_site_map(self.data)
        self.assertEqual(result, {'routes':44,'public':34,'protected':10})

    def test_internal_route_cannot_enter_public_navigation(self):
        self.data['site_contexts']['nexify']['navigation'].append('internal-admin')
        with self.assertRaisesRegex(ValueError, 'nonpublic target'):
            validate_site_map(self.data)

    def test_new_unlinked_public_page_is_an_orphan(self):
        orphan = deepcopy(self.data['pages'][0])
        orphan.update(id='unlinked',path='/unlinked',site_context='internal')
        orphan['metadata']['canonical_path'] = '/unlinked'
        # A distinct valid site context without inbound links isolates the graph failure.
        self.data['site_contexts']['isolated'] = {'navigation':[],'footer':[]}
        orphan['site_context'] = 'isolated'
        self.data['pages'].append(orphan)
        self.data['public_allowlist'].append('unlinked')
        with self.assertRaisesRegex(ValueError, 'orphan'):
            validate_site_map(self.data)

    def test_i18n_keys_are_structural_not_only_german(self):
        del self.data['pages'][0]['summary']['fr']
        with self.assertRaisesRegex(ValueError, 'i18n key parity'):
            validate_site_map(self.data)

    def test_absolute_protocol_relative_and_encoded_redirect_routes_are_rejected(self):
        for path in ['https://example.test/','//example.test/','/%2e%2e/private','/%252f%252fevil.test']:
            with self.subTest(path=path):
                data = deepcopy(self.data)
                data['pages'][0]['path'] = path
                with self.assertRaisesRegex(ValueError, 'unsafe route'):
                    validate_site_map(data)

    def test_unknown_and_private_cta_targets_are_rejected(self):
        for target in ['https://example.test/','internal-inbox']:
            with self.subTest(target=target):
                data = deepcopy(self.data)
                data['pages'][0]['next_actions'][0]['target_id'] = target
                with self.assertRaises(ValueError):
                    validate_site_map(data)

    def test_market_goal_cannot_become_analytics_or_a_german_company(self):
        for key,value in [('measurement_status','analytics_fact'),('primary_market','NL')]:
            with self.subTest(key=key):
                data = deepcopy(self.data)
                data['audience'][key] = value
                with self.assertRaisesRegex(ValueError, 'market target'):
                    validate_site_map(data)
        self.data['operator_context']['legal_country_context'] = 'DE'
        with self.assertRaisesRegex(ValueError, 'operator country'):
            validate_site_map(self.data)

    def test_login_and_cross_domain_sso_are_not_invented(self):
        self.data['customer_portal_entry']['functional_login'] = True
        with self.assertRaisesRegex(ValueError, 'login promoted'):
            validate_site_map(self.data)

    def test_public_sitemap_cannot_include_a_raw_prototype(self):
        self.data['pages'][0]['path'] = '/prototypen/NeXifyAI Cloud v12.dc.html'
        with self.assertRaisesRegex(ValueError, 'prototype route'):
            validate_site_map(self.data)


if __name__ == '__main__':
    unittest.main()
