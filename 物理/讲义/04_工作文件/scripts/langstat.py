
import sys, re
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

d = Document(r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Ch2-11.docx")
body = d.element.body
chapters = []
cur = {"name": "front", "words": 0, "cjk": 0, "paras": 0, "tbl_cells": 0}
def addtext(t):
    cur["words"] += len(re.findall(r"[A-Za-z][A-Za-z'\-]+", t))
    cur["cjk"] += len(re.findall(r"[\u4e00-\u9fff]", t))

for child in body.iterchildren():
    tag = child.tag.split('}')[1]
    if tag == 'p':
        p = Paragraph(child, d)
        t = p.text.strip()
        if p.style.name == "Heading 1":
            chapters.append(cur)
            cur = {"name": t[:28], "words": 0, "cjk": 0, "paras": 0, "tbl_cells": 0}
            continue
        if t:
            cur["paras"] += 1
            addtext(t)
    elif tag == 'tbl':
        tb = Table(child, d)
        for row in tb.rows:
            for cell in row.cells:
                txt = cell.text
                cur["tbl_cells"] += 1
                addtext(txt)
chapters.append(cur)

for c in chapters:
    print(f'{c["name"]:<30} paras={c["paras"]:>5} words={c["words"]:>7} cjk={c["cjk"]:>7} ratio={c["cjk"]/max(1,c["words"]):.2f}')
