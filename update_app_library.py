# -*- coding: utf-8 -*-

with open(r'C:\Users\PC\.gemini\antigravity\scratch\banloung-school-app\app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# 1. Update switchTab titles
titles_target = '''    exams: "បន្ទប់ប្រឡងតេស្ដស្តង់ដា (Exam Rooms)",
    reports: "របាយការណ៍ & ស្ថិតិ (Reports & Statistics)"
  };'''

titles_replace = '''    exams: "បន្ទប់ប្រឡងតេស្ដស្តង់ដា (Exam Rooms)",
    reports: "របាយការណ៍ & ស្ថិតិ (Reports & Statistics)",
    library: "បណ្ណាល័យថ្នាក់រៀនឌីជីថល (Classroom Digital Library)"
  };'''

if titles_target in app_js:
    app_js = app_js.replace(titles_target, titles_replace, 1)
    print("1. Updated switchTab titles")
else:
    print("WARNING: titles_target not found")

# 2. Update renderActiveTab
render_active_target = '''    case "exams":
      renderExamRooms();
      break;
    case "reports":
      renderReports();
      break;'''

render_active_replace = '''    case "exams":
      renderExamRooms();
      break;
    case "reports":
      renderReports();
      break;
    case "library":
      if (typeof renderLibrary === "function") renderLibrary();
      break;'''

if render_active_target in app_js:
    app_js = app_js.replace(render_active_target, render_active_replace, 1)
    print("2. Updated renderActiveTab")
else:
    print("WARNING: render_active_target not found")

# 3. Add helper bar and lesson pickers in renderMonthlyReport
t3_header_target = '''      <!-- SECTION 3: CURRICULUM PROGRESS (➢ ឈ្មោះ និង ភាគរយនៃមេរៀនចុងក្រោយ ក្នុងខែ) -->
      <div class="report-sec-heading">
        <span class="report-bullet">➢</span>
        <span class="report-sec-text">ឈ្មោះ និង ភាគរយនៃមេរៀនចុងក្រោយ ក្នុងខែ</span>
      </div>'''

t3_header_replace = '''      <!-- SECTION 3: CURRICULUM PROGRESS (➢ ឈ្មោះ និង ភាគរយនៃមេរៀនចុងក្រោយ ក្នុងខែ) -->
      <div class="report-sec-heading">
        <span class="report-bullet">➢</span>
        <span class="report-sec-text">ឈ្មោះ និង ភាគរយនៃមេរៀនចុងក្រោយ ក្នុងខែ</span>
      </div>

      <!-- SMART LIBRARY HELPER BAR (No-Print) -->
      <div class="report-library-helper no-print">
        <span class="report-helper-title"><i class="fa-solid fa-wand-magic-sparkles" style="color: #0d9488;"></i> ជំនួយការមេរៀនបណ្ណាល័យ៖</span>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <button type="button" class="btn btn-sm btn-outline-teal" onclick="autoFillLessonsForCurrentReportMonth()" title="ជ្រើសរើសមេរៀនដោយស្វ័យប្រវត្តិតាមខែ និងកម្រិតថ្នាក់ពីបណ្ណាល័យ">
            <i class="fa-solid fa-bolt"></i> បំពេញមេរៀនស្វ័យប្រវត្តិតាមខែ (${monthKey})
          </button>
          <button type="button" class="btn btn-sm btn-outline-primary" onclick="switchTab('library')" title="បើកបណ្ណាល័យដើម្បីរើសមេរៀន ឬបើកអានសៀវភៅ">
            <i class="fa-solid fa-book-bookmark"></i> បើកបណ្ណាល័យថ្នាក់រៀន
          </button>
        </div>
      </div>'''

if t3_header_target in app_js:
    app_js = app_js.replace(t3_header_target, t3_header_replace, 1)
    print("3. Added library helper bar in renderMonthlyReport")
else:
    print("WARNING: t3_header_target not found")

# 4. Add picker button next to lesson title in renderMonthlyReport
row_target = '''        <td style="width: 44%; text-align: left; padding-left: 4px;">
          <span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't3_lesson_${sub.key}')">${lesson}</span>
        </td>'''

row_replace = '''        <td style="width: 44%; text-align: left; padding-left: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span contenteditable="true" style="flex-grow: 1;" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't3_lesson_${sub.key}')">${lesson}</span>
            <button type="button" class="btn-lesson-pick no-print" onclick="openSubjectLessonPicker('${sub.key}', '${sub.name}')" title="រើសមេរៀន ${sub.name} ពីបណ្ណាល័យ">
              <i class="fa-solid fa-book-bookmark"></i>
            </button>
          </div>
        </td>'''

if row_target in app_js:
    app_js = app_js.replace(row_target, row_replace, 1)
    print("4. Added picker button in subject row in renderMonthlyReport")
else:
    print("WARNING: row_target not found")

with open(r'C:\Users\PC\.gemini\antigravity\scratch\banloung-school-app\app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("Updated app.js successfully!")
