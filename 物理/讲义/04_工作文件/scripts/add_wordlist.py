
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

SRC = r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Bilingual_FB.docx"
OUT = r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Final.docx"

FONT_LATIN = "Arial"
FONT_CJK = "Microsoft YaHei"
C_DARK = "17365D"
C_BLUE = "1F4E79"
C_MID = "2E74B5"

WORDS = [
 ("第 2 章 运动描述  Describing Motion", [
   ("distance", "距离", "distance = speed × time"),
   ("displacement", "位移（带方向）", "distance in one direction"),
   ("speed", "速率", "speed = distance ÷ time"),
   ("average speed", "平均速率", "total distance ÷ total time"),
   ("velocity", "速度（含方向）", "speed + direction"),
   ("acceleration", "加速度", "a = (v − u) ÷ t"),
   ("deceleration", "减速", "negative acceleration"),
   ("gradient / slope", "斜率", "slope of a d–t graph = speed"),
   ("distance–time graph", "距离—时间图像", "a flat line = not moving"),
   ("speed–time graph", "速率—时间图像", "area under the line = distance"),
   ("scalar", "标量", "size only (mass, time)"),
   ("vector", "矢量", "size and direction (force)"),
   ("magnitude", "大小", "how big a quantity is"),
   ("stationary", "静止", "not moving"),
   ("constant speed", "匀速", "same speed all the time"),
   ("initial velocity", "初速度", "u"),
   ("final velocity", "末速度", "v"),
   ("stopwatch", "秒表", "measures time"),
   ("light gate", "光电门", "measures a short time"),
   ("tangent", "切线", "for the slope of a curve"),
 ]),
 ("第 3 章 力与运动  Forces and Motion", [
   ("force", "力", "a push or a pull"),
   ("thrust", "推力", "a forward force"),
   ("friction", "摩擦力", "opposes motion"),
   ("drag / air resistance", "空气阻力", "opposes motion in air"),
   ("upthrust", "浮力", "an upward force from a fluid"),
   ("tension", "张力（拉力）", "a force in a rope"),
   ("normal reaction", "支持力", "the push from a surface"),
   ("resultant force", "合力", "one force with the same effect"),
   ("balanced forces", "平衡力", "resultant force = 0"),
   ("mass", "质量", "amount of matter (kg)"),
   ("weight", "重力", "W = mg (N)"),
   ("free fall", "自由落体", "only gravity acts"),
   ("terminal velocity", "终端速率", "drag = weight"),
   ("circular motion", "圆周运动", "the force points to the centre"),
   ("momentum", "动量", "p = mv"),
   ("impulse", "冲量", "F × t = change in momentum"),
   ("collision", "碰撞", "objects hit each other"),
   ("conservation of momentum", "动量守恒", "total p before = total p after"),
   ("vector addition", "矢量加法", "head to tail"),
   ("newton", "牛顿（N）", "unit of force"),
 ]),
 ("第 4 章 力矩  Turning Effects of Forces", [
   ("moment", "力矩", "M = F × d"),
   ("pivot", "支点", "the turning point"),
   ("turning effect", "转动效果", "what a moment does"),
   ("perpendicular distance", "垂直距离", "shortest distance to the force line"),
   ("clockwise", "顺时针", "the same way as a clock"),
   ("anticlockwise", "逆时针", "opposite to a clock"),
   ("equilibrium", "平衡", "forces and moments balance"),
   ("principle of moments", "力矩原理", "CW moments = ACW moments"),
   ("centre of mass", "质心", "where the mass seems to be"),
   ("centre of gravity", "重心", "where the weight acts"),
   ("stability", "稳定性", "hard to topple"),
   ("base", "底面", "the area it stands on"),
   ("plumb-line", "铅垂线", "shows the vertical line"),
   ("topple", "翻倒", "fall over"),
 ]),
 ("第 5 章 力与物质  Forces and Matter", [
   ("elastic deformation", "弹性形变", "returns to its shape"),
   ("inelastic deformation", "非弹性形变", "stays deformed"),
   ("extension", "伸长量", "x = l − l₀"),
   ("original length", "原长", "length before the load"),
   ("spring constant", "劲度系数", "k in F = kx (N/m)"),
   ("Hooke's law", "胡克定律", "F = kx in the straight part"),
   ("limit of proportionality", "比例极限", "graph stops being straight"),
   ("load", "载荷", "the force you add"),
   ("pressure", "压强", "p = F ÷ A"),
   ("density", "密度", "ρ = m ÷ V"),
   ("depth", "深度", "h in p = hρg"),
   ("manometer", "压力计", "shows a pressure difference"),
   ("barometer", "气压计", "measures air pressure"),
   ("pascal", "帕斯卡（Pa）", "unit of pressure"),
 ]),
 ("第 6 章 能量  Energy", [
   ("energy", "能量", "measured in joules (J)"),
   ("energy store", "能量储存", "where energy is kept"),
   ("kinetic energy", "动能", "Eₖ = ½mv²"),
   ("gravitational potential energy", "重力势能", "ΔEₚ = mgΔh"),
   ("chemical energy", "化学能", "in food, fuel, batteries"),
   ("nuclear energy", "核能", "inside the nucleus"),
   ("elastic / strain energy", "弹性（应变）能", "in a stretched spring"),
   ("internal energy", "内能", "energy of the particles"),
   ("transfer pathway", "转移方式", "how the energy moves"),
   ("conservation of energy", "能量守恒", "energy is never lost"),
   ("useful energy", "有用能量", "the part we want"),
   ("wasted energy", "浪费的能量", "the part we do not want"),
   ("Sankey diagram", "能流图", "arrow width = amount of energy"),
   ("efficiency", "效率", "useful ÷ total"),
   ("dissipated", "耗散的", "spread out and less useful"),
   ("radiation", "辐射", "energy carried by waves"),
   ("joule", "焦耳（J）", "unit of energy"),
   ("watt", "瓦特（W）", "unit of power"),
 ]),
 ("第 7 章 能源资源  Energy Resources", [
   ("renewable", "可再生的", "replaced naturally"),
   ("non-renewable", "不可再生的", "will run out"),
   ("fossil fuel", "化石燃料", "coal, oil, gas"),
   ("coal", "煤", ""),
   ("oil", "石油", ""),
   ("natural gas", "天然气", ""),
   ("solar cell", "太阳能电池", "makes electricity from light"),
   ("wind turbine", "风力涡轮机", "wind turns the blades"),
   ("biomass", "生物质", "plant material used as fuel"),
   ("biogas", "沼气", "gas from waste"),
   ("nuclear fission", "核裂变", "splitting the nucleus"),
   ("uranium", "铀", "nuclear fuel"),
   ("hydroelectric", "水力发电的", "water turns the turbines"),
   ("geothermal", "地热的", "heat from the ground"),
   ("tidal", "潮汐的", "energy from the tides"),
   ("reliability", "可靠性", "can we depend on it?"),
   ("environmental impact", "环境影响", "harm to nature"),
 ]),
 ("第 8 章 功与功率  Work and Power", [
   ("work done", "做功", "W = F × s"),
   ("energy transferred", "转移的能量", "same unit as work (J)"),
   ("power", "功率", "P = E ÷ t"),
   ("watt", "瓦特（W）", "1 W = 1 J per second"),
   ("power rating", "额定功率", "the power a device uses"),
   ("input", "输入", "energy in"),
   ("output", "输出", "energy out"),
 ]),
 ("第 9 章 物质的粒子模型  Kinetic Model", [
   ("particle", "粒子", "a tiny piece of matter"),
   ("molecule", "分子", "a group of atoms"),
   ("solid", "固体", "fixed shape"),
   ("liquid", "液体", "fixed volume, takes the shape"),
   ("gas", "气体", "fills the container"),
   ("intermolecular force", "分子间作用力", "force between particles"),
   ("vibrate", "振动", "move to and fro"),
   ("random motion", "无规则运动", "no fixed path"),
   ("melting", "熔化", "solid → liquid"),
   ("freezing", "凝固", "liquid → solid"),
   ("boiling", "沸腾", "liquid → gas everywhere"),
   ("evaporation", "蒸发", "liquid → gas at the surface"),
   ("condensation", "液化", "gas → liquid"),
   ("melting point", "熔点", "temperature it melts"),
   ("boiling point", "沸点", "temperature it boils"),
   ("Brownian motion", "布朗运动", "random motion of small particles"),
   ("diffusion", "扩散", "particles spread out"),
   ("gas pressure", "气体压强", "particles hit the walls"),
   ("compress", "压缩", "squeeze into less space"),
   ("Boyle's law", "波意耳定律", "p₁V₁ = p₂V₂"),
   ("inversely proportional", "成反比", "one goes up, the other down"),
   ("fractional distillation", "分馏", "separate oil by boiling point"),
 ]),
 ("第 10 章 热学性质  Thermal Properties", [
   ("thermal equilibrium", "热平衡", "same temperature"),
   ("temperature", "温度", "how hot or cold"),
   ("thermal expansion", "热膨胀", "gets bigger when heated"),
   ("contraction", "收缩", "gets smaller when cooled"),
   ("bimetallic strip", "双金属片", "two metals; bends when hot"),
   ("expansion joint", "伸缩缝", "space for expansion"),
   ("specific heat capacity", "比热容", "E = mcΔT"),
   ("temperature rise", "温升", "ΔT"),
   ("thermometer", "温度计", "measures temperature"),
 ]),
 ("第 11 章 热传递  Thermal Energy Transfers", [
   ("conduction", "传导", "heat through a solid"),
   ("conductor", "导体", "lets heat pass easily"),
   ("insulator", "绝缘体", "stops heat"),
   ("convection", "对流", "heat carried by moving fluid"),
   ("convection current", "对流循环", "hot fluid rises, cool fluid sinks"),
   ("fluid", "流体", "a liquid or a gas"),
   ("free electron", "自由电子", "moves inside a metal"),
   ("infrared", "红外线", "invisible heat radiation"),
   ("absorb", "吸收", "take in"),
   ("emit", "放出", "send out"),
   ("reflect", "反射", "bounce back"),
   ("matt black", "哑光黑", "good absorber and emitter"),
   ("shiny surface", "光亮表面", "good reflector"),
   ("vacuum flask", "保温瓶", "keeps things hot or cold"),
   ("cavity wall", "空心墙", "traps air and stops convection"),
   ("loft insulation", "阁楼隔热层", "stops heat escaping"),
 ]),
 ("考试指令词  Exam Instruction Words", [
   ("calculate", "计算", "show your working"),
   ("explain", "解释", "say why"),
   ("describe", "描述", "say what happens"),
   ("state", "说出", "one short answer"),
   ("compare", "比较", "give both, then the difference"),
   ("suggest", "推测", "give a possible reason"),
   ("define", "定义", "give the exact meaning"),
   ("estimate", "估算", "a rough value"),
   ("show that", "证明", "work it out to prove it"),
   ("give the unit", "写出单位", "always write the unit"),
   ("to 2 s.f.", "保留两位有效数字", "round the answer"),
 ]),
]

