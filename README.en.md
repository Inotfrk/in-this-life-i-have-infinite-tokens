# In this life I have infinite tokens.

A cross-platform desktop calculator written with **plain JDK (Java 21 + Swing)** — no third-party
dependencies, no Maven/Gradle. It builds, runs and packages into native installers on Windows and macOS.

#### Features

- Full expression evaluation with `+ - * / % ^`, parentheses, decimals and unary signs
- Right-associative power: `2^3^2 = 512`
- Keyboard: `Enter` evaluate, `Esc` clear, `Backspace` delete, `Ctrl+C` copy result, `Ctrl+A` recall last expression
- Operators typed after a result continue from that result
- Chinese error messages for divide-by-zero and mismatched parentheses
- Native look and feel, HiDPI aware

#### Software Architecture

```
src/main/java/com/helloworld/taiin/calculator/
    ExpressionEvaluator.java   Recursive-descent evaluator (UI-independent)
    CalculatorFrame.java       Swing UI and key handling
src/test/java/com/helloworld/taiin/calculator/
    EvaluatorTest.java         25 evaluator checks
    UiTest.java                6 UI key checks (skipped when headless)
scripts/
    build.ps1                  Windows build script
    build.sh                   macOS / Linux build script
```

#### Installation

Requires **JDK 21 or newer** (a full JDK — a JRE has no `javac`, `jar` or `jpackage`).

1. `java -version`
2. Clone the repository
3. `scripts\build.ps1 -Task build` (macOS / Linux: `scripts/build.sh build`)

#### Instructions

| Action | Windows | macOS / Linux |
| --- | --- | --- |
| Run | `scripts\build.ps1 -Task run` | `scripts/build.sh run` |
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

Cross-platform packaging runs in CI, so neither platform has to be built by hand:

| Platform | File | Artifacts |
| --- | --- | --- |
| GitHub Actions | [.github/workflows/package.yml](.github/workflows/package.yml) | macOS `dmg`, Windows `zip` + `msi`, uploaded as artifacts |
| Gitee Go | [.workflow/package.yml](.workflow/package.yml) | runs tests on Linux and archives the cross-platform `Calculator.jar` |

CI runs on pushes to `master` / `hello-world-tai-*-Main` / `v*` tags, or manually via
`workflow_dispatch` (version can be overridden). Artifacts are kept for 30 days.

You can also run the jar directly: `java -jar dist\Calculator.jar`.

#### Contribution

1. Fork the repository
2. Create a Feat_xxx branch
3. Commit your code
4. Open a Pull Request
