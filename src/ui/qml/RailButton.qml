import QtQuick

// 左侧全局图标栏的一个按钮。只有悬停与当前页两种视觉状态，不携带任何行为。
Item {
    id: railButton

    property string icon: "search"
    property bool current: false
    property bool hovered: false
    // 当前页左侧的强调指示条相对按钮的外挪距离（图标栏没有内边距时用负值）
    property real indicatorInset: -8

    width: 36
    height: 36

    Rectangle {
        anchors.fill: parent
        radius: 6
        color: railButton.current ? Theme.palette.activeBg
                                 : (railButton.hovered ? Theme.palette.hoverBg : "transparent")
    }

    Rectangle {
        visible: railButton.current
        width: 2
        height: 18
        radius: 1
        color: Theme.palette.accent
        x: railButton.indicatorInset
        anchors.verticalCenter: parent.verticalCenter
    }

    GlyphIcon {
        anchors.centerIn: parent
        name: railButton.icon
        color: railButton.current ? Theme.palette.text : Theme.palette.textMuted
        width: 18
        height: 18
    }

    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onEntered: railButton.hovered = true
        onExited: railButton.hovered = false
    }
}
