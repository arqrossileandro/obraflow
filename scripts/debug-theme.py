#!/usr/bin/env python3
"""Debug del theme toggle."""

import asyncio
import sys
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:3000"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"[{msg.type}] {msg.text}"))

        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        # Listar todos los botones del header
        print("\n=== Botones en el header ===")
        buttons = await page.query_selector_all("header button")
        for i, b in enumerate(buttons):
            txt = await b.inner_text()
            aria = await b.get_attribute("aria-label")
            title = await b.get_attribute("title")
            visible = await b.is_visible()
            print(f"  Button {i}: text='{txt}' aria='{aria}' title='{title}' visible={visible}")

        # Buscar el ThemeToggle específicamente - usar el primer botón que tiene texto "Cambiar tema"
        print("\n=== Buscando ThemeToggle ===")
        # El botón tiene un span sr-only con "Cambiar tema"
        theme_btn = await page.query_selector("button:has(span.sr-only:text('Cambiar tema'))")
        if not theme_btn:
            # Alternativa: el primer botón del header
            theme_btn = buttons[0] if buttons else None
        print(f"  Theme btn found: {theme_btn is not None}")
        if theme_btn:
            box = await theme_btn.bounding_box()
            print(f"  Box: {box}")
            # Click
            await theme_btn.click(force=True)
            await page.wait_for_timeout(1000)
            # Ver si el dropdown se abrió
            dark_item = await page.query_selector("[role='menuitem']:has-text('Oscuro')")
            print(f"  Dark menuitem found: {dark_item is not None}")
            if dark_item:
                await dark_item.click()
                await page.wait_for_timeout(2000)
                is_dark = await page.evaluate("document.documentElement.classList.contains('dark')")
                html_class = await page.evaluate("document.documentElement.className")
                print(f"  After click: is_dark={is_dark}, html class='{html_class}'")
                # Ver localStorage después
                theme_storage = await page.evaluate("localStorage.getItem('theme')")
                print(f"  localStorage theme: {theme_storage}")
                await page.screenshot(path="/home/z/my-project/screenshots-v2/debug-dark.png", full_page=True)

        # Verificar localStorage
        storage = await page.evaluate("JSON.stringify(localStorage)")
        print(f"\n=== localStorage ===\n{storage[:500]}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
