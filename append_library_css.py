# -*- coding: utf-8 -*-

css_code = """
/* ==========================================================================
   CLASSROOM DIGITAL LIBRARY (បណ្ណាល័យថ្នាក់រៀនឌីជីថល)
   ========================================================================== */
.library-container {
  padding: 24px;
  max-width: 1500px;
  margin: 0 auto;
}

.library-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  background: #ffffff;
  padding: 20px 24px;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.library-main-title {
  font-family: var(--font-moul-light), 'Khmer OS Muol Light', serif;
  font-size: 1.35rem;
  color: #1e3a8a;
  margin: 0 0 6px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.library-sub-title {
  font-family: var(--font-battambang), sans-serif;
  font-size: 0.95rem;
  color: #64748b;
  margin: 0;
}

.library-actions-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* Filter Panel */
.library-filter-panel {
  background: #ffffff;
  padding: 18px 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
  margin-bottom: 24px;
}

.library-grade-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
}

.lib-grade-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 30px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  font-family: var(--font-battambang), sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lib-grade-pill:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
  color: #0f172a;
}

.lib-grade-pill.active {
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
  color: #ffffff;
  border-color: #1e3a8a;
  box-shadow: 0 3px 8px rgba(37, 99, 235, 0.25);
}

.lib-pill-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.08);
  font-size: 0.78rem;
}

.lib-grade-pill.active .lib-pill-count {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* Sub-toolbar (Subjects + Search) */
.library-sub-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.library-subject-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.lib-subj-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
  font-family: var(--font-battambang), sans-serif;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lib-subj-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.lib-subj-btn.active {
  background: #0d9488;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(13, 148, 136, 0.25);
}

.library-search-box {
  position: relative;
  min-width: 280px;
}

.library-search-input {
  width: 100%;
  padding: 8px 36px 8px 36px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  font-family: var(--font-battambang), sans-serif;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;
}

.library-search-input:focus {
  border-color: #0d9488;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
}

.library-search-box .search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 0.9rem;
}

.library-search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.1rem;
  cursor: pointer;
}

/* Book Cards Grid */
.library-books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 22px;
}

.lib-book-card {
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.lib-book-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.09);
  border-color: #cbd5e1;
}

/* 3D Book Cover Style */
.lib-book-cover {
  position: relative;
  height: 175px;
  padding: 16px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.lib-book-spine {
  position: absolute;
  top: 0;
  left: 0;
  width: 14px;
  height: 100%;
  background: linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.2) 100%);
  border-right: 1px solid rgba(255,255,255,0.2);
}

.lib-book-cover-content {
  margin-left: 8px;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
}

.lib-cover-badges {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lib-badge-grade {
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(4px);
  padding: 3px 8px;
  border-radius: 6px;
  font-family: var(--font-battambang), sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: #ffffff;
}

.lib-badge-subj {
  background: rgba(0, 0, 0, 0.25);
  padding: 3px 8px;
  border-radius: 6px;
  font-family: var(--font-battambang), sans-serif;
  font-size: 0.75rem;
  color: #ffffff;
}

.lib-cover-icon {
  font-size: 2.2rem;
  opacity: 0.85;
  margin: 6px 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.lib-cover-title {
  font-family: var(--font-moul-light), 'Khmer OS Muol Light', serif;
  font-size: 1.05rem;
  margin: 0;
  line-height: 1.35;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.4);
}

.lib-cover-pub {
  font-family: var(--font-battambang), sans-serif;
  font-size: 0.72rem;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Book Info Section */
.lib-book-info {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-grow: 1;
  justify-content: space-between;
}

.lib-info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.lib-info-title {
  font-family: var(--font-battambang), sans-serif;
  font-size: 0.96rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-pdf-ready {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #ecfdf5;
  color: #059669;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid #a7f3d0;
  white-space: nowrap;
}

.badge-pdf-sample {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 500;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
}

.lib-info-meta {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-battambang), sans-serif;
  font-size: 0.82rem;
  color: #64748b;
}

.lib-book-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
}

.lib-action-read {
  flex-grow: 1;
  font-weight: 600;
}

/* Empty State */
.library-empty-state {
  grid-column: 1 / -1;
  padding: 60px 20px;
  text-align: center;
  background: #ffffff;
  border-radius: 14px;
  border: 1px dashed #cbd5e1;
}

.library-empty-state .empty-icon {
  font-size: 3.5rem;
  color: #94a3b8;
  margin-bottom: 14px;
}

.library-empty-state h3 {
  font-family: var(--font-moul-light), serif;
  font-size: 1.15rem;
  color: #1e3a8a;
  margin-bottom: 8px;
}

.library-empty-state p {
  color: #64748b;
  margin-bottom: 18px;
}

/* ==========================================================================
   PDF READER MODAL
   ========================================================================== */
.library-reader-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: none;
  align-items: center;
  justify-content: center;
}

.library-reader-modal.active {
  display: flex;
}

.reader-box {
  width: 95vw;
  height: 92vh;
  max-width: 1550px;
  background: #ffffff;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.reader-header {
  height: 56px;
  background: #1e293b;
  color: #ffffff;
  padding: 0 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #334155;
}

.reader-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reader-book-title {
  font-family: var(--font-moul-light), serif;
  font-size: 1.05rem;
  color: #f8fafc;
  margin: 0;
}

.reader-badges {
  display: flex;
  gap: 6px;
}

.reader-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reader-body {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
  position: relative;
}

/* Reader Sidebar (Table of Contents) */
.reader-sidebar {
  width: 320px;
  min-width: 320px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease;
}

.reader-sidebar.collapsed {
  margin-left: -320px;
}

.reader-sidebar-head {
  padding: 12px 16px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  font-family: var(--font-battambang), sans-serif;
  font-weight: 700;
  font-size: 0.92rem;
  color: #1e3a8a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.reader-lesson-list {
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
  flex-grow: 1;
}

.reader-lesson-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  margin-bottom: 4px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.reader-lesson-item:hover {
  background: #f0fdf4;
  border-color: #86efac;
}

.r-lesson-num {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: #1e3a8a;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: bold;
}

.r-lesson-content {
  flex-grow: 1;
}

.r-lesson-title {
  font-family: var(--font-battambang), sans-serif;
  font-size: 0.86rem;
  font-weight: 600;
  color: #0f172a;
}

.r-lesson-month {
  font-size: 0.75rem;
  color: #64748b;
}

.btn-action-report {
  background: #0d9488;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-family: var(--font-battambang), sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-action-report:hover {
  background: #0f766e;
}

/* Viewer Frame Container */
.reader-frame-container {
  flex-grow: 1;
  background: #525659;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reader-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* Placeholder View */
.reader-placeholder-view {
  flex-grow: 1;
  background: #f8fafc;
  overflow-y: auto;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.reader-book-showcase {
  padding: 28px;
  border-radius: 12px;
  color: #ffffff;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.reader-book-showcase .showcase-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.reader-book-showcase h2 {
  font-family: var(--font-moul-light), serif;
  font-size: 1.5rem;
  margin: 0 0 8px 0;
}

.reader-book-showcase p {
  font-family: var(--font-battambang), sans-serif;
  opacity: 0.9;
  margin: 0;
}

.reader-upload-prompt-card {
  background: #ffffff;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  border: 2px dashed #38bdf8;
}

.upload-card-icon {
  font-size: 2.5rem;
  color: #0284c7;
  margin-bottom: 10px;
}

.reader-quick-upload-drop {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 8px;
  background: #e0f2fe;
  color: #0369a1;
  font-family: var(--font-battambang), sans-serif;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  transition: all 0.2s ease;
}

.reader-quick-upload-drop:hover {
  background: #bae6fd;
}

.reader-syllabus-preview {
  background: #ffffff;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.reader-syllabus-preview h3 {
  font-family: var(--font-moul-light), serif;
  font-size: 1.1rem;
  color: #1e3a8a;
  margin: 0 0 16px 0;
}

.syllabus-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.syllabus-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.syl-badge {
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background: #0d9488;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.85rem;
}

.syl-text {
  flex-grow: 1;
}

.syl-text strong {
  display: block;
  font-size: 0.88rem;
  color: #0f172a;
}

.syl-meta {
  font-size: 0.78rem;
  color: #64748b;
}

/* ==========================================================================
   MONTHLY REPORT ASSISTANT & LESSON PICKER INTEGRATION
   ========================================================================== */
.report-library-helper {
  width: 95%;
  margin: 14px auto 8px auto;
  padding: 10px 14px;
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.report-helper-title {
  font-family: var(--font-battambang), sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  color: #0f766e;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-lesson-pick {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: #e0f2fe;
  color: #0284c7;
  border: 1px solid #bae6fd;
  font-size: 0.75rem;
  cursor: pointer;
  margin-left: 4px;
  vertical-align: middle;
  transition: all 0.15s ease;
}

.btn-lesson-pick:hover {
  background: #0284c7;
  color: #ffffff;
}

.lesson-picker-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 8px;
  background: #ffffff;
}

.lesson-picker-row:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.l-picker-num {
  width: 26px;
  height: 26px;
  border-radius: 13px;
  background: #1e3a8a;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.82rem;
}

.l-picker-content {
  flex-grow: 1;
}

.l-picker-title {
  font-family: var(--font-battambang), sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  color: #0f172a;
}

.l-picker-month {
  font-size: 0.78rem;
  color: #64748b;
}

.lesson-picker-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lesson-picker-item:hover {
  background: #f0fdf4;
  border-color: #86efac;
}

.lesson-picker-item.highlight-month {
  background: #fefce8;
  border-color: #fde047;
}

.p-num {
  width: 26px;
  height: 26px;
  border-radius: 13px;
  background: #0d9488;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.82rem;
}

.p-title-wrap {
  flex-grow: 1;
}

.p-title {
  font-family: var(--font-battambang), sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  color: #0f172a;
}

.p-month {
  font-size: 0.78rem;
  color: #64748b;
}
"""

with open(r'C:\Users\PC\.gemini\antigravity\scratch\banloung-school-app\style.css', 'a', encoding='utf-8') as f:
    f.write(css_code)

print("Appended library CSS styles successfully!")
