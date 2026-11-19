"""
Data parser script to generate initial students_data.json with all classes from the user prompt.
"""
import json
import os

students_data = {
    "schoolName": "សាលាបឋមសិក្សា បាន្លួង",
    "district": "ស្រុកព្រៃកប្បាស",
    "province": "ខេត្តតាកែវ",
    "academicYears": ["២០២៥-២០២៦", "២០២៣-២០២៤", "២០២២-២០២៣"],
    "currentYear": "២០២៥-២០២៦",
    "teachers": [
        {"id": "T01", "name": "ង៉ែត សារុន", "gender": "ប្រុស", "position": "នាយកសាលា / គ្រូបង្រៀន", "grade": "ថ្នាក់ទី៦", "phone": "012 345 678"},
        {"id": "T02", "name": "លី ស្រីនូ", "gender": "ស្រី", "position": "គ្រូបង្រៀន", "grade": "ថ្នាក់មត្តេយ្យ", "phone": "010 662 897"},
        {"id": "T03", "name": "ផាន ផុស", "gender": "ប្រុស", "position": "គ្រូបង្រៀន", "grade": "ថ្នាក់ទី១", "phone": "096 988 2652"},
        {"id": "T04", "name": "លី មករា", "gender": "ប្រុស", "position": "គ្រូបង្រៀន", "grade": "ថ្នាក់ទី២", "phone": "095 844 144"},
        {"id": "T05", "name": "ក្រូយ ចាន់ធារ៉ា", "gender": "ស្រី", "position": "គ្រូបង្រៀន", "grade": "ថ្នាក់ទី៣", "phone": "089 452 771"},
        {"id": "T06", "name": "សុខ ស្រីនាង", "gender": "ស្រី", "position": "គ្រូបង្រៀន", "grade": "ថ្នាក់ទី៤", "phone": "096 732 6298"},
        {"id": "T07", "name": "ញឹម ស៊ីវថា", "gender": "ប្រុស", "position": "គ្រូបង្រៀន", "grade": "ថ្នាក់ទី៥", "phone": "088 545 8148"}
    ],
    "classes": []
}

print("Script template created")
