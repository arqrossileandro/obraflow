#!/usr/bin/env python3
"""Verifica el diálogo de plantillas de tareas."""
import asyncio, sys, os
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:3000"
SHOTS = "/home/z/my-project/screenshots-templates"
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

        # Ir al listado de tareas
        await page.click("button:has-text('Listado')")
        await page.wait_for_timeout(1000)

        # Abrir el diálogo de plantillas
        await page.click("button:has-text('Usar plantilla')")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{SHOTS}/01-template-dialog.png", full_page=True)

        # Verificar que aparecen las plantillas
        templates = await page.evaluate("""() => {
            const buttons = document.querySelectorAll('[role="dialog"] button');
            return Array.from(buttons).filter(b => b.textContent.includes('Plomería') || b.textContent.includes('Hormigón') || b.textContent.includes('Albañilería')).length;
        }""")
        print(f"Plantillas visibles: {templates}")

        # Seleccionar la plantilla de Plomería
        plomeria_btn = await page.query_selector("button:has-text('Plomería')")
        if plomeria_btn:
            await plomeria_btn.click(force=True)
            await page.wait_for_timeout(1000)
            await page.screenshot(path=f"{SHOTS}/02-template-selected.png", full_page=True)
            print("Plantilla de Plomería seleccionada")

            # Verificar que aparecen las subtareas en el panel de detalle
            subtask_names = await page.evaluate("""() => {
                const aside = document.querySelector('[role="dialog"] aside');
                if (!aside) return [];
                return Array.from(aside.querySelectorAll('.text-xs.font-medium')).map(el => el.textContent.trim());
            }""")
            print(f"Subtareas en detalle: {subtask_names}")

            # Crear la tarea
            tasks_before = await page.evaluate("document.querySelectorAll('table tbody tr').length")
            # Usar evaluate para hacer click programáticamente
            await page.evaluate("""() => {
                const btns = document.querySelectorAll('[role="dialog"] button');
                for (const b of btns) {
                    if (b.textContent.includes('Crear') && !b.disabled) {
                        b.click();
                        return;
                    }
                }
            }""")
            await page.wait_for_timeout(2000)
            tasks_after = await page.evaluate("document.querySelectorAll('table tbody tr').length")
            print(f"Tareas antes: {tasks_before}, después: {tasks_after}")
            if tasks_after > tasks_before:
                print("✅ Tarea creada desde plantilla!")
            else:
                print("❌ No se creó la tarea")
            await page.screenshot(path=f"{SHOTS}/03-after-create.png", full_page=True)

        print(f"\nErrores: {len(errors)}")
        for e in errors[:3]: print(f"  {e}")
        await browser.close()

asyncio.run(main())
