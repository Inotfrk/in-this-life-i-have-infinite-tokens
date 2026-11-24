
import sys, re, copy
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

SRC = r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Bilingual.docx"
OUT = r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Bilingual_FB.docx"

FONT_LATIN = "Arial"
FONT_CJK = "Microsoft YaHei"
C_DARK = "17365D"
C_BLUE = "1F4E79"
C_MID = "2E74B5"

GROUPS = [
 ("一、运动与加速度（第 2 章）  Motion and Acceleration", [
   ("v̄ = d ÷ t", "平均速率 = 总距离 ÷ 总时间　average speed = total distance ÷ total time", "m/s（或 km/h、cm/s）", [
     ("v̄", "average speed", "平均速率", "m/s、km/h、cm/s"),
     ("d", "total distance", "总距离", "m、km、cm"),
     ("t", "total time", "总时间", "s、min、h"),
   ]),
   ("a = (v − u) ÷ t", "加速度 = 速度变化量 ÷ 所用时间　acceleration = change in velocity ÷ time taken", "m/s²", [
     ("a", "acceleration", "加速度", "m/s²"),
     ("v", "final velocity", "末速度", "m/s"),
     ("u", "initial velocity", "初速度", "m/s"),
     ("t", "time taken", "所用时间", "s"),
   ]),
   ("d = v t", "距离 = 速率 × 时间　distance = speed × time", "m", [
     ("d", "distance", "距离", "m、cm、km"),
     ("v", "speed", "速率", "m/s"),
     ("t", "time", "时间", "s"),
   ]),
   ("v = Δy ÷ Δx", "距离—时间图像的斜率 = 速率　gradient of a distance–time graph = speed", "m/s", [
     ("v", "speed", "速率", "m/s"),
     ("Δy", "change in distance", "距离变化量", "m"),
     ("Δx", "change in time", "时间变化量", "s"),
   ]),
   ("s = 图像下面积", "速率—时间图像下的面积 = 距离　area under a speed–time graph = distance", "m", [
     ("s", "distance travelled", "运动距离", "m"),
     ("area", "area under the graph", "图像下方面积", "m（由 m/s × s 得到）"),
   ]),
 ]),
 ("二、力与运动（第 3 章）  Forces and Motion", [
   ("W = m g", "重力 = 质量 × 重力场强度　weight = mass × gravitational field strength", "N", [
     ("W", "weight", "重力", "N"),
     ("m", "mass", "质量", "kg"),
     ("g", "gravitational field strength", "重力场强度", "N/kg（或 m/s²）"),
   ]),
   ("F = m a", "合力 = 质量 × 加速度　resultant force = mass × acceleration", "N", [
     ("F", "resultant force", "合力", "N"),
     ("m", "mass", "质量", "kg"),
     ("a", "acceleration", "加速度", "m/s²"),
   ]),
   ("p = m v", "动量 = 质量 × 速度　momentum = mass × velocity", "kg·m/s", [
     ("p", "momentum", "动量", "kg·m/s"),
     ("m", "mass", "质量", "kg"),
     ("v", "velocity", "速度", "m/s"),
   ]),
   ("Δp = m v − m u", "动量变化量 = 末动量 − 初动量　change in momentum", "kg·m/s", [
     ("Δp", "change in momentum", "动量变化量", "kg·m/s（或 N·s）"),
     ("m", "mass", "质量", "kg"),
     ("v", "final velocity", "末速度", "m/s"),
     ("u", "initial velocity", "初速度", "m/s"),
   ]),
   ("F t = Δp = m v − m u", "冲量 = 力 × 时间 = 动量变化量　impulse = force × time = change in momentum", "N·s", [
     ("F", "force", "力", "N"),
     ("t", "time", "时间", "s"),
     ("Δp", "change in momentum / impulse", "动量变化量 / 冲量", "N·s（或 kg·m/s）"),
   ]),
   ("m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂", "动量守恒：碰撞前总动量 = 碰撞后总动量　conservation of momentum", "kg·m/s", [
     ("m₁、m₂", "masses of the two objects", "两物体的质量", "kg"),
     ("u₁、u₂", "initial velocities", "碰撞前速度", "m/s"),
     ("v₁、v₂", "final velocities", "碰撞后速度", "m/s"),
   ]),
   ("R = √(F₁² + F₂²)", "两个互相垂直力的合力　resultant of two perpendicular forces", "N", [
     ("R", "resultant force", "合力", "N"),
     ("F₁、F₂", "perpendicular forces", "两个互相垂直的力", "N"),
   ]),
 ]),
 ("三、力矩与物质受力（第 4–5 章）  Turning Effects and Forces on Matter", [
   ("M = F d", "力矩 = 力 × 垂直距离　moment = force × perpendicular distance", "N·m", [
     ("M", "moment", "力矩", "N·m"),
     ("F", "force", "力", "N"),
     ("d", "perpendicular distance from pivot", "支点到作用线的垂直距离", "m（与 N 搭配时必须用 m）"),
   ]),
   ("顺时针力矩总和 = 逆时针力矩总和", "力矩平衡条件　principle of moments", "N·m", [
     ("M_cw", "total clockwise moment", "总顺时针力矩", "N·m"),
     ("M_acw", "total anticlockwise moment", "总逆时针力矩", "N·m"),
   ]),
   ("x = l − l₀", "伸长量 = 拉伸后长度 − 原长　extension = stretched length − original length", "m（或 cm）", [
     ("x", "extension", "伸长量", "m（或 cm）"),
     ("l", "stretched length", "拉伸后长度", "m（或 cm）"),
     ("l₀", "original length", "原长", "m（或 cm）"),
   ]),
   ("F = k x", "胡克定律：载荷 = 劲度系数 × 伸长量　Hooke’s law", "N", [
     ("F", "load", "载荷", "N"),
     ("k", "spring constant", "劲度系数", "N/m"),
     ("x", "extension", "伸长量", "m（k 为 N/m 时必须用 m）"),
   ]),
   ("p = F ÷ A", "压强 = 垂直作用力 ÷ 面积　pressure = force ÷ area", "Pa（N/m²）", [
     ("p", "pressure", "压强", "Pa（N/m²）"),
     ("F", "force normal to the surface", "垂直作用在表面上的力", "N"),
     ("A", "area", "面积", "m²"),
   ]),
   ("p = h ρ g", "液体压强 = 深度 × 密度 × 重力加速度　pressure in a liquid", "Pa", [
     ("p", "pressure", "压强", "Pa"),
     ("h", "depth below the surface", "液面以下深度", "m"),
     ("ρ", "density", "密度", "kg/m³"),
     ("g", "acceleration due to gravity", "重力加速度", "N/kg（或 m/s²）"),
   ]),
 ]),
 ("四、能量、功与功率（第 6 章）  Energy, Work and Power", [
   ("ΔEₚ = m g Δh", "重力势能变化量 = 质量 × 重力场强度 × 高度变化　change in gravitational potential energy", "J", [
     ("ΔEₚ", "change in gravitational potential energy", "重力势能变化量", "J"),
     ("m", "mass", "质量", "kg"),
     ("g", "gravitational field strength", "重力场强度", "N/kg（或 m/s²）"),
     ("Δh", "change in vertical height", "竖直高度变化", "m"),
   ]),
   ("Eₖ = ½ m v²", "动能 = ½ × 质量 × 速率的平方　kinetic energy", "J", [
     ("Eₖ", "kinetic energy", "动能", "J"),
     ("m", "mass", "质量", "kg"),
     ("v", "speed", "速率", "m/s（只有 v 要平方）"),
   ]),
   ("W = F s", "功 = 力 × 沿力方向移动的距离　work done = force × distance moved", "J", [
     ("W", "work done", "功", "J"),
     ("F", "force", "力", "N"),
     ("s", "distance moved in the direction of the force", "沿力方向移动的距离", "m"),
   ]),
   ("efficiency = 有用能量输出 ÷ 总输入能量", "效率 = 有用能量输出 ÷ 总输入能量　efficiency", "无单位（小数）或 %", [
     ("efficiency", "efficiency", "效率", "小数（0–1）或 %"),
     ("useful output", "useful energy output", "有用能量输出", "J"),
     ("total input", "total energy input", "总输入能量", "J"),
   ]),
   ("percentage efficiency =（有用 ÷ 总输入）× 100%", "效率百分比　percentage efficiency", "%", [
     ("%", "percentage efficiency", "效率百分比", "%"),
   ]),
   ("P = W ÷ t = E ÷ t", "功率 = 功（或转移的能量）÷ 时间　power = work done ÷ time", "W", [
     ("P", "power", "功率", "W"),
     ("W", "work done", "功", "J"),
     ("E", "energy transferred", "转移的能量", "J"),
     ("t", "time taken", "所用时间", "s"),
   ]),
 ]),
 ("五、功、功率与能源（第 7–8 章）  Work, Power and Energy Resources", [
   ("P = F v", "功率 = 驱动力 × 速率　power = driving force × speed", "W", [
     ("P", "power", "功率", "W"),
     ("F", "driving force", "驱动力", "N"),
     ("v", "speed", "速率", "m/s"),
   ]),
   ("efficiency = 有用功率输出 ÷ 总输入功率", "效率 = 有用功率输出 ÷ 总输入功率　efficiency = useful power out ÷ total power in", "%", [
     ("efficiency", "efficiency", "效率", "% 或小数"),
     ("useful power", "useful power output", "有用功率输出", "W"),
     ("total power", "total power input", "总输入功率", "W"),
   ]),
   ("E = P t", "能量 = 功率 × 时间　energy transferred = power × time", "J", [
     ("E", "energy transferred", "转移的能量", "J（或 kJ）"),
     ("P", "power", "功率", "W"),
     ("t", "time", "时间", "s"),
   ]),
 ]),
 ("六、物质的粒子模型（第 9 章）  The Kinetic Model of Matter", [
   ("p₁ V₁ = p₂ V₂", "波意耳定律（质量、温度不变）　Boyle’s law", "Pa·m³（两边单位一致即可）", [
     ("p₁、p₂", "initial / final pressure", "初 / 末压强", "Pa（或 kPa）"),
     ("V₁、V₂", "initial / final volume", "初 / 末体积", "m³（或 cm³、L）"),
   ]),
   ("ρ = m ÷ V", "密度 = 质量 ÷ 体积　density = mass ÷ volume", "kg/m³", [
     ("ρ", "density", "密度", "kg/m³（或 g/cm³）"),
     ("m", "mass", "质量", "kg（或 g）"),
     ("V", "volume", "体积", "m³（或 cm³）"),
   ]),
 ]),
 ("七、热学（第 10–11 章）  Thermal Physics", [
   ("E = m c ΔT", "转移的热能 = 质量 × 比热容 × 温度变化　thermal energy transfer", "J", [
     ("E", "thermal energy transferred", "转移的热能", "J（或 kJ）"),
     ("m", "mass", "质量", "kg"),
     ("c", "specific heat capacity", "比热容", "J/(kg·°C)"),
     ("ΔT", "change in temperature", "温度变化", "°C（或 K）"),
   ]),
   ("c = E ÷ (m ΔT)", "比热容 = 转移的热能 ÷（质量 × 温度变化）　specific heat capacity", "J/(kg·°C)", [
     ("c", "specific heat capacity", "比热容", "J/(kg·°C)"),
     ("E", "thermal energy transferred", "转移的热能", "J"),
     ("m", "mass", "质量", "kg"),
     ("ΔT", "change in temperature", "温度变化", "°C"),
   ]),
   ("ΔT = T₂ − T₁", "温度变化 = 末温 − 初温　change in temperature", "°C", [
     ("ΔT", "change in temperature", "温度变化", "°C（或 K）"),
     ("T₂", "final temperature", "末温", "°C"),
     ("T₁", "initial temperature", "初温", "°C"),
   ]),
   ("P = E ÷ t", "加热功率 = 转移的热能 ÷ 时间　heating power", "W", [
     ("P", "power", "功率", "W"),
     ("E", "thermal energy transferred", "转移的热能", "J"),
     ("t", "time", "时间", "s"),
   ]),
 ]),
]

