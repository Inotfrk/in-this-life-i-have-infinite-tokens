import QtQuick

// 线条图标。用 Canvas 画，避免依赖系统里的图标字体——
// 容器和部分 Linux 发行版没有装 symbol 字体，字形会变成方块。
Canvas {
    id: root

    property string name: "search"
    property color color: "#8b949e"
    property real stroke: 1.6

    width: 20
    height: 20
    antialiasing: true

    onNameChanged: requestPaint()
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
        ctx.lineWidth = root.stroke;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // 每个图标按 20x20 的画布比例缩放
        ctx.save();
        ctx.scale(w / 20, h / 20);

        if (name === "search") {
            ctx.beginPath();
            ctx.arc(8.5, 8.5, 5.2, 0, Math.PI * 2);
            ctx.moveTo(12.6, 12.6);
            ctx.lineTo(16.5, 16.5);
            ctx.stroke();
        } else if (name === "pen") {
            ctx.beginPath();
            ctx.moveTo(13.5, 3.5);
            ctx.lineTo(16.5, 6.5);
            ctx.lineTo(7.5, 15.5);
            ctx.lineTo(3.5, 16.5);
            ctx.lineTo(4.5, 12.5);
            ctx.closePath();
            ctx.stroke();
        } else if (name === "brush") {
            ctx.beginPath();
            ctx.moveTo(14.5, 3.5);
            ctx.lineTo(16.5, 5.5);
            ctx.lineTo(9.5, 12.5);
            ctx.lineTo(7.5, 10.5);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(7.0, 13.0);
            ctx.quadraticCurveTo(5.0, 15.0, 3.5, 16.5);
            ctx.quadraticCurveTo(6.5, 16.5, 8.0, 14.5);
            ctx.stroke();
        } else if (name === "note") {
            ctx.beginPath();
            ctx.rect(4, 3, 12, 14);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(7, 7.5);
            ctx.lineTo(13, 7.5);
            ctx.moveTo(7, 10.5);
            ctx.lineTo(13, 10.5);
            ctx.moveTo(7, 13.5);
            ctx.lineTo(10.5, 13.5);
            ctx.stroke();
        } else if (name === "home") {
            ctx.beginPath();
            ctx.moveTo(3, 9.5);
            ctx.lineTo(10, 3.5);
            ctx.lineTo(17, 9.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(5, 9.0);
            ctx.lineTo(5, 16.5);
            ctx.lineTo(15, 16.5);
            ctx.lineTo(15, 9.0);
            ctx.stroke();
        } else if (name === "people") {
            ctx.beginPath();
            ctx.arc(7.5, 7, 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(13.5, 8.5, 2.4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(2.5, 16.5);
            ctx.quadraticCurveTo(3.5, 11.5, 7.5, 11.5);
            ctx.quadraticCurveTo(11.5, 11.5, 12.5, 16.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(13.5, 12.0);
            ctx.quadraticCurveTo(16.5, 12.2, 17.5, 16.0);
            ctx.stroke();
        } else if (name === "user") {
            // 单人剪影：头 + 肩
            ctx.beginPath();
            ctx.arc(10, 6.8, 3.2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(3.6, 17);
            ctx.quadraticCurveTo(4.4, 11.6, 10, 11.6);
            ctx.quadraticCurveTo(15.6, 11.6, 16.4, 17);
            ctx.stroke();
        } else if (name === "camera") {
            // 相机：机身 + 镜头 + 顶部取景器
            ctx.beginPath();
            ctx.rect(2.5, 6.5, 15, 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(7, 6.5);
            ctx.lineTo(8.2, 3.5);
            ctx.lineTo(11.8, 3.5);
            ctx.lineTo(13, 6.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(10, 11.5, 2.6, 0, Math.PI * 2);
            ctx.stroke();
        } else if (name === "signout") {
            // 门 + 向右的箭头
            ctx.beginPath();
            ctx.moveTo(11.5, 3);
            ctx.lineTo(4, 3);
            ctx.lineTo(4, 17);
            ctx.lineTo(11.5, 17);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(9.5, 10);
            ctx.lineTo(16.5, 10);
            ctx.moveTo(13.8, 7.2);
            ctx.lineTo(16.6, 10);
            ctx.lineTo(13.8, 12.8);
            ctx.stroke();
        } else if (name === "settings") {
            ctx.beginPath();
            ctx.arc(10, 10, 2.6, 0, Math.PI * 2);
            ctx.stroke();
            for (var i = 0; i < 8; ++i) {
                var a = i * Math.PI / 4;
                ctx.beginPath();
                ctx.moveTo(10 + Math.cos(a) * 4.6, 10 + Math.sin(a) * 4.6);
                ctx.lineTo(10 + Math.cos(a) * 6.6, 10 + Math.sin(a) * 6.6);
                ctx.stroke();
            }
        } else if (name === "menu") {
            ctx.beginPath();
            ctx.moveTo(3.5, 6);
            ctx.lineTo(16.5, 6);
            ctx.moveTo(3.5, 10);
            ctx.lineTo(16.5, 10);
            ctx.moveTo(3.5, 14);
            ctx.lineTo(16.5, 14);
            ctx.stroke();
        } else if (name === "plus") {
            ctx.beginPath();
            ctx.moveTo(10, 4);
            ctx.lineTo(10, 16);
            ctx.moveTo(4, 10);
            ctx.lineTo(16, 10);
            ctx.stroke();
        } else if (name === "folder") {
            ctx.beginPath();
            ctx.moveTo(3, 6.5);
            ctx.lineTo(8, 6.5);
            ctx.lineTo(9.5, 8.5);
            ctx.lineTo(17, 8.5);
            ctx.lineTo(17, 15.5);
            ctx.lineTo(3, 15.5);
            ctx.closePath();
            ctx.stroke();
        }

        ctx.restore();
    }
}
