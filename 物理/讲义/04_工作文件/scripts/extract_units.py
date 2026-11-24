
import sys, re, json
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

SRC = r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Ch2-11.docx"
d = Document(SRC)
body = d.element.body

CJK = re.compile(r"[\u4e00-\u9fff]")
WORD = re.compile(r"[A-Za-z][A-Za-z'\-]+")

def has_en(t):
    return len(WORD.findall(t)) >= 1

units = []
cur_chapter = None
inside = False
idx = 0

def walk_para(p, chapter, container):
    global idx
    t = p.text.strip()
    if not t:
        return
    if not has_en(t):
        return
    cjk = len(CJK.findall(t))
    en = len(WORD.findall(t))
    if cjk >= max(2, en // 3):
        return  # already bilingual
    idx += 1
    units.append({
        "id": idx,
        "ch": chapter,
        "where": container,
        "style": p.style.name,
        "text": t,
    })

for child in body.iterchildren():
    tag = child.tag.split('}')[1]
    if tag == 'p':
        p = Paragraph(child, d)
        if p.style.name == "Heading 1":
            name = p.text.strip()
            cur_chapter = name[:20]
            inside = name.startswith("第")
            continue
        if inside:
            walk_para(p, cur_chapter, "body")
    elif tag == 'tbl' and inside:
        tb = Table(child, d)
        for row in tb.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    walk_para(p, cur_chapter, "table")

print("units", len(units), "words", sum(len(WORD.findall(u["text"])) for u in units))
from collections import Counter
c = Counter(u["ch"] for u in units)
for k, v in c.items():
    print(f"  {k:<22} {v}")
json.dump(units, open(r"D:\临时\phy_handouts\units_en.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("first 8:")
for u in units[:8]:
    print(" ", u["id"], u["ch"], "|", u["text"][:90])