def set_ea(run):
    rPr = run._element.get_or_add_rPr()
    rf = rPr.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts')
        rPr.insert(0, rf)
    rf.set(qn('w:eastAsia'), FONT_CJK)

def el(tag, **attrs):
    e = OxmlElement(tag)
    for k, v in attrs.items():
        e.set(qn(k), str(v))
    return e

def set_cell_margins(table, top=30, bottom=30, left=70, right=70):
    tblPr = table._tbl.tblPr
    mar = OxmlElement('w:tblCellMar')
    for side, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        e = OxmlElement('w:' + side)
        e.set(qn('w:w'), str(val))
        e.set(qn('w:type'), 'dxa')
        mar.append(e)
    tblPr.append(mar)

def set_borders(table, color="D0D7E2", sz=4):
    tblPr = table._tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement('w:' + edge)
        e.set(qn('w:val'), 'single')
        e.set(qn('w:sz'), str(sz))
        e.set(qn('w:space'), '0')
        e.set(qn('w:color'), color)
        borders.append(e)
    tblPr.append(borders)

def set_col_widths(table, widths):
    tbl = table._tbl
    tblPr = tbl.tblPr
    layout = OxmlElement('w:tblLayout'); layout.set(qn('w:type'), 'fixed'); tblPr.append(layout)
    for i, w in enumerate(widths):
        table.columns[i].width = Cm(w)
    for row in table.rows:
        for i, w in enumerate(widths):
            row.cells[i].width = Cm(w)

def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), color)
    tcPr.append(shd)

def cell_text(cell, text, size=8.5, bold=False, color="222222", align=None):
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(1)
    p.paragraph_format.line_spacing = 1.0
    if align is not None:
        p.alignment = align
    r = p.add_run(text)
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.name = FONT_LATIN
    r.font.color.rgb = RGBColor.from_string(color)
    set_ea(r)

doc = Document(SRC)
body = doc.element.body

# find anchor: first H1 starting with 第
anchor = None
for p in doc.paragraphs:
    if p.style.name == "Heading 1" and p.text.strip().startswith("第"):
        anchor = p._p
        break
print("anchor found", anchor is not None)

new_elements = []

# title
h = doc.add_paragraph(style='Heading 1')
h.paragraph_format.page_break_before = True
h.paragraph_format.space_before = Pt(0)
h.paragraph_format.space_after = Pt(4)
r1 = h.add_run("公式总表")
r2 = h.add_run("   Master Formula Bank · Chapters 2–11")
r2.font.size = Pt(13); r2.font.bold = False
r2.font.color.rgb = RGBColor.from_string(C_MID)
new_elements.append(h._p)

meta = doc.add_paragraph(style='Chapter Meta')
meta.add_run("全册公式汇总　｜　每个公式列出：字母符号 · 英文单词 · 中文意思 · 常用单位")
new_elements.append(meta._p)

