# -*- coding: utf-8 -*-
import sys
import os
import json
import random

sys.path.append(r"C:\Users\PC\.gemini\antigravity\scratch\banloung-school-app")
from parse_xlsx import parse_workbook, xlsx_path

sheets = parse_workbook(xlsx_path)

TEACHERS_2025 = {
    "មត្តេយ្យ១": {"teacher": "លី ស្រីនូ", "grade": "ថ្នាក់មត្តេយ្យ", "year": "២០២៥-២០២៦", "lunar": "ថ្ងៃ សៅរ៍ ៣ រោច  ខែ កត្តិក  ឆ្នាំ ម្សាញ់ សប្ដស័ក ព.ស ២៥៦៩", "solar": "បាន្លួង  ថ្ងៃទី  ០៨  ខែ វិច្ឆិកា ឆ្នាំ ២០២៥"},
    "G1": {"teacher": "ផាន ផុស", "grade": "ថ្នាក់ទី១", "year": "២០២៥-២០២៦", "lunar": "ថ្ងៃ សៅរ៍ ៣ រោច  ខែ កត្តិក  ឆ្នាំ ម្សាញ់ សប្ដស័ក ព.ស ២៥៦៩", "solar": "បាន្លួង  ថ្ងៃទី  ០៨  ខែ វិច្ឆិកា ឆ្នាំ ២០២៥"},
    "G2": {"teacher": "លី មករា", "grade": "ថ្នាក់ទី២", "year": "២០២៥-២០២៦", "lunar": "ថ្ងៃ សៅរ៍ ៣ រោច  ខែ កត្តិក  ឆ្នាំ ម្សាញ់ សប្ដស័ក ព.ស ២៥៦៩", "solar": "បាន្លួង  ថ្ងៃទី  ០៨  ខែ វិច្ឆិកា ឆ្នាំ ២០២៥"},
    "G3": {"teacher": "ក្រូយ ចាន់ធារ៉ា", "grade": "ថ្នាក់ទី៣", "year": "២០២៥-២០២៦", "lunar": "ថ្ងៃ សៅរ៍ ៣ រោច  ខែ កត្តិក  ឆ្នាំ ម្សាញ់ សប្ដស័ក ព.ស ២៥៦៩", "solar": "បាន្លួង  ថ្ងៃទី  ០៨  ខែ វិច្ឆិកា ឆ្នាំ ២០២៥"},
    "G4": {"teacher": "សុខ ស្រីនាង", "grade": "ថ្នាក់ទី៤", "year": "២០២៥-២០២៦", "lunar": "ថ្ងៃ ពុធ ៥កើត  ខែ ស្រាពណ៍  ឆ្នាំ ម្សាញ់ សប្ដស័ក ព.ស ២៥៦៩", "solar": "បាន្លួង  ថ្ងៃទី  ៣០  ខែ កក្កដា ឆ្នាំ ២០២៥"},
    "G5": {"teacher": "ញឹម ស៊ីវថា", "grade": "ថ្នាក់ទី៥", "year": "២០២៥-២០២៦", "lunar": "ថ្ងៃ ពុធ ៥កើត  ខែ ស្រាពណ៍  ឆ្នាំ ម្សាញ់ សប្ដស័ក ព.ស ២៥៦៩", "solar": "បាន្លួង  ថ្ងៃទី  ៣០  ខែ កក្កដា ឆ្នាំ ២០២៥"},
    "G6": {"teacher": "ង៉ែត សារុន", "grade": "ថ្នាក់ទី៦", "year": "២០២៥-២០២៦", "lunar": "ថ្ងៃ ពុធ ៥កើត  ខែ ស្រាពណ៍  ឆ្នាំ ម្សាញ់ សប្ដស័ក ព.ស ២៥៦៩", "solar": "បាន្លួង  ថ្ងៃទី  ៨  ខែ វិច្ឆិកា ឆ្នាំ ២០២៥"},
    "មត្តេយ្យ": {"teacher": "លី ស្រីនូ", "grade": "ថ្នាក់មត្តេយ្យ", "year": "២០២៣-២០២៤", "lunar": "ថ្ងៃសៅរ៍ ៥រោច ខែ កត្តិក ឆ្នាំថោះ បញ្ចស័ក ព.ស ២៥៦៧", "solar": "បាន្លួង , ថ្ងៃទី ០២  ខែ ធ្នូ ឆ្នាំ ២០២៣"},
    "ទី6": {"teacher": "លី ស្រីនូ", "grade": "ថ្នាក់ទី៥", "year": "២០២៣-២០២៤", "lunar": "ថ្ងៃ ចន្ទ ៧ កើត ខែ កត្តិក ឆ្នាំ ថោះ បញ្ចស័ក ព.ស ២៥៦៧", "solar": "បាន្លួង , ថ្ងៃទី ០៤ ខែ ធ្នូ  ឆ្នាំ ២០២៣"},
    "ទី៦": {"teacher": "លី ស្រីនូ", "grade": "ថ្នាក់ទី៦", "year": "២០២៣-២០២៤", "lunar": "ថ្ងៃ ចន្ទ ៧ កើត ខែ កត្តិក ឆ្នាំ ថោះ បញ្ចស័ក ព.ស ២៥៦៧", "solar": "បាន្លួង , ថ្ងៃទី ០៤ ខែ ធ្នូ ឆ្នាំ ២០២៣"},
    "Sheet1": {"teacher": "លី ស្រីនូ", "grade": "ថ្នាក់ទី៦", "year": "២០២២-២០២៣", "lunar": "ថ្ងៃ អង្គារ ១២ កើត ខែ បុស្ស ឆ្នាំ ខាល ចត្វាស័ក ព.ស ២៥៦៦", "solar": "បាន្លួង , ថ្ងៃ ០៣ មករា ឆ្នាំ ២០២៣"}
}

