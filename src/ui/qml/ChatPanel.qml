import QtQuick

// AI 对话面板。点头部 AI 按钮后从右侧滑出，形态参考 GitHub Copilot 的聊天面板：
// 顶部是标题与当前服务商，中间是消息列表，底部是输入框。
//
// 本阶段只有界面：发出去的消息不会真的送到任何模型，
// 也还没有「让 AI 操作软件」的能力（那是 T-021）。
Item {
    id: panel

    property string providerName: "DeepSeek"
    property string providerShort: "DS"
    property string providerGlyph: "deepseek"
    property color providerColor: "#4D6BFE"

    property var messages: [
        { role: "assistant",
          text: "你好，我是这个软件里的 AI。你可以直接说要做什么，比如「把物理设成当前学科」「帮我看看这周的作业」。",
          pending: false }
    ]
    property bool thinking: false

    signal sendRequested(string text)
    signal closeRequested()

    // 只在界面里追加消息。真正的回复由服务器返回（见 Main.qml 的 AiClient 连接）。
    function send(text) {
        if (text.length === 0)
            return;
        messages = messages.concat([{ role: "user", text: text, pending: false }]);
        thinking = true;
        sendRequested(text);
    }

    function appendAssistant(text) {
        thinking = false;
        if (text.length === 0)
            return;
        messages = messages.concat([{ role: "assistant", text: text, pending: false }]);
    }

    // 系统提示（错误、指令被拒绝等）。必须和 AI 说话区分开，不能让用户以为这是模型说的。
    function appendSystem(text) {
        thinking = false;
        messages = messages.concat([{ role: "system", text: text, pending: false }]);
    }

    // 请求结束但没有任何可显示内容时，至少要停掉思考动画
    function stopThinking() {
        thinking = false;
    }

    // ---- 单条消息 ----------------------------------------------------------
    component Bubble: Item {
        id: bubble

        property string role: "assistant"
        property string text: ""
        property bool pending: false

        width: ListView.view ? ListView.view.width : 0
        height: content.implicitHeight + 28

        readonly property bool fromUser: role === "user"
        readonly property bool fromSystem: role === "system"

        Rectangle {
            anchors.fill: parent
            color: bubble.fromUser
                   ? Qt.rgba(Theme.palette.accent.r, Theme.palette.accent.g,
                             Theme.palette.accent.b, 0.10)
                   : "transparent"
            radius: 6
            visible: bubble.fromUser || bubble.fromSystem
            border.width: bubble.fromSystem ? 1 : 0
            border.color: Theme.palette.border
        }

        Item {
            id: content
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.margins: 10
            anchors.topMargin: 8
            implicitHeight: column.implicitHeight

            Column {
                id: column
                width: parent.width
                spacing: 4

                Row {
                    spacing: 6

                    AiGlyph {
                        visible: !bubble.fromUser && !bubble.fromSystem
                        anchors.verticalCenter: parent.verticalCenter
                        glyph: panel.providerGlyph
                        color: panel.providerColor
                        width: 12
                        height: 12
                    }

                    Text {
                        anchors.verticalCenter: parent.verticalCenter
                        text: bubble.fromUser ? "你"
                              : (bubble.fromSystem ? "提示" : panel.providerName)
                        color: bubble.fromUser ? Theme.palette.textMuted
                              : (bubble.fromSystem ? Theme.palette.textFaint
                                                   : panel.providerColor)
                        font.pixelSize: 10
                        font.bold: true
                    }
                }

                Text {
                    width: parent.width
                    text: bubble.text
                    color: bubble.fromSystem ? Theme.palette.textMuted : Theme.palette.text
                    font.pixelSize: 12
                    lineHeight: 1.45
                    wrapMode: Text.WordWrap
                }
            }
        }
    }

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

            Row {
                anchors.left: parent.left
                anchors.leftMargin: 12
                anchors.verticalCenter: parent.verticalCenter
                spacing: 7

                AiGlyph {
                    anchors.verticalCenter: parent.verticalCenter
                    glyph: panel.providerGlyph
                    color: panel.providerColor
                    width: 15
                    height: 15
                }

                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    text: panel.providerName
                    color: Theme.palette.text
                    font.pixelSize: 12
                    font.bold: true
                }
            }

            HeaderButton {
                icon: "close"
                anchors.right: parent.right
                anchors.rightMargin: 8
                anchors.verticalCenter: parent.verticalCenter
                onClicked: panel.closeRequested()
            }
        }

        Rectangle { width: parent.width; height: 1; color: Theme.palette.border }

        // ---- 消息列表 ------------------------------------------------------
        ListView {
            id: messageList
            width: parent.width
            height: parent.height - 44 - 1 - inputBox.height
            clip: true
            model: panel.messages
            spacing: 4
            boundsBehavior: Flickable.StopAtBounds

            delegate: Bubble {
                required property var modelData
                role: modelData.role
                text: modelData.text
                pending: modelData.pending
            }

            onCountChanged: positionViewAtEnd()

            // 思考中：三个点
            footer: Item {
                width: messageList.width
                height: panel.thinking ? 34 : 0
                visible: panel.thinking

                Row {
                    anchors.left: parent.left
                    anchors.leftMargin: 14
                    anchors.verticalCenter: parent.verticalCenter
                    spacing: 4

                    Repeater {
                        model: 3
                        Rectangle {
                            required property int index
                            width: 5
                            height: 5
                            radius: 2.5
                            color: Theme.palette.textFaint
                            opacity: 0.35
                            SequentialAnimation on opacity {
                                running: panel.thinking
                                loops: Animation.Infinite
                                PauseAnimation { duration: index * 160 }
                                NumberAnimation { to: 1.0; duration: 320 }
                                NumberAnimation { to: 0.35; duration: 320 }
                            }
                        }
                    }
                }
            }
        }

        Rectangle { width: parent.width; height: 1; color: Theme.palette.borderSoft }

        // ---- 输入区 --------------------------------------------------------
        Item {
            id: inputBox
            width: parent.width
            height: 92

            Rectangle {
                id: field
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.top: parent.top
                anchors.margins: 10
                anchors.bottomMargin: 0
                height: 56
                radius: 6
                color: Theme.palette.bg
                border.width: 1
                border.color: inputArea.activeFocus
                              ? Theme.palette.accent
                              : Theme.palette.border

                TextEdit {
                    id: inputArea
                    anchors.fill: parent
                    anchors.margins: 8
                    color: Theme.palette.text
                    selectionColor: Theme.palette.accent
                    selectedTextColor: Theme.palette.bg
                    font.pixelSize: 12
                    wrapMode: TextEdit.Wrap
                    clip: true
                    textFormat: TextEdit.PlainText

                    Keys.onPressed: function (event) {
                        if (event.key === Qt.Key_Return && !(event.modifiers & Qt.ShiftModifier)) {
                            panel.send(text.trim());
                            text = "";
                            event.accepted = true;
                        }
                    }

                    Text {
                        anchors.fill: parent
                        visible: inputArea.text.length === 0
                        text: "问我任何事，比如「把化学设为当前学科」"
                        color: Theme.palette.textFaint
                        font.pixelSize: 12
                        wrapMode: Text.WordWrap
                    }
                }
            }

            // 发送按钮
            Rectangle {
                id: sendButton
                anchors.right: parent.right
                anchors.rightMargin: 10
                anchors.bottom: parent.bottom
                anchors.bottomMargin: 16
                width: 26
                height: 26
                radius: 13
                color: inputArea.text.trim().length > 0
                       ? panel.providerColor
                       : Qt.rgba(Theme.palette.textFaint.r, Theme.palette.textFaint.g,
                                 Theme.palette.textFaint.b, 0.18)

                GlyphIcon {
                    anchors.centerIn: parent
                    name: "send"
                    width: 13
                    height: 13
                    color: inputArea.text.trim().length > 0
                           ? "#ffffff"
                           : Theme.palette.textFaint
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    enabled: inputArea.text.trim().length > 0
                    onClicked: {
                        panel.send(inputArea.text.trim());
                        inputArea.text = "";
                    }
                }
            }

            Text {
                anchors.left: parent.left
                anchors.leftMargin: 10
                anchors.bottom: parent.bottom
                anchors.bottomMargin: 4
                text: "Enter 发送 · Shift+Enter 换行"
                color: Theme.palette.textFaint
                font.pixelSize: 9
            }
        }
    }

    Component.onCompleted: inputArea.forceActiveFocus()
}
