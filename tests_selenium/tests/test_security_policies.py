"""Security regressions — validates recent RLS hardening without breaking core flows."""
from __future__ import annotations

import uuid

from tests_selenium.seed import (
    cleanup_emails,
    rest_insert,
    rest_select,
    rpc,
    seed_extra_user,
    signin_password,
)


def test_direct_team_member_insert_is_blocked_but_join_rpc_still_works(seeded):
    team = seeded("starter")
    extra = seed_extra_user()

    try:
        session = signin_password(extra["email"], extra["password"])

        direct = rest_insert(
            "team_members",
            {
                "team_id": team.teamId,
                "user_id": extra["userId"],
                "role": "member",
            },
            access_token=session["access_token"],
            select="team_id,user_id,role",
        )
        assert not direct.ok, f"insert direto deveria falhar: {direct.status_code} {direct.text}"

        joined = rpc(session["access_token"], "join_team_with_code", {"p_code": team.accessCode})
        assert joined.ok, f"RPC join_team_with_code deveria funcionar: {joined.status_code} {joined.text}"

        membership = rest_select(
            "team_members",
            access_token=session["access_token"],
            select="team_id,user_id,role",
            params={
                "team_id": f"eq.{team.teamId}",
                "user_id": f"eq.{extra['userId']}",
            },
        )
        assert membership.ok, membership.text
        data = membership.json()
        assert len(data) == 1, data
        assert data[0]["role"] == "requester", data
    finally:
        cleanup_emails([extra["email"]])


def test_system_statuses_stay_public_but_custom_board_statuses_do_not(seeded):
    team = seeded("starter")
    owner = signin_password(team.email, team.password)
    custom_name = f"E2E Status {uuid.uuid4().hex[:8]}"

    created = rest_insert(
        "demand_statuses",
        {
            "name": custom_name,
            "color": "#123456",
            "is_system": False,
            "board_id": team.boardId,
        },
        access_token=owner["access_token"],
        select="id,name,board_id,is_system",
    )
    assert created.ok, created.text

    anon_system = rest_select(
        "demand_statuses",
        select="id,name,is_system,board_id",
        params={"is_system": "eq.true", "limit": 5},
    )
    assert anon_system.ok, anon_system.text
    assert len(anon_system.json()) > 0, anon_system.json()

    anon_custom = rest_select(
        "demand_statuses",
        select="id,name,board_id,is_system",
        params={"name": f"eq.{custom_name}"},
    )
    assert anon_custom.ok, anon_custom.text
    assert anon_custom.json() == [], anon_custom.json()

    owner_custom = rest_select(
        "demand_statuses",
        access_token=owner["access_token"],
        select="id,name,board_id,is_system",
        params={"name": f"eq.{custom_name}"},
    )
    assert owner_custom.ok, owner_custom.text
    owner_rows = owner_custom.json()
    assert len(owner_rows) == 1, owner_rows
    assert owner_rows[0]["board_id"] == team.boardId, owner_rows


