"""Test FAQ SSR/SEO for 10 routes with 8 FAQ items, canonical, hreflang, JSON-LD"""
import requests
import json
from bs4 import BeautifulSoup
import sys

BASE_URL = "https://chat-it-automate--01quzkxh.preview.emergentagent.com"

FAQ_ROUTES = [
    "/leistungen",
    "/leistungen/websites",
    "/leistungen/agenten-automatisierung",
    "/leistungen/apps-portale",
    "/leistungsumfang",
    "/loesungen",
    "/preise-ablauf",
    "/produkte/nex2fly",
    "/produkte/one",
    "/produkte/api"
]

LOCALES = ["de", "nl", "fr", "en"]

class FAQSSRTester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def test_route(self, route, locale="de"):
        """Test a single route for SSR/SEO"""
        url = f"{BASE_URL}{route}"
        if locale != "de":
            url += f"?lang={locale}"
        
        print(f"\n{'='*60}")
        print(f"Testing: {route} (locale: {locale})")
        print('='*60)
        
        try:
            response = requests.get(url, timeout=10)
            if response.status_code != 200:
                print(f"✗ HTTP {response.status_code}")
                return False
            
            soup = BeautifulSoup(response.text, 'html.parser')
            issues = []
            
            # Check canonical
            canonical = soup.find('link', rel='canonical')
            if canonical and canonical.get('href'):
                print(f"✓ Canonical: {canonical['href']}")
            else:
                issues.append("Missing canonical link")
                print("✗ Missing canonical link")
            
            # Check hreflang tags
            hreflang_tags = soup.find_all('link', rel='alternate', hreflang=True)
            found_locales = [tag['hreflang'] for tag in hreflang_tags]
            expected_hreflang = ['de', 'nl', 'fr', 'en', 'x-default']
            
            if set(expected_hreflang).issubset(set(found_locales)):
                print(f"✓ Hreflang tags: {', '.join(found_locales)}")
            else:
                missing = set(expected_hreflang) - set(found_locales)
                issues.append(f"Missing hreflang: {', '.join(missing)}")
                print(f"✗ Missing hreflang: {', '.join(missing)}")
            
            # Check JSON-LD FAQPage schema
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            faq_schema = None
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string)
                    for i, node in enumerate(data.get('@graph', [data]) if isinstance(data, dict) else []):
                        if isinstance(node, dict) and node.get('@type') == 'FAQPage':
                            faq_schema = node
                            break
                    if faq_schema:
                        break
                except (ValueError, TypeError):
                    pass
            
            if faq_schema:
                questions = faq_schema.get('mainEntity', [])
                if len(questions) >= 8:
                    print(f"✓ JSON-LD FAQPage with {len(questions)} questions")
                else:
                    issues.append(f"JSON-LD has only {len(questions)} questions (expected 8)")
                    print(f"⚠ JSON-LD has only {len(questions)} questions (expected 8)")
            else:
                issues.append("Missing JSON-LD FAQPage schema")
                print("✗ Missing JSON-LD FAQPage schema")
            
            # Check FAQ items in HTML
            faq_items = soup.find_all(attrs={'data-testid': lambda x: x and x.startswith('page-faq-item-')})
            if len(faq_items) >= 8:
                print(f"✓ Found {len(faq_items)} FAQ items in HTML")
            else:
                issues.append(f"Only {len(faq_items)} FAQ items in HTML (expected 8)")
                print(f"⚠ Only {len(faq_items)} FAQ items in HTML (expected 8)")
            
            # Check title and description
            title = soup.find('title')
            description = soup.find('meta', attrs={'name': 'description'})
            
            if title and title.string:
                print(f"✓ Title: {title.string[:60]}...")
            else:
                issues.append("Missing title")
                print("✗ Missing title")
            
            if description and description.get('content'):
                print(f"✓ Description: {description['content'][:60]}...")
            else:
                issues.append("Missing meta description")
                print("✗ Missing meta description")
            
            self.results.append({
                'route': route,
                'locale': locale,
                'status': 'PASS' if not issues else 'FAIL',
                'issues': issues
            })
            
            if not issues:
                print("✅ All checks passed")
                return True
            else:
                print(f"❌ {len(issues)} issue(s) found")
                return False
                
        except Exception as e:
            print(f"✗ Error: {str(e)}")
            self.results.append({
                'route': route,
                'locale': locale,
                'status': 'ERROR',
                'issues': [str(e)]
            })
            return False

    def run_all_tests(self):
        """Run tests for all routes"""
        print("\n" + "="*60)
        print("STARTING FAQ SSR/SEO TESTS")
        print("="*60)
        
        # Test all routes with German locale
        for route in FAQ_ROUTES:
            self.tests_run += 1
            if self.test_route(route, "de"):
                self.tests_passed += 1
        
        # Test one route with all locales
        print("\n" + "="*60)
        print("TESTING LOCALE SWITCHING: /leistungen/websites")
        print("="*60)
        
        for locale in LOCALES:
            self.tests_run += 1
            if self.test_route("/leistungen/websites", locale):
                self.tests_passed += 1
        
        # Summary
        print("\n" + "="*60)
        print("FAQ SSR/SEO TEST SUMMARY")
        print("="*60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Detailed results
        print("\n" + "="*60)
        print("DETAILED RESULTS")
        print("="*60)
        
        failed = [r for r in self.results if r['status'] != 'PASS']
        if failed:
            print(f"\n{len(failed)} route(s) with issues:")
            for result in failed:
                print(f"\n{result['route']} ({result['locale']}):")
                for issue in result['issues']:
                    print(f"  - {issue}")
        else:
            print("\n✅ All routes passed all checks!")
        
        return 0 if self.tests_passed == self.tests_run else 1


if __name__ == "__main__":
    tester = FAQSSRTester()
    sys.exit(tester.run_all_tests())
