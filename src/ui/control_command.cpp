#include "control_command.h"

#include <QSet>
#include <QStringList>

namespace {

// 指令白名单。只有列在这里的操作才可能被执行——
// 这是整个设计的核心安全边界：服务器（或被劫持的服务器）无法让客户端做白名单外的事。
const QSet<QString> &AllowedOps()
{
    static const QSet<QString> ops{
        QStringLiteral("ui.set_subject"),        // 切换当前学科
        QStringLiteral("ui.open_chat"),          // 打开对话面板
        QStringLiteral("ui.close_chat"),         // 关闭对话面板
        QStringLiteral("ui.open_settings"),      // 打开设置
        QStringLiteral("ui.set_theme"),          // 切换主题
        QStringLiteral("ai.set_provider"),       // 切换 AI 服务商
    };
    return ops;
}

QString ArgText(const QVariantMap &cmd, const QString &key)
{
    return cmd.value(key).toString().trimmed();
}

} // namespace

CommandBus::CommandBus(QObject *parent)
    : QObject(parent)
{
}

QStringList CommandBus::supportedOps() const
{
    QStringList list(AllowedOps().begin(), AllowedOps().end());
    list.sort();
    return list;
}

bool CommandBus::execute(const QVariantMap &command)
{
    const QString op = ArgText(command, QStringLiteral("op"));

    if (op.isEmpty()) {
        emit rejected(op, QStringLiteral("指令缺少 op 字段"));
        return false;
    }
    if (!AllowedOps().contains(op)) {
        emit rejected(op, QStringLiteral("不支持的指令：%1").arg(op));
        return false;
    }

    const QString arg = ArgText(command, QStringLiteral("arg"));

    if (op == QLatin1String("ui.set_subject")) {
        if (arg.isEmpty()) {
            emit rejected(op, QStringLiteral("ui.set_subject 需要 arg（学科 id）"));
            return false;
        }
        emit setSubjectRequested(arg);
        emit executed(op, QStringLiteral("已切换到学科 %1").arg(arg));
        return true;
    }
    if (op == QLatin1String("ui.open_chat")) {
        emit openChatRequested();
        emit executed(op, QStringLiteral("已打开对话"));
        return true;
    }
    if (op == QLatin1String("ui.close_chat")) {
        emit closeChatRequested();
        emit executed(op, QStringLiteral("已关闭对话"));
        return true;
    }
    if (op == QLatin1String("ui.open_settings")) {
        emit openSettingsRequested();
        emit executed(op, QStringLiteral("已打开设置"));
        return true;
    }
    if (op == QLatin1String("ui.set_theme")) {
        if (arg.isEmpty()) {
            emit rejected(op, QStringLiteral("ui.set_theme 需要 arg（主题名）"));
            return false;
        }
        emit setThemeRequested(arg);
        emit executed(op, QStringLiteral("已切换主题为 %1").arg(arg));
        return true;
    }
    if (op == QLatin1String("ai.set_provider")) {
        if (arg.isEmpty()) {
            emit rejected(op, QStringLiteral("ai.set_provider 需要 arg（服务商 id）"));
            return false;
        }
        emit setProviderRequested(arg);
        emit executed(op, QStringLiteral("已切换到 %1").arg(arg));
        return true;
    }

    // 白名单里有但没有实现分支：属于代码 bug，明确报出来
    emit rejected(op, QStringLiteral("指令 %1 未实现").arg(op));
    return false;
}
