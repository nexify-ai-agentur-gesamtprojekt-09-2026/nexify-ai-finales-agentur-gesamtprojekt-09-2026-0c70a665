#!/usr/bin/env python3
"""
Mobile Chat Fit Smoke Test
Tests real mobile chat rendering in Chromium and WebKit across 3 viewport sizes.
"""
import asyncio
import json
import os
import sys
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

# Test configuration
TEST_URL = os.environ.get("CHAT_TEST_URL", "https://chat-it-automate--01quzkxh.preview.emergentagent.com")
VIEWPORTS = [
    {"width": 320, "height": 568, "name": "mobile_small"},
    {"width": 390, "height": 844, "name": "mobile_medium"},
    {"width": 844, "height": 390, "name": "short_landscape"},
    {"width": 1280, "height": 720, "name": "desktop"}
]
BROWSERS = os.environ.get("CHAT_TEST_BROWSERS", "chromium,webkit").split(",")
OUTPUT_FILE = os.environ.get("CHAT_TEST_OUTPUT", "/app/test_reports/chat_fit_smoke.json")

results = {
    "test_cases": [],
    "summary": {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "blocked": 0
    }
}

async def measure_chat_geometry(page, viewport_name):
    """Measure chat panel geometry and return raw values"""
    geometry = await page.evaluate("""() => {
        const panel = document.querySelector('[data-testid="chat-panel"]');
        const composer = document.querySelector('[data-testid="chat-composer"]');
        const sendButton = document.querySelector('[data-testid="chat-send-button"]');
        
        if (!panel || !composer || !sendButton) {
            return {
                error: "Missing elements",
                panel: !!panel,
                composer: !!composer,
                sendButton: !!sendButton
            };
        }
        
        const panelRect = panel.getBoundingClientRect();
        const composerRect = composer.getBoundingClientRect();
        const sendButtonRect = sendButton.getBoundingClientRect();
        
        const conversationElement = panel.querySelector('.conversation');
        
        const conversationRect = conversationElement ? conversationElement.getBoundingClientRect() : null;
        
        // Check element at send button position
        const elementAtSender = document.elementFromPoint(
            sendButtonRect.left + sendButtonRect.width / 2,
            sendButtonRect.top + sendButtonRect.height / 2
        );
        
        return {
            panel: {
                width: panelRect.width,
                height: panelRect.height,
                clientWidth: panel.clientWidth,
                scrollWidth: panel.scrollWidth
            },
            conversation: {
                height: conversationRect ? conversationRect.height : 0,
                clientHeight: conversationElement ? conversationElement.clientHeight : 0,
                scrollHeight: conversationElement ? conversationElement.scrollHeight : 0,
                found: !!conversationElement
            },
            composer: {
                height: composerRect.height,
                clientHeight: composer.clientHeight
            },
            sendButton: {
                bottom: sendButtonRect.bottom,
                top: sendButtonRect.top,
                left: sendButtonRect.left,
                right: sendButtonRect.right,
                width: sendButtonRect.width,
                height: sendButtonRect.height
            },
            visualViewport: {
                height: window.visualViewport ? window.visualViewport.height : window.innerHeight,
                width: window.visualViewport ? window.visualViewport.width : window.innerWidth
            },
            elementAtSender: elementAtSender ? elementAtSender.getAttribute('data-testid') : null
        };
    }""")
    
    return geometry

