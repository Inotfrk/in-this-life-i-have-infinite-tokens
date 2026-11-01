import QtQuick

// 卡片头部右端的图标按钮组（C1–C3：从左到右是「＋ … 用户」，AI 也在这组里）。
// 只有悬停反馈，点击行为留给后续功能。
Item {
    id: headerButton

    property string icon: "menu"
    // 用于 AI 这类用文字而不是图标的按钮
    property string label: ""
    property bool hovered: false

    width: 32
    height: 32

    Rectangle {
        anchors.fill: parent
        radius: 6
        color: headerButton.hovered ? Theme.palette.hoverBg : "transparent"
        border.width: headerButton.label !== "" ? 1 : 0
        border.color: headerButton.hovered ? Theme.palette.border : Theme.palette.borderSoft
    }

    GlyphIcon {
        visible: headerButton.label === ""
        anchors.centerIn: parent
        name: headerButton.icon
        color: headerButton.hovered ? Theme.palette.text : Theme.palette.textMuted
        width: 18
        height: 18
    }

    Text {
        visible: headerButton.label !== ""
        anchors.centerIn: parent
        text: headerButton.label
        color: headerButton.hovered ? Theme.palette.accent : Theme.palette.text
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
