#!/usr/bin/env python3
"""Verifica las mejoras de la aplicación."""

import asyncio
import sys
import os
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:3000"
SHOTS_DIR = "/home/z/my-project/screenshots-v2"
os.makedirs(SHOTS_DIR, exist_ok=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        # Reset localStorage antes de navegar para asegurar tema claro inicial
        await page.add_init_script("localStorage.clear();")

        errors = []
        page.on("pageerror", lambda err: errors.append(f"PAGE ERROR: {err}"))
        page.on("console", lambda msg: print(f"[console.{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)

        # 1. Abrir dashboard en modo claro
        print("\n=== 1. Dashboard modo claro ===")
        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{SHOTS_DIR}/01-dashboard-light.png", full_page=True)
        # Verificar que el fondo sea claro
        bg_color = await page.evaluate("document.body.style.backgroundColor || getComputedStyle(document.body).backgroundColor")
        print(f"  Body bg: {bg_color}")

        # 2. Cambiar a modo oscuro
        print("\n=== 2. Cambiar a modo oscuro ===")
        # Click en el toggle de tema (primer botón del header, contiene "Cambiar tema" en sr-only)
        buttons = await page.query_selector_all("header button")
        theme_btn = buttons[0] if buttons else None
        if theme_btn:
            await theme_btn.click(force=True)
            await page.wait_for_timeout(800)
        # Click en "Oscuro"
        dark_option = await page.query_selector("div[role='menuitem']:has-text('Oscuro')")
        if dark_option:
            await dark_option.click()
            await page.wait_for_timeout(1500)
        await page.screenshot(path=f"{SHOTS_DIR}/02-dashboard-dark.png", full_page=True)
        is_dark = await page.evaluate("document.documentElement.classList.contains('dark')")
        print(f"  Modo oscuro activo: {is_dark}")

        # 3. Gantt en modo oscuro
        print("\n=== 3. Gantt en modo oscuro ===")
        gantt_btn = await page.query_selector("button:has-text('Gantt')")
        if gantt_btn:
            await gantt_btn.click()
            await page.wait_for_timeout(2000)
            # Ir al inicio del proyecto para ver las dependencias
            hoy_btn = await page.query_selector("button:has-text('Hoy')")
            if hoy_btn:
                await hoy_btn.click()
                await page.wait_for_timeout(1000)
            await page.evaluate("document.querySelector('.overflow-auto')?.scrollTo(0, 0)")
            await page.wait_for_timeout(1000)
            await page.screenshot(path=f"{SHOTS_DIR}/03-gantt-dark.png", full_page=True)
            print("  Gantt oscuro: OK")

        # 4. Probar drag de tarea (fantasma) - mover una barra
        print("\n=== 4. Probando drag con fantasma ===")
        # Ir al inicio del proyecto
        hoy_btn = await page.query_selector("button:has-text('Hoy')")
        if hoy_btn:
            await hoy_btn.click()
            await page.wait_for_timeout(1000)
        await page.evaluate("document.querySelector('.overflow-auto')?.scrollTo(0, 0)")
        await page.wait_for_timeout(500)
        # Las barras de tarea son divs con cursor-grab y pointer-events-auto
        bars = await page.query_selector_all("div.cursor-grab")
        print(f"  Barras encontradas: {len(bars)}")
        # Buscar una barra visible en el timeline (x > 340 para evitar el panel izquierdo)
        target_bar = None
        for b in bars:
            box = await b.bounding_box()
            if box and box['x'] > 340 and box['x'] < 900 and box['width'] > 20:
                target_bar = b
                break
        if target_bar:
            box = await target_bar.bounding_box()
            start_x = box['x'] + box['width']/2
            start_y = box['y'] + box['height']/2
            await page.mouse.move(start_x, start_y)
            await page.wait_for_timeout(300)
            await page.mouse.down()
            await page.wait_for_timeout(300)
            await page.mouse.move(start_x + 150, start_y, steps=10)
            await page.wait_for_timeout(800)
            await page.screenshot(path=f"{SHOTS_DIR}/04-gantt-ghost-drag.png", full_page=True)
            print("  Fantasma durante drag: OK")
            await page.mouse.up()
            await page.wait_for_timeout(500)

        # 5. Hover sobre una flecha de dependencia para ver la X roja
        print("\n=== 5. Hover sobre flecha de dependencia ===")
        # Los hit-areas ahora son divs con pointer-events: auto y cursor: pointer
        hitarea_divs = await page.query_selector_all("div[style*='pointer-events: auto'][style*='cursor: pointer']")
        print(f"  Hit-areas encontrados: {len(hitarea_divs)}")
        if hitarea_divs:
            # Tomar el primer hit-area visible
            for hitarea in hitarea_divs:
                box = await hitarea.bounding_box()
                if box and box['width'] > 0 and box['height'] > 0 and box['x'] > 340 and box['x'] < 1300:
                    cx = box['x'] + box['width']/2
                    cy = box['y'] + box['height']/2
                    await page.mouse.move(cx, cy)
                    await page.wait_for_timeout(1200)
                    await page.screenshot(path=f"{SHOTS_DIR}/05-gantt-dep-hover.png", full_page=True)
                    print("  Hover sobre dependencia: OK")
                    break

        # 6. Vista Documentación
        print("\n=== 6. Vista Documentación ===")
        doc_btn = await page.query_selector("button:has-text('Documentación')")
        if doc_btn:
            await doc_btn.click()
            await page.wait_for_timeout(1500)
            await page.screenshot(path=f"{SHOTS_DIR}/06-documentos.png", full_page=True)
            print("  Documentación: OK")

        # 7. Abrir modal de tarea y verificar chat lateral
        print("\n=== 7. Modal de tarea con chat lateral ===")
        listado_btn = await page.query_selector("button:has-text('Listado')")
        if listado_btn:
            await listado_btn.click()
            await page.wait_for_timeout(1000)
            first_task = await page.query_selector("table tbody tr")
            if first_task:
                await first_task.click()
                await page.wait_for_timeout(2000)
                await page.screenshot(path=f"{SHOTS_DIR}/07-task-modal-chat-lateral.png", full_page=True)
                print("  Modal con chat lateral: OK")

                # Ir a pestaña Fechas para ver el color picker
                fechas_tab = await page.query_selector("button[role='tab']:has-text('Fechas')")
                if fechas_tab:
                    await fechas_tab.click()
                    await page.wait_for_timeout(800)
                    # Scroll hacia el color picker
                    await page.evaluate("document.querySelector('[role=dialog] .flex-1.overflow-y-auto')?.scrollTo({top: 300, behavior: 'smooth'})")
                    await page.wait_for_timeout(500)
                    await page.screenshot(path=f"{SHOTS_DIR}/08-task-color-picker.png", full_page=True)
                    print("  Color picker: OK")

        # 8. Cerrar modal
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(800)

        # 9. Vista General en modo oscuro
        print("\n=== 8. Vista General en modo oscuro ===")
        obra_selector = await page.query_selector("button[role='combobox']")
        if obra_selector:
            await obra_selector.click()
            await page.wait_for_timeout(500)
            vista_general = await page.query_selector("div[role='option']:has-text('Vista general')")
            if vista_general:
                await vista_general.click()
                await page.wait_for_timeout(1500)
                await page.screenshot(path=f"{SHOTS_DIR}/09-overview-dark.png", full_page=True)
                print("  Vista general oscura: OK")

        # 10. Volver a modo claro
        print("\n=== 9. Volver a modo claro ===")
        buttons = await page.query_selector_all("header button")
        theme_btn = buttons[0] if buttons else None
        if theme_btn:
            await theme_btn.click(force=True)
            await page.wait_for_timeout(800)
        light_option = await page.query_selector("div[role='menuitem']:has-text('Claro')")
        if light_option:
            await light_option.click()
            await page.wait_for_timeout(1000)
        is_dark = await page.evaluate("document.documentElement.classList.contains('dark')")
        print(f"  Modo oscuro activo: {is_dark} (debería ser False)")

        # Errores
        print("\n=== Errores detectados ===")
        if errors:
            print(f"  ❌ {len(errors)} errores:")
            for e in errors[:5]:
                print(f"    - {e}")
        else:
            print("  ✅ Sin errores de página")

        await browser.close()
        print(f"\nCapturas en: {SHOTS_DIR}/")
        return 0 if not errors else 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
