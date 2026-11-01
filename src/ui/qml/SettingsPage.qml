import QtQuick
import QtQuick.Layouts

// 设置页。照 GitHub 的设置页结构：**左侧导航 + 右侧内容**，整页覆盖主界面。
//
// 与 GitHub 的对应关系：
//   GitHub 的 /settings 左侧是 Public profile / Account / Appearance / ...
//   这里换成我们自己的四组：外观 / AI 服务商 / 账号 / 关于。
// 通讯、社交、通知、邮件、SSH 等 GitHub 有但我们不需要的项一律不搬。
Item {
    id: settings

    property string currentTheme: "dark"
    property string currentProvider: "deepseek"
    property var providers: []
    property string userName: "Learner"
    property string avatarSource: ""
    property int activeNav: 0

    signal closeRequested()
    signal themeSelected(string mode)
    signal providerSelected(string id)
    signal changeAvatarRequested()

    readonly property var navItems: [
        { icon: "appearance", text: "外观" },
        { icon: "user", text: "AI 服务商" },
        { icon: "people", text: "账号" },
        { icon: "info", text: "关于" }
    ]

    // 分组标题 + 说明，顶部一条分隔（GitHub 每个 section 的写法）
    component SectionHeader: Item {
        property string title: ""
        property string description: ""
        width: parent ? parent.width : 0
        height: textColumn.implicitHeight + 18

        Column {
            id: textColumn
            width: parent.width
            spacing: 3

            Text {
                text: parent.parent.title
                color: Theme.palette.text
                font.pixelSize: 14
                font.bold: true
            }

            Text {
                width: parent.width
                text: parent.parent.description
                color: Theme.palette.textMuted
                font.pixelSize: 11
                wrapMode: Text.WordWrap
            }
        }
    }

    Rectangle {
        anchors.fill: parent
        color: Theme.palette.bg
    }

    // ---- 顶栏：返回 + 标题（GitHub 设置页同样有独立顶栏）------------------
    Rectangle {
        id: topBar
        width: parent.width
        height: 52
        color: Theme.palette.cardBg

        Rectangle {
            width: parent.width
            height: 1
            anchors.bottom: parent.bottom
            color: Theme.palette.border
        }

        HeaderButton {
            icon: "close"
            anchors.left: parent.left
            anchors.leftMargin: 14
            anchors.verticalCenter: parent.verticalCenter
            onClicked: settings.closeRequested()
        }

        Text {
            anchors.left: parent.left
            anchors.leftMargin: 58
            anchors.verticalCenter: parent.verticalCenter
            text: "设置"
            color: Theme.palette.text
            font.pixelSize: 14
            font.bold: true
        }
    }

    Row {
        anchors.top: topBar.bottom
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        spacing: 0

        // ---- 左侧导航 ------------------------------------------------------
        Rectangle {
            id: navColumn
            width: 210
            height: parent.height
            color: Theme.palette.cardBg

            Rectangle {
                width: 1
                height: parent.height
                anchors.right: parent.right
                color: Theme.palette.border
            }

            Column {
                width: parent.width
                anchors.top: parent.top
                anchors.topMargin: 14
                spacing: 2

                Repeater {
                    model: settings.navItems

                    delegate: Item {
                        id: navRow
                        required property int index
                        required property var modelData
                        property bool hovered: false

                        readonly property bool active: settings.activeNav === index

                        width: navColumn.width
                        height: 34

                        // GitHub 的左侧导航用竖条 + 底色标记当前项
                        Rectangle {
                            visible: navRow.active
                            width: 2
                            height: 20
                            radius: 1
                            color: Theme.palette.accent
                            anchors.verticalCenter: parent.verticalCenter
                        }

                        Rectangle {
                            anchors.fill: parent
                            anchors.leftMargin: 6
                            anchors.rightMargin: 8
                            radius: 5
                            color: navRow.active
                                   ? Qt.rgba(Theme.palette.accent.r, Theme.palette.accent.g,
                                             Theme.palette.accent.b, 0.10)
                                   : (navRow.hovered ? Theme.palette.hoverBg : "transparent")
                        }

                        GlyphIcon {
                            id: navIcon
                            anchors.left: parent.left
                            anchors.leftMargin: 18
                            anchors.verticalCenter: parent.verticalCenter
                            name: navRow.modelData.icon
                            width: 14
                            height: 14
                            color: navRow.active ? Theme.palette.accent : Theme.palette.textMuted
                        }

                        Text {
                            anchors.left: navIcon.right
                            anchors.leftMargin: 10
                            anchors.right: parent.right
                            anchors.rightMargin: 8
                            anchors.verticalCenter: parent.verticalCenter
                            text: navRow.modelData.text
                            color: navRow.active ? Theme.palette.text : Theme.palette.textMuted
                            font.pixelSize: 12
                            font.bold: navRow.active
                            elide: Text.ElideRight
                        }

                        MouseArea {
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onEntered: navRow.hovered = true
                            onExited: navRow.hovered = false
                            onClicked: settings.activeNav = navRow.index
                        }
                    }
                }
            }
        }

        // ---- 右侧内容 ------------------------------------------------------
        Flickable {
            width: parent.width - navColumn.width
            height: parent.height
            contentHeight: appearanceContent.implicitHeight + 48
            clip: true
            boundsBehavior: Flickable.StopAtBounds

            Column {
                id: appearanceContent
                x: 28
                y: 24
                width: Math.min(parent.width - 56, 620)
                spacing: 0

                visible: settings.activeNav === 0
                // ---- 外观 --------------------------------------------------
                SectionHeader {
                    title: "外观"
                    description: "界面结构不随主题变化，只换配色。选择后立即生效。"
                }

                Repeater {
                    model: Theme.availableModes

                    delegate: Item {
                        required property string modelData
                        property bool hovered: false

                        readonly property var preview: Theme.preview(modelData)
                        readonly property bool selected: settings.currentTheme === modelData

                        width: appearanceContent.width
                        height: 76

                        Rectangle {
                            anchors.fill: parent
                            radius: 6
                            color: parent.selected
                                   ? Qt.rgba(Theme.palette.accent.r, Theme.palette.accent.g,
                                             Theme.palette.accent.b, 0.08)
                                   : (parent.hovered ? Theme.palette.hoverBg : "transparent")
                            border.width: parent.selected ? 1 : 0
                            border.color: Theme.palette.accent
                        }

                        // 缩略图：用该主题自己的配色画一个小窗口
                        Rectangle {
                            id: thumb
                            anchors.left: parent.left
                            anchors.leftMargin: 12
                            anchors.verticalCenter: parent.verticalCenter
                            width: 56
                            height: 40
                            radius: 4
                            color: parent.preview.cardBg
                            border.width: 1
                            border.color: parent.preview.border

                            Rectangle {
                                width: parent.width
                                height: 7
                                color: parent.parent.preview.bg
                            }

                            Rectangle {
                                x: 4
                                y: 13
                                width: 12
                                height: 22
                                radius: 2
                                color: parent.parent.preview.activeBg
                            }

                            Rectangle {
                                x: 20
                                y: 13
                                width: 32
                                height: 3
                                radius: 1.5
                                color: parent.parent.preview.textMuted
                            }

                            Rectangle {
                                x: 20
                                y: 19
                                width: 22
                                height: 3
                                radius: 1.5
                                color: parent.parent.preview.border
                            }
                        }

                        Text {
                            anchors.left: thumb.right
                            anchors.leftMargin: 14
                            anchors.right: parent.right
                            anchors.rightMargin: 16
                            anchors.verticalCenter: parent.verticalCenter
                            text: Theme.displayName(parent.modelData)
                            color: Theme.palette.text
                            font.pixelSize: 13
                            font.bold: parent.selected
                        }

                        MouseArea {
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onEntered: parent.hovered = true
                            onExited: parent.hovered = false
                            onClicked: settings.themeSelected(parent.modelData)
                        }
                    }
                }

                Item { width: 1; height: 24 }
            }

            // ---- AI 服务商 -------------------------------------------------
            Column {
                id: providerContent
                x: 28
                y: 24
                width: Math.min(parent.width - 56, 620)
                spacing: 0
                visible: settings.activeNav === 1

                SectionHeader {
                    title: "AI 服务商"
                    description: "头部 AI 按钮的图标跟着这里变化。所有请求都经我们的服务器转发，"
                                 + "客户端不直连厂商、也不保存厂商的 Key。"
                }

                Repeater {
                    model: settings.providers

                    delegate: Item {
                        required property var modelData
                        property bool hovered: false

                        readonly property bool selected: settings.currentProvider === modelData.id

                        width: providerContent.width
                        height: 46

                        Rectangle {
                            anchors.fill: parent
                            radius: 6
                            color: parent.selected
                                   ? Qt.rgba(Theme.palette.accent.r, Theme.palette.accent.g,
                                             Theme.palette.accent.b, 0.08)
                                   : (parent.hovered ? Theme.palette.hoverBg : "transparent")
                            border.width: parent.selected ? 1 : 0
                            border.color: Theme.palette.accent
                        }

                        AiGlyph {
                            id: pGlyph
                            anchors.left: parent.left
                            anchors.leftMargin: 14
                            anchors.verticalCenter: parent.verticalCenter
                            glyph: parent.modelData.glyph
                            color: parent.modelData.color
                            width: 18
                            height: 18
                        }

                        Text {
                            anchors.left: pGlyph.right
                            anchors.leftMargin: 12
                            anchors.verticalCenter: parent.verticalCenter
                            text: parent.modelData.name
                            color: Theme.palette.text
                            font.pixelSize: 13
                            font.bold: parent.selected
                        }

                        // 单选圆点
                        Rectangle {
                            anchors.right: parent.right
                            anchors.rightMargin: 14
                            anchors.verticalCenter: parent.verticalCenter
                            width: 15
                            height: 15
                            radius: 7.5
                            color: "transparent"
                            border.width: 1
                            border.color: parent.selected ? Theme.palette.accent
                                                          : Theme.palette.border

                            Rectangle {
                                visible: parent.parent.selected
                                anchors.centerIn: parent
                                width: 7
                                height: 7
                                radius: 3.5
                                color: Theme.palette.accent
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onEntered: parent.hovered = true
                            onExited: parent.hovered = false
                            onClicked: settings.providerSelected(parent.modelData.id)
                        }
                    }
                }
            }

            // ---- 账号 ------------------------------------------------------
            Column {
                x: 28
                y: 24
                width: Math.min(parent.width - 56, 620)
                spacing: 0
                visible: settings.activeNav === 2

                SectionHeader {
                    title: "账号"
                    description: "不同账号登录后各自同步自己的资料，数据跟着账号走，不跟这台机器走。"
                }

                Item {
                    width: appearanceContent.width
                    height: 66

                    Avatar {
                        id: settingsAvatar
                        anchors.left: parent.left
                        anchors.verticalCenter: parent.verticalCenter
                        size: 44
                        name: settings.userName
                        imageSource: settings.avatarSource

                        onClicked: settings.changeAvatarRequested()
                    }

                    Column {
                        anchors.left: settingsAvatar.right
                        anchors.leftMargin: 14
                        anchors.verticalCenter: parent.verticalCenter
                        spacing: 3

                        Text {
                            text: settings.userName
                            color: Theme.palette.text
                            font.pixelSize: 13
                            font.bold: true
                        }

                        Text {
                            text: "点击头像更换照片"
                            color: Theme.palette.textMuted
                            font.pixelSize: 11
                        }
                    }
                }

                Text {
                    width: parent.width
                    text: "登录、同步与切换账号尚未实现——服务端方案还没定。"
                    color: Theme.palette.textFaint
                    font.pixelSize: 11
                    wrapMode: Text.WordWrap
                }
            }

            // ---- 关于 ------------------------------------------------------
            Column {
                x: 28
                y: 24
                width: Math.min(parent.width - 56, 620)
                spacing: 0
                visible: settings.activeNav === 3

                SectionHeader {
                    title: "关于"
                    description: "Infinite Tokens —— 一个把学习资料、作业与 AI 收在一起的桌面应用。"
                }

                Repeater {
                    model: [
                        { k: "版本", v: "0.1.0（页面骨架阶段）" },
                        { k: "界面框架", v: "Qt 6 / Qt Quick" },
                        { k: "当前主题", v: Theme.displayName(settings.currentTheme) },
                        { k: "当前服务商", v: settings.currentProvider }
                    ]

                    delegate: Item {
                        required property var modelData
                        width: appearanceContent.width
                        height: 32

                        Text {
                            anchors.left: parent.left
                            anchors.verticalCenter: parent.verticalCenter
                            text: parent.modelData.k
                            color: Theme.palette.textMuted
                            font.pixelSize: 12
                        }

                        Text {
                            anchors.right: parent.right
                            anchors.verticalCenter: parent.verticalCenter
                            text: parent.modelData.v
                            color: Theme.palette.text
                            font.pixelSize: 12
                        }

                        Rectangle {
                            width: parent.width
                            height: 1
                            anchors.bottom: parent.bottom
                            color: Theme.palette.borderSoft
                        }
                    }
                }
            }
        }
    }
}
