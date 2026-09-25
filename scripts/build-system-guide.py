"""Build the Thai operating guide DOCX from its reviewed Markdown source."""
from pathlib import Path
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

root = Path(__file__).resolve().parents[1]
source = root / 'docs' / 'SYSTEM_GUIDE_TH.md'
output = root / 'docs' / 'PDH_SMART_EMS_คู่มือการทำงาน.docx'
doc = Document()
section = doc.sections[0]
section.page_width, section.page_height = Inches(8.27), Inches(11.69)
section.top_margin = section.bottom_margin = Inches(0.7)
section.left_margin = section.right_margin = Inches(0.7)
for name in ['Normal', 'Title', 'Heading 1', 'Heading 2', 'Heading 3', 'List Bullet', 'List Number']:
    style = doc.styles[name]
    style.font.name = 'Tahoma'
    style.font.size = Pt(11 if name in ['Normal','List Bullet','List Number'] else 15)
    style.element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), 'Tahoma')
    style.paragraph_format.space_after = Pt(7)
    if name.startswith('Heading'):
        style.font.color.rgb = RGBColor.from_string('155E75')
        style.paragraph_format.keep_with_next = True
        style.paragraph_format.space_before = Pt(14)
doc.styles['Normal'].paragraph_format.line_spacing = 1.2
doc.styles['Title'].font.size = Pt(23)
header = section.header.paragraphs[0]
header.text = 'PDH SMART EMS | คู่มือการทำงานของระบบ | AUTH-1'
header.runs[0].font.size = Pt(9)
footer = section.footer.paragraphs[0]
footer.alignment = 2
footer.add_run('ฉบับ 1.0 • 25 กันยายน 2569 | หน้า ')
field = OxmlElement('w:fldSimple'); field.set(qn('w:instr'), 'PAGE'); footer._p.append(field)
for run in footer.runs: run.font.size = Pt(9)

def text_runs(paragraph, text):
    for idx, part in enumerate(re.split(r'(`[^`]+`|\*\*[^*]+\*\*)', text)):
        run=paragraph.add_run(part.strip('`') if part.startswith('`') else part.strip('*') if part.startswith('**') else part)
        if part.startswith('**'): run.bold=True
        if part.startswith('`'): run.font.name='Consolas'; run.font.size=Pt(9)

lines=source.read_text(encoding='utf-8-sig').splitlines()
i=0
while i<len(lines):
    line=lines[i]
    if not line.strip(): i+=1; continue
    if line.startswith('```'):
        code=[]; i+=1
        while i<len(lines) and not lines[i].startswith('```'):
            code.append(lines[i]); i+=1
        p=doc.add_paragraph()
        r=p.add_run('\n'.join(code)); r.font.name='Consolas'; r.font.size=Pt(9)
        p.paragraph_format.space_before=Pt(6)
    elif line.startswith('|'):
        rows=[]
        while i<len(lines) and lines[i].startswith('|'):
            cells=[c.strip() for c in lines[i].strip().strip('|').split('|')]
            if not all(re.fullmatch(r':?-+:?',c.replace(' ','')) for c in cells): rows.append(cells)
            i+=1
        table=doc.add_table(rows=0, cols=len(rows[0])); table.style='Table Grid'
        for index, row in enumerate(rows):
            cells=table.add_row().cells
            for cell, text in zip(cells,row):
                text_runs(cell.paragraphs[0],text)
                for run in cell.paragraphs[0].runs: run.font.size=Pt(9)
                cell.paragraphs[0].paragraph_format.space_after=Pt(4)
                if index==0:
                    for run in cell.paragraphs[0].runs: run.bold=True
                    shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'E0F2FE');cell._tc.get_or_add_tcPr().append(shade)
            props=table.rows[-1]._tr.get_or_add_trPr()
            props.append(OxmlElement('w:cantSplit'))
            if index==0: props.append(OxmlElement('w:tblHeader'))
        doc.add_paragraph()
        continue
    elif line.startswith('# '):
        doc.add_paragraph(line[2:], 'Title')
    elif line.startswith('### '): doc.add_heading(line[4:],level=2)
    elif line.startswith('## '): doc.add_heading(line[3:],level=1)
    elif line.startswith('- '): text_runs(doc.add_paragraph(style='List Bullet'),line[2:])
    else:
        # Preserve explicit step numbers, restarting correctly in each workflow.
        text_runs(doc.add_paragraph(),line)
    i+=1

doc.core_properties.title='คู่มือการทำงานของระบบ PDH Smart EMS Command & Refer'
doc.core_properties.subject='การใช้งาน การติดตั้ง การดูแล และขอบเขตระบบหลัง AUTH-1'
doc.core_properties.author='PDH Smart EMS'
doc.core_properties.version='1.0'
doc.save(output)
check=Document(output)
assert len(check.tables)==9, f'Unexpected table count: {len(check.tables)}'
assert any('13. ภาคผนวก' in p.text for p in check.paragraphs)
assert any('gps_tracks' in cell.text for t in check.tables for row in t.rows for cell in row.cells)
print(f'Created {output.name}: {len(check.paragraphs)} paragraphs, {len(check.tables)} tables, {output.stat().st_size:,} bytes')

