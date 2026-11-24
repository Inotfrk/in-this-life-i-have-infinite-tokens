
import sys
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
d = Document()
p = d.add_paragraph("anchor")
t1 = d.add_table(rows=2, cols=2)
t2 = d.add_table(rows=3, cols=2)
p._p.addprevious(t1._tbl)
p._p.addprevious(t2._tbl)
for child in d.element.body.iterchildren():
    tag = child.tag.split('}')[1]
    print(tag, "".join(x.text or "" for x in child.iter(qn('w:t')))[:20])
