# Documentation Maintenance and Fact-Checking Guide

> Read this before changing or reviewing contributor docs (`AGENTS.md`, `CLAUDE.md`, `docs/*`). Keep links and ownership current, avoid duplication, and verify facts against the proposed commit tree (or `HEAD` for a read-only audit).

## Core Rules

- Verify names, paths, inventories, and counts against the proposed tree; do not trust an older list or the unstaged working tree.
- Check the current branch. Describe unmerged work only in that branch's docs, or mark it explicitly as planned.
- Fix or delete stale content. Do not retain it as "deprecated" history.

## Key Rule: If `git grep` Can't Find It, Don't Write It

Stage the intended files, then set `VERIFY_TREE="$(git write-tree)"`. If `git grep <pattern> "$VERIFY_TREE" -- <path>` cannot find a fact, do not claim it. Query `$VERIFY_TREE` with `git grep`, `git ls-tree`, `git show`, or `git cat-file`; bare `rg` and `ls` include unstaged files. For a read-only audit, use `VERIFY_TREE=HEAD`.

This guide covers only `agentre/`. Verify sibling repositories from their own roots.

## Doc Set and Responsibilities (Don't Duplicate — Cross-Link)

| Doc | What it owns |
| --- | --- |
| Workspace-root `AGENTS.md` (outside this repository, when using the multi-repo checkout) | Cross-repo facts and invariants (independent commits, the cago framework). |
| [`../CLAUDE.md`](../CLAUDE.md) | Just `@import`s `AGENTS.md`; holds no content of its own. |
| [`../AGENTS.md`](../AGENTS.md) | **Single source of truth for the agent guide**: engineering principles, high-priority constraints, high cohesion / low coupling, key constraints, common commands; also indexes the `docs/*` below. |
| [`architecture.md`](./architecture.md) | Project layout, cago layering conventions, the shared frontend package's place in the layering (leaf, one-way dependency) and its host seams, remote execution architecture, `AppDataDir` storage paths, database and migration flow, the device-fingerprint column vocabulary (four roles, one canonical name each), list of generated files. |
| [`develop.md`](./develop.md) | The concrete "how to": the Red→Green→Refactor loop, SOLID, high cohesion / low coupling, Fix Discipline, code style, the **enforced-rules table** (every convention with a real mechanical check), the persistent-data process, commit / PR flow, and the CI gate. |
| [`testing.md`](./testing.md) | How a test is **designed**: the applicability gate, choosing a boundary, covering the behavior space, the test stack (`testutils.Database(t)` / `mockgen` / goconvey / vitest), guard tests, what not to write, and cleanup boundaries. |
| [`observability.md`](./observability.md) | The **logging convention**: the single `cago/pkg/logger` entry point, level selection, where to instrument, the `package.Method:` message prefix and camelCase structured fields, and the never-log red line. Agentre has no metrics/tracing; commands live in [`debugging.md`](./debugging.md). |
| [`frontend.md`](./frontend.md) | shadcn-from-`@agentre-hub/agentre-ui` conventions, i18n, frontend structure, working inside the shared `@agentre-hub/agentre-ui` package, pnpm, formatting / lint, module path. |
| [`design.md`](./design.md) | The frontend **design system**: color tokens (light/dark values), the agent palette + run-status system, theming, the desktop window shell, component palette, motion, state patterns, accessibility, the new-page recipe. Owns the visual language; defers the enforced shadcn / i18n / lint rules to [`frontend.md`](./frontend.md). |
| [`debugging.md`](./debugging.md) | Diagnosing runtime issues: SQLite / log commands, table → feature mapping, reproduction commands, common pitfalls. |
| [`agent-backend.md`](./agent-backend.md) | The full path to wiring in a new AI Agent backend (entity / migration / runtime / translator / capability / daemon import / frontend gating). |
| [`session-lifecycle.md`](./session-lifecycle.md) | Creation, reuse, sidebar visibility, and remote-execution ownership for `chat_sessions`, including rules for future out-of-band producers. |
| [`../e2e/README.md`](../e2e/README.md) | The E2E / verification **machine**: the independent hermetic Wails app, one automated runner/config with desktop/sync-client/remote-peer smoke boundaries, preflight/storage/process guards, protocol fakes, SQLite oracles, sanitized per-run artifacts, and the formal-main-only driven verification launcher/driver. What a real run must record remains [`verification.md`](./verification.md)'s. |
| [`verification.md`](./verification.md) | The formal-main real-verification **route** and what a run must leave behind: when it is warranted, start → drive → record → stop, the `e2e/scratch/<scenario>/` evidence layout, real-dependency failure/unverified handling, `report.md` created before the run, authorization/redaction, honest reporting, and the one-place-only verdict table. Defers mechanics to [`../e2e/README.md`](../e2e/README.md). |
| [`references/verification-report-template.md`](./references/verification-report-template.md) | The `report.md` shape itself — copied verbatim into a scenario directory. Filling-in discipline and embedding rules; the *when / where* is [`verification.md`](./verification.md)'s. |
| [`documentation.md`](./documentation.md) | This guide: doc organization rules + fact-checking / anti-drift discipline. |
| [`README_zh.md`](./README_zh.md) / [`../README.md`](../README.md) | The user-facing Chinese / English project README — **not** a docs index; don't stuff contributor conventions into it. |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) / [`CONTRIBUTING_ZH.md`](./CONTRIBUTING_ZH.md) | The contributor guide (English / Chinese): setup, the GitHub fork / branch / PR workflow, a summary of the ground rules, commit style, PR checklist. It **links into** `AGENTS.md` / `docs/*` for the details — keep it a pointer, don't let facts fork from the docs that own them. |

