package com.helloworld.taiin.calculator;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTextField;
import javax.swing.KeyStroke;
import javax.swing.SwingConstants;
import javax.swing.UIManager;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.GridLayout;
import java.awt.Toolkit;
import java.awt.datatransfer.StringSelection;
import java.awt.event.ActionEvent;
import java.awt.event.KeyEvent;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;

public final class CalculatorFrame extends JFrame {

    private final JTextField display = new JTextField("0");
    private final JLabel status = new JLabel(" ");
    private final Map<String, JButton> buttons = new LinkedHashMap<>();

    private String lastExpression = "";
    private boolean justEvaluated;

    public CalculatorFrame() {
        super("计算器");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setMinimumSize(new Dimension(360, 520));
        setLocationRelativeTo(null);
        setContentPane(buildContent());
        registerShortcuts();
        pack();
        setSize(400, 560);
        setLocationRelativeTo(null);
        display.requestFocusInWindow();
    }

    private JPanel buildContent() {
        JPanel root = new JPanel(new BorderLayout(0, 8));
        root.setBorder(BorderFactory.createEmptyBorder(12, 12, 12, 12));

        display.setHorizontalAlignment(SwingConstants.RIGHT);
        display.setEditable(true);
        display.setFont(new Font(Font.MONOSPACED, Font.BOLD, 28));
        display.setPreferredSize(new Dimension(0, 64));
        display.addActionListener(e -> evaluate());

        status.setForeground(new Color(0x8A8A8A));
        status.setFont(status.getFont().deriveFont(Font.PLAIN, 12f));
        status.setText(" ");

        JPanel top = new JPanel(new BorderLayout(0, 4));
        top.add(display, BorderLayout.CENTER);
        top.add(status, BorderLayout.SOUTH);
        root.add(top, BorderLayout.NORTH);

        JPanel keypad = new JPanel(new GridLayout(5, 4, 6, 6));
        String[][] layout = {
                {"C", "⌫", "(", ")"},
                {"7", "8", "9", "÷"},
                {"4", "5", "6", "×"},
                {"1", "2", "3", "−"},
                {"0", ".", "%", "+"}
        };
        for (String[] row : layout) {
            for (String key : row) {
                keypad.add(createButton(key));
            }
        }
        JPanel center = new JPanel(new BorderLayout(0, 6));
        center.add(keypad, BorderLayout.CENTER);
        center.add(createButton("="), BorderLayout.SOUTH);
        root.add(center, BorderLayout.CENTER);
        return root;
    }

