package com.helloworld.taiin.calculator;

/**
 * 递归下降表达式求值器。
 * 支持 + - * / % ^、括号、一元正负号；乘方右结合，^ 的优先级高于一元负号。
 */
public final class ExpressionEvaluator {

    private final String source;
    private int pos;

    private ExpressionEvaluator(String source) {
        this.source = source;
    }

    public static double evaluate(String expression) {
        if (expression == null) {
            throw new IllegalArgumentException("表达式为空");
        }
        String normalized = expression
                .replace('×', '*')
                .replace('÷', '/')
                .replace('−', '-')
                .replace('（', '(')
                .replace('）', ')')
                .trim();
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("表达式为空");
        }
        ExpressionEvaluator parser = new ExpressionEvaluator(normalized);
        double value = parser.parseExpression();
        parser.skipSpaces();
        if (parser.pos < normalized.length()) {
            throw new IllegalArgumentException("无法识别: " + normalized.substring(parser.pos));
        }
        return value;
    }

    private double parseExpression() {
        double value = parseTerm();
        while (true) {
            skipSpaces();
            if (consume('+')) {
                value += parseTerm();
            } else if (consume('-')) {
                value -= parseTerm();
            } else {
                return value;
            }
        }
    }

    private double parseTerm() {
        double value = parseUnary();
        while (true) {
            skipSpaces();
            if (consume('*')) {
                value *= parseUnary();
            } else if (consume('/')) {
                value = divide(value, parseUnary());
            } else if (consume('%')) {
                value = modulo(value, parseUnary());
            } else {
                return value;
            }
        }
    }

    private double parseUnary() {
        skipSpaces();
        if (consume('+')) {
            return parseUnary();
        }
        if (consume('-')) {
            return -parseUnary();
        }
        return parsePower();
    }

    private double parsePower() {
        double base = parsePrimary();
        skipSpaces();
        if (consume('^')) {
            return Math.pow(base, parseUnary());
        }
        return base;
    }

    private double parsePrimary() {
        skipSpaces();
        if (pos >= source.length()) {
            throw new IllegalArgumentException("表达式不完整");
        }
        char c = source.charAt(pos);
        if (c == '(') {
            pos++;
            double value = parseExpression();
            skipSpaces();
            if (!consume(')')) {
                throw new IllegalArgumentException("括号不匹配");
            }
            return value;
        }
        if (Character.isDigit(c) || c == '.') {
            return parseNumber();
        }
        throw new IllegalArgumentException("无法识别: " + c);
    }

    private double parseNumber() {
        int start = pos;
        boolean hasDot = false;
        while (pos < source.length()) {
            char c = source.charAt(pos);
            if (Character.isDigit(c)) {
                pos++;
            } else if (c == '.' && !hasDot) {
                hasDot = true;
                pos++;
            } else {
                break;
            }
        }
        String text = source.substring(start, pos);
        try {
            return Double.parseDouble(text);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("数字格式错误: " + text);
        }
    }

    private void skipSpaces() {
        while (pos < source.length() && Character.isWhitespace(source.charAt(pos))) {
            pos++;
        }
    }

    private static double divide(double left, double right) {
        if (right == 0) {
            throw new ArithmeticException("除数不能为零");
        }
        return left / right;
    }

    private static double modulo(double left, double right) {
        if (right == 0) {
            throw new ArithmeticException("除数不能为零");
        }
        return left % right;
    }

    private boolean consume(char expected) {
        if (pos < source.length() && source.charAt(pos) == expected) {
            pos++;
            return true;
        }
        return false;
    }
}