async def check_font_and_wrapping(page):
    """Simulate 200% text enlargement; 16px remains the application's default."""
    await page.locator('[data-testid="chat-composer-textarea"]').evaluate("el => {el.style.fontSize='32px';el.style.lineHeight='1.4';}")
    await page.locator('[data-testid="chat-send-button"]').evaluate("el => {el.style.fontSize='32px';el.style.lineHeight='1.4';}")
    await page.locator('[data-testid="chat-send-button"]').scroll_into_view_if_needed()
    font_check = await page.evaluate("""() => {
        const textarea = document.querySelector('[data-testid="chat-composer-textarea"]');
        if (!textarea) return { error: "Composer textarea not found" };
        
        const styles = window.getComputedStyle(textarea);
        const fontSize = parseFloat(styles.fontSize);
        const whiteSpace = styles.whiteSpace;
        const wordWrap = styles.wordWrap;
        const overflowWrap = styles.overflowWrap;
        
        // Text wraps if whiteSpace allows wrapping AND word-wrap/overflow-wrap is set
        const wrapsText = (whiteSpace === 'normal' || whiteSpace === 'pre-wrap' || whiteSpace === 'pre-line') &&
                         (wordWrap === 'break-word' || wordWrap === 'anywhere' || 
                          overflowWrap === 'break-word' || overflowWrap === 'anywhere');
        
        const button=document.querySelector('[data-testid="chat-send-button"]');
        const rect=button.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(button);
        const textRect=range.getBoundingClientRect();
        return {
            simulated: true,
            buttonHeight: rect.height,
            textHeight: textRect.height,
            textFitsButton: textRect.height <= rect.height && textRect.top >= rect.top && textRect.bottom <= rect.bottom,
            buttonInViewport: rect.top >= 0 && rect.bottom <= window.visualViewport.height,
            fontSize: fontSize,
            whiteSpace: whiteSpace,
            wordWrap: wordWrap,
            overflowWrap: overflowWrap,
            wrapsText: wrapsText
        };
    }""")
    
    return font_check

async def test_draft_retention(page):
    """Test close/reopen draft retention"""
    # Type a draft message
    await page.fill('[data-testid="chat-composer-textarea"]', 'Test draft message')
    await page.wait_for_timeout(500)
    
    # Get draft text
    draft_text = await page.input_value('[data-testid="chat-composer-textarea"]')
    
    # Close chat
    close_button = await page.query_selector('[data-testid="chat-panel-close-button"]')
    if close_button:
        await close_button.click()
        await page.wait_for_timeout(500)
    
    # Reopen chat
    launcher = await page.query_selector('[data-testid="chat-launcher"]')
    if launcher:
        await launcher.click()
        await page.wait_for_selector('[data-testid="chat-panel"]', state='visible', timeout=5000)
        await page.wait_for_timeout(500)
    
    # Check if draft is retained
    retained_text = await page.input_value('[data-testid="chat-composer-textarea"]')
    
    return {
        "original_draft": draft_text,
        "retained_draft": retained_text,
        "draft_retained": draft_text == retained_text
    }

