#pragma once

#include <QObject>
#include <QString>
#include <QVariantList>
#include <QVariantMap>

class QNetworkAccessManager;
class QNetworkReply;

// 与「我们的服务器」通信的客户端。
//
// 架构（见 docs/design-ai-protocol.md）：
//   客户端 --(用户消息 + 软件当前状态)--> 我们的服务器 --(各家 API)--> AI
//   服务器 --(回复文本 + 控制指令列表)--> 客户端
//
// 客户端**不存任何厂商 API Key**，也不直接连任何厂商域名。
// 这样换模型、加配额、做审计都在服务端完成，客户端不用跟着改。
class AiClient : public QObject
{
    Q_OBJECT

    // 服务器地址；未配置时界面要明确提示「还没连服务器」
    Q_PROPERTY(QString endpoint READ endpoint WRITE setEndpoint NOTIFY endpointChanged)
    Q_PROPERTY(bool busy READ busy NOTIFY busyChanged)

public:
    explicit AiClient(QObject *parent = nullptr);

    QString endpoint() const { return m_endpoint; }
    void setEndpoint(const QString &url);

    bool busy() const { return m_busy; }

    // 发送一条用户消息。带上软件当前状态，服务器才知道「当前在哪个学科」这类上下文。
    Q_INVOKABLE void send(const QString &text, const QVariantMap &context);

signals:
    void endpointChanged();
    void busyChanged();

    // 服务器回包：reply 是给人看的文字，commands 是要本地执行的指令
    void replyReceived(const QString &reply, const QVariantList &commands);
    // 请求失败（网络、超时、服务器错误）。界面必须显示，不能静默。
    void failed(const QString &reason);

private:
    void setBusy(bool busy);
    void handleReply(QNetworkReply *reply);

    QString m_endpoint;
    bool m_busy = false;
    QNetworkAccessManager *m_network = nullptr;
};
