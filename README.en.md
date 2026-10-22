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

- **Windows**: builds an `msi`, which needs [WiX Toolset 3](https://wixtoolset.org/). When WiX is
  missing the script falls back to `dist\Calculator\Calculator.exe`, a portable app you can double-click.
- **macOS**: builds a `dmg` in `dist/`.

You can also run the jar directly: `java -jar dist\Calculator.jar`.

#### Contribution

1. Fork the repository
2. Create a Feat_xxx branch
3. Commit your code
4. Open a Pull Request
