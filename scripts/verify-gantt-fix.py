#!/usr/bin/env python3
"""Verifica las correcciones del Gantt: flechas curvas, eliminar, crear dependencia, no overlap."""

import asyncio, sys, os
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:3000"
SHOTS = "/home/z/my-project/screenshots-v4"
os.makedirs(SHOTS, exist_ok=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"])
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))

        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        await page.click("button:has-text('Gantt')")
        await page.wait_for_timeout(2000)
        await page.click("button:has-text('Hoy')")
        await page.wait_for_timeout(1000)
        await page.evaluate("document.querySelector('.overflow-auto')?.scrollTo(0, 0)")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{SHOTS}/01-gantt-base.png", full_page=True)

        # TEST 1: Flechas curvas
        print("=== TEST 1: Flechas curvas ===")
        paths_info = await page.evaluate("""() => {
            const paths = document.querySelectorAll('svg path[stroke^="#"]');
            return Array.from(paths).map(p => ({
                d: (p.getAttribute('d') || '').slice(0, 60),
                isCurved: (p.getAttribute('d') || '').includes('C '),
            }));
        }""")
        curved = sum(1 for p in paths_info if p['isCurved'])
        print(f"  Paths: {len(paths_info)}, curvos: {curved}")
        print(f"  {'✅' if curved == len(paths_info) else '❌'} Flechas curvas: {curved}/{len(paths_info)}")

        # TEST 2: No overlap con panel izquierdo
        print("\n=== TEST 2: No overlap ===")
        paths_pos = await page.evaluate("""() => {
            const paths = document.querySelectorAll('svg path[stroke^="#"]');
            return Array.from(paths).map(p => {
                const r = p.getBoundingClientRect();
                return { x: Math.round(r.x) };
            });
        }""")
        overlap = sum(1 for p in paths_pos if p['x'] < 320)
        print(f"  {'✅' if overlap == 0 else '❌'} Paths sobre panel izquierdo: {overlap}")

        # TEST 3: Botón eliminar
        print("\n=== TEST 3: Botón eliminar ===")
        # Los hit-areas son divs con pointer-events: auto y cursor: pointer
        hitareas = await page.query_selector_all("div[style*='pointer-events: auto'][style*='cursor: pointer']")
        print(f"  Hit-areas: {len(hitareas)}")
        if hitareas:
            for ha in hitareas:
                box = await ha.bounding_box()
                if box and box['x'] > 340 and box['width'] > 0:
                    cx = box['x'] + box['width']/2
                    cy = box['y'] + box['height']/2
                    await page.mouse.move(cx, cy)
                    await page.wait_for_timeout(1500)
                    # Buscar círculo rojo en el SVG
                    red = await page.query_selector_all("svg circle[fill='#ef4444']")
                    print(f"  Hover en ({cx:.0f},{cy:.0f}): círculos rojos={len(red)}")
                    if red:
                        await page.screenshot(path=f"{SHOTS}/02-dep-hover.png", full_page=True)
                        # Hacer click en el centro para eliminar
                        deps_before = len(await page.query_selector_all("div[style*='pointer-events: auto'][style*='cursor: pointer']"))
                        await page.mouse.click(cx, cy)
                        await page.wait_for_timeout(1000)
                        deps_after = len(await page.query_selector_all("div[style*='pointer-events: auto'][style*='cursor: pointer']"))
                        print(f" _deps antes={deps_before}, después={deps_after}")
                        if deps_after < deps_before:
                            print("  ✅ Dependencia eliminada!")
                        else:
                            print("  ❌ No se eliminó")
                        break

        # TEST 4: Crear dependencia
        print("\n=== TEST 4: Crear dependencia ===")
        deps_before = len(await page.query_selector_all("div[style*='pointer-events: auto'][style*='cursor: pointer']"))
        bars = await page.query_selector_all("div.cursor-grab")
        visible = []
        for b in bars:
            box = await b.bounding_box()
            if box and box['x'] > 340 and box['width'] > 20 and (box['x'] + box['width']) < 1380:
                visible.append((b, box))
            if len(visible) >= 3: break

        if len(visible) >= 2:
            bar1, box1 = visible[0]
            bar2, box2 = visible[1]
            start_x = box1['x'] + box1['width'] - 4
            start_y = box1['y'] + box1['height']/2
            end_x = box2['x'] + 5
            end_y = box2['y'] + box2['height']/2
            # Hover para mostrar el círculo
            await page.mouse.move(box1['x'] + box1['width']/2, start_y)
            await page.wait_for_timeout(500)
            await page.mouse.move(start_x, start_y)
            await page.wait_for_timeout(300)
            await page.mouse.down()
            await page.wait_for_timeout(500)
            for i in range(21):
                t = i / 20
                await page.mouse.move(start_x + (end_x - start_x) * t, start_y + (end_y - start_y) * t)
                await page.wait_for_timeout(80)
            await page.wait_for_timeout(500)
            await page.screenshot(path=f"{SHOTS}/03-create-dep-ghost.png", full_page=True)
            ghost = await page.query_selector_all("svg path[stroke-dasharray='6 4']")
            print(f"  Flechas fantasmas: {len(ghost)}")
            await page.mouse.up()
            await page.wait_for_timeout(1500)
            deps_after = len(await page.query_selector_all("div[style*='pointer-events: auto'][style*='cursor: pointer']"))
            print(f"  Deps antes={deps_before}, después={deps_after}")
            if deps_after > deps_before:
                print("  ✅ Dependencia creada!")
            else:
                print("  ❌ No se creó")

        await page.screenshot(path=f"{SHOTS}/04-final.png", full_page=True)
        print(f"\nErrores: {len(errors)}")
        for e in errors[:3]: print(f"  {e}")
        await browser.close()
        return 0 if not errors else 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
