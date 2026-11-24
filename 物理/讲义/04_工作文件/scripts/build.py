# -*- coding: utf-8 -*-
"""Build the merged IGCSE Physics handout workbook (Ch2-Ch11)."""
import sys, os, io, copy, json, datetime
sys.stdout.reconfigure(encoding="utf-8")

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml.ns import qn, nsdecls
from docx.oxml import OxmlElement, parse_xml
from docx.opc.constants import RELATIONSHIP_TYPE as RT

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
WORK = r"D:\临时\phy_handouts"
OUT = os.path.join(WORK, "out")
os.makedirs(OUT, exist_ok=True)

FONT_LATIN = "Arial"
FONT_CJK = "Microsoft YaHei"
C_DARK = "17365D"
C_BLUE = "1F4E79"
C_MID = "2E74B5"
C_GREY = "595959"
C_LIGHTGREY = "808080"

CONTENT_W_CM = 18.99
TAB_TWIPS = int(CONTENT_W_CM * 567)

def el(tag, **attrs):
    e = OxmlElement(tag)
    for k, v in attrs.items():
        e.set(qn(k), str(v))
    return e

def shade(cell, hex_fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    tcPr.append(shd)

def table_borders(table, color="D9D9D9", sz=4, inside=True):
    tbl = table._tbl
    tblPr = tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    edges = ["top", "left", "bottom", "right"] + (["insideH", "insideV"] if inside else [])
    for edge in edges:
        e = OxmlElement("w:" + edge)
        e.set(qn("w:val"), "single")
        e.set(qn("w:sz"), str(sz))
        e.set(qn("w:space"), "0")
        e.set(qn("w:color"), color)
        borders.append(e)
    tblPr.append(borders)

def no_borders(table):
    tbl = table._tbl
    borders = OxmlElement("w:tblBorders")
    for edge in ["top", "left", "bottom", "right", "insideH", "insideV"]:
        e = OxmlElement("w:" + edge)
        e.set(qn("w:val"), "nil")
        borders.append(e)
    tbl.tblPr.append(borders)

def para_border_bottom(p, color=C_BLUE, sz=8, space=4):
    pPr = p._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(sz))
    bottom.set(qn("w:space"), str(space))
    bottom.set(qn("w:color"), color)
    pbdr.append(bottom)
    pPr.append(pbdr)

def style_font(style, size=None, bold=None, color=None, latin=FONT_LATIN, cjk=FONT_CJK):
    f = style.font
    if size is not None:
        f.size = Pt(size)
    if bold is not None:
        f.bold = bold
    if color is not None:
        f.color.rgb = RGBColor.from_string(color)
    if latin:
        f.name = latin
    rPr = style.element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:ascii"), latin)
    rFonts.set(qn("w:hAnsi"), latin)
    rFonts.set(qn("w:eastAsia"), cjk)
    rFonts.set(qn("w:cs"), latin)

def add_custom_style(doc, style_id, name, base="Normal", size=11, bold=False, italic=False,
                     color=None, before=0, after=0, left=0, outline=None, keep_next=True,
                     line=260):
    parts = ['<w:style %s w:type="paragraph" w:styleId="%s">' % (nsdecls("w"), style_id)]
    parts.append('<w:name w:val="%s"/>' % name)
    parts.append('<w:basedOn w:val="%s"/>' % base)
    parts.append('<w:next w:val="Normal"/>')
    parts.append('<w:uiPriority w:val="9"/>')
    parts.append('<w:qFormat/>')
    parts.append("<w:pPr>")
    parts.append('<w:keepNext w:val="%s"/>' % ("1" if keep_next else "0"))
    parts.append('<w:spacing w:before="%d" w:after="%d" w:line="%d" w:lineRule="auto"/>' % (before, after, line))
    if left:
        parts.append('<w:ind w:left="%d"/>' % left)
    if outline is not None:
        parts.append('<w:outlineLvl w:val="%d"/>' % outline)
    parts.append("</w:pPr>")
    parts.append("<w:rPr>")
    parts.append('<w:rFonts w:ascii="%s" w:hAnsi="%s" w:eastAsia="%s" w:cs="%s"/>' % (FONT_LATIN, FONT_LATIN, FONT_CJK, FONT_LATIN))
    parts.append('<w:b w:val="%s"/>' % ("1" if bold else "0"))
    parts.append('<w:i w:val="%s"/>' % ("1" if italic else "0"))
    if color:
        parts.append('<w:color w:val="%s"/>' % color)
    parts.append('<w:sz w:val="%d"/>' % int(size * 2))
    parts.append('<w:szCs w:val="%d"/>' % int(size * 2))
    parts.append("</w:rPr>")
    parts.append("</w:style>")
    doc.styles.element.append(parse_xml("".join(parts)))

