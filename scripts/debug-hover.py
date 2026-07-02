#!/usr/bin/env python3
"""Debug directo del hover de dependencias."""

import asyncio
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:3000"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"])
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        await page.click("button:has-text('Gantt')")
        await page.wait_for_timeout(2000)
        await page.click("button:has-text('Hoy')")
        await page.wait_for_timeout(1000)
        await page.evaluate("document.querySelector('.overflow-auto')?.scrollTo(0, 0)")
        await page.wait_for_timeout(1000)

        # Encontrar los paths hit-area
        hitareas = await page.query_selector_all("svg path[stroke-width='16']")
        print(f"Hit-areas: {len(hitareas)}")

        for i, ha in enumerate(hitareas[:3]):
            box = await ha.bounding_box()
            if box and box['width'] > 0:
                cx = box['x'] + box['width']/2
                cy = box['y'] + box['height']/2
                print(f"\nHit-area {i}: box={box}")
                # Ver qué elemento está en el punto - info detallada
                elem_info = await page.evaluate(f"""() => {{
                    const el = document.elementFromPoint({cx}, {cy});
                    if (!el) return 'null';
                    const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
                    return el.tagName + ' | class=' + cls.slice(0, 80) + ' | z=' + getComputedStyle(el).zIndex + ' | pos=' + getComputedStyle(el).position;
                }}""")
                print(f"  Elemento en ({cx},{cy}): {elem_info}")
                # Mover mouse ahí
                await page.mouse.move(cx, cy)
                await page.wait_for_timeout(1000)
                # Verificar hoveredDepId via React state - buscar el círculo rojo
                red = await page.query_selector_all("svg circle[fill='#ef4444']")
                print(f"  Círculos rojos: {len(red)}")
                if red:
                    print("  ✅ HOVER FUNCIONA")
                    break

        await browser.close()

asyncio.run(main())
