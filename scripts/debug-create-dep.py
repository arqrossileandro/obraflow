#!/usr/bin/env python3
"""Debug del create-dep: verificar si el mousedown llega al círculo."""

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

        # Buscar barras visibles cuyo extremo derecho esté en viewport
        bars = await page.query_selector_all("div.cursor-grab")
        for i, b in enumerate(bars):
            box = await b.bounding_box()
            if box and box['x'] > 340 and box['width'] > 20 and (box['x'] + box['width']) < 1380:
                # El círculo derecho está en right-0 con marginRight -6px, así que está cerca del extremo derecho
                circle_x = box['x'] + box['width'] - 4  # justo dentro del borde derecho
                circle_y = box['y'] + box['height']/2
                print(f"Barra {i}: x={box['x']}, w={box['width']}, círculo en ({circle_x}, {circle_y})")

                # Ver qué elemento está en el punto del círculo
                elem = await page.evaluate(f"""() => {{
                    const el = document.elementFromPoint({circle_x}, {circle_y});
                    if (!el) return 'null';
                    const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
                    return el.tagName + ' | class=' + cls.slice(0, 100) + ' | z=' + getComputedStyle(el).zIndex;
                }}""")
                print(f"  Elemento en círculo: {elem}")

                # Hacer mousedown ahí y verificar dragState
                await page.mouse.move(circle_x, circle_y)
                await page.wait_for_timeout(300)
                # Verificar si el cursor cambió
                cursor = await page.evaluate(f"getComputedStyle(document.elementFromPoint({circle_x}, {circle_y})).cursor")
                print(f"  Cursor: {cursor}")

                # Hacer mousedown
                await page.mouse.down()
                await page.wait_for_timeout(500)

                # Verificar si hay overlay de drag (el mensaje "Arrastrando dependencia")
                overlay = await page.query_selector("text='Arrastrando dependencia... soltar sobre la tarea sucesora'")
                print(f"  Overlay drag visible: {overlay is not None}")

                # Mover el mouse
                await page.mouse.move(circle_x - 100, circle_y + 50)
                await page.wait_for_timeout(500)

                # Verificar si hay flecha fantasma
                ghost = await page.query_selector_all("svg path[stroke-dasharray='6 4']")
                print(f"  Flechas fantasmas: {len(ghost)}")

                await page.mouse.up()
                await page.wait_for_timeout(500)
                break

        await browser.close()

asyncio.run(main())
