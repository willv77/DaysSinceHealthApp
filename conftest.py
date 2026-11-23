import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent / "docs"
PORT = 8765
BASE = f"http://127.0.0.1:{PORT}/"


@pytest.fixture(scope="session")
def server():
    proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1", "--directory", str(ROOT)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    for _ in range(50):
        try:
            socket.create_connection(("127.0.0.1", PORT), 0.2).close()
            break
        except OSError:
            time.sleep(0.1)
    yield BASE
    proc.terminate()
    proc.wait()


@pytest.fixture(scope="session")
def pw():
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def chromium(pw):
    browser = pw.chromium.launch()
    yield browser
    browser.close()


@pytest.fixture(scope="session")
def chromium_full(pw):
    # The default headless shell always reports Notification.permission as "denied".
    browser = pw.chromium.launch(channel="chromium")
    yield browser
    browser.close()


@pytest.fixture(scope="session")
def webkit(pw):
    browser = pw.webkit.launch()
    yield browser
    browser.close()


def _open(browser, **ctx_args):
    ctx = browser.new_context(service_workers="block", **ctx_args)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    return ctx, page, errors


@pytest.fixture
def desktop(chromium, server):
    ctx, page, errors = _open(chromium, viewport={"width": 1100, "height": 900})
    yield page
    ctx.close()
    assert not errors, errors


@pytest.fixture(params=["iPhone 13", "iPhone SE (3rd gen)"])
def iphone(request, pw, webkit, server):
    ctx, page, errors = _open(webkit, **pw.devices[request.param])
    yield page
    ctx.close()
    assert not errors, errors
