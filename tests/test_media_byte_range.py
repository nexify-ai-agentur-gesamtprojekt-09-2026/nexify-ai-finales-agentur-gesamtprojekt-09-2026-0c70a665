#!/usr/bin/env python3
"""
Media Byte Range Unit Tests
Tests the mediaByteRange helper from apps/site/scripts/media-byte-range.mjs
Tests: absent/suffix/open/closed/out-of-bounds/reversed/zero/multi/If-Range adapter, HEAD no body
Real preview HTTP 206 tests against /media/home-review/welcome-elevenlabs-v4.mp3 and /media/home-loops/welcome-loop.mp4
"""
import json
import os
import subprocess
import sys
import requests

# Test configuration
PREVIEW_URL = os.environ.get("PREVIEW_URL", "https://fresh-sync--3on01101.preview.emergentagent.com")
OUTPUT_FILE = "/app/test_reports/media_byte_range_test.json"

results = {
    "unit_tests": [],
    "http_tests": [],
    "summary": {
        "total": 0,
        "passed": 0,
        "failed": 0
    }
}

def invoke_node_range_helper(header, size):
    """Invoke the mediaByteRange function via Node.js"""
    header_js = "null" if header is None else repr(header)
    script = f"""
    import {{mediaByteRange}} from '/app/apps/site/scripts/media-byte-range.mjs';
    const result = mediaByteRange({header_js}, {size});
    console.log(JSON.stringify(result));
    """
    
    try:
        result = subprocess.run(
            ['node', '--input-type=module', '-e', script],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return json.loads(result.stdout.strip())
        else:
            return {"error": result.stderr}
    except Exception as e:
        return {"error": str(e)}

def test_unit_case(name, header, size, expected_status, expected_start=None, expected_end=None):
    """Test a single unit case"""
    print(f"\n🔍 Testing: {name}")
    result = {
        "name": name,
        "header": header,
        "size": size,
        "expected": {
            "status": expected_status,
            "start": expected_start,
            "end": expected_end
        },
        "actual": None,
        "status": "pending",
        "errors": []
    }
    
    actual = invoke_node_range_helper(header, size)
    result["actual"] = actual
    
    if "error" in actual:
        result["status"] = "failed"
        result["errors"].append(f"Invocation error: {actual['error']}")
        print(f"❌ FAILED: {name} - {actual['error']}")
        return result
    
    # Check status
    if actual.get("status") != expected_status:
        result["status"] = "failed"
        result["errors"].append(f"Status mismatch: expected {expected_status}, got {actual.get('status')}")
    
    # Check start/end if status is 206
    if expected_status == 206:
        if expected_start is not None and actual.get("start") != expected_start:
            result["status"] = "failed"
            result["errors"].append(f"Start mismatch: expected {expected_start}, got {actual.get('start')}")
        
        if expected_end is not None and actual.get("end") != expected_end:
            result["status"] = "failed"
            result["errors"].append(f"End mismatch: expected {expected_end}, got {actual.get('end')}")
    
    if result["status"] == "pending":
        result["status"] = "passed"
        print(f"✅ PASSED: {name}")
    else:
        print(f"❌ FAILED: {name}")
        for error in result["errors"]:
            print(f"  - {error}")
    
    return result

def test_http_range(name, path, range_header=None, method="GET", expected_status=200):
    """Test HTTP range request against preview server"""
    print(f"\n🔍 Testing HTTP: {name}")
    url = f"{PREVIEW_URL}{path}"
    
    result = {
        "name": name,
        "url": url,
        "method": method,
        "range_header": range_header,
        "expected_status": expected_status,
        "actual_status": None,
        "headers": {},
        "body_length": None,
        "status": "pending",
        "errors": []
    }
    
    try:
        headers = {}
        if range_header:
            headers["Range"] = range_header
        
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "HEAD":
            response = requests.head(url, headers=headers, timeout=10)
        
        result["actual_status"] = response.status_code
        result["headers"] = dict(response.headers)
        result["body_length"] = len(response.content) if method == "GET" else 0
        
        # Check status
        if response.status_code != expected_status:
            result["status"] = "failed"
            result["errors"].append(f"Status mismatch: expected {expected_status}, got {response.status_code}")
        
        # For 206 responses, check Content-Range header
        if expected_status == 206:
            if "Content-Range" not in response.headers:
                result["status"] = "failed"
                result["errors"].append("Missing Content-Range header")
            else:
                # Verify body length matches range
                content_range = response.headers.get("Content-Range", "")
                if content_range.startswith("bytes "):
                    parts = content_range.split()[1].split("/")
                    if len(parts) == 2:
                        range_part = parts[0]
                        if "-" in range_part:
                            start, end = map(int, range_part.split("-"))
                            expected_length = end - start + 1
                            if method == "GET" and result["body_length"] != expected_length:
                                result["status"] = "failed"
                                result["errors"].append(f"Body length mismatch: expected {expected_length}, got {result['body_length']}")
        
        # For HEAD requests, verify no body
        if method == "HEAD" and result["body_length"] > 0:
            result["status"] = "failed"
            result["errors"].append(f"HEAD request returned body (length: {result['body_length']})")
        
        # For 416 responses, check Content-Range header
        if expected_status == 416:
            if "Content-Range" not in response.headers:
                result["status"] = "failed"
                result["errors"].append("Missing Content-Range header for 416 response")
        
        if result["status"] == "pending":
            result["status"] = "passed"
            print(f"✅ PASSED: {name}")
        else:
            print(f"❌ FAILED: {name}")
            for error in result["errors"]:
                print(f"  - {error}")
    
    except Exception as e:
        result["status"] = "failed"
        result["errors"].append(f"Exception: {str(e)}")
        print(f"❌ FAILED: {name} - {str(e)}")
    
    return result

def main():
    """Main test execution"""
    print("="*60)
    print("Media Byte Range Tests")
    print("="*60)
    
    # Unit tests
    print("\n" + "="*60)
    print("UNIT TESTS")
    print("="*60)
    
    unit_tests = [
        # Absent (no Range header)
        ("absent", None, 1000, 200, 0, 999),
        
        # Suffix range (last N bytes)
        ("suffix_100", "bytes=-100", 1000, 206, 900, 999),
        ("suffix_all", "bytes=-1000", 1000, 206, 0, 999),
        ("suffix_more_than_size", "bytes=-2000", 1000, 206, 0, 999),
        
        # Open range (from start to end)
        ("open_from_0", "bytes=0-", 1000, 206, 0, 999),
        ("open_from_500", "bytes=500-", 1000, 206, 500, 999),
        
        # Closed range (specific start and end)
        ("closed_0_1", "bytes=0-1", 1000, 206, 0, 1),
        ("closed_500_599", "bytes=500-599", 1000, 206, 500, 599),
        ("closed_end_beyond", "bytes=500-1500", 1000, 206, 500, 999),
        
        # Out of bounds
        ("out_of_bounds_start", "bytes=1000-1999", 1000, 416),
        ("out_of_bounds_both", "bytes=2000-2999", 1000, 416),
        
        # Reversed (start > end)
        ("reversed", "bytes=500-100", 1000, 416),
        
        # Zero size
        ("zero_size", "bytes=0-0", 0, 416),
        
        # Multi-range (should be ignored, return 200)
        ("multi_range", "bytes=0-100,200-300", 1000, 200, 0, 999),
        
        # Invalid formats
        ("invalid_no_dash", "bytes=100", 1000, 416),
        ("invalid_empty", "bytes=-", 1000, 416),
        ("invalid_unit", "items=0-100", 1000, 200, 0, 999),
    ]
    
    for test_args in unit_tests:
        result = test_unit_case(*test_args)
        results["unit_tests"].append(result)
        results["summary"]["total"] += 1
        if result["status"] == "passed":
            results["summary"]["passed"] += 1
        else:
            results["summary"]["failed"] += 1
    
    # HTTP tests
    print("\n" + "="*60)
    print("HTTP TESTS")
    print("="*60)
    
    http_tests = [
        # HEAD requests (no body)
        ("HEAD mp3 no range", "/media/home-review/welcome-elevenlabs-v4.mp3", None, "HEAD", 200),
        ("HEAD mp4 no range", "/media/home-loops/welcome-loop.mp4", None, "HEAD", 200),
        
        # GET with range (206)
        ("GET mp3 bytes 0-1", "/media/home-review/welcome-elevenlabs-v4.mp3", "bytes=0-1", "GET", 206),
        ("GET mp4 bytes 0-1", "/media/home-loops/welcome-loop.mp4", "bytes=0-1", "GET", 206),
        
        # GET with suffix range
        ("GET mp3 suffix -100", "/media/home-review/welcome-elevenlabs-v4.mp3", "bytes=-100", "GET", 206),
        ("GET mp4 suffix -100", "/media/home-loops/welcome-loop.mp4", "bytes=-100", "GET", 206),
        
        # GET with open range
        ("GET mp3 open from 1000", "/media/home-review/welcome-elevenlabs-v4.mp3", "bytes=1000-", "GET", 206),
        ("GET mp4 open from 1000", "/media/home-loops/welcome-loop.mp4", "bytes=1000-", "GET", 206),
        
        # GET with out-of-bounds range (416)
        ("GET mp3 out of bounds", "/media/home-review/welcome-elevenlabs-v4.mp3", "bytes=999999999-999999999", "GET", 416),
        ("GET mp4 out of bounds", "/media/home-loops/welcome-loop.mp4", "bytes=999999999-999999999", "GET", 416),
        
        # GET with If-Range (should fall back to full response since we don't validate)
        # Note: preview-server.mjs ignores If-Range, so this should return 200
        ("GET mp3 with If-Range", "/media/home-review/welcome-elevenlabs-v4.mp3", "bytes=0-1", "GET", 200),
    ]
    
    # For the If-Range test, we need to add the If-Range header separately
    # Let's modify the last test
    http_tests_modified = []
    for test in http_tests[:-1]:
        http_tests_modified.append(test)
    
    # Add If-Range test with custom handling
    print(f"\n🔍 Testing HTTP: GET mp3 with If-Range")
    url = f"{PREVIEW_URL}/media/home-review/welcome-elevenlabs-v4.mp3"
    try:
        headers = {"Range": "bytes=0-1", "If-Range": "some-etag"}
        response = requests.get(url, headers=headers, timeout=10)
        
        result = {
            "name": "GET mp3 with If-Range",
            "url": url,
            "method": "GET",
            "range_header": "bytes=0-1",
            "if_range": "some-etag",
            "expected_status": 200,
            "actual_status": response.status_code,
            "headers": dict(response.headers),
            "body_length": len(response.content),
            "status": "passed" if response.status_code == 200 else "failed",
            "errors": [] if response.status_code == 200 else [f"Expected 200, got {response.status_code}"]
        }
        
        if result["status"] == "passed":
            print(f"✅ PASSED: GET mp3 with If-Range")
        else:
            print(f"❌ FAILED: GET mp3 with If-Range")
        
        results["http_tests"].append(result)
        results["summary"]["total"] += 1
        if result["status"] == "passed":
            results["summary"]["passed"] += 1
        else:
            results["summary"]["failed"] += 1
    except Exception as e:
        print(f"❌ FAILED: GET mp3 with If-Range - {str(e)}")
        results["http_tests"].append({
            "name": "GET mp3 with If-Range",
            "status": "failed",
            "errors": [str(e)]
        })
        results["summary"]["total"] += 1
        results["summary"]["failed"] += 1
    
    # Run other HTTP tests
    for test_args in http_tests_modified:
        result = test_http_range(*test_args)
        results["http_tests"].append(result)
        results["summary"]["total"] += 1
        if result["status"] == "passed":
            results["summary"]["passed"] += 1
        else:
            results["summary"]["failed"] += 1
    
    # Write results
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(results, f, indent=2)
    
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    print(f"Total: {results['summary']['total']}")
    print(f"Passed: {results['summary']['passed']}")
    print(f"Failed: {results['summary']['failed']}")
    print(f"\nResults written to: {OUTPUT_FILE}")
    
    # Exit with non-zero if any failures
    if results["summary"]["failed"] > 0:
        print("\n❌ Tests FAILED")
        sys.exit(1)
    else:
        print("\n✅ All tests PASSED")
        sys.exit(0)

if __name__ == "__main__":
    main()
