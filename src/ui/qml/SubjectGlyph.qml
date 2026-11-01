import QtQuick

// 学科图标。画的是该学科的「符号」，目的是让用户不读文字也能认出来。
// 学科由 id 区分，新增学科只需要在这里加一个分支。
Canvas {
    id: root

    property string subject: "math"
    property color color: "#9198a1"
    property real stroke: 1.5

    width: 18
    height: 18
    antialiasing: true

    onSubjectChanged: requestPaint()
    onColorChanged: requestPaint()
    onStrokeChanged: requestPaint()
    onWidthChanged: requestPaint()
    onHeightChanged: requestPaint()

    onPaint: {
        var ctx = getContext("2d");
        var w = width;
        var h = height;
        ctx.reset();
        ctx.strokeStyle = root.color;
        ctx.fillStyle = root.color;
        ctx.lineWidth = root.stroke;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.save();
        ctx.scale(w / 18, h / 18);

        if (subject === "math") {
            // 加号、减号、乘号、除号 —— 四则运算符号
            ctx.beginPath();
            ctx.moveTo(4.5, 4); ctx.lineTo(4.5, 10);
            ctx.moveTo(1.5, 7); ctx.lineTo(7.5, 7);
            ctx.moveTo(11.5, 3.5); ctx.lineTo(16, 8);
            ctx.moveTo(16, 3.5); ctx.lineTo(11.5, 8);
            ctx.moveTo(2, 13); ctx.lineTo(7.5, 13);
            ctx.moveTo(11, 12); ctx.lineTo(16.5, 12);
            ctx.moveTo(13.75, 14.5); ctx.lineTo(13.75, 14.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(13.75, 14.5, 0.9, 0, Math.PI * 2);
            ctx.fill();
        } else if (subject === "phy") {
            // 绕圈箭头 —— 运动 / 运动学
            ctx.beginPath();
            ctx.arc(9, 9, 5, -Math.PI * 0.65, Math.PI * 1.15);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(12.6, 3.4);
            ctx.lineTo(14.6, 5.6);
            ctx.lineTo(11.8, 6.2);
            ctx.closePath();
            ctx.fill();
        } else if (subject === "che") {
            // 三角烧瓶 + 液面
            ctx.beginPath();
            ctx.moveTo(6.5, 2.5);
            ctx.lineTo(11.5, 2.5);
            ctx.moveTo(7.4, 2.5);
            ctx.lineTo(7.4, 8);
            ctx.lineTo(3.6, 14.4);
            ctx.quadraticCurveTo(3.0, 15.5, 4.3, 15.5);
            ctx.lineTo(13.7, 15.5);
            ctx.quadraticCurveTo(15.0, 15.5, 14.4, 14.4);
            ctx.lineTo(10.6, 8);
            ctx.lineTo(10.6, 2.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(5.2, 11.6);
            ctx.lineTo(12.8, 11.6);
            ctx.stroke();
        } else if (subject === "word") {
            // 书签 / 卡片 —— 单词
            ctx.beginPath();
            ctx.rect(3.5, 2.5, 11, 13);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(6.5, 6); ctx.lineTo(11.5, 6);
            ctx.moveTo(6.5, 9); ctx.lineTo(11.5, 9);
            ctx.moveTo(6.5, 12); ctx.lineTo(9.5, 12);
            ctx.stroke();
        } else if (subject === "bio") {
            // 叶子 —— 生物
            ctx.beginPath();
            ctx.moveTo(4, 14);
            ctx.quadraticCurveTo(4, 5, 14, 4);
            ctx.quadraticCurveTo(14.5, 12.5, 4, 14);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(4, 14);
            ctx.lineTo(10.5, 7.5);
            ctx.stroke();
        } else if (subject === "lang") {
            // 对话气泡 —— 语言
            ctx.beginPath();
            ctx.moveTo(3, 3.5);
            ctx.lineTo(15, 3.5);
            ctx.lineTo(15, 11.5);
            ctx.lineTo(8.5, 11.5);
            ctx.lineTo(5, 15);
            ctx.lineTo(5, 11.5);
            ctx.lineTo(3, 11.5);
            ctx.closePath();
            ctx.stroke();
        } else {
            // 兜底：通用的方块
            ctx.beginPath();
            ctx.rect(3.5, 3.5, 11, 11);
            ctx.stroke();
        }

        ctx.restore();
    }
}