def setup_styles(doc):
    # doc defaults
    styles_el = doc.styles.element
    dd = styles_el.find(qn("w:docDefaults"))
    if dd is not None:
        rPrDefault = dd.find(qn("w:rPrDefault"))
        if rPrDefault is None:
            rPrDefault = OxmlElement("w:rPrDefault")
            dd.append(rPrDefault)
        rPr = rPrDefault.find(qn("w:rPr"))
        if rPr is None:
            rPr = OxmlElement("w:rPr")
            rPrDefault.append(rPr)
        rf = rPr.find(qn("w:rFonts"))
        if rf is None:
            rf = OxmlElement("w:rFonts")
            rPr.insert(0, rf)
        rf.set(qn("w:ascii"), FONT_LATIN)
        rf.set(qn("w:hAnsi"), FONT_LATIN)
        rf.set(qn("w:eastAsia"), FONT_CJK)
        rf.set(qn("w:cs"), FONT_LATIN)

    normal = doc.styles["Normal"]
    style_font(normal, size=11, color="1A1A1A")

    specs = {
        "Heading 1": dict(size=20, bold=True, color=C_DARK, before=0, after=10),
        "Heading 2": dict(size=14, bold=True, color=C_BLUE, before=14, after=6),
        "Heading 3": dict(size=11.5, bold=True, color=C_MID, before=10, after=4),
        "Heading 4": dict(size=10.5, bold=True, color=C_GREY, before=8, after=3),
        "Title": dict(size=26, bold=True, color=C_DARK, before=0, after=8),
        "List Bullet": dict(size=11),
    }
    for name, sp in specs.items():
        try:
            st = doc.styles[name]
        except KeyError:
            continue
        style_font(st, size=sp.get("size"), bold=sp.get("bold"), color=sp.get("color"))
        pf = st.paragraph_format
        if sp.get("before") is not None:
            pf.space_before = Pt(sp["before"])
        if sp.get("after") is not None:
            pf.space_after = Pt(sp["after"])
        if name.startswith("Heading"):
            pf.keep_with_next = True

    for fname in ("Footer", "Header"):
        try:
            fst = doc.styles[fname]
        except KeyError:
            continue
        try:
            fst.paragraph_format.tab_stops.clear_all()
        except Exception:
            pass

    add_custom_style(doc, "ChapterMeta", "Chapter Meta", size=8.5, italic=True, color=C_LIGHTGREY, after=10)
    add_custom_style(doc, "CoverEyebrow", "Cover Eyebrow", size=9.5, bold=True, color=C_LIGHTGREY, after=2)
    add_custom_style(doc, "CoverTitle", "Cover Title", size=34, bold=True, color=C_DARK, after=2, line=240)
    add_custom_style(doc, "CoverSub", "Cover Subtitle", size=17, bold=False, color=C_BLUE, after=2, line=240)
    add_custom_style(doc, "CoverKicker", "Cover Kicker", size=11, color=C_GREY, after=0)
    add_custom_style(doc, "CoverSmall", "Cover Small", size=9, color=C_GREY, after=0)
    add_custom_style(doc, "PartNo", "Part Number", size=9.5, bold=True, color=C_MID, after=0)
    add_custom_style(doc, "TOC1", "toc 1", size=11, bold=True, color=C_DARK, before=7, after=1, line=240)
    add_custom_style(doc, "TOC2", "toc 2", size=10, color="262626", before=0, after=0, left=340, line=240)

def setup_page(doc):
    sec = doc.sections[0]
    sec.page_width = Cm(21.59)
    sec.page_height = Cm(27.94)
    sec.left_margin = Cm(1.3)
    sec.right_margin = Cm(1.3)
    sec.top_margin = Cm(1.45)
    sec.bottom_margin = Cm(1.35)
    sec.header_distance = Cm(0.7)
    sec.footer_distance = Cm(0.65)
    sec.different_first_page_header_footer = True
    return sec