def test_shared_demand_exposes_only_general_interactions(seeded):
    team = seeded("starter")
    owner = signin_password(team.email, team.password)

    demand = rest_insert(
        "demands",
        {
            "title": f"E2E Shared {uuid.uuid4().hex[:6]}",
            "team_id": team.teamId,
            "board_id": team.boardId,
            "status_id": team.firstStatusId,
            "created_by": team.userId,
            "priority": "média",
        },
        access_token=owner["access_token"],
        select="id",
    )
    assert demand.ok, demand.text
    demand_id = demand.json()[0]["id"]

    share_token = f"e2e_{uuid.uuid4().hex}"
    shared = rest_insert(
        "demand_share_tokens",
        {"demand_id": demand_id, "token": share_token, "created_by": team.userId},
        access_token=owner["access_token"],
        select="id,token",
    )
    assert shared.ok, shared.text

    general = rest_insert(
        "demand_interactions",
        {
            "demand_id": demand_id,
            "user_id": team.userId,
            "interaction_type": "comment",
            "content": "general-visible",
            "channel": "general",
        },
        access_token=owner["access_token"],
        select="id,channel,content",
    )
    assert general.ok, general.text

    internal = rest_insert(
        "demand_interactions",
        {
            "demand_id": demand_id,
            "user_id": team.userId,
            "interaction_type": "comment",
            "content": "internal-hidden",
            "channel": "internal",
        },
        access_token=owner["access_token"],
        select="id,channel,content",
    )
    assert internal.ok, internal.text

    anon_rows = rest_select(
        "demand_interactions",
        select="id,channel,content",
        params={"demand_id": f"eq.{demand_id}", "order": "created_at.asc"},
    )
    assert anon_rows.ok, anon_rows.text
    anon_data = anon_rows.json()
    assert [row["channel"] for row in anon_data] == ["general"], anon_data
    assert anon_data[0]["content"] == "general-visible", anon_data

    owner_rows = rest_select(
        "demand_interactions",
        access_token=owner["access_token"],
        select="id,channel,content",
        params={"demand_id": f"eq.{demand_id}", "order": "created_at.asc"},
    )
    assert owner_rows.ok, owner_rows.text
    owner_channels = [row["channel"] for row in owner_rows.json()]
    assert owner_channels == ["general", "internal"], owner_channels


def test_board_members_can_view_requests_but_non_board_team_members_cannot(seeded):
    team = seeded("profissional")
    owner = signin_password(team.email, team.password)
    outsider = seed_extra_user()
    board_user = seed_extra_user()

    try:
        outsider_session = signin_password(outsider["email"], outsider["password"])
        board_session = signin_password(board_user["email"], board_user["password"])

        join_outsider = rpc(outsider_session["access_token"], "join_team_with_code", {"p_code": team.accessCode})
        join_board_user = rpc(board_session["access_token"], "join_team_with_code", {"p_code": team.accessCode})
        assert join_outsider.ok, join_outsider.text
        assert join_board_user.ok, join_board_user.text

        board = rest_insert(
            "boards",
            {
                "team_id": team.teamId,
                "name": f"E2E Sec Board {uuid.uuid4().hex[:6]}",
                "created_by": team.userId,
                "is_default": False,
            },
            access_token=owner["access_token"],
            select="id,name,is_default",
        )
        assert board.ok, board.text
        secondary_board_id = board.json()[0]["id"]

        member_added = rest_insert(
            "board_members",
            {
                "board_id": secondary_board_id,
                "user_id": board_user["userId"],
                "role": "requester",
                "added_by": team.userId,
            },
            access_token=owner["access_token"],
            select="board_id,user_id,role",
        )
        assert member_added.ok, member_added.text

        created_request = rest_insert(
            "demand_requests",
            {
                "team_id": team.teamId,
                "board_id": secondary_board_id,
                "created_by": team.userId,
                "title": f"E2E Request {uuid.uuid4().hex[:6]}",
                "priority": "média",
            },
            access_token=owner["access_token"],
            select="id,title,board_id,team_id",
        )
        assert created_request.ok, created_request.text
        request_id = created_request.json()[0]["id"]

        visible_to_board = rest_select(
            "demand_requests",
            access_token=board_session["access_token"],
            select="id,title,board_id",
            params={"id": f"eq.{request_id}"},
        )
        assert visible_to_board.ok, visible_to_board.text
        assert len(visible_to_board.json()) == 1, visible_to_board.json()
        assert visible_to_board.json()[0]["board_id"] == secondary_board_id

        hidden_from_outsider = rest_select(
            "demand_requests",
            access_token=outsider_session["access_token"],
            select="id,title,board_id",
            params={"id": f"eq.{request_id}"},
        )
        assert hidden_from_outsider.ok, hidden_from_outsider.text
        assert hidden_from_outsider.json() == [], hidden_from_outsider.json()
    finally:
        cleanup_emails([outsider["email"], board_user["email"]])