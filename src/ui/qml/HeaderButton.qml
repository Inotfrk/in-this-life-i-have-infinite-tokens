import QtQuick
import "Theme.js" as Theme

// 卡片头部的按钮：`icon` 走 GlyphIcon，`label` 走文字（AI 入口用文字，其余用图标）。
// 只有悬停反馈，点击行为留给后续功能。
Item {
    id: headerButton

    property string icon: ""
    property string label: ""
    property bool hovered: false

    width: 32
    height: 32

    Rectangle {
        anchors.fill: parent
        radius: 6
        color: headerButton.hovered ? Theme.hoverBg : "transparent"
        border.width: headerButton.label !== "" ? 1 : 0
        border.color: headerButton.hovered ? Theme.border : Theme.borderSoft
    }

    GlyphIcon {
        visible: headerButton.icon !== ""
        anchors.centerIn: parent
        name: headerButton.icon
        color: headerButton.hovered ? Theme.text : Theme.textMuted
        width: 18
        height: 18
    }

    Text {
        visible: headerButton.label !== ""
        anchors.centerIn: parent
        text: headerButton.label
        color: headerButton.hovered ? Theme.accent : Theme.text
        font.pixelSize: 12
        font.bold: true
    }

    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onEntered: headerButton.hovered = true
        onExited: headerButton.hovered = false
    }
}
