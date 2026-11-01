import QtQuick

// AI 服务商标识。
// 只画各家品牌的「视觉符号」——用配色与形状表达，不内嵌商标文件。
// 目的是让人一眼认出现在接的是哪家，而不是展示商标。
Canvas {
    id: root

    // deepseek / claude / gpt / gemini / qwen / custom
    property string glyph: "deepseek"
    property color color: "#4D6BFE"
    property real stroke: 1.6

    width: 18
    height: 18
    antialiasing: true

    onGlyphChanged: requestPaint()
    onColorChanged: requestPaint()
    onWidthChanged: requestPaint()
    onHeightChanged: requestPaint()

    onPaint: {
        var ctx = getContext("2d");
        var w = width, h = height;
        ctx.reset();
        ctx.strokeStyle = root.color;
        ctx.fillStyle = root.color;
        ctx.lineWidth = root.stroke;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.save();
        ctx.scale(w / 18, h / 18);

        if (glyph === "deepseek") {
            // 鲸鱼意象：圆身 + 尾鳍 + 眼睛
            ctx.beginPath();
            ctx.arc(8.2, 9.4, 5.0, Math.PI * 0.32, Math.PI * 1.78);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(12.6, 5.4);
            ctx.quadraticCurveTo(15.6, 3.2, 16.2, 6.2);
            ctx.quadraticCurveTo(14.2, 6.4, 13.6, 8.4);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(6.4, 8.2, 1.0, 0, Math.PI * 2);
            ctx.fill();
        } else if (glyph === "claude") {
            // 星芒：长短不一的放射线
            for (var i = 0; i < 8; ++i) {
                var a = i * Math.PI / 4 + Math.PI / 8;
                var r1 = (i % 2 === 0) ? 2.6 : 4.4;
                var r2 = (i % 2 === 0) ? 7.4 : 6.2;
                ctx.beginPath();
                ctx.moveTo(9 + Math.cos(a) * r1, 9 + Math.sin(a) * r1);
                ctx.lineTo(9 + Math.cos(a) * r2, 9 + Math.sin(a) * r2);
                ctx.stroke();
            }
        } else if (glyph === "gpt") {
            // 花瓣结：三组交叠的弧
            for (var k = 0; k < 3; ++k) {
                var base = k * Math.PI / 3;
                ctx.beginPath();
                ctx.arc(9 + Math.cos(base) * 2.2, 9 + Math.sin(base) * 2.2,
                        3.4, base + Math.PI * 0.5, base + Math.PI * 1.9);
                ctx.stroke();
            }
        } else if (glyph === "gemini") {
            // 四角星
            ctx.beginPath();
            ctx.moveTo(9, 2.2);
            ctx.quadraticCurveTo(10.4, 7.6, 15.8, 9);
            ctx.quadraticCurveTo(10.4, 10.4, 9, 15.8);
            ctx.quadraticCurveTo(7.6, 10.4, 2.2, 9);
            ctx.quadraticCurveTo(7.6, 7.6, 9, 2.2);
            ctx.closePath();
            ctx.stroke();
        } else if (glyph === "qwen") {
            // 六边形 + 中点
            ctx.beginPath();
            for (var j = 0; j < 6; ++j) {
                var ang = j * Math.PI / 3 - Math.PI / 2;
                var px = 9 + Math.cos(ang) * 6.2;
                var py = 9 + Math.sin(ang) * 6.2;
                if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(9, 9, 1.8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 自定义 / 兜底：方框 + 中心点，代表"任意服务"
            ctx.beginPath();
            ctx.rect(3.4, 3.4, 11.2, 11.2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(9, 9, 2.0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
