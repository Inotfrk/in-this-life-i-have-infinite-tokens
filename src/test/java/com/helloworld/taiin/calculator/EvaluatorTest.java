package com.helloworld.taiin.calculator;

/** 无第三方依赖的断言式测试入口，由 scripts/test 运行。 */
public final class EvaluatorTest {

    private static int passed;
    private static int failed;

    public static void main(String[] args) {
        check("1+2", 3);
        check("2*3+4", 10);
        check("2+3*4", 14);
        check("(2+3)*4", 20);
        check("10/4", 2.5);
        check("7%4", 3);
        check("2^10", 1024);
        check("2^3^2", 512);
        check("-3+1", -2);
        check("-(2+3)", -5);
        check("1.5*2", 3);
        check("0.1+0.2", 0.30000000000000004);
        check("8÷2×3", 12);
        check("（1+2）*3", 9);
        check("  4 - 6 ", -2);
        check("1--2", 3);
        check("2^-1", 0.5);
        checkFormat(3.0, "3");
        checkFormat(2.5, "2.5");
        checkFormat(1.0 / 3, "0.333333333333333");
        checkError("1+");
        checkError("(1+2");
        checkError("1/0");
        checkError("abc");
        checkError("");

        System.out.println();
        System.out.println("通过 " + passed + " 项，失败 " + failed + " 项");
        if (failed > 0) {
            System.exit(1);
        }
    }

    private static void check(String expression, double expected) {
        try {
            double actual = ExpressionEvaluator.evaluate(expression);
            if (Math.abs(actual - expected) < 1e-9) {
                ok(expression + " = " + expected);
            } else {
                bad(expression + " 期望 " + expected + "，实际 " + actual);
            }
        } catch (RuntimeException ex) {
            bad(expression + " 抛出异常: " + ex.getMessage());
        }
    }

    private static void checkFormat(double value, String expected) {
        String actual = CalculatorFrame.format(value);
        if (expected.equals(actual)) {
            ok("format(" + value + ") = " + expected);
        } else {
            bad("format(" + value + ") 期望 " + expected + "，实际 " + actual);
        }
    }

    private static void checkError(String expression) {
        try {
            double actual = ExpressionEvaluator.evaluate(expression);
            bad("\"" + expression + "\" 应当报错，却返回 " + actual);
        } catch (RuntimeException ex) {
            ok("\"" + expression + "\" 正确报错: " + ex.getMessage());
        }
    }

    private static void ok(String message) {
        passed++;
        System.out.println("[PASS] " + message);
    }

    private static void bad(String message) {
        failed++;
        System.out.println("[FAIL] " + message);
    }
}
