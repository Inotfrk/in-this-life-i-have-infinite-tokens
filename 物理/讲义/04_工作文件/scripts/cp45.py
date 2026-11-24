
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn

f = r"G:\subject\Phy\讲义\cp4&5 week3.docx"
d = Document(f)
body = d.element.body
i = 0
for child in body.iterchildren():
    tag = child.tag.split('}')[1]
    if tag == 'p':
        p = Paragraph(child, d)
        txt = p.text.strip()
        if not txt: 
            i += 1; continue
        sizes = set()
        bolds = set()
        colors = set()
        for r in p.runs[:6]:
            if r.font.size: sizes.add(round(r.font.size.pt,1))
            bolds.add(bool(r.bold))
            if r.font.color and r.font.color.rgb: colors.add(str(r.font.color.rgb))
        shd = child.find(qn('w:pPr') + '/' + qn('w:shd'))
        print(f"[{i}] {p.style.name} sz={sorted(sizes)} b={sorted(bolds)} col={sorted(colors)} shd={'Y' if shd is not None else '-'} :: {txt[:80]}")
    elif tag == 'tbl':
        tb = Table(child, d)
        txt = tb.rows[0].cells[0].text.strip()[:50]
        print(f"[{i}] TABLE {len(tb.rows)}x{len(tb.columns)} :: {txt}")
    i += 1
    if i > 120: break
