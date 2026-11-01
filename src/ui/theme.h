#pragma once

#include <QColor>
#include <QObject>
#include <QStringList>
#include <QVariantMap>

// 主题（外观）单例。
//
// 设计约束（见 docs/design-study-app-ui.md 4.6 / 第 8 节 S1、S2）：
//   - 必须同时支持深色与浅色，两者结构完全一致，只换配色；
//   - 除深浅之外还要能内置额外主题（作者举例「星空」）；
//   - 新增主题只增加一份定义，不改界面结构代码 —— 所以全部颜色集中在本文件的
//     kThemes 表里，QML 只读 Theme.palette.xxx，不认识具体是哪套主题。
class Theme : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QString mode READ mode WRITE setMode NOTIFY modeChanged)
    Q_PROPERTY(QStringList availableModes READ availableModes CONSTANT)
    // 当前主题的全部颜色，键名见 kThemes。QML 用法：Theme.palette.bg
    Q_PROPERTY(QVariantMap palette READ palette NOTIFY modeChanged)

public:
    explicit Theme(QObject *parent = nullptr);

    QString mode() const { return m_mode; }
    void setMode(const QString &mode);

    QStringList availableModes() const;
    QVariantMap palette() const;

signals:
    void modeChanged();

private:
    QString m_mode;
};
