# In this life I have infinite tokens.

A cross-platform calculator written in **C++17**: the whole program lives in a single source file,
with **no third-party dependencies** and no build system beyond one compiler command. The repository
doubles as a sample of how a small project is kept with branches, a task queue and agent collaboration —
read this page and you know how the repo is meant to be used.

#### Features

- Full expression evaluation with `+ - * / % ^`, parentheses, decimals and unary signs
- Right-associative power: `2^3^2 = 512`
- Commands: type an expression and press Enter to evaluate, `clear`, `del`, `copy` (print last result), `recall`
- Operators typed after a result continue from that result
- Chinese error messages for divide-by-zero and mismatched parentheses
- Single file, no global state: `std::string` slices plus a recursive-descent parser

#### Software Architecture

```
calculator.cpp        The single-file sample once ported: parser + REPL (planned)
scripts/
    build.ps1         Windows build script (build / test / run / jar / package / clean)
    build.sh          macOS / Linux build script
src/                  Earlier Java implementation (historical sample, still built by scripts/)
```

The single-file layout is just a handful of functions, read top to bottom:

```cpp
// calculator.cpp — structure sketch
double parseExpression();   // top level: + and -
double parseTerm();         // * / %
double parsePower();        // ^, right-associative
double parseUnary();        // unary +/-
double parsePrimary();      // numbers and parentheses
```

> **Current state:** the implementation that actually runs and is covered by `scripts/` is still the
> earlier Java one under `src/main/java`. The C++ single-file form is the target; `calculator.cpp` is not
> in the repository yet and the port is queued in [TODO.md](TODO.md). Steps marked "C++ sample" below
> work once the port lands.

#### Installation

**C++ sample** (available after the port): only a C++17 compiler is needed (MSVC or MinGW-w64 `g++` on
Windows, `clang++` or `g++` on macOS / Linux). No libraries to install.

1. `g++ --version` (Windows: `cl` / `clang++` also work)
2. Clone the repository
3. `g++ -std=c++17 -O2 calculator.cpp -o calculator`

**Existing Java implementation** (the one `scripts/` covers): requires **JDK 21 or newer**
(a full JDK — a JRE has no `javac`, `jar` or `jpackage`).

1. `java -version`
2. `scripts\build.ps1 -Task build` (macOS / Linux: `scripts/build.sh build`)

#### Instructions

| Action | Windows | macOS / Linux |
| --- | --- | --- |
| Run the C++ sample (after compiling) | `calculator.exe` | `./calculator` |
| Run the Java UI | `scripts\build.ps1 -Task run` | `scripts/build.sh run` |
| Run all tests | `scripts\build.ps1 -Task test` | `scripts/build.sh test` |
| Build runnable jar | `scripts\build.ps1 -Task jar` → `dist\Calculator.jar` | `scripts/build.sh jar` |
| Build installer | `scripts\build.ps1 -Task package` | `scripts/build.sh package` |
| Clean | `scripts\build.ps1 -Task clean` | `scripts/build.sh clean` |

Packaging notes:

- **Windows**: one run produces both
  - `dist\Calculator\Calculator.exe` — portable app, no install needed; zipped into
    `dist\Calculator-<version>-windows-x64-portable.zip`
  - `dist\Calculator-<version>.msi` — installer, requires [WiX Toolset 3](https://wixtoolset.org/)
    on `PATH`. Without WiX only the msi step is skipped; the portable build still succeeds
- **macOS**: one run produces `dist/Calculator.app` (portable) and `dist/Calculator-<version>.dmg`
- **Version**: `-Task package -Version 1.2.0` (Windows) or `APP_VERSION=1.2.0 scripts/build.sh package`

Cross-platform packaging is defined in CI, but **no CI actually runs in this repository**: the remote is
Gitee, so `.github/workflows/package.yml` never triggers, and [.workflow/package.yml](.workflow/package.yml)
is only a Gitee Go pipeline definition that has to be enabled by hand and only offers Linux runners
(no `dmg` / `msi` / `exe`). Build installers locally with `scripts\build.ps1 -Task package` or
`scripts/build.sh package`.

You can also run the jar directly: `java -jar dist\Calculator.jar`.

#### How to use this repository (read this first)

The point of the repo is not only the calculator but the workflow it demonstrates:

1. **One branch per machine**: name branches `<account>-<machine>-<suffix>`, e.g.
   `hello-world-tai-Fairy-Main`. The account segment is the Gitee account name, the machine segment is
   `hostname`, the suffix is yours; each machine's base branch always uses the `Main` suffix.
2. **Sub-branches start from the local `-Main`** and merge back into it, which then decides whether the
   work goes to `master`. `master` only takes pull requests.
3. **Register before you work**: repository paths, parents and purposes live in
   [.agents/branch-registry.md](.agents/branch-registry.md); agents use the repository path to identify
   which machine they run on.
4. **One backlog**: [TODO.md](TODO.md). Idle / overnight agents claim `queued` tasks following its
   protocol and commit the status change on its own first, so two agents never grab the same task.
5. **Verify before committing**: `scripts\build.ps1 -Task test` (macOS / Linux: `scripts/build.sh test`).
   Push the machine branch after each iteration; merge into `master` when a small feature is done.

Full rules are in [AGENTS.md](AGENTS.md) (loaded on every conversation); agent notes are in [NOTE.md](NOTE.md).

#### Contribution

1. Fork the repository
2. Branch off the local `-Main` as `<account>-<machine>-<suffix>`
3. Commit your code with tests passing
4. Open a Pull Request
