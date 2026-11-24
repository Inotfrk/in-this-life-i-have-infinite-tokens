
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
d = Document(r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Bilingual_FB.docx")
body = d.element.body
tbls = body.findall(qn('w:tbl'))
print("top-level tables", len(tbls))
for i, t in enumerate(tbls):
    cols = len(t.tblGrid.findall(qn('w:gridCol'))) if t.tblGrid is not None else -1
    rows = len(t.findall(qn('w:tr')))
    if cols == 5:
        txt = "".join(x.text or "" for x in t.iter(qn('w:t')))[:40]
        print(" 5-col table idx", i, "rows", rows, txt)
# count nested tables
nested = 0
for t in body.iter(qn('w:tbl')):
    pass
allt = list(body.iter(qn('w:tbl')))
print("all tbl elements (incl nested)", len(allt))
