# Agents: kickoff briefs for parallel work

Each `.md` here is a self-contained brief: paste it into a fresh agent
session (or hand it to g-executor) to build that piece. Copy
`_template.md` to start a new one. Prune a brief once its branch merges.

Discipline: each brief runs in its own git worktree off `main`
(`git worktree add ../g-design-<name> -b feat/<name>`), pushes its
branch, and stops. No pushes to `main`, no touching `dist/` by hand
(it is build output). Build with `node scripts/build.mjs`; run the docs
app to verify cards. UI work loads the `g-design` skill first.

Current set: the g-admin overlay. `g-admin-contract.md` is the shared
contract (not a kickoff: it graduates to the component CLAUDE.md on
merge); `g-admin-client.md` and `g-admin-server.md` build against it.
Consumer briefs live in their own repos: `gp-poker/agents/g-admin-poker.md`,
`g-command-web/agents/g-admin-tickets-panel.md`.