SENTS = [
 ("第 2 章 运动描述  Describing Motion", [
   ("Speed = distance ÷ time.", "速率 = 距离 ÷ 时间。"),
   ("Velocity = speed + direction.", "速度 = 速率 + 方向。"),
   ("Acceleration = change in velocity ÷ time.", "加速度 = 速度变化量 ÷ 时间。"),
   ("On a distance–time graph, the slope is the speed.", "距离—时间图像上，斜率就是速率。"),
   ("A flat line means the object is not moving.", "水平线表示物体静止不动。"),
   ("On a speed–time graph, the slope is the acceleration.", "速率—时间图像上，斜率就是加速度。"),
   ("The area under a speed–time graph is the distance.", "速率—时间图像下的面积就是距离。"),
 ]),
 ("第 3 章 力与运动  Forces and Motion", [
   ("A force is a push or a pull.", "力是推或拉。"),
   ("If the forces are balanced, the object does not accelerate.", "受力平衡时，物体不加速。"),
   ("Resultant force = mass × acceleration.", "合力 = 质量 × 加速度。"),
   ("Weight = mass × g. On Earth g is about 10 N/kg.", "重力 = 质量 × g；地球上 g 约为 10 N/kg。"),
   ("Mass stays the same everywhere; weight changes with g.", "质量处处相同；重力随 g 改变。"),
   ("Momentum = mass × velocity.", "动量 = 质量 × 速度。"),
   ("Impulse = force × time = change in momentum.", "冲量 = 力 × 时间 = 动量变化量。"),
   ("Total momentum before = total momentum after.", "碰撞前总动量 = 碰撞后总动量。"),
   ("At terminal velocity, drag = weight.", "终端速率时，阻力 = 重力。"),
   ("In circular motion, the force points to the centre.", "圆周运动中，力指向圆心。"),
 ]),
 ("第 4 章 力矩  Turning Effects of Forces", [
   ("Moment = force × perpendicular distance.", "力矩 = 力 × 垂直距离。"),
   ("For balance: total clockwise moment = total anticlockwise moment.", "平衡时：总顺时针力矩 = 总逆时针力矩。"),
   ("A lower centre of mass and a wider base make an object more stable.", "质心越低、底面越宽，物体越稳定。"),
   ("An object topples when its centre of mass is outside its base.", "质心的竖直线落到底面外时，物体翻倒。"),
 ]),
 ("第 5 章 力与物质  Forces and Matter", [
   ("Extension = stretched length − original length.", "伸长量 = 拉伸后长度 − 原长。"),
   ("Hooke's law: extension is proportional to load if the limit is not passed.", "胡克定律：未超过比例极限时，伸长量与载荷成正比。"),
   ("Pressure = force ÷ area.", "压强 = 力 ÷ 面积。"),
   ("Pressure in a liquid = depth × density × g.", "液体压强 = 深度 × 密度 × g。"),
   ("A barometer measures air pressure.", "气压计测量大气压强。"),
   ("A manometer shows a pressure difference.", "压力计显示压强差。"),
 ]),
 ("第 6 章 能量  Energy", [
   ("Energy cannot be created or destroyed.", "能量既不能创造，也不能消灭。"),
   ("Kinetic energy = ½ × mass × speed².", "动能 = ½ × 质量 × 速率²。"),
   ("Change in g.p.e. = mass × g × height change.", "重力势能变化 = 质量 × g × 高度变化。"),
   ("Work done = force × distance.", "功 = 力 × 距离。"),
   ("Power = energy ÷ time.", "功率 = 能量 ÷ 时间。"),
   ("Efficiency = useful energy ÷ total energy.", "效率 = 有用能量 ÷ 总能量。"),
   ("Wasted energy spreads out and becomes less useful.", "浪费的能量会扩散出去，变得不那么有用。"),
 ]),
 ("第 7 章 能源资源  Energy Resources", [
   ("Renewable energy is replaced naturally.", "可再生能源会自然补充。"),
   ("Fossil fuels are non-renewable.", "化石燃料不可再生。"),
   ("A generator changes movement into electricity.", "发电机把运动转变成电。"),
 ]),
 ("第 8 章 功与功率  Work and Power", [
   ("Work is done when a force moves an object.", "力使物体移动一段距离时，力做了功。"),
   ("Power is the rate of transferring energy.", "功率是能量转移的快慢。"),
   ("Power = work ÷ time.", "功率 = 功 ÷ 时间。"),
 ]),
 ("第 9 章 物质的粒子模型  Kinetic Model", [
   ("Matter is made of particles.", "物质由粒子组成。"),
   ("In a solid, particles vibrate in fixed positions.", "固体中粒子在固定位置振动。"),
   ("In a gas, particles move fast and are far apart.", "气体中粒子运动快、间距大。"),
   ("Brownian motion shows that particles move randomly.", "布朗运动说明粒子在做无规则运动。"),
   ("Diffusion is particles spreading from high to low concentration.", "扩散是粒子从高浓度向低浓度散开。"),
   ("Gas pressure is caused by particles hitting the walls.", "气体压强是粒子撞击容器壁造成的。"),
   ("Boyle's law: p₁V₁ = p₂V₂ at constant temperature.", "波意耳定律：温度不变时 p₁V₁ = p₂V₂。"),
 ]),
 ("第 10 章 热学性质  Thermal Properties", [
   ("Temperature tells us how hot something is.", "温度表示物体有多热。"),
   ("Internal energy is the total energy of the particles.", "内能是物体内所有粒子的能量总和。"),
   ("Heating increases internal energy.", "加热会使内能增加。"),
   ("Specific heat capacity: E = m × c × ΔT.", "比热容公式：E = m × c × ΔT。"),
   ("Metals expand when heated.", "金属受热会膨胀。"),
 ]),
 ("第 11 章 热传递  Thermal Energy Transfers", [
   ("Conduction: heat moves through a solid.", "传导：热量在固体中传递。"),
   ("Convection: heat moves in liquids and gases by moving fluid.", "对流：热量靠流动的液体或气体传递。"),
   ("Radiation: heat moves as infrared waves and needs no particles.", "辐射：热量以红外波传递，不需要粒子。"),
   ("Black surfaces absorb and emit radiation well.", "黑色表面吸收和放出辐射都很好。"),
   ("Shiny surfaces reflect radiation well.", "光亮表面反射辐射很好。"),
   ("A vacuum flask reduces conduction, convection and radiation.", "保温瓶同时减少传导、对流和辐射。"),
 ]),
 ("答题套话  Useful Exam Phrases", [
   ("Show your working.", "写出计算过程。"),
   ("Give the unit.", "写出单位。"),
   ("Use the formula, substitute, then calculate.", "先写公式，再代入，最后计算。"),
   ("Explain why: say what happens, then say why.", "解释原因：先说现象，再说原因。"),
 ]),
]

