package com.helloworld.taiin.calculator;

import javax.swing.SwingUtilities;

/**
 * 在真实窗口里驱动计算器并截图用的小工具（只用于沙箱可视调试）。
 *
 * 通过 {@link CalculatorFrame#press(String)} 注入按键，而不是模拟鼠标坐标，
 * 因为按钮布局会随字体和窗口尺寸浮动，按坐标点很容易点偏。
 *
 * 用法：java -cp build/classes com.helloworld.taiin.calculator.VisualDrive "1/0="
 * 参数里的 × ÷ 会自动换成 * /。程序保持窗口打开，交由外部 import -window root 截图。
 */
public final class VisualDrive {

    public static void main(String[] args) throws Exception {
        String keys = args.length > 0 ? args[0] : "12*3+4=";
        int holdSeconds = args.length > 1 ? Integer.parseInt(args[1]) : 30;

        keys = keys.replace('×', '*').replace('÷', '/');

        final String script = keys;
        final CalculatorFrame[] holder = new CalculatorFrame[1];

        SwingUtilities.invokeAndWait(() -> {
            CalculatorFrame frame = new CalculatorFrame();
            frame.setVisible(true);
            holder[0] = frame;
        });

        // 等窗口真正映射到屏幕上，否则截图会拍到空桌面
        Thread.sleep(1200);

        SwingUtilities.invokeAndWait(() -> {
            CalculatorFrame frame = holder[0];
            for (int i = 0; i < script.length(); i++) {
                frame.press(String.valueOf(script.charAt(i)));
            }
            frame.requestFocus();
        });

        Thread.sleep(500);
        SwingUtilities.invokeAndWait(() -> {
            CalculatorFrame frame = holder[0];
            System.out.println("display=" + frame.displayText());
            System.out.println("status=" + frame.statusText());
        });

        // 保持窗口存活，让外部脚本有机会截图
        Thread.sleep(holdSeconds * 1000L);
        System.exit(0);
    }
}
