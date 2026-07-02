#!/usr/bin/env python3
"""Verifica que las flechas de dependencias se rendericen."""

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

        # Ir al Gantt
        await page.click("button:has-text('Gantt')")
        await page.wait_for_timeout(2000)

        # Scroll al inicio
        await page.evaluate("document.querySelector('.overflow-auto')?.scrollTo(0, 0)")
        await page.wait_for_timeout(1000)

        # Verificar SVGs
        svgs = await page.query_selector_all("svg")
        print(f"SVGs encontrados: {len(svgs)}")
        for i, svg in enumerate(svgs):
            box = await svg.bounding_box()
            html = await svg.evaluate("el => el.outerHTML.slice(0, 200)")
            print(f"  SVG {i}: box={box}")
            print(f"    HTML: {html[:150]}")

        # Verificar paths en el SVG de dependencias
        paths = await page.query_selector_all("svg path[stroke^='#']")
        print(f"\nPaths con color: {len(paths)}")
        for i, path in enumerate(paths[:5]):
            d = await path.get_attribute("d")
            stroke = await path.get_attribute("stroke")
            print(f"  Path {i}: stroke={stroke} d={d[:80] if d else 'none'}")

        # Scroll para mostrar dependencias en x=952 (que está después del panel izquierdo)
        # El panel izquierdo es 320px, el viewport es 1440px
        # x=952 en coords del SVG = 320+952=1272 en coords de página
        # Para centrar x=952 en el viewport, scroll = 952 - (viewport_timeline_width/2)
        # viewport_timeline_width = 1440 - 320 = 1120
        # scroll = 952 - 560 = 392
        await page.evaluate("document.querySelector('.overflow-auto')?.scrollTo(392, 0)")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="/home/z/my-project/screenshots-v2/gantt-with-deps.png", full_page=True)
        print("Screenshot con scroll 392 guardado")

        # Inyectar un path de test rojo grueso dentro del SVG de dependencias
        await page.evaluate("""() => {
            const svgs = document.querySelectorAll('svg');
            svgs.forEach((svg) => {
                const style = svg.getAttribute('style') || '';
                if (style.includes('z-index: 60') || style.includes('z-index: 50')) {
                    // Añadir un path de test muy visible
                    const ns = 'http://www.w3.org/2000/svg';
                    const testPath = document.createElementNS(ns, 'path');
                    testPath.setAttribute('d', 'M 100 50 L 500 50 L 500 200 L 900 200');
                    testPath.setAttribute('stroke', '#ff0000');
                    testPath.setAttribute('stroke-width', '5');
                    testPath.setAttribute('fill', 'none');
                    testPath.setAttribute('marker-end', 'url(#arrow-fs)');
                    svg.appendChild(testPath);
                    console.log('Test path added to SVG');
                }
            });
        }""")
        await page.wait_for_timeout(500)
        await page.screenshot(path="/home/z/my-project/screenshots-v2/gantt-test-path.png", full_page=True)
        print("Screenshot con path de test guardado")

        # Verificar visibilidad de los paths
        vis = await page.evaluate("""() => {
            const paths = document.querySelectorAll('svg path[stroke^="#"]');
            return Array.from(paths).slice(0, 5).map(p => {
                const rect = p.getBoundingClientRect();
                const style = getComputedStyle(p);
                const svgRect = p.closest('svg').getBoundingClientRect();
                return {
                    x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height),
                    stroke: p.getAttribute('stroke'),
                    strokeWidth: p.getAttribute('stroke-width') || style.strokeWidth,
                    opacity: style.opacity,
                    svgX: Math.round(svgRect.x), svgY: Math.round(svgRect.y), svgW: Math.round(svgRect.width),
                    markerEnd: p.getAttribute('marker-end'),
                };
            });
        }""")
        print(f"\nVisibilidad de paths: {vis}")

        # Tomar screenshot del SVG debug con fondo rojo
        await page.screenshot(path="/home/z/my-project/screenshots-v2/gantt-debug-svg.png", full_page=True)
        print("Screenshot debug guardado")

        await browser.close()

asyncio.run(main())