def set_ea(run):
    rPr = run._element.get_or_add_rPr()
    rf = rPr.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts')
        rPr.insert(0, rf)
    rf.set(qn('w:eastAsia'), FONT_CJK)

def set_borders(table, color="D0D7E2", sz=4):
    tblPr = table._tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement('w:' + edge)
        e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), str(sz))
        e.set(qn('w:space'), '0'); e.set(qn('w:color'), color)
        borders.append(e)
    tblPr.append(borders)

def set_cell_margins(table, top=25, bottom=25, left=70, right=70):
    tblPr = table._tbl.tblPr
    mar = OxmlElement('w:tblCellMar')
    for side, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        e = OxmlElement('w:' + side)
        e.set(qn('w:w'), str(val)); e.set(qn('w:type'), 'dxa')
        mar.append(e)
    tblPr.append(mar)

def set_widths(table, widths):
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

def cell_text(cell, text, size=8.5, bold=False, color="222222"):
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(1)
    p.paragraph_format.line_spacing = 1.0
    r = p.add_run(text)
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.name = FONT_LATIN
    r.font.color.rgb = RGBColor.from_string(color)
    set_ea(r)

doc = Document(SRC)

def add_h1(text, page_break=True):
    h = doc.add_paragraph(style='Heading 1')
    if page_break:
        h.paragraph_format.page_break_before = True
    h.paragraph_format.space_before = Pt(0)
    h.paragraph_format.space_after = Pt(4)
    h.add_run(text)
    return h

