# In this life I have infinite tokens.

> **Repository state: collaboration rules only.**
> The previous prototype — the AI historical sandbox `worldsim` (agent messaging / memory / queues) —
> and its design note `docs/worldsim-mvp.md` were cleared on 2026-11-25. The earlier C++/Qt app,
> the Node backend, the design documents and screenshots had already been removed from the working tree.
> Everything still lives in the git history: find the commit with `git log --all --oneline` and inspect it by SHA.
>
> What stays is only *how we collaborate*:
>
> - Full rules: [AGENTS.md](AGENTS.md) (loaded on every conversation)
> - Backlog: [TODO.md](TODO.md) (the only list)
> - Agent notes: [NOTE.md](NOTE.md) (append only)
> - Branch registry: [.agents/branch-registry.md](.agents/branch-registry.md)
> - Remote rules: [scripts/github-rulesets.ps1](scripts/github-rulesets.ps1) (`master` / `develop` accept pull
>   requests only, `<account>-*` is pushable by its owner only)
>
> `docs/` is empty for now. When a design document is needed, create `docs/software-guide.md` following
> [.github/agents/project-designer.agent.md](.github/agents/project-designer.agent.md).

## How to use this repository (read this first)

There are exactly three branch layers, and changes only flow **upwards**:

| Layer | Branch | What it is |
| --- | --- | --- |
| 1 | `master` | **Released version** — always ready to ship |
| 2 | `develop` | **Development mainline** — where every developer converges |
| 3 | `<account>-<machine>-<suffix>` | **Your account's own branch** — push any time, isolated from others; each account only pushes its own prefix |

```mermaid
flowchart BT
    A["Layer 3: &lt;account&gt;-&lt;machine&gt;-ui<br/>(local work, push freely)"] --> B["Layer 3: &lt;account&gt;-&lt;machine&gt;-Main<br/>(machine integration branch)"]
    B --> C["Layer 2: develop<br/>(development mainline)"]
    C --> D["Layer 1: master<br/>(released version)"]
```

1. **Work in layer 3**: name branches `<account>-<machine>-<suffix>`, e.g. `inotfrk-Fairy-ui`.
   The account segment is the **GitHub username** (lowercase, and it owns the branch); the machine segment is
   the local `hostname` with spaces and illegal characters stripped; the suffix is yours; each machine's base
   branch always uses the `Main` suffix. See [.agents/branch-registry.md](.agents/branch-registry.md).
2. **Merge back into the local `-Main`** when a sub-branch is done; `-Main` is that machine's integration branch.
3. **Move `-Main` into `develop`** once a batch is ready — the single convergence point for all developers.
   Open a pull request (base `develop`, compare your `-Main`) and merge it; **you cannot push `develop` directly**.
   Push only content from your own account; on cross-account or mainline conflicts, never force push —
   keep the working state and **raise an OA**.
4. **`develop` promotes itself into `master`**: run `scripts\release.ps1` (macOS / Linux: `scripts/release.sh`),
   which runs the tests, opens a pull request, merges it and tags `v<date>`. [.github/workflows/release.yml](.github/workflows/release.yml)
   does the same automatically on every `develop` push.
5. **Onboard a new member**: invite as a GitHub collaborator → run `scripts\github-rulesets.ps1` to add the
   `<username>-*` rule → update [.agents/branch-registry.md](.agents/branch-registry.md).
6. **One backlog**: [TODO.md](TODO.md). Idle / overnight agents claim `queued` tasks following its
   protocol and commit the status change on its own first, so two agents never grab the same task.
7. **Self-check before promoting**: there is no code to test right now — check Markdown links and `TODO.md`
   status instead, see [AGENTS.md](AGENTS.md) section 4. When a new implementation lands, restore the
   build / sandbox / CI pipeline together with it.

Neither `master` nor `develop` takes direct pushes: both require a pull request. `develop` only takes
layer-3 pull requests, `master` only takes `develop` pull requests opened by the release script / workflow.
Only layer-3 `<account>-*` branches can be pushed directly, and only within your own account segment.

Full rules are in [AGENTS.md](AGENTS.md) (loaded on every conversation); agent notes are in [NOTE.md](NOTE.md).

## Contribution

1. Fork the repository
2. Branch off the local `-Main` as `<account>-<machine>-<suffix>`
3. Commit, self-check (Markdown links / TODO status), then merge back into `-Main`
4. Open a pull request against `develop`; `master` is promoted automatically

The branch rules are created and maintained by [scripts/github-rulesets.ps1](scripts/github-rulesets.ps1):
one `<prefix>-owner-only` rule per account segment, plus PR-only rules on `master` and `develop`.
