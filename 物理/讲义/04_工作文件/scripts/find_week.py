
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
d = Document(r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Ch2-11.docx")
needle = "This week"
hits = []
for i, p in enumerate(d.paragraphs):
    if needle in p.text:
        hits.append(("body", i, p.text[:60]))
for ti, t in enumerate(d.tables):
    for ri, row in enumerate(t.rows):
        for ci, cell in enumerate(row.cells):
            for p in cell.paragraphs:
                if needle in p.text:
                    hits.append(("table %d r%d c%d" % (ti, ri, ci), 0, p.text[:60]))
print("hits", len(hits))
for h in hits[:10]:
    print(h)
