
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn

files = [
    r"G:\subject\Phy\讲义\cp2 week1.docx",
    r"G:\subject\Phy\讲义\cp3week2.docx",
    r"G:\subject\Phy\讲义\cp4&5 week3.docx",
    r"G:\subject\Phy\讲义\cp6.docx",
    r"G:\subject\Phy\讲义\Chapter9_Kinetic_Model_Bilingual_Handout (2).docx",
    r"G:\subject\Phy\讲义\Y10_Ch10_Ch11_Bilingual_Handout (1).docx",
]

for f in files:
    d = Document(f)
    print("="*110)
    print(f)
    body = d.element.body
    idx = 0
    shown = 0
    maxw = 0
    for t in d.tables:
        try:
            w = sum(int(g.get(qn('w:w'))) for g in t._tbl.tblGrid.findall(qn('w:gridCol')))
            maxw = max(maxw, w)
        except Exception:
            pass
    print("  max table grid width (twips):", maxw, "=", round(maxw/567,2), "cm")
    for child in body.iterchildren():
        tag = child.tag.split('}')[1]
        if tag == 'p':
            p = Paragraph(child, d)
            nimg = len(child.findall('.//' + qn('a:blip')))
            numpr = child.find(qn('w:pPr') + '/' + qn('w:numPr')) is not None
            txt = p.text.strip()
            if txt or nimg:
                print(f"  [{idx}] P style={p.style.name!r} img={nimg} num={numpr} :: {txt[:90]}")
                shown += 1
        elif tag == 'tbl':
            tb = Table(child, d)
            print(f"  [{idx}] TABLE rows={len(tb.rows)} cols={len(tb.columns)} first={tb.rows[0].cells[0].text.strip()[:40]!r}")
            shown += 1
        idx += 1
        if shown > 28:
            print("  ...")
            break