def add_footer(sec, title):
    footer = sec.footer
    footer.is_linked_to_previous = False
    p = footer.paragraphs[0]
    p.text = ""
    pf = p.paragraph_format
    pf.tab_stops.clear_all()
    pf.tab_stops.add_tab_stop(Cm(CONTENT_W_CM - 0.15), WD_TAB_ALIGNMENT.RIGHT)
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    r = p.add_run(title)
    r.font.size = Pt(8)
    r.font.color.rgb = RGBColor.from_string("8C8C8C")
    r.font.name = FONT_LATIN
    r._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), FONT_CJK)
    p.add_run("\t")
    r1 = p.add_run("第 ")
    r1.font.size = Pt(8); r1.font.color.rgb = RGBColor.from_string("8C8C8C")
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), " PAGE ")
    inner = OxmlElement("w:r")
    t = OxmlElement("w:t"); t.text = "1"
    inner.append(t)
    fld.append(inner)
    p._p.append(fld)
    r2 = p.add_run(" 页 / 共 ")
    r2.font.size = Pt(8); r2.font.color.rgb = RGBColor.from_string("8C8C8C")
    fld2 = OxmlElement("w:fldSimple")
    fld2.set(qn("w:instr"), " NUMPAGES ")
    inner2 = OxmlElement("w:r")
    t2 = OxmlElement("w:t"); t2.text = "1"
    inner2.append(t2)
    fld2.append(inner2)
    p._p.append(fld2)
    r3 = p.add_run(" 页")
    r3.font.size = Pt(8); r3.font.color.rgb = RGBColor.from_string("8C8C8C")
    para_border_bottom(p, color="D9D9D9", sz=4, space=2)

def body_append(doc, element):
    body = doc.element.body
    sectPr = body.find(qn("w:sectPr"))
    if sectPr is not None:
        sectPr.addprevious(element)
    else:
        body.append(element)

# ---------------------------------------------------------------- source config
SOURCES = [
    dict(key="ch2", part="第 2 章", zh="运动描述", en="Describing Motion",
         file=r"G:\subject\Phy\讲义\cp2 week1.docx", start=5, mode="style",
         orig="cp2 week1.docx", note="Week 1 Student Handout · 教师答案版"),
    dict(key="ch3", part="第 3 章", zh="力与运动", en="Forces and Motion",
         file=r"G:\subject\Phy\讲义\cp3week2.docx", start=9, mode="style",
         orig="cp3week2.docx", note="Chapter 3 — Forces and Motion · 教师答案版"),
    dict(key="ch45", part="第 4–5 章", zh="力矩 · 力与物质", en="Turning Effects of Forces · Forces and Matter",
         file=r"G:\subject\Phy\讲义\cp4&5 week3.docx", start=8, mode="format",
         orig="cp4&5 week3.docx", note="Chapters 4 & 5 · 逐步解答版"),
    dict(key="ch6", part="第 6 章", zh="能量转化与能量传递", en="Energy Transformations and Energy Transfers",
         file=r"G:\subject\Phy\讲义\cp6.docx", start=7, mode="style",
         orig="cp6.docx", note="Chapter 6 · 教师答案版"),
    dict(key="ch78", part="第 7–8 章", zh="能源资源 · 功与功率", en="Energy Resources · Work and Power",
         file=r"D:\Appofmy\WeXin\xwechat_files\wxid_cypu5zb07seu12_da59\msg\file\2026-11\Y10_Ch7_Ch8_PPT_Only_Handout_Answers (2).docx",
         start=11, mode="style", orig="Y10_Ch7_Ch8_PPT_Only_Handout_Answers (2).docx",
         note="Chapters 7 & 8 · 教师答案版"),
    dict(key="ch9", part="第 9 章", zh="物质的粒子模型", en="The Kinetic Model of Matter",
         file=r"G:\subject\Phy\讲义\Chapter9_Kinetic_Model_Bilingual_Handout (2).docx", start=4, mode="style",
         orig="Chapter9_Kinetic_Model_Bilingual_Handout (2).docx", note="Chapter 9 · 双语要点讲义"),
    dict(key="ch1011", part="第 10–11 章", zh="热学性质 · 热传递", en="Thermal Properties · Thermal Energy Transfers",
         file=r"G:\subject\Phy\讲义\Y10_Ch10_Ch11_Bilingual_Handout (1).docx", start=4, mode="style",
         orig="Y10_Ch10_Ch11_Bilingual_Handout (1).docx", note="Chapters 10 & 11 · 教师答案版"),
]

# ---------------------------------------------------------------- copying
import re

HEADING_MAP = {
    "title": 2,
    "heading 1": 2,
    "heading 2": 3,
    "heading 3": 4,
    "heading 4": 5,
}