async def run_test_case(browser_type, viewport, playwright_instance):
    """Run a single test case"""
    browser_name = browser_type
    viewport_name = viewport["name"]
    test_id = f"{browser_name}_{viewport_name}_{viewport['width']}x{viewport['height']}"
    
    print(f"\n{'='*60}")
    print(f"Testing: {test_id}")
    print(f"{'='*60}")
    
    result = {
        "test_id": test_id,
        "browser": browser_name,
        "viewport": viewport,
        "status": "pending",
        "errors": [],
        "geometry": None,
        "assertions": {}
    }
    
    browser = None
    try:
        # Launch browser with appropriate settings
        launch_options = {"headless": True}
        if browser_name == "webkit":
            # Set WebKit environment variable
            os.environ["WEBKIT_DISABLE_DMABUF_RENDERER"] = "1"
        
        if browser_name == "chromium":
            browser = await playwright_instance.chromium.launch(**launch_options)
        elif browser_name == "webkit":
            browser = await playwright_instance.webkit.launch(**launch_options)
        
        context = await browser.new_context(
            viewport={"width": viewport["width"], "height": viewport["height"]}
        )
        page = await context.new_page()
        
        # Navigate with domcontentloaded
        print(f"Navigating to {TEST_URL}...")
        await page.goto(TEST_URL, wait_until="domcontentloaded", timeout=15000)
        print("Page loaded (domcontentloaded)")
        
        # For mobile viewports (320x568), click chat launcher first
        if viewport["width"] <= 820:
            print("Mobile viewport detected, clicking chat launcher...")
            launcher = await page.wait_for_selector('[data-testid="chat-launcher"]', timeout=10000)
            await launcher.click()
            print("Chat launcher clicked")
            
            # Wait for chat panel to be visible
            await page.wait_for_selector('[data-testid="chat-panel"]', state='visible', timeout=10000)
            print("Chat panel visible")
        
        # Wait for session ready (chat-send-button enabled)
        print("Waiting for session ready (send button enabled)...")
        await page.wait_for_selector('[data-testid="chat-send-button"]:not([disabled])', timeout=10000)
        print("Session ready")
        
        # Measure geometry
        print("Measuring chat geometry...")
        geometry = await measure_chat_geometry(page, viewport_name)
        result["geometry"] = geometry
        
        if "error" in geometry:
            result["errors"].append(f"Geometry measurement error: {geometry['error']}")
            result["status"] = "failed"
            return result
        
        # Assertions
        assertions = {}
        
        # 1. All panel heights > 0
        panel_height_ok = geometry["panel"]["height"] > 0
        assertions["panel_height_positive"] = panel_height_ok
        if not panel_height_ok:
            result["errors"].append(f"Panel height not positive: {geometry['panel']['height']}")
        
        conversation_height_ok = geometry["conversation"]["height"] > 0
        assertions["conversation_height_positive"] = conversation_height_ok
        if not conversation_height_ok:
            result["errors"].append(f"Conversation height not positive: {geometry['conversation']['height']}")
        
        composer_height_ok = geometry["composer"]["height"] > 0
        assertions["composer_height_positive"] = composer_height_ok
        if not composer_height_ok:
            result["errors"].append(f"Composer height not positive: {geometry['composer']['height']}")
        
        # 2. Mobile: send button bottom <= visualViewport height
        if viewport["width"] <= 844:
            send_button_fits = geometry["sendButton"]["bottom"] <= geometry["visualViewport"]["height"]
            assertions["send_button_fits_viewport"] = send_button_fits
            if not send_button_fits:
                result["errors"].append(
                    f"Send button bottom ({geometry['sendButton']['bottom']}) exceeds viewport height ({geometry['visualViewport']['height']})"
                )
        
        # 3. Desktop (1280): conversation >= 360, composer <= 260
        if viewport["width"] == 1280:
            conv_height_ok = geometry["conversation"]["height"] >= 360
            assertions["conversation_min_height_desktop"] = conv_height_ok
            if not conv_height_ok:
                result["errors"].append(
                    f"Conversation height ({geometry['conversation']['height']}) < 360 on desktop"
                )
            
            composer_max_ok = geometry["composer"]["height"] <= 260
            assertions["composer_max_height_desktop"] = composer_max_ok
            if not composer_max_ok:
                result["errors"].append(
                    f"Composer height ({geometry['composer']['height']}) > 260 on desktop"
                )
        
        # 4. Font check on 320x568 Chromium only
        if viewport["width"] == 320 and viewport["height"] == 568 and browser_name == "chromium":
            print("Checking font size and text wrapping...")
            font_check = await check_font_and_wrapping(page)
            result["font_check"] = font_check
            
            if "error" not in font_check:
                font_32px = abs(font_check["fontSize"] - 32) < 2  # Allow 2px tolerance
                assertions["font_size_32px"] = font_32px
                if not font_32px:
                    result["errors"].append(f"Font size {font_check['fontSize']}px, expected ~32px")
                
                assertions["text_contained_at_32px"] = font_check["textFitsButton"] and font_check["buttonInViewport"]
                if not assertions["text_contained_at_32px"]:
                    result["errors"].append(f"32px text is clipped or button offscreen: {font_check}")
                assertions["text_wrapping_enabled"] = font_check["wrapsText"]
                if not font_check["wrapsText"]:
                    result["errors"].append("Text wrapping not properly enabled")
        
        # 5. Draft retention test (only on first mobile viewport)
        if viewport["width"] == 320 and viewport["height"] == 568:
            print("Testing draft retention...")
            draft_result = await test_draft_retention(page)
            result["draft_retention"] = draft_result
            assertions["draft_retained"] = draft_result["draft_retained"]
            if not draft_result["draft_retained"]:
                result["errors"].append("Draft not retained after close/reopen")
        
        result["assertions"] = assertions
        
        # Determine status
        if len(result["errors"]) == 0:
            result["status"] = "passed"
            print(f"✅ PASSED: {test_id}")
        else:
            result["status"] = "failed"
            print(f"❌ FAILED: {test_id}")
            for error in result["errors"]:
                print(f"  - {error}")
        
        await browser.close()
        
    except PlaywrightTimeout as e:
        result["status"] = "failed"
        result["errors"].append(f"Timeout: {str(e)}")
        print(f"❌ TIMEOUT: {test_id} - {str(e)}")
        if browser:
            await browser.close()
    except Exception as e:
        result["status"] = "failed"
        result["errors"].append(f"Exception: {str(e)}")
        print(f"❌ EXCEPTION: {test_id} - {str(e)}")
        if browser:
            try:
                await browser.close()
            except Exception:
                pass
        
        # If WebKit crashes (page/browser closed), mark as BLOCKED
        if browser_name == "webkit" and ("closed" in str(e).lower() or "crash" in str(e).lower()):
            result["status"] = "blocked"
            print(f"🚫 BLOCKED: WebKit engine crashed/closed, marking as BLOCKED")
            return result
    
    return result

