import QtQuick

// 用户头像。
//
// 分两种形态，靠 imageSource 区分：
//   - 没设照片：按用户名算出一个稳定的渐变色 + 首字母（类似 GitHub 的 identicon 思路，
//     同一个人每次打开颜色都一样，不会闪）；
//   - 设了照片：圆形裁切显示照片。
// 悬停时右上角浮出相机角标，暗示「可以换头像」。
Item {
    id: avatar

    property string name: "Learner"
    property string imageSource: ""
    property bool hovered: false
    property int size: 28

    width: size
    height: size

    readonly property string initial:
        name.length > 0 ? name.charAt(0).toUpperCase() : "?"

    // 由用户名决定色相，保证同一个人颜色稳定
    readonly property int hue: {
        var sum = 0;
        for (var i = 0; i < name.length; ++i)
            sum += name.charCodeAt(i) * (i + 7);
        return sum % 360;
    }
    readonly property color fromColor: Qt.hsla(hue / 360, 0.62, 0.52, 1.0)
    readonly property color toColor: Qt.hsla(((hue + 42) % 360) / 360, 0.66, 0.40, 1.0)

    // 外圈：悬停时变成强调色，形成明确的「可点」反馈
    Rectangle {
        anchors.fill: parent
        radius: width / 2
        color: "transparent"
        border.width: avatar.hovered ? 2 : 1
        border.color: avatar.hovered ? Theme.palette.accent : Theme.palette.border
    }

    // 内圈：照片或首字母。两层 Rectangle 叠出「细边」的质感，避免直接贴边显得廉价。
    Rectangle {
        id: disc
        anchors.fill: parent
        anchors.margins: 3
        radius: width / 2
        clip: true

        gradient: Gradient {
            GradientStop { position: 0.0; color: avatar.fromColor }
            GradientStop { position: 1.0; color: avatar.toColor }
        }

        Image {
            anchors.fill: parent
            source: avatar.imageSource
            visible: avatar.imageSource !== ""
            fillMode: Image.PreserveAspectCrop
            asynchronous: true
        }

        Text {
            anchors.centerIn: parent
            visible: avatar.imageSource === ""
            text: avatar.initial
            color: "#ffffff"
            font.pixelSize: Math.round(disc.height * 0.52)
            font.bold: true
        }
    }

    // 悬停角标：小相机，右下角
    Rectangle {
        visible: avatar.hovered
        width: 13
        height: 13
        radius: width / 2
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        color: Theme.palette.accent
        border.width: 1.5
        border.color: Theme.palette.cardBg

        GlyphIcon {
            anchors.centerIn: parent
            name: "camera"
            color: "#ffffff"
            width: 8
            height: 8
            stroke: 1.3
        }
    }

    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onEntered: avatar.hovered = true
        onExited: avatar.hovered = false
        onClicked: avatar.clicked()
    }

    signal clicked()
}
