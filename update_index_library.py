# -*- coding: utf-8 -*-

with open(r'C:\Users\PC\.gemini\antigravity\scratch\banloung-school-app\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add Library to Sidebar
sidebar_target = '''      <li class="nav-item">
        <a class="nav-link" data-tab="reports" data-tooltip="វ៉ាក់សាំង & របាយការណ៍" title="វ៉ាក់សាំង & របាយការណ៍">
          <span class="nav-icon"><i class="fa fa-file-medical"></i></span>
          <span class="nav-text">វ៉ាក់សាំង & របាយការណ៍</span>
        </a>
      </li>
    </ul>'''

sidebar_replace = '''      <li class="nav-item">
        <a class="nav-link" data-tab="reports" data-tooltip="វ៉ាក់សាំង & របាយការណ៍" title="វ៉ាក់សាំង & របាយការណ៍">
          <span class="nav-icon"><i class="fa fa-file-medical"></i></span>
          <span class="nav-text">វ៉ាក់សាំង & របាយការណ៍</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-tab="library" data-tooltip="បណ្ណាល័យថ្នាក់រៀន" title="បណ្ណាល័យថ្នាក់រៀន">
          <span class="nav-icon"><i class="fa-solid fa-book-bookmark" style="color: #0d9488;"></i></span>
          <span class="nav-text">បណ្ណាល័យថ្នាក់រៀន</span>
        </a>
      </li>
    </ul>'''

if sidebar_target in html:
    html = html.replace(sidebar_target, sidebar_replace, 1)
    print("1. Added Library to sidebar navigation")
else:
    print("WARNING: sidebar_target not found")

# 2. Add Tab Section for Library
section_target = '''      <section id="tab-reports" class="tab-pane">
        <div id="reportsContentWrap"></div>
      </section>'''

section_replace = '''      <section id="tab-reports" class="tab-pane">
        <div id="reportsContentWrap"></div>
      </section>

      <!-- ========================================== -->
      <!-- TAB: CLASSROOM DIGITAL LIBRARY (បណ្ណាល័យថ្នាក់រៀន) -->
      <!-- ========================================== -->
      <section id="tab-library" class="tab-pane">
        <div class="library-container">
          <!-- Library Header & Controls -->
          <div class="library-top-bar">
            <div class="library-title-group">
              <h2 class="library-main-title"><i class="fa-solid fa-book-bookmark" style="color: #0d9488;"></i> បណ្ណាល័យថ្នាក់រៀនឌីជីថល (Classroom Digital Library)</h2>
              <p class="library-sub-title">ផ្ទុកសៀវភៅពុម្ពសិស្សជា PDF បើកអានតាមកម្រិតថ្នាក់ និងជ្រើសរើសមេរៀនស្វ័យប្រវត្តិតាមមុខវិជ្ជាសម្រាប់របាយការណ៍</p>
            </div>
            <div class="library-actions-group">
              <button type="button" class="btn btn-action-excel" onclick="exportLibraryCatalog()" title="នាំចេញបញ្ជីសៀវភៅ">
                <i class="fa-solid fa-file-excel"></i> នាំចេញបញ្ជីសៀវភៅ
              </button>
              <button type="button" class="btn btn-primary" onclick="openUploadBookModal()" title="ផ្ទុកសៀវភៅពុម្ព PDF ថ្មី">
                <i class="fa-solid fa-cloud-arrow-up"></i> ផ្ទុកសៀវភៅថ្មី (Upload PDF)
              </button>
            </div>
          </div>

          <!-- Grade Selector Pills -->
          <div class="library-filter-panel">
            <div class="library-grade-pills" id="libraryGradePills">
              <!-- Rendered dynamically -->
            </div>

            <!-- Subject & Search Toolbar -->
            <div class="library-sub-toolbar">
              <div class="library-subject-tabs" id="librarySubjectTabs">
                <!-- Rendered dynamically -->
              </div>
              <div class="library-search-box">
                <i class="fa-solid fa-magnifying-glass search-icon"></i>
                <input type="text" id="librarySearchInput" class="library-search-input" placeholder="ស្វែងរកតាមឈ្មោះសៀវភៅ ឬមេរៀន..." oninput="handleLibrarySearch(this.value)">
                <button type="button" class="library-search-clear" onclick="clearLibrarySearch()" title="សម្អាត">&times;</button>
              </div>
            </div>
          </div>

          <!-- Library Books Grid -->
          <div class="library-books-grid" id="libraryBooksGrid">
            <!-- Rendered dynamically -->
          </div>
        </div>
      </section>'''

if section_target in html:
    html = html.replace(section_target, section_replace, 1)
    print("2. Added tab-library section")
else:
    print("WARNING: section_target not found")

# 3. Add Modals for Library
modals_html = '''
<!-- ========================================== -->
<!-- MODAL: DIGITAL PDF READER (កម្មវិធីអានសៀវភៅ) -->
<!-- ========================================== -->
<div class="library-reader-modal" id="libraryReaderModal">
  <div class="reader-box">
    <div class="reader-header">
      <div class="reader-header-left">
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="toggleReaderSidebar()" title="បិទ/បើកបញ្ជីមាតិកាមេរៀន" style="color: #fff; border-color: #475569;">
          <i class="fa-solid fa-bars"></i> មាតិកា
        </button>
        <h3 class="reader-book-title" id="readerBookTitle">ឈ្មោះសៀវភៅពុម្ព</h3>
        <div class="reader-badges">
          <span class="lib-badge-grade" id="readerGradeBadge">ថ្នាក់ទី៦</span>
          <span class="lib-badge-subj" id="readerSubjBadge">ភាសាខ្មែរ</span>
        </div>
      </div>
      <div class="reader-header-actions">
        <button type="button" class="btn btn-sm btn-outline-teal" id="readerDownloadBtn" title="ទាញយកឯកសារ PDF" style="display: none;">
          <i class="fa-solid fa-download"></i> ទាញយក PDF
        </button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="closeBookReaderModal()" title="បិទការអាន">
          <i class="fa-solid fa-xmark"></i> បិទ
        </button>
      </div>
    </div>
    <div class="reader-body">
      <!-- Collapsible Table of Contents Sidebar -->
      <div class="reader-sidebar" id="readerSidebar">
        <div class="reader-sidebar-head">
          <i class="fa-solid fa-list-check"></i> មាតិកា និងបញ្ជីមេរៀន
        </div>
        <ul class="reader-lesson-list" id="readerLessonList">
          <!-- Rendered dynamically -->
        </ul>
      </div>
      <!-- PDF View Container -->
      <div class="reader-frame-container" id="readerFrameContainer">
        <!-- Rendered dynamically -->
      </div>
    </div>
  </div>
</div>

<!-- ========================================== -->
<!-- MODAL: UPLOAD / CUSTOM BOOK (ផ្ទុកសៀវភៅថ្មី) -->
<!-- ========================================== -->
<div class="modal-overlay" id="uploadBookModal">
  <div class="modal-box" style="max-width: 620px;">
    <div class="modal-header">
      <div class="modal-title" id="uploadModalTitle"><i class="fa-solid fa-cloud-arrow-up text-teal"></i> ផ្ទុកសៀវភៅពុម្ព PDF ថ្មី</div>
      <button class="modal-close" onclick="closeUploadBookModal()">&times;</button>
    </div>
    <form id="uploadBookForm" onsubmit="handleUploadBookSubmit(event)">
      <div class="modal-body" style="padding: 20px;">
        <input type="hidden" id="uploadBookId">
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="font-weight: 600; font-size: 13px; display: block; margin-bottom: 5px;">ឈ្មោះសៀវភៅពុម្ព ឬឯកសារ <span style="color:red;">*</span></label>
          <input type="text" id="uploadBookTitle" class="form-control" required placeholder="ឧទាហរណ៍៖ ភាសាខ្មែរ ថ្នាក់ទី៦ ឬ កម្រងលំហាត់គណិតវិទ្យា" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group">
            <label style="font-weight: 600; font-size: 13px; display: block; margin-bottom: 5px;">កម្រិតថ្នាក់</label>
            <select id="uploadBookGrade" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
              <option value="ថ្នាក់មត្តេយ្យ">ថ្នាក់មត្តេយ្យ</option>
              <option value="ថ្នាក់ទី១">ថ្នាក់ទី១</option>
              <option value="ថ្នាក់ទី២">ថ្នាក់ទី២</option>
              <option value="ថ្នាក់ទី៣">ថ្នាក់ទី៣</option>
              <option value="ថ្នាក់ទី៤">ថ្នាក់ទី៤</option>
              <option value="ថ្នាក់ទី៥">ថ្នាក់ទី៥</option>
              <option value="ថ្នាក់ទី៦" selected>ថ្នាក់ទី៦</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 600; font-size: 13px; display: block; margin-bottom: 5px;">មុខវិជ្ជា</label>
            <select id="uploadBookSubject" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
              <option value="ភាសាខ្មែរ" selected>ភាសាខ្មែរ</option>
              <option value="គណិតវិទ្យា">គណិតវិទ្យា</option>
              <option value="សិក្សាសង្គម">សិក្សាសង្គម</option>
              <option value="វិទ្យាសាស្ត្រ">វិទ្យាសាស្ត្រ</option>
              <option value="ភាសាអង់គ្លេស">ភាសាអង់គ្លេស</option>
              <option value="ផ្សេងៗ">ផ្សេងៗ</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="font-weight: 600; font-size: 13px; display: block; margin-bottom: 5px;">អង្គភាព / ស្ថាប័នរៀបចំ</label>
          <input type="text" id="uploadBookPublisher" class="form-control" value="ក្រសួងអប់រំ យុវជន និងកីឡា" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
        </div>
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="font-weight: 600; font-size: 13px; display: block; margin-bottom: 5px;">ជ្រើសរើសឯកសារ PDF <span style="color:#0284c7;">(.pdf)</span></label>
          <input type="file" id="uploadBookPdfFile" accept="application/pdf" style="width: 100%; padding: 8px; border: 1px dashed #38bdf8; border-radius: 6px; background: #f0f9ff;">
          <small style="color: #64748b; display: block; margin-top: 4px;">គាំទ្រឯកសារ PDF គ្រប់ទំហំ (រក្សាទុកក្នុង IndexedDB ដោយសុវត្ថិភាព)</small>
        </div>
        <div class="form-group" style="margin-bottom: 6px;">
          <label style="font-weight: 600; font-size: 13px; display: block; margin-bottom: 5px;">បញ្ជីមេរៀន (ស្រេចចិត្ត - សរសេរមួយជួរមួយមេរៀន)</label>
          <textarea id="uploadCustomLessons" rows="4" class="form-control" placeholder="ឧទាហរណ៍៖&#10;មេរៀនទី១៖ ការអប់រំ និងការបណ្តុះបណ្តាល&#10;មេរៀនទី២៖ គ្រួសារកក់ក្តៅ" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-family: var(--font-battambang);"></textarea>
        </div>
      </div>
      <div class="modal-footer" style="padding: 14px 20px; display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="btn btn-secondary" onclick="closeUploadBookModal()">បោះបង់</button>
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-save"></i> រក្សាទុកក្នុងបណ្ណាល័យ</button>
      </div>
    </form>
  </div>
</div>

<!-- ========================================== -->
<!-- MODAL: VIEW BOOK LESSONS (បញ្ជីមេរៀន)     -->
<!-- ========================================== -->
<div class="modal-overlay" id="bookLessonsModal">
  <div class="modal-box" style="max-width: 650px;">
    <div class="modal-header">
      <div>
        <div class="modal-title" id="lessonsModalBookTitle">មាតិកាសៀវភៅ</div>
        <div style="font-size: 0.8rem; color: #64748b;" id="lessonsModalBookGrade">កម្រិតថ្នាក់</div>
      </div>
      <button class="modal-close" onclick="closeBookLessonsModal()">&times;</button>
    </div>
    <div class="modal-body" style="padding: 16px; max-height: 65vh; overflow-y: auto;" id="lessonsModalList">
      <!-- Rendered dynamically -->
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="closeBookLessonsModal()">បិទ</button>
    </div>
  </div>
</div>

<!-- ========================================== -->
<!-- MODAL: LESSON PICKER FOR REPORT (រើសមេរៀន) -->
<!-- ========================================== -->
<div class="modal-overlay" id="lessonPickerModal">
  <div class="modal-box" style="max-width: 650px;">
    <div class="modal-header">
      <div>
        <div class="modal-title" id="pickerModalTitle"><i class="fa-solid fa-book-bookmark text-teal"></i> ជ្រើសរើសមេរៀនពីបណ្ណាល័យ</div>
        <div style="font-size: 0.8rem; color: #64748b;" id="pickerModalSub">ជ្រើសរើសមេរៀនដើម្បីបញ្ជូនទៅរបាយការណ៍ប្រចាំខែ</div>
      </div>
      <button class="modal-close" onclick="closeLessonPickerModal()">&times;</button>
    </div>
    <div class="modal-body" style="padding: 16px; max-height: 60vh; overflow-y: auto;" id="pickerLessonsContainer">
      <!-- Rendered dynamically -->
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="closeLessonPickerModal()">បោះបង់</button>
    </div>
  </div>
</div>
'''

if '<!-- MODAL: DIGITAL PDF READER' not in html:
    idx_script = html.find('<script src="data.js"></script>')
    if idx_script != -1:
        html = html[:idx_script] + modals_html + "\n\n" + html[idx_script:]
        print("3. Added Library Modals")
    else:
        print("WARNING: script tag not found for modals")

# 4. Add <script src="library.js"></script>
script_target = '<script src="app.js"></script>'
script_replace = '''<script src="app.js"></script>
<script src="library.js"></script>'''

if script_target in html and 'library.js' not in html:
    html = html.replace(script_target, script_replace, 1)
    print("4. Added library.js script tag")

with open(r'C:\Users\PC\.gemini\antigravity\scratch\banloung-school-app\index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated index.html successfully!")
