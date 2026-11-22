import json
import re
from datetime import datetime

from playwright.sync_api import expect

from conftest import BASE

ALL = ["neck", "shoulders", "elbows", "wrists", "upperSpine", "lowerSpine", "hips", "knees", "ankles",
       "yoga", "meditation", "daydream", "push", "pull", "squat", "hinge", "carry", "getup"]
MINUTE = 60_000


def tap(page, item):
    # Joints are SVG groups: hit one joint circle rather than the group's bounding-box centre.
    page.locator(f'svg [data-item="{item}"] circle, button[data-item="{item}"]').first.click()


def band(page, item):
    return page.locator(f'[data-item="{item}"]').first.get_attribute("data-band")


def stored(page):
    return page.evaluate("JSON.parse(localStorage.getItem('daysSince.v1'))")


def next_day(page, n=1):
    for _ in range(n):
        page.click("#date")


def test_initial_state_is_red_and_nothing_logged(desktop):
    desktop.goto(BASE)
    assert {band(desktop, i) for i in ALL} == {"red"}
    assert desktop.locator("[data-done]").count() == 0


def test_only_today_and_history_tabs(desktop):
    desktop.goto(BASE)
    assert [b.get_attribute("data-tab") for b in desktop.locator("nav [data-tab]").all()] == ["today", "history"]
    assert desktop.locator("#pane-days, [data-view]").count() == 0


def test_today_tab_shows_colours_only(iphone):
    iphone.goto(BASE)
    text = iphone.locator("#pane-today").inner_text()
    assert not re.search(r"\d", text), text
    assert iphone.locator("#pane-today [data-item]").count() == len(ALL)


def test_app_name_fits_header(iphone):
    iphone.goto(BASE)
    assert iphone.title() == "Balance and Wellness"
    assert iphone.locator("#title").inner_text() == "Balance and Wellness"
    assert iphone.evaluate("(t => t.scrollWidth <= t.clientWidth)(document.getElementById('title'))")


FAST = ["neck", "ankles", "meditation", "daydream"]  # max 4
SLOW = ["yoga", "push", "carry"]  # max 5


def test_fast_and_slow_decay(desktop):
    desktop.goto(BASE)
    for item in FAST + SLOW:
        tap(desktop, item)
    fast = ["yellow", "orange", "red", "red", "red"]  # 3, 2, 1, 0, 0
    slow = ["green", "yellow", "orange", "red", "red"]  # 4, 3, 2, 1, 0
    for i in range(5):
        next_day(desktop)
        for item in FAST:
            assert band(desktop, item) == fast[i], (item, f"day +{i + 1}")
        for item in SLOW:
            assert band(desktop, item) == slow[i], (item, f"day +{i + 1}")
    tap(desktop, "neck")
    assert band(desktop, "neck") == "green"  # 0 -> max in one tap


def test_mind_section_layout(iphone):
    iphone.goto(BASE)
    box = {i: iphone.locator(f'button[data-item="{i}"]').bounding_box() for i in ["yoga", "meditation", "daydream"]}
    y, m, d = box["yoga"], box["meditation"], box["daydream"]
    assert m["x"] > y["x"] + y["width"] - 1 and d["x"] > y["x"] + y["width"] - 1  # right column
    assert m["y"] + m["height"] <= d["y"] + 1  # meditation above daydream
    assert abs(y["y"] - m["y"]) < 2 and abs((y["y"] + y["height"]) - (d["y"] + d["height"])) < 2  # yoga spans both rows


def test_mind_panels_log_with_check_mark(desktop):
    desktop.goto(BASE)
    tap(desktop, "meditation")
    tap(desktop, "daydream")
    assert desktop.locator('button[data-item="meditation"] .done').is_visible()
    assert desktop.locator('button[data-item="daydream"] .done').is_visible()
    assert band(desktop, "yoga") == "red"


