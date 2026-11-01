#pragma once

#include <QObject>
#include <QStringList>
#include <QVariantList>
#include <QVariantMap>

// AI 服务商注册表。
//
// 设计约束（见 docs/design-study-app-ui.md 4.2 / 第 8 节 S3）：
//   - 卡片头部的 AI 图标**跟着用户所选的服务商变化**（作者举例 DeepSeek / Claude / GPT …）；
//   - 换图标属于设置项，本阶段只把「服务商 → 图标」这层数据做好，不做设置页；
//   - 新增服务商只增加一份定义，QML 不认识具体是哪家，只读 ai.provider 的字段。
//
// 图标是各家品牌的「视觉符号」（配色 + 形状），不内嵌品牌商标文件。
class AiProvider : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QString current READ current WRITE setCurrent NOTIFY currentChanged)
    // 当前服务商的资料：id / name / short / glyph / color
    Q_PROPERTY(QVariantMap provider READ provider NOTIFY currentChanged)
    // 全部可选服务商，供将来的设置页做列表
    Q_PROPERTY(QVariantList available READ available CONSTANT)

public:
    explicit AiProvider(QObject *parent = nullptr);

    QString current() const { return m_current; }
    void setCurrent(const QString &id);

    QVariantMap provider() const;
    QVariantList available() const;

signals:
    void currentChanged();

private:
    QString m_current;
};
