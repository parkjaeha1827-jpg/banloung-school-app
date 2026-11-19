# -*- coding: utf-8 -*-
import zipfile
import xml.etree.ElementTree as ET
import json
import re

xlsx_path = r"C:\Users\PC\.gemini\antigravity\brain\467a8683-3327-4f8a-908e-479d37780798\.user_uploaded\media_1794734055978_597fcacf.xlsx"

def parse_workbook(file_path):
    ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(file_path, 'r') as z:
        # 1. Parse shared strings
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            sst_tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in sst_tree.findall('main:si', ns):
                t_elem = si.find('main:t', ns)
                if t_elem is not None and t_elem.text:
                    shared_strings.append(t_elem.text)
                else:
                    # check for formatted text runs
                    parts = []
                    for t in si.findall('.//main:t', ns):
                        if t.text:
                            parts.append(t.text)
                    shared_strings.append("".join(parts))

        # 2. Get sheet list from workbook.xml and workbook.xml.rels
        wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
        rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rel_map = {}
        for r in rels_tree:
            rel_map[r.attrib.get('Id')] = r.attrib.get('Target')

        sheets_info = []
        for s in wb_tree.findall('.//main:sheet', ns):
            name = s.attrib.get('name')
            r_id = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            target = rel_map.get(r_id, '')
            if not target.startswith('xl/'):
                target = 'xl/' + target
            sheets_info.append((name, target))

        # 3. Parse each sheet
        parsed_sheets = {}
        for name, target in sheets_info:
            if target not in z.namelist():
                continue
            sheet_tree = ET.fromstring(z.read(target))
            rows = []
            for row_el in sheet_tree.findall('.//main:row', ns):
                row_idx = int(row_el.attrib.get('r', 0))
                cells = {}
                for c in row_el.findall('main:c', ns):
                    ref = c.attrib.get('r', '')
                    col_letter = re.match(r'([A-Z]+)', ref).group(1)
                    t = c.attrib.get('t', '')
                    v_el = c.find('main:v', ns)
                    val = ""
                    if v_el is not None and v_el.text:
                        raw_v = v_el.text
                        if t == 's':
                            val = shared_strings[int(raw_v)] if int(raw_v) < len(shared_strings) else ""
                        else:
                            val = raw_v
                    elif t == 'inlineStr':
                        is_t = c.find('.//main:t', ns)
                        if is_t is not None and is_t.text:
                            val = is_t.text
                    cells[col_letter] = val
                rows.append((row_idx, cells))
            parsed_sheets[name] = rows

    return parsed_sheets

sheets = parse_workbook(xlsx_path)
print(f"Successfully parsed {len(sheets)} sheets:")
for sname in sheets:
    print(f" - {sname}: {len(sheets[sname])} rows")
