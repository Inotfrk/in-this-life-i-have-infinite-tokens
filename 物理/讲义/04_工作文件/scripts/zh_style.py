
import sys, re
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
d = Document(r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Ch2-11.docx")
cjk = re.compile(r"[\u4e00-\u9fff]")
targets = ["质量固定，温度不变时", "粒子运动模型与物质三态", "物质由不断运动的粒子组成"]
for p in d.paragraphs:
    t = p.text.strip()
    if any(x in t for x in targets):
        print("PARA", p.style.name, "|", t[:50])
        for r in p.runs[:3]:
            sz = r.font.size.pt if r.font.size else None
            col = str(r.font.color.rgb) if (r.font.color is not None and r.font.color.rgb) else None
            print("   run size", sz, "color", col, "bold", r.bold, "font", r.font.name, "|", r.text[:30])
        pf = p.paragraph_format
        print("   indent", pf.left_indent, "before", pf.space_before, "after", pf.space_after)
