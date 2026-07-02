#!/usr/bin/env python3
"""Debug de la posición del SVG de dependencias."""
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

        # Buscar el SVG de dependencias (el grande)
        info = await page.evaluate("""() => {
            const svgs = document.querySelectorAll('svg');
            return Array.from(svgs).map((svg, i) => {
                const r = svg.getBoundingClientRect();
                const style = svg.getAttribute('style') || '';
                return {
                    i, x: Math.round(r.x), y: Math.round(r.y),
                    w: Math.round(r.width), h: Math.round(r.height),
                    zIndex: style.match(/z-index: (\\d+)/)?.[1] || 'auto',
                    hasPaths: svg.querySelectorAll('path').length,
                };
            }).filter(s => s.w > 100);
        }""")
        print("SVGs grandes:")
        for s in info:
            print(f"  SVG {s['i']}: x={s['x']} y={s['y']} w={s['w']} h={s['h']} z={s['zIndex']} paths={s['hasPaths']}")

        # Verificar qué hay en x=1496, y=399
        elem = await page.evaluate("""() => {
            const x = 1496, y = 399;
            const el = document.elementFromPoint(x, y);
            if (!el) return 'null';
            const cls = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
            return el.tagName + ' | class=' + cls.slice(0, 80) + ' | z=' + getComputedStyle(el).zIndex;
        }""")
        print(f"\nElemento en (1496, 399): {elem}")

        await browser.close()

asyncio.run(main())
