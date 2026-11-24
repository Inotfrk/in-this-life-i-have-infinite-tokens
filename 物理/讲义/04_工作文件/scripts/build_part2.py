
# ---------------------------------------------------------------- copying
import re

HEADING_MAP = {
    "Title": 2,
    "Heading 1": 2,
    "Heading 2": 3,
    "Heading 3": 4,
    "Heading 4": 5,
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
    for imd in list(new_el.iter(qn("v:imagedata"))):
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
    sname = names.get(sid, "Normal")
    txt = text_of(p_el)
    level = None
    if sname in HEADING_MAP and txt:
        level = HEADING_MAP[sname]
    elif cfg["mode"] == "format" and sname == "Normal" and txt:
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

def make_part_header(doc, cfg, content):
    p = doc.add_paragraph(style="Heading 1")
    p.paragraph_format.page_break_before = True
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(cfg["part"] + " · " + cfg["zh"])
    r2 = p.add_run("   " + cfg["en"])
    r2.font.size = Pt(13)
    r2.font.bold = False
    r2.font.color.rgb = RGBColor.from_string(C_MID)
    content.append(p._p)

    m = doc.add_paragraph(style="ChapterMeta")
    m.add_run("原讲义：" + cfg["orig"] + "　｜　" + cfg["note"])
    content.append(m._p)

    rule = doc.add_paragraph()
    rule.paragraph_format.space_before = Pt(0)
    rule.paragraph_format.space_after = Pt(10)
    para_border_bottom(rule, color="D9D9D9", sz=6, space=1)
    content.append(rule._p)
