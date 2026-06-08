"""Happy path (Enterprise): criar quadro/demanda NÃO dispara toast de limite."""
from __future__ import annotations

import os
import time

from selenium.webdriver.common.by import By

from tests_selenium.helpers import (
    find_button_by_text,
    find_text,
    force_click,
    text_visible,
    wait_for_app,
    wait_for_dialog,
)


def _dump_debug(driver, label: str) -> None:
    """Salva screenshot + HTML para diagnóstico em CI."""
    out = os.environ.get("DEBUG_DIR", "reports")
    try:
        os.makedirs(out, exist_ok=True)
        driver.save_screenshot(f"{out}/{label}.png")
        with open(f"{out}/{label}.html", "w", encoding="utf-8") as f:
            f.write(driver.page_source)
    except Exception:  # noqa: BLE001
        pass


def test_enterprise_can_open_create_board(driver, seeded, login_as, go):
    team = seeded("enterprise")
    login_as(team)
    go("/boards")
    wait_for_app(driver)

    # Página renderizou + board padrão presente
    find_text(driver, r"meus quadros", timeout=20)
    find_text(driver, r"quadro padrão", timeout=20)

    cta = find_button_by_text(driver, "novo quadro", "criar primeiro quadro")
    # Garantir scroll + clique nativo + fallback JS
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", cta)
    time.sleep(0.2)
    force_click(driver, cta)

    # Aguarda o Radix Dialog abrir (data-state=open)
    try:
        dlg = wait_for_dialog(driver, timeout=15)
    except Exception:
        _dump_debug(driver, "board_dialog_missing")
        raise

    # Título do wizard deve aparecer dentro do dialog
    assert "criar novo quadro" in (dlg.text or "").lower(), (
        f"Dialog aberto mas título não bate: {dlg.text!r}"
    )

    # Sem toast de limite
    assert not text_visible(driver, r"permite até .* quadro", timeout=2)
    assert not text_visible(driver, r"ver planos", timeout=2)


def test_enterprise_can_open_create_demand(driver, seeded, login_as, go):
    team = seeded("enterprise")
    login_as(team)
    go("/")
    wait_for_app(driver)

    cta = find_button_by_text(driver, "nova demanda")
    force_click(driver, cta)

    # Algum dialog deve montar; sem toast de limite
    find_text(driver, r"(criar.*demanda|nova demanda|título)", timeout=10)
    assert not text_visible(driver, r"permite até .* demanda", timeout=2)