    private JButton createButton(String key) {
        JButton button = "=".equals(key) ? new AccentButton(key) : new JButton(key);
        button.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 20));
        button.setFocusable(false);
        button.addActionListener(e -> onKey(key));
        buttons.put(key, button);
        if ("=".equals(key)) {
            button.setPreferredSize(new Dimension(0, 52));
        }
        return button;
    }

    /** 外观管理器会忽略 setBackground，这里自行绘制强调色背景。 */
    private static final class AccentButton extends JButton {

        private static final Color ACCENT = new Color(0x2D7FF9);
        private boolean hovered;

        AccentButton(String text) {
            super(text);
            setForeground(Color.WHITE);
            setContentAreaFilled(false);
            setBorderPainted(false);
            setOpaque(false);
            addMouseListener(new java.awt.event.MouseAdapter() {
                @Override
                public void mouseEntered(java.awt.event.MouseEvent e) {
                    hovered = true;
                    repaint();
                }

                @Override
                public void mouseExited(java.awt.event.MouseEvent e) {
                    hovered = false;
                    repaint();
                }
            });
        }

        @Override
        protected void paintComponent(java.awt.Graphics g) {
            java.awt.Graphics2D g2 = (java.awt.Graphics2D) g.create();
            g2.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING,
                    java.awt.RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setColor(hovered ? ACCENT.brighter() : ACCENT);
            g2.fillRoundRect(0, 0, getWidth(), getHeight(), 8, 8);
            g2.dispose();
            super.paintComponent(g);
        }
    }

    private void registerShortcuts() {
        bindKey(KeyStroke.getKeyStroke(KeyEvent.VK_ENTER, 0), "eval", this::evaluate);
        bindKey(KeyStroke.getKeyStroke(KeyEvent.VK_EQUALS, KeyEvent.SHIFT_DOWN_MASK), "eval2", this::evaluate);
        bindKey(KeyStroke.getKeyStroke(KeyEvent.VK_ESCAPE, 0), "clear", this::clearAll);
        bindKey(KeyStroke.getKeyStroke(KeyEvent.VK_BACK_SPACE, 0), "back", this::backspace);
        bindKey(KeyStroke.getKeyStroke(KeyEvent.VK_C, KeyEvent.CTRL_DOWN_MASK), "copy", this::copyResult);
        bindKey(KeyStroke.getKeyStroke(KeyEvent.VK_A, KeyEvent.CTRL_DOWN_MASK), "again",
                () -> insertText(lastExpression));
    }

    private void bindKey(KeyStroke stroke, String id, Runnable action) {
        getRootPane().getInputMap(javax.swing.JComponent.WHEN_IN_FOCUSED_WINDOW).put(stroke, id);
        getRootPane().getActionMap().put(id, new javax.swing.AbstractAction() {
            @Override
            public void actionPerformed(ActionEvent e) {
                action.run();
            }
        });
    }

    private void onKey(String key) {
        switch (key) {
            case "C" -> clearAll();
            case "⌫" -> backspace();
            case "=" -> evaluate();
            default -> append(key);
        }
    }

    private void append(String text) {
        String current = display.getText();
        if (justEvaluated) {
            // 计算完成后输入运算符时接着上一次的结果继续算
            current = OPERATORS.contains(text) ? current : "";
            justEvaluated = false;
        }
        if ("0".equals(current)) {
            current = ".".equals(text) ? "0" : "";
        }
        insertText(current + text);
    }

    private static final String OPERATORS = "+−×÷^%";

    private void insertText(String text) {
        display.setText(text.isEmpty() ? "0" : text);
        display.setCaretPosition(display.getText().length());
        status.setText(" ");
        justEvaluated = false;
    }

    private void clearAll() {
        insertText("0");
        lastExpression = "";
    }

    private void backspace() {
        if (justEvaluated) {
            clearAll();
            return;
        }
        String current = display.getText();
        if (current.isEmpty() || "0".equals(current)) {
            insertText("0");
            return;
        }
        insertText(current.substring(0, current.length() - 1));
        if (display.getText().isEmpty()) {
            insertText("0");
        }
    }

    void press(String key) {
        onKey(key);
    }

    String displayText() {
        return display.getText();
    }

    String statusText() {
        return status.getText();
    }

    void evaluate() {
        String expression = display.getText().trim();
        if (expression.isEmpty()) {
            return;
        }
        try {
            double value = ExpressionEvaluator.evaluate(expression);
            if (Double.isNaN(value) || Double.isInfinite(value)) {
                throw new ArithmeticException("结果无效");
            }
            lastExpression = expression;
            display.setText(format(value));
            display.setCaretPosition(display.getText().length());
            status.setText(expression.replace('*', '×').replace('/', '÷') + " =");
            justEvaluated = true;
        } catch (RuntimeException ex) {
            status.setText("错误：" + ex.getMessage());
            justEvaluated = false;
        }
    }

    private void copyResult() {
        String text = display.getText();
        Toolkit.getDefaultToolkit().getSystemClipboard().setContents(new StringSelection(text), null);
        status.setText("已复制：" + text);
    }

    static String format(double value) {
        if (value == Math.rint(value) && Math.abs(value) < 1e15) {
            return Long.toString((long) value);
        }
        BigDecimal decimal = new BigDecimal(value, new MathContext(15, RoundingMode.HALF_UP));
        BigDecimal stripped = decimal.stripTrailingZeros();
        String plain = stripped.toPlainString();
        if (plain.length() > 22) {
            return String.format("%.10g", value);
        }
        return plain;
    }

    public static void main(String[] args) {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {
            // 保持默认外观
        }
        javax.swing.SwingUtilities.invokeLater(() -> new CalculatorFrame().setVisible(true));
    }
}
