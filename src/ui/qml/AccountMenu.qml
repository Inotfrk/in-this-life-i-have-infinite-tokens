import QtQuick

// 账号下拉菜单。照 GitHub 点右上角头像弹出的那个菜单的结构和操作逻辑：
//
//   ┌──────────────────────────────┐
//   │ (头像) 用户名                 │
//   │        账号标识               │
//   ├──────────────────────────────┤
//   │  更换头像…                    │
//   ├──────────────────────────────┤
//   │  设置…                        │
//   │  切换账号                     │
//   ├──────────────────────────────┤
//   │  退出登录          (危险色)   │
//   └──────────────────────────────┘
//
// 分组之间用细分隔线，危险项单独一组放最下 —— 与 GitHub 一致。
// 通讯 / 社交类的项目（Follow、 Sponsor 之类）本项目不需要，不搬。
Item {
    id: menu

    property string userName: "Learner"
    property string userEmail: "local@device"
    property string avatarSource: ""
    property int hoveredIndex: -1

    signal changeAvatarRequested()
    signal settingsRequested()
    signal switchAccountRequested()
    signal signOutRequested()

    width: 248

    readonly property var items: [
        { section: 0, icon: "camera", text: "更换头像…" },
        { section: 1, icon: "settings", text: "设置…" },
        { section: 1, icon: "people", text: "切换账号" },
        { section: 2, icon: "signout", text: "退出登录", danger: true }
    ]

    // 行高与分隔线一起算出总高
    readonly property int rowHeight: 34
    readonly property int headerHeight: 62
    readonly property int separatorHeight: 9
    height: headerHeight + items.length * rowHeight + 3 * separatorHeight + 8

    Rectangle {
        anchors.fill: parent
        radius: 8
        color: Theme.palette.cardBg
        border.width: 1
        border.color: Theme.palette.border
    }

    Column {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.topMargin: 4
        spacing: 0

        // ---- 头部：头像 + 名字 + 账号 --------------------------------------
        Item {
            width: parent.width
            height: menu.headerHeight

            Avatar {
                id: headerAvatar
                anchors.left: parent.left
                anchors.leftMargin: 14
                anchors.verticalCenter: parent.verticalCenter
                size: 36
                name: menu.userName
                imageSource: menu.avatarSource

                onClicked: menu.changeAvatarRequested()
            }

            Text {
                anchors.left: headerAvatar.right
                anchors.leftMargin: 11
                anchors.right: parent.right
                anchors.rightMargin: 14
                anchors.top: headerAvatar.top
                anchors.topMargin: 1
                text: menu.userName
                color: Theme.palette.text
                font.pixelSize: 13
                font.bold: true
                elide: Text.ElideRight
            }

            Text {
                anchors.left: headerAvatar.right
                anchors.leftMargin: 11
                anchors.right: parent.right
                anchors.rightMargin: 14
                anchors.bottom: headerAvatar.bottom
                anchors.bottomMargin: 1
                text: menu.userEmail
                color: Theme.palette.textMuted
                font.pixelSize: 11
                elide: Text.ElideRight
            }
        }

        // ---- 分组 ------------------------------------------------------------------
        Repeater {
            model: menu.items

            delegate: Item {
                id: group
                required property int index
                required property var modelData

                readonly property bool needsSeparator: index === 0 || modelData.section !== menu.items[index - 1].section

                width: parent.width
                height: (needsSeparator ? menu.separatorHeight : 0) + menu.rowHeight

                Rectangle {
                    visible: group.needsSeparator
                    width: parent.width
                    height: 1
                    color: Theme.palette.borderSoft
                }

                Item {
                    id: row
                    y: group.needsSeparator ? menu.separatorHeight : 0
                    width: parent.width
                    height: menu.rowHeight

                    readonly property bool hovered: menu.hoveredIndex === group.index
                    readonly property bool danger: group.modelData.danger === true

                    Rectangle {
                        anchors.fill: parent
                        anchors.leftMargin: 6
                        anchors.rightMargin: 6
                        radius: 5
                        color: row.hovered
                               ? (row.danger
                                  ? Qt.rgba(Theme.palette.danger.r, Theme.palette.danger.g,
                                            Theme.palette.danger.b, 0.14)
                                  : Theme.palette.hoverBg)
                               : "transparent"
                    }

                    GlyphIcon {
                        id: rowIcon
                        anchors.left: parent.left
                        anchors.leftMargin: 14
                        anchors.verticalCenter: parent.verticalCenter
                        name: group.modelData.icon
                        width: 14
                        height: 14
                        color: row.danger ? Theme.palette.danger : Theme.palette.textMuted
                    }

                    Text {
                        anchors.left: rowIcon.right
                        anchors.leftMargin: 10
                        anchors.right: parent.right
                        anchors.rightMargin: 14
                        anchors.verticalCenter: parent.verticalCenter
                        text: group.modelData.text
                        color: row.danger ? Theme.palette.danger : Theme.palette.text
                        font.pixelSize: 12
                        elide: Text.ElideRight
                    }

                    MouseArea {
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onEntered: menu.hoveredIndex = group.index
                        onExited: menu.hoveredIndex = -1
                        onClicked: {
                            if (group.index === 0) menu.changeAvatarRequested();
                            else if (group.index === 1) menu.settingsRequested();
                            else if (group.index === 2) menu.switchAccountRequested();
                            else menu.signOutRequested();
                        }
                    }
                }
            }
        }
    }
}