**Agentre has no `docs/README.md` index file** — the docs index role is played by the **"Engineering conventions and task routing" section of `AGENTS.md`**.
When you add / move / delete `docs/*`, keep that section and the "Doc Set and Responsibilities" table above in sync.

Move facts to their owning document and cross-link instead of copying them.

## Checklist 1 — Organization (Run Every Time You Change a Doc)

- [ ] Added / renamed / deleted a doc → update the "Engineering conventions and task routing" list in [`AGENTS.md`](../AGENTS.md), the "Doc Set and Responsibilities" table here, **and** everywhere that references it.
- [ ] All relative links resolve (run the link check in *One-Shot Verification* below).
- [ ] Nothing that only exists on a feature branch is written as the state of `main` — either delete it, or explicitly mark it "planned (branch `X`)".
- [ ] No fact is duplicated across multiple docs; the doc that owns it holds it, the rest link to it.
- [ ] **Stale / invalid content has been fixed or deleted outright, with no "deprecated" / "old version" note left behind** (see Agentre's handling principle above).

## Checklist 2 — Fact-Checking (When a Doc States Concrete Content)

Verify **every** concrete assertion against the code. Common assertion types and how to check them:

| Assertion in the doc | What to verify it with |
| --- | --- |
| The three binaries exist (`agentre` / `agentred` / `agrctl`) | `git cat-file -e "$VERIFY_TREE":main.go` (repeat for `cmd/agentred/main.go` / `cmd/agrctl/main.go`) |
| service domain package list | `git ls-tree --name-only -d "$VERIFY_TREE" internal/service/` |
| repository / entity package list | `git ls-tree --name-only -d "$VERIFY_TREE" internal/repository/ internal/model/entity/` |
| `internal/pkg/` cross-cutting package list (**#1 drift source**) | `git ls-tree --name-only -d "$VERIFY_TREE" internal/pkg/` |
| external `pkg/` list | `git ls-tree --name-only -d "$VERIFY_TREE" pkg/` |
| `internal/daemon/` subpackages | `git ls-tree --name-only -d "$VERIFY_TREE" internal/daemon/` |
| Wails binding "one file per domain" | `git ls-tree -r --name-only "$VERIFY_TREE" internal/app/` (exclude `*_test.go`) |
| Some interface / identifier exists **under this exact name** (renames are the #1 source of drift) | `git grep "type Xxx interface" "$VERIFY_TREE" -- internal` / `git grep "func RegisterXxx" "$VERIFY_TREE" -- internal/repository` |
| repository uses the `Register` / accessor pattern | `git grep -n "^func Register" "$VERIFY_TREE" -- internal/repository` |
| migration count / naming prefix (`YYYYMMDDNNNN`) | `git ls-tree -r --name-only "$VERIFY_TREE" migrations/` + `git grep -oE "migration[0-9]{12}" "$VERIFY_TREE" -- migrations/migrations.go` |
| Counts ("N migrations", "N languages", "N tables") | Enumerate from the canonical list — don't trust prose, don't trust memory |
| i18n locale language count / module split | `git ls-tree -r --name-only "$VERIFY_TREE" frontend/src/i18n/locales/` (one `index.ts` barrel per language — `zh-CN` + `en` — each next to the same set of domain `*.json` modules) |
| frontend path alias | `git show "$VERIFY_TREE":frontend/components.json` → the `aliases` block |
| localStorage keys (`agentre.theme` / `windowSize` / `lastPath`) | `git grep -n -e 'agentre.theme' -e 'agentre.windowSize' -e 'agentre.lastPath' "$VERIFY_TREE" -- frontend/src` |
| `AppDataDir` paths / database table names | Cross-check `migrations/` + the entity's GORM tags; for table structure use the live DB `.schema` (see [debugging.md](./debugging.md)), don't go from memory |
| `.golangci.yml` settings / `//nolint` | `git show "$VERIFY_TREE":.golangci.yml` + `git grep -n "nolint:" "$VERIFY_TREE" -- internal` |
| cago framework import path | `git grep "github.com/cago-frame/cago" "$VERIFY_TREE" -- go.mod` |
| Signatures / constructors / switch branches | Open the file and compare parameter by parameter; don't guess |

Generated files are not a source of truth. `frontend/wailsjs/` is generated and ignored; tracked MockGen output lives under `internal/**/mock_*/`, `internal/**/mocks/`, or occasional co-located `mock_*_test.go`. Verify the owning interface or generator directive; see [Generated / self-managed files](./architecture.md#generated--self-managed-files).

## One-Shot Verification

The checks below read the staged tree. Run them from the `agentre/` repository root and compare the output with the docs:

```bash
VERIFY_TREE="$(git write-tree)"
echo "== three binaries =="
for f in main.go cmd/agentred/main.go cmd/agrctl/main.go; do
  git cat-file -e "$VERIFY_TREE:$f" 2>/dev/null && echo "ok   $f" || echo "missing from proposed tree $f"
done
echo "== service domain packages =="; git ls-tree --name-only -d "$VERIFY_TREE" internal/service/
echo "== repository packages =="; git ls-tree --name-only -d "$VERIFY_TREE" internal/repository/
echo "== entity packages =="; git ls-tree --name-only -d "$VERIFY_TREE" internal/model/entity/
echo "== internal/pkg cross-cutting packages (#1 drift source) =="; git ls-tree --name-only -d "$VERIFY_TREE" internal/pkg/
echo "== external pkg/ =="; git ls-tree --name-only -d "$VERIFY_TREE" pkg/
echo "== internal/daemon subpackages =="; git ls-tree --name-only -d "$VERIFY_TREE" internal/daemon/
echo "== Wails bindings (one file per domain, exclude _test) =="; git ls-tree -r --name-only "$VERIFY_TREE" internal/app/ | grep -vE '_test\.go$'
echo "== repository Register/accessor =="; git grep -n "^func Register" "$VERIFY_TREE" -- internal/repository
echo "== migration count + registered identifiers =="
git ls-tree -r --name-only "$VERIFY_TREE" migrations/ | grep -vE '_test\.go$|/migrations\.go$' | wc -l
git grep -hoE "migration[0-9]{12}" "$VERIFY_TREE" -- migrations/migrations.go | sort -u
echo "== i18n locale languages =="; git ls-tree -r --name-only "$VERIFY_TREE" frontend/src/i18n/locales/ | grep '/index.ts$'
echo "== i18n locale modules =="; git ls-tree -r --name-only "$VERIFY_TREE" frontend/src/i18n/locales/en/ | grep '\.json$'
echo "== frontend path aliases =="; git show "$VERIFY_TREE":frontend/components.json | grep -A6 '"aliases"'
echo "== localStorage keys =="; git grep -nE "agentre\.(theme|windowSize|lastPath)" "$VERIFY_TREE" -- frontend/src
echo "== golangci nilerr exception =="; git grep -n "nolint:nilerr" "$VERIFY_TREE" -- internal
echo "== cago import =="; git grep -n "github.com/cago-frame/cago" "$VERIFY_TREE" -- go.mod
```

The link check also reads Git's index, catches new or renamed docs before commit, and rejects out-of-repository targets that would fail in a standalone clone:

```bash
git ls-files --cached -- AGENTS.md CLAUDE.md CONTRIBUTING.md 'docs/*.md' 'docs/**/*.md' \
  e2e/README.md | while IFS= read -r doc; do
  git show ":$doc" >/dev/null 2>&1 || { echo "BROKEN staged source $doc"; continue; }
  # Strip fenced blocks and inline code first: sample paths are not links.
  git show ":$doc" | sed '/^```/,/^```/d' | sed -E 's/`[^`]*`//g' \
    | grep -oE '\]\(([^)]+)\)' | sed -E 's/^\]\(|\)$//g' | grep -vE '^https?:|^#|^mailto:' | while IFS= read -r link; do
    # These are evidence placeholders that become real only after the report template is copied.
    if [[ "$doc" == docs/references/verification-report-template.md &&
          "$link" =~ ^(screenshots|logs|resources)/ ]]; then
      echo "skip   template evidence placeholder $doc → $link"
      continue
    fi
    target="$(python3 -c 'import posixpath,sys; print(posixpath.normpath(sys.argv[1]))' "$(dirname "$doc")/${link%%#*}")"
    if [[ "$target" == ../* ]]; then
      echo "BROKEN out-of-repository target $doc → $link"
    elif git ls-files --cached -- "$target" "$target/**" | grep -q .; then
      echo "ok     $doc → $link"
    else
      echo "BROKEN $doc → $link"
    fi
  done
done
```

## What to Do When You Find an Inconsistency

Change docs to match the staged tree. If the code is wrong, follow [Fix Discipline](./develop.md#fix-discipline-hard-constraint): reproduce it with a failing regression test before changing code. Report any unsatisfied check, and leave unrelated cleanup out of the change.