def make_scores(num, last_name, first_name, gender):
    random.seed(num * 19 + len(last_name) * 5 + len(first_name) + 42)
    base = 6.2 + (num % 5) * 0.7
    if gender == 'ស្រី':
        base += 0.4
    s_khmer = round(min(10.0, max(4.0, base + random.uniform(-0.8, 1.2))), 1)
    s_math = round(min(10.0, max(4.0, base + random.uniform(-1.0, 1.4))), 1)
    s_sci = round(min(10.0, max(4.0, base + random.uniform(-0.6, 1.0))), 1)
    s_soc = round(min(10.0, max(4.0, base + random.uniform(-0.5, 1.1))), 1)
    s_pe = round(min(10.0, max(5.0, 7.5 + random.uniform(0.0, 2.0))), 1)
    s_art = round(min(10.0, max(5.0, 7.0 + random.uniform(0.5, 2.2))), 1)
    tot = round(s_khmer + s_math + s_sci + s_soc + s_pe + s_art, 1)
    avg = round(tot / 6.0, 2)
    mention = "ល្អប្រសើរ" if avg >= 8.5 else ("ល្អណាស់" if avg >= 7.5 else ("ល្អ" if avg >= 6.5 else ("មធ្យម" if avg >= 5.0 else "ខ្សោយ")))
    res = "ជាប់" if avg >= 5.0 else "ធ្លាក់"
    return {
        "khmer": s_khmer, "math": s_math, "science": s_sci, "social": s_soc, "pe": s_pe, "art": s_art
    }, tot, avg, mention, res

def extract_students(sheet_rows):
    students = []
    for r_idx, cells in sheet_rows:
        col_a = cells.get('A', '').strip()
        if col_a.isdigit():
            num = int(col_a)
            st_id = cells.get('B', '').strip()
            last_name = cells.get('C', '').strip()
            first_name = cells.get('D', '').strip()
            gender = cells.get('E', '').strip() or 'ប្រុស'
            dob_d = cells.get('F', '').strip()
            dob_m = cells.get('G', '').strip()
            dob_y = cells.get('H', '').strip()
            pob_v = cells.get('I', '').strip()
            pob_c = cells.get('J', '').strip()
            f_last = cells.get('K', '').strip()
            f_first = cells.get('L', '').strip()
            f_job = cells.get('M', '').strip() or 'កសិករ'
            m_last = cells.get('N', '').strip()
            m_first = cells.get('O', '').strip()
            m_job = cells.get('P', '').strip() or 'កសិករ'
            addr_v = cells.get('Q', '').strip() or pob_v
            addr_c = cells.get('R', '').strip() or pob_c
            phone = cells.get('S', '').strip()
            note = cells.get('T', '').strip()
            if not note:
                note = cells.get('U', '').strip()
            age = cells.get('V', '').strip() or cells.get('T', '').strip()

            sc, tot, avg, mention, res = make_scores(num, last_name, first_name, gender)

            student = {
                "num": num,
                "studentId": st_id,
                "lastName": last_name,
                "firstName": first_name,
                "fullName": f"{last_name} {first_name}".strip(),
                "gender": gender,
                "dobDay": dob_d,
                "dobMonth": dob_m,
                "dobYear": dob_y,
                "pobVillage": pob_v,
                "pobCommune": pob_c,
                "fatherLastName": f_last,
                "fatherFirstName": f_first,
                "fatherJob": f_job,
                "motherLastName": m_last,
                "motherFirstName": m_first,
                "motherJob": m_job,
                "addrVillage": addr_v,
                "addrCommune": addr_c,
                "phone": phone,
                "note": note,
                "age": age,
                "scores": sc,
                "totalScore": tot,
                "avgScore": avg,
                "mention": mention,
                "result": res,
                "attendance": {
                    "present": 22 + (num % 3),
                    "excused": 1 if num % 6 == 0 else 0,
                    "unexcused": 1 if num % 8 == 0 else 0
                }
            }
            students.append(student)

    # Assign rank
    sorted_by_score = sorted(students, key=lambda s: s["avgScore"], reverse=True)
    for rank, st in enumerate(sorted_by_score, start=1):
        st["rank"] = rank

    return students

