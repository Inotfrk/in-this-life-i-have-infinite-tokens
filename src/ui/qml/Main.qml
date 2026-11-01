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
    property bool aiMenuOpen: false

    // 仅用于截图预览：--open-account-menu 让账号菜单展开；
    // --open-ai-menu 让服务商菜单展开；--avatar <路径> 试照片头像
    Component.onCompleted: {
        var args = Qt.application.arguments;
        if (args.indexOf("--open-account-menu") >= 0)
            accountMenuOpen = true;
        if (args.indexOf("--open-ai-menu") >= 0)
            aiMenuOpen = true;
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
                    opened: window.aiMenuOpen
                    onClicked: {
                        window.aiMenuOpen = !window.aiMenuOpen;
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
                    selected: subjectList.currentIndex === index

                    onClicked: subjectList.currentIndex = index
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
    }

    // ---- AI 服务商菜单（点 AI 按钮弹出）-------------------------------------
    AiProviderMenu {
        id: aiMenu
        visible: window.aiMenuOpen
        // 贴住 AI 按钮，按钮在头像左侧，所以菜单右边缘也要往左让一点
        x: window.width - width - 20 - 10 - 34
        y: 20 + card.headerHeight + 6
        currentId: Ai.current
        providers: Ai.available

        onProviderPicked: function (id) {
            Ai.current = id;
            window.aiMenuOpen = false;
        }
    }

    // 点空白处收起菜单
    MouseArea {
        anchors.fill: parent
        enabled: window.accountMenuOpen || window.aiMenuOpen
        z: -1
        onClicked: {
            window.accountMenuOpen = false;
            window.aiMenuOpen = false;
        }
    }
}