def add_h2(text):
    h = doc.add_paragraph(style='Heading 2')
    h.add_run(text)
    return h

def add_h3(text):
    h = doc.add_paragraph(style='Heading 3')
    h.add_run(text)
    return h

def add_para(text, size=10, bold=False, color="333333", space_after=4):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    r = p.add_run(text)
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.color.rgb = RGBColor.from_string(color)
    set_ea(r)
    return p

add_h1("附录 B · 高频单词表与必背句")
add_para("本附录给两份东西：① 按章节整理的高频单词表（约 150 个），每个词都配中文和最简单的用法；"
         "② 一份“直接背下来”的句子表，用最简单的英语写出定义、定律和答题套话。", size=10)
add_para("用法：先背第一部分的单词（看到英文说中文，看到中文说英文），再背第二部分整句。"
         "句子都很短，读三遍、盖住中文再读一遍即可。", size=10)

add_h2("一、高频单词表（按章节）  Word List by Chapter")
add_para("每行：英文 · 中文 · 最简单的用法（考试里常这样出现）。", size=9, color="666666")

for chapter, rows in WORDS:
    add_h3(chapter)
    table = doc.add_table(rows=len(rows) + 1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_borders(table); set_cell_margins(table); set_widths(table, [4.9, 4.6, 9.2])
    for j, htext in enumerate(["English 英文", "中文", "最简单的用法 Usage"]):
        c = table.rows[0].cells[j]
        shade(c, "E8EEF7")
        cell_text(c, htext, size=8.5, bold=True, color=C_BLUE)
    trPr = table.rows[0]._tr.get_or_add_trPr()
    th = OxmlElement('w:tblHeader'); trPr.append(th)
    for i, (en, zh, use) in enumerate(rows, start=1):
        cell_text(table.rows[i].cells[0], en, size=8.5, bold=True, color=C_DARK)
        cell_text(table.rows[i].cells[1], zh, size=8.5, color="222222")
        cell_text(table.rows[i].cells[2], use, size=8.2, color="555555")
    gap = doc.add_paragraph()
    gap.paragraph_format.space_after = Pt(2)

add_h2("二、必背句（直接背下来）  Sentences to Memorise")
add_para("每句都是最简单的英语，对应中文写在右边。建议先读英文三遍，再看中文检查意思。", size=9, color="666666")

for chapter, rows in SENTS:
    add_h3(chapter)
    table = doc.add_table(rows=len(rows) + 1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_borders(table); set_cell_margins(table); set_widths(table, [9.6, 9.4])
    for j, htext in enumerate(["English sentence 英文（背这句）", "中文意思"]):
        c = table.rows[0].cells[j]
        shade(c, "FFF2CC" if j == 0 else "DEEBF7")
        cell_text(c, htext, size=8.5, bold=True, color=C_BLUE)
    trPr = table.rows[0]._tr.get_or_add_trPr()
    th = OxmlElement('w:tblHeader'); trPr.append(th)
    for i, (en, zh) in enumerate(rows, start=1):
        cell_text(table.rows[i].cells[0], en, size=8.8, bold=False, color="1A1A1A")
        cell_text(table.rows[i].cells[1], zh, size=8.8, color="333333")
    gap = doc.add_paragraph()
    gap.paragraph_format.space_after = Pt(2)

add_para("背完自测：盖住中文，看到英文能说出意思；再盖住英文，看到中文能写出英文句子。"
         "考试前只看“必背句”这一部分即可。", size=9.5, color=C_BLUE)

doc.save(OUT)
print("saved", OUT)
