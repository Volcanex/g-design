# g-admin

**What:** Reference server for the g-admin overlay, the admin bar +
annotate + edit-mode contract described in `agents/g-admin-contract.md`
(graduates here on merge; that file is the source of truth for the
schema and endpoints, this file is just wiring). `server/gadmin.py` is
the one-file FastAPI implementation: SQLite ticket storage, auth
(cookie or `X-Gadmin-Token`), brief rendering, `overrides.css`. Client
assets (`g-admin.js`/`g-admin.css`, the stub in `g-ui.js`) are a
separate deliverable (`agents/g-admin-client.md`) that vendors
alongside `g-ui`.

## Wiring a consumer (g-command-web, g-site, any seed project)

1. **Copy the file.** `cp packages/g-admin/server/gadmin.py
   <project>/core/api/gadmin.py`. Seed's importlib discovery
   (`server.py:discover_apis`) auto-mounts any `core/api/{name}.py`
   exporting `router`, so it lands at `/api/gadmin`. Nothing to
   register by hand.
2. **Auth.** If the project already has `core/api/admin.py` (the seed
   pattern), gadmin finds `is_admin` there automatically, no config.
   A non-seed FastAPI app sets a hook before the router is mounted:
   `import gadmin; gadmin.GADMIN_VERIFY = lambda request: my_check(request)`.
3. **Env vars** (project's `.env` / systemd unit):
   - `GADMIN_TOKEN`: shared secret for `X-Gadmin-Token` machine reads
     (g-command-web's tickets panel, a baking agent). Value lives in the
     instance passport. Omit it to disable the token path entirely (cookie
     auth still works).
   - `GADMIN_DB_PATH`: override the default `var/gadmin.db` (relative
     to the project root, three parents up from `core/api/gadmin.py`).
     Usually unset.
   - `GADMIN_REAPPLY=1`: turn on `overrides.css` generation. Leave
     unset (default) to keep it serving an empty, no-store response:
     tickets exist but nothing reapplies.
4. **Overrides link** (only if step 3's reapply is on): in the page
   shell, after the project's own stylesheet, add
   `<link rel="stylesheet" href="/api/gadmin/overrides.css">`. This is
   the "unbaked edits survive reload" layer: ephemeral, never a build
   step. Baking a ticket removes its rules from this response
   automatically (only `status=open` tickets are rendered).
5. **Client assets.** `node scripts/vendor.mjs <project>/static/g` as
   usual for `g-ui`; the g-admin stub ships inside it and does nothing
   until a page is visited with `?gadmin=1` or the project's admin UI
   sets `localStorage["g-admin"]`. Override the base path with
   `<meta name="g-admin-base" content="...">` if the router isn't
   mounted at the default `/api/gadmin`. Add
   `<meta name="g-command" content="https://...">` to link the bar to
   the instance's g-command-web dashboard.

## Auth model, in one table

| Caller | Credential | Can do |
|---|---|---|
| Human admin (browser) | project's admin cookie | everything: create, edit note, change status, reply |
| Machine reader (gcommand, baking agent) | `X-Gadmin-Token` header | `GET` everywhere, `PATCH` status (+ optional reply), never `POST /tickets`, never edit `note` |
| Anyone | none | `GET /overrides.css` only |

`GET /verify` reflects cookie identity only (it's the browser stub's
gate). A valid token does not pass it. This is deliberate: `/verify`
decides whether to inject the visible admin bar for a human, not
whether an API caller is authorized.

## Gotchas

- One file, stdlib + FastAPI only, no ORM. Keep it that way: it's
  meant to be read in one sitting and copied wholesale into a consumer.
- `drawing` (a PNG data URL, up to 1.5MB) never appears in `GET
  /tickets` list responses, only in the single-ticket `GET
  /tickets/{id}`. Poker's tickets panel is why: drawings in a list
  response make it crawl.
- Ticket creation is rate-limited to one per second, project-wide, not
  per-caller: it's a stuck-button guard, not abuse protection (the
  auth gate is the abuse protection).
- Size caps (element `html` at 10k chars, `drawing` at 1.5MB) are hard
  400s on create, not silent truncation. The client is expected to
  enforce these before sending; the server's job is to refuse, not to
  guess what to cut.
- Tests live in `server/tests/`, run with `pytest` from a venv with
  `fastapi`/`httpx` installed (this repo is primarily a node project and
  has no repo-wide Python test rig, so bring your own venv:
  `python3 -m venv .venv --system-site-packages` works if fastapi/httpx
  are already installed system-wide, otherwise `pip install fastapi
  httpx`).
