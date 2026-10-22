package com.helloworld.taiin.calculator;

import javax.swing.SwingUtilities;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 直接调用界面按键逻辑，不模拟系统键盘（避免影响其他窗口）。
 * 需要图形环境；无图形环境时自动跳过。
 */
public final class UiTest {

    private static int passed;
    private static int failed;

    public static void main(String[] args) {
        if (java.awt.GraphicsEnvironment.isHeadless()) {
            System.out.println("[SKIP] 无图形环境，跳过界面测试");
            return;
        }
        try {
            run("12×3+4=", "40", null);
            run("2^10=", "1024", null);
            run("1÷0=", "1÷0", "错误：除数不能为零");
            run("1+2=C", "0", null);
            run("9×9=+1=", "82", null);
            run("3.5+1.5=", "5", null);
        } catch (Exception ex) {
            ex.printStackTrace();
            failed++;
        }
        System.out.println();
        System.out.println("界面测试通过 " + passed + " 项，失败 " + failed + " 项");
        if (failed > 0) {
            System.exit(1);
        }
        System.exit(0);
    }

    private static void run(String keys, String expectedDisplay, String expectedStatus) throws Exception {
        AtomicReference<String> actualDisplay = new AtomicReference<>();
        AtomicReference<String> actualStatus = new AtomicReference<>();
        SwingUtilities.invokeAndWait(() -> {
            CalculatorFrame frame = new CalculatorFrame();
            for (char c : keys.toCharArray()) {
                frame.press(String.valueOf(c));
            }
            actualDisplay.set(frame.displayText());
            actualStatus.set(frame.statusText());
            frame.dispose();
        });
        boolean displayOk = expectedDisplay.equals(actualDisplay.get());
        boolean statusOk = expectedStatus == null || actualStatus.get().startsWith(expectedStatus);
        if (displayOk && statusOk) {
            passed++;
            System.out.println("[PASS] 按键 " + keys + " -> " + actualDisplay.get()
                    + (expectedStatus == null ? "" : " | " + actualStatus.get()));
        } else {
            failed++;
            System.out.println("[FAIL] 按键 " + keys + " 期望 " + expectedDisplay
                    + (expectedStatus == null ? "" : " / " + expectedStatus)
                    + "，实际 " + actualDisplay.get() + " / " + actualStatus.get());
        }
    }
}