intro = doc.add_paragraph()
intro.paragraph_format.space_after = Pt(4)
ri = intro.add_run("用法")
ri.font.bold = True
ri.font.color.rgb = RGBColor.from_string(C_BLUE)
intro.add_run("：先看公式，再对照下面的每个字母——" 
              "它是哪个英文单词、中文什么意思、常用什么单位；代入前先统一单位（如 cm 换成 m、g 换成 kg）。")
new_elements.append(intro._p)

note = doc.add_paragraph(style='Cover Small')
note.add_run("注：带 ★ 的为考试最常直接考查的公式；单位栏中的“或”表示课本/题目允许的换算单位。")
note.paragraph_format.space_after = Pt(6)
new_elements.append(note._p)

WIDTHS = [5.5, 2.1, 4.5, 3.6, 3.3]

for gtitle, rows in GROUPS:
    gh = doc.add_paragraph(style='Heading 2')
    gh.paragraph_format.page_break_before = False
    gh.add_run(gtitle)
    new_elements.append(gh._p)

    total = sum(len(r[3]) for r in rows) + 1
    table = doc.add_table(rows=total, cols=5)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_borders(table)
    set_cell_margins(table)
    set_col_widths(table, WIDTHS)

    headers = ["公式 Formula", "字母 Symbol", "对应单词 English word", "中文意思", "常用单位 Common units"]
    for j, htext in enumerate(headers):
        c = table.rows[0].cells[j]
        shade(c, "E8EEF7")
        cell_text(c, htext, size=8.5, bold=True, color=C_BLUE)
    trPr = table.rows[0]._tr.get_or_add_trPr()
    th = OxmlElement('w:tblHeader'); trPr.append(th)

    ridx = 1
    for formula, formula_note, result_unit, syms in rows:
        start = ridx
        for k, (sym, word, zh, unit) in enumerate(syms):
            row = table.rows[ridx]
            cell_text(row.cells[1], sym, size=8.5, bold=True, color=C_DARK)
            cell_text(row.cells[2], word, size=8.2, color="222222")
            cell_text(row.cells[3], zh, size=8.5, color="222222")
            cell_text(row.cells[4], unit, size=8.2, color="444444")
            ridx += 1
        end = ridx - 1
        merged = table.cell(start, 0)
        if end > start:
            merged = merged.merge(table.cell(end, 0))
        shade(merged, "F7F9FC")
        merged.text = ""
        p = merged.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run(formula)
        r.font.size = Pt(9)
        r.font.bold = True
        r.font.name = FONT_LATIN
        r.font.color.rgb = RGBColor.from_string(C_DARK)
        set_ea(r)
        p2 = merged.add_paragraph()
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(1)
        r2 = p2.add_run(formula_note)
        r2.font.size = Pt(7.5)
        r2.font.color.rgb = RGBColor.from_string("666666")
        set_ea(r2)
        p3 = merged.add_paragraph()
        p3.paragraph_format.space_before = Pt(0)
        p3.paragraph_format.space_after = Pt(2)
        r3 = p3.add_run("结果单位：" + result_unit)
        r3.font.size = Pt(7.5)
        r3.font.bold = True
        r3.font.color.rgb = RGBColor.from_string("8C6D1F")
        set_ea(r3)

    new_elements.append(table._tbl)
    gap = doc.add_paragraph()
    gap.paragraph_format.space_after = Pt(4)
    new_elements.append(gap._p)

# move all elements before anchor
for e in new_elements:
    anchor.addprevious(e)
print("moved elements", len(new_elements))
doc.save(OUT)
print("saved", OUT)
