#!/usr/bin/env python3
"""Debug específico del ghost drag y hover de dependencias."""

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

        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        # Ir al Gantt
        gantt_btn = await page.query_selector("button:has-text('Gantt')")
        if gantt_btn:
            await gantt_btn.click()
            await page.wait_for_timeout(2000)

        # Tomar screenshot base
        await page.screenshot(path="/home/z/my-project/screenshots-v2/gantt-base.png", full_page=True)

        # === GHOST DRAG ===
        print("=== GHOST DRAG ===")
        # Ir al inicio del proyecto con el botón "Hoy"
        hoy_btn = await page.query_selector("button:has-text('Hoy')")
        if hoy_btn:
            await hoy_btn.click()
            await page.wait_for_timeout(1000)
        # Scroll horizontal al inicio
        await page.evaluate("document.querySelector('.overflow-auto')?.scrollTo(0, 0)")
        await page.wait_for_timeout(500)

        # Buscar barras que estén dentro del timeline visible (x > 340 que es después del panel izquierdo de 320px)
        bars = await page.query_selector_all("div.cursor-grab")
        print(f"Barras: {len(bars)}")

        # Encontrar una barra visible en el timeline (no en el panel izquierdo)
        target_bar = None
        for i, b in enumerate(bars):
            box = await b.bounding_box()
            if box and box['x'] > 340 and box['x'] < 900 and box['width'] > 20:
                print(f"  Bar {i} (visible in timeline): {box}")
                target_bar = b
                break

        if target_bar:
            box = await target_bar.bounding_box()
            cx = box['x'] + box['width']/2
            cy = box['y'] + box['height']/2
            print(f"Drag desde ({cx}, {cy})")
            # Verificar qué elemento está en el punto del mouse
            elem_at_point = await page.evaluate(f"document.elementFromPoint({cx}, {cy})?.tagName + ' ' + document.elementFromPoint({cx}, {cy})?.className")
            print(f"Elemento en el punto: {elem_at_point}")
            # Mover al centro
            await page.mouse.move(cx, cy)
            await page.wait_for_timeout(500)
            # Usar dispatchEvent para mousedown directamente
            await page.evaluate(f"""() => {{
                const el = document.elementFromPoint({cx}, {cy});
                if (el) {{
                    console.log('Elemento:', el.tagName, el.className);
                    const evt = new MouseEvent('mousedown', {{ bubbles: true, clientX: {cx}, clientY: {cy} }});
                    el.dispatchEvent(evt);
                }}
            }}""")
            await page.wait_for_timeout(500)
            # Mover despacio 200px a la derecha - usar mouse.move que sí actualiza clientX
            for step in range(20):
                await page.mouse.move(cx + step * 10, cy)
                await page.wait_for_timeout(50)
            await page.wait_for_timeout(1000)
            # Screenshot durante drag
            await page.screenshot(path="/home/z/my-project/screenshots-v2/gantt-ghost-mid-drag.png", full_page=True)
            print("Screenshot tomado durante drag")
            # Verificar
            ghost = await page.query_selector("div.border-dashed")
            print(f"Ghost element (border-dashed): {ghost is not None}")
            drag_overlay = await page.query_selector("div.fixed.bottom-4")
            print(f"Drag overlay: {drag_overlay is not None}")
            bar_styles = await page.evaluate("""() => {
                const bars = document.querySelectorAll('div.cursor-grab');
                return Array.from(bars).slice(0, 5).map(b => ({
                    opacity: b.style.opacity || getComputedStyle(b).opacity,
                }));
            }""")
            print(f"Bar opacities: {bar_styles}")
            # Soltar
            await page.mouse.up()
            await page.wait_for_timeout(500)
        else:
            print("No se encontró barra visible")

        # === HOVER DEPENDENCIA ===
        print("\n=== HOVER DEPENDENCIA ===")
        # Los hit-areas ahora son divs con pointer-events: auto dentro del contenedor de dependencias
        # Buscar el contenedor de hit-areas (z-index 50)
        hitarea_divs = await page.query_selector_all("div[style*='pointer-events: auto'][style*='cursor: pointer']")
        print(f"Hit-area divs: {len(hitarea_divs)}")

        for i, div in enumerate(hitarea_divs[:5]):
            box = await div.bounding_box()
            if box and box['width'] > 0 and box['height'] > 0:
                print(f"  Hit-area {i} box: {box}")
                # El hit area es un rectángulo, el centro debería funcionar
                cx = box['x'] + box['width']/2
                cy = box['y'] + box['height']/2
                # Ver qué elemento está en el punto
                elem = await page.evaluate(f"document.elementFromPoint({cx}, {cy})?.tagName")
                print(f"    Elemento en ({cx},{cy}): {elem}")
                await page.mouse.move(cx, cy)
                await page.wait_for_timeout(1500)
                # Buscar el botón de eliminar (rojo)
                del_btns = await page.query_selector_all("button.bg-red-500")
                print(f"    Botones rojos: {len(del_btns)}")
                if del_btns:
                    print(f"    ✅ Botón eliminar visible!")
                    await page.screenshot(path=f"/home/z/my-project/screenshots-v2/gantt-dep-hover-success.png", full_page=True)
                    break
                # Probar otros puntos
                for j, (px, py) in enumerate([
                    (box['x'] + 10, cy),
                    (box['x'] + box['width'] - 10, cy),
                    (cx, box['y'] + 10),
                    (cx, box['y'] + box['height'] - 10),
                ]):
                    await page.mouse.move(px, py)
                    await page.wait_for_timeout(1000)
                    del_btns = await page.query_selector_all("button.bg-red-500")
                    if del_btns:
                        print(f"    ✅ Botón en punto {j}: ({px},{py})")
                        await page.screenshot(path=f"/home/z/my-project/screenshots-v2/gantt-dep-hover-success.png", full_page=True)
                        break
                if del_btns:
                    break

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