def style_id_to_name(doc):
    out = {}
    for st in doc.styles.element.findall(qn("w:style")):
        sid = st.get(qn("w:styleId"))
        nm = st.find(qn("w:name"))
        if sid and nm is not None:
            out[sid] = nm.get(qn("w:val"))
    return out

def text_of(p_el):
    parts = []
    for t in p_el.iter(qn("w:t")):
        parts.append(t.text or "")
    return "".join(parts).strip()

def para_max_size(p_el):
    sizes = []
    for sz in p_el.iter(qn("w:sz")):
        v = sz.get(qn("w:val"))
        try:
            sizes.append(int(v) / 2.0)
        except Exception:
            pass
    return max(sizes) if sizes else 0

def para_all_bold(p_el):
    rs = [r for r in p_el.iter(qn("w:r")) if r.find(qn("w:t")) is not None]
    if not rs:
        return False
    for r in rs:
        rPr = r.find(qn("w:rPr"))
        b = None
        if rPr is not None:
            bEl = rPr.find(qn("w:b"))
            if bEl is not None:
                b = bEl.get(qn("w:val")) not in ("0", "false", "off")
        if not b:
            return False
    return True

def set_para_style(p_el, style_id):
    pPr = p_el.find(qn("w:pPr"))
    if pPr is None:
        pPr = OxmlElement("w:pPr")
        p_el.insert(0, pPr)
    for ps in pPr.findall(qn("w:pStyle")):
        pPr.remove(ps)
    ps = OxmlElement("w:pStyle")
    ps.set(qn("w:val"), style_id)
    pPr.insert(0, ps)
    for tag in ("w:spacing", "w:ind", "w:jc", "w:outlineLvl", "w:contextualSpacing"):
        for e in pPr.findall(qn(tag)):
            pPr.remove(e)

def strip_runs(p_el):
    for r in p_el.findall(qn("w:r")):
        rPr = r.find(qn("w:rPr"))
        if rPr is not None:
            r.remove(rPr)

def add_bookmark(p_el, name, bid):
    pPr = p_el.find(qn("w:pPr"))
    start = OxmlElement("w:bookmarkStart")
    start.set(qn("w:id"), str(bid))
    start.set(qn("w:name"), name)
    end = OxmlElement("w:bookmarkEnd")
    end.set(qn("w:id"), str(bid))
    if pPr is not None:
        pPr.addnext(start)
    else:
        p_el.insert(0, start)
    p_el.append(end)

def remap_rels(new_el, src_part, dst_part):
    for blip in list(new_el.iter(qn("a:blip"))):
        rid = blip.get(qn("r:embed"))
        if rid and rid in src_part.rels:
            rel = src_part.rels[rid]
            if getattr(rel, "is_external", False):
                continue
            try:
                blob = rel.target_part.blob
                nrid, _ = dst_part.get_or_add_image(io.BytesIO(blob))
                blip.set(qn("r:embed"), nrid)
            except Exception as exc:
                print("  ! image remap failed:", exc)
    for imd in list(new_el.iter("{urn:schemas-microsoft-com:vml}imagedata")):
        rid = imd.get(qn("r:id"))
        if rid and rid in src_part.rels:
            rel = src_part.rels[rid]
            try:
                blob = rel.target_part.blob
                nrid, _ = dst_part.get_or_add_image(io.BytesIO(blob))
                imd.set(qn("r:id"), nrid)
            except Exception as exc:
                print("  ! vml image remap failed:", exc)
    for hl in list(new_el.iter(qn("w:hyperlink"))):
        rid = hl.get(qn("r:id"))
        if rid and rid in src_part.rels and getattr(src_part.rels[rid], "is_external", False):
            hl.set(qn("r:id"), dst_part.relate_to(src_part.rels[rid].target_ref, RT.HYPERLINK, is_external=True))

def cleanup_block(new_el):
    for tag in ("w:sectPr", "w:lastRenderedPageBreak", "w:proofErr", "w:bookmarkStart", "w:bookmarkEnd"):
        for e in list(new_el.iter(qn(tag))):
            parent = e.getparent()
            if parent is not None:
                parent.remove(e)
    # drop hard page breaks from the source layout: the workbook flows continuously
    for br in list(new_el.iter(qn("w:br"))):
        if br.get(qn("w:type")) == "page":
            parent = br.getparent()
            if parent is not None:
                parent.remove(br)
    for pbb in list(new_el.iter(qn("w:pageBreakBefore"))):
        parent = pbb.getparent()
        if parent is not None:
            parent.remove(pbb)

