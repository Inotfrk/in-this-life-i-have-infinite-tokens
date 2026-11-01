#include "ai_provider.h"

namespace {

// 一家服务商 = 一个 id + 展示名 + 缩写 + 图形标识 + 品牌色。
// glyph 是 AiGlyph.qml 里的分支名，加服务商时两边各加一处即可。
struct Entry
{
    const char *id;
    const char *name;
    const char *shortName;
    const char *glyph;
    const char *color;
};

const Entry kProviders[] = {
    // 默认：DeepSeek 的鲸鱼意象用「圆形 + 尾鳍」概括，品牌蓝
    {"deepseek", "DeepSeek", "DS", "deepseek", "#4D6BFE"},
    // Claude / Anthropic 的星芒
    {"claude", "Claude", "C", "claude", "#D97757"},
    // GPT / OpenAI 的花瓣结
    {"gpt", "GPT", "G", "gpt", "#10A37F"},
    // Gemini 的四角星
    {"gemini", "Gemini", "Ge", "gemini", "#4285F4"},
    // 通义千问
    {"qwen", "通义千问", "Q", "qwen", "#615CED"},
    // 自定义：只显示首字母，不画品牌图形
    {"custom", "自定义", "AI", "custom", "#6E7681"},
};

const QString kDefaultProvider = QStringLiteral("deepseek");

QVariantMap ToMap(const Entry &e)
{
    return {
        {QStringLiteral("id"), QString::fromLatin1(e.id)},
        {QStringLiteral("name"), QString::fromUtf8(e.name)},
        {QStringLiteral("short"), QString::fromLatin1(e.shortName)},
        {QStringLiteral("glyph"), QString::fromLatin1(e.glyph)},
        {QStringLiteral("color"), QString::fromLatin1(e.color)},
    };
}

const Entry *Find(const QString &id)
{
    for (const Entry &e : kProviders) {
        if (id == QString::fromLatin1(e.id))
            return &e;
    }
    return nullptr;
}

} // namespace

AiProvider::AiProvider(QObject *parent)
    : QObject(parent)
    , m_current(kDefaultProvider)
{
}

void AiProvider::setCurrent(const QString &id)
{
    if (!Find(id) || m_current == id)
        return;
    m_current = id;
    emit currentChanged();
}

QVariantMap AiProvider::provider() const
{
    const Entry *e = Find(m_current);
    return ToMap(e ? *e : kProviders[0]);
}

QVariantList AiProvider::available() const
{
    QVariantList list;
    for (const Entry &e : kProviders)
        list.append(ToMap(e));
    return list;
}
