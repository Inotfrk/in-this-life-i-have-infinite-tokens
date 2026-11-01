#include <QGuiApplication>
#include <QImage>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickWindow>
#include <QTimer>
#include <QUrl>

#include <cstdio>

#include "ai_client.h"
#include "ai_provider.h"
#include "control_command.h"
#include "theme.h"

// 桌面入口。除了正常启动，还支持几个只服务于「无显示器确认界面」的参数：
//   --screenshot <文件>   把界面渲染成 PNG 后退出
//   --theme <名字>        启动时指定主题（dark / light / star）
//   --ai <服务商>          启动时指定 AI 服务商（deepseek / claude / gpt / …）
//   --endpoint <URL>        指定 AI 服务器地址
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

    Theme theme;
    const int themeIndex = args.indexOf(QStringLiteral("--theme"));
    if (themeIndex >= 0 && themeIndex + 1 < args.size())
        theme.setMode(args.at(themeIndex + 1));

    AiProvider ai;
    const int aiIndex = args.indexOf(QStringLiteral("--ai"));
    if (aiIndex >= 0 && aiIndex + 1 < args.size())
        ai.setCurrent(args.at(aiIndex + 1));

    CommandBus commands;
    AiClient aiClient;
    const int endpointIndex = args.indexOf(QStringLiteral("--endpoint"));
    if (endpointIndex >= 0 && endpointIndex + 1 < args.size())
        aiClient.setEndpoint(args.at(endpointIndex + 1));

    QQmlApplicationEngine engine;
    engine.rootContext()->setContextProperty(QStringLiteral("Theme"), &theme);
    engine.rootContext()->setContextProperty(QStringLiteral("Ai"), &ai);
    engine.rootContext()->setContextProperty(QStringLiteral("Commands"), &commands);
    engine.rootContext()->setContextProperty(QStringLiteral("AiClient"), &aiClient);
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
        QTimer::singleShot(800, window, [window, screenshotPath,
                                         mode = theme.mode(), aiId = ai.current()]() {
            const QImage image = window->grabWindow();
            const bool ok = image.save(screenshotPath);
            std::fprintf(stderr, "screenshot: %s -> %s (%dx%d, theme=%s, ai=%s)\n",
                         ok ? "saved" : "failed", qPrintable(screenshotPath),
                         image.width(), image.height(), qPrintable(mode),
                         qPrintable(aiId));
            QCoreApplication::exit(ok ? 0 : 1);
        });
    }

    return app.exec();
}