def promote(doc, cfg, p_el, level, entries, counter):
    set_para_style(p_el, "Heading%d" % level)
    strip_runs(p_el)
    txt = text_of(p_el)
    if not txt:
        return
    counter[0] += 1
    name = "_Toc%05d" % (10000 + counter[0])
    add_bookmark(p_el, name, 5000 + counter[0])
    entries.append({"level": level, "text": txt, "anchor": name})

def map_paragraph(doc, cfg, p_el, names, entries, counter):
    pPr = p_el.find(qn("w:pPr"))
    sid = None
    if pPr is not None:
        ps = pPr.find(qn("w:pStyle"))
        if ps is not None:
            sid = ps.get(qn("w:val"))
    sname_raw = names.get(sid, "Normal")
    sname = (sname_raw or "").strip().lower()
    txt = text_of(p_el)
    level = None
    if sname in HEADING_MAP and txt:
        level = HEADING_MAP[sname]
    elif cfg["mode"] == "format" and sname in ("normal", "") and txt:
        size = para_max_size(p_el)
        bold = para_all_bold(p_el)
        if re.match(r"^LESSON\s*\d+", txt, re.I):
            level = None
        elif bold and size >= 19:
            level = 2
        elif bold and 15 <= size <= 17.5:
            level = 2
        elif bold and 12 <= size <= 13.5:
            level = 3
    if level:
        promote(doc, cfg, p_el, level, entries, counter)

def copy_source(doc, cfg, content, entries, counter):
    doc_src = Document(cfg["file"])
    src_part = doc_src.part
    names = style_id_to_name(doc_src)
    blocks = [c for c in doc_src.element.body.iterchildren() if c.tag != qn("w:sectPr")]
    picked = blocks[cfg["start"]:]
    n_head = 0
    for child in picked:
        new = copy.deepcopy(child)
        cleanup_block(new)
        if new.tag == qn("w:p"):
            before = len(entries)
            map_paragraph(doc, cfg, new, names, entries, counter)
            if len(entries) > before:
                n_head += 1
        remap_rels(new, src_part, doc.part)
        content.append(new)
    print("  %-6s blocks=%3d headings=%3d tables=%3d" % (cfg["key"], len(picked), n_head,
          sum(1 for c in picked if c.tag == qn("w:tbl"))))

def make_part_header(doc, cfg, content, entries, counter):
    p = doc.add_paragraph(style="Heading 1")
    p.paragraph_format.page_break_before = True
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(cfg["part"] + " · " + cfg["zh"])
    r2 = p.add_run("   " + cfg["en"])
    r2.font.size = Pt(13)
    r2.font.bold = False
    r2.font.color.rgb = RGBColor.from_string(C_MID)
    heading_text = cfg["part"] + " · " + cfg["zh"] + "   " + cfg["en"]
    counter[0] += 1
    bname = "_Toc%05d" % (10000 + counter[0])
    add_bookmark(p._p, bname, 5000 + counter[0])
    entries.append({"level": 1, "text": heading_text, "anchor": bname})
    content.append(p._p)

    m = doc.add_paragraph(style="ChapterMeta")
    m.add_run("原讲义：" + cfg["orig"] + "　｜　" + cfg["note"])
    content.append(m._p)

    rule = doc.add_paragraph()
    rule.paragraph_format.space_before = Pt(0)
    rule.paragraph_format.space_after = Pt(10)
    para_border_bottom(rule, color="D9D9D9", sz=6, space=1)
    content.append(rule._p)

# ---------------------------------------------------------------- cover / toc / appendix
def make_para(doc, style=None, page_break=False):
    p = doc.add_paragraph(style=style) if style else doc.add_paragraph()
    if page_break:
        p.paragraph_format.page_break_before = True
    p._p.getparent().remove(p._p)
    return p

def set_cell_text(cell, text, size=9.5, bold=False, color="1A1A1A", align=None):
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(3)
    if align is not None:
        p.alignment = align
    r = p.add_run(text)
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.name = FONT_LATIN
    r.font.color.rgb = RGBColor.from_string(color)
    r._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), FONT_CJK)

def tune_table(table, widths_cm):
    table.autofit = False
    tbl = table._tbl
    tblPr = tbl.tblPr
    layout = OxmlElement("w:tblLayout")
    layout.set(qn("w:type"), "fixed")
    tblPr.append(layout)
    for i, w in enumerate(widths_cm):
        table.columns[i].width = Cm(w)
    for row in table.rows:
        for i, w in enumerate(widths_cm):
            row.cells[i].width = Cm(w)

