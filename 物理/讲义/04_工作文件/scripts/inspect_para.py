
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
d = Document(r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Ch2-11.docx")
def walk_paras(container, path=""):
    for p in container.paragraphs:
        yield p
    for t in container.tables:
        for row in t.rows:
            for cell in row.cells:
                for p in walk_paras(cell):
                    yield p
hits = 0
for p in walk_paras(d):
    t = p.text.strip()
    if t.startswith("Convection") or t.startswith("Radiation") or t.startswith("Units Table"):
        sizes = set()
        fonts = set()
        for r in p.runs:
            if r.font.size: sizes.add(r.font.size.pt)
            if r.font.name: fonts.add(r.font.name)
        print(repr(t[:50]), "| style:", p.style.name, "| sizes:", sizes, "| fonts:", fonts)
        hits += 1
        if hits > 12:
            break
