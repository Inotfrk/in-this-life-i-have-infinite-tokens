
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
d = Document(r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Bilingual.docx")
for ti, t in enumerate(d.tables):
    first = t.rows[0].cells[0].text.strip()
    if first.startswith("English term"):
        print("table", ti, "rows", len(t.rows), "cols", len(t.columns))
        for ri, row in enumerate(t.rows[:4]):
            print("  row", ri, "cells", len(row.cells))
            seen = set()
            for ci, c in enumerate(row.cells):
                if id(c._tc) in seen:
                    print("    c%d (merged)" % ci); continue
                seen.add(id(c._tc))
                print("    c%d: %r" % (ci, [p.text for p in c.paragraphs][:4]))
        break