def build_cover(doc):
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(46)
    sp.paragraph_format.space_after = Pt(0)

    p = doc.add_paragraph(style="Cover Eyebrow")
    p.add_run("CAMBRIDGE IGCSE PHYSICS 0625      ·      YEAR 10      ·      AIDI PHYSICS")
    para_border_bottom(p, color=C_MID, sz=12, space=10)

    t = doc.add_paragraph(style="Cover Title")
    t.paragraph_format.space_before = Pt(34)
    t.add_run("IGCSE 物理讲义合集")

    s = doc.add_paragraph(style="Cover Subtitle")
    s.add_run("Year 10 Physics Handouts  ·  Chapters 2–11")

    k = doc.add_paragraph(style="Cover Kicker")
    k.add_run("中英双语  ·  教师答案版  ·  词汇 / 公式 / 例题 / 逐步解答")
    k.paragraph_format.space_after = Pt(34)

    rows = [
        ("收录范围", "第 2–11 章，共 7 份讲义，按章节顺序合订为一册"),
        ("版本说明", "Teacher Answer Version：含教师逐步解答、易错点与考试提示"),
        ("资料来源", "Aidi 老师 Year 10 物理课程（Cambridge IGCSE Physics 0625）微信讲义资料包"),
        ("本册整理", "统一页面与页脚、重排章节层级、合并目录 ｜ 2026-11-20"),
    ]
    table = doc.add_table(rows=len(rows), cols=2)
    table_borders(table, color="DCE3EA", sz=4, inside=True)
    tune_table(table, [3.4, 15.4])
    for i, (label, value) in enumerate(rows):
        c0, c1 = table.rows[i].cells
        shade(c0, "F2F6FA")
        set_cell_text(c0, label, size=9, bold=True, color=C_BLUE)
        set_cell_text(c1, value, size=9.5, color="333333")

    gap = doc.add_paragraph()
    gap.paragraph_format.space_after = Pt(16)

    legend = doc.add_table(rows=1, cols=2)
    table_borders(legend, color="FFFFFF", sz=2, inside=False)
    tune_table(legend, [9.45, 9.45])
    c0, c1 = legend.rows[0].cells
    shade(c0, "FFF2CC")
    shade(c1, "DEEBF7")
    set_cell_text(c0, "MUST KNOW 必须掌握\n核心定义、公式与结论，考试直接得分", size=8.5, color="7F6000")
    set_cell_text(c1, "COMMON CONFUSION 易错提醒\n常见混淆、单位陷阱与失分点", size=8.5, color="1F4E79")
    for c in (c0, c1):
        for p in c.paragraphs:
            p.paragraph_format.left_indent = Cm(0.15)

    note = doc.add_paragraph(style="Cover Small")
    note.paragraph_format.space_before = Pt(14)
    note.add_run("说明：本册把七份独立讲义按章节顺序合订；每章从新的一页开始，页脚为全册连续页码。")

def toc_entry_p(level, text, anchor, page):
    p = OxmlElement("w:p")
    pPr = OxmlElement("w:pPr")
    ps = OxmlElement("w:pStyle")
    ps.set(qn("w:val"), "TOC%d" % level)
    pPr.append(ps)
    tabs = OxmlElement("w:tabs")
    tb = OxmlElement("w:tab")
    tb.set(qn("w:val"), "right")
    tb.set(qn("w:leader"), "dot")
    tb.set(qn("w:pos"), str(TAB_TWIPS))
    tabs.append(tb)
    pPr.append(tabs)
    p.append(pPr)

    hl = OxmlElement("w:hyperlink")
    hl.set(qn("w:anchor"), anchor)
    hl.set(qn("w:history"), "1")
    r = OxmlElement("w:r")
    t = OxmlElement("w:t")
    t.set(qn("xml:space"), "preserve")
    t.text = text
    r.append(t)
    hl.append(r)
    r2 = OxmlElement("w:r")
    r2.append(OxmlElement("w:tab"))
    hl.append(r2)
    r3 = OxmlElement("w:r")
    t3 = OxmlElement("w:t")
    t3.text = str(page) if page else "—"
    r3.append(t3)
    hl.append(r3)
    p.append(hl)
    return p

def fld_run(kind, instr=None):
    r = OxmlElement("w:r")
    if instr is not None:
        it = OxmlElement("w:instrText")
        it.set(qn("xml:space"), "preserve")
        it.text = instr
        r.append(it)
    else:
        fc = OxmlElement("w:fldChar")
        fc.set(qn("w:fldCharType"), kind)
        if kind == "begin":
            fc.set(qn("w:dirty"), "true")
        r.append(fc)
    return r

