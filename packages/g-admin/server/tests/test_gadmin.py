TICKET_BODY = {
    "scope": "page",
    "kind": "visual",
    "severity": "minor",
    "page": {"url": "https://example.com/x", "path": "/x", "title": "X"},
    "viewport": {"w": 1280, "h": 800, "dpr": 1, "theme": "dark"},
    "elements": [
        {
            "selector": ".card > h2",
            "dom_path": "html > body > .card > h2",
            "html": "<h2>Title</h2>",
            "rect": {"x": 1, "y": 2, "w": 3, "h": 4},
        }
    ],
    "edits": [
        {
            "selector": ".card",
            "prop": "padding",
            "from": "16px",
            "to": "24px",
            "token_from": "--sp-4",
            "token_to": "--sp-6",
        }
    ],
    "note": "spacing looks cramped",
    "drawing": None,
    "source": "human",
}


# --------------------------------------------------------------- verify --


def test_verify_requires_admin(client):
    resp = client.get("/api/gadmin/verify")
    assert resp.status_code == 401


def test_verify_ok_for_admin(client, as_admin):
    resp = client.get("/api/gadmin/verify", cookies=as_admin)
    assert resp.status_code == 200
    assert resp.json() == {"admin": True}


def test_verify_ignores_token(client, token):
    # Contract's /verify is the browser-stub gate (cookie identity);
    # a machine token is not sufficient to arm the client overlay.
    resp = client.get("/api/gadmin/verify", headers={"X-Gadmin-Token": token})
    assert resp.status_code == 401


# -------------------------------------------------------------- create --


def test_create_requires_full_auth(client):
    resp = client.post("/api/gadmin/tickets", json=TICKET_BODY)
    assert resp.status_code == 401


def test_create_rejects_token_auth(client, token):
    resp = client.post(
        "/api/gadmin/tickets",
        json=TICKET_BODY,
        headers={"X-Gadmin-Token": token},
    )
    assert resp.status_code == 403


