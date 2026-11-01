#include "ai_client.h"

#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QTimer>
#include <QUrl>

namespace {
// 服务器没了响应时不能一直转圈，超时后明确报错。
constexpr int kTimeoutMs = 60000;
} // namespace

AiClient::AiClient(QObject *parent)
    : QObject(parent)
    , m_network(new QNetworkAccessManager(this))
{
}

void AiClient::setEndpoint(const QString &url)
{
    if (m_endpoint == url)
        return;
    m_endpoint = url;
    emit endpointChanged();
}

void AiClient::setBusy(bool busy)
{
    if (m_busy == busy)
        return;
    m_busy = busy;
    emit busyChanged();
}

void AiClient::send(const QString &text, const QVariantMap &context)
{
    if (m_busy) {
        emit failed(QStringLiteral("上一条消息还在处理中"));
        return;
    }
    if (text.trimmed().isEmpty()) {
        emit failed(QStringLiteral("消息为空"));
        return;
    }
    if (m_endpoint.trimmed().isEmpty()) {
        // 这是当前最常见的情况：服务器还没搭起来。必须说清楚，不能假装在思考。
        emit failed(QStringLiteral("还没有配置服务器地址，无法发送。"
                                   "请在设置里填写服务器地址，或等我们提供的服务上线。"));
        return;
    }

    const QUrl url(m_endpoint);
    if (!url.isValid() || url.scheme().isEmpty()) {
        emit failed(QStringLiteral("服务器地址无效：%1").arg(m_endpoint));
        return;
    }

    QJsonObject body;
    body.insert(QStringLiteral("message"), text);
    body.insert(QStringLiteral("context"), QJsonObject::fromVariantMap(context));

    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader,
                      QStringLiteral("application/json; charset=utf-8"));
    request.setTransferTimeout(kTimeoutMs);

    QNetworkReply *reply = m_network->post(request, QJsonDocument(body).toJson(QJsonDocument::Compact));

    setBusy(true);
    connect(reply, &QNetworkReply::finished, this, [this, reply]() { handleReply(reply); });
}

void AiClient::handleReply(QNetworkReply *reply)
{
    reply->deleteLater();
    setBusy(false);

    if (reply->error() != QNetworkReply::NoError) {
        // 超时单独说清楚，否则用户只会看到 "Operation canceled"
        if (reply->error() == QNetworkReply::OperationCanceledError
            || reply->error() == QNetworkReply::TimeoutError) {
            emit failed(QStringLiteral("服务器超时（%1 秒）").arg(kTimeoutMs / 1000));
            return;
        }
        emit failed(QStringLiteral("请求失败：%1").arg(reply->errorString()));
        return;
    }

    const QByteArray payload = reply->readAll();
    QJsonParseError parseError{};
    const QJsonDocument doc = QJsonDocument::fromJson(payload, &parseError);
    if (parseError.error != QJsonParseError::NoError || !doc.isObject()) {
        emit failed(QStringLiteral("服务器返回的不是合法 JSON：%1").arg(parseError.errorString()));
        return;
    }

    const QJsonObject root = doc.object();
    const QString text = root.value(QStringLiteral("reply")).toString();
    const QJsonArray commands = root.value(QStringLiteral("commands")).toArray();

    if (text.isEmpty() && commands.isEmpty()) {
        emit failed(QStringLiteral("服务器返回了空回复"));
        return;
    }

    emit replyReceived(text, commands.toVariantList());
}
