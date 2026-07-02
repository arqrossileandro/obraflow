#!/usr/bin/env python3
"""Verifica las correcciones del Gantt: flechas curvas, eliminar, crear dependencia, no overlap."""

import asyncio
import sys
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:3000"
SHOTS = "/home/z/my-project/screenshots-v3"
import os
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

        # Ir al Gantt
        await page.click("button:has-text('Gantt')")
        await page.wait_for_timeout(2000)

        # Ir a inicio del proyecto
        await page.click("button:has-text('Hoy')")
        await page.wait_for_timeout(1000)
        await page.evaluate("document.querySelector('.overflow-auto')?.scrollTo(0, 0)")
        await page.wait_for_timeout(1000)

        # === TEST 1: Verificar que las flechas son curvas ===
        print("=== TEST 1: Flechas curvas ===")
        await page.screenshot(path=f"{SHOTS}/01-gantt-base.png", full_page=True)
        # Verificar que los paths usan curva Bezier (C command) en lugar de L
        paths_info = await page.evaluate("""() => {
            const svgs = document.querySelectorAll('svg');
            const result = [];
            svgs.forEach(svg => {
                const paths = svg.querySelectorAll('path[stroke^="#"]');
                paths.forEach(p => {
                    const d = p.getAttribute('d') || '';
                    result.push({
                        d: d.slice(0, 80),
                        isCurved: d.includes('C '),
                        isStraight: d.includes('L ') && !d.includes('C '),
                    });
                });
            });
            return result;
        }""")
        print(f"  Paths encontrados: {len(paths_info)}")
        for i, p in enumerate(paths_info[:5]):
            print(f"  Path {i}: curved={p['isCurved']} straight={p['isStraight']} d={p['d']}")
        curved_count = sum(1 for p in paths_info if p['isCurved'])
        print(f"  ✅ Paths curvos: {curved_count}/{len(paths_info)}")

        # === TEST 2: Verificar que las flechas NO se dibujan sobre el panel izquierdo ===
        print("\n=== TEST 2: No overlap con panel izquierdo ===")
        # El panel izquierdo es de 0 a 320px. Las flechas deberían estar solo después de 320px.
        paths_pos = await page.evaluate("""() => {
            const svgs = document.querySelectorAll('svg');
            const result = [];
            svgs.forEach(svg => {
                const svgRect = svg.getBoundingClientRect();
                if (svgRect.x < 100) return; // skip icon svgs
                const paths = svg.querySelectorAll('path[stroke^="#"]');
                paths.forEach(p => {
                    const r = p.getBoundingClientRect();
                    result.push({ x: Math.round(r.x), w: Math.round(r.width) });
                });
            });
            return result;
        }""")
        print(f"  Paths de dependencias: {len(paths_pos)}")
        overlap_count = sum(1 for p in paths_pos if p['x'] < 320)
        print(f"  Paths que se dibujan sobre el panel izquierdo (x<320): {overlap_count}")
        if overlap_count == 0:
            print("  ✅ Ninguna flecha se dibuja sobre el panel izquierdo")
        else:
            print("  ❌ Hay flechas sobre el panel izquierdo")

        # === TEST 3: Probar hover y botón eliminar ===
        print("\n=== TEST 3: Botón eliminar dependencia ===")
        # Buscar el SVG overlay de dependencias (el que tiene position absolute y z-index 40)
        hitarea_paths = await page.query_selector_all("svg path[stroke-width='16']")
        print(f"  Hit-areas encontrados: {len(hitarea_paths)}")
        if hitarea_paths:
            # Hacer hover sobre el primer hit-area visible
            for hitarea in hitarea_paths:
                box = await hitarea.bounding_box()
                if box and box['width'] > 0 and box['height'] > 0 and box['x'] > 340:
                    cx = box['x'] + box['width']/2
                    cy = box['y'] + box['height']/2
                    print(f"  Hover en ({cx}, {cy})")
                    await page.mouse.move(cx, cy)
                    await page.wait_for_timeout(1500)
                    # Buscar el botón eliminar (circle rojo)
                    red_circles = await page.query_selector_all("svg circle[fill='#ef4444']")
                    print(f"  Círculos rojos encontrados: {len(red_circles)}")
                    if red_circles:
                        await page.screenshot(path=f"{SHOTS}/02-dep-hover-delete.png", full_page=True)
                        print("  ✅ Botón eliminar visible!")
                        # Probar click en el botón
                        circle_box = await red_circles[0].bounding_box()
                        if circle_box:
                            # Contar dependencias antes
                            deps_before = len(hitarea_paths)
                            await page.mouse.click(circle_box['x'] + circle_box['width']/2, circle_box['y'] + circle_box['height']/2)
                            await page.wait_for_timeout(1000)
                            # Contar dependencias después
                            hitarea_after = await page.query_selector_all("svg path[stroke-width='16']")
                            deps_after = len(hitarea_after)
                            print(f"  Dependencias antes: {deps_before}, después: {deps_after}")
                            if deps_after < deps_before:
                                print("  ✅ Dependencia eliminada!")
                            else:
                                print("  ❌ No se eliminó la dependencia")
                    break

        # === TEST 4: Crear dependencia arrastrando ===
        print("\n=== TEST 4: Crear dependencia arrastrando ===")
        # Contar dependencias antes
        deps_before = len(await page.query_selector_all("svg path[stroke-width='16']"))
        print(f"  Dependencias antes: {deps_before}")

        # Buscar barras de tarea con el círculo de crear dependencia
        bars = await page.query_selector_all("div.cursor-grab")
        # Encontrar dos barras visibles diferentes cuyo extremo derecho esté en el viewport
        visible_bars = []
        for b in bars:
            box = await b.bounding_box()
            # La barra debe estar en el timeline y su extremo derecho visible
            if box and box['x'] > 340 and box['width'] > 20 and (box['x'] + box['width']) < 1380:
                visible_bars.append((b, box))
            if len(visible_bars) >= 3:
                break

        if len(visible_bars) >= 2:
            bar1, box1 = visible_bars[0]
            bar2, box2 = visible_bars[1]
            # El círculo derecho está en right-0 con marginRight -6px, cerca del extremo derecho de la barra
            start_x = box1['x'] + box1['width'] - 4  # dentro del borde derecho
            start_y = box1['y'] + box1['height']/2
            end_x = box2['x'] + 5  # dentro del borde izquierdo de la segunda barra
            end_y = box2['y'] + box2['height']/2

            print(f"  Barra 1: x={box1['x']}, w={box1['width']} -> círculo en ({start_x}, {start_y})")
            print(f"  Barra 2: x={box2['x']}, y={box2['y']} -> destino ({end_x}, {end_y})")
            # Hover para que aparezca el círculo
            await page.mouse.move(box1['x'] + box1['width']/2, start_y)
            await page.wait_for_timeout(500)
            # Mousedown en el círculo derecho
            await page.mouse.move(start_x, start_y)
            await page.wait_for_timeout(300)
            await page.mouse.down()
            await page.wait_for_timeout(500)
            # Mover despacio hacia la segunda barra
            steps = 20
            for i in range(steps + 1):
                t = i / steps
                px = start_x + (end_x - start_x) * t
                py = start_y + (end_y - start_y) * t
                await page.mouse.move(px, py)
                await page.wait_for_timeout(80)
            # Screenshot durante drag (con fantasma)
            await page.wait_for_timeout(500)
            await page.screenshot(path=f"{SHOTS}/03-create-dep-ghost.png", full_page=True)
            print("  Screenshot con flecha fantasma guardado")
            # Verificar que hay una flecha fantasma (path con strokeDasharray)
            ghost_paths = await page.query_selector_all("svg path[stroke-dasharray='6 4']")
            print(f"  Flechas fantasmas visibles: {len(ghost_paths)}")
            # Soltar sobre la segunda barra
            await page.mouse.up()
            await page.wait_for_timeout(1500)
            # Contar dependencias después
            deps_after = len(await page.query_selector_all("svg path[stroke-width='16']"))
            print(f"  Dependencias después: {deps_after}")
            if deps_after > deps_before:
                print("  ✅ Dependencia creada!")
            else:
                print("  ❌ No se creó la dependencia")

        # Screenshot final
        await page.screenshot(path=f"{SHOTS}/04-gantt-final.png", full_page=True)

        # Errores
        print(f"\n=== Errores: {len(errors)} ===")
        for e in errors[:5]:
            print(f"  {e}")

        await browser.close()
        return 0 if not errors else 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
