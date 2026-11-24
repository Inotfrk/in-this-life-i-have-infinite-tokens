
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
d = Document(r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Bilingual_FB.docx")
body = d.element.body
seq = []
for child in body.iterchildren():
    tag = child.tag.split('}')[1]
    if tag == 'tbl':
        cols = len(child.tblGrid.findall(qn('w:gridCol'))) if child.tblGrid is not None else -1
        seq.append(("TBL", "cols=%d rows=%d" % (cols, len(child.findall(qn('w:tr'))))))
    elif tag == 'p':
        seq.append(("P", "".join(x.text or "" for x in child.iter(qn('w:t')))[:24]))
for i, (k, v) in enumerate(seq):
    if k == "P" and "公式总表" in v:
        for j in range(i, i + 8):
            print(j, seq[j])
        break
print("5col tables:", sum(1 for k,v in seq if k=="TBL" and v.startswith("cols=5")))