def build_toc(doc, entries, pages):
    h = doc.add_paragraph(style="TOC Head")
    h.add_run("目录")
    h2 = doc.add_paragraph(style="TOC Head En")
    h2.add_run("Contents")
    note = doc.add_paragraph(style="CoverSmall")
    note.add_run("页码为全册连续页码；各章均从新的一页开始。在 Word 中可右键目录 →「更新域」重新生成。")
    note.paragraph_format.space_after = Pt(4)
    para_border_bottom(note, color="D9D9D9", sz=6, space=6)

    sel = [e for e in entries if e["level"] <= 2]
    if not sel:
        return
    for i, e in enumerate(sel):
        page = pages.get(e["anchor"])
        p = toc_entry_p(e["level"], e["text"], e["anchor"], page)
        if i == 0:
            base = 1 if p.find(qn("w:pPr")) is not None else 0
            p.insert(base, fld_run("begin"))
            p.insert(base + 1, fld_run("instr", ' TOC \\o "1-2" \\h \\z \\u '))
            p.insert(base + 2, fld_run("separate"))
        if i == len(sel) - 1:
            p.append(fld_run("end"))
        body_append(doc, p)

def build_appendix(doc):
    h = doc.add_paragraph(style="Heading 1")
    h.paragraph_format.page_break_before = True
    h.add_run("附录 · 讲义来源与使用说明")

    intro = doc.add_paragraph()
    intro.paragraph_format.space_after = Pt(8)
    r = intro.add_run("这些讲义从哪里来")
    r.font.bold = True
    r.font.color.rgb = RGBColor.from_string(C_BLUE)
    intro.add_run("：本册收录的 7 份讲义，全部来自 Aidi 老师 Year 10 物理课程（Cambridge IGCSE Physics 0625）"
                  "随堂发放的课件与讲义资料，通过微信接收后保存在本机（部分同时备份在 iCloud 与移动硬盘）。"
                  "讲义正文按老师 PPT 的章节顺序组织，以 python-docx 生成，中英对照、含公式表、PPT 例题与逐步解答，"
                  "因此没有可“下载”的网页出处——它们就是课程资料本身。")

    rows = [
        ("第 2 章", "cp2 week1.docx", "本地已有", "Week 1 Student Handout · 教师答案版"),
        ("第 3 章", "cp3week2.docx", "2026-09", "Chapter 3 — Forces and Motion"),
        ("第 4–5 章", "cp4&5 week3.docx", "2026-09", "Chapters 4 & 5 · 逐步解答"),
        ("第 6 章", "cp6.docx", "2026-10", "Chapter 6 · 教师答案版"),
        ("第 7–8 章", "Y10_Ch7_Ch8_PPT_Only_Handout_Answers (2).docx", "2026-11", "Chapters 7 & 8 · PPT 版答案"),
        ("第 9 章", "Chapter9_Kinetic_Model_Bilingual_Handout (2).docx", "2026-11", "Chapter 9 · 双语要点讲义"),
        ("第 10–11 章", "Y10_Ch10_Ch11_Bilingual_Handout (1).docx", "2026-11", "Chapters 10 & 11 · 教师答案版"),
    ]
    table = doc.add_table(rows=len(rows) + 1, cols=4)
    table_borders(table, color="D9D9D9", sz=4, inside=True)
    tune_table(table, [2.3, 7.6, 2.2, 6.7])
    headers = ["讲次", "本册使用的原文件", "微信收到", "原始说明"]
    for j, htext in enumerate(headers):
        c = table.rows[0].cells[j]
        shade(c, "EDF2F7")
        set_cell_text(c, htext, size=8.5, bold=True, color=C_BLUE)
    for i, row in enumerate(rows, start=1):
        for j, val in enumerate(row):
            set_cell_text(table.rows[i].cells[j], val, size=8.5, color="333333")

    gap = doc.add_paragraph()
    gap.paragraph_format.space_after = Pt(6)

    def bullet(title, text):
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(3)
        r1 = p.add_run(title)
        r1.font.bold = True
        r1.font.color.rgb = RGBColor.from_string(C_BLUE)
        p.add_run(text)

    bullet("章节范围：", "已收到第 2–11 章讲义；第 1 章（测量与单位）与第 12 章起的讲义，本机与微信资料中都没有，"
           "本册不作补写，避免与老师的版本混用。")
    bullet("版本差异：", "微信原件与本地副本内容一致，其中第 3、4–5、6 章的本地副本经过重新保存（体积略大），"
           "本册采用本地最新版本。")
    bullet("同名资料：", "第 7–8 章另有 PDF 版《Y10_Ch7_Ch8_Clean_No_Handwritten_Notes.pdf》，"
           "本册采用同源的 Word 版合订，图片与答案更清晰。")
    bullet("未合入：", "《Y10_Physics_Ch2-11_Bilingual_Exam_Revision_Density_In_Formula_Bank.pdf》（复习册）与"
           "《IGCSE_Physics_Ch2-11_No_Blank_Page.pdf》（60 分钟练习卷）属于复习与测评材料，不是讲义，未合入本册。")

    h2 = doc.add_paragraph(style="Heading 2")
    h2.add_run("本册使用说明")
    for title, text in [
        ("目录：", "目录为 Word 目录域，共两级（章 / 节）。若在 Word 中调整字号或页边距，右键目录 →「更新域」即可重算页码。"),
        ("章节层级：", "每章以标题分页开始；原讲义的章节标题已统一为二级标题，小节为三级标题，浏览窗格可直接跳转。"),
        ("颜色：", "黄色框为 MUST KNOW（必须掌握），蓝色框为 COMMON CONFUSION（易错提醒），绿色字为教师答案。"),
    ]:
        bullet(title, text)

