"""Render icons/icon.svg to the PNG sizes iOS and the web manifest need."""
from pathlib import Path

from playwright.sync_api import sync_playwright

ICONS = Path(__file__).resolve().parent.parent / "docs" / "icons"
SVG = (ICONS / "icon.svg").read_text(encoding="utf-8")

with sync_playwright() as p:
    browser = p.chromium.launch()
    for size in (180, 192, 512):
        page = browser.new_page(viewport={"width": size, "height": size})
        page.set_content(
            f"<style>html,body{{margin:0}}svg{{display:block;width:{size}px;height:{size}px}}</style>{SVG}"
        )
        page.screenshot(path=str(ICONS / f"icon-{size}.png"), omit_background=False)
        page.close()
    browser.close()
print("icons written to", ICONS)
