import QtQuick

// 设置页。当前只有「AI 服务商」一组，因为这是作者唯一明确的设置项。
//
// 设计说明见 docs/design-study-app-ui.md 第 8 节（设置项收件箱）：
// 服务商的选择**属于设置**，不属于头部图标——点头部 AI 是打开对话，
// 不是选服务商。这条是 2026-11-01 作者明确纠正的。
Item {
    id: settings

    property string currentProvider: "deepseek"
    property var providers: []

    signal providerSelected(string id)
    signal closeRequested()

    Rectangle {
        anchors.fill: parent
        color: Theme.palette.cardBg
        border.width: 1
        border.color: Theme.palette.border
        radius: 8
    }

    Column {
        anchors.fill: parent
        anchors.margins: 1
        spacing: 0

        // ---- 标题栏 --------------------------------------------------------
        Item {
            width: parent.width
            height: 44

            Text {
                anchors.left: parent.left
                anchors.leftMargin: 14
                anchors.verticalCenter: parent.verticalCenter
                text: "设置"
                color: Theme.palette.text
                font.pixelSize: 13
                font.bold: true
            }

            HeaderButton {
                icon: "close"
                anchors.right: parent.right
                anchors.rightMargin: 8
                anchors.verticalCenter: parent.verticalCenter
                onClicked: settings.closeRequested()
            }
        }

        Rectangle { width: parent.width; height: 1; color: Theme.palette.border }

        Flickable {
            width: parent.width
            height: parent.height - 45
            contentHeight: body.implicitHeight + 24
            clip: true
            boundsBehavior: Flickable.StopAtBounds

            Column {
                id: body
                x: 14
                y: 14
                width: parent.width - 28
                spacing: 6

                Text {
                    text: "AI 服务商"
                    color: Theme.palette.text
                    font.pixelSize: 12
                    font.bold: true
                }

                Text {
                    width: parent.width
                    text: "头部 AI 图标会跟着这里的所选服务商变化。API Key 的填写还没做。"
                    color: Theme.palette.textFaint
                    font.pixelSize: 10
                    wrapMode: Text.WordWrap
                    bottomPadding: 4
                }

                Repeater {
                    model: settings.providers

                    delegate: Item {
                        id: row
                        required property var modelData
                        property bool hovered: false

                        readonly property bool selected: modelData.id === settings.currentProvider

                        width: body.width
                        height: 40

                        Rectangle {
                            anchors.fill: parent
                            radius: 6
                            color: row.selected
                                   ? Qt.rgba(Theme.palette.accent.r, Theme.palette.accent.g,
                                             Theme.palette.accent.b, 0.12)
                                   : (row.hovered ? Theme.palette.hoverBg : "transparent")
                            border.width: row.selected ? 1 : 0
                            border.color: Theme.palette.accent
                        }

                        AiGlyph {
                            id: glyph
                            anchors.left: parent.left
                            anchors.leftMargin: 12
                            anchors.verticalCenter: parent.verticalCenter
                            glyph: row.modelData.glyph
                            color: row.modelData.color
                            width: 16
                            height: 16
                        }

                        Text {
                            anchors.left: glyph.right
                            anchors.leftMargin: 10
                            anchors.right: parent.right
                            anchors.rightMargin: 12
                            anchors.verticalCenter: parent.verticalCenter
                            text: row.modelData.name
                            color: Theme.palette.text
                            font.pixelSize: 12
                            font.bold: row.selected
                        }

                        // 单选框
                        Rectangle {
                            visible: row.selected
                            anchors.right: parent.right
                            anchors.rightMargin: 12
                            anchors.verticalCenter: parent.verticalCenter
                            width: 14
                            height: 14
                            radius: 7
                            color: "transparent"
                            border.width: 1
                            border.color: Theme.palette.accent

                            Rectangle {
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
                            onEntered: row.hovered = true
                            onExited: row.hovered = false
                            onClicked: settings.providerSelected(row.modelData.id)
                        }
                    }
                }

                Item { width: 1; height: 10 }

                Rectangle {
                    width: parent.width
                    height: 1
                    color: Theme.palette.borderSoft
                }

                Item { width: 1; height: 10 }

                Text {
                    text: "API 凭据（待实现）"
                    color: Theme.palette.textMuted
                    font.pixelSize: 12
                    font.bold: true
                }

                Text {
                    width: parent.width
                    text: "两种用法：① 填自己的 API Key，直连所选服务商；"
                          + "② 使用我们提供的服务端（方案未定）。后者不需要用户自备 Key。"
                    color: Theme.palette.textFaint
                    font.pixelSize: 10
                    wrapMode: Text.WordWrap
                }
            }
        }
    }
}