def test_joint_shows_check_mark_when_logged_today(desktop):
    desktop.goto(BASE)
    tap(desktop, "neck")
    tap(desktop, "shoulders")
    assert desktop.locator('svg [data-item="neck"] .check').count() == 1
    assert desktop.locator('svg [data-item="shoulders"] .check').count() == 2  # both sides
    assert desktop.locator('svg [data-item="knees"] .check').count() == 0
    next_day(desktop)
    assert desktop.locator("svg .check").count() == 0


def test_only_one_tap_per_item_per_day(desktop):
    desktop.goto(BASE)
    for item in ["elbows", "yoga", "pull"]:
        tap(desktop, item)
        tap(desktop, item)
    assert [e["k"] for e in stored(desktop)["log"]] == ["elbows", "yoga", "pull"]
    assert band(desktop, "elbows") == "green"
    assert desktop.locator("[data-done]").count() == 3
    assert desktop.locator('button[data-item="yoga"] .done').is_visible()
    assert desktop.locator('button[data-item="push"] .done').count() == 0
    next_day(desktop)
    assert desktop.locator("[data-done]").count() == 0
    tap(desktop, "elbows")
    assert band(desktop, "elbows") == "green"
    assert len(stored(desktop)["log"]) == 4


def test_undo_allows_tapping_again_same_day(desktop):
    desktop.goto(BASE)
    tap(desktop, "squat")
    desktop.click("#undo")
    assert desktop.locator('button[data-item="squat"] .done').count() == 0
    tap(desktop, "squat")
    assert band(desktop, "squat") == "green"
    assert len(stored(desktop)["log"]) == 1


def test_bilateral_joint_both_sides_log(desktop):
    desktop.goto(BASE)
    desktop.locator('svg [data-item="knees"] circle').nth(3).click()  # right knee
    assert band(desktop, "knees") == "green"


def test_yoga_and_strength_facets_scored_separately(desktop):
    desktop.goto(BASE)
    tap(desktop, "yoga")
    tap(desktop, "push")
    assert band(desktop, "yoga") == band(desktop, "push") == "green"
    assert {band(desktop, f) for f in ["pull", "squat", "hinge", "carry", "getup"]} == {"red"}
    next_day(desktop, 2)
    assert band(desktop, "push") == "yellow"
    next_day(desktop)
    assert band(desktop, "yoga") == "orange"
    assert band(desktop, "pull") == "red"


def test_undo_reverts_last_tap(desktop):
    desktop.goto(BASE)
    tap(desktop, "hinge")
    tap(desktop, "carry")
    expect(desktop.locator("#toast")).to_have_class(re.compile(r"\bshow\b"))
    expect(desktop.locator("#toastMsg")).to_have_text("Logged Loaded carry")
    desktop.click("#undo")
    expect(desktop.locator("#toastMsg")).to_have_text("Undone: Loaded carry")
    assert band(desktop, "carry") == "red"
    assert band(desktop, "hinge") == "green"
    assert [e["k"] for e in stored(desktop)["log"]] == ["hinge"]


def test_history_persists_across_reload(desktop):
    desktop.goto(BASE)
    tap(desktop, "getup")
    next_day(desktop, 2)
    desktop.reload()
    assert band(desktop, "getup") == "yellow"
    assert "+2d" in desktop.locator("#date").inner_text()


def test_day_simulation_reset_with_shift_click(desktop):
    desktop.goto(BASE)
    next_day(desktop, 3)
    assert "+3d" in desktop.locator("#date").inner_text()
    desktop.click("#date", modifiers=["Shift"])
    assert "+" not in desktop.locator("#date").inner_text()
    assert stored(desktop)["offset"] == 0


def test_day_simulation_disabled_on_mobile(iphone):
    iphone.goto(BASE)
    before = iphone.locator("#date").inner_text()
    assert iphone.locator("#date").is_disabled()
    iphone.locator("#date").click(force=True)
    assert iphone.locator("#date").inner_text() == before
    assert stored(iphone)["offset"] == 0


def test_touch_tap_logs_on_mobile(iphone):
    iphone.goto(BASE)
    iphone.locator('svg [data-item="wrists"] circle').first.tap()
    iphone.locator('button[data-item="squat"]').tap()
    assert band(iphone, "wrists") == "green"
    assert band(iphone, "squat") == "green"


