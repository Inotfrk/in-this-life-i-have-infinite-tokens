import QtQuick

// 学科侧栏的一行。只有悬停与选中两种视觉状态，点选不加载任何内容。
Item {
    id: subjectRow

    property string name: "math"
    property string title: "数学"
    property bool selected: false
    property bool hovered: false
    // 行左边缘相对列表的缩进，用于把强调条露出来
    property real indicatorInset: -8

    // 点选信号由外层接管，本组件不保存任何状态
    signal clicked()

    height: 34

    Rectangle {
        anchors.fill: parent
        anchors.leftMargin: 8
        anchors.rightMargin: 8
        radius: 6
        color: subjectRow.selected ? Theme.palette.activeBg
                                   : (subjectRow.hovered ? Theme.palette.hoverBg : "transparent")

        Rectangle {
            visible: subjectRow.selected
            width: 2
            height: 16
            radius: 1
            color: Theme.palette.accent
            x: subjectRow.indicatorInset
            anchors.verticalCenter: parent.verticalCenter
        }

        // 学科图标：小方块，与草图一致
        Rectangle {
            id: subjectGlyph
            width: 12
            height: 12
            radius: 3
            x: 12
            anchors.verticalCenter: parent.verticalCenter
            color: "transparent"
            border.width: 1.4
            border.color: subjectRow.selected ? Theme.palette.accent : Theme.palette.textFaint
        }

        Text {
            anchors.left: subjectGlyph.right
            anchors.leftMargin: 10
            anchors.right: parent.right
            anchors.rightMargin: 8
            anchors.verticalCenter: parent.verticalCenter
            text: subjectRow.name + "  " + subjectRow.title
            color: subjectRow.selected ? Theme.palette.text : Theme.palette.textMuted
            font.pixelSize: 13
            elide: Text.ElideRight
        }
    }

    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onEntered: subjectRow.hovered = true
        onExited: subjectRow.hovered = false
        onClicked: subjectRow.clicked()
    }
}
