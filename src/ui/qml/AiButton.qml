import QtQuick

// 卡片头部的 AI 按钮。图标跟着用户所选的服务商变化（DeepSeek / Claude / GPT …）。
// 外形做成「圆角胶囊 + 品牌色」，与旁边的头像区分开。
Item {
    id: aiButton

    property bool hovered: false
    property bool opened: false

    // 由 AiProvider 注入，这里只读字段，不认识具体是哪家
    property string providerName: "DeepSeek"
    property string providerShort: "DS"
    property string providerGlyph: "deepseek"
    property color providerColor: "#4D6BFE"

    signal clicked()

    width: 52
    height: 28

    Rectangle {
        anchors.fill: parent
        radius: 14
        color: aiButton.opened
               ? Qt.rgba(aiButton.providerColor.r, aiButton.providerColor.g,
                         aiButton.providerColor.b, 0.22)
               : (aiButton.hovered
                  ? Qt.rgba(aiButton.providerColor.r, aiButton.providerColor.g,
                            aiButton.providerColor.b, 0.16)
                  : Qt.rgba(aiButton.providerColor.r, aiButton.providerColor.g,
                            aiButton.providerColor.b, 0.10))
        border.width: 1
        border.color: Qt.rgba(aiButton.providerColor.r, aiButton.providerColor.g,
                              aiButton.providerColor.b,
                              aiButton.hovered || aiButton.opened ? 0.9 : 0.45)

        Row {
            anchors.centerIn: parent
            spacing: 5

            AiGlyph {
                anchors.verticalCenter: parent.verticalCenter
                glyph: aiButton.providerGlyph
                color: aiButton.providerColor
                width: 14
                height: 14
            }

            Text {
                anchors.verticalCenter: parent.verticalCenter
                text: aiButton.providerShort
                color: aiButton.providerColor
                font.pixelSize: 11
                font.bold: true
            }
        }
    }

    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onEntered: aiButton.hovered = true
        onExited: aiButton.hovered = false
        onClicked: aiButton.clicked()
    }
}
