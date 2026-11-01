import QtQuick
import QtQuick.Window

// 学习助手主页面骨架。只有布局与静态假数据，没有任何业务功能：
// 不读文件、不调 AI、不存 API Key。设计说明见 docs/design-study-app-ui.md。
//
// 布局按手绘草图：一个内容卡片，卡片内部分「学科侧栏 + 主内容区」，
// 头部左「☰ 更多选项」、右「AI」。不额外加左右全局图标栏。
Window {
    id: window

    width: 1180
    height: 760
    minimumWidth: 900
    minimumHeight: 560
    visible: true
    color: Theme.palette.bg
    title: qsTr("Infinite Tokens")

    // 学科列表：图标按学科区分，用户不读文字也能认出
    readonly property var subjects: [
        { id: "math", title: "数学" },
        { id: "phy", title: "物理" },
        { id: "che", title: "化学" }
    ]

    // 账号状态。本阶段只是界面，点了不会真的登录或存盘。
    property string userName: "Learner"
    property string avatarSource: ""
    property bool accountMenuOpen: false
    property bool chatOpen: false
    property bool settingsOpen: false
    property int currentSubjectIndex: 0

    // 软件当前状态，随每次请求发给服务器。
    // 服务器不知道这些就无从生成正确指令（见 docs/design-ai-protocol.md 第 2 节）。
    function buildAiContext() {
        var ids = [];
        for (var i = 0; i < subjects.length; ++i)
            ids.push(subjects[i].id);
        return {
            "currentSubject": subjects[currentSubjectIndex].id,
            "theme": Theme.mode,
            "provider": Ai.current,
            "availableSubjects": ids,
            "supportedOps": Commands.supportedOps()
        };
    }

    // 服务器回来的指令在这里逐条执行
    function runCommands(commands) {
        for (var i = 0; i < commands.length; ++i)
            Commands.execute(commands[i]);
    }

    // 学科列表变化时同步选中项
    onCurrentSubjectIndexChanged: subjectList.currentIndex = currentSubjectIndex

    // 仅用于截图预览
    Component.onCompleted: {
        var args = Qt.application.arguments;
        if (args.indexOf("--open-account-menu") >= 0)
            accountMenuOpen = true;
        if (args.indexOf("--open-chat") >= 0)
            chatOpen = true;
        if (args.indexOf("--open-settings") >= 0)
            settingsOpen = true;
        var i = args.indexOf("--avatar");
        if (i >= 0 && i + 1 < args.length)
            avatarSource = "file:///" + args[i + 1].replace(/\\/g, "/").replace(/^\//, "");
    }

    Rectangle {
        id: card
        anchors.fill: parent
        anchors.margins: 20
        color: Theme.palette.cardBg
        radius: 6
        border.color: Theme.palette.border
        border.width: 1

        readonly property int headerHeight: 48
        readonly property int sidebarWidth: 220

        // ---- 卡片头部-------------------------------------------------------
        Item {
            id: header
            width: parent.width
            height: card.headerHeight

            // 左：更多选项
            HeaderButton {
                icon: "menu"
                anchors.left: parent.left
                anchors.leftMargin: 10
                anchors.verticalCenter: parent.verticalCenter
            }

            // 右：用户头像（登录不同账号，同步各自资料），AI 在它左侧
            Row {
                anchors.right: parent.right
                anchors.rightMargin: 10
                anchors.verticalCenter: parent.verticalCenter
                spacing: 6

                AiButton {
                    anchors.verticalCenter: parent.verticalCenter
                    providerName: Ai.provider.name
                    providerShort: Ai.provider.short
                    providerGlyph: Ai.provider.glyph
                    providerColor: Ai.provider.color
                    opened: window.chatOpen
                    onClicked: {
                        window.chatOpen = !window.chatOpen;
                        window.accountMenuOpen = false;
                    }
                }
                Avatar {
                    id: headerAvatar
                    anchors.verticalCenter: parent.verticalCenter
                    size: 28
                    name: window.userName
                    imageSource: window.avatarSource

                    onClicked: {
                        window.accountMenuOpen = !window.accountMenuOpen;
                        window.aiMenuOpen = false;
                    }
                }
            }
        }

        Rectangle {
            id: headerDivider
            y: card.headerHeight
            width: parent.width
            height: 1
            color: Theme.palette.border
        }

        // ---- 学科侧栏（草图注释：学科选项，太多时可下滑）--------------------
        Item {
            id: sidebar
            y: card.headerHeight + 1
            width: card.sidebarWidth
            height: card.height - card.headerHeight - 1

            ListView {
                id: subjectList
                anchors.top: parent.top
                anchors.topMargin: 8
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.bottom: reservedArea.top
                anchors.bottomMargin: 8
                clip: true
                boundsBehavior: Flickable.StopAtBounds
                currentIndex: 0

                model: window.subjects

                delegate: SubjectRow {
                    required property int index
                    required property var modelData

                    width: subjectList.width
                    subject: modelData.id
                    title: modelData.title
                    selected: window.currentSubjectIndex === index

                    onClicked: window.currentSubjectIndex = index
                }
            }

            // 列表溢出时出现的细滚动条
            Rectangle {
                visible: subjectList.contentHeight > subjectList.height
                width: 3
                radius: 2
                color: Theme.palette.border
                x: parent.width - 6
                y: subjectList.y + (subjectList.contentHeight > 0
                                    ? subjectList.contentY / subjectList.contentHeight
                                      * subjectList.height
                                    : 0)
                height: subjectList.contentHeight > 0
                        ? Math.max(24, subjectList.height
                                      * subjectList.height / subjectList.contentHeight)
                        : 0
            }

            // 草图里学科下方另有一块带横线的区域，含义未定
            Item {
                id: reservedArea
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.bottom: parent.bottom
                height: 120

                Rectangle {
                    width: parent.width - 16
                    height: 1
                    x: 8
                    color: Theme.palette.borderSoft
                }

                Text {
                    anchors.left: parent.left
                    anchors.leftMargin: 18
                    anchors.top: parent.top
                    anchors.topMargin: 12
                    text: "预留区（待定）"
                    color: Theme.palette.textFaint
                    font.pixelSize: 12
                }
            }
        }

        Rectangle {
            id: sidebarDivider
            x: card.sidebarWidth
            y: card.headerHeight + 1
            width: 1
            height: card.height - card.headerHeight - 1
            color: Theme.palette.border
        }

        // ---- 主内容区：本阶段刻意留空 ---------------------------------------
        Rectangle {
            id: mainArea
            x: card.sidebarWidth + 1
            y: card.headerHeight + 1
            width: card.width - card.sidebarWidth - 1
            height: card.height - card.headerHeight - 1
            color: Theme.palette.contentBg

            Text {
                anchors.centerIn: parent
                text: "主内容区（界面骨架，暂未接入）"
                color: Theme.palette.textFaint
                font.pixelSize: 13
            }
        }
    }

    // ---- 账号菜单（点头像弹出）----------------------------------------------
    AccountMenu {
        id: accountMenu
        visible: window.accountMenuOpen
        x: window.width - width - 20 - 10
        y: 20 + card.headerHeight + 6
        userName: window.userName
        avatarSource: window.avatarSource

        onSettingsRequested: {
            window.accountMenuOpen = false;
            window.settingsOpen = true;
        }
    }

    // ---- 设置页（从账号菜单进入）-------------------------------------------
    SettingsPanel {
        id: settingsPanel
        visible: window.settingsOpen
        width: 380
        height: window.height - 40
        x: window.width - width - 20
        y: 20
        currentProvider: Ai.current
        providers: Ai.available

        onProviderSelected: function (id) {
            Ai.current = id;
        }
        onCloseRequested: window.settingsOpen = false
    }

    // ---- AI 对话面板（点 AI 按钮从右侧滑出，参考 Copilot 聊天面板）----------
    ChatPanel {
        id: chatPanel
        visible: window.chatOpen
        width: 360
        height: window.height - 40
        x: window.width - width - 20
        y: 20
        providerName: Ai.provider.name
        providerShort: Ai.provider.short
        providerGlyph: Ai.provider.glyph
        providerColor: Ai.provider.color

        onCloseRequested: window.chatOpen = false
    }

    // 点空白处收起菜单
    MouseArea {
        anchors.fill: parent
        enabled: window.accountMenuOpen
        z: -1
        onClicked: window.accountMenuOpen = false
    }

    // ---- 指令总线：把服务器下发的指令变成界面动作 ----------------------------
    Connections {
        target: Commands

        function onSetSubjectRequested(subjectId) {
            for (var i = 0; i < window.subjects.length; ++i) {
                if (window.subjects[i].id === subjectId) {
                    window.currentSubjectIndex = i;
                    return;
                }
            }
            chatPanel.appendSystem("没有找到学科「" + subjectId + "」，指令未生效。");
        }

        function onOpenChatRequested() { window.chatOpen = true; }
        function onCloseChatRequested() { window.chatOpen = false; }
        function onOpenSettingsRequested() { window.settingsOpen = true; }

        function onSetThemeRequested(themeId) {
            Theme.mode = themeId;
        }

        function onSetProviderRequested(providerId) {
            Ai.current = providerId;
        }

        function onRejected(op, reason) {
            chatPanel.appendSystem("指令被拒绝：" + reason);
        }
    }

    // ---- 与服务器通信 ------------------------------------------------------
    // AiClient 由 C++ 创建并注入，这里只连接信号，不新建实例
    Connections {
        target: AiClient

        function onReplyReceived(reply, commands) {
            chatPanel.appendAssistant(reply);
            window.runCommands(commands);
        }

        function onFailed(reason) {
            chatPanel.appendSystem(reason);
        }
    }

    // 对话面板发消息时走服务器，不在本地编造回复
    Connections {
        target: chatPanel
        function onSendRequested(text) {
            AiClient.send(text, window.buildAiContext());
        }
    }
}
