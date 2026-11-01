import QtQuick

// 账号菜单。点头像后弹出，用来放「换头像 / 切换账号 / 退出」这些入口。
// 本阶段只有外观与开关，各项点击不接任何真实逻辑。
Item {
    id: menu

    property string userName: "Learner"
    property string userEmail: "local@device"
    property string avatarSource: ""

    signal changeAvatarRequested()
    signal switchAccountRequested()
    signal signOutRequested()

    // 单个菜单项：图标 + 文字，悬停整行变色（GitHub 下拉菜单的做法）
    component MenuRow: Item {
        id: row

        property string icon: ""
        property string text: ""
        property bool hovered: false
        property bool danger: false

        width: menu.width
        height: 32

        Rectangle {
            anchors.fill: parent
            anchors.leftMargin: 4
            anchors.rightMargin: 4
            radius: 4
            color: row.hovered ? Theme.palette.hoverBg : "transparent"
        }

        GlyphIcon {
            id: rowIcon
            visible: row.icon !== ""
            anchors.left: parent.left
            anchors.leftMargin: 12
            anchors.verticalCenter: parent.verticalCenter
            name: row.icon
            width: 14
            height: 14
            color: row.danger ? Theme.palette.danger : Theme.palette.textMuted
        }

        Text {
            anchors.left: rowIcon.visible ? rowIcon.right : parent.left
            anchors.leftMargin: rowIcon.visible ? 9 : 12
            anchors.right: parent.right
            anchors.rightMargin: 12
            anchors.verticalCenter: parent.verticalCenter
            text: row.text
            color: row.danger ? Theme.palette.danger : Theme.palette.text
            font.pixelSize: 12
            elide: Text.ElideRight
        }

        MouseArea {
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onEntered: row.hovered = true
            onExited: row.hovered = false
            onClicked: row.clicked()
        }

        signal clicked()
    }

    width: 244
    height: 268

    Rectangle {
        anchors.fill: parent
        radius: 8
        color: Theme.palette.cardBg
        border.width: 1
        border.color: Theme.palette.border
    }

    Column {
        id: column
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.topMargin: 8
        spacing: 0

            // 头部：头像 + 用户名 + 账号
            Item {
                width: parent.width
                height: 56

                Avatar {
                    id: menuAvatar
                    anchors.left: parent.left
                    anchors.leftMargin: 12
                    anchors.verticalCenter: parent.verticalCenter
                    size: 34
                    name: menu.userName
                    imageSource: menu.avatarSource

                    onClicked: menu.changeAvatarRequested()
                }

                Text {
                    anchors.left: menuAvatar.right
                    anchors.leftMargin: 10
                    anchors.right: parent.right
                    anchors.rightMargin: 12
                    anchors.top: menuAvatar.top
                    anchors.topMargin: 2
                    text: menu.userName
                    color: Theme.palette.text
                    font.pixelSize: 13
                    font.bold: true
                    elide: Text.ElideRight
                }

                Text {
                    anchors.left: menuAvatar.right
                    anchors.leftMargin: 10
                    anchors.right: parent.right
                    anchors.rightMargin: 12
                    anchors.bottom: menuAvatar.bottom
                    anchors.bottomMargin: 2
                    text: menu.userEmail
                    color: Theme.palette.textMuted
                    font.pixelSize: 11
                    elide: Text.ElideRight
                }
            }

            Rectangle {
                width: parent.width
                height: 1
                color: Theme.palette.borderSoft
            }

            Item { width: parent.width; height: 6 }

            MenuRow {
                icon: "camera"
                text: "更换头像…"
                onClicked: menu.changeAvatarRequested()
            }

            MenuRow {
                icon: "people"
                text: "切换账号"
                onClicked: menu.switchAccountRequested()
            }

            MenuRow {
                icon: "settings"
                text: "账号设置"
                onClicked: menu.switchAccountRequested()
            }

            Item { width: parent.width; height: 6 }

            Rectangle {
                width: parent.width
                height: 1
                color: Theme.palette.borderSoft
            }

            Item { width: parent.width; height: 6 }

            MenuRow {
                icon: "signout"
                text: "退出登录"
                danger: true
                onClicked: menu.signOutRequested()
            }

            Item { width: parent.width; height: 6 }
        }
}
