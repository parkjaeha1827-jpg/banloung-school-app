# -*- coding: utf-8 -*-
import json
import os

# Base directory
BASE_DIR = r"C:\Users\PC\.gemini\antigravity\scratch\banloung-school-app"

# Let's define the teachers
teachers = [
    {"id": "T01", "name": "ង៉ែត សារុន", "gender": "ប្រុស", "position": "នាយកសាលា", "assignedGrade": "ថ្នាក់ទី៦", "phone": "012 345 678", "email": "nget.sarun@banloung.edu.kh"},
    {"id": "T02", "name": "លី ស្រីនូ", "gender": "ស្រី", "position": "គ្រូបង្រៀន", "assignedGrade": "ថ្នាក់មត្តេយ្យ", "phone": "010 662 897", "email": "ly.sreynu@banloung.edu.kh"},
    {"id": "T03", "name": "ផាន ផុស", "gender": "ប្រុស", "position": "គ្រូបង្រៀន", "assignedGrade": "ថ្នាក់ទី១", "phone": "096 988 2652", "email": "phan.phos@banloung.edu.kh"},
    {"id": "T04", "name": "លី មករា", "gender": "ប្រុស", "position": "គ្រូបង្រៀន", "assignedGrade": "ថ្នាក់ទី២", "phone": "095 844 144", "email": "ly.makara@banloung.edu.kh"},
    {"id": "T05", "name": "ក្រូយ ចាន់ធារ៉ា", "gender": "ស្រី", "position": "គ្រូបង្រៀន", "assignedGrade": "ថ្នាក់ទី៣", "phone": "089 452 771", "email": "krouy.chanthira@banloung.edu.kh"},
    {"id": "T06", "name": "សុខ ស្រីនាង", "gender": "ស្រី", "position": "គ្រូបង្រៀន", "assignedGrade": "ថ្នាក់ទី៤", "phone": "096 732 6298", "email": "sok.sreynieng@banloung.edu.kh"},
    {"id": "T07", "name": "ញឹម ស៊ីវថា", "gender": "ប្រុស", "position": "គ្រូបង្រៀន", "assignedGrade": "ថ្នាក់ទី៥", "phone": "088 545 8148", "email": "nhim.sivtha@banloung.edu.kh"}
]

print("Ready to construct classes data")
