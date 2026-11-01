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

// 配色直接取 GitHub Primer 的语义色值，深 / 浅各一套。
// 参照 https://primer.style/foundations/color（2026-11 版本）。
const Palette kDark{
    QColor("#0d1117"), // bg           canvas.default
    QColor("#010409"), // railBg       canvas.inset
    QColor("#151b23"), // cardBg       canvas.subtle
    QColor("#0d1117"), // contentBg    canvas.default
    QColor("#3d444d"), // border       border.default
    QColor("#21262d"), // borderSoft   border.muted
    QColor("#f0f6fc"), // text         fg.default
    QColor("#9198a1"), // textMuted    fg.muted
    QColor("#6e7681"), // textFaint    fg.subtle
    QColor("#21262d"), // hoverBg      neutral muted
    QColor("#121d2f"), // activeBg     accent.subtle
    QColor("#4493f8")  // accent       accent.fg
};

const Palette kLight{
    QColor("#ffffff"), // canvas.default
    QColor("#f6f8fa"), // canvas.subtle
    QColor("#ffffff"), // canvas.default
    QColor("#f6f8fa"), // canvas.inset
    QColor("#d1d9e0"), // border.default
    QColor("#d1d9e0"), // border.muted
    QColor("#1f2328"), // fg.default
    QColor("#59636e"), // fg.muted
    QColor("#818b98"), // fg.subtle
    QColor("#eff2f5"), // hover
    QColor("#ddf4ff"), // accent.subtle
    QColor("#0969da")  // accent.fg
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
