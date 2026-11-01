import QtQuick

// AI 服务商选择菜单。点头部 AI 按钮弹出。
// 本阶段只切换标识与高亮，不接任何真实 API。
Item {
    id: menu

    property string currentId: "deepseek"
    property var providers: []

    signal providerPicked(string id)

    width: 236
    height: column.implicitHeight + 12

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
        anchors.topMargin: 6
        spacing: 0

        Item {
            width: parent.width
            height: 26

            Text {
                anchors.left: parent.left
                anchors.leftMargin: 12
                anchors.verticalCenter: parent.verticalCenter
                text: "选择 AI 服务商"
                color: Theme.palette.textFaint
                font.pixelSize: 11
            }
        }

        Repeater {
            model: menu.providers

            delegate: Item {
                id: row
                required property var modelData

                readonly property bool selected: modelData.id === menu.currentId

                width: column.width
                height: 36

                Rectangle {
                    anchors.fill: parent
                    anchors.leftMargin: 4
                    anchors.rightMargin: 4
                    radius: 4
                    color: row.selected
                           ? Qt.rgba(Theme.palette.accent.r, Theme.palette.accent.g,
                                     Theme.palette.accent.b, 0.12)
                           : (hovered ? Theme.palette.hoverBg : "transparent")
                }

                property bool hovered: false

                AiGlyph {
                    id: rowGlyph
                    anchors.left: parent.left
                    anchors.leftMargin: 12
                    anchors.verticalCenter: parent.verticalCenter
                    glyph: row.modelData.glyph
                    color: row.modelData.color
                    width: 16
                    height: 16
                }

                Text {
                    anchors.left: rowGlyph.right
                    anchors.leftMargin: 10
                    anchors.right: checkMark.left
                    anchors.rightMargin: 6
                    anchors.verticalCenter: parent.verticalCenter
                    text: row.modelData.name
                    color: Theme.palette.text
                    font.pixelSize: 12
                    font.bold: row.selected
                    elide: Text.ElideRight
                }

                // 当前选中项的勾
                GlyphIcon {
                    id: checkMark
                    visible: row.selected
                    anchors.right: parent.right
                    anchors.rightMargin: 12
                    anchors.verticalCenter: parent.verticalCenter
                    name: "check"
                    color: Theme.palette.accent
                    width: 13
                    height: 13
                }

                MouseArea {
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onEntered: row.hovered = true
                    onExited: row.hovered = false
                    onClicked: menu.providerPicked(row.modelData.id)
                }
            }
        }

        Item { width: parent.width; height: 6 }

        Rectangle {
            width: parent.width - 16
            x: 8
            height: 1
            color: Theme.palette.borderSoft
        }

        Item { width: parent.width; height: 6 }

        Text {
            width: parent.width - 24
            x: 12
            text: "设置页可用后，图标会跟随所选服务商自动更新"
            color: Theme.palette.textFaint
            font.pixelSize: 10
            wrapMode: Text.WordWrap
        }

        Item { width: parent.width; height: 6 }
    }
}
