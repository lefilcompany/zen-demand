"""Happy path (Enterprise): criar quadro/demanda NÃO dispara toast de limite."""
from __future__ import annotations

from tests_selenium.helpers import (
    find_button_by_text,
    find_text,
    force_click,
    text_visible,
    wait_for_app,
)


def test_enterprise_can_open_create_board(driver, seeded, login_as, go):
    team = seeded("enterprise")
    login_as(team)
    go("/boards")
    wait_for_app(driver)

    # Página renderizou + board padrão presente
    find_text(driver, r"meus quadros", timeout=20)
    find_text(driver, r"quadro padrão", timeout=20)

    cta = find_button_by_text(driver, "novo quadro", "criar primeiro quadro")
    force_click(driver, cta)

    # Wizard abre, sem toast de limite
    find_text(driver, r"criar novo quadro", timeout=12)
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
