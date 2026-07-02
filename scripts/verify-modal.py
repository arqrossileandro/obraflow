#!/usr/bin/env python3
"""Verifica que el modal de edición de tarea se vea completo sin scroll horizontal."""
import asyncio, sys, os
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:3000"
SHOTS = "/home/z/my-project/screenshots-modal"
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

        # Ir al listado y abrir una tarea
        await page.click("button:has-text('Listado')")
        await page.wait_for_timeout(1000)
        await page.click("table tbody tr")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{SHOTS}/01-modal-fechas.png", full_page=True)

        # Verificar el ancho del modal
        modal_info = await page.evaluate("""() => {
            const dialog = document.querySelector('[role="dialog"]');
            if (!dialog) return null;
            const rect = dialog.getBoundingClientRect();
            return {
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
            };
        }""")
        print(f"Modal info: {modal_info}")

        # Verificar si hay scroll horizontal en el contenido de las pestañas
        scroll_info = await page.evaluate("""() => {
            const dialog = document.querySelector('[role="dialog"]');
            if (!dialog) return null;
            // Buscar el contenedor scrollable del contenido de tabs
            const scrollable = dialog.querySelector('.overflow-y-auto');
            if (!scrollable) return null;
            return {
                scrollWidth: scrollable.scrollWidth,
                clientWidth: scrollable.clientWidth,
                hasHorizontalScroll: scrollable.scrollWidth > scrollable.clientWidth,
                width: scrollable.getBoundingClientRect().width,
            };
        }""")
        print(f"Tab content scroll: {scroll_info}")

        # Probar cada pestaña
        tabs = ['avance', 'financiera', 'documentacion', 'materiales']
        for tab in tabs:
            tab_btn = await page.query_selector(f"button[role='tab']:has-text('{tab.capitalize()}')")
            if not tab_btn:
                # Buscar por texto parcial
                labels = {'avance': 'Avance', 'financiera': 'Financiera', 'documentacion': 'Documentación', 'materiales': 'Materiales'}
                tab_btn = await page.query_selector(f"button[role='tab']:has-text('{labels[tab]}')")
            if tab_btn:
                await tab_btn.click()
                await page.wait_for_timeout(800)
                await page.screenshot(path=f"{SHOTS}/02-modal-{tab}.png", full_page=True)
                # Verificar scroll horizontal
                scroll = await page.evaluate("""() => {
                    const tabContent = document.querySelector('[role="dialog"] .flex-1.overflow-y-auto');
                    if (!tabContent) return null;
                    return {
                        scrollWidth: tabContent.scrollWidth,
                        clientWidth: tabContent.clientWidth,
                        hasHorizontalScroll: tabContent.scrollWidth > tabContent.clientWidth,
                    };
                }""")
                print(f"  Tab {tab}: {scroll}")

        # Verificar el chat lateral
        chat_info = await page.evaluate("""() => {
            const aside = document.querySelector('[role="dialog"] aside');
            if (!aside) return null;
            const rect = aside.getBoundingClientRect();
            return { width: Math.round(rect.width), visible: rect.width > 0 };
        }""")
        print(f"Chat lateral: {chat_info}")

        print(f"\nErrores: {len(errors)}")
        for e in errors[:3]: print(f"  {e}")
        await browser.close()

asyncio.run(main())