def test_create_with_admin_cookie(client, as_admin):
    resp = client.post("/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "open"
    assert body["baked_by"] is None
    assert body["drawing"] is None
    assert body["edits"][0]["token_to"] == "--sp-6"
    assert body["edits"][0]["from"] == "16px"


def test_create_rate_limited(client, as_admin):
    first = client.post("/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin)
    second = client.post("/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin)
    assert first.status_code == 201
    assert second.status_code == 429


def test_create_rejects_oversized_drawing(client, as_admin):
    body = dict(TICKET_BODY, drawing="x" * 1_500_001)
    resp = client.post("/api/gadmin/tickets", json=body, cookies=as_admin)
    assert resp.status_code == 400


def test_create_rejects_oversized_element_html(client, as_admin):
    body = dict(TICKET_BODY)
    body["elements"] = [dict(TICKET_BODY["elements"][0], html="x" * 10_001)]
    resp = client.post("/api/gadmin/tickets", json=body, cookies=as_admin)
    assert resp.status_code == 422


# ---------------------------------------------------------------- list --


def test_list_requires_read_auth(client):
    resp = client.get("/api/gadmin/tickets")
    assert resp.status_code == 401


def test_list_allows_token(client, as_admin, token):
    client.post("/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin)
    resp = client.get("/api/gadmin/tickets", headers={"X-Gadmin-Token": token})
    assert resp.status_code == 200
    assert len(resp.json()["tickets"]) == 1


def test_list_excludes_drawing(client, as_admin):
    body = dict(TICKET_BODY, drawing="data:image/png;base64,AAAA")
    client.post("/api/gadmin/tickets", json=body, cookies=as_admin)
    resp = client.get("/api/gadmin/tickets", cookies=as_admin)
    ticket = resp.json()["tickets"][0]
    assert "drawing" not in ticket


def test_list_filters_by_status(client, as_admin):
    created = client.post(
        "/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin
    ).json()
    client.patch(
        f"/api/gadmin/tickets/{created['id']}",
        json={"status": "dismissed"},
        cookies=as_admin,
    )
    open_resp = client.get("/api/gadmin/tickets?status=open", cookies=as_admin)
    dismissed_resp = client.get(
        "/api/gadmin/tickets?status=dismissed", cookies=as_admin
    )
    assert open_resp.json()["tickets"] == []
    assert len(dismissed_resp.json()["tickets"]) == 1


# ----------------------------------------------------------------- get --


def test_get_includes_drawing(client, as_admin):
    body = dict(TICKET_BODY, drawing="data:image/png;base64,AAAA")
    created = client.post("/api/gadmin/tickets", json=body, cookies=as_admin).json()
    resp = client.get(f"/api/gadmin/tickets/{created['id']}", cookies=as_admin)
    assert resp.json()["drawing"] == "data:image/png;base64,AAAA"


def test_get_404(client, as_admin):
    resp = client.get("/api/gadmin/tickets/999", cookies=as_admin)
    assert resp.status_code == 404


# --------------------------------------------------------------- patch --


def test_patch_status_via_token(client, as_admin, token):
    created = client.post(
        "/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin
    ).json()
    resp = client.patch(
        f"/api/gadmin/tickets/{created['id']}",
        json={"status": "baked", "reply": "baked in commit abc123"},
        headers={"X-Gadmin-Token": token},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "baked"
    assert body["baked_by"] == "agent"
    assert body["replies"][0]["by"] == "agent"
    assert body["replies"][0]["text"] == "baked in commit abc123"


def test_patch_note_rejected_via_token(client, as_admin, token):
    created = client.post(
        "/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin
    ).json()
    resp = client.patch(
        f"/api/gadmin/tickets/{created['id']}",
        json={"note": "rewritten"},
        headers={"X-Gadmin-Token": token},
    )
    assert resp.status_code == 403


def test_patch_note_allowed_via_cookie(client, as_admin):
    created = client.post(
        "/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin
    ).json()
    resp = client.patch(
        f"/api/gadmin/tickets/{created['id']}",
        json={"note": "rewritten by human"},
        cookies=as_admin,
    )
    assert resp.status_code == 200
    assert resp.json()["note"] == "rewritten by human"


def test_patch_requires_auth(client, as_admin):
    created = client.post(
        "/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin
    ).json()
    resp = client.patch(
        f"/api/gadmin/tickets/{created['id']}", json={"status": "dismissed"}
    )
    assert resp.status_code == 401


def test_patch_requires_a_field(client, as_admin):
    created = client.post(
        "/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin
    ).json()
    resp = client.patch(
        f"/api/gadmin/tickets/{created['id']}", json={}, cookies=as_admin
    )
    assert resp.status_code == 400


# -------------------------------------------------------------- brief --


def test_brief_renders_note_edits_and_replies(client, as_admin, token):
    created = client.post(
        "/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin
    ).json()
    client.patch(
        f"/api/gadmin/tickets/{created['id']}",
        json={"status": "baked", "reply": "shipped it"},
        headers={"X-Gadmin-Token": token},
    )
    resp = client.get(
        f"/api/gadmin/tickets/{created['id']}/brief",
        headers={"X-Gadmin-Token": token},
    )
    assert resp.status_code == 200
    text = resp.text
    assert "spacing looks cramped" in text
    assert "--sp-6" in text
    assert ".card" in text
    assert "<h2>Title</h2>" in text
    assert "shipped it" in text
    assert "agent" in text


def test_brief_requires_read_auth(client, as_admin):
    created = client.post(
        "/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin
    ).json()
    resp = client.get(f"/api/gadmin/tickets/{created['id']}/brief")
    assert resp.status_code == 401


# --------------------------------------------------------- overrides --


def test_overrides_empty_by_default(client, as_admin):
    client.post("/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin)
    resp = client.get("/api/gadmin/overrides.css")
    assert resp.status_code == 200
    assert resp.text == ""
    assert resp.headers["cache-control"] == "no-store"


def test_overrides_no_auth_required(client):
    resp = client.get("/api/gadmin/overrides.css")
    assert resp.status_code == 200


def test_overrides_renders_open_edits_when_enabled(client, as_admin, monkeypatch):
    monkeypatch.setenv("GADMIN_REAPPLY", "1")
    client.post("/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin)
    resp = client.get("/api/gadmin/overrides.css")
    assert resp.status_code == 200
    assert ".card" in resp.text
    assert "var(--sp-6)" in resp.text
    assert "padding" in resp.text


def test_overrides_excludes_baked_tickets(client, as_admin, token, monkeypatch):
    monkeypatch.setenv("GADMIN_REAPPLY", "1")
    created = client.post(
        "/api/gadmin/tickets", json=TICKET_BODY, cookies=as_admin
    ).json()
    client.patch(
        f"/api/gadmin/tickets/{created['id']}",
        json={"status": "baked"},
        headers={"X-Gadmin-Token": token},
    )
    resp = client.get("/api/gadmin/overrides.css")
    assert ".card" not in resp.text