# ---------------------------------------------------------------- post processing
def _fix_rfonts(match):
    tag = match.group(0)
    tag = re.sub(r'\s+w:(asciiTheme|hAnsiTheme|eastAsiaTheme|cstheme)="[^"]*"', "", tag)
    if "w:ascii=" not in tag:
        tag = tag.replace("<w:rFonts", '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei"')
    if "w:eastAsia=" not in tag:
        tag = tag.replace("<w:rFonts", '<w:rFonts w:eastAsia="Microsoft YaHei"')
    return tag

def normalize_fonts(path):
    import zipfile
    tmp = path + ".tmp"
    targets = ("word/document.xml", "word/styles.xml", "word/stylesWithEffects.xml",
               "word/fontTable.xml", "word/footer1.xml")
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename in targets:
                s = data.decode("utf-8")
                s = s.replace("Noto Sans CJK SC", "Microsoft YaHei")
                s = s.replace(chr(34) + "Courier" + chr(34), chr(34) + "Consolas" + chr(34))
                if item.filename.startswith("word/styles"):
                    s = re.sub(r"<w:rFonts[^>]*/>", _fix_rfonts, s)
                if item.filename == "word/document.xml":
                    seq = [0]
                    def _renum(m):
                        seq[0] += 1
                        return re.sub(r'(?<!\w)id="\d+"', 'id="%d"' % seq[0], m.group(0), count=1)
                    s = re.sub(r"<wp:docPr[^>]*/>", _renum, s)
                data = s.encode("utf-8")
            zout.writestr(item, data)
    os.replace(tmp, path)

# ---------------------------------------------------------------- main
def main():
    pagemap = {}
    out_name = "IGCSE_Physics_Y10_Handout_Workbook_Ch2-11.docx"
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1], encoding="utf-8") as f:
            pagemap = json.load(f)
    if len(sys.argv) > 2:
        out_name = sys.argv[2]

    doc = Document()
    setup_styles(doc)
    sec = setup_page(doc)
    add_footer(sec, "IGCSE Physics 0625 · Year 10 讲义合集 · Ch2–11")

    add_custom_style(doc, "TOCHead", "TOC Head", size=24, bold=True, color=C_DARK, after=0, line=240)
    add_custom_style(doc, "TOCHeadEn", "TOC Head En", size=10, bold=False, color=C_LIGHTGREY, after=2, line=240)
    tst = doc.styles.element.findall(qn("w:style"))
    for st in tst:
        if st.get(qn("w:styleId")) == "TOCHead":
            pPr = st.find(qn("w:pPr"))
            pPr.insert(0, OxmlElement("w:pageBreakBefore"))

    content = []
    entries = []
    counter = [0]
    for cfg in SOURCES:
        make_part_header(doc, cfg, content, entries, counter)
        copy_source(doc, cfg, content, entries, counter)

    build_cover(doc)
    build_toc(doc, entries, pagemap)
    for e in content:
        body_append(doc, e)
    build_appendix(doc)

    out_path = os.path.join(OUT, out_name)
    doc.save(out_path)
    normalize_fonts(out_path)
    with open(os.path.join(WORK, "toc_entries.json"), "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)
    print("saved", out_path, "entries", len(entries))

if __name__ == "__main__":
    main()