def test_real_midnight_rollover_without_reload(chromium, server):
    ctx = chromium.new_context(service_workers="block", viewport={"width": 1100, "height": 900})
    page = ctx.new_page()
    page.clock.install(time=datetime(2026, 11, 22, 23, 58, 0))
    page.goto(BASE)
    tap(page, "yoga")
    assert band(page, "yoga") == "green"  # 5
    assert page.locator('button[data-item="yoga"][data-done]').count() == 1
    page.clock.run_for(3 * MINUTE)
    assert page.locator('button[data-item="yoga"][data-done]').count() == 0
    assert band(page, "yoga") == "green"  # 4
    page.clock.run_for(24 * 60 * MINUTE)
    assert band(page, "yoga") == "yellow"  # 3
    ctx.close()


def test_history_tab_shows_grouped_heatmaps_only(desktop):
    desktop.goto(BASE)
    tap(desktop, "neck")
    tap(desktop, "push")
    desktop.click('nav [data-tab="history"]')
    expect(desktop.locator("#pane-history")).to_be_visible()
    cards = desktop.locator("#pane-history section[data-group]")
    assert [c.get_attribute("data-group") for c in cards.all()] == ["mob", "mind", "str"]
    assert desktop.locator("#pane-history .heat .cell").count() == len(ALL) * 28
    assert desktop.locator("#pane-history svg").count() == 0
    assert "weeks" not in desktop.locator("#pane-history").inner_text()
    last_neck = desktop.locator('#pane-history [data-group="mob"] .cell').nth(27)
    assert last_neck.get_attribute("data-band") == "green"  # today


def test_history_heatmap_fills_the_screen(iphone):
    iphone.goto(BASE)
    iphone.locator('nav [data-tab="history"]').tap()
    gap = iphone.evaluate("""() => {
        const pane = document.getElementById('pane-history').getBoundingClientRect();
        const last = [...document.querySelectorAll('#pane-history .hcard')].pop().getBoundingClientRect();
        return pane.bottom - last.bottom;
    }""")
    assert gap < 20, gap


def test_toast_never_covers_tappable_items(iphone):
    iphone.goto(BASE)
    iphone.locator('button[data-item="getup"]').tap()
    expect(iphone.locator("#toast")).to_have_class(re.compile(r"\bshow\b"))
    iphone.wait_for_timeout(400)  # let the slide-in transition finish
    t = iphone.locator("#toast").bounding_box()
    for el in iphone.locator("#pane-today [data-item]").all():
        b = el.bounding_box()
        overlap = not (b["y"] >= t["y"] + t["height"] or b["y"] + b["height"] <= t["y"])
        assert not overlap, el.get_attribute("data-item")


def test_every_view_fits_without_scrolling(iphone):
    iphone.goto(BASE)
    for t in ["history", "today"]:
        iphone.locator(f'nav [data-tab="{t}"]').tap()
        overflow = iphone.evaluate("""() => {
            const p = document.querySelector('.pane:not([hidden])');
            return { pane: p.scrollHeight - p.clientHeight,
                     doc: document.documentElement.scrollHeight - innerHeight };
        }""")
        assert overflow["pane"] <= 1 and overflow["doc"] <= 1, (t, overflow)


def test_corrupt_storage_recovers(desktop):
    desktop.goto(BASE)
    desktop.evaluate("localStorage.setItem('daysSince.v1', '{not json')")
    desktop.reload()
    assert band(desktop, "neck") == "red"
    tap(desktop, "neck")
    assert len(stored(desktop)["log"]) == 1


def test_pwa_metadata_and_icons(desktop):
    desktop.goto(BASE)
    assert desktop.locator('link[rel="apple-touch-icon"]').get_attribute("href") == "icons/icon-180.png"
    for path in ["icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"]:
        r = desktop.request.get(BASE + path)
        assert r.ok and r.headers["content-type"] == "image/png", path
    manifest = json.loads(desktop.request.get(BASE + "manifest.webmanifest").text())
    assert manifest["display"] == "standalone"
    assert {i["sizes"] for i in manifest["icons"]} >= {"192x192", "512x512"}