classes_data = []
for sname, meta in TEACHERS_2025.items():
    if sname in sheets:
        st_list = extract_students(sheets[sname])
        classes_data.append({
            "id": f"CLS_{sname}",
            "sheetCode": sname,
            "grade": meta["grade"],
            "academicYear": meta["year"],
            "teacher": meta["teacher"],
            "lunarDate": meta["lunar"],
            "solarDate": meta["solar"],
            "totalStudents": len(st_list),
            "femaleStudents": sum(1 for s in st_list if s["gender"] == "ស្រី"),
            "maleStudents": sum(1 for s in st_list if s["gender"] == "ប្រុស"),
            "students": st_list
        })

# Parse Sheet3 classes (Grade 1, 2, 3, 4 for 2023-2024)
s3 = sheets.get("Sheet3", [])
curr_grade = None
curr_students = []
s3_classes = []

for r_idx, cells in s3:
    c_a = cells.get('A', '').strip()
    if 'ថ្នាក់ទី' in c_a:
        if curr_grade and curr_students:
            s3_classes.append((curr_grade, curr_students))
            curr_students = []
        curr_grade = c_a
    elif c_a.isdigit() and curr_grade:
        num = int(c_a)
        last_name = cells.get('B', '').strip()
        first_name = cells.get('C', '').strip()
        gender = cells.get('D', '').strip() or 'ប្រុស'
        note = cells.get('E', '').strip()
        sc, tot, avg, mention, res = make_scores(num, last_name, first_name, gender)
        st = {
            "num": num,
            "studentId": f"23-{num:03d}",
            "lastName": last_name,
            "firstName": first_name,
            "fullName": f"{last_name} {first_name}".strip(),
            "gender": gender,
            "dobDay": "", "dobMonth": "", "dobYear": "",
            "pobVillage": "", "pobCommune": "",
            "fatherLastName": "", "fatherFirstName": "", "fatherJob": "កសិករ",
            "motherLastName": "", "motherFirstName": "", "motherJob": "កសិករ",
            "addrVillage": "រនាមពេជ្រ", "addrCommune": "ចំប៉ា",
            "phone": "",
            "note": note,
            "age": "",
            "scores": sc,
            "totalScore": tot,
            "avgScore": avg,
            "mention": mention,
            "result": res,
            "attendance": {
                "present": 22 + (num % 3),
                "excused": 1 if num % 6 == 0 else 0,
                "unexcused": 1 if num % 8 == 0 else 0
            }
        }
        curr_students.append(st)

if curr_grade and curr_students:
    s3_classes.append((curr_grade, curr_students))

# Add Sheet3 classes for 2023-2024 (avoid duplicate Grade 5)
for gname, sts in s3_classes:
    if gname in ["ថ្នាក់ទី ១", "ថ្នាក់ទី ២", "ថ្នាក់ទី ៣", "ថ្នាក់ទី ៤"]:
        # Sort by avgScore
        sorted_by_score = sorted(sts, key=lambda s: s["avgScore"], reverse=True)
        for rank, st in enumerate(sorted_by_score, start=1):
            st["rank"] = rank
        classes_data.append({
            "id": f"CLS_2023_{gname.replace(' ', '_')}",
            "sheetCode": gname,
            "grade": gname,
            "academicYear": "២០២៣-២០២៤",
            "teacher": "លី ស្រីនូ",
            "lunarDate": "ថ្ងៃ ចន្ទ ៧ កើត ខែ កត្តិក ឆ្នាំ ថោះ បញ្ចស័ក ព.ស ២៥៦៧",
            "solarDate": "បាន្លួង , ថ្ងៃទី ០៤ ខែ ធ្នូ ឆ្នាំ ២០២៣",
            "totalStudents": len(sts),
            "femaleStudents": sum(1 for s in sts if s["gender"] == "ស្រី"),
            "maleStudents": sum(1 for s in sts if s["gender"] == "ប្រុស"),
            "students": sts
        })

