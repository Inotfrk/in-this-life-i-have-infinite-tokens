#include <QGuiApplication>
#include <QImage>
#include <QQmlApplicationEngine>
#include <QQuickWindow>
#include <QTimer>
#include <QUrl>

#include <cstdio>

// 桌面入口。除了正常启动，还支持 `--screenshot <文件>`：把界面渲染成 PNG 后退出。
// 这个开关只服务于「无显示器环境下确认界面」，不参与任何业务逻辑。
int main(int argc, char *argv[])
{
    QGuiApplication app(argc, argv);
    app.setApplicationName(QStringLiteral("Infinite Tokens"));
    app.setApplicationDisplayName(QStringLiteral("Infinite Tokens"));
    app.setOrganizationName(QStringLiteral("Inotfrk"));

    QString screenshotPath;
    const QStringList args = app.arguments();
    const int shotIndex = args.indexOf(QStringLiteral("--screenshot"));
    if (shotIndex >= 0 && shotIndex + 1 < args.size())
        screenshotPath = args.at(shotIndex + 1);

    QQmlApplicationEngine engine;
    engine.load(QUrl(QStringLiteral("qrc:/src/ui/qml/Main.qml")));
    if (engine.rootObjects().isEmpty())
        return -1;

    if (!screenshotPath.isEmpty()) {
        auto *window = qobject_cast<QQuickWindow *>(engine.rootObjects().constFirst());
        if (!window) {
            std::fprintf(stderr, "screenshot: root object is not a window\n");
            return -1;
        }
        // 等一帧画完再抓，否则拿到的是空图。
        QTimer::singleShot(800, window, [window, screenshotPath]() {
            const QImage image = window->grabWindow();
            const bool ok = image.save(screenshotPath);
            std::fprintf(stderr, "screenshot: %s -> %s (%dx%d)\n",
                         ok ? "saved" : "failed",
                         qPrintable(screenshotPath), image.width(), image.height());
            QCoreApplication::exit(ok ? 0 : 1);
        });
    }

    return app.exec();
}
