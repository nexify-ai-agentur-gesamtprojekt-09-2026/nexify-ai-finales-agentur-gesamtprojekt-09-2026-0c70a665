"""Canonical UI/TTS copy contract; local JSON and fake audio transport only."""
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('speech_copy_subject', ROOT / 'apps/agent-gateway/integrations.py')
tools = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tools)
COPY = ROOT / 'config/assistant-interface-copy.json'


class AssistantCopy(unittest.TestCase):
    def setUp(self):
        self.copy = json.loads(COPY.read_text(encoding='utf-8'))
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.source = Path(self.tmp.name) / 'copy.json'

    def read_fixture(self, data, **format_options):
        self.source.write_text(json.dumps(data, **format_options), encoding='utf-8')
        return tools.speech_texts(self.source)

    def test_current_brand_copy_is_complete_and_does_not_grant_english_audio(self):
        actual = tools.speech_texts()
        self.assertEqual(len(actual), 15)
        self.assertEqual(set(actual), {(key, locale) for locale in ('de', 'nl', 'fr') for key in tools.SPEECH_KEYS})
        for locale in ('de', 'nl', 'fr', 'en'):
            self.assertIn('NeXify AI FACTORY B.V.', self.copy[locale]['welcomeBody'])
            self.assertTrue(self.copy[locale]['welcome'].strip())
        # Rewriting the authorised company copy does not enable English TTS.
        self.assertNotIn(('welcome', 'en'), actual)

    def test_json_formatting_order_and_unicode_escapes_do_not_change_speech(self):
        reordered = dict(reversed(list(self.copy.items())))
        for formatting in ({'indent': 4, 'ensure_ascii': True}, {'separators': (',', ':'), 'ensure_ascii': False}):
            self.assertEqual(self.read_fixture(reordered, **formatting), tools.speech_texts())

    def test_json_quotes_and_backslashes_are_decoded_not_spoken_as_escapes(self):
        self.copy['de']['quoteReply'] = 'Ein "Angebot" mit Pfad C:\\Plan und Grüße.'
        self.assertEqual(self.read_fixture(self.copy)[('quoteReply', 'de')], self.copy['de']['quoteReply'])

    def test_missing_locales_or_speech_keys_are_explicit_errors(self):
        for locale in ('de', 'nl', 'fr', 'en'):
            value = copy.deepcopy(self.copy)
            del value[locale]
            with self.subTest(locale=locale), self.assertRaises(tools.ProviderError) as caught:
                self.read_fixture(value)
            self.assertEqual(caught.exception.code, 'speech_copy_invalid')
        for locale in ('de', 'nl', 'fr'):
            for key in tools.SPEECH_KEYS:
                value = copy.deepcopy(self.copy)
                del value[locale][key]
                with self.subTest(locale=locale, key=key), self.assertRaises(tools.ProviderError):
                    self.read_fixture(value)

    def test_invalid_strings_and_shapes_never_return_partial_or_empty_copy(self):
        for invalid in (None, False, 12, [], {}, '', ' \t\n '):
            value = copy.deepcopy(self.copy)
            value['nl']['choose'] = invalid
            with self.subTest(invalid=invalid), self.assertRaises(tools.ProviderError):
                self.read_fixture(value)
        for value in ([], None, {'de': 'bad'}, {**self.copy, 'it': self.copy['de']}):
            with self.subTest(value_type=type(value).__name__), self.assertRaises(tools.ProviderError):
                self.read_fixture(value)

    def test_missing_malformed_and_duplicate_json_fail_explicitly(self):
        with self.assertRaises(tools.ProviderError) as caught:
            tools.speech_texts(self.source)
        self.assertEqual(caught.exception.code, 'speech_copy_unavailable')
        for raw in ('{', '{"de":{},"de":{}}', '{"de":{"welcome":"a","welcome":"b"}}'):
            self.source.write_text(raw, encoding='utf-8')
            with self.subTest(raw=raw), self.assertRaises(tools.ProviderError) as caught:
                tools.speech_texts(self.source)
            self.assertEqual(caught.exception.code, 'speech_copy_invalid')

    def test_audio_uses_canonical_text_and_cache_without_provider_or_english_grant(self):
        calls = []
        class Reply(io.BytesIO):
            status = 200
            headers = {'Content-Type': 'audio/mpeg'}
        def opener(request, timeout):
            calls.append(json.loads(request.data)['text'])
            return Reply(b'ID3' + b'\0' * 1024)
        service = tools.SpeechService('offline-fixture', 'fixturevoice0001', Path(self.tmp.name) / 'cache', opener=opener)
        first = service.audio('quoteReply', 'fr')
        self.assertEqual(service.audio('quoteReply', 'fr'), first)
        self.assertEqual(calls, [self.copy['fr']['quoteReply']])
        self.assertIsNone(service.audio('welcome', 'en'))
        self.assertIsNone(service.audio('details', 'de'))
        self.assertEqual(len(calls), 1)


if __name__ == '__main__':
    unittest.main()
