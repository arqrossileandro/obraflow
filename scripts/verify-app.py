#!/usr/bin/env python3
"""Verifica que la aplicación de gestión de obras funcione correctamente."""

import asyncio
import sys
from playwright.async_api import async_playwright

URL = "http://127.0.0.1:3000"
SHOTS_DIR = "/home/z/my-project/screenshots"

import os
os.makedirs(SHOTS_DIR, exist_ok=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        # Capturar errores de consola
        errors = []
        page.on("pageerror", lambda err: errors.append(f"PAGE ERROR: {err}"))
        page.on("console", lambda msg: print(f"[console.{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)

        # 1. Abrir la página principal (Dashboard)
        print("\n=== 1. Abriendo Dashboard ===")
        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{SHOTS_DIR}/01-dashboard.png", full_page=True)
        title = await page.title()
        print(f"  Título: {title}")

        # 2. Tomar snapshot del sidebar
        print("\n=== 2. Verificando Sidebar ===")
        sidebar = await page.query_selector("aside")
        if sidebar:
            sidebar_text = await sidebar.inner_text()
            print(f"  Sidebar visible: OK")
            print(f"  Contiene 'ObraFlow': {'ObraFlow' in sidebar_text}")
            print(f"  Contiene selector de obra: {'obra' in sidebar_text.lower()}")

        # 3. Cambiar a vista Gantt
        print("\n=== 3. Cambiando a vista Gantt ===")
        gantt_btn = await page.query_selector("button:has-text('Gantt')")
        if gantt_btn:
            await gantt_btn.click()
            await page.wait_for_timeout(2000)
            await page.screenshot(path=f"{SHOTS_DIR}/02-gantt.png", full_page=True)
            print("  Gantt visible: OK")

        # 4. Cambiar escala del Gantt
        print("\n=== 4. Cambiando escala del Gantt a 'Mes' ===")
        mes_btn = await page.query_selector("button:has-text('Mes')")
        if mes_btn:
            await mes_btn.click()
            await page.wait_for_timeout(1000)
            await page.screenshot(path=f"{SHOTS_DIR}/03-gantt-mes.png", full_page=True)
            print("  Escala Mes: OK")

        # 5. Vista de Listado de Tareas
        print("\n=== 5. Vista Listado de Tareas ===")
        listado_btn = await page.query_selector("button:has-text('Listado')")
        if listado_btn:
            await listado_btn.click()
            await page.wait_for_timeout(1500)
            await page.screenshot(path=f"{SHOTS_DIR}/04-task-list.png", full_page=True)
            print("  Listado visible: OK")

        # 6. Vista Calendario
        print("\n=== 6. Vista Calendario ===")
        cal_btn = await page.query_selector("button:has-text('Calendario')")
        if cal_btn:
            await cal_btn.click()
            await page.wait_for_timeout(1500)
            await page.screenshot(path=f"{SHOTS_DIR}/05-calendar.png", full_page=True)
            print("  Calendario visible: OK")

        # 7. Vista Certificados
        print("\n=== 7. Vista Certificados de Avance ===")
        cert_btn = await page.query_selector("button:has-text('Certificados')")
        if cert_btn:
            await cert_btn.click()
            await page.wait_for_timeout(1500)
            await page.screenshot(path=f"{SHOTS_DIR}/06-certificados.png", full_page=True)
            print("  Certificados visible: OK")

        # 8. Vista Finanzas
        print("\n=== 8. Vista Finanzas ===")
        fin_btn = await page.query_selector("button:has-text('Finanzas')")
        if fin_btn:
            await fin_btn.click()
            await page.wait_for_timeout(2000)
            await page.screenshot(path=f"{SHOTS_DIR}/07-finanzas.png", full_page=True)
            print("  Finanzas visible: OK")

        # 9. Vista Kanban
        print("\n=== 9. Vista Kanban Materiales ===")
        kan_btn = await page.query_selector("button:has-text('Kanban')")
        if kan_btn:
            await kan_btn.click()
            await page.wait_for_timeout(1500)
            await page.screenshot(path=f"{SHOTS_DIR}/08-kanban.png", full_page=True)
            print("  Kanban visible: OK")

        # 10. Vista Chat
        print("\n=== 10. Vista Chat ===")
        chat_btn = await page.query_selector("button:has-text('Chat')")
        if chat_btn:
            await chat_btn.click()
            await page.wait_for_timeout(1500)
            await page.screenshot(path=f"{SHOTS_DIR}/09-chat.png", full_page=True)
            print("  Chat visible: OK")

        # 11. Vista Miembros
        print("\n=== 11. Vista Miembros ===")
        members_btn = await page.query_selector("button:has-text('Miembros')")
        if members_btn:
            await members_btn.click()
            await page.wait_for_timeout(1500)
            await page.screenshot(path=f"{SHOTS_DIR}/10-members.png", full_page=True)
            print("  Members visible: OK")

        # 12. Vista Configuración
        print("\n=== 12. Vista Configuración ===")
        settings_btn = await page.query_selector("button:has-text('Configuración')")
        if settings_btn:
            await settings_btn.click()
            await page.wait_for_timeout(1500)
            await page.screenshot(path=f"{SHOTS_DIR}/11-settings.png", full_page=True)
            print("  Settings visible: OK")

        # 13. Volver al Dashboard y abrir el modal de edición de tarea
        print("\n=== 13. Abriendo modal de edición de tarea ===")
        dash_btn = await page.query_selector("button:has-text('Dashboard')")
        if dash_btn:
            await dash_btn.click()
            await page.wait_for_timeout(2000)

        # Buscar cualquier tarea clickeable (en el listado o dashboard)
        # En el dashboard hay "Próximas tareas a iniciar" y "Desviaciones financieras"
        # También podemos ir al listado
        listado_btn = await page.query_selector("button:has-text('Listado')")
        if listado_btn:
            await listado_btn.click()
            await page.wait_for_timeout(1500)
            # Clickear la primera tarea de la tabla
            first_task = await page.query_selector("table tbody tr")
            if first_task:
                await first_task.click()
                await page.wait_for_timeout(2000)
                await page.screenshot(path=f"{SHOTS_DIR}/12-task-modal.png", full_page=True)
                print("  Modal abierto: OK")

                # Probar las pestañas
                for tab_name in ["Avance", "Comentarios", "Financiera", "Documentación", "Materiales"]:
                    tab_btn = await page.query_selector(f"button[role='tab']:has-text('{tab_name}')")
                    if tab_btn:
                        await tab_btn.click()
                        await page.wait_for_timeout(800)
                        await page.screenshot(path=f"{SHOTS_DIR}/13-task-tab-{tab_name.lower()}.png", full_page=True)
                        print(f"  Pestaña {tab_name}: OK")

        # Cerrar el modal si está abierto
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(800)
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(500)

        # 14. Vista General (seleccionar todas las obras)
        print("\n=== 14. Vista General (todas las obras) ===")
        # Click en el selector de obra
        obra_selector_trigger = await page.query_selector("button[role='combobox']")
        if obra_selector_trigger:
            await obra_selector_trigger.click()
            await page.wait_for_timeout(500)
            vista_general = await page.query_selector("div[role='option']:has-text('Vista general')")
            if vista_general:
                await vista_general.click()
                await page.wait_for_timeout(1500)
                await page.screenshot(path=f"{SHOTS_DIR}/14-overview.png", full_page=True)
                print("  Vista General: OK")

        # Cerrar el modal si está abierto
        esc_btn = await page.keyboard.press("Escape")
        await page.wait_for_timeout(500)

        # Reportar errores
        print("\n=== 15. Errores detectados ===")
        if errors:
            print(f"  ❌ {len(errors)} errores de página:")
            for e in errors[:10]:
                print(f"    - {e}")
        else:
            print("  ✅ Sin errores de página")

        await browser.close()

        print("\n=== Verificación completa ===")
        print(f"Capturas de pantalla guardadas en: {SHOTS_DIR}/")
        return 0 if not errors else 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
