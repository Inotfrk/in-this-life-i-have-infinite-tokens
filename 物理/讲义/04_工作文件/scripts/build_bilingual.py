
import sys, re, json, copy
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.table import Table
from docx.text.paragraph import Paragraph

SRC = r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Ch2-11.docx"
OUT = r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Bilingual.docx"
units_json = json.load(open(r"D:\临时\phy_handouts\units_en.json", encoding="utf-8"))
uniq = json.load(open(r"D:\临时\phy_handouts\uniq_units.json", encoding="utf-8"))
zh = json.load(open(r"D:\临时\phy_handouts\zh_all.json", encoding="utf-8"))
tmap = {o["text"]: zh.get(o["uid"], "") for o in uniq}

d = Document(SRC)
body = d.element.body
CJK = re.compile(r"[\u4e00-\u9fff]")
WORD = re.compile(r"[A-Za-z][A-Za-z'\-]+")

def has_en(t):
    return len(WORD.findall(t)) >= 1

pairs = []  # (paragraph_element, unit_dict_or_None, text)
inside = False
for child in list(body.iterchildren()):
    tag = child.tag.split('}')[1]
    if tag == 'p':
        p = Paragraph(child, d)
        if p.style.name == "Heading 1":
            inside = p.text.strip().startswith("第")
            continue
        if inside and p.text.strip():
            pairs.append((child, p, "body"))
    elif tag == 'tbl' and inside:
        tb = Table(child, d)
        for row in tb.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    if p.text.strip():
                        pairs.append((p._p, p, "table"))

# select english-only paragraphs matching original extraction
targets = []
for el, p, where in pairs:
    t = p.text.strip()
    if not t or not has_en(t):
        continue
    cjk = len(CJK.findall(t))
    en = len(WORD.findall(t))
    if cjk >= max(2, en // 3):
        continue
    targets.append((el, p, where, t))

print("targets", len(targets), "expected", len(units_json))
# verify alignment
mismatch = 0
for i, (el, p, where, t) in enumerate(targets):
    if i < len(units_json) and units_json[i]["text"] != t:
        mismatch += 1
        if mismatch <= 3:
            print("MISMATCH", i, repr(t[:60]), "!=", repr(units_json[i]["text"][:60]))
print("mismatches", mismatch)

def zh_size(p):
    sizes = []
    for r in p.runs:
        if r.font.size:
            sizes.append(r.font.size.pt)
    return (max(sizes) if sizes else 9.5)

def make_zh_para(src_el, text, size_pt):
    new_p = OxmlElement('w:p')
    pPr = src_el.find(qn('w:pPr'))
    if pPr is not None:
        pPr = copy.deepcopy(pPr)
        for tag in ('w:keepNext', 'w:numPr', 'w:sectPr', 'w:pStyle'):
            for e in pPr.findall(qn(tag)):
                pPr.remove(e)
        for e in pPr.findall(qn('w:spacing')):
            pPr.remove(e)
        sp = OxmlElement('w:spacing')
        sp.set(qn('w:before'), '10')
        sp.set(qn('w:after'), '55')
        sp.set(qn('w:line'), '240')
        sp.set(qn('w:lineRule'), 'auto')
        pPr.append(sp)
        new_p.append(pPr)
    r = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    rf = OxmlElement('w:rFonts')
    rf.set(qn('w:ascii'), 'Arial'); rf.set(qn('w:hAnsi'), 'Arial'); rf.set(qn('w:eastAsia'), 'Microsoft YaHei')
    rPr.append(rf)
    c = OxmlElement('w:color'); c.set(qn('w:val'), '3F3F3F'); rPr.append(c)
    half = str(max(16, int(round(size_pt * 2 * 0.94))))
    sz = OxmlElement('w:sz'); sz.set(qn('w:val'), half); rPr.append(sz)
    szcs = OxmlElement('w:szCs'); szcs.set(qn('w:val'), half); rPr.append(szcs)
    r.append(rPr)
    t = OxmlElement('w:t'); t.set(qn('xml:space'), 'preserve'); t.text = text
    r.append(t)
    new_p.append(r)
    return new_p

added_para = 0
added_head = 0
skipped = 0
for el, p, where, t in targets:
    tr = tmap.get(t, "")
    if not tr:
        skipped += 1
        continue
    style = p.style.name
    if style.startswith("Heading"):
        run = OxmlElement('w:r')
        rPr = OxmlElement('w:rPr')
        rf = OxmlElement('w:rFonts')
        rf.set(qn('w:ascii'), 'Arial'); rf.set(qn('w:hAnsi'), 'Arial'); rf.set(qn('w:eastAsia'), 'Microsoft YaHei')
        rPr.append(rf)
        try:
            hsize = d.styles[style].font.size.pt
        except Exception:
            hsize = 12
        half = str(max(18, int(round(hsize * 2 * 0.78))))
        sz = OxmlElement('w:sz'); sz.set(qn('w:val'), half); rPr.append(sz)
        szcs = OxmlElement('w:szCs'); szcs.set(qn('w:val'), half); rPr.append(szcs)
        run.append(rPr)
        rt = OxmlElement('w:t'); rt.set(qn('xml:space'), 'preserve'); rt.text = "　" + tr
        run.append(rt)
        el.append(run)
        added_head += 1
        continue
    size = zh_size(p)
    new_p = make_zh_para(el, tr, size)
    el.addnext(new_p)
    added_para += 1

print("added paragraphs", added_para, "headings", added_head, "skipped", skipped)
d.save(OUT)
print("saved", OUT)
