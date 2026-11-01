import QtQuick
import QtQuick.Window
import "Theme.js" as Theme

// 学习助手主页面骨架。只有布局与静态假数据，没有任何业务功能：
// 不读文件、不调 AI、不存 API Key。设计说明见 docs/design-study-app-ui.md。
Window {
    id: window

    width: 1180
    height: 760
    minimumWidth: 900
    minimumHeight: 560
    visible: true
    color: Theme.bg
    title: qsTr("Infinite Tokens")

    Row {
        anchors.fill: parent
        spacing: 0

        // ---- 第 1 层：全局图标栏 -------------------------------------------
        Rectangle {
            id: rail
            width: 52
            height: parent.height
            color: Theme.railBg

            Column {
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: parent.top
                anchors.topMargin: 10
                spacing: 4

                RailButton { icon: "search" }
                RailButton { icon: "pen" }
                RailButton { icon: "brush" }
                RailButton { icon: "note" }
                RailButton { icon: "home"; current: true }
                RailButton { icon: "people" }
            }

            RailButton {
                icon: "settings"
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.bottom: parent.bottom
                anchors.bottomMargin: 10
            }
        }

        // ---- 第 2 层：内容卡片 ---------------------------------------------
        Item {
            width: parent.width - rail.width
            height: parent.height

            Rectangle {
                id: card
                anchors.fill: parent
                anchors.margins: 16
                color: Theme.cardBg
                radius: 8
                border.color: Theme.border
                border.width: 1

                readonly property int headerHeight: 52
                readonly property int sidebarWidth: 216

                // 卡片头部：左 ☰ 更多选项，右 AI 入口
                Item {
                    id: header
                    width: parent.width
                    height: card.headerHeight

                    HeaderButton {
                        icon: "menu"
                        anchors.left: parent.left
                        anchors.leftMargin: 12
                        anchors.verticalCenter: parent.verticalCenter
                    }

                    // AI 入口：将来点它可以让 AI 操作软件的各个部分；外观可在设置里更换。
                    HeaderButton {
                        label: "AI"
                        anchors.right: parent.right
                        anchors.rightMargin: 12
                        anchors.verticalCenter: parent.verticalCenter
                    }
                }

                Rectangle {
                    id: headerDivider
                    y: card.headerHeight
                    width: parent.width
                    height: 1
                    color: Theme.border
                }

                // ---- 学科侧栏 -------------------------------------------------
                Item {
                    id: sidebar
                    y: card.headerHeight + 1
                    width: card.sidebarWidth
                    height: card.height - card.headerHeight - 1

                    // 学科写死三个，仅用于确认布局；点选只改高亮，不加载任何内容。
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

                        model: [
                            { name: "math", title: "数学" },
                            { name: "phy", title: "物理" },
                            { name: "che", title: "化学" }
                        ]

                        delegate: SubjectRow {
                            required property int index
                            required property var modelData

                            width: subjectList.width
                            name: modelData.name
                            title: modelData.title
                            selected: subjectList.currentIndex === index

                            onClicked: subjectList.currentIndex = index
                        }
                    }

                    // 列表溢出时出现的细滚动条
                    Rectangle {
                        id: scrollHandle
                        visible: subjectList.contentHeight > subjectList.height
                        width: 3
                        radius: 2
                        color: Theme.border
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

                    // ---- 侧栏底部预留区（内容未定） ---------------------------
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
                            color: Theme.borderSoft
                        }

                        Text {
                            anchors.left: parent.left
                            anchors.leftMargin: 16
                            anchors.top: parent.top
                            anchors.topMargin: 12
                            text: "预留区（待定）"
                            color: Theme.textFaint
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
                    color: Theme.border
                }

                // ---- 主内容区：本阶段刻意留空 --------------------------------
                Item {
                    id: mainArea
                    x: card.sidebarWidth + 1
                    y: card.headerHeight + 1
                    width: card.width - card.sidebarWidth - 1
                    height: card.height - card.headerHeight - 1

                    Text {
                        anchors.centerIn: parent
                        text: "主内容区（界面骨架，暂未接入）"
                        color: Theme.textFaint
                        font.pixelSize: 13
                    }
                }
            }
        }
    }
}
