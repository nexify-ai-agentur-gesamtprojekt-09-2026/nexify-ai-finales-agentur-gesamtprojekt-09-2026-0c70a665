"""Backend API tests for NeXify contact requests, operator endpoints, and SSR SEO."""
import hashlib
import json
import secrets
import sys
import time
from datetime import datetime

import requests

# Public endpoint from preview URL
import os
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
BASE_URL = os.environ.get('NEXT_PUBLIC_API_BASE_URL', 'https://chat-it-automate--01quzkxh.preview.emergentagent.com')
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']


class BackendTester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_session = requests.Session()  # Use session for cookies
        self.test_request_number = None
        self.test_event_key = None

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def test(self, name, func):
        """Run a single test"""
        self.tests_run += 1
        self.log(f"\n{'='*60}")
        self.log(f"TEST {self.tests_run}: {name}")
        self.log('='*60)
        try:
            func()
            self.tests_passed += 1
            self.log(f"✅ PASSED: {name}")
            return True
        except AssertionError as e:
            self.log(f"❌ FAILED: {name}")
            self.log(f"   Error: {str(e)}")
            return False
        except Exception as e:
            self.log(f"❌ ERROR: {name}")
            self.log(f"   Exception: {type(e).__name__}: {str(e)}")
            return False

    def admin_login(self):
        """Login as admin and get session cookie"""
        self.log("Logging in as admin...")
        response = self.admin_session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, f"Login failed: {response.status_code} {response.text}"
        data = response.json()
        assert "user_id" in data, "No user_id in login response"
        assert data.get("role") == "admin", f"Expected admin role, got {data.get('role')}"
        assert "tk_session" in self.admin_session.cookies, "No session cookie set"
        self.log(f"✓ Admin login successful, user_id: {data['user_id']}")

    def test_requests_validation(self):
        """Test /api/requests validates required fields"""
        self.log("Testing required field validation...")
        
        # Missing name
        response = requests.post(
            f"{BASE_URL}/api/requests",
            json={
                "name": "A",  # Too short
                "email": "test@example.com",
                "message": "Test message",
                "consent": True,
                "kind": "contact"
            },
            headers={"Idempotency-Key": secrets.token_urlsafe(32)},
            timeout=10
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Expected detail in error response"
        detail = data["detail"]
        assert "fields" in detail, "Expected fields in detail"
        assert "name" in detail["fields"], "Expected name field error"
        self.log("✓ Name validation works")

        # Invalid email
        response = requests.post(
            f"{BASE_URL}/api/requests",
            json={
                "name": "Test User",
                "email": "invalid-email",
                "message": "Test message",
                "consent": True,
                "kind": "contact"
            },
            headers={"Idempotency-Key": secrets.token_urlsafe(32)},
            timeout=10
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        assert "email" in data["detail"]["fields"], "Expected email field error"
        self.log("✓ Email validation works")

        # Message too short
        response = requests.post(
            f"{BASE_URL}/api/requests",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "message": "Short",  # Too short
                "consent": True,
                "kind": "contact"
            },
            headers={"Idempotency-Key": secrets.token_urlsafe(32)},
            timeout=10
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        assert "message" in data["detail"]["fields"], "Expected message field error"
        self.log("✓ Message validation works")

        # Missing consent
        response = requests.post(
            f"{BASE_URL}/api/requests",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "message": "This is a test message",
                "consent": False,
                "kind": "contact"
            },
            headers={"Idempotency-Key": secrets.token_urlsafe(32)},
            timeout=10
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        assert "consent" in data["detail"]["fields"], "Expected consent field error"
        self.log("✓ Consent validation works")

        # Missing idempotency key
        response = requests.post(
            f"{BASE_URL}/api/requests",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "message": "This is a test message",
                "consent": True,
                "kind": "contact"
            },
            timeout=10
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert data.get("detail", {}).get("error") == "idempotency_key_required", "Expected idempotency_key_required error"
        self.log("✓ Idempotency key validation works")

    def test_requests_idempotency(self):
        """Test /api/requests idempotency: same key returns same result"""
        self.log("Testing idempotency...")
        
        idempotency_key = secrets.token_urlsafe(32)
        payload = {
            "name": "TEST_Idempotency User",
            "email": "test_idempotency@example.com",
            "message": "Testing idempotency behavior",
            "consent": True,
            "kind": "contact",
            "page_path": "/kontakt"
        }

        # First request
        response1 = requests.post(
            f"{BASE_URL}/api/requests",
            json=payload,
            headers={"Idempotency-Key": idempotency_key},
            timeout=10
        )
        assert response1.status_code == 201, f"Expected 201, got {response1.status_code}: {response1.text}"
        data1 = response1.json()
        assert "number" in data1, f"Expected number in response, got: {data1}"
        assert "notification_status" in data1, f"Expected notification_status in response, got: {data1}"
        number1 = data1["number"]
        self.log(f"✓ First request created: {number1}, notification_status: {data1['notification_status']}")

        # Second request with same key - should return same result
        response2 = requests.post(
            f"{BASE_URL}/api/requests",
            json=payload,
            headers={"Idempotency-Key": idempotency_key},
            timeout=10
        )
        assert response2.status_code == 201, f"Expected 201, got {response2.status_code}"
        data2 = response2.json()
        assert data2["number"] == number1, f"Expected same number, got {data2['number']} vs {number1}"
        self.log(f"✓ Second request returned same result: {data2['number']}")

    def test_requests_conflict(self):
        """Test /api/requests returns 409 when payload changes with same idempotency key"""
        self.log("Testing conflict detection...")
        
        idempotency_key = secrets.token_urlsafe(32)
        
        # First request
        payload1 = {
            "name": "TEST_Conflict User",
            "email": "test_conflict@example.com",
            "message": "Original message for conflict test",
            "consent": True,
            "kind": "contact",
            "page_path": "/kontakt"
        }
        response1 = requests.post(
            f"{BASE_URL}/api/requests",
            json=payload1,
            headers={"Idempotency-Key": idempotency_key},
            timeout=10
        )
        assert response1.status_code == 201, f"Expected 201, got {response1.status_code}"
        self.log(f"✓ First request created: {response1.json()['number']}")

        # Second request with same key but different payload - should return 409
        payload2 = {
            "name": "TEST_Conflict User",
            "email": "test_conflict@example.com",
            "message": "CHANGED message for conflict test",  # Changed
            "consent": True,
            "kind": "contact",
            "page_path": "/kontakt"
        }
        response2 = requests.post(
            f"{BASE_URL}/api/requests",
            json=payload2,
            headers={"Idempotency-Key": idempotency_key},
            timeout=10
        )
        assert response2.status_code == 409, f"Expected 409, got {response2.status_code}: {response2.text}"
        data2 = response2.json()
        error = data2.get("detail", {}).get("error") if "detail" in data2 else data2.get("error")
        assert error == "idempotency_conflict", f"Expected idempotency_conflict, got {error}"
        self.log("✓ Conflict detected correctly (409)")

    def test_operator_requests_list(self):
        """Test /api/operator/requests LIST requires auth and serializes IDs"""
        self.log("Testing operator requests list...")
        
        # Without auth - should fail
        response = requests.get(f"{BASE_URL}/api/operator/requests", timeout=10)
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        self.log("✓ Unauthorized access blocked")

        # With admin auth
        if not self.admin_session.cookies.get("tk_session"):
            self.admin_login()
        
        response = self.admin_session.get(
            f"{BASE_URL}/api/operator/requests",
            timeout=10
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data, "Expected items in response"
        assert "stages" in data, "Expected stages in response"
        
        # Check that IDs are serialized (not _id)
        if data["items"]:
            item = data["items"][0]
            assert "id" in item, "Expected 'id' field in item"
            assert "_id" not in item, "Should not expose '_id' field"
            assert "payload_hash" not in item, "Should not expose 'payload_hash' field"
            self.log(f"✓ Found {len(data['items'])} requests, IDs properly serialized")
        else:
            self.log("✓ No requests found (empty list is valid)")

    def test_operator_requests_patch(self):
        """Test /api/operator/requests PATCH requires auth and updates stage"""
        self.log("Testing operator requests patch...")
        
        if not self.admin_session.cookies.get("tk_session"):
            self.admin_login()
        
        # First, get a request to update
        response = self.admin_session.get(
            f"{BASE_URL}/api/operator/requests",
            timeout=10
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        if not data["items"]:
            self.log("⚠ No requests to test PATCH (skipping)")
            return
        
        # Get first request number
        request_number = data["items"][0]["number"]
        self.log(f"Testing PATCH on request: {request_number}")
        
        # Without auth - should fail
        response = requests.patch(
            f"{BASE_URL}/api/operator/requests/{request_number}",
            json={"stage": "qualifizierung", "note": "Test note"},
            timeout=10
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        self.log("✓ Unauthorized PATCH blocked")
        
        # With admin auth
        response = self.admin_session.patch(
            f"{BASE_URL}/api/operator/requests/{request_number}",
            json={"stage": "qualifizierung", "note": "TEST: Stage update verification"},
            timeout=10
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        updated = response.json()
        assert updated["stage"] == "qualifizierung", f"Expected stage 'qualifizierung', got {updated['stage']}"
        assert "id" in updated, "Expected 'id' field in response"
        assert "payload_hash" not in updated, "Should not expose 'payload_hash' field"
        self.log(f"✓ Stage updated to: {updated['stage']}")

    def test_admin_outbox_delivery(self):
        """Test /api/admin/outbox/{event_key}/delivery returns last_event"""
        self.log("Testing admin outbox delivery status...")
        
        if not self.admin_session.cookies.get("tk_session"):
            self.admin_login()
        
        # First, get outbox entries
        response = self.admin_session.get(
            f"{BASE_URL}/api/admin/outbox",
            timeout=10
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        if not data.get("mails"):
            self.log("⚠ No outbox entries to test (skipping)")
            return
        
        # Get first mail event_key
        event_key = data["mails"][0]["id"]
        self.log(f"Testing delivery status for event_key: {event_key}")
        
        # Get delivery status
        response = self.admin_session.get(
            f"{BASE_URL}/api/admin/outbox/{event_key}/delivery",
            timeout=10
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        delivery = response.json()
        assert "id" in delivery, "Expected 'id' field"
        assert "status" in delivery, "Expected 'status' field"
        assert "provider_id" in delivery, "Expected 'provider_id' field"
        assert "provider_event" in delivery, "Expected 'provider_event' field (can be null)"
        self.log(f"✓ Delivery status: {delivery['status']}, provider_event: {delivery.get('provider_event')}")

    def run_all_tests(self):
        """Run all backend tests"""
        self.log("\n" + "="*60)
        self.log("STARTING BACKEND API TESTS")
        self.log("="*60)
        
        # Run tests
        self.test("Admin Login", self.admin_login)
        self.test("Requests Validation", self.test_requests_validation)
        self.test("Requests Idempotency", self.test_requests_idempotency)
        self.test("Requests Conflict (409)", self.test_requests_conflict)
        self.test("Operator Requests LIST (Auth + Serialization)", self.test_operator_requests_list)
        self.test("Operator Requests PATCH (Auth + Update)", self.test_operator_requests_patch)
        self.test("Admin Outbox Delivery Status", self.test_admin_outbox_delivery)
        
        # Summary
        self.log("\n" + "="*60)
        self.log("BACKEND TEST SUMMARY")
        self.log("="*60)
        self.log(f"Tests Run: {self.tests_run}")
        self.log(f"Tests Passed: {self.tests_passed}")
        self.log(f"Tests Failed: {self.tests_run - self.tests_passed}")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return 0 if self.tests_passed == self.tests_run else 1


if __name__ == "__main__":
    tester = BackendTester()
    sys.exit(tester.run_all_tests())
