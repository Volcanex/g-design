# Agent kickoff: g-admin reference server

You are an agent in a git worktree off `main` in `g-design`. Read
`agents/CLAUDE.md` and `agents/g-admin-contract.md` first. The contract
is binding; this workstream is its reference implementation.

## The goal

A single drop-in FastAPI module implementing the contract's endpoints,
storage, and brief rendering, for the gseed family (g-command-web, g-site
and everything born from the seed template). It
lives here in g-design so it versions with the client.

## Deliverables

- `packages/g-admin/server/gadmin.py`: one file, stdlib + FastAPI
  only. Exports `router = APIRouter()`. In a seed-family project it is
  copied to `core/api/gadmin.py` and auto-mounts at `/api/gadmin`
  (seed's importlib discovery, see `seed-upstream/server.py:92-140`).
- Auth: import `require_admin`/`is_admin` from `core.api.admin` when
  present (seed pattern); fall back to a `GADMIN_VERIFY` callable hook
  so non-seed FastAPI apps can wire their own. `X-Gadmin-Token` header
  path per the contract (`GADMIN_TOKEN` env var, constant-time compare,
  GET + PATCH-status only).
- Storage: SQLite at `var/gadmin.db` relative to the project root
  (create dir if missing). Schema mirrors the contract ticket schema;
  `drawing` excluded from list queries (poker learned this the hard
  way: PNGs make lists slow).
- Brief rendering per the contract; study baseline's
  `core/api/annotations.py` brief endpoint over ssh (read-only) for
  what a good brief includes.
- `overrides.css` generation from open tickets' edits, served public,
  empty unless `GADMIN_REAPPLY=1`. Correct cache headers (no-store:
  it changes when tickets change).
- A short "wiring a consumer" section in the package CLAUDE.md: copy
  file, set env vars, add the overrides `<link>` if reapply is wanted,
  run vendor.mjs for the client assets.

## Constraints

- No Postgres, no ORM, no new dependencies. One file, legible.
- Do not touch `seed-upstream/`: it is a reference checkout. Adoption
  into the seed template is a separate later change.
- Rate-limit ticket creation lightly (one per second, poker's stuck
  button rule).

## Acceptance

- Tests (pytest, in this repo) covering: auth gating incl. token path,
  create/list/get/patch, brief rendering with edits + token names,
  overrides.css on/off behaviour, list excludes drawings.
- Demonstrated mount in a scratch FastAPI app in the test suite, not a
  real consumer. First real consumer is opentable (separate brief).