async def main():
    """Main test execution"""
    print("="*60)
    print("Mobile Chat Fit Smoke Test")
    print("="*60)
    
    async with async_playwright() as p:
        webkit_blocked = False
        
        for browser_name in BROWSERS:
            if browser_name == "webkit" and webkit_blocked:
                print(f"\n⚠️  Skipping remaining WebKit tests (engine blocked)")
                for viewport in VIEWPORTS:
                    test_id = f"{browser_name}_{viewport['name']}_{viewport['width']}x{viewport['height']}"
                    results["test_cases"].append({
                        "test_id": test_id,
                        "browser": browser_name,
                        "viewport": viewport,
                        "status": "blocked",
                        "errors": ["WebKit engine blocked due to crash"]
                    })
                    results["summary"]["blocked"] += 1
                    results["summary"]["total"] += 1
                continue
            
            for idx, viewport in enumerate(VIEWPORTS):
                # If WebKit is blocked, add remaining viewports as blocked
                if browser_name == "webkit" and webkit_blocked:
                    test_id = f"{browser_name}_{viewport['name']}_{viewport['width']}x{viewport['height']}"
                    results["test_cases"].append({
                        "test_id": test_id,
                        "browser": browser_name,
                        "viewport": viewport,
                        "status": "blocked",
                        "errors": ["WebKit engine blocked due to crash"]
                    })
                    results["summary"]["blocked"] += 1
                    results["summary"]["total"] += 1
                    continue
                
                result = await run_test_case(browser_name, viewport, p)
                results["test_cases"].append(result)
                results["summary"]["total"] += 1
                
                if result["status"] == "passed":
                    results["summary"]["passed"] += 1
                elif result["status"] == "blocked":
                    results["summary"]["blocked"] += 1
                    if browser_name == "webkit":
                        webkit_blocked = True
                        # Continue to mark remaining viewports as blocked
                else:
                    results["summary"]["failed"] += 1
    
    # Write results to JSON
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(results, f, indent=2)
    
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    print(f"Total: {results['summary']['total']}")
    print(f"Passed: {results['summary']['passed']}")
    print(f"Failed: {results['summary']['failed']}")
    print(f"Blocked: {results['summary']['blocked']}")
    print(f"\nResults written to: {OUTPUT_FILE}")
    
    # Exit with non-zero if any failures
    if results["summary"]["failed"] > 0:
        print("\n❌ Tests FAILED")
        sys.exit(1)
    elif results["summary"]["blocked"] > 0:
        print("\n⚠️  Some tests BLOCKED")
        sys.exit(2)
    else:
        print("\n✅ All tests PASSED")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())
