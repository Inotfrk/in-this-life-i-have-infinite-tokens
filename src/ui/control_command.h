#pragma once

#include <QObject>
#include <QVariantMap>

// 本地控制指令总线。
//
// 架构（见 docs/design-ai-protocol.md）：
//   客户端 → 我们的服务器 → AI 厂商
//   服务器 → 客户端：{ "reply": "...", "commands": [ { "op": "...", ... } ] }
//   客户端**只执行白名单里的指令**，服务器无法让客户端做任意事情。
//
// 为什么要单独一层：把「AI 说什么」和「软件做什么」彻底分开。
// 换服务商、换模型、换成自建后端，都不影响这里的执行逻辑。
class CommandBus : public QObject
{
    Q_OBJECT

public:
    explicit CommandBus(QObject *parent = nullptr);

    // 执行一条指令。返回 false 表示指令不被支持（会被记录下来，不会静默吞掉）。
    Q_INVOKABLE bool execute(const QVariantMap &command);

    // 支持的指令名，用来给服务器做能力声明，也方便调试
    Q_INVOKABLE QStringList supportedOps() const;

signals:
    // 界面按这些信号改自己的状态；指令层不直接持有界面对象
    void setSubjectRequested(const QString &subjectId);
    void openChatRequested();
    void closeChatRequested();
    void openSettingsRequested();
    void setThemeRequested(const QString &themeId);
    void setProviderRequested(const QString &providerId);

    // 收到不认识的指令：界面上应提示，而不是假装成功
    void rejected(const QString &op, const QString &reason);
    // 执行成功，用于回填给对话一个回执
    void executed(const QString &op, const QString &humanReadable);
};