def test_works_offline_after_first_visit(chromium, server):
    ctx = chromium.new_context(service_workers="allow")
    page = ctx.new_page()
    page.goto(BASE)
    page.evaluate("navigator.serviceWorker.ready.then(() => true)")
    page.reload()
    page.wait_for_function("navigator.serviceWorker.controller !== null")
    ctx.set_offline(True)
    page.reload()
    expect(page.locator('button[data-item="push"]')).to_be_visible()
    ctx.close()


def banner(page):
    return {k: page.locator(f"#notif{k}").text_content() for k in ("Label", "Title", "Body")}


def test_desktop_day_change_previews_notification(desktop):
    desktop.goto(BASE)
    next_day(desktop)
    expect(desktop.locator("#notif")).to_have_class(re.compile(r"\bshow\b"))
    assert banner(desktop)["Title"] == "🔴 18 red"
    assert "preview" in banner(desktop)["Label"]
    desktop.click("#date", modifiers=["Shift"])
    for item in ALL:
        tap(desktop, item)
    assert desktop.evaluate("dailySummary(db.log, todayNum()).title") == "🟢 All green"
    next_day(desktop)  # max-4 items yellow, max-5 items green
    assert banner(desktop)["Title"] == "🟡 11 turning yellow"
    assert banner(desktop)["Body"].startswith("Neck, Shoulders")
    next_day(desktop)  # yellows are not mentioned once anything is orange
    assert banner(desktop)["Title"] == "🟠 11 orange"
    next_day(desktop)
    b = banner(desktop)
    assert b["Title"] == "🔴 11 red · 🟠 7 orange"
    assert b["Body"].split("\n")[0].startswith("Red: Neck, Shoulders")
    assert b["Body"].split("\n")[1] == "Orange: Isometric Yoga, Push, Pull, Squat, Hinge, Loaded carry, Get-up"


def test_no_notification_preview_on_mobile(iphone):
    iphone.goto(BASE)
    iphone.locator("#date").click(force=True)
    assert banner(iphone)["Title"] == ""


def test_notification_fires_once_per_5am_and_5pm_slot(chromium, server):
    ctx = chromium.new_context(service_workers="block", viewport={"width": 1100, "height": 900})
    page = ctx.new_page()
    page.clock.install(time=datetime(2026, 11, 23, 4, 58, 0))
    page.goto(BASE)
    assert banner(page)["Title"] == ""  # nothing on first launch
    page.clock.run_for(3 * MINUTE)
    assert banner(page)["Label"] == "5:00 AM"
    assert banner(page)["Title"] == "🔴 18 red"
    for item in ALL:
        tap(page, item)
    page.clock.run_for(12 * 60 * MINUTE)  # past 17:00, same day
    assert banner(page)["Label"] == "5:00 PM"
    assert banner(page)["Title"] == "🟢 All green"
    page.reload()
    assert banner(page)["Title"] == ""  # already notified for this slot
    assert stored(page)["notified"] == "2026-11-23T17"
    ctx.close()


def test_system_notification_when_permission_granted(chromium_full, server):
    ctx = chromium_full.new_context(service_workers="allow", permissions=["notifications"])
    page = ctx.new_page()
    page.clock.install(time=datetime(2026, 11, 23, 16, 58, 0))
    page.goto(BASE)
    page.evaluate("navigator.serviceWorker.ready.then(() => true)")
    assert page.locator("#bell").get_attribute("data-on") == "1"
    page.clock.run_for(3 * MINUTE)
    page.wait_for_function("navigator.serviceWorker.ready.then(r => r.getNotifications()).then(n => n.length > 0)")
    titles = page.evaluate("navigator.serviceWorker.ready.then(r => r.getNotifications()).then(n => n.map(x => x.title))")
    assert titles == ["🔴 18 red"]
    ctx.close()