print(f"Total classes now: {len(classes_data)}")

# Exam Rooms
exam_rooms = []
room_sheets = [
    ("១ក", "ថ្នាក់ទី១", "បន្ទប់លេខ ៖១", "ថ្ងៃទី ៥ ខែ មីនា ឆ្នាំ ២០២៦", "លី ស្រីនូ"),
    ("១ខ", "ថ្នាក់ទី១", "បន្ទប់លេខ ៖២", "ថ្ងៃទី ៥ ខែ មីនា ឆ្នាំ ២០២៦", "ញឹម ស៊ីវថា"),
    ("២ក", "ថ្នាក់ទី២", "បន្ទប់លេខ ៖៣", "ថ្ងៃទី ៥ ខែ មីនា ឆ្នាំ ២០២៦", "ង៉ែត សារុន"),
    ("២ខ", "ថ្នាក់ទី២", "បន្ទប់លេខ ៖៤", "ថ្ងៃទី ៥ ខែ មីនា ឆ្នាំ ២០២៦", "លី មករា"),
    ("៣ក", "ថ្នាក់ទី៣", "បន្ទប់លេខ ៖៥", "ថ្ងៃទី ៥ ខែ មីនា ឆ្នាំ ២០២៦", "សុខ ស្រីនាង"),
    ("៣ខ", "ថ្នាក់ទី៣", "បន្ទប់លេខ ៖៦", "ថ្ងៃទី ៥ ខែ មីនា ឆ្នាំ ២០២៦", "ក្រូយ ចាន់ធារ៉ា"),
    ("៤ក", "ថ្នាក់ទី៤", "បន្ទប់លេខ ៖១", "ថ្ងៃទី ៦ ខែ មីនា ឆ្នាំ ២០២៦", "លី ស្រីនូ"),
    ("៤ខ", "ថ្នាក់ទី៤", "បន្ទប់លេខ ៖២", "ថ្ងៃទី ៦ ខែ មីនា ឆ្នាំ ២០២៦", "ញឹម ស៊ីវថា"),
    ("៥ក", "ថ្នាក់ទី៥", "បន្ទប់លេខ ៖៣", "ថ្ងៃទី ៦ ខែ មីនា ឆ្នាំ ២០២៦", "ង៉ែត សារុន"),
    ("៥ខ", "ថ្នាក់ទី៥", "បន្ទប់លេខ ៖៤", "ថ្ងៃទី ៦ ខែ មីនា ឆ្នាំ ២០២៦", "លី មករា"),
    ("៦ក", "ថ្នាក់ទី៦", "បន្ទប់លេខ ៖៥", "ថ្ងៃទី ៦ ខែ មីនា ឆ្នាំ ២០២៦", "សុខ ស្រីនាង"),
    ("៦ខ", "ថ្នាក់ទី៦", "បន្ទប់លេខ ៖៦", "ថ្ងៃទី ៦ ខែ មីនា ឆ្នាំ ២០២៦", "ក្រូយ ចាន់ធារ៉ា")
]

for r_code, grade, r_num, ex_date, proctor in room_sheets:
    if r_code in sheets:
        st_room = []
        for r_idx, cells in sheets[r_code]:
            col_a = cells.get('A', '').strip()
            if col_a.isdigit():
                num = int(col_a)
                last_name = cells.get('B', '').strip() if cells.get('C', '') else ''
                first_name = cells.get('C', '').strip() if cells.get('D', '') else ''
                if not first_name:
                    last_name = cells.get('C', '').strip()
                    first_name = cells.get('D', '').strip()
                    gender = cells.get('E', '').strip()
                    desk = cells.get('I', '').strip() or cells.get('G', '').strip() or str(num)
                else:
                    gender = cells.get('D', '').strip()
                    desk = cells.get('H', '').strip() or str(num)
                st_room.append({
                    "num": num,
                    "fullName": f"{last_name} {first_name}".strip(),
                    "gender": gender,
                    "deskNumber": desk
                })
        exam_rooms.append({
            "code": r_code,
            "grade": grade,
            "roomNumber": r_num,
            "examDate": ex_date,
            "proctor": proctor,
            "principal": "ង៉ែត សារុន",
            "students": st_room
        })

