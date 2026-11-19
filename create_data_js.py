# -*- coding: utf-8 -*-
"""
Generates data.js containing all classes and students for Ban Loung Primary School
"""
import json

data_js_code = r'''/**
 * Default Data for Ban Loung Primary School (សាលាបឋមសិក្សា បាន្លួង)
 */
const DEFAULT_SCHOOL_DATA = {
  schoolInfo: {
    name: "សាលាបឋមសិក្សា បាន្លួង",
    englishName: "Ban Loung Primary School",
    country: "ព្រះរាជាណាចក្រកម្ពុជា",
    motto: "ជាតិ សាសនា ព្រះមហាក្សត្រ",
    district: "ស្រុកព្រៃកប្បាស",
    province: "ខេត្តតាកែវ",
    currentAcademicYear: "២០២៥-២០២៦",
    academicYears: ["២០២៥-២០២៦", "២០២៣-២០២៤", "២០២២-២០២៣"],
    principal: "ង៉ែត សារុន",
    principalTitle: "នាយកសាលា"
  },
  teachers: [
    { id: "T1", name: "ង៉ែត សារុន", gender: "ប្រុស", position: "នាយកសាលា / គ្រូបង្រៀន", grade: "ថ្នាក់ទី៦", phone: "012 345 678", email: "nget.sarun@banloung.edu.kh", active: true },
    { id: "T2", name: "លី ស្រីនូ", gender: "ស្រី", position: "គ្រូបង្រៀន", grade: "ថ្នាក់មត្តេយ្យ", phone: "010 662 897", email: "ly.sreynu@banloung.edu.kh", active: true },
    { id: "T3", name: "ផាន ផុស", gender: "ប្រុស", position: "គ្រូបង្រៀន", grade: "ថ្នាក់ទី១", phone: "096 988 2652", email: "phan.phos@banloung.edu.kh", active: true },
    { id: "T4", name: "លី មករា", gender: "ប្រុស", position: "គ្រូបង្រៀន", grade: "ថ្នាក់ទី២", phone: "095 844 144", email: "ly.makara@banloung.edu.kh", active: true },
    { id: "T5", name: "ក្រូយ ចាន់ធារ៉ា", gender: "ស្រី", position: "គ្រូបង្រៀន", grade: "ថ្នាក់ទី៣", phone: "089 452 771", email: "krouy.chanthira@banloung.edu.kh", active: true },
    { id: "T6", name: "សុខ ស្រីនាង", gender: "ស្រី", position: "គ្រូបង្រៀន", grade: "ថ្នាក់ទី៤", phone: "096 732 6298", email: "sok.sreynieng@banloung.edu.kh", active: true },
    { id: "T7", name: "ញឹម ស៊ីវថា", gender: "ប្រុស", position: "គ្រូបង្រៀន", grade: "ថ្នាក់ទី៥", phone: "088 545 8148", email: "nhim.sivtha@banloung.edu.kh", active: true }
  ],
  subjects: [
    { id: "khmer", name: "ភាសាខ្មែរ", maxScore: 10, coefficient: 1 },
    { id: "math", name: "គណិតវិទ្យា", maxScore: 10, coefficient: 1 },
    { id: "science", name: "វិទ្យាសាស្ត្រ", maxScore: 10, coefficient: 1 },
    { id: "social", name: "សិក្សាសង្គម", maxScore: 10, coefficient: 1 },
    { id: "pe", name: "អប់រំកាយ/កីឡា", maxScore: 10, coefficient: 1 },
    { id: "art", name: "សិល្បៈ/ជំនាញ", maxScore: 10, coefficient: 1 }
  ],
  classes: []
};
'''

with open(r"C:\Users\PC\.gemini\antigravity\scratch\banloung-school-app\data.js", "w", encoding="utf-8") as f:
    f.write(data_js_code)

print("Initial data.js created!")
