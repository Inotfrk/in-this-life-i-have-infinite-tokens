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
    pf.tab_stops.add_tab_stop(Cm(CONTENT_W_CM), WD_TAB_ALIGNMENT.RIGHT)
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