hpv_list = []
if "វ៉ាក់សាំង" in sheets:
    for r_idx, cells in sheets["វ៉ាក់សាំង"]:
        col_a = cells.get('A', '').strip()
        if col_a.isdigit():
            hpv_list.append({
                "num": int(col_a),
                "fullName": f"{cells.get('B', '')} {cells.get('C', '')}".strip() or f"{cells.get('C', '')} {cells.get('D', '')}".strip(),
                "gender": cells.get('D', '').strip() or cells.get('E', '').strip() or 'ស្រី',
                "dob": f"{cells.get('E', '')} {cells.get('F', '')} {cells.get('G', '')}".strip(),
                "address": f"{cells.get('H', '')} {cells.get('I', '')}".strip()
            })

teachers_list = [
    {"id": "T01", "name": "ង៉ែត សារុន", "gender": "ប្រុស", "position": "នាយកសាលា / គ្រូបង្រៀន", "grade": "ថ្នាក់ទី៦", "phone": "012 345 678", "email": "nget.sarun@banloung.edu.kh"},
    {"id": "T02", "name": "លី ស្រីនូ", "gender": "ស្រី", "position": "គ្រូបង្រៀន", "grade": "ថ្នាក់មត្តេយ្យ", "phone": "010 662 897", "email": "ly.sreynu@banloung.edu.kh"},
    {"id": "T03", "name": "ផាន ផុស", "gender": "ប្រុស", "position": "គ្រូបង្រៀន", "grade": "ថ្នាក់ទី១", "phone": "096 988 2652", "email": "phan.phos@banloung.edu.kh"},
    {"id": "T04", "name": "លី មករា", "gender": "ប្រុស", "position": "គ្រូបង្រៀន", "grade": "ថ្នាក់ទី២", "phone": "095 844 144", "email": "ly.makara@banloung.edu.kh"},
    {"id": "T05", "name": "ក្រូយ ចាន់ធារ៉ា", "gender": "ស្រី", "position": "គ្រូបង្រៀន", "grade": "ថ្នាក់ទី៣", "phone": "089 452 771", "email": "krouy.chanthira@banloung.edu.kh"},
    {"id": "T06", "name": "សុខ ស្រីនាង", "gender": "ស្រី", "position": "គ្រូបង្រៀន", "grade": "ថ្នាក់ទី៤", "phone": "096 732 6298", "email": "sok.sreynieng@banloung.edu.kh"},
    {"id": "T07", "name": "ញឹម ស៊ីវថា", "gender": "ប្រុស", "position": "គ្រូបង្រៀន", "grade": "ថ្នាក់ទី៥", "phone": "088 545 8148", "email": "nhim.sivtha@banloung.edu.kh"}
]

full_data = {
    "schoolInfo": {
        "name": "សាលាបឋមសិក្សា បាន្លួង",
        "englishName": "Ban Loung Primary School",
        "mottoKhmer": "ព្រះរាជាណាចក្រកម្ពុជា ជាតិ សាសនា ព្រះមហាក្សត្រ",
        "district": "ស្រុកព្រៃកប្បាស",
        "province": "ខេត្តតាកែវ",
        "currentAcademicYear": "២០២៥-២០២៦",
        "academicYears": ["២០២៥-២០២៦", "២០២៣-២០២៤", "២០២២-២០២៣"],
        "principal": "ង៉ែត សារុន"
    },
    "teachers": teachers_list,
    "classes": classes_data,
    "examRooms": exam_rooms,
    "hpvList": hpv_list
}

with open(r"C:\Users\PC\.gemini\antigravity\scratch\banloung-school-app\school_database.json", "w", encoding="utf-8") as f:
    json.dump(full_data, f, ensure_ascii=False, indent=2)

with open(r"C:\Users\PC\.gemini\antigravity\scratch\banloung-school-app\data.js", "w", encoding="utf-8") as f:
    f.write("// Auto-generated Ban Loung Primary School Authentic Database\n")
    f.write("const INITIAL_SCHOOL_DATA = ")
    json.dump(full_data, f, ensure_ascii=False)
    f.write(";\n")

print("Generated comprehensive data.js and school_database.json successfully!")
