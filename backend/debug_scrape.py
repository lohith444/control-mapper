#!/usr/bin/env python3
"""
Debug script - run from backend/ directory with venv activated:
  python debug_scrape.py
"""
import asyncio

async def test_playwright(url):
    try:
        from playwright.async_api import async_playwright
        print(f"\n[Playwright] Fetching: {url}")
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(4000)
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(2000)

            # Try getting all visible text
            text = await page.inner_text("body")
            print(f"[Playwright] Got {len(text)} chars")
            print(f"[Playwright] First 2000 chars:\n{text[:2000]}")
            print(f"\n[Playwright] Last 500 chars:\n{text[-500:]}")

            # Also dump page title and URL
            print(f"\n[Playwright] Page title: {await page.title()}")
            print(f"[Playwright] Final URL: {page.url}")

            await browser.close()
    except Exception as e:
        print(f"[Playwright] ERROR: {e}")

async def test_httpx(url):
    try:
        import httpx
        print(f"\n[httpx] Fetching: {url}")
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            print(f"[httpx] Status: {resp.status_code}")
            print(f"[httpx] Got {len(resp.text)} chars")
            print(f"[httpx] First 1000 chars:\n{resp.text[:1000]}")
    except Exception as e:
        print(f"[httpx] ERROR: {e}")

async def main():
    url = "https://trust.oneleet.com/novoflow?tab=securityControls"
    await test_playwright(url)
    await test_httpx(url)

asyncio.run(main())