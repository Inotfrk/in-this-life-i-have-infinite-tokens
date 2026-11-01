#include "theme.h"

#include <QHash>

namespace {

// 一套主题就是一组同名键的配色。键名是界面唯一认识的东西，
// 新增主题只需在这里加一项，QML 不用动。
struct Palette
{
    QColor bg;          // 窗口底色
    QColor railBg;      // 最左图标栏
    QColor cardBg;      // 内容卡片
    QColor contentBg;   // 主内容区（比卡片再沉一档）
    QColor border;      // 主要分隔线与卡片描边
    QColor borderSoft;  // 次级分隔线
    QColor text;        // 主文字
    QColor textMuted;   // 次要文字
    QColor textFaint;   // 占位与提示
    QColor hoverBg;     // 悬停底色
    QColor activeBg;    // 当前项底色
    QColor accent;      // 强调色（指示条、选中描边）
};

// 深色：低饱和灰蓝，参考 GitHub 深色主题的层次，但整体更暗一档。
const Palette kDark{
    QColor("#0d1117"), QColor("#010409"), QColor("#161b22"), QColor("#0f1318"),
    QColor("#30363d"), QColor("#21262d"), QColor("#c9d1d9"), QColor("#8b949e"),
    QColor("#6e7681"), QColor("#21262d"), QColor("#1f2937"), QColor("#58a6ff")
};

// 浅色：参照 macOS 浅色外观，低饱和、边框克制，不做强对比色块。
const Palette kLight{
    QColor("#f6f8fa"), QColor("#eaeef2"), QColor("#ffffff"), QColor("#fbfcfd"),
    QColor("#d0d7de"), QColor("#e1e6eb"), QColor("#1f2328"), QColor("#57606a"),
    QColor("#8b949e"), QColor("#eaeef2"), QColor("#ddf4ff"), QColor("#0969da")
};

// 星空：作者举例的额外主题，深底 + 冷色强调。只换配色，结构不变。
const Palette kStar{
    QColor("#0a0a12"), QColor("#05050b"), QColor("#12121f"), QColor("#0c0c16"),
    QColor("#2a2a45"), QColor("#1b1b2e"), QColor("#e0e0f5"), QColor("#9a9ac0"),
    QColor("#6e6e96"), QColor("#1b1b2e"), QColor("#23233d"), QColor("#8b8bff")
};

QVariantMap ToMap(const Palette &p)
{
    return {
        {QStringLiteral("bg"), p.bg.name()},
        {QStringLiteral("railBg"), p.railBg.name()},
        {QStringLiteral("cardBg"), p.cardBg.name()},
        {QStringLiteral("contentBg"), p.contentBg.name()},
        {QStringLiteral("border"), p.border.name()},
        {QStringLiteral("borderSoft"), p.borderSoft.name()},
        {QStringLiteral("text"), p.text.name()},
        {QStringLiteral("textMuted"), p.textMuted.name()},
        {QStringLiteral("textFaint"), p.textFaint.name()},
        {QStringLiteral("hoverBg"), p.hoverBg.name()},
        {QStringLiteral("activeBg"), p.activeBg.name()},
        {QStringLiteral("accent"), p.accent.name()},
    };
}

const QHash<QString, Palette> &Themes()
{
    static const QHash<QString, Palette> themes{
        {QStringLiteral("dark"), kDark},
        {QStringLiteral("light"), kLight},
        {QStringLiteral("star"), kStar},
    };
    return themes;
}

QString DefaultMode = QStringLiteral("dark");

} // namespace

Theme::Theme(QObject *parent)
    : QObject(parent)
    , m_mode(DefaultMode)
{
}

void Theme::setMode(const QString &mode)
{
    if (!Themes().contains(mode) || m_mode == mode)
        return;
    m_mode = mode;
    emit modeChanged();
}

QStringList Theme::availableModes() const
{
    // 固定顺序，界面里的主题列表才不会每次重启都换位置。
    return {QStringLiteral("dark"), QStringLiteral("light"), QStringLiteral("star")};
}

QVariantMap Theme::palette() const
{
    const auto it = Themes().constFind(m_mode);
    return ToMap(it == Themes().constEnd() ? kDark : it.value());
}
