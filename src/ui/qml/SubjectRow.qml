import QtQuick

// 学科侧栏的一行。左侧是该学科的图标（不读文字也能认出来），右侧是名称。
// 只有悬停与选中两种视觉状态，点选不加载任何内容。
Item {
    id: subjectRow

    property string subject: "math"
    property string title: "数学"
    property bool selected: false
    property bool hovered: false

    // 点选信号由外层接管，本组件不保存任何状态
    signal clicked()

    height: 36

    Rectangle {
        anchors.fill: parent
        anchors.leftMargin: 8
        anchors.rightMargin: 8
        radius: 6
        color: subjectRow.selected
               ? Theme.palette.activeBg
               : (subjectRow.hovered ? Theme.palette.hoverBg : "transparent")
        border.width: subjectRow.selected ? 1 : 0
        border.color: Theme.palette.accent
    }

    // 选中时左侧的强调条
    Rectangle {
        visible: subjectRow.selected
        width: 2
        height: 18
        radius: 1
        color: Theme.palette.accent
        x: -8
        anchors.verticalCenter: parent.verticalCenter
    }

    // 学科图标：按学科画不同符号，用户可以直接看图识别
    SubjectGlyph {
        id: glyph
        subject: subjectRow.subject
        color: subjectRow.selected ? Theme.palette.accent : Theme.palette.textMuted
        width: 18
        height: 18
        x: 14
        anchors.verticalCenter: parent.verticalCenter
    }

    Text {
        anchors.left: glyph.right
        anchors.leftMargin: 10
        anchors.right: parent.right
        anchors.rightMargin: 10
        anchors.verticalCenter: parent.verticalCenter
        text: subjectRow.title
        color: subjectRow.selected ? Theme.palette.text : Theme.palette.textMuted
        font.pixelSize: 13
        elide: Text.ElideRight
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
