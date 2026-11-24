
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
d = Document(r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Bilingual.docx")
n = 0
for p in d.paragraphs:
    if p.style.name == "Heading 1":
        sid = p._p.find(qn('w:pPr'))
        print("H1", repr(p.text[:40]))
        n += 1
        if n > 3:
            break
