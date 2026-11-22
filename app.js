/**
 * Ban Loung Primary School - Management System
 * កម្មវិធីគ្រប់គ្រងសាលាបឋមសិក្សា បាន្លួង
 * Full Application Logic (Dashboard, Student Roster, Attendance, Scores, Teachers, Exam Rooms)
 */

// Application State
const _initDate = new Date();
const _initYear = _initDate.getFullYear();
const _initMonth = _initDate.getMonth() + 1;
const _initDay = _initDate.getDate();
const _initDateStr = `${_initYear}-${String(_initMonth).padStart(2, '0')}-${String(_initDay).padStart(2, '0')}`;

const state = {
  db: null,
  activeYear: "២០២៦-២០២៧",
  activeClassId: null,
  activeTab: "dashboard",
  activeStudentSubTab: "students",
  activeAdminSubTab: "scores",
  searchQuery: "",
  genderFilter: "all",
  activeAttendanceDate: _initDateStr,
  activeAttendanceMonth: _initMonth,
  activeAttendanceYear: _initYear,
  activeScorePeriod: "ប្រចាំខែ",
  activeTraineeStudentNum: null,
  activeTraineePrintMode: "single",
  activeSemesterExtractSem: "1"
};
window.state = state;

// Global Undo History System (សម្រាប់ត្រឡប់ទិន្នន័យមកវិញ)
window._undoHistory = {
  students: {},       // classId -> array of snapshots
  dailyAtt: {},       // classId_date -> array of snapshots
  monthlyAtt: {}      // classId_yearMonth -> array of snapshots
};

// Initialize App
function initBanLoungApp() {
  // 1. Immediately start real-time system clock (so time is always ticking)
  try { initLiveClock(); } catch(e) { console.error("initLiveClock error:", e); }

  // 2. Load database with self-healing validation
  loadDatabase();
  setupNavigation();
  initSidebarResize();
  setupEventListeners();

  // 3. Initialize Authentication & Access Control System
  if (window.authSystem && typeof window.authSystem.init === "function") {
    window.authSystem.init();
  }

  // 4. Resolve saved active tab, subtabs, and academic year/class from hash, query param, or localStorage
  let initialTargetTab = "dashboard";
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hashVal = window.location.hash ? window.location.hash.substring(1).replace(/^[#/]+/, "") : null;
    const queryTab = urlParams.get("tab");
    const storedTab = localStorage.getItem("banloung_active_tab");
    const resolvedTab = hashVal || queryTab || storedTab;

    if (resolvedTab) {
      const ADMIN_ONLY_TABS = ["teachers", "exams", "reports", "school_monthly_report", "staff_info"];
      const isRestricted = ADMIN_ONLY_TABS.includes(resolvedTab) && window.authSystem && typeof window.authSystem.isAdmin === "function" && !window.authSystem.isAdmin();
      if (!isRestricted) {
        initialTargetTab = resolvedTab;
      }
    }

    const savedStudentSub = localStorage.getItem("banloung_active_student_subtab");
    if (savedStudentSub) state.activeStudentSubTab = savedStudentSub;
    const savedAdminSub = localStorage.getItem("banloung_active_admin_subtab");
    if (savedAdminSub) state.activeAdminSubTab = savedAdminSub;

    if (urlParams.get("traineeMode")) {
      state.activeTraineePrintMode = urlParams.get("traineeMode");
    }
    if (urlParams.get("sem")) {
      state.activeSemesterExtractSem = urlParams.get("sem");
    }
    if (urlParams.get("honorMonth")) {
      state.activeHonorMonth = urlParams.get("honorMonth");
    }
    if (urlParams.get("classId")) {
      state.activeClassId = urlParams.get("classId");
    } else if (urlParams.get("class")) {
      const clsParam = urlParams.get("class");
      const found = (state.db && state.db.classes ? state.db.classes : []).find(
        c => c.id === clsParam || c.grade === clsParam || c.name === clsParam
      );
      if (found) state.activeClassId = found.id;
    }
  } catch (e) {
    console.error("Error resolving initial tab state:", e);
  }

  const studentSubTabs = ["students", "attendance_daily", "attendance_monthly", "attendance_yearly"];
  const adminSubTabs = [
    "scores",
    "monthly_ranks",
    "honor_roll",
    "semester_ranks",
    "semester_scores",
    "semester_extract",
    "annual_ranks",
    "study_book",
    "trainee",
    "monthly_report"
  ];

  if (studentSubTabs.includes(initialTargetTab)) {
    state.activeTab = "students_management";
    state.activeStudentSubTab = initialTargetTab;
  } else if (adminSubTabs.includes(initialTargetTab)) {
    state.activeTab = "admin_tasks";
    state.activeAdminSubTab = initialTargetTab;
  } else {
    state.activeTab = initialTargetTab;
  }

  renderApp();

  if (initialTargetTab && typeof switchTab === "function") {
    try {
      switchTab(initialTargetTab);
    } catch (e) {
      console.error("Error activating initial target tab:", e);
    }
  }

  // Support browser Back / Forward history navigation
  if (!window._banloungHashListenerAdded) {
    window._banloungHashListenerAdded = true;
    window.addEventListener("hashchange", () => {
      try {
        const h = window.location.hash ? window.location.hash.substring(1).replace(/^[#/]+/, "") : null;
        if (h && typeof switchTab === "function") {
          if (h !== state.activeTab && h !== state.activeAdminSubTab && h !== state.activeStudentSubTab) {
            switchTab(h);
          }
        }
      } catch (e) {}
    });
  }
}

// Immediate + DOMContentLoaded execution guard
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBanLoungApp);
} else {
  initBanLoungApp();
}

// Universal Database Normalizer (Handles Firebase Objects, missing arrays, academic years)
function normalizeSchoolDatabase(db) {
  const getInit = () => {
    if (typeof INITIAL_SCHOOL_DATA !== "undefined" && INITIAL_SCHOOL_DATA) return INITIAL_SCHOOL_DATA;
    if (typeof window !== "undefined" && window.INITIAL_SCHOOL_DATA) return window.INITIAL_SCHOOL_DATA;
    return null;
  };
  const initData = getInit();

  if (!db || typeof db !== "object" || !db.classes) {
    db = initData ? JSON.parse(JSON.stringify(initData)) : {};
  }

  // 1. Ensure schoolInfo
  if (!db.schoolInfo || typeof db.schoolInfo !== "object") {
    db.schoolInfo = (initData && initData.schoolInfo)
      ? JSON.parse(JSON.stringify(initData.schoolInfo))
      : { currentAcademicYear: "២០២៦-២០២៧", academicYears: ["២០២៦-២០២៧", "២០២៧-២០២៨"] };
  }
  db.schoolInfo.currentAcademicYear = "២០២៦-២០២៧";
  db.schoolInfo.academicYears = ["២០២៦-២០២៧", "២០២៧-២០២៨"];

  // 2. Ensure classes array
  if (db.classes) {
    if (!Array.isArray(db.classes)) {
      db.classes = Object.values(db.classes);
    }
  } else {
    db.classes = [];
  }

  // If classes array is empty, restore from initData
  if (db.classes.length === 0 && initData && initData.classes) {
    db.classes = JSON.parse(JSON.stringify(initData.classes));
  }

  // Normalize each class
  db.classes.forEach(c => {
    if (!c.students) {
      c.students = [];
    } else if (!Array.isArray(c.students)) {
      c.students = Object.values(c.students);
    }
    if (!c.attendanceRecords || typeof c.attendanceRecords !== "object") {
      c.attendanceRecords = {};
    }
    if (!c.monthlyDates || typeof c.monthlyDates !== "object") {
      c.monthlyDates = {};
    }
    c.totalStudents = c.students.length;
    c.femaleStudents = c.students.filter(s => s.gender === "ស្រី").length;
    c.maleStudents = c.totalStudents - c.femaleStudents;
  });

  // Ensure 2026-2027 classes exist
  const y2026Classes = db.classes.filter(c => c.academicYear === "២០២៦-២០២៧");
  if (y2026Classes.length === 0 && window.INITIAL_SCHOOL_DATA && window.INITIAL_SCHOOL_DATA.classes) {
    const default2026 = window.INITIAL_SCHOOL_DATA.classes.filter(c => c.academicYear === "២០២៦-២០២៧");
    default2026.forEach(defCls => {
      db.classes.push(JSON.parse(JSON.stringify(defCls)));
    });
  }

  // Ensure CLS_G1 has 34 students if empty
  const g1Class = db.classes.find(c => c.id === 'CLS_G1' && c.academicYear === "២០២៦-២០២៧");
  if (g1Class && (!g1Class.students || g1Class.students.length === 0) && (initData?.classes || window.INITIAL_SCHOOL_DATA?.classes)) {
    const srcClasses = initData?.classes || window.INITIAL_SCHOOL_DATA?.classes || [];
    const initG1 = srcClasses.find(c => c.id === 'CLS_G1');
    if (initG1 && initG1.students && initG1.students.length > 0) {
      g1Class.students = JSON.parse(JSON.stringify(initG1.students));
      g1Class.totalStudents = g1Class.students.length;
      g1Class.femaleStudents = g1Class.students.filter(s => s.gender === "ស្រី").length;
      g1Class.maleStudents = g1Class.totalStudents - g1Class.femaleStudents;
    }
  }

  // Ensure all 2026-2027 classes (including Kindergarten) have complete semester scores, 12-subject extract data, and A-F mentions
  db.classes.forEach(c => {
    if (c.academicYear === "២០២៦-២០២៧" && c.students && c.students.length > 0) {
      const srcClasses = initData?.classes || window.INITIAL_SCHOOL_DATA?.classes || [];
      const initCls = srcClasses.find(ic => ic.id === c.id);

      const isExtractIncomplete = (cls) => {
        if (!cls.semesterExtractData || !cls.semesterExtractData["1"] || !cls.semesterExtractData["2"]) return true;
        const s1 = cls.semesterExtractData["1"];
        const keys = Object.keys(s1);
        if (keys.length === 0) return true;
        const first = s1[keys[0]];
        if (!first || !first.scores || Object.keys(first.scores).length < 12) return true;
        const m = (first.mention || "").trim().toUpperCase();
        if (!["A", "B", "C", "D", "E", "F"].includes(m)) return true;
        return false;
      };

      if (isExtractIncomplete(c) && initCls && initCls.semesterExtractData) {
        c.semesterExtractData = JSON.parse(JSON.stringify(initCls.semesterExtractData));
      }
      if ((!c.semesterScores || !c.semesterScores["1"] || Object.keys(c.semesterScores["1"]).length === 0) && initCls && initCls.semesterScores) {
        c.semesterScores = JSON.parse(JSON.stringify(initCls.semesterScores));
      }
      if ((!c.semesterExtractAnnual || Object.keys(c.semesterExtractAnnual).length === 0 || isExtractIncomplete(c)) && initCls && initCls.semesterExtractAnnual) {
        c.semesterExtractAnnual = JSON.parse(JSON.stringify(initCls.semesterExtractAnnual));
      }
      if ((!c.semesterExtractDates || Object.keys(c.semesterExtractDates).length === 0 || (c.semesterExtractDates["1"]?.solarTeacher?.includes("២០២៣"))) && initCls && initCls.semesterExtractDates) {
        c.semesterExtractDates = JSON.parse(JSON.stringify(initCls.semesterExtractDates));
      }

      // Convert any remaining Khmer mentions to A, B, C, D, E, F
      const toGradeLetterLocal = (val, avg) => {
        if (typeof val === "string" && val.trim()) {
          const v = val.trim().toUpperCase();
          if (["A", "B", "C", "D", "E", "F"].includes(v)) return v;
          if (v.includes("ល្អប្រសើរ")) return "A";
          if (v.includes("ល្អណាស់")) return "B";
          if (v.includes("ល្អបង្គួរ") || v === "ល្អ") return "C";
          if (v.includes("មធ្យម")) return "D";
          if (v.includes("ខ្សោយណាស់")) return "F";
          if (v.includes("ខ្សោយ")) return "E";
        }
        const a = parseFloat(avg) || 0;
        if (a >= 8.5) return "A";
        if (a >= 8.0) return "B";
        if (a >= 7.0) return "C";
        if (a >= 6.0) return "D";
        if (a >= 5.0) return "E";
        if (a > 0) return "F";
        return "C";
      };

      if (c.semesterExtractData) {
        ["1", "2"].forEach(sem => {
          if (c.semesterExtractData[sem]) {
            Object.keys(c.semesterExtractData[sem]).forEach(sNum => {
              const rec = c.semesterExtractData[sem][sNum];
              if (rec) {
                const stu = c.students.find(s => String(s.num) === String(sNum));
                rec.mention = toGradeLetterLocal(rec.mention, stu?.avgScore);
              }
            });
          }
        });
      }

      if (c.semesterExtractAnnual) {
        Object.keys(c.semesterExtractAnnual).forEach(sNum => {
          const rec = c.semesterExtractAnnual[sNum];
          if (rec) {
            const stu = c.students.find(s => String(s.num) === String(sNum));
            rec.annualMention = toGradeLetterLocal(rec.annualMention, stu?.avgScore);
          }
        });
      }
    }
  });

  // Ensure 2027-2028 classes exist
  const y2027Classes = db.classes.filter(c => c.academicYear === "២០២៧-២០២៨");
  if (y2027Classes.length === 0) {
    const classesFor2026 = db.classes.filter(c => c.academicYear === "២០២៦-២០២៧");
    classesFor2026.forEach(c => {
      db.classes.push({
        id: `CLS_2027_${c.grade}`.replace(/\s+/g, '_'),
        grade: c.grade,
        teacher: c.teacher,
        academicYear: "២០២៧-២០២៨",
        totalStudents: 0,
        femaleStudents: 0,
        maleStudents: 0,
        students: [],
        attendanceRecords: {},
        monthlyDates: {},
        solarDate: "បាន្លួង  ថ្ងៃទី  ០៨  ខែ វិច្ឆិកា ឆ្នាំ ២០២៧"
      });
    });
  }

  // 3. Ensure teachers array
  if (db.teachers) {
    if (!Array.isArray(db.teachers)) {
      db.teachers = Object.values(db.teachers);
    }
  } else {
    db.teachers = [];
  }
  if (db.teachers.length === 0 && window.INITIAL_SCHOOL_DATA && window.INITIAL_SCHOOL_DATA.teachers) {
    db.teachers = JSON.parse(JSON.stringify(window.INITIAL_SCHOOL_DATA.teachers));
  }

  // 3.1. Ensure staffList (ព័ត៌មានបុគ្គលិក ៩ នាក់ផ្លូវការ)
  if (db.staffList) {
    if (!Array.isArray(db.staffList)) {
      db.staffList = Object.values(db.staffList);
    }
  } else {
    db.staffList = [];
  }
  if (db.staffList.length === 0 && window.INITIAL_SCHOOL_DATA && window.INITIAL_SCHOOL_DATA.staffList) {
    db.staffList = JSON.parse(JSON.stringify(window.INITIAL_SCHOOL_DATA.staffList));
  }

  // 4. Ensure examRooms
  if (db.examRooms) {
    if (!Array.isArray(db.examRooms)) db.examRooms = Object.values(db.examRooms);
  } else {
    db.examRooms = [];
  }

  // 5. Ensure hpvList
  if (db.hpvList) {
    if (!Array.isArray(db.hpvList)) db.hpvList = Object.values(db.hpvList);
  } else {
    db.hpvList = [];
  }

  // 6. Ensure schoolProfile
  if (!db.schoolProfile || typeof db.schoolProfile !== "object") {
    db.schoolProfile = (window.INITIAL_SCHOOL_DATA && window.INITIAL_SCHOOL_DATA.schoolProfile)
      ? JSON.parse(JSON.stringify(window.INITIAL_SCHOOL_DATA.schoolProfile))
      : {};
  }

  return db;
}
window.normalizeSchoolDatabase = normalizeSchoolDatabase;

// Load Database with Self-Healing Fallback
function loadDatabase() {
  const saved = localStorage.getItem("banloung_school_db");
  let parsedDb = null;
  if (saved) {
    try {
      parsedDb = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved database:", e);
    }
  }

  // Normalize
  state.db = normalizeSchoolDatabase(parsedDb);

  // Safety Check: If total students in 2026-2027 is 0, restore authentic 233 students
  const totalSt2026 = state.db.classes
    .filter(c => c.academicYear === "២០២៦-២០២៧")
    .reduce((sum, c) => sum + (c.students ? c.students.length : 0), 0);

  if (totalSt2026 === 0 && window.INITIAL_SCHOOL_DATA) {
    console.warn("Detected 0 students in 2026-2027. Restoring authentic 233 students from INITIAL_SCHOOL_DATA!");
    state.db = normalizeSchoolDatabase(JSON.parse(JSON.stringify(window.INITIAL_SCHOOL_DATA)));
  }

  // Save clean state to localStorage
  try {
    localStorage.setItem("banloung_school_db", JSON.stringify(state.db));
  } catch (e) {}

  // Restore saved academic year if valid
  try {
    const savedYear = localStorage.getItem("banloung_active_year");
    if (savedYear && state.db.schoolInfo && state.db.schoolInfo.academicYears && state.db.schoolInfo.academicYears.includes(savedYear)) {
      state.activeYear = savedYear;
    }
  } catch (e) {}

  // Set default active class
  const currentClasses = getClassesForYear(state.activeYear);
  if (currentClasses.length > 0) {
    let savedClassId = null;
    try {
      savedClassId = localStorage.getItem("banloung_active_class_id");
    } catch (e) {}
    const validSaved = savedClassId && currentClasses.find(c => c.id === savedClassId);
    const withStudents = currentClasses.find(c => c.students && c.students.length > 0);
    state.activeClassId = validSaved ? validSaved.id : (withStudents ? withStudents.id : currentClasses[0].id);

    // Align active class with logged in teacher if applicable
    if (window.authSystem && typeof window.authSystem.isAdmin === "function" && !window.authSystem.isAdmin()) {
      const allowedGrade = window.authSystem.getAllowedGrade();
      if (allowedGrade) {
        const teacherCls = currentClasses.find(c => c.grade === allowedGrade);
        if (teacherCls) {
          state.activeClassId = teacherCls.id;
        }
      }
    }

    const activeCls = getActiveClass();
    if (activeCls) {
      ensureDefaultMonthlyAttendance(activeCls, state.activeAttendanceYear, state.activeAttendanceMonth);
    }
  }

  // Connect and sync with Firebase Realtime Database
  if (window.firebaseSync && typeof window.firebaseSync.initSync === "function") {
    window.firebaseSync.initSync({
      onInitialData: (cloudData) => {
        // Local-First: If local has pending offline edits, do NOT let cloud overwrite them!
        if (window.firebaseSync && typeof window.firebaseSync.hasPendingSync === "function" && window.firebaseSync.hasPendingSync()) {
          console.log("[FirebaseSync] Local has pending offline changes on startup. Flushing local changes to cloud!");
          window.firebaseSync.flushPendingQueue();
          return;
        }

        if (cloudData) {
          const normalized = normalizeSchoolDatabase(cloudData);
          const cloudStCount = normalized.classes
            .filter(c => c.academicYear === "២០២៦-២០២៧")
            .reduce((sum, c) => sum + (c.students ? c.students.length : 0), 0);

          if (cloudStCount > 0) {
            state.db = normalized;
            try { localStorage.setItem("banloung_school_db", JSON.stringify(state.db)); } catch(e){}
            renderApp();
          } else {
            console.warn("[FirebaseSync] Cloud had 0 students. Seeding cloud with authentic 233 students!");
            window.firebaseSync.saveToCloud(state.db, true);
          }
        }
      },
      onRemoteUpdate: (cloudData) => {
        // Local-First: If local has pending offline edits, ignore remote overwrite to preserve user's work
        if (window.firebaseSync && typeof window.firebaseSync.hasPendingSync === "function" && window.firebaseSync.hasPendingSync()) {
          console.log("[FirebaseSync] Remote update arrived while local has un-synced edits. Preserving local edits.");
          return;
        }

        if (cloudData) {
          const normalized = normalizeSchoolDatabase(cloudData);
          const cloudStCount = normalized.classes
            .filter(c => c.academicYear === "២០២៦-២០២៧")
            .reduce((sum, c) => sum + (c.students ? c.students.length : 0), 0);
          const localStCount = (state.db && state.db.classes)
            ? state.db.classes.filter(c => c.academicYear === "២០២៦-២០២៧").reduce((sum, c) => sum + (c.students ? c.students.length : 0), 0)
            : 0;

          if (cloudStCount === 0 && localStCount > 0) {
            console.warn("[FirebaseSync] Ignoring remote update with 0 students while local has", localStCount);
            window.firebaseSync.saveToCloud(state.db, true);
            return;
          }

          state.db = normalized;
          try { localStorage.setItem("banloung_school_db", JSON.stringify(state.db)); } catch(e){}
          const activeEl = document.activeElement;
          const isTyping = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
          if (!isTyping) {
            renderApp();
          }
        }
      },
      getLocalData: () => state.db || INITIAL_SCHOOL_DATA
    });
  }
}

function saveDatabase() {
  if (!state.db) return;

  // 1. Ensure sync metadata timestamp is updated
  state.db._syncMeta = state.db._syncMeta || {};
  state.db._syncMeta.lastUpdatedAt = new Date().toISOString();
  state.db._syncMeta.clientApp = "banloung-school-app";
  state.db._syncMeta.schoolName = "សាលាបឋមសិក្សា បាន្លួង";

  // 2. Synchronously save whole latest DB to localStorage immediately (Local-First Guarantee)
  try {
    localStorage.setItem("banloung_school_db", JSON.stringify(state.db));
  } catch (e) {
    console.error("[LocalFirst] Storage save error:", e);
  }

  // 3. Local-First Pending Sync Queue (records all offline/pending edits)
  if (window.firebaseSync && typeof window.firebaseSync.enqueuePendingUpdate === "function") {
    window.firebaseSync.enqueuePendingUpdate(state.db);
  }

  // 4. If running with backend server, sync to backend file
  if (typeof window !== "undefined" && window.location && window.location.protocol.startsWith("http")) {
    fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.db)
    }).catch(() => {
      // Silent catch: offline or static server mode
    });
  }

  // 5. Sync to Firebase Realtime Database
  if (window.firebaseSync && typeof window.firebaseSync.saveToCloud === "function") {
    window.firebaseSync.saveToCloud(state.db);
  }
}

function getClassesForYear(year) {
  if (!state.db || !state.db.classes) return [];
  return state.db.classes.filter(c => c.academicYear === year);
}

function getActiveClass() {
  if (!state.db || !state.db.classes) return null;

  // If logged in as teacher (non-admin), ensure active class is locked to their assigned grade
  if (window.authSystem && typeof window.authSystem.isAdmin === "function" && !window.authSystem.isAdmin()) {
    const allowedGrade = window.authSystem.getAllowedGrade();
    if (allowedGrade) {
      const current = state.db.classes.find(c => c.id === state.activeClassId);
      if (!current || current.grade !== allowedGrade) {
        const teacherClass = state.db.classes.find(c => c.grade === allowedGrade && c.academicYear === state.activeYear)
                           || state.db.classes.find(c => c.grade === allowedGrade);
        if (teacherClass) {
          state.activeClassId = teacherClass.id;
          return teacherClass;
        }
      }
    }
  }

  return state.db.classes.find(c => c.id === state.activeClassId) || null;
}

// Navigation & Tab Switching
function setupNavigation() {
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const tab = link.getAttribute("data-tab");
      if (tab === "students_management") {
        toggleStudentsHub(e);
      } else if (tab === "admin_tasks") {
        toggleAdminTasksHub(e);
      } else if (tab) {
        switchTab(tab);
      }
    });
  });

  document.querySelectorAll(".nav-sublink").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const subtab = link.getAttribute("data-subtab");
      if (subtab) {
        const studentSubTabs = ["students", "attendance_daily", "attendance_monthly", "attendance_yearly"];
        if (studentSubTabs.includes(subtab)) {
          const navItem = document.getElementById("navItemStudentsHub");
          if (navItem) navItem.classList.add("expanded");
          switchStudentSubTab(subtab);
        } else {
          const navItem = document.getElementById("navItemAdminTasksHub");
          if (navItem) navItem.classList.add("expanded");
          switchAdminSubTab(subtab);
        }
      }
    });
  });

  const yearSelect = document.getElementById("yearSelector");
  if (yearSelect) {
    const years = (state.db && state.db.schoolInfo && state.db.schoolInfo.academicYears) || ["២០២៦-២០២៧", "២០២៧-២០២៨"];
    yearSelect.innerHTML = years.map(y => `<option value="${y}" ${y === state.activeYear ? 'selected' : ''}>${y}</option>`).join("");
    yearSelect.value = state.activeYear;
    yearSelect.addEventListener("change", e => {
      state.activeYear = e.target.value;
      try { localStorage.setItem("banloung_active_year", state.activeYear); } catch (e) {}
      const classes = getClassesForYear(state.activeYear);
      if (classes.length > 0) {
        state.activeClassId = classes[0].id;
        try { localStorage.setItem("banloung_active_class_id", state.activeClassId); } catch (e) {}
      } else {
        state.activeClassId = null;
      }
      renderApp();
    });
  }


}

/**
 * Sidebar Expand / Collapse & Resizing Controller
 * អនុញ្ញាតឱ្យលោកគ្រូ/អ្នកគ្រូអាចពង្រីក ឬបង្រួមផ្ទាំងមីនុយបានតាមចិត្ត (Drag to resize / Toggle collapse)
 */
function initSidebarResize() {
  const sidebar = document.querySelector(".sidebar") || document.getElementById("appSidebar");
  if (!sidebar) return;

  const resizer = document.getElementById("sidebarResizer");
  const toggleBtn = document.getElementById("btnSidebarToggle");
  const topbarToggle = document.getElementById("btnTopbarSidebarToggle");
  const toggleIcon = document.getElementById("sidebarToggleIcon");

  const MIN_WIDTH = 68;
  const DEFAULT_WIDTH = 270;
  const MAX_WIDTH = 500;
  const COLLAPSED_WIDTH = 72;

  // Restore saved width / collapsed state from localStorage
  const savedWidth = localStorage.getItem("banloung_sidebar_width");
  const savedCollapsed = localStorage.getItem("banloung_sidebar_collapsed") === "true";

  if (savedCollapsed) {
    sidebar.classList.add("collapsed");
    sidebar.style.width = `${COLLAPSED_WIDTH}px`;
    if (toggleIcon) toggleIcon.className = "fa-solid fa-chevron-right";
  } else if (savedWidth) {
    const w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parseInt(savedWidth, 10)));
    sidebar.style.width = `${w}px`;
    if (w <= 85) {
      sidebar.classList.add("collapsed");
      if (toggleIcon) toggleIcon.className = "fa-solid fa-chevron-right";
    }
  }

  // Toggle Function
  window.toggleSidebar = function() {
    const isCollapsed = sidebar.classList.contains("collapsed");
    if (isCollapsed) {
      sidebar.classList.remove("collapsed");
      const restoreWidth = parseInt(localStorage.getItem("banloung_sidebar_prev_width"), 10) || DEFAULT_WIDTH;
      sidebar.style.width = `${Math.max(180, restoreWidth)}px`;
      if (toggleIcon) toggleIcon.className = "fa-solid fa-chevron-left";
      localStorage.setItem("banloung_sidebar_collapsed", "false");
      localStorage.setItem("banloung_sidebar_width", sidebar.style.width.replace("px", ""));
    } else {
      const curW = parseInt(sidebar.style.width || "270", 10);
      if (curW > 100) {
        localStorage.setItem("banloung_sidebar_prev_width", String(curW));
      }
      sidebar.classList.add("collapsed");
      sidebar.style.width = `${COLLAPSED_WIDTH}px`;
      if (toggleIcon) toggleIcon.className = "fa-solid fa-chevron-right";
      localStorage.setItem("banloung_sidebar_collapsed", "true");
    }
  };

  // Adjust width by delta (e.g. +25px or -25px)
  window.adjustSidebarWidth = function(delta) {
    sidebar.classList.remove("collapsed");
    if (toggleIcon) toggleIcon.className = "fa-solid fa-chevron-left";
    let curW = parseInt(sidebar.style.width || "270", 10);
    if (isNaN(curW)) curW = DEFAULT_WIDTH;
    let newW = Math.max(180, Math.min(MAX_WIDTH, curW + delta));
    sidebar.style.width = `${newW}px`;
    localStorage.setItem("banloung_sidebar_width", String(newW));
    localStorage.setItem("banloung_sidebar_prev_width", String(newW));
    localStorage.setItem("banloung_sidebar_collapsed", "false");
  };

  // Reset to default width (270px)
  window.resetSidebarWidth = function() {
    sidebar.classList.remove("collapsed");
    if (toggleIcon) toggleIcon.className = "fa-solid fa-chevron-left";
    sidebar.style.width = `${DEFAULT_WIDTH}px`;
    localStorage.setItem("banloung_sidebar_width", String(DEFAULT_WIDTH));
    localStorage.setItem("banloung_sidebar_prev_width", String(DEFAULT_WIDTH));
    localStorage.setItem("banloung_sidebar_collapsed", "false");
  };

  // Draggable Edge Handler (Drag to resize freely)
  if (resizer) {
    let isResizing = false;
    let startX = 0;
    let startW = 0;

    resizer.addEventListener("mousedown", function(e) {
      isResizing = true;
      startX = e.clientX;
      startW = sidebar.getBoundingClientRect().width;
      sidebar.classList.add("is-resizing");
      resizer.classList.add("is-dragging");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", function(e) {
      if (!isResizing) return;
      const deltaX = e.clientX - startX;
      let newW = startW + deltaX;

      if (newW < 120) {
        // Snap to collapsed icon-only mode
        sidebar.classList.add("collapsed");
        sidebar.style.width = `${COLLAPSED_WIDTH}px`;
        if (toggleIcon) toggleIcon.className = "fa-solid fa-chevron-right";
      } else {
        sidebar.classList.remove("collapsed");
        newW = Math.min(MAX_WIDTH, Math.max(180, newW));
        sidebar.style.width = `${newW}px`;
        if (toggleIcon) toggleIcon.className = "fa-solid fa-chevron-left";
      }
    });

    document.addEventListener("mouseup", function() {
      if (!isResizing) return;
      isResizing = false;
      sidebar.classList.remove("is-resizing");
      resizer.classList.remove("is-dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      const finalW = parseInt(sidebar.style.width, 10);
      if (sidebar.classList.contains("collapsed")) {
        localStorage.setItem("banloung_sidebar_collapsed", "true");
      } else {
        localStorage.setItem("banloung_sidebar_collapsed", "false");
        localStorage.setItem("banloung_sidebar_width", String(finalW));
        localStorage.setItem("banloung_sidebar_prev_width", String(finalW));
      }
    });

    // Touch support for tablets/touchscreens
    resizer.addEventListener("touchstart", function(e) {
      if (e.touches.length !== 1) return;
      isResizing = true;
      startX = e.touches[0].clientX;
      startW = sidebar.getBoundingClientRect().width;
      sidebar.classList.add("is-resizing");
      resizer.classList.add("is-dragging");
    }, { passive: true });

    document.addEventListener("touchmove", function(e) {
      if (!isResizing || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - startX;
      let newW = startW + deltaX;
      if (newW < 120) {
        sidebar.classList.add("collapsed");
        sidebar.style.width = `${COLLAPSED_WIDTH}px`;
        if (toggleIcon) toggleIcon.className = "fa-solid fa-chevron-right";
      } else {
        sidebar.classList.remove("collapsed");
        newW = Math.min(MAX_WIDTH, Math.max(180, newW));
        sidebar.style.width = `${newW}px`;
        if (toggleIcon) toggleIcon.className = "fa-solid fa-chevron-left";
      }
    }, { passive: true });

    document.addEventListener("touchend", function() {
      if (!isResizing) return;
      isResizing = false;
      sidebar.classList.remove("is-resizing");
      resizer.classList.remove("is-dragging");
      const finalW = parseInt(sidebar.style.width, 10);
      if (sidebar.classList.contains("collapsed")) {
        localStorage.setItem("banloung_sidebar_collapsed", "true");
      } else {
        localStorage.setItem("banloung_sidebar_collapsed", "false");
        localStorage.setItem("banloung_sidebar_width", String(finalW));
        localStorage.setItem("banloung_sidebar_prev_width", String(finalW));
      }
    });
  }


}

/**
 * Toggle គ្រប់គ្រងសិស្ស Submenu
 * ពេលចុចលើកទី១ គឺបើកបង្ហាញ (Open & Show)
 * តែពេលចុចម្ដងទៀត ត្រូវតែលាក់វិញ (Hide & Collapse)
 */
function toggleStudentsHub(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const navItem = document.getElementById("navItemStudentsHub");
  if (!navItem) return;

  const isExpanded = navItem.classList.contains("expanded");

  if (!isExpanded) {
    // លើកទី១៖ បើកបង្ហាញ (Open & Show)
    navItem.classList.add("expanded");
    switchTab("students_management");
  } else {
    // ពេលចុចម្ដងទៀត៖ លាក់វិញ (Hide & Collapse)
    navItem.classList.remove("expanded");
  }
}

/**
 * Toggle កិច្ចការរដ្ឋបាល Submenu
 */
function toggleAdminTasksHub(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const navItem = document.getElementById("navItemAdminTasksHub");
  if (!navItem) return;

  const isExpanded = navItem.classList.contains("expanded");

  if (!isExpanded) {
    navItem.classList.add("expanded");
    switchTab("admin_tasks");
  } else {
    navItem.classList.remove("expanded");
  }
}
window.toggleAdminTasksHub = toggleAdminTasksHub;

/**
 * Switch Sub-Tab inside គ្រប់គ្រងសិស្ស (Student Management)
 * @param {string} subTabId ('students', 'attendance_daily', 'attendance_monthly', 'attendance_yearly')
 * @param {boolean} ensureExpanded
 */
function switchStudentSubTab(subTabId, ensureExpanded = true) {
  state.activeTab = "students_management";
  state.activeStudentSubTab = subTabId;

  // Persist to localStorage and URL hash
  try {
    localStorage.setItem("banloung_active_tab", subTabId);
    localStorage.setItem("banloung_active_student_subtab", subTabId);
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#" + subTabId);
    }
  } catch (e) {}

  // 1. Activate tab-students_management pane
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.toggle("active", p.id === "tab-students_management");
  });

  // 2. Activate sidebar parent item and expand submenu
  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.getAttribute("data-tab") === "students_management");
  });
  const navItem = document.getElementById("navItemStudentsHub");
  if (navItem && ensureExpanded) navItem.classList.add("expanded");

  const adminNav = document.getElementById("navItemAdminTasksHub");
  if (adminNav) adminNav.classList.remove("expanded");

  // 3. Activate sidebar sublinks
  document.querySelectorAll("#navItemStudentsHub .nav-sublink").forEach(l => {
    l.classList.toggle("active", l.getAttribute("data-subtab") === subTabId);
  });

  // 4. Toggle subpanes display
  const subpanes = [
    { id: "subpane-students", subTab: "students" },
    { id: "subpane-attendance_daily", subTab: "attendance_daily" },
    { id: "subpane-attendance_monthly", subTab: "attendance_monthly" },
    { id: "subpane-attendance_yearly", subTab: "attendance_yearly" }
  ];

  subpanes.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      if (item.subTab === subTabId) {
        el.style.display = "block";
        el.classList.add("active");
      } else {
        el.style.display = "none";
        el.classList.remove("active");
      }
    }
  });

  // 6. Update Page Title
  const titleElem = document.getElementById("pageTitle");
  if (titleElem) {
    const subTitles = {
      students: "បញ្ជីឈ្មោះសិស្ស (Student Roster)",
      attendance_daily: "វត្តមានសិស្សប្រចាំថ្ងៃ (Daily Attendance)",
      attendance_monthly: "វត្តមានសិស្សប្រចាំខែ (Monthly Attendance)",
      attendance_yearly: "តារាងស្រង់អវត្តមានសិស្សប្រចាំឆ្នាំ (Yearly Attendance)"
    };
    titleElem.innerText = `គ្រប់គ្រងសិស្ស — ${subTitles[subTabId] || "បញ្ជីឈ្មោះសិស្ស"}`;
  }

  // 7. Update body attributes and scoped classes for print and CSS
  document.body.setAttribute("data-active-tab", subTabId);
  document.body.classList.remove(
    "tab-scores-active",
    "tab-honor_roll-active",
    "tab-monthly_ranks-active",
    "tab-semester_ranks-active",
    "tab-semester_scores-active",
    "tab-semester_extract-active",
    "tab-annual_ranks-active",
    "tab-study_book-active",
    "tab-trainee-active",
    "tab-monthly_report-active",
    "tab-school_monthly_report-active",
    "tab-staff_info-active",
    "tab-teachers-active",
    "tab-exams-active",
    "tab-reports-active",
    "tab-classes-active",
    "tab-students-active",
    "tab-attendance_daily-active",
    "tab-attendance_monthly-active",
    "tab-attendance_yearly-active"
  );
  document.body.classList.add("tab-students_management-active");
  document.body.classList.add(`tab-${subTabId}-active`);

  // 8. Enforce correct print orientation per subtab (A4 Landscape)
  let styleEl = document.getElementById("printPageOrientationStyle");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "printPageOrientationStyle";
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = `
    @page {
      size: A4 landscape !important;
      margin: 4mm 6mm !important;
    }
  `;

  // 9. Auto-sync attendance parameters if monthly or daily
  if (subTabId === "attendance_monthly") {
    if (state.activeAttendanceDate) {
      const parts = state.activeAttendanceDate.split("-");
      if (parts.length === 3) {
        state.activeAttendanceYear = parseInt(parts[0], 10);
        state.activeAttendanceMonth = parseInt(parts[1], 10);
        const mSel = document.getElementById("monthlyMonthSelect");
        if (mSel) mSel.value = String(state.activeAttendanceMonth);
        const ySel = document.getElementById("monthlyYearSelect");
        if (ySel) ySel.value = String(state.activeAttendanceYear);
      }
    }
    const currentClass = getActiveClass();
    if (currentClass) {
      ensureDefaultMonthlyAttendance(currentClass, state.activeAttendanceYear, state.activeAttendanceMonth);
      if (state.activeAttendanceDate) {
        syncMonthlyAttendanceForClass(currentClass, state.activeAttendanceDate);
      }
    }
    renderMonthlyAttendance();
  } else if (subTabId === "attendance_daily") {
    const attDate = document.getElementById("attDatePicker");
    if (attDate && state.activeAttendanceDate) {
      attDate.value = state.activeAttendanceDate;
    }
    renderDailyAttendance();
  } else if (subTabId === "students") {
    renderStudentsRoster();
  } else if (subTabId === "attendance_yearly") {
    renderYearlyAttendance();
  }
}

/**
 * Global Helper: Prepare Student Sub-Tab for Clean Official Print
 * @param {string} subTabId
 */
function prepareStudentSubTabForPrint(subTabId) {
  if (!subTabId) subTabId = state.activeStudentSubTab || "students";
  state.activeTab = "students_management";
  state.activeStudentSubTab = subTabId;

  // Set body scoped attributes and classes
  document.body.setAttribute("data-active-tab", subTabId);
  document.body.classList.remove(
    "tab-scores-active",
    "tab-honor_roll-active",
    "tab-monthly_ranks-active",
    "tab-semester_ranks-active",
    "tab-semester_scores-active",
    "tab-semester_extract-active",
    "tab-annual_ranks-active",
    "tab-study_book-active",
    "tab-trainee-active",
    "tab-monthly_report-active",
    "tab-school_monthly_report-active",
    "tab-staff_info-active",
    "tab-teachers-active",
    "tab-exams-active",
    "tab-reports-active",
    "tab-classes-active",
    "tab-students-active",
    "tab-attendance_daily-active",
    "tab-attendance_monthly-active",
    "tab-attendance_yearly-active"
  );
  document.body.classList.add("tab-students_management-active");
  document.body.classList.add(`tab-${subTabId}-active`);

  // Set print page orientation to landscape
  let styleEl = document.getElementById("printPageOrientationStyle");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "printPageOrientationStyle";
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = `
    @page {
      size: A4 landscape !important;
      margin: 4mm 6mm !important;
    }
  `;

  // Ensure tab-students_management section is strictly active
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.toggle("active", p.id === "tab-students_management");
  });

  // Ensure target subpane is active and displayed, others hidden
  const subpanes = [
    { id: "subpane-students", subTab: "students" },
    { id: "subpane-attendance_daily", subTab: "attendance_daily" },
    { id: "subpane-attendance_monthly", subTab: "attendance_monthly" },
    { id: "subpane-attendance_yearly", subTab: "attendance_yearly" }
  ];
  subpanes.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      if (item.subTab === subTabId) {
        el.style.display = "block";
        el.classList.add("active");
      } else {
        el.style.display = "none";
        el.classList.remove("active");
      }
    }
  });

  // Ensure content is rendered
  if (subTabId === "students") {
    renderStudentsRoster();
  } else if (subTabId === "attendance_daily") {
    renderDailyAttendance();
  } else if (subTabId === "attendance_monthly") {
    renderMonthlyAttendance();
  } else if (subTabId === "attendance_yearly") {
    renderYearlyAttendance();
  }
}
window.prepareStudentSubTabForPrint = prepareStudentSubTabForPrint;

// Official Print Actions for Student Management Sub-tabs
function printDailyAttendance() {
  prepareStudentSubTabForPrint("attendance_daily");
  window.print();
}
window.printDailyAttendance = printDailyAttendance;

function printMonthlyAttendance() {
  prepareStudentSubTabForPrint("attendance_monthly");
  window.print();
}
window.printMonthlyAttendance = printMonthlyAttendance;

/**
 * Switch Sub-Tab inside កិច្ចការរដ្ឋបាល (Administrative Tasks Hub)
 * @param {string} subTabId
 * @param {boolean} ensureExpanded
 */
function switchAdminSubTab(subTabId, ensureExpanded = true) {
  state.activeTab = "admin_tasks";
  state.activeAdminSubTab = subTabId;

  // Persist to localStorage and URL hash
  try {
    localStorage.setItem("banloung_active_tab", subTabId);
    localStorage.setItem("banloung_active_admin_subtab", subTabId);
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#" + subTabId);
    }
  } catch (e) {}

  // 1. Activate tab-admin_tasks pane
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.toggle("active", p.id === "tab-admin_tasks");
  });

  // 2. Activate sidebar parent item and expand submenu
  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.getAttribute("data-tab") === "admin_tasks");
  });
  const navItem = document.getElementById("navItemAdminTasksHub");
  if (navItem && ensureExpanded) navItem.classList.add("expanded");

  const studentsNav = document.getElementById("navItemStudentsHub");
  if (studentsNav) studentsNav.classList.remove("expanded");

  // 3. Activate sidebar sublinks
  document.querySelectorAll("#navItemAdminTasksHub .nav-sublink").forEach(l => {
    l.classList.toggle("active", l.getAttribute("data-subtab") === subTabId);
  });

  // 4. Activate top hub pills
  document.querySelectorAll(".admin-pill").forEach(pill => {
    pill.classList.toggle("active", pill.getAttribute("data-subtab") === subTabId);
  });

  // 5. Toggle subpanes display
  const adminSubpanes = [
    { id: "tab-scores", subTab: "scores" },
    { id: "tab-monthly_ranks", subTab: "monthly_ranks" },
    { id: "tab-honor_roll", subTab: "honor_roll" },
    { id: "tab-semester_ranks", subTab: "semester_ranks" },
    { id: "tab-semester_scores", subTab: "semester_scores" },
    { id: "tab-semester_extract", subTab: "semester_extract" },
    { id: "tab-annual_ranks", subTab: "annual_ranks" },
    { id: "tab-study_book", subTab: "study_book" },
    { id: "tab-trainee", subTab: "trainee" },
    { id: "tab-monthly_report", subTab: "monthly_report" }
  ];

  adminSubpanes.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      if (item.subTab === subTabId) {
        el.style.display = "block";
        el.classList.add("active");
      } else {
        el.style.display = "none";
        el.classList.remove("active");
      }
    }
  });

  // 6. Set body attributes and scoped classes for print and CSS
  document.body.setAttribute("data-active-tab", subTabId);
  document.body.classList.remove(
    "tab-scores-active",
    "tab-honor_roll-active",
    "tab-monthly_ranks-active",
    "tab-semester_ranks-active",
    "tab-semester_scores-active",
    "tab-semester_extract-active",
    "tab-annual_ranks-active",
    "tab-study_book-active",
    "tab-trainee-active",
    "tab-monthly_report-active"
  );
  document.body.classList.add(`tab-${subTabId}-active`);

  // 7. Enforce correct print orientation per subtab
  let styleEl = document.getElementById("printPageOrientationStyle");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "printPageOrientationStyle";
    document.head.appendChild(styleEl);
  }
  if (
    subTabId === "study_book" ||
    subTabId === "trainee" ||
    subTabId === "scores" ||
    subTabId === "semester_scores" ||
    subTabId === "semester_extract"
  ) {
    styleEl.innerHTML = `
      @page {
        size: A4 landscape !important;
        margin: 4mm 5mm !important;
      }
    `;
  } else {
    styleEl.innerHTML = `
      @page {
        size: A4 portrait !important;
        margin: 6mm 8mm !important;
      }
    `;
  }

  // 8. Update Page Title
  const titleElem = document.getElementById("pageTitle");
  if (titleElem) {
    const subTitles = {
      scores: "សម្រង់ពិន្ទុប្រចាំខែ (Monthly Score Sheet)",
      monthly_ranks: "ចំណាត់ថ្នាក់ប្រចាំខែ (Monthly Rankings)",
      honor_roll: "តារាងកិត្តិយស (Honor Roll)",
      semester_ranks: "ចំណាត់ថ្នាក់ប្រចាំឆមាស (Semester Rankings)",
      semester_scores: "សម្រង់ពិន្ទុឆមាស (Semester Score Sheet)",
      semester_extract: "សម្រង់ពិន្ទុ ប្រចាំឆមាស (Semester Score Summary Sheet)",
      annual_ranks: "ចំណាត់ថ្នាក់ប្រចាំឆ្នាំ (Annual Rankings)",
      study_book: "សៀវភៅតាមដានការសិក្សា (Study Tracking Book)",
      trainee: "សៀវភៅសិក្ខាគារិក (Trainee Record Book)",
      monthly_report: "របាយការណ៍ប្រចាំខែ (Monthly Teacher Report)"
    };
    titleElem.innerText = `កិច្ចការរដ្ឋបាល — ${subTitles[subTabId] || "សម្រង់ពិន្ទុប្រចាំខែ"}`;
  }

  // 9. Dispatch active subtab render
  switch (subTabId) {
    case "scores":
      renderScores();
      break;
    case "monthly_ranks":
      renderMonthlyRanks();
      break;
    case "honor_roll":
      renderHonorRoll();
      break;
    case "semester_ranks":
      renderSemesterRanks();
      break;
    case "semester_scores":
      renderSemesterScores();
      break;
    case "semester_extract":
      renderSemesterExtract();
      break;
    case "annual_ranks":
      renderAnnualRanks();
      break;
    case "study_book":
      renderStudyBook();
      break;
    case "trainee":
      renderTraineeBook();
      break;
    case "monthly_report":
      renderMonthlyReport();
      break;

  }
}
window.switchAdminSubTab = switchAdminSubTab;

function switchTab(tabId) {
  // Admin-Only Tabs Protection
  const ADMIN_ONLY_TABS = ["teachers", "exams", "reports", "school_monthly_report", "staff_info"];
  if (ADMIN_ONLY_TABS.includes(tabId) && window.authSystem && typeof window.authSystem.isAdmin === "function" && !window.authSystem.isAdmin()) {
    window.authSystem.promptAdminAccess(tabId, () => {
      switchTab(tabId);
    });
    return;
  }

  const studentSubTabs = ["students", "attendance_daily", "attendance_monthly", "attendance_yearly"];
  const adminSubTabs = [
    "scores",
    "monthly_ranks",
    "honor_roll",
    "semester_ranks",
    "semester_scores",
    "semester_extract",
    "annual_ranks",
    "study_book",
    "trainee",
    "monthly_report"
  ];

  if (studentSubTabs.includes(tabId)) {
    switchStudentSubTab(tabId);
    return;
  }

  if (tabId === "students_management") {
    switchStudentSubTab(state.activeStudentSubTab || "students", true);
    return;
  }

  if (adminSubTabs.includes(tabId)) {
    switchAdminSubTab(tabId);
    return;
  }

  if (tabId === "admin_tasks") {
    switchAdminSubTab(state.activeAdminSubTab || "scores", true);
    return;
  }

  // Normal tab switching (dashboard, teachers, exams, reports)
  state.activeTab = tabId;

  // Persist to localStorage and URL hash
  try {
    localStorage.setItem("banloung_active_tab", tabId);
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#" + tabId);
    }
  } catch (e) {}

  const navItem = document.getElementById("navItemStudentsHub");
  if (navItem) navItem.classList.remove("expanded");
  const adminNavItem = document.getElementById("navItemAdminTasksHub");
  if (adminNavItem) adminNavItem.classList.remove("expanded");

  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.getAttribute("data-tab") === tabId);
  });
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.toggle("active", p.id === `tab-${tabId}`);
  });

  // Set body class and data-active-tab for scoped CSS and Print orientation
  document.body.setAttribute("data-active-tab", tabId);
  document.body.classList.remove("tab-honor_roll-active", "tab-monthly_ranks-active", "tab-semester_ranks-active", "tab-semester_scores-active", "tab-semester_extract-active", "tab-annual_ranks-active", "tab-study_book-active", "tab-trainee-active");
  document.body.classList.add(`tab-${tabId}-active`);

  // Enforce correct print orientation style per tab
  let styleEl = document.getElementById("printPageOrientationStyle");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "printPageOrientationStyle";
    document.head.appendChild(styleEl);
  }
  if (tabId === "school_monthly_report") {
    const isPortrait = (window.schoolReportState && window.schoolReportState.activeSheet === "បូកសរុបអប់រំ");
    if (isPortrait) {
      styleEl.innerHTML = `
        @page {
          size: A4 portrait !important;
          margin: 8mm 10mm !important;
        }
      `;
    } else {
      styleEl.innerHTML = `
        @page {
          size: A4 landscape !important;
          margin: 6mm 8mm !important;
        }
      `;
    }
  } else if (tabId === "staff_info" || tabId === "study_book" || tabId === "trainee" || tabId === "scores" || tabId === "semester_scores" || tabId === "semester_extract") {
    styleEl.innerHTML = `
      @page {
        size: A4 landscape !important;
        margin: 4mm 5mm !important;
      }
    `;
  } else {
    styleEl.innerHTML = `
      @page {
        size: A4 portrait !important;
        margin: 6mm 8mm !important;
      }
    `;
  }

  // Update Page Title
  const titles = {
    dashboard: "ផ្ទាំងគ្រប់គ្រងរួម (Dashboard)",
    scores: "សម្រង់ពិន្ទុប្រចាំខែ (Monthly Score Sheet)",
    monthly_ranks: "ចំណាត់ថ្នាក់ប្រចាំខែ (Monthly Rankings)",
    honor_roll: "តារាងកិត្តិយស (Honor Roll)",
    semester_ranks: "ចំណាត់ថ្នាក់ប្រចាំឆមាស (Semester Rankings)",
    semester_scores: "សម្រង់ពិន្ទុឆមាស (Semester Score Sheet)",
    semester_extract: "សម្រង់ពិន្ទុ ប្រចាំឆមាស (Semester Score Summary Sheet)",
    annual_ranks: "ចំណាត់ថ្នាក់ប្រចាំឆ្នាំ (Annual Rankings)",
    study_book: "សៀវភៅតាមដានការសិក្សា (Study Tracking Book)",
    trainee: "សៀវភៅសិក្ខាគារិក (Trainee Record Book)",
    teachers: "គ្រប់គ្រងគ្រូបង្រៀន (Teacher Management)",
    exams: "បន្ទប់ប្រឡងតេស្ដស្តង់ដា (Exam Rooms)",
    reports: "របាយការណ៍ & ស្ថិតិ (Reports & Statistics)",
    library: "បណ្ណាល័យថ្នាក់រៀនឌីជីថល (Classroom Digital Library)",
    school_monthly_report: "របាយការណ៍ប្រចាំខែរបស់សាលា (School Monthly Report)",
    staff_info: "ព័ត៌មានបុគ្គលិក (Staff Information)",
    classes: "ថ្នាក់រៀន (Classrooms & Teacher Credentials)"
  };
  const titleElem = document.getElementById("pageTitle");
  if (titleElem && titles[tabId]) {
    titleElem.innerText = titles[tabId];
  }

  renderActiveTab();
}

// Event Listeners for Filters, Search, Modals
function setupEventListeners() {
  // Global Class Selector in Sub-header if available
  const classSelects = document.querySelectorAll(".class-select-input");
  classSelects.forEach(sel => {
    sel.addEventListener("change", e => {
      state.activeClassId = e.target.value;
      try { localStorage.setItem("banloung_active_class_id", state.activeClassId); } catch (e) {}
      const currentClass = getActiveClass();
      if (currentClass) {
        ensureDefaultMonthlyAttendance(currentClass, state.activeAttendanceYear, state.activeAttendanceMonth);
      }
      renderActiveTab();
    });
  });

  // Search input
  const searchInput = document.getElementById("studentSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      renderStudentsRoster();
    });
  }

  // Gender filter
  const genderFilter = document.getElementById("genderFilterSelect");
  if (genderFilter) {
    genderFilter.addEventListener("change", e => {
      state.genderFilter = e.target.value;
      renderStudentsRoster();
    });
  }

  // Daily Attendance Date Picker
  const attDate = document.getElementById("attDatePicker");
  if (attDate) {
    attDate.value = state.activeAttendanceDate;
    attDate.addEventListener("change", e => {
      state.activeAttendanceDate = e.target.value;
      const parts = e.target.value.split("-");
      if (parts.length === 3) {
        state.activeAttendanceYear = parseInt(parts[0], 10);
        state.activeAttendanceMonth = parseInt(parts[1], 10);
        const mSel = document.getElementById("monthlyMonthSelect");
        if (mSel) mSel.value = String(state.activeAttendanceMonth);
        const ySel = document.getElementById("monthlyYearSelect");
        if (ySel) ySel.value = String(state.activeAttendanceYear);
      }
      const currentClass = getActiveClass();
      if (currentClass) {
        ensureDefaultMonthlyAttendance(currentClass, state.activeAttendanceYear, state.activeAttendanceMonth);
      }
      if (state.activeTab === "attendance_daily" || state.activeStudentSubTab === "attendance_daily") {
        renderDailyAttendance();
      }
      if (state.activeTab === "attendance_monthly" || state.activeStudentSubTab === "attendance_monthly") {
        renderMonthlyAttendance();
      }
    });
  }
}

// Main Render Dispatcher
function renderApp() {
  updateClassSelectOptions();
  renderActiveTab();
}

function renderActiveTab() {
  switch (state.activeTab) {
    case "dashboard":
      renderDashboard();
      break;
    case "students_management":
      switchStudentSubTab(state.activeStudentSubTab || "students");
      break;
    case "students":
      switchStudentSubTab("students");
      break;
    case "attendance_daily":
      switchStudentSubTab("attendance_daily");
      break;
    case "attendance_monthly":
      switchStudentSubTab("attendance_monthly");
      break;
    case "attendance_yearly":
      switchStudentSubTab("attendance_yearly");
      break;
    case "admin_tasks":
      switchAdminSubTab(state.activeAdminSubTab || "scores");
      break;
    case "scores":
    case "monthly_ranks":
    case "honor_roll":
    case "semester_ranks":
    case "semester_scores":
    case "semester_extract":
    case "annual_ranks":
    case "study_book":
    case "trainee":
    case "monthly_report":
      switchAdminSubTab(state.activeTab);
      break;
    case "school_monthly_report":
      if (typeof renderSchoolMonthlyReports === "function") renderSchoolMonthlyReports();
      break;
    case "staff_info":
      if (typeof renderStaffInfo === "function") renderStaffInfo();
      break;
    case "teachers":
      renderTeachers();
      break;
    case "exams":
      renderExamRooms();
      break;
    case "reports":
      renderReports();
      break;
    case "library":
      if (typeof renderLibrary === "function") renderLibrary();
      break;
    case "classes":
      if (typeof renderClasses === "function") renderClasses();
      break;
  }
}

function updateClassSelectOptions() {
  let classes = getClassesForYear(state.activeYear);

  // If user is a teacher (not admin), only show their assigned class/grade
  if (window.authSystem && typeof window.authSystem.isAdmin === "function" && !window.authSystem.isAdmin()) {
    const allowedGrade = window.authSystem.getAllowedGrade();
    if (allowedGrade) {
      const filtered = classes.filter(c => c.grade === allowedGrade);
      if (filtered.length > 0) {
        classes = filtered;
      }
    }
  }

  const selectElements = document.querySelectorAll(".class-select-input");
  selectElements.forEach(select => {
    select.innerHTML = "";
    if (classes.length === 0) {
      select.innerHTML = `<option value="">គ្មានថ្នាក់រៀន</option>`;
      return;
    }
    classes.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.grade} (${c.students.length} នាក់ | គ្រូ: ${c.teacher})`;
      if (c.id === state.activeClassId) opt.selected = true;
      select.appendChild(opt);
    });
  });
}

/* ==========================================================================
   1. DASHBOARD & CHARTS
   ========================================================================== */
function renderDashboard() {
  if (!state.db) state.db = normalizeSchoolDatabase(null);

  let currentClasses = getClassesForYear(state.activeYear);
  if (!currentClasses || currentClasses.length === 0) {
    state.activeYear = "២០២៦-២០២៧";
    currentClasses = getClassesForYear("២០២៦-២០២៧");
  }

  let totalStudents = 0;
  let femaleStudents = 0;
  let maleStudents = 0;

  (currentClasses || []).forEach(c => {
    (c.students || []).forEach(s => {
      totalStudents++;
      if (s.gender === "ស្រី") femaleStudents++;
      else maleStudents++;
    });
  });

  const teachers = (state.db && Array.isArray(state.db.teachers)) ? state.db.teachers : [];
  const totalTeachers = teachers.length;
  const femaleTeachers = teachers.filter(t => t.gender === "ស្រី").length;
  const maleTeachers = totalTeachers - femaleTeachers;

  const femalePct = totalStudents > 0 ? Math.round((femaleStudents / totalStudents) * 100) : 0;
  const femaleTeacherPct = totalTeachers > 0 ? Math.round((femaleTeachers / totalTeachers) * 100) : 0;

  // Update DOM Metric Cards
  const elTotalSt = document.getElementById("dashTotalStudents");
  const elFemaleSt = document.getElementById("dashFemaleStudents");
  const elTotalTeach = document.getElementById("dashTotalTeachers");
  const elFemaleTeach = document.getElementById("dashFemaleTeachers");
  const elTotalClasses = document.getElementById("dashTotalClasses");

  if (elTotalSt) elTotalSt.innerText = totalStudents.toLocaleString();
  if (elFemaleSt) elFemaleSt.innerText = `${femaleStudents.toLocaleString()} (${femalePct}%)`;
  if (elTotalTeach) elTotalTeach.innerText = totalTeachers.toLocaleString();
  if (elFemaleTeach) elFemaleTeach.innerText = `${femaleTeachers.toLocaleString()} (${femaleTeacherPct}%)`;
  if (elTotalClasses) elTotalClasses.innerText = (currentClasses || []).length;

  // Draw Interactive Canvas Bar Chart & Donut Chart
  try { drawBarChart(currentClasses); } catch(e) { console.error("drawBarChart error:", e); }
  try { drawDonutChart(maleStudents, femaleStudents); } catch(e) { console.error("drawDonutChart error:", e); }
  try { renderDashboardClassSummaryTable(currentClasses); } catch(e) { console.error("renderDashboardClassSummaryTable error:", e); }
}

// Pure HTML5 Canvas Bar Chart (No external CDN required, crisp high-DPI rendering)
function drawBarChart(classesList) {
  const canvas = document.getElementById("barChartCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = rect.width > 200 ? rect.width : 560;
  const height = 300;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  if (!classesList || classesList.length === 0) {
    ctx.font = "14px 'Kantumruy Pro', sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.fillText("មិនទាន់មានទិន្នន័យសម្រាប់ឆ្នាំសិក្សានេះ", width / 2, height / 2);
    return;
  }

  const padding = { top: 30, right: 30, bottom: 60, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Calculate Max
  let maxVal = 0;
  classesList.forEach(c => {
    const students = c.students || [];
    const fCount = students.filter(s => s.gender === "ស្រី").length;
    const mCount = students.length - fCount;
    maxVal = Math.max(maxVal, mCount, fCount);
  });
  maxVal = Math.ceil((maxVal + 5) / 10) * 10 || 40;

  // Draw Horizontal Gridlines & Y Axis Labels
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#64748b";
  ctx.font = "11px 'Kantumruy Pro', sans-serif";
  ctx.textAlign = "right";

  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const val = (maxVal / gridSteps) * i;
    const y = padding.top + chartH - (i / gridSteps) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(Math.round(val), padding.left - 8, y + 4);
  }

  // Draw Bars
  const numClasses = classesList.length;
  const groupWidth = chartW / numClasses;
  const barWidth = Math.min(22, (groupWidth - 20) / 2);

  classesList.forEach((c, idx) => {
    const fCount = c.students.filter(s => s.gender === "ស្រី").length;
    const mCount = c.students.length - fCount;

    const groupX = padding.left + idx * groupWidth;
    const centerX = groupX + groupWidth / 2;

    const mBarH = (mCount / maxVal) * chartH;
    const fBarH = (fCount / maxVal) * chartH;

    const mX = centerX - barWidth - 3;
    const fX = centerX + 3;

    const mY = padding.top + chartH - mBarH;
    const fY = padding.top + chartH - fBarH;

    // Male bar (Blue gradient)
    const mGrad = ctx.createLinearGradient(0, mY, 0, padding.top + chartH);
    mGrad.addColorStop(0, "#2563eb");
    mGrad.addColorStop(1, "#60a5fa");
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(mX, mY, barWidth, mBarH, [4, 4, 0, 0]) : ctx.fillRect(mX, mY, barWidth, mBarH);
    ctx.fill();

    // Female bar (Pink gradient)
    const fGrad = ctx.createLinearGradient(0, fY, 0, padding.top + chartH);
    fGrad.addColorStop(0, "#db2777");
    fGrad.addColorStop(1, "#f472b6");
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(fX, fY, barWidth, fBarH, [4, 4, 0, 0]) : ctx.fillRect(fX, fY, barWidth, fBarH);
    ctx.fill();

    // Values on top of bars
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 10.5px 'Kantumruy Pro', sans-serif";
    ctx.textAlign = "center";
    if (mCount > 0) ctx.fillText(mCount, mX + barWidth / 2, mY - 4);
    if (fCount > 0) ctx.fillText(fCount, fX + barWidth / 2, fY - 4);

    // X Axis Label
    ctx.fillStyle = "#334155";
    ctx.font = "11px 'Kantumruy Pro', sans-serif";
    const label = c.grade.replace("ថ្នាក់", "").trim();
    ctx.fillText(label, centerX, padding.top + chartH + 20);
  });

  // Legend
  ctx.textAlign = "left";
  // Male Legend
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(width - 150, 10, 12, 12);
  ctx.fillStyle = "#334155";
  ctx.font = "12px 'Kantumruy Pro', sans-serif";
  ctx.fillText("សិស្សប្រុស", width - 132, 20);

  // Female Legend
  ctx.fillStyle = "#db2777";
  ctx.fillRect(width - 70, 10, 12, 12);
  ctx.fillStyle = "#334155";
  ctx.fillText("សិស្សស្រី", width - 52, 20);
}

// Pure HTML5 Canvas Pie/Donut Chart for Gender Ratio
function drawDonutChart(maleCount, femaleCount) {
  const canvas = document.getElementById("pieChartCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = rect.width > 150 ? rect.width : 280;
  const height = 300;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const total = maleCount + femaleCount;
  if (total === 0) {
    ctx.font = "14px 'Kantumruy Pro', sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.fillText("គ្មានទិន្នន័យ", width / 2, height / 2);
    return;
  }

  const cx = width / 2;
  const cy = height / 2 - 15;
  const outerR = Math.min(cx, cy) - 25;
  const innerR = outerR * 0.58;

  const maleAngle = (maleCount / total) * 2 * Math.PI;
  const femaleAngle = (femaleCount / total) * 2 * Math.PI;

  let startAngle = -Math.PI / 2;

  // Draw Male Slice (Blue)
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, startAngle, startAngle + maleAngle);
  ctx.arc(cx, cy, innerR, startAngle + maleAngle, startAngle, true);
  ctx.closePath();
  ctx.fillStyle = "#2563eb";
  ctx.fill();

  // Draw Female Slice (Pink)
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, startAngle + maleAngle, startAngle + maleAngle + femaleAngle);
  ctx.arc(cx, cy, innerR, startAngle + maleAngle + femaleAngle, startAngle + maleAngle, true);
  ctx.closePath();
  ctx.fillStyle = "#db2777";
  ctx.fill();

  // Center Text
  ctx.textAlign = "center";
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 20px 'Kantumruy Pro', sans-serif";
  ctx.fillText(total.toString(), cx, cy + 3);
  ctx.fillStyle = "#64748b";
  ctx.font = "11.5px 'Kantumruy Pro', sans-serif";
  ctx.fillText("សរុបនាក់", cx, cy + 22);

  // Legend at bottom
  const malePct = Math.round((maleCount / total) * 100);
  const femalePct = 100 - malePct;

  const legendY = height - 25;
  ctx.textAlign = "center";

  // Male legend
  ctx.fillStyle = "#2563eb";
  ctx.beginPath();
  ctx.arc(cx - 70, legendY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e293b";
  ctx.font = "12px 'Kantumruy Pro', sans-serif";
  ctx.fillText(`ប្រុស: ${maleCount} (${malePct}%)`, cx - 30, legendY + 4);

  // Female legend
  ctx.fillStyle = "#db2777";
  ctx.beginPath();
  ctx.arc(cx + 40, legendY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e293b";
  ctx.fillText(`ស្រី: ${femaleCount} (${femalePct}%)`, cx + 80, legendY + 4);
}

function renderDashboardClassSummaryTable(classesList) {
  const container = document.getElementById("dashClassSummaryTable");
  if (!container) return;

  if (classesList.length === 0) {
    container.innerHTML = `<p class="text-muted" style="text-align:center; padding: 20px;">មិនទាន់មានថ្នាក់រៀនសម្រាប់ឆ្នាំសិក្សានេះទេ</p>`;
    return;
  }

  let html = `
    <table class="official-table" style="font-size: 12px; margin-top: 10px;">
      <thead>
        <tr>
          <th>ល.រ</th>
          <th>កម្រិតថ្នាក់</th>
          <th>គ្រូប្រចាំថ្នាក់</th>
          <th>សិស្សសរុប</th>
          <th>ស្រី</th>
          <th>ប្រុស</th>
          <th>អត្រាស្រី (%)</th>
          <th>សកម្មភាព</th>
        </tr>
      </thead>
      <tbody>
  `;

  let totS = 0, totF = 0, totM = 0;
  classesList.forEach((c, idx) => {
    const fCount = c.students.filter(s => s.gender === "ស្រី").length;
    const mCount = c.students.length - fCount;
    const pct = c.students.length > 0 ? Math.round((fCount / c.students.length) * 100) : 0;
    totS += c.students.length;
    totF += fCount;
    totM += mCount;

    html += `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-weight: 700; color: var(--primary); text-align: left; padding-left: 10px;">${c.grade}</td>
        <td>${c.teacher}</td>
        <td style="font-weight: 700;">${c.students.length}</td>
        <td style="color: #be185d; font-weight: 600;">${fCount}</td>
        <td style="color: #0369a1; font-weight: 600;">${mCount}</td>
        <td><span class="gender-badge female">${pct}%</span></td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="viewClassRoster('${c.id}')">
            <i class="fa fa-eye"></i> មើលបញ្ជី
          </button>
        </td>
      </tr>
    `;
  });

  const totPct = totS > 0 ? Math.round((totF / totS) * 100) : 0;
  html += `
      <tr style="background: #f1f5f9; font-weight: 700;">
        <td colspan="3" style="text-align: right; padding-right: 12px;">សរុបរួមសាលា៖</td>
        <td>${totS}</td>
        <td style="color: #be185d;">${totF}</td>
        <td style="color: #0369a1;">${totM}</td>
        <td><span class="gender-badge female">${totPct}%</span></td>
        <td></td>
      </tr>
    </tbody>
    </table>
  `;

  container.innerHTML = html;
}

function viewClassRoster(classId) {
  state.activeClassId = classId;
  switchTab("students");
}

/* ==========================================================================
   2. STUDENT ROSTER (១០០% តាមគម្រូក្រសួង A4 LANDSCAPE)
   ========================================================================== */
function renderStudentsRoster() {
  const currentClass = getActiveClass();
  const wrapper = document.getElementById("studentRosterContent");
  if (!wrapper) return;

  if (!currentClass) {
    wrapper.innerHTML = `
      <div style="text-align: center; padding: 40px; background: white; border-radius: 8px;">
        <h3>មិនទាន់មានថ្នាក់រៀនសម្រាប់ឆ្នាំសិក្សា ${state.activeYear}</h3>
        <p style="color: #64748b; margin-top: 8px;">សូមជ្រើសរើសឆ្នាំសិក្សាផ្សេង ឬបង្កើតថ្នាក់រៀនថ្មី</p>
      </div>
    `;
    return;
  }

  // Filter students based on search and gender
  let students = currentClass.students || [];
  if (state.genderFilter !== "all") {
    students = students.filter(s => s.gender === state.genderFilter);
  }
  if (state.searchQuery) {
    students = students.filter(s =>
      s.fullName.toLowerCase().includes(state.searchQuery) ||
      (s.studentId && s.studentId.toLowerCase().includes(state.searchQuery)) ||
      (s.pobVillage && s.pobVillage.toLowerCase().includes(state.searchQuery)) ||
      (s.phone && s.phone.toLowerCase().includes(state.searchQuery))
    );
  }

  const femaleCount = students.filter(s => s.gender === "ស្រី").length;
  const maleCount = students.length - femaleCount;

  // Build 100% Exact Official Layout Matching MoEYS Standard
  let html = `
    <div class="a4-landscape-page" id="printableA4Page">
      <!-- Top Official Header -->
      <div class="roster-header">
        <div class="roster-kingdom-center">
          <div class="roster-kingdom">${state.db.schoolInfo.country || "ព្រះរាជាណាចក្រកម្ពុជា"}</div>
          <div class="roster-motto">${state.db.schoolInfo.motto || "ជាតិ  សាសនា  ព្រះមហាក្សត្រ"}</div>
        </div>

        <div class="roster-school-row">
          <div class="roster-school-name">${state.db.schoolInfo.name}</div>
        </div>

        <div class="roster-main-title">
          <h2>បញ្ជីរាយនាមឈ្មោះសិស្ស${currentClass.grade} ( ឆ្នាំសិក្សា ${currentClass.academicYear} )</h2>
        </div>
      </div>

      <!-- Official Multi-column Table -->
      <div class="official-table-wrap">
        <table class="official-table">
          <thead>
            <tr>
              <th style="width: 32px;">ល.រ</th>
              <th style="width: 55px;">អត្តលេខ</th>
              <th colspan="2">គោត្តនាម និង នាម</th>
              <th style="width: 42px;">ភេទ</th>
              <th colspan="3">ថ្ងៃ  ខែ  ឆ្នាំ កំណើត</th>
              <th colspan="2">ទីកន្លែងកំណើត</th>
              <th colspan="3">ឈ្មោះ ឪពុក និង មុខរបរ</th>
              <th colspan="3">ឈ្មោះ ម្ដាយ និង មុខរបរ</th>
              <th colspan="2">អាស័យដ្ឋានបច្ចុប្បន្ន</th>
              <th style="width: 85px;">លេខទូរសព្ទ</th>
              <th style="width: 50px;">ផ្សេងៗ</th>
              <th class="action-col no-print" style="width: 60px;">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody>
  `;

  if (students.length === 0) {
    html += `
      <tr>
        <td colspan="21" style="padding: 24px; color: #64748b; font-style: italic;">
          មិនមានទិន្នន័យសិស្សត្រូវនឹងលក្ខខណ្ឌស្វែងរកនេះទេ
        </td>
      </tr>
    `;
  } else {
    students.forEach((s, idx) => {
      const gBadge = s.gender === "ស្រី"
        ? `<span class="gender-badge female">ស្រី</span>`
        : `<span class="gender-badge male">ប្រុស</span>`;

      html += `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-weight: 600; color: #1e3a8a;">${s.studentId || "-"}</td>
          <td class="text-left border-no-r" style="font-weight: 600; padding-right: 2px;">${s.lastName || ""}</td>
          <td class="text-left border-no-l" style="font-weight: 600; padding-left: 2px;">${s.firstName || ""}</td>
          <td>${gBadge}</td>
          <td class="border-no-r" style="padding-right: 2px;">${s.dobDay || ""}</td>
          <td class="border-no-l border-no-r" style="padding-left: 2px; padding-right: 2px;">${s.dobMonth || ""}</td>
          <td class="border-no-l" style="padding-left: 2px;">${s.dobYear || ""}</td>
          <td class="border-no-r" style="padding-right: 2px;">${s.pobVillage || ""}</td>
          <td class="border-no-l" style="padding-left: 2px;">${s.pobCommune || ""}</td>
          <td class="border-no-r" style="padding-right: 2px;">${s.fatherLastName || ""}</td>
          <td class="border-no-l border-no-r" style="padding-left: 2px; padding-right: 2px;">${s.fatherFirstName || ""}</td>
          <td class="border-no-l" style="padding-left: 2px;">${s.fatherJob || ""}</td>
          <td class="border-no-r" style="padding-right: 2px;">${s.motherLastName || ""}</td>
          <td class="border-no-l border-no-r" style="padding-left: 2px; padding-right: 2px;">${s.motherFirstName || ""}</td>
          <td class="border-no-l" style="padding-left: 2px;">${s.motherJob || ""}</td>
          <td class="border-no-r" style="padding-right: 2px;">${s.addrVillage || ""}</td>
          <td class="border-no-l" style="padding-left: 2px;">${s.addrCommune || ""}</td>
          <td>${s.phone || ""}</td>
          <td style="color: #b45309; font-weight: 600;">${s.note || s.age || ""}</td>
          <td class="action-col no-print">
            <div class="action-btn-group">
              <button class="action-icon-btn" title="កែប្រែ" onclick="openEditStudentModal(${s.num})">
                <i class="fa fa-edit"></i>
              </button>
              <button class="action-icon-btn delete" title="លុប" onclick="deleteStudent(${s.num})">
                <i class="fa fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  html += `
          </tbody>
        </table>
      </div>

      <!-- Official Footer Signatures -->
      <div class="roster-footer">
        <div class="roster-closing-count">
          បញ្ឈប់បញ្ជីត្រឹមចំនួនសិស្សសរុប <strong>${students.length}</strong> នាក់ ( ស្រី <strong>${femaleCount}</strong> នាក់ , ប្រុស <strong>${maleCount}</strong> នាក់ )
        </div>

        <div class="roster-sign-grid">
          <div class="sign-left">
            <div class="sign-space"></div>
            <div class="lunar-date">&nbsp;</div>
            <div class="sign-role">បានឃើញ និង ឯកភាព</div>
            <div class="sign-role">នាយកសាលា</div>
            <div class="sign-space" style="height: 60px;"></div>
            <div class="sign-name">&nbsp;</div>
          </div>

          <div class="sign-right">
            <div class="lunar-date">
              <span class="editable-date-field" contenteditable="true" spellcheck="false" title="ចុចត្រង់នេះដើម្បីបំពេញ ឬកែប្រែកាលបរិច្ឆេទចន្ទគតិ" onblur="saveClassDateDirect('${currentClass.id}', 'lunar', this.innerText)">${currentClass.lunarDate || "ថ្ងៃ សៅរ៍ ៣ រោច  ខែ កត្តិក  ឆ្នាំ ម្សាញ់ សប្ដស័ក ព.ស ២៥៦៩"}</span>
              <button class="btn-edit-date no-print" onclick="openClassDateModal('${currentClass.id}')" title="ចុចដើម្បីបំពេញកាលបរិច្ឆេទ"><i class="fa fa-pen"></i></button>
            </div>
            <div class="solar-date">
              <span class="editable-date-field" contenteditable="true" spellcheck="false" title="ចុចត្រង់នេះដើម្បីបំពេញ ឬកែប្រែកាលបរិច្ឆេទសុរិយគតិ" onblur="saveClassDateDirect('${currentClass.id}', 'solar', this.innerText)">${currentClass.solarDate || "បាន្លួង  ថ្ងៃទី  ០៨  ខែ វិច្ឆិកា ឆ្នាំ ២០២៦"}</span>
            </div>
            <div class="sign-role">គ្រូប្រចាំថ្នាក់</div>
            <div class="sign-space"></div>
            <div class="sign-name">${currentClass.teacher || "គ្រូបង្រៀន"}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  wrapper.innerHTML = html;
}

// Student Edit / Add Modal
function openAddStudentModal() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }
  document.getElementById("studentModalTitle").innerText = `បន្ថែមសិស្សថ្មីចូល ${currentClass.grade}`;
  document.getElementById("studentEditNum").value = "";
  document.getElementById("formStudentId").value = "";
  document.getElementById("formLastName").value = "";
  document.getElementById("formFirstName").value = "";
  document.getElementById("formGender").value = "ប្រុស";
  document.getElementById("formDobDay").value = "";
  document.getElementById("formDobMonth").value = "";
  document.getElementById("formDobYear").value = "";
  document.getElementById("formPobVillage").value = "រនាមពេជ្រ";
  document.getElementById("formPobCommune").value = "ចំប៉ា";
  document.getElementById("formFatherLastName").value = "";
  document.getElementById("formFatherFirstName").value = "";
  document.getElementById("formFatherJob").value = "កសិករ";
  document.getElementById("formMotherLastName").value = "";
  document.getElementById("formMotherFirstName").value = "";
  document.getElementById("formMotherJob").value = "កសិករ";
  document.getElementById("formAddrVillage").value = "រនាមពេជ្រ";
  document.getElementById("formAddrCommune").value = "ចំប៉ា";
  document.getElementById("formPhone").value = "";
  document.getElementById("formNote").value = "";

  document.getElementById("studentModalOverlay").classList.add("active");
}

function openEditStudentModal(studentNum) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const s = currentClass.students.find(st => st.num === studentNum);
  if (!s) return;

  document.getElementById("studentModalTitle").innerText = `កែប្រែព័ត៌មានសិស្ស: ${s.fullName}`;
  document.getElementById("studentEditNum").value = s.num;
  document.getElementById("formStudentId").value = s.studentId || "";
  document.getElementById("formLastName").value = s.lastName || "";
  document.getElementById("formFirstName").value = s.firstName || "";
  document.getElementById("formGender").value = s.gender || "ប្រុស";
  document.getElementById("formDobDay").value = s.dobDay || "";
  document.getElementById("formDobMonth").value = s.dobMonth || "";
  document.getElementById("formDobYear").value = s.dobYear || "";
  document.getElementById("formPobVillage").value = s.pobVillage || "";
  document.getElementById("formPobCommune").value = s.pobCommune || "";
  document.getElementById("formFatherLastName").value = s.fatherLastName || "";
  document.getElementById("formFatherFirstName").value = s.fatherFirstName || "";
  document.getElementById("formFatherJob").value = s.fatherJob || "កសិករ";
  document.getElementById("formMotherLastName").value = s.motherLastName || "";
  document.getElementById("formMotherFirstName").value = s.motherFirstName || "";
  document.getElementById("formMotherJob").value = s.motherJob || "កសិករ";
  document.getElementById("formAddrVillage").value = s.addrVillage || "";
  document.getElementById("formAddrCommune").value = s.addrCommune || "";
  document.getElementById("formPhone").value = s.phone || "";
  document.getElementById("formNote").value = s.note || s.age || "";

  document.getElementById("studentModalOverlay").classList.add("active");
}

function closeStudentModal() {
  document.getElementById("studentModalOverlay").classList.remove("active");
}

function saveStudentForm() {
  const currentClass = getActiveClass();
  if (!currentClass) return;

  const editNumStr = document.getElementById("studentEditNum").value;
  const lName = document.getElementById("formLastName").value.trim();
  const fName = document.getElementById("formFirstName").value.trim();

  if (!lName || !fName) {
    alert("សូមបញ្ចូលគោត្តនាម និងនាមសិស្ស!");
    return;
  }

  const studentObj = {
    studentId: document.getElementById("formStudentId").value.trim(),
    lastName: lName,
    firstName: fName,
    fullName: `${lName} ${fName}`,
    gender: document.getElementById("formGender").value,
    dobDay: document.getElementById("formDobDay").value.trim(),
    dobMonth: document.getElementById("formDobMonth").value.trim(),
    dobYear: document.getElementById("formDobYear").value.trim(),
    pobVillage: document.getElementById("formPobVillage").value.trim(),
    pobCommune: document.getElementById("formPobCommune").value.trim(),
    fatherLastName: document.getElementById("formFatherLastName").value.trim(),
    fatherFirstName: document.getElementById("formFatherFirstName").value.trim(),
    fatherJob: document.getElementById("formFatherJob").value.trim(),
    motherLastName: document.getElementById("formMotherLastName").value.trim(),
    motherFirstName: document.getElementById("formMotherFirstName").value.trim(),
    motherJob: document.getElementById("formMotherJob").value.trim(),
    addrVillage: document.getElementById("formAddrVillage").value.trim(),
    addrCommune: document.getElementById("formAddrCommune").value.trim(),
    phone: document.getElementById("formPhone").value.trim(),
    note: document.getElementById("formNote").value.trim(),
    age: document.getElementById("formNote").value.trim()
  };

  if (editNumStr) {
    // Edit existing
    const num = parseInt(editNumStr);
    const idx = currentClass.students.findIndex(s => s.num === num);
    if (idx !== -1) {
      currentClass.students[idx] = {
        ...currentClass.students[idx],
        ...studentObj
      };
    }
  } else {
    // Add new
    const nextNum = currentClass.students.length > 0
      ? Math.max(...currentClass.students.map(s => s.num)) + 1
      : 1;
    studentObj.num = nextNum;
    studentObj.scores = { khmer: 7.0, math: 7.0, science: 7.0, social: 7.0, pe: 8.0, art: 8.0 };
    studentObj.totalScore = 44.0;
    studentObj.avgScore = 7.33;
    studentObj.mention = "ល្អ";
    studentObj.result = "ជាប់";
    studentObj.attendance = { present: 22, excused: 0, unexcused: 0 };
    studentObj.rank = currentClass.students.length + 1;
    currentClass.students.push(studentObj);
  }

  saveDatabase();
  closeStudentModal();
  renderStudentsRoster();
}

function deleteStudent(studentNum) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const s = currentClass.students.find(st => st.num === studentNum);
  if (!s) return;

  if (confirm(`តើអ្នកពិតជាចង់លុបសិស្ស "${s.fullName}" មែនឬទេ?`)) {
    currentClass.students = currentClass.students.filter(st => st.num !== studentNum);
    // Re-index
    currentClass.students.forEach((st, idx) => {
      st.num = idx + 1;
    });
    saveDatabase();
    renderStudentsRoster();
  }
}

// Print Action
function printRoster() {
  prepareStudentSubTabForPrint("students");
  window.print();
}
window.printRoster = printRoster;

/**
 * Clear Student Roster Data for Active Class (សម្អាតទិន្នន័យបញ្ជីឈ្មោះសិស្សក្នុងថ្នាក់)
 */
function clearClassStudentsData() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }

  const count = currentClass.students ? currentClass.students.length : 0;
  if (count === 0) {
    alert("ថ្នាក់រៀននេះគ្មានទិន្នន័យសិស្សត្រូវសម្អាតទេ!");
    return;
  }

  const ok = confirm(`តើលោកគ្រូ/អ្នកគ្រូពិតជាចង់សម្អាតទិន្នន័យសិស្សទាំងអស់ (${count} នាក់) ក្នុង «${currentClass.grade}» នេះមែនទេ?\n\n⚠️ សកម្មភាពនេះនឹងលុបទិន្នន័យសិស្សទាំងអស់ក្នុងថ្នាក់នេះចេញពីប្រព័ន្ធ!\n(លោកគ្រូ/អ្នកគ្រូអាចចុចប៊ូតុង «ត្រឡប់មកវិញ (Undo)» ដើម្បីទាញទិន្នន័យមកវិញបាន)`);
  if (!ok) return;

  // Save history snapshot before clearing
  if (!window._undoHistory) window._undoHistory = { students: {}, dailyAtt: {}, monthlyAtt: {} };
  if (!window._undoHistory.students[currentClass.id]) window._undoHistory.students[currentClass.id] = [];
  window._undoHistory.students[currentClass.id].push({
    students: JSON.parse(JSON.stringify(currentClass.students || [])),
    totalStudents: currentClass.totalStudents,
    femaleStudents: currentClass.femaleStudents,
    maleStudents: currentClass.maleStudents,
    attendanceRecords: JSON.parse(JSON.stringify(currentClass.attendanceRecords || {}))
  });

  // Clear students
  currentClass.students = [];
  currentClass.totalStudents = 0;
  currentClass.femaleStudents = 0;
  currentClass.maleStudents = 0;

  // Also clear class attendance records
  currentClass.attendanceRecords = {};

  saveDatabase();
  renderStudentsRoster();
  renderDashboard();
  if (state.activeTab === "attendance_daily") renderDailyAttendance();
  if (state.activeTab === "attendance_monthly") renderMonthlyAttendance();

  showAttendanceToast(`✓ បានសម្អាតទិន្នន័យសិស្សក្នុងថ្នាក់ ${currentClass.grade} ដោយជោគជ័យ! (អាចចុច Undo ដើម្បីត្រឡប់មកវិញ)`, 'info');
}

/**
 * Undo Student Roster Clearing for Active Class (ត្រឡប់ទិន្នន័យបញ្ជីឈ្មោះសិស្សមកវិញ)
 */
function undoClassStudentsData() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }
  const history = window._undoHistory && window._undoHistory.students && window._undoHistory.students[currentClass.id];
  if (!history || history.length === 0) {
    alert("គ្មានទិន្នន័យបញ្ជីឈ្មោះសិស្សដែលបានសម្អាតដើម្បីត្រឡប់មកវិញ (Undo) ទេ!");
    return;
  }
  const lastState = history.pop();
  currentClass.students = lastState.students || [];
  currentClass.totalStudents = lastState.totalStudents || currentClass.students.length;
  currentClass.femaleStudents = lastState.femaleStudents || currentClass.students.filter(s => s.gender === 'ស្រី' || s.gender === 'F').length;
  currentClass.maleStudents = lastState.maleStudents || (currentClass.totalStudents - currentClass.femaleStudents);
  if (lastState.attendanceRecords) {
    currentClass.attendanceRecords = lastState.attendanceRecords;
  }

  saveDatabase();
  renderStudentsRoster();
  renderDashboard();
  if (state.activeTab === "attendance_daily") renderDailyAttendance();
  if (state.activeTab === "attendance_monthly") renderMonthlyAttendance();

  showAttendanceToast(`↩ បានត្រឡប់ទិន្នន័យសិស្ស (${currentClass.students.length} នាក់) មកវិញដោយជោគជ័យ!`, 'success');
}

// Export to Excel / CSV with UTF-8 BOM
function exportRosterExcel() {
  const currentClass = getActiveClass();
  if (!currentClass) return;

  const students = currentClass.students || [];
  let csv = "\uFEFF"; // UTF-8 BOM for perfect Khmer text in Excel

  // Official Excel Header
  csv += `,,,,,,,,,ព្រះរាជាណាចក្រកម្ពុជា\n`;
  csv += `,,,,,,,,,ជាតិ  សាសនា  ព្រះមហាក្សត្រ\n`;
  csv += `សាលាបឋមសិក្សា  បាន្លួង\n`;
  csv += `,,,,បញ្ជីរាយនាមឈ្មោះសិស្ស${currentClass.grade} ( ឆ្នាំសិក្សា ${currentClass.academicYear} )\n`;
  csv += `ល.រ,អត្តលេខ,គោត្តនាម,នាម,ភេទ,ថ្ងៃ,ខែ,ឆ្នាំកំណើត,ភូមិកំណើត,ឃុំកំណើត,គោត្តនាមឪពុក,នាមឪពុក,មុខរបរឪពុក,គោត្តនាមម្ដាយ,នាមម្ដាយ,មុខរបរម្ដាយ,ភូមិអាសយដ្ឋាន,ឃុំអាសយដ្ឋាន,លេខទូរសព្ទ,ផ្សេងៗ\n`;

  students.forEach((s, idx) => {
    const row = [
      idx + 1,
      `"${s.studentId || ""}"`,
      `"${s.lastName || ""}"`,
      `"${s.firstName || ""}"`,
      `"${s.gender || ""}"`,
      `"${s.dobDay || ""}"`,
      `"${s.dobMonth || ""}"`,
      `"${s.dobYear || ""}"`,
      `"${s.pobVillage || ""}"`,
      `"${s.pobCommune || ""}"`,
      `"${s.fatherLastName || ""}"`,
      `"${s.fatherFirstName || ""}"`,
      `"${s.fatherJob || ""}"`,
      `"${s.motherLastName || ""}"`,
      `"${s.motherFirstName || ""}"`,
      `"${s.motherJob || ""}"`,
      `"${s.addrVillage || ""}"`,
      `"${s.addrCommune || ""}"`,
      `"${s.phone || ""}"`,
      `"${s.note || s.age || ""}"`
    ];
    csv += row.join(",") + "\n";
  });

  const femaleCount = students.filter(s => s.gender === "ស្រី").length;
  csv += `,,បញ្ឈប់បញ្ជីត្រឹមចំនួនសិស្ស,,,${students.length},,${femaleCount}\n`;
  csv += `,,,,,,,,,,,,,${currentClass.lunarDate || ""}\n`;
  csv += `,,,បានឃើញ និង ឯកភាព,,,,,,,,,,,,${currentClass.solarDate || ""}\n`;
  csv += `,,,នាយកសាលា,,,,,,,,,,,,,,គ្រូប្រចាំថ្នាក់\n`;
  csv += `,,,,,,,,,,,,,,,,,${currentClass.teacher || ""}\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `បញ្ជីឈ្មោះសិស្ស_${currentClass.grade}_${currentClass.academicYear}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ==========================================================================
// CLASS DATE MANAGEMENT (កាលបរិច្ឆេទកន្លែងគ្រូប្រចាំថ្នាក់)
// ==========================================================================
function saveClassDateDirect(classId, type, text) {
  const currentClass = (state.db.classes || []).find(c => c.id === classId) || getActiveClass();
  if (!currentClass) return;
  const cleanText = text.trim();
  if (type === 'lunar') {
    currentClass.lunarDate = cleanText;
  } else if (type === 'solar') {
    currentClass.solarDate = cleanText;
  }
  saveDatabase();
}

function openClassDateModal(classId) {
  const currentClass = (state.db.classes || []).find(c => c.id === classId) || getActiveClass();
  if (!currentClass) return;

  document.getElementById("editDateClassId").value = currentClass.id;
  document.getElementById("inputLunarDate").value = currentClass.lunarDate || "";
  document.getElementById("inputSolarDate").value = currentClass.solarDate || "";
  document.getElementById("classDateModalOverlay").classList.add("active");
}

function closeClassDateModal() {
  document.getElementById("classDateModalOverlay").classList.remove("active");
}

function setTodayDateForClass() {
  const now = new Date();
  const day = now.getDate();
  const months = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
  const month = months[now.getMonth()];
  const year = now.getFullYear();

  // Convert numbers to Khmer numerals
  const toKhmerNum = num => num.toString().replace(/[0-9]/g, d => "០១២៣៤៥៦៧៨៩"[d]);
  const formattedSolar = `បាន្លួង  ថ្ងៃទី  ${toKhmerNum(day.toString().padStart(2, '0'))}  ខែ ${month} ឆ្នាំ ${toKhmerNum(year)}`;

  document.getElementById("inputSolarDate").value = formattedSolar;
}

function saveClassDateModal() {
  const classId = document.getElementById("editDateClassId").value;
  const currentClass = (state.db.classes || []).find(c => c.id === classId) || getActiveClass();
  if (!currentClass) return;

  currentClass.lunarDate = document.getElementById("inputLunarDate").value.trim();
  currentClass.solarDate = document.getElementById("inputSolarDate").value.trim();

  saveDatabase();
  closeClassDateModal();
  renderStudentsRoster();
}

// MONTHLY ATTENDANCE TEACHER DATE MANAGEMENT (កាលបរិច្ឆេទគ្រូប្រចាំថ្នាក់ - វត្តមានប្រចាំខែ)
function saveMonthlyTeacherDateDirect(classId, monthPrefix, text) {
  const currentClass = (state.db.classes || []).find(c => c.id === classId) || getActiveClass();
  if (!currentClass) return;
  const clean = text.trim();
  currentClass.monthlyDates = currentClass.monthlyDates || {};
  currentClass.monthlyDates[monthPrefix] = clean;
  saveDatabase();
}

function saveRankDateDirect(classId, type, text) {
  const currentClass = (state.db.classes || []).find(c => c.id === classId) || getActiveClass();
  if (!currentClass) return;
  const clean = text.trim();
  const monthKey = state.activeScoreMonth || "មីនា";
  currentClass.rankDates = currentClass.rankDates || {};
  currentClass.rankDates[monthKey] = currentClass.rankDates[monthKey] || {};
  if (type === 'lunar') {
    currentClass.lunarDateRank = clean;
    currentClass.rankDates[monthKey].lunar = clean;
  } else if (type === 'solar') {
    currentClass.solarDateRank = clean;
    currentClass.rankDates[monthKey].solar = clean;
  }
  saveDatabase();
  if (typeof showToast === 'function') {
    showToast("✓ បានរក្សាទុកកាលបរិច្ឆេទដោយជោគជ័យ!", "success");
  }
}
window.saveRankDateDirect = saveRankDateDirect;

function saveScoreSheetDateDirect(classId, type, text) {
  const currentClass = (state.db.classes || []).find(c => c.id === classId) || getActiveClass();
  if (!currentClass) return;
  const clean = text.trim();
  const monthKey = state.activeScoreMonth || "មីនា";
  currentClass.scoreDates = currentClass.scoreDates || {};
  currentClass.scoreDates[monthKey] = currentClass.scoreDates[monthKey] || {};
  if (type === 'lunar') {
    currentClass.lunarDateScore = clean;
    currentClass.scoreDates[monthKey].lunar = clean;
  } else if (type === 'solar') {
    currentClass.solarDateScore = clean;
    currentClass.scoreDates[monthKey].solar = clean;
  }
  saveDatabase();
  if (typeof showToast === 'function') {
    showToast("✓ បានរក្សាទុកកាលបរិច្ឆេទសម្រង់ពិន្ទុដោយជោគជ័យ!", "success");
  }
}
window.saveScoreSheetDateDirect = saveScoreSheetDateDirect;

function saveClassTeacherDirect(classId, text) {
  const currentClass = (state.db.classes || []).find(c => c.id === classId) || getActiveClass();
  if (!currentClass) return;
  const clean = text.trim();
  currentClass.teacher = clean;
  saveDatabase();
  if (typeof showToast === 'function') {
    showToast("✓ បានរក្សាទុកឈ្មោះគ្រូប្រចាំថ្នាក់ដោយជោគជ័យ!", "success");
  }
}
window.saveClassTeacherDirect = saveClassTeacherDirect;

function openMonthlyTeacherDateModal(classId, monthPrefix) {
  const currentClass = (state.db.classes || []).find(c => c.id === classId) || getActiveClass();
  if (!currentClass) return;

  const month = state.activeAttendanceMonth || 11;
  const year = state.activeAttendanceYear || 2026;
  const monthName = KHMER_MONTH_NAMES[month - 1] || "";
  const daysInMonth = new Date(year, month, 0).getDate();
  const defaultDate = `ធ្វើនៅ បាន្លួង ថ្ងៃទី ${toKhmerNum(daysInMonth)} ខែ ${monthName} ឆ្នាំ ${toKhmerNum(year)}`;
  const currentDate = (currentClass.monthlyDates && currentClass.monthlyDates[monthPrefix]) || defaultDate;

  const modal = document.getElementById("monthlyDateModalOverlay");
  if (modal) {
    document.getElementById("editMonthlyClassId").value = currentClass.id;
    document.getElementById("editMonthlyPrefix").value = monthPrefix;
    document.getElementById("inputMonthlyTeacherDate").value = currentDate;
    modal.classList.add("active");
  } else {
    const newDate = prompt("កែប្រែកាលបរិច្ឆេទគ្រូប្រចាំថ្នាក់ (ប្រចាំខែ)៖", currentDate);
    if (newDate !== null && newDate.trim() !== "") {
      saveMonthlyTeacherDateDirect(currentClass.id, monthPrefix, newDate.trim());
      renderMonthlyAttendance();
    }
  }
}

function closeMonthlyDateModal() {
  const el = document.getElementById("monthlyDateModalOverlay");
  if (el) el.classList.remove("active");
}

function setDefaultEndOfMonthDate() {
  const month = state.activeAttendanceMonth || 11;
  const year = state.activeAttendanceYear || 2026;
  const monthName = KHMER_MONTH_NAMES[month - 1] || "";
  const daysInMonth = new Date(year, month, 0).getDate();
  const defaultDate = `ធ្វើនៅ បាន្លួង ថ្ងៃទី ${toKhmerNum(daysInMonth)} ខែ ${monthName} ឆ្នាំ ${toKhmerNum(year)}`;
  const input = document.getElementById("inputMonthlyTeacherDate");
  if (input) input.value = defaultDate;
}

function setTodayDateForMonthly() {
  const now = new Date();
  const day = now.getDate();
  const months = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const formatted = `ធ្វើនៅ បាន្លួង ថ្ងៃទី ${toKhmerNum(day.toString().padStart(2, '0'))} ខែ ${month} ឆ្នាំ ${toKhmerNum(year)}`;
  const input = document.getElementById("inputMonthlyTeacherDate");
  if (input) input.value = formatted;
}

function saveMonthlyDateModal() {
  const classId = document.getElementById("editMonthlyClassId").value;
  const monthPrefix = document.getElementById("editMonthlyPrefix").value;
  const text = document.getElementById("inputMonthlyTeacherDate").value.trim();

  saveMonthlyTeacherDateDirect(classId, monthPrefix, text);
  closeMonthlyDateModal();
  renderMonthlyAttendance();
}

// ==========================================================================
// EXCEL TEMPLATE DOWNLOAD & IMPORT (នាំចូលសិស្សថ្មីជា File Excel / CSV)
// ==========================================================================

// Download Official Excel Template matching the system 100%
function downloadExcelTemplate() {
  const headers = [
    "ល.រ", "អត្តលេខ", "គោត្តនាម", "នាម", "ភេទ", "ថ្ងៃ", "ខែ", "ឆ្នាំកំណើត",
    "ភូមិកំណើត", "ឃុំកំណើត", "គោត្តនាមឪពុក", "នាមឪពុក", "មុខរបរឪពុក",
    "គោត្តនាមម្ដាយ", "នាមម្ដាយ", "មុខរបរម្ដាយ", "ភូមិអាសយដ្ឋាន", "ឃុំអាសយដ្ឋាន", "លេខទូរសព្ទ", "ផ្សេងៗ"
  ];

  const sampleRows = [
    headers,
    ["1", "5201", "ខន", "ច័ន្ទរស្មី", "ស្រី", "28", "កញ្ញា", "2015", "រនាមពេជ្រ", "ចំប៉ា", "ឈុន", "រិទ្ធ", "កសិករ", "សឹម", "រក្សា", "កសិករ", "រនាមពេជ្រ", "ចំប៉ា", "088 545 8148", "សិស្សថ្មី"],
    ["2", "5202", "ចាន់", "សិទ្ធិ", "ប្រុស", "3", "តុលា", "2014", "អង្គក្រសាំង", "ព្រៃល្វា", "វ៉ិត", "កុសល", "កសិករ", "ហ៊ន", "នឿន", "កសិករ", "អង្គក្រសាំង", "ព្រៃល្វា", "012 94 35 86", ""]
  ];

  if (window.XLSX) {
    // Generate real .xlsx file using SheetJS
    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "បញ្ជីសិស្សគម្រូ");
    XLSX.writeFile(wb, "គម្រូបញ្ជីឈ្មោះសិស្ស_សាលាបឋមសិក្សាបាន្លួង.xlsx");
  } else {
    // Fallback to UTF-8 CSV with BOM for Excel
    let csv = "\uFEFF";
    sampleRows.forEach(row => {
      csv += row.map(c => `"${c}"`).join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "គម្រូបញ្ជីឈ្មោះសិស្ស_សាលាបឋមសិក្សាបាន្លួង.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// Toggle between File and Paste modes
function toggleImportType(type) {
  const fileWrap = document.getElementById("importFileInputWrap");
  const pasteWrap = document.getElementById("importPasteInputWrap");
  if (type === "file") {
    fileWrap.style.display = "block";
    pasteWrap.style.display = "none";
  } else {
    fileWrap.style.display = "none";
    pasteWrap.style.display = "block";
  }
}

// Open Import Modal
function openImportModal() {
  document.getElementById("importModalOverlay").classList.add("active");
  document.getElementById("importFileInput").value = "";
  const pasteArea = document.getElementById("importPasteText");
  if (pasteArea) pasteArea.value = "";
  document.getElementById("importPreviewArea").innerHTML = "";
  pendingImportRows = [];
}

function closeImportModal() {
  document.getElementById("importModalOverlay").classList.remove("active");
}

let pendingImportRows = [];

// Handle File Selection (XLSX, XLS, or CSV)
function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    if (window.XLSX) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          parseAndPreviewMatrix(rawRows);
        } catch (err) {
          console.error("XLSX parse error:", err);
          alert("មានបញ្ហាក្នុងការអាន File Excel! សូមពិនិត្យមើលទ្រង់ទ្រាយ File");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("កំពុងប្រើប្រាស់ Offline: សូមរក្សាទុកជា CSV ឬប្រើប្រាស់វិធីសាស្ត្រ 'បិទភ្ជាប់ទិន្នន័យ (Paste ពី Excel)'");
    }
  } else {
    // CSV or TXT
    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      const rawRows = lines.map(l => l.split(",").map(c => c.replace(/^"|"$/g, "").trim()));
      parseAndPreviewMatrix(rawRows);
    };
    reader.readAsText(file, "UTF-8");
  }
}

// Handle Paste from Excel (Tab-separated)
function handlePasteImport() {
  const text = document.getElementById("importPasteText").value;
  if (!text.trim()) {
    alert("សូមបិទភ្ជាប់ (Paste) ទិន្នន័យពី Excel ជាមុនសិន!");
    return;
  }
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rawRows = lines.map(line => {
    // Excel copy uses tabs (\t)
    return line.split(line.includes("\t") ? "\t" : ",").map(c => c.replace(/^"|"$/g, "").trim());
  });
  parseAndPreviewMatrix(rawRows);
}

// Universal parser for rows array
function parseAndPreviewMatrix(rows) {
  pendingImportRows = [];

  rows.forEach((cols, rIdx) => {
    if (!cols || cols.length < 3) return;

    // Check if first column is numeric (student number or index)
    const col0 = (cols[0] || "").toString().trim();
    if (/^\d+$/.test(col0)) {
      const num = parseInt(col0);
      const stId = (cols[1] || "").toString().trim();
      const lName = (cols[2] || "").toString().trim();
      const fName = (cols[3] || "").toString().trim();
      const gender = (cols[4] || "").toString().trim() || "ប្រុស";
      const dobDay = (cols[5] || "").toString().trim();
      const dobMonth = (cols[6] || "").toString().trim();
      const dobYear = (cols[7] || "").toString().trim();
      const pobVillage = (cols[8] || "").toString().trim();
      const pobCommune = (cols[9] || "").toString().trim();
      const fLast = (cols[10] || "").toString().trim();
      const fFirst = (cols[11] || "").toString().trim();
      const fJob = (cols[12] || "").toString().trim() || "កសិករ";
      const mLast = (cols[13] || "").toString().trim();
      const mFirst = (cols[14] || "").toString().trim();
      const mJob = (cols[15] || "").toString().trim() || "កសិករ";
      const addrVillage = (cols[16] || "").toString().trim() || pobVillage;
      const addrCommune = (cols[17] || "").toString().trim() || pobCommune;
      const phone = (cols[18] || "").toString().trim();
      const note = (cols[19] || "").toString().trim();

      if (lName || fName) {
        pendingImportRows.push({
          num: num,
          studentId: stId,
          lastName: lName,
          firstName: fName,
          fullName: `${lName} ${fName}`.trim(),
          gender: gender,
          dobDay: dobDay,
          dobMonth: dobMonth,
          dobYear: dobYear,
          pobVillage: pobVillage,
          pobCommune: pobCommune,
          fatherLastName: fLast,
          fatherFirstName: fFirst,
          fatherJob: fJob,
          motherLastName: mLast,
          motherFirstName: mFirst,
          motherJob: mJob,
          addrVillage: addrVillage,
          addrCommune: addrCommune,
          phone: phone,
          note: note,
          age: note
        });
      }
    }
  });

  const preview = document.getElementById("importPreviewArea");
  if (pendingImportRows.length === 0) {
    preview.innerHTML = `
      <div style="color: #dc2626; padding: 12px; background: #fee2e2; border-radius: 6px; font-size: 12px;">
        <i class="fa fa-triangle-exclamation"></i> រកមិនឃើញទិន្នន័យសិស្សត្រឹមត្រូវតាមជួរឈរគម្រូទេ! សូមពិនិត្យមើលជួរឈរ ឬទាញយកគម្រូ File Excel មកបំពេញ។
      </div>
    `;
    return;
  }

  let html = `
    <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; margin-top: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <strong style="color: #1e3a8a; font-size: 13px;">
          ✓ បានរកឃើញសិស្សចំនួន ${pendingImportRows.length} នាក់
        </strong>
      </div>
      <div style="max-height: 220px; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 4px;">
        <table class="official-table" style="font-size: 11px; margin: 0;">
          <thead>
            <tr>
              <th>ល.រ</th>
              <th>អត្តលេខ</th>
              <th>គោត្តនាម និង នាម</th>
              <th>ភេទ</th>
              <th>ថ្ងៃខែឆ្នាំកំណើត</th>
              <th>ទីកន្លែងកំណើត</th>
              <th>ឪពុក</th>
              <th>ម្ដាយ</th>
            </tr>
          </thead>
          <tbody>
  `;

  pendingImportRows.slice(0, 10).forEach(s => {
    html += `
      <tr>
        <td>${s.num}</td>
        <td style="font-weight: 600; color: #1e3a8a;">${s.studentId}</td>
        <td class="text-left" style="font-weight: 600;">${s.fullName}</td>
        <td>${s.gender === "ស្រី" ? '<span class="gender-badge female">ស្រី</span>' : '<span class="gender-badge male">ប្រុស</span>'}</td>
        <td>${s.dobDay} ${s.dobMonth} ${s.dobYear}</td>
        <td>${s.pobVillage} ${s.pobCommune}</td>
        <td>${s.fatherLastName} ${s.fatherFirstName}</td>
        <td>${s.motherLastName} ${s.motherFirstName}</td>
      </tr>
    `;
  });

  if (pendingImportRows.length > 10) {
    html += `<tr><td colspan="8" style="text-align: center; color: #64748b; font-style: italic;">... និងសិស្ស ${pendingImportRows.length - 10} នាក់ទៀត</td></tr>`;
  }

  html += `</tbody></table></div></div>`;
  preview.innerHTML = html;
}

// Commit the imported students into the active class
function commitImport() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }
  if (!pendingImportRows || pendingImportRows.length === 0) {
    alert("គ្មានទិន្នន័យសិស្សត្រូវនាំចូលទេ!");
    return;
  }

  const importModeElem = document.querySelector('input[name="importMode"]:checked');
  const importMode = importModeElem ? importModeElem.value : "append";

  // Initialize default academic scores & attendance for each student
  pendingImportRows.forEach((st, idx) => {
    st.scores = { khmer: 7.0, math: 7.0, science: 7.0, social: 7.0, pe: 8.0, art: 8.0 };
    st.totalScore = 44.0;
    st.avgScore = 7.33;
    st.mention = "ល្អ";
    st.result = "ជាប់";
    st.attendance = { present: 22, excused: 0, unexcused: 0 };
  });

  if (importMode === "replace") {
    // Replace current roster
    pendingImportRows.forEach((st, idx) => {
      st.num = idx + 1;
      st.rank = idx + 1;
    });
    currentClass.students = pendingImportRows;
  } else {
    // Append to current roster
    const startNum = currentClass.students.length;
    pendingImportRows.forEach((st, idx) => {
      st.num = startNum + idx + 1;
      st.rank = startNum + idx + 1;
      currentClass.students.push(st);
    });
  }

  saveDatabase();
  closeImportModal();
  renderStudentsRoster();
  renderDashboard();
  alert(`បាននាំចូលសិស្សចំនួន ${pendingImportRows.length} នាក់ ទៅក្នុង ${currentClass.grade} ដោយជោគជ័យ!`);
}

/* ==========================================================================
   3. DAILY ATTENDANCE (វត្តមានសិស្សប្រចាំថ្ងៃ)
   ========================================================================== */

const KHMER_MONTH_NAMES = [
  "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
  "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
];

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Ensure Default Monthly Attendance (បំពាក់ទិន្នន័យវត្តមានលំនាំដើមសម្រាប់ខែ)
 * ធានាថាក្នុងខែនីមួយៗ ថ្ងៃសិក្សាទាំងអស់មានវត្តមាន (✓) ថ្ងៃអាទិត្យ/បុណ្យជាតិមាន (X)
 */
function ensureDefaultMonthlyAttendance(currentClass, year, month) {
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) return;
  currentClass.attendanceRecords = currentClass.attendanceRecords || {};

  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const students = currentClass.students;

  // Check if this month has any existing attendance record
  let hasAnyRecord = false;
  for (let d = 1; d <= daysInMonth; d++) {
    const dKey = `${monthPrefix}-${String(d).padStart(2, '0')}`;
    if (currentClass.attendanceRecords[dKey] && currentClass.attendanceRecords[dKey].records) {
      hasAnyRecord = true;
      break;
    }
  }

  // If no record exists yet for this month, initialize school days with default 'P' (✓ វត្តមាន)
  if (!hasAnyRecord) {
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const isSunday = dateObj.getDay() === 0;
      const holName = getHolidayName(year, month, d);
      if (isSunday || !!holName) continue; // Skip Sundays and Holidays

      const dKey = `${monthPrefix}-${String(d).padStart(2, '0')}`;
      const recMap = {};

      students.forEach(s => {
        recMap[s.num] = { status: "P", reason: "" };
        s.dailyAttendance = s.dailyAttendance || {};
        s.dailyAttendance[dKey] = { status: "P", reason: "" };
      });

      currentClass.attendanceRecords[dKey] = {
        date: dKey,
        savedAt: new Date().toISOString(),
        records: recMap
      };
    }

    syncMonthlyAttendanceForClass(currentClass, `${monthPrefix}-01`);
  }
}

function syncMonthlyAttendanceForClass(currentClass, dateStr) {
  if (!currentClass || !dateStr) return;
  const parts = dateStr.split("-");
  const yearStr = parts[0];
  const monthStr = parts[1];
  const monthPrefix = `${yearStr}-${monthStr}`;

  currentClass.students.forEach(s => {
    let excusedMonth = 0;
    let unexcusedMonth = 0;
    let presentMonth = 0;
    let totalRecordedDays = 0;

    if (currentClass.attendanceRecords) {
      Object.keys(currentClass.attendanceRecords).forEach(dKey => {
        if (dKey.startsWith(monthPrefix)) {
          const rec = currentClass.attendanceRecords[dKey]?.records?.[s.num] ||
                      currentClass.attendanceRecords[dKey]?.records?.[String(s.num)] ||
                      s.dailyAttendance?.[dKey];
          if (rec) {
            totalRecordedDays++;
            if (rec.status === "L") excusedMonth++;
            else if (rec.status === "A") unexcusedMonth++;
            else if (rec.status === "P") presentMonth++;
          }
        }
      });
    }

    s.monthlyAttendance = s.monthlyAttendance || {};
    s.monthlyAttendance[monthPrefix] = {
      excused: excusedMonth,
      unexcused: unexcusedMonth,
      present: presentMonth,
      totalRecorded: totalRecordedDays
    };

    s.attendance = s.attendance || { excused: 0, unexcused: 0 };
    s.attendance.excused = excusedMonth;
    s.attendance.unexcused = unexcusedMonth;
  });
}

function autoSaveDailyAttendance(currentClass, dateStr) {
  if (!currentClass || !dateStr) return;
  currentClass.attendanceRecords = currentClass.attendanceRecords || {};
  const recMap = currentClass.attendanceRecords[dateStr]?.records || {};

  let countP = 0, countL = 0, countA = 0;
  currentClass.students.forEach(s => {
    s.dailyAttendance = s.dailyAttendance || {};
    const existingRec = recMap[s.num] || recMap[String(s.num)] || s.dailyAttendance[dateStr];
    const status = existingRec?.status || (s.activeAttDate === dateStr ? s.todayStatus : null) || "P";
    const reason = existingRec?.reason !== undefined ? existingRec.reason : (s.activeAttDate === dateStr ? (s.todayReason || "") : "");

    s.activeAttDate = dateStr;
    s.todayStatus = status;
    s.todayReason = reason;
    s.dailyAttendance[dateStr] = { status, reason };
    recMap[s.num] = { status, reason };

    if (status === "P") countP++;
    else if (status === "L") countL++;
    else if (status === "A") countA++;
  });

  const now = new Date();
  currentClass.attendanceRecords[dateStr] = {
    date: dateStr,
    savedAt: now.toISOString(),
    records: recMap,
    summary: {
      total: currentClass.students.length,
      present: countP,
      excused: countL,
      unexcused: countA
    }
  };

  syncMonthlyAttendanceForClass(currentClass, dateStr);
  saveDatabase();
}

/**
 * Toast Notification Helper (សារជូនដំណឹង)
 */
function showAttendanceToast(message, type = 'success') {
  let toast = document.getElementById("appToastNotification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToastNotification";
    document.body.appendChild(toast);
  }

  const bgColor = type === 'success' ? '#15803d' : (type === 'info' ? '#1d4ed8' : '#b91c1c');
  const icon = type === 'success' ? 'fa-check-circle' : (type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle');

  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 999999;
    background: ${bgColor};
    color: #ffffff;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.25);
    font-family: var(--font-battambang);
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    opacity: 0;
    transform: translateY(-20px);
    pointer-events: none;
  `;

  toast.innerHTML = `<i class="fa ${icon}" style="font-size: 18px;"></i> <span>${message}</span>`;

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
    toast.style.pointerEvents = "auto";
  });

  if (window.appToastTimeout) clearTimeout(window.appToastTimeout);
  window.appToastTimeout = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    toast.style.pointerEvents = "none";
  }, 4000);
}

/**
 * Mark All Students as Present (វត្តមានទាំងអស់)
 */
function markAllDailyPresent() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }

  const dateStr = state.activeAttendanceDate;
  const students = currentClass.students || [];

  if (students.length === 0) {
    alert("គ្មានទិន្នន័យសិស្សក្នុងថ្នាក់នេះទេ!");
    return;
  }

  // Update all students to Present ("P")
  students.forEach(s => {
    s.activeAttDate = dateStr;
    s.todayStatus = "P";
    s.todayReason = "";
    if (!s.dailyAttendance) s.dailyAttendance = {};
    s.dailyAttendance[dateStr] = { status: "P", reason: "" };
  });

  if (!currentClass.attendanceRecords) currentClass.attendanceRecords = {};
  currentClass.attendanceRecords[dateStr] = {
    date: dateStr,
    savedAt: new Date().toISOString(),
    records: {}
  };
  students.forEach(s => {
    currentClass.attendanceRecords[dateStr].records[s.num] = { status: "P", reason: "" };
  });

  const parts = dateStr.split("-");
  if (parts.length === 3) {
    state.activeAttendanceYear = parseInt(parts[0], 10);
    state.activeAttendanceMonth = parseInt(parts[1], 10);
    const mSel = document.getElementById("monthlyMonthSelect");
    if (mSel) mSel.value = String(state.activeAttendanceMonth);
    const ySel = document.getElementById("monthlyYearSelect");
    if (ySel) ySel.value = String(state.activeAttendanceYear);
  }

  syncMonthlyAttendanceForClass(currentClass, dateStr);
  saveDatabase();
  renderDailyAttendance();
  if (typeof renderMonthlyAttendance === "function") {
    renderMonthlyAttendance();
  }
  showAttendanceToast(`✓ បានកំណត់សិស្សទាំងអស់ (${students.length} នាក់) ជា «វត្តមាន» (ចេញសញ្ញា ✓ ក្នុងវត្តមានប្រចាំខែ) រួចរាល់!`, 'success');
}

/**
 * Save Daily Attendance Explicitly (រក្សាទុកវត្តមានប្រចាំថ្ងៃ និងលោតចូលវត្តមានប្រចាំខែដោយស្វ័យប្រវត្តិ)
 */
function saveDailyAttendanceExplicit() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }
  const dateStr = state.activeAttendanceDate;
  if (!dateStr) return;

  const parts = dateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const monthName = KHMER_MONTH_NAMES[month - 1] || "";

  // Synchronize year and month to state and UI select dropdowns
  state.activeAttendanceYear = year;
  state.activeAttendanceMonth = month;
  const mSel = document.getElementById("monthlyMonthSelect");
  if (mSel) mSel.value = String(month);
  const ySel = document.getElementById("monthlyYearSelect");
  if (ySel) ySel.value = String(year);

  // Perform full commit and save
  autoSaveDailyAttendance(currentClass, dateStr);

  // Synchronize monthly records
  syncMonthlyAttendanceForClass(currentClass, dateStr);

  // Save database to localStorage
  saveDatabase();

  if (currentClass) currentClass.clearedYearly = false;

  // Refresh views
  renderDailyAttendance();
  if (typeof renderMonthlyAttendance === "function") {
    renderMonthlyAttendance();
  }
  if (typeof renderYearlyAttendance === "function") {
    renderYearlyAttendance();
  }

  // Show clear toast notification
  showAttendanceToast(`✓ បានរក្សាទុកវត្តមានថ្ងៃទី ${day} ខែ ${monthName} ឆ្នាំ ${year} ដោយជោគជ័យ! ទិន្នន័យបានលោតចូលក្នុង «វត្តមានប្រចាំខែ» (វត្តមាន=✓, មានច្បាប់=P, ឥតច្បាប់=A) រួចរាល់។`, 'success');
}

/**
 * Quick Day Selection in Daily Attendance (តាមថ្ងៃនីមួយៗនៃខែ)
 */
function selectDailyAttendanceDay(d) {
  const parts = state.activeAttendanceDate.split("-");
  const year = parts[0] || String(state.activeAttendanceYear || 2026);
  const month = parts[1] || String(state.activeAttendanceMonth || 11).padStart(2, '0');
  const newDateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  
  state.activeAttendanceDate = newDateStr;
  const attDate = document.getElementById("attDatePicker");
  if (attDate) {
    attDate.value = newDateStr;
  }

  renderDailyAttendance();
  if (typeof renderMonthlyAttendance === "function") {
    renderMonthlyAttendance();
  }
}

function navigateDailyAttendanceDay(delta) {
  const parts = state.activeAttendanceDate.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  let day = parseInt(parts[2], 10) + delta;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  if (day < 1) day = 1;
  if (day > daysInMonth) day = daysInMonth;
  selectDailyAttendanceDay(day);
}

function renderDailyAttendance() {
  const currentClass = getActiveClass();
  const container = document.getElementById("dailyAttendanceTableWrap");
  if (!container) return;

  if (!currentClass) {
    container.innerHTML = `<p style="text-align:center; padding: 30px;">សូមជ្រើសរើសថ្នាក់រៀន</p>`;
    return;
  }

  const students = currentClass.students || [];
  const dateStr = state.activeAttendanceDate;
  const parts = dateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const monthName = KHMER_MONTH_NAMES[month - 1] || "";
  const daysInMonth = new Date(year, month, 0).getDate();

  // Keep state and UI filters in sync
  state.activeAttendanceYear = year;
  state.activeAttendanceMonth = month;
  const mSel = document.getElementById("monthlyMonthSelect");
  if (mSel && mSel.value !== String(month)) mSel.value = String(month);
  const ySel = document.getElementById("monthlyYearSelect");
  if (ySel && ySel.value !== String(year)) ySel.value = String(year);

  // Initialize or load attendance records strictly for this date
  currentClass.attendanceRecords = currentClass.attendanceRecords || {};
  let recMap = currentClass.attendanceRecords[dateStr]?.records;
  if (!recMap) {
    recMap = {};
    students.forEach(s => {
      const sDayRec = s.dailyAttendance?.[dateStr];
      const st = sDayRec?.status || "P";
      const rz = sDayRec?.reason || "";
      recMap[s.num] = { status: st, reason: rz };
      s.dailyAttendance = s.dailyAttendance || {};
      s.dailyAttendance[dateStr] = { status: st, reason: rz };
    });
    currentClass.attendanceRecords[dateStr] = {
      date: dateStr,
      savedAt: new Date().toISOString(),
      records: recMap
    };
  }

  // Count stats strictly for this date
  let countP = 0, countL = 0, countA = 0;
  students.forEach(s => {
    s.activeAttDate = dateStr;
    const r = recMap[s.num] || recMap[String(s.num)] || s.dailyAttendance?.[dateStr];
    const st = r?.status || "P";
    const rz = r?.reason || "";
    s.todayStatus = st;
    s.todayReason = rz;

    if (st === "P") countP++;
    else if (st === "L") countL++;
    else if (st === "A") countA++;
  });

  const totalStudents = students.length;
  const attRate = totalStudents > 0 ? Math.round((countP / totalStudents) * 100) : 100;

  // Build Day Selector Bar (តាមថ្ងៃនីមួយៗនៃខែ)
  let dayPillsHtml = "";
  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(year, month - 1, d);
    const dayOfWeek = dObj.getDay();
    const dayName = KHMER_DAYS_OF_WEEK_SHORT[dayOfWeek];
    const isSun = dayOfWeek === 0;
    const hol = getHolidayName(year, month, d);
    const isOff = isSun || !!hol;
    const isActive = d === day;
    const pillClass = `att-day-pill ${isActive ? 'active' : ''} ${isOff ? 'off-day' : ''}`;
    const tip = hol ? `${hol} (ថ្ងៃ${dayName})` : (isSun ? `ថ្ងៃអាទិត្យ` : `ថ្ងៃ${dayName}`);

    const dKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayRec = currentClass.attendanceRecords?.[dKey]?.records;
    let badgeHtml = "";
    if (isOff) {
      badgeHtml = `<span class="day-name" style="${isActive ? 'color:#ffffff;' : 'color:#dc2626; font-weight:700;'}">X (ឈប់)</span>`;
    } else {
      let dAbs = 0;
      if (dayRec) {
        Object.values(dayRec).forEach(v => {
          if (v.status === "L" || v.status === "A") dAbs++;
        });
      }
      if (dAbs > 0) {
        badgeHtml = `<span class="day-name" style="${isActive ? 'color:#fde047; font-weight:700;' : 'color:#d97706; font-weight:700;'}">អវត្ត:${dAbs}</span>`;
      } else {
        badgeHtml = `<span class="day-name">${dayName}</span>`;
      }
    }

    dayPillsHtml += `
      <div class="${pillClass}" onclick="selectDailyAttendanceDay(${d})" title="${tip}">
        <span class="day-num">${d}</span>
        ${badgeHtml}
      </div>
    `;
  }

  let html = `
    <!-- Official Print Header (Visible strictly in print) -->
    <div class="daily-print-header" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div style="text-align: left; font-size: 11px; line-height: 1.5; font-family: var(--font-battambang);">
          មន្ទីរអប់រំ យុវជន និងកីឡា ខេត្តតាកែវ<br>
          ការិយាល័យអប់រំ យុវជន និងកីឡា ស្រុកព្រៃកប្បាស<br>
          <strong>សាលាបឋមសិក្សា បាន្លួង</strong>
        </div>
        <div style="text-align: center;">
          <div style="font-family: var(--font-moul); font-size: 12px; color: #000080;">ព្រះរាជាណាចក្រកម្ពុជា</div>
          <div style="font-family: var(--font-moul); font-size: 10.5px; color: #000080; margin-top: 2px;">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
        </div>
      </div>
      <div style="text-align: center; margin: 10px 0;">
        <h2 style="font-family: var(--font-moul); font-size: 15px; color: #002060; margin: 0;">បញ្ជីវត្តមានសិស្សប្រចាំថ្ងៃ</h2>
        <div style="font-size: 12px; font-weight: 600; margin-top: 4px; font-family: var(--font-battambang);">
          ថ្នាក់ទី៖ <strong>${currentClass.grade}</strong> | ថ្ងៃទី <strong>${day}</strong> ខែ <strong>${monthName}</strong> ឆ្នាំ <strong>${year}</strong> | ឆ្នាំសិក្សា៖ <strong>${currentClass.academicYear}</strong>
        </div>
      </div>
    </div>

    <!-- Header Meta & Clean Live Stats -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
      <div>
        <h3 style="font-size: 16px; font-weight: 700; color: var(--primary); margin: 0;">
          វត្តមានប្រចាំថ្ងៃ៖ ${currentClass.grade} (ថ្ងៃទី ${day} ខែ ${monthName} ឆ្នាំ ${year})
        </h3>
        <p style="font-size: 12px; color: #64748b; margin-top: 4px;">
          គ្រូប្រចាំថ្នាក់: <strong>${currentClass.teacher}</strong> | ឆ្នាំសិក្សា: <strong>${currentClass.academicYear}</strong> | កាលបរិច្ឆេទ: <code>${dateStr}</code>
        </p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;" class="no-print">
        <button type="button" class="btn btn-action-save" onclick="saveDailyAttendanceExplicit()" title="រក្សាទុកវត្តមាន និងបញ្ជូនចូលវត្តមានប្រចាំខែ">
          <i class="fa-solid fa-floppy-disk" style="font-size: 14px;"></i> រក្សាទុកវត្តមាន
        </button>
        <button type="button" class="btn btn-action-outline" onclick="markAllDailyPresent()" title="កំណត់សិស្សទាំងអស់ក្នុងថ្នាក់ជា «វត្តមាន» ដោយស្វ័យប្រវត្តិ">
          <i class="fa-solid fa-check-double" style="color: #16a34a; font-size: 14px;"></i> វត្តមានទាំងអស់
        </button>
        <button type="button" class="btn btn-action-outline" onclick="switchTab('attendance_monthly')" title="មើលតារាងវត្តមានប្រចាំខែ">
          <i class="fa-solid fa-calendar-days" style="color: #2563eb; font-size: 14px;"></i> មើលវត្តមានប្រចាំខែ
        </button>
        <button type="button" class="btn btn-action-amber" onclick="printDailyAttendance()" title="បោះពុម្ពបញ្ជីវត្តមានប្រចាំថ្ងៃ">
          <i class="fa-solid fa-print" style="font-size: 14px;"></i> បោះពុម្ព
        </button>
        <button type="button" class="btn btn-action-danger" onclick="clearDailyAttendanceData()" title="សម្អាតទិន្នន័យវត្តមានប្រចាំថ្ងៃនេះ">
          <i class="fa-solid fa-trash-can" style="color: #dc2626; font-size: 14px;"></i> សម្អាតទិន្នន័យ
        </button>
        <button type="button" class="btn btn-action-undo" onclick="undoDailyAttendanceData()" title="ត្រឡប់ទិន្នន័យវត្តមានប្រចាំថ្ងៃមកវិញ">
          <i class="fa-solid fa-rotate-left" style="color: #4338ca; font-size: 14px;"></i> ត្រឡប់មកវិញ (Undo)
        </button>
      </div>
    </div>

    <!-- Live Stat Badges Bar -->
    <div style="display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;">
      <div class="att-stat-pill total">
        <i class="fa fa-users" style="color: #64748b;"></i> សិស្សសរុប: <strong>${totalStudents}</strong> នាក់
      </div>
      <div class="att-stat-pill present">
        <i class="fa fa-circle-check" style="color: #16a34a;"></i> វត្តមាន (✓): <strong style="color: #16a34a;">${countP}</strong> នាក់
      </div>
      <div class="att-stat-pill excused">
        <i class="fa fa-clock" style="color: #d97706;"></i> មានច្បាប់ (P): <strong style="color: #d97706;">${countL}</strong> នាក់
      </div>
      <div class="att-stat-pill unexcused">
        <i class="fa fa-circle-xmark" style="color: #dc2626;"></i> ឥតច្បាប់ (A): <strong style="color: #dc2626;">${countA}</strong> នាក់
      </div>
      <div class="att-stat-pill present" style="background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe;">
        <i class="fa fa-chart-pie"></i> អត្រាវត្តមាន: <strong>${attRate}%</strong>
      </div>
    </div>

    <!-- Quick Day Selector Bar (តាមថ្ងៃនីមួយៗនៃខែ) -->
    <div class="att-day-picker-bar no-print">
      <button type="button" class="att-day-nav-btn" onclick="navigateDailyAttendanceDay(-1)" title="ថ្ងៃមុន">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <div class="att-day-pills-scroll">
        ${dayPillsHtml}
      </div>
      <button type="button" class="att-day-nav-btn" onclick="navigateDailyAttendanceDay(1)" title="ថ្ងៃបន្ទាប់">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>

    <!-- Info Banner: Attendance Symbol Mapping Pattern (លំនាំសញ្ញាវត្តមាន) -->
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 9px 14px; margin-bottom: 14px; font-size: 12.5px; color: #166534; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;" class="no-print">
      <div>
        <i class="fa-solid fa-circle-check" style="color: #16a34a; margin-right: 6px;"></i>
        <strong>លំនាំសញ្ញាវត្តមានស្វ័យប្រវត្តិ៖</strong>
        រើស <strong>«✓ វត្តមាន»</strong> លោតចេញសញ្ញា <strong><code style="color: #009900; font-weight: 700; font-size: 13.5px; background: #ffffff; padding: 1px 6px; border: 1px solid #86efac; border-radius: 4px;">✓</code></strong> |
        រើស <strong>«P មានច្បាប់»</strong> លោតចេញអក្សរ <strong><code style="color: #d97706; font-weight: 700; font-size: 13.5px; background: #ffffff; padding: 1px 6px; border: 1px solid #fde68a; border-radius: 4px;">P</code></strong> |
        រើស <strong>«A ឥតច្បាប់»</strong> លោតចេញអក្សរ <strong><code style="color: #c00000; font-weight: 700; font-size: 13.5px; background: #ffffff; padding: 1px 6px; border: 1px solid #fecaca; border-radius: 4px;">A</code></strong> ក្នុងតារាងវត្តមានប្រចាំខែ
      </div>
      <div style="font-size: 11.5px; color: #15803d;">
        <i class="fa-solid fa-cloud-arrow-up"></i> សមកាលកម្មស្វ័យប្រវត្តទៅ <strong>វត្តមានប្រចាំខែ</strong>
      </div>
    </div>

    <!-- Daily Attendance Table -->
    <table class="data-table" style="font-size: 12px;">
      <thead>
        <tr>
          <th style="width: 45px;">ល.រ</th>
          <th style="width: 75px;">អត្តលេខ</th>
          <th style="text-align: left; min-width: 170px;">គោត្តនាម និង នាម</th>
          <th style="width: 55px;">ភេទ</th>
          <th style="width: 250px;">ស្ថានភាពវត្តមាន (ចុចរើស)</th>
          <th>មូលហេតុ / កំណត់សម្គាល់</th>
        </tr>
      </thead>
      <tbody>
  `;

  students.forEach((s, idx) => {
    const status = s.todayStatus || "P";
    const reason = s.todayReason || "";

    html += `
      <tr>
        <td>${idx + 1}</td>
        <td>${s.studentId || "-"}</td>
        <td class="text-left" style="font-weight: 600;">${s.fullName}</td>
        <td>${s.gender === "ស្រី" ? '<span class="gender-badge female">ស្រី</span>' : '<span class="gender-badge male">ប្រុស</span>'}</td>
        <td>
          <div style="display: flex; justify-content: center; gap: 6px;">
            <button type="button" class="att-status-btn ${status === 'P' ? 'present' : ''}" onclick="setDailyStudentStatus(${s.num}, 'P')" title="វត្តមាន (បញ្ជូនសញ្ញា ✓ ទៅវត្តមានប្រចាំខែ)">
              ✓ វត្តមាន
            </button>
            <button type="button" class="att-status-btn ${status === 'L' ? 'excused' : ''}" onclick="setDailyStudentStatus(${s.num}, 'L')" title="មានច្បាប់ (បញ្ជូនអក្សរ P ទៅវត្តមានប្រចាំខែ)">
              P មានច្បាប់
            </button>
            <button type="button" class="att-status-btn ${status === 'A' ? 'unexcused' : ''}" onclick="setDailyStudentStatus(${s.num}, 'A')" title="ឥតច្បាប់ (បញ្ជូនអក្សរ A ទៅវត្តមានប្រចាំខែ)">
              A ឥតច្បាប់
            </button>
          </div>
        </td>
        <td>
          <input type="text" class="form-control" style="font-size: 11px; padding: 3px 8px;" placeholder="មូលហេតុ (ឧ. ឈឺ, ធុរៈ...)" value="${escapeHtml(reason)}" oninput="setDailyStudentReason(${s.num}, this.value)">
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <!-- Official Print Signatures (Visible strictly in print) -->
    <div class="daily-print-signatures" style="display: none;">
      <div style="text-align: center; width: 220px; font-family: var(--font-battambang); font-size: 11px;">
        <div>បានឃើញ និងឯកភាព</div>
        <div style="font-weight: 700; margin-top: 2px;">នាយកសាលា</div>
        <div style="height: 55px;"></div>
        <div style="font-weight: 700;">${state.db?.schoolInfo?.principalName || "ផែត សារុន"}</div>
      </div>
      <div style="text-align: center; width: 220px; font-family: var(--font-battambang); font-size: 11px;">
        <div>ថ្ងៃទី....... ខែ....... ឆ្នាំ ${toKhmerNum(year)}</div>
        <div style="font-weight: 700; margin-top: 2px;">គ្រូប្រចាំថ្នាក់</div>
        <div style="height: 55px;"></div>
        <div style="font-weight: 700;">${currentClass.teacher || ""}</div>
      </div>
    </div>

    <!-- Bottom Save Attendance Panel -->
    <div style="margin-top: 16px; padding: 12px 18px; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div style="font-size: 12.5px; color: #475569;">
        <i class="fa fa-info-circle" style="color: #2563eb;"></i> ពេលជ្រើសរើសវត្តមានរួចរាល់ សូមចុច <strong>«រក្សាទុកវត្តមាន»</strong> ដើម្បីឱ្យទិន្នន័យលោតចូលក្នុង <strong>«វត្តមានប្រចាំខែ»</strong> ដោយស្វ័យប្រវត្តិ។
      </div>
      <div style="display: flex; gap: 10px; align-items: center;" class="no-print">
        <button type="button" class="btn btn-action-save" onclick="saveDailyAttendanceExplicit()" style="padding: 7px 18px;" title="រក្សាទុកវត្តមាន និងបញ្ជូនចូលវត្តមានប្រចាំខែ">
          <i class="fa-solid fa-floppy-disk"></i> រក្សាទុកវត្តមាន
        </button>
        <button type="button" class="btn btn-action-outline" onclick="switchTab('attendance_monthly')" style="padding: 7px 16px;">
          <i class="fa-solid fa-calendar-days" style="color: #2563eb;"></i> មើលវត្តមានប្រចាំខែ <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </div>
  `;

  container.innerHTML = html;
  initMovableApproval('movableApprovalBlockMonthly', 'monthly');
}

function setDailyStudentStatus(num, status) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const dateStr = state.activeAttendanceDate;
  if (!dateStr) return;

  const s = currentClass.students.find(st => st.num === num);
  if (!s) return;

  // Ensure class attendance records object exists
  currentClass.attendanceRecords = currentClass.attendanceRecords || {};
  if (!currentClass.attendanceRecords[dateStr] || !currentClass.attendanceRecords[dateStr].records) {
    currentClass.attendanceRecords[dateStr] = {
      date: dateStr,
      savedAt: new Date().toISOString(),
      records: {}
    };
    currentClass.students.forEach(st => {
      const existingStatus = st.dailyAttendance?.[dateStr]?.status || "P";
      const existingReason = st.dailyAttendance?.[dateStr]?.reason || "";
      currentClass.attendanceRecords[dateStr].records[st.num] = {
        status: existingStatus,
        reason: existingReason
      };
      st.dailyAttendance = st.dailyAttendance || {};
      st.dailyAttendance[dateStr] = { status: existingStatus, reason: existingReason };
    });
  }

  // Update target student only
  const reason = s.dailyAttendance?.[dateStr]?.reason || "";
  currentClass.attendanceRecords[dateStr].records[num] = { status, reason };
  s.dailyAttendance = s.dailyAttendance || {};
  s.dailyAttendance[dateStr] = { status, reason };
  s.todayStatus = status;
  s.activeAttDate = dateStr;

  // Sync monthly totals
  syncMonthlyAttendanceForClass(currentClass, dateStr);

  // Auto-save to localStorage
  saveDatabase();

  // Re-render views
  renderDailyAttendance();
  if (typeof renderMonthlyAttendance === "function") {
    renderMonthlyAttendance();
  }
}

function setDailyStudentReason(num, reason) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const dateStr = state.activeAttendanceDate;
  if (!dateStr) return;

  const s = currentClass.students.find(st => st.num === num);
  if (!s) return;

  s.todayReason = reason;
  s.dailyAttendance = s.dailyAttendance || {};
  const status = s.dailyAttendance[dateStr]?.status || s.todayStatus || "P";
  s.dailyAttendance[dateStr] = { status, reason };

  if (currentClass.attendanceRecords && currentClass.attendanceRecords[dateStr] && currentClass.attendanceRecords[dateStr].records) {
    currentClass.attendanceRecords[dateStr].records[num] = { status, reason };
  }

  saveDatabase();
}


/**
 * Clear Daily Attendance Data for Active Class and Date (សម្អាតទិន្នន័យវត្តមានប្រចាំថ្ងៃ)
 */
function clearDailyAttendanceData() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }
  const dateStr = state.activeAttendanceDate || getTodayDateString();
  const ok = confirm(`តើលោកគ្រូ/អ្នកគ្រូពិតជាចង់សម្អាតទិន្នន័យវត្តមានប្រចាំថ្ងៃទី ${dateStr} នៃ «${currentClass.grade}» មែនទេ?\n\n⚠️ សកម្មភាពនេះនឹងកំណត់វត្តមានសិស្សទាំងអស់នៅថ្ងៃនេះទៅជាទទេឡើងវិញ!\n(លោកគ្រូ/អ្នកគ្រូអាចចុចប៊ូតុង «ត្រឡប់មកវិញ (Undo)» ដើម្បីទាញទិន្នន័យមកវិញបាន)`);
  if (!ok) return;

  // Save history snapshot before clearing
  if (!window._undoHistory) window._undoHistory = { students: {}, dailyAtt: {}, monthlyAtt: {} };
  const key = `${currentClass.id}_${dateStr}`;
  if (!window._undoHistory.dailyAtt[key]) window._undoHistory.dailyAtt[key] = [];
  window._undoHistory.dailyAtt[key].push({
    attendanceRecord: currentClass.attendanceRecords && currentClass.attendanceRecords[dateStr] ? JSON.parse(JSON.stringify(currentClass.attendanceRecords[dateStr])) : null,
    studentsDaily: (currentClass.students || []).map(s => ({
      num: s.num,
      dailyStatus: s.dailyAttendance ? s.dailyAttendance[dateStr] : null,
      todayStatus: s.todayStatus,
      todayReason: s.todayReason,
      activeAttDate: s.activeAttDate
    }))
  });

  // Clear daily attendance for this date
  if (currentClass.attendanceRecords && currentClass.attendanceRecords[dateStr]) {
    delete currentClass.attendanceRecords[dateStr];
  }
  if (currentClass.students) {
    currentClass.students.forEach(s => {
      if (s.dailyAttendance && s.dailyAttendance[dateStr]) {
        delete s.dailyAttendance[dateStr];
      }
      if (s.activeAttDate === dateStr) {
        s.todayStatus = "";
        s.todayReason = "";
      }
    });
  }

  syncMonthlyAttendanceForClass(currentClass, dateStr);
  saveDatabase();
  renderDailyAttendance();
  if (state.activeTab === "attendance_monthly") renderMonthlyAttendance();
  showAttendanceToast(`✓ បានសម្អាតទិន្នន័យវត្តមានថ្ងៃទី ${dateStr} ដោយជោគជ័យ! (អាចចុច Undo ដើម្បីត្រឡប់មកវិញ)`, 'info');
}

/**
 * Undo Daily Attendance Clearing for Active Class and Date (ត្រឡប់ទិន្នន័យវត្តមានប្រចាំថ្ងៃមកវិញ)
 */
function undoDailyAttendanceData() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }
  const dateStr = state.activeAttendanceDate || getTodayDateString();
  const key = `${currentClass.id}_${dateStr}`;
  const history = window._undoHistory && window._undoHistory.dailyAtt && window._undoHistory.dailyAtt[key];
  if (!history || history.length === 0) {
    alert(`គ្មានទិន្នន័យវត្តមានប្រចាំថ្ងៃ ${dateStr} ដែលបានសម្អាតដើម្បីត្រឡប់មកវិញ (Undo) ទេ!`);
    return;
  }
  const lastState = history.pop();
  if (!currentClass.attendanceRecords) currentClass.attendanceRecords = {};
  if (lastState.attendanceRecord) {
    currentClass.attendanceRecords[dateStr] = lastState.attendanceRecord;
  } else {
    delete currentClass.attendanceRecords[dateStr];
  }

  if (currentClass.students && lastState.studentsDaily) {
    const map = new Map(lastState.studentsDaily.map(x => [x.num, x]));
    currentClass.students.forEach(s => {
      const snap = map.get(s.num);
      if (snap) {
        if (!s.dailyAttendance) s.dailyAttendance = {};
        if (snap.dailyStatus) {
          s.dailyAttendance[dateStr] = snap.dailyStatus;
        } else {
          delete s.dailyAttendance[dateStr];
        }
        if (s.activeAttDate === dateStr) {
          s.todayStatus = snap.todayStatus;
          s.todayReason = snap.todayReason;
        }
      }
    });
  }

  syncMonthlyAttendanceForClass(currentClass, dateStr);
  saveDatabase();
  renderDailyAttendance();
  if (state.activeTab === "attendance_monthly") renderMonthlyAttendance();
  showAttendanceToast(`↩ បានត្រឡប់ទិន្នន័យវត្តមានថ្ងៃទី ${dateStr} មកវិញដោយជោគជ័យ!`, 'success');
}

function markAllAttendance(status) {
  markAllDailyPresent();
}

function saveDailyAttendance() {
  saveDailyAttendanceExplicit();
}

/* ==========================================================================
   4. MONTHLY ATTENDANCE (វត្តមានសិស្សប្រចាំខែ)
   ========================================================================== */

function changeMonthlyMonth(monthVal) {
  state.activeAttendanceMonth = parseInt(monthVal, 10);
  const parts = state.activeAttendanceDate.split("-");
  const year = parts[0] || String(state.activeAttendanceYear || 2026);
  const day = parts[2] || "01";
  const daysInNewMonth = new Date(parseInt(year, 10), state.activeAttendanceMonth, 0).getDate();
  const safeDay = Math.min(parseInt(day, 10), daysInNewMonth);
  state.activeAttendanceDate = `${year}-${String(state.activeAttendanceMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  
  const attDate = document.getElementById("attDatePicker");
  if (attDate) attDate.value = state.activeAttendanceDate;

  renderMonthlyAttendance();
  if (state.activeTab === "attendance_daily") {
    renderDailyAttendance();
  }
}

function changeMonthlyYear(yearVal) {
  state.activeAttendanceYear = parseInt(yearVal, 10);
  const parts = state.activeAttendanceDate.split("-");
  const month = parts[1] || String(state.activeAttendanceMonth || 11).padStart(2, '0');
  const day = parts[2] || "01";
  const daysInNewMonth = new Date(state.activeAttendanceYear, parseInt(month, 10), 0).getDate();
  const safeDay = Math.min(parseInt(day, 10), daysInNewMonth);
  state.activeAttendanceDate = `${state.activeAttendanceYear}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  
  const attDate = document.getElementById("attDatePicker");
  if (attDate) attDate.value = state.activeAttendanceDate;

  renderMonthlyAttendance();
  if (state.activeTab === "attendance_daily") {
    renderDailyAttendance();
  }
}

function toKhmerNum(num) {
  if (num === null || num === undefined) return "";
  const khmerDigits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  return String(num).replace(/[0-9]/g, d => khmerDigits[parseInt(d, 10)]);
}

/**
 * Cambodian Public Holidays (ថ្ងៃបុណ្យជាតិ និងបុណ្យអន្តរជាតិ)
 */
const CAMBODIA_FIXED_HOLIDAYS = {
  "1-1": "ទិវាចូលឆ្នាំសកល",
  "1-7": "ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍",
  "3-8": "ទិវាអន្តរជាតិនារី",
  "4-13": "ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ",
  "4-14": "ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ",
  "4-15": "ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ",
  "4-16": "ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ",
  "5-1": "ទិវាពលកម្មអន្តរជាតិ",
  "5-14": "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះមហាក្សត្រ",
  "6-18": "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម សម្តេចព្រះមហាក្សត្រី",
  "9-24": "ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ",
  "10-15": "ទិវាគោរពព្រះវិញ្ញាណក្ខន្ធ ព្រះបរមរតនកោដ្ឋ",
  "10-29": "ព្រះរាជពិធីគ្រងព្រះបរមរាជសម្បត្តិ",
  "11-9": "ពិធីបុណ្យឯករាជ្យជាតិ"
};

const CAMBODIA_YEARLY_HOLIDAYS = {
  2024: {
    "5-22": "ពិធីបុណ្យវិសាខបូជា",
    "5-26": "ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល",
    "10-1": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "10-2": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "10-3": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "11-14": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប",
    "11-15": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប",
    "11-16": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប"
  },
  2025: {
    "5-12": "ពិធីបុណ្យវិសាខបូជា",
    "5-16": "ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល",
    "9-21": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "9-22": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "9-23": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "11-4": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប",
    "11-5": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប",
    "11-6": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប"
  },
  2026: {
    "5-1": "ពិធីបុណ្យវិសាខបូជា",
    "5-5": "ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល",
    "10-10": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "10-11": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "10-12": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "11-23": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប",
    "11-24": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប",
    "11-25": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប"
  },
  2027: {
    "5-20": "ពិធីបុណ្យវិសាខបូជា",
    "5-24": "ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល",
    "9-29": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "9-30": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "10-1": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "11-12": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប",
    "11-13": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប",
    "11-14": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប"
  },
  2028: {
    "5-8": "ពិធីបុណ្យវិសាខបូជា",
    "5-12": "ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល",
    "9-18": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "9-19": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "9-20": "ពិធីបុណ្យភ្ជុំបិណ្ឌ",
    "11-1": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប",
    "11-2": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប",
    "11-3": "ពិធីបុណ្យអុំទូក បណ្តែតប្រទីប"
  }
};

const KHMER_DAYS_OF_WEEK_SHORT = ["អា", "ច", "អ", "ពុ", "ព្រ", "សុ", "ស"];

function getHolidayName(year, month, day) {
  const mKey = `${month}-${day}`;
  if (CAMBODIA_FIXED_HOLIDAYS[mKey]) return CAMBODIA_FIXED_HOLIDAYS[mKey];
  if (CAMBODIA_YEARLY_HOLIDAYS[year] && CAMBODIA_YEARLY_HOLIDAYS[year][mKey]) {
    return CAMBODIA_YEARLY_HOLIDAYS[year][mKey];
  }
  return null;
}

/**
 * 4. MONTHLY ATTENDANCE REGISTER (១០០% តាមគម្រូផ្លូវការ ក្រសួងអប់រំ យុវជន និងកីឡា)
 */
function renderMonthlyAttendance() {
  const currentClass = getActiveClass();
  const container = document.getElementById("monthlyAttendanceWrap");
  if (!container) return;

  if (!currentClass) {
    container.innerHTML = `<p style="text-align:center; padding: 30px;">សូមជ្រើសរើសថ្នាក់រៀន</p>`;
    return;
  }

  const students = currentClass.students || [];
  const month = state.activeAttendanceMonth || 11;
  const year = state.activeAttendanceYear || 2026;
  const monthName = KHMER_MONTH_NAMES[month - 1] || "";
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

  // Automatically ensure default records for this month if missing
  ensureDefaultMonthlyAttendance(currentClass, year, month);

  // Ensure filter selects match state
  const mSel = document.getElementById("monthlyMonthSelect");
  if (mSel) mSel.value = String(month);
  const ySel = document.getElementById("monthlyYearSelect");
  if (ySel) {
    if (!ySel.querySelector(`option[value="${year}"]`)) {
      const opt = document.createElement("option");
      opt.value = String(year);
      opt.textContent = `${toKhmerNum(year)} (${year})`;
      ySel.appendChild(opt);
    }
    ySel.value = String(year);
  }

  // Count genders
  let maleCount = 0;
  let femaleCount = 0;
  students.forEach(s => {
    if (s.gender === "ស្រី") femaleCount++;
    else maleCount++;
  });
  const totalStudents = students.length;

  // Track daily presents and absences for summary
  const dailyPresentCount = new Array(32).fill(0);
  const dailyHasRecords = new Array(32).fill(false);
  let totalClassExcused = 0;
  let totalClassUnexcused = 0;

  // Track recorded days in this month
  const savedDatesInMonth = [];
  if (currentClass.attendanceRecords) {
    Object.keys(currentClass.attendanceRecords).forEach(dKey => {
      if (dKey.startsWith(monthPrefix)) {
        savedDatesInMonth.push(dKey);
      }
    });
  }

  // Calculate school days (excluding Sundays and Holidays)
  let schoolDaysInMonth = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const isSun = new Date(year, month - 1, d).getDay() === 0;
    const isHol = !!getHolidayName(year, month, d);
    if (!isSun && !isHol) {
      schoolDaysInMonth++;
    }
    const dateKey = `${monthPrefix}-${String(d).padStart(2, '0')}`;
    if (currentClass.attendanceRecords && currentClass.attendanceRecords[dateKey]) {
      dailyHasRecords[d] = true;
    }
  }

  // Build Table Header Days 1..31 (Row 1: Numbers, Row 2: អា,ច,អ,ពុ,ព្រ,សុ,ស)
  let headerDaysRow1 = "";
  let headerDaysRow2 = "";
  for (let d = 1; d <= 31; d++) {
    if (d <= daysInMonth) {
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.getDay();
      const dayName = KHMER_DAYS_OF_WEEK_SHORT[dayOfWeek];
      const isSunday = dayOfWeek === 0;
      const holName = getHolidayName(year, month, d);
      const isHoliday = !!holName;
      const isOff = isSunday || isHoliday;
      const titleTip = holName ? `${holName} (ថ្ងៃ${dayName})` : (isSunday ? `ថ្ងៃអាទិត្យ` : `ថ្ងៃ${dayName}`);

      headerDaysRow1 += `<th style="width: 20px; font-family: var(--font-battambang); ${isOff ? 'color: #c00000; background: #fff1f2;' : ''}" title="${titleTip}">${d}</th>`;
      headerDaysRow2 += `<th style="width: 20px; font-size: 9px; font-weight: 700; ${isOff ? 'color: #c00000; background: #fff1f2;' : 'color: #0000cc;'}" title="${titleTip}">${dayName}</th>`;
    } else {
      headerDaysRow1 += `<th class="day-inactive" style="width: 20px; background: #fafafa; opacity: 0.4;">${d}</th>`;
      headerDaysRow2 += `<th class="day-inactive" style="width: 20px; background: #fafafa;"></th>`;
    }
  }

  // Build Student Rows with Equal Spacing for LastName and FirstName
  let studentRowsHtml = "";
  students.forEach((s, idx) => {
    let sExcused = 0;
    let sUnexcused = 0;
    let sPresent = 0;
    let dayCells = "";

    for (let d = 1; d <= 31; d++) {
      if (d <= daysInMonth) {
        const dateObj = new Date(year, month - 1, d);
        const isSunday = dateObj.getDay() === 0;
        const holName = getHolidayName(year, month, d);
        const isHoliday = !!holName;
        const dateKey = `${monthPrefix}-${String(d).padStart(2, '0')}`;

        if (isSunday || isHoliday) {
          dayCells += `<td class="mark-sunday" title="${holName || 'ថ្ងៃអាទិត្យ'}">X</td>`;
        } else {
          const dayRecord = currentClass.attendanceRecords?.[dateKey]?.records?.[s.num] ||
                            currentClass.attendanceRecords?.[dateKey]?.records?.[String(s.num)] ||
                            s.dailyAttendance?.[dateKey];
          let status = dayRecord?.status;
          if (!status && dateKey === state.activeAttendanceDate && s.activeAttDate === dateKey && s.todayStatus) {
            status = s.todayStatus;
          }
          if (!status) {
            status = "P";
          }

          if (status === "L") {
            sExcused++;
            dailyHasRecords[d] = true;
            dayCells += `<td class="mark-excused" title="ថ្ងៃទី ${d}: មានច្បាប់">P</td>`;
          } else if (status === "A") {
            sUnexcused++;
            dailyHasRecords[d] = true;
            dayCells += `<td class="mark-unexcused" title="ថ្ងៃទី ${d}: ឥតច្បាប់">A</td>`;
          } else {
            sPresent++;
            dailyPresentCount[d]++;
            dailyHasRecords[d] = true;
            dayCells += `<td class="mark-present" title="ថ្ងៃទី ${d}: វត្តមាន">✓</td>`;
          }
        }
      } else {
        // Day out of range for this month
        dayCells += `<td class="day-inactive" style="background: #fafafa;"></td>`;
      }
    }

    totalClassExcused += sExcused;
    totalClassUnexcused += sUnexcused;
    const sTotalAbs = sExcused + sUnexcused;
    const sIdFormatted = s.studentId ? String(s.studentId).padStart(4, '0') : String(idx + 1).padStart(4, '0');

    // Equal Spacing for Family Name and Given Name (ដូចក្នុងបញ្ជីឈ្មោះសិស្ស)
    const lName = s.lastName || (s.fullName ? s.fullName.trim().split(/\s+/)[0] : "");
    const fName = s.firstName || (s.fullName ? s.fullName.trim().split(/\s+/).slice(1).join(" ") : "");

    studentRowsHtml += `
      <tr>
        <td>${idx + 1}</td>
        <td class="td-id">${sIdFormatted}</td>
        <td class="td-name text-left border-no-r" style="width: 70px; padding-left: 6px; padding-right: 2px; white-space: nowrap;">${escapeHtml(lName)}</td>
        <td class="td-name text-left border-no-l" style="width: 75px; padding-left: 2px; padding-right: 4px; white-space: nowrap;">${escapeHtml(fName)}</td>
        <td class="td-gender">${s.gender}</td>
        ${dayCells}
        <td>${sExcused}</td>
        <td>${sUnexcused}</td>
        <td>${sTotalAbs}</td>
        <td></td>
      </tr>
    `;
  });

  // Build Summary Row
  let summaryDaysHtml = "";
  for (let d = 1; d <= 31; d++) {
    if (d <= daysInMonth) {
      const dateObj = new Date(year, month - 1, d);
      const isSunday = dateObj.getDay() === 0;
      const holName = getHolidayName(year, month, d);
      const isHoliday = !!holName;

      if (isSunday || isHoliday) {
        summaryDaysHtml += `<td class="mark-sunday" title="${holName || 'ថ្ងៃអាទិត្យ'}">X</td>`;
      } else {
        summaryDaysHtml += `<td style="color: #0000cc; font-weight: 700; font-size: 9.5px;">${dailyPresentCount[d]}</td>`;
      }
    } else {
      summaryDaysHtml += `<td></td>`;
    }
  }

  const totalClassAbs = totalClassExcused + totalClassUnexcused;
  const activeSessions = savedDatesInMonth.length > 0 ? savedDatesInMonth.length : (schoolDaysInMonth || 24);
  const tReq = totalStudents * activeSessions;
  const tAbs = totalClassAbs;
  const tAct = Math.max(0, tReq - tAbs);
  const pctAbs = tReq > 0 ? ((tAbs / tReq) * 100).toFixed(2) : "0.00";
  const academicYear = currentClass.academicYear || state.currentYear || "២០២៦-២០២៧";

  // Editable Teacher Date for Monthly Attendance (កាលបរិច្ឆេទគ្រូប្រចាំថ្នាក់អាចកែប្រែបាន)
  const defaultMonthlyDate = `ធ្វើនៅ បាន្លួង ថ្ងៃទី ${toKhmerNum(daysInMonth)} ខែ ${monthName} ឆ្នាំ ${toKhmerNum(year)}`;
  const monthlyTeacherDate = (currentClass.monthlyDates && currentClass.monthlyDates[monthPrefix])
    ? currentClass.monthlyDates[monthPrefix]
    : defaultMonthlyDate;

  let html = `
    <div class="monthly-register-page">
      <!-- Top Official Header -->
      <div class="monthly-reg-header">
        <div class="monthly-reg-top-grid">
          <div class="monthly-reg-admin">
            មន្ទីរអប់រំ យុវជន និងកីឡា រាជធានី / ខេត្ត តាកែវ<br>
            ការិយាល័យអប់រំ យុវជន និងកីឡារដ្ឋបាលក្រុង / ស្រុក / ខណ្ឌ ព្រៃកប្បាស<br>
            សាលាបឋមសិក្សា បាន្លួង
          </div>
          <div class="monthly-reg-kingdom-center">
            <div class="monthly-reg-kingdom">ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div class="monthly-reg-motto">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
            <div class="monthly-reg-flourish">
              <img src="flourish.png" alt="ព្រះរាជាណាចក្រកម្ពុជា">
            </div>
          </div>
        </div>

        <!-- Main Title -->
        <div class="monthly-reg-title-wrap">
          <h2 class="monthly-reg-main-title">បញ្ជីហៅឈ្មោះសិស្ស</h2>
          <div class="monthly-reg-sub-title">ផ្នែកអវត្តមានប្រចាំខែ</div>
        </div>

        <!-- Subheader Meta Row -->
        <div class="monthly-reg-meta-row">
          <div>
            ប្រចាំខែ <strong>${monthName}</strong> ឆ្នាំសិក្សា <strong>${academicYear}</strong>
          </div>
          <div>
            សិស្សប្រុស <strong>${maleCount}</strong> នាក់ &nbsp;&nbsp;&nbsp;&nbsp; ស្រី <strong>${femaleCount}</strong> នាក់ &nbsp;&nbsp;&nbsp;&nbsp; សរុប <strong>${totalStudents}</strong> នាក់
          </div>
        </div>
      </div>

      <!-- Official Table (100% តាមគម្រូផ្លូវការ) -->
      <div style="overflow-x: auto;">
        <table class="official-monthly-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 28px;">ល.រ</th>
              <th rowspan="2" style="width: 44px;">អត្ត<br>លេខ</th>
              <th colspan="2" rowspan="2" style="min-width: 145px; text-align: center;">គោត្តនាម និងនាម</th>
              <th rowspan="2" style="width: 32px;">ភេទ</th>
              ${headerDaysRow1}
              <th colspan="3" style="width: 84px;">ចំនួនអវត្តមាន</th>
              <th rowspan="2" style="width: 60px;">សេចក្តី<br>ផ្សេងៗ</th>
            </tr>
            <tr>
              ${headerDaysRow2}
              <th style="width: 28px;">ច្ប</th>
              <th style="width: 28px;">អច្ប</th>
              <th style="width: 28px;">សរុប</th>
            </tr>
          </thead>
          <tbody>
            ${studentRowsHtml}
            <tr class="summary-row">
              <td colspan="5" style="text-align: center; font-family: var(--font-moul-light); font-size: 10px; color: #0000cc;">សរុប</td>
              ${summaryDaysHtml}
              <td>${totalClassExcused}</td>
              <td>${totalClassUnexcused}</td>
              <td>${totalClassAbs}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Statistics Below Table -->
      <div class="monthly-reg-stats-row">
        <div>ចំនួនសិស្សក្នុងបញ្ជី <strong>${totalStudents}</strong> នាក់ &nbsp;&nbsp; ស្រី <strong>${String(femaleCount).padStart(2, '0')}</strong> នាក់</div>
        <div>ពេលដែលសិស្សត្រូវមករៀន <strong>${tReq}</strong></div>
        <div>ពេលអវត្តមាន <strong>${tAbs}</strong></div>
        <div>ពេលសិស្សមករៀនពិតប្រាកដ <strong>${tAct}</strong></div>
        <div>ភាគរយអវត្តមាន <strong>${pctAbs}%</strong></div>
      </div>

      <!-- Closure Date Row -->
      <div class="monthly-reg-closure-row">
        <div>បញ្ឈប់បញ្ជីក្នុងខែនេះនូវចំនួន <strong>${activeSessions}</strong> ពេល</div>
        <div style="display: inline-flex; align-items: center; gap: 4px;">
          <span class="editable-date-field" contenteditable="true" spellcheck="false" title="ចុចត្រង់នេះដើម្បីកែប្រែកាលបរិច្ឆេទគ្រូប្រចាំថ្នាក់ដោយផ្ទាល់" onblur="saveMonthlyTeacherDateDirect('${currentClass.id}', '${monthPrefix}', this.innerText)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
            ${monthlyTeacherDate}
          </span>
          <button type="button" class="btn-edit-date no-print" onclick="openMonthlyTeacherDateModal('${currentClass.id}', '${monthPrefix}')" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទគ្រូ">
            <i class="fa fa-pen"></i>
          </button>
        </div>
      </div>

      <!-- Signatures Row -->
      <div class="monthly-reg-signatures">
        <div class="monthly-reg-sig-block">
          <div class="movable-approval-block" id="movableApprovalBlockMonthly" title="ចុចអូសដើម្បីផ្លាស់ទី ឬពង្រីក-បង្រួមតាមចិត្ត (Drag to move or resize)">
            <div class="approval-drag-handle no-print" title="ចុចអូសដើម្បីផ្លាស់ទី (Drag to move)">
              <i class="fa-solid fa-arrows-up-down-left-right"></i>
            </div>
            <div class="approval-action-toolbar no-print">
              <button type="button" class="btn-approval-action" onclick="adjustApprovalScale(1.1, 'monthly')" title="ពង្រីកទំហំ (Enlarge)"><i class="fa-solid fa-plus"></i></button>
              <button type="button" class="btn-approval-action" onclick="adjustApprovalScale(0.9, 'monthly')" title="បង្រួមទំហំ (Shrink)"><i class="fa-solid fa-minus"></i></button>
              <button type="button" class="btn-approval-action" onclick="resetApprovalTransform('monthly')" title="កំណត់ទីតាំង និងទំហំដើម (Reset)"><i class="fa-solid fa-rotate-left"></i></button>
            </div>
            <div class="approval-content-box">
              <div class="monthly-reg-sig-title">
                បានឃើញ និង ឯកភាព<br>
                <strong>នាយកសាលា</strong>
              </div>
              <div class="monthly-reg-sig-name" style="min-height: 24px;"></div>
            </div>
            <div class="approval-resize-handle no-print" title="ចុចអូសដើម្បីពង្រីក-បង្រួម (Drag to resize)">
              <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
            </div>
          </div>
        </div>
        <div class="monthly-reg-sig-block">
          <div class="monthly-reg-sig-title">
            <strong>គ្រូប្រចាំថ្នាក់</strong>
          </div>
          <div class="monthly-reg-sig-name">
            ${escapeHtml(currentClass.teacher || "")}
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  initMovableApproval('movableApprovalBlockMonthly', 'monthly');
}

/**
 * Export Monthly Attendance to Excel (១០០% តាមទម្រង់ផ្លូវការ)
 */
function exportMonthlyAttendanceExcel() {
  const currentClass = getActiveClass();
  if (!currentClass) return;

  const students = currentClass.students || [];
  const month = state.activeAttendanceMonth || 11;
  const year = state.activeAttendanceYear || 2026;
  const monthName = KHMER_MONTH_NAMES[month - 1] || "";
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const academicYear = currentClass.academicYear || state.currentYear || "២០២៦-២០២៧";

  // Row 1: Admin
  const r1 = ["មន្ទីរអប់រំ យុវជន និងកីឡា រាជធានី/ខេត្ត តាកែវ - ការិយាល័យអប់រំ យុវជន និងកីឡា ស្រុកព្រៃកប្បាស - សាលាបឋមសិក្សា បាន្លួង"];
  // Row 2: Title
  const r2 = [`បញ្ជីហៅឈ្មោះសិស្ស ផ្នែកអវត្តមានប្រចាំខែ ${monthName} ឆ្នាំសិក្សា ${academicYear}`];
  // Row 3: Class info
  const r3 = [`ថ្នាក់៖ ${currentClass.grade} | គ្រូប្រចាំថ្នាក់៖ ${currentClass.teacher} | សិស្សសរុប៖ ${students.length} នាក់`];

  // Header 1
  const h1 = ["ល.រ", "អត្តលេខ", "គោត្តនាម", "នាម", "ភេទ"];
  for (let d = 1; d <= 31; d++) {
    h1.push(d);
  }
  h1.push("ចំនួនអវត្តមាន", "", "", "សេចក្តីផ្សេងៗ");

  // Header 2: Days of week (អា,ច,អ,ពុ,ព្រ,សុ,ស)
  const h2 = ["", "", "", "", ""];
  for (let d = 1; d <= 31; d++) {
    if (d <= daysInMonth) {
      const dObj = new Date(year, month - 1, d);
      h2.push(KHMER_DAYS_OF_WEEK_SHORT[dObj.getDay()]);
    } else {
      h2.push("");
    }
  }
  h2.push("ច្ប", "អច្ប", "សរុប", "");

  const rows = [r1, r2, r3, [], h1, h2];

  let totalClassExcused = 0;
  let totalClassUnexcused = 0;
  const dailyPresent = new Array(32).fill(0);

  students.forEach((s, idx) => {
    let sExcused = 0, sUnexcused = 0;
    const sIdFormatted = s.studentId ? String(s.studentId).padStart(4, '0') : String(idx + 1).padStart(4, '0');
    const lName = s.lastName || (s.fullName ? s.fullName.trim().split(/\s+/)[0] : "");
    const fName = s.firstName || (s.fullName ? s.fullName.trim().split(/\s+/).slice(1).join(" ") : "");
    const row = [idx + 1, sIdFormatted, lName, fName, s.gender];

    for (let d = 1; d <= 31; d++) {
      if (d <= daysInMonth) {
        const isSun = new Date(year, month - 1, d).getDay() === 0;
        const holName = getHolidayName(year, month, d);
        const isHol = !!holName;
        const dateKey = `${monthPrefix}-${String(d).padStart(2, '0')}`;
        const dayRecord = currentClass.attendanceRecords?.[dateKey]?.records?.[s.num] || s.dailyAttendance?.[dateKey];
        let status = dayRecord?.status;
        if (!status && dateKey === state.activeAttendanceDate && s.activeAttDate === dateKey && s.todayStatus) {
          status = s.todayStatus;
        }

        if (isSun || isHol) {
          row.push("X");
        } else if (status === "L") {
          sExcused++;
          row.push("P");
        } else if (status === "A") {
          sUnexcused++;
          row.push("A");
        } else {
          dailyPresent[d]++;
          row.push("✓");
        }
      } else {
        row.push("");
      }
    }

    const sAbs = sExcused + sUnexcused;
    totalClassExcused += sExcused;
    totalClassUnexcused += sUnexcused;
    row.push(sExcused, sUnexcused, sAbs, "");
    rows.push(row);
  });

  // Summary row
  const sumRow = ["សរុប", "", "", "", ""];
  for (let d = 1; d <= 31; d++) {
    if (d <= daysInMonth) {
      const isSun = new Date(year, month - 1, d).getDay() === 0;
      const isHol = !!getHolidayName(year, month, d);
      if (isSun || isHol) sumRow.push("X");
      else sumRow.push(dailyPresent[d]);
    } else {
      sumRow.push("");
    }
  }
  sumRow.push(totalClassExcused, totalClassUnexcused, totalClassExcused + totalClassUnexcused, "");
  rows.push(sumRow);

  // Bottom closure and teacher date
  const defaultMonthlyDate = `ធ្វើនៅ បាន្លួង ថ្ងៃទី ${toKhmerNum(daysInMonth)} ខែ ${monthName} ឆ្នាំ ${toKhmerNum(year)}`;
  const monthlyTeacherDate = (currentClass.monthlyDates && currentClass.monthlyDates[monthPrefix]) || defaultMonthlyDate;

  rows.push([]);
  rows.push([`បញ្ឈប់បញ្ជីក្នុងខែនេះនូវចំនួន ${daysInMonth} ពេល`, "", "", "", "", monthlyTeacherDate]);
  rows.push(["បានឃើញ និង ឯកភាព - នាយកសាលា", "", "", "", "", `គ្រូប្រចាំថ្នាក់៖ ${currentClass.teacher || ""}`]);

  if (typeof XLSX !== "undefined") {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `វត្តមាន_${monthName}`);
    XLSX.writeFile(wb, `បញ្ជីហៅឈ្មោះ_វត្តមានប្រចាំខែ_${monthName}_${currentClass.grade}.xlsx`);
  } else {
    const csvContent = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `បញ្ជីហៅឈ្មោះ_វត្តមានប្រចាំខែ_${monthName}_${currentClass.grade}.csv`;
    link.click();
  }
}

/**
 * Clear Monthly Attendance Data for Active Class and Month (សម្អាតទិន្នន័យវត្តមានប្រចាំខែ)
 */
function clearMonthlyAttendanceData() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }

  const month = state.activeAttendanceMonth || 11;
  const year = state.activeAttendanceYear || 2026;
  const monthName = KHMER_MONTH_NAMES[month - 1] || "";
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

  const ok = confirm(`តើលោកគ្រូ/អ្នកគ្រូពិតជាចង់សម្អាតទិន្នន័យវត្តមានសម្រាប់ «ខែ ${monthName} ឆ្នាំ ${year}» នៃ ${currentClass.grade} មែនទេ?\n\n⚠️ សកម្មភាពនេះនឹងកំណត់វត្តមានគ្រប់ថ្ងៃនៃខែនេះទៅជាទិន្នន័យលំនាំដើមវិញ!\n(លោកគ្រូ/អ្នកគ្រូអាចចុចប៊ូតុង «ត្រឡប់មកវិញ (Undo)» ដើម្បីទាញទិន្នន័យមកវិញបាន)`);
  if (!ok) return;

  // Save history snapshot before clearing
  if (!window._undoHistory) window._undoHistory = { students: {}, dailyAtt: {}, monthlyAtt: {} };
  const key = `${currentClass.id}_${monthPrefix}`;
  if (!window._undoHistory.monthlyAtt[key]) window._undoHistory.monthlyAtt[key] = [];

  const attRecsForMonth = {};
  if (currentClass.attendanceRecords) {
    Object.keys(currentClass.attendanceRecords).forEach(dKey => {
      if (dKey.startsWith(monthPrefix)) {
        attRecsForMonth[dKey] = JSON.parse(JSON.stringify(currentClass.attendanceRecords[dKey]));
      }
    });
  }
  const studentsAttForMonth = (currentClass.students || []).map(s => ({
    num: s.num,
    dailyAttForMonth: s.dailyAttendance ? Object.keys(s.dailyAttendance).filter(k => k.startsWith(monthPrefix)).reduce((acc, k) => { acc[k] = s.dailyAttendance[k]; return acc; }, {}) : {},
    monthlyAtt: s.monthlyAttendance && s.monthlyAttendance[monthPrefix] ? JSON.parse(JSON.stringify(s.monthlyAttendance[monthPrefix])) : null,
    todayStatus: s.todayStatus,
    todayReason: s.todayReason,
    activeAttDate: s.activeAttDate
  }));

  window._undoHistory.monthlyAtt[key].push({
    attRecs: attRecsForMonth,
    studentsAtt: studentsAttForMonth
  });

  // Remove attendance records for this month
  if (currentClass.attendanceRecords) {
    Object.keys(currentClass.attendanceRecords).forEach(dKey => {
      if (dKey.startsWith(monthPrefix)) {
        delete currentClass.attendanceRecords[dKey];
      }
    });
  }

  // Clear daily attendance records for this month on each student
  if (currentClass.students) {
    currentClass.students.forEach(s => {
      if (s.dailyAttendance) {
        Object.keys(s.dailyAttendance).forEach(dKey => {
          if (dKey.startsWith(monthPrefix)) {
            delete s.dailyAttendance[dKey];
          }
        });
      }
      if (s.monthlyAttendance && s.monthlyAttendance[monthPrefix]) {
        delete s.monthlyAttendance[monthPrefix];
      }
      if (s.activeAttDate && s.activeAttDate.startsWith(monthPrefix)) {
        s.todayStatus = "P";
        s.todayReason = "";
      }
    });
  }

  // Re-sync and save
  syncMonthlyAttendanceForClass(currentClass, `${monthPrefix}-01`);
  saveDatabase();

  // Re-render
  renderMonthlyAttendance();
  if (state.activeTab === "attendance_daily") {
    renderDailyAttendance();
  }

  showAttendanceToast(`✓ បានសម្អាតទិន្នន័យវត្តមានប្រចាំខែ ${monthName} ឆ្នាំ ${year} ដោយជោគជ័យ! (អាចចុច Undo ដើម្បីត្រឡប់មកវិញ)`, 'info');
}

/**
 * Undo Monthly Attendance Clearing for Active Class and Month (ត្រឡប់ទិន្នន័យវត្តមានប្រចាំខែមកវិញ)
 */
function undoMonthlyAttendanceData() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }
  const month = state.activeAttendanceMonth || 11;
  const year = state.activeAttendanceYear || 2026;
  const monthName = KHMER_MONTH_NAMES[month - 1] || "";
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const key = `${currentClass.id}_${monthPrefix}`;
  const history = window._undoHistory && window._undoHistory.monthlyAtt && window._undoHistory.monthlyAtt[key];
  if (!history || history.length === 0) {
    alert(`គ្មានទិន្នន័យវត្តមានសម្រាប់ខែ ${monthName} ${year} ដែលបានសម្អាតដើម្បីត្រឡប់មកវិញ (Undo) ទេ!`);
    return;
  }
  const lastState = history.pop();
  if (!currentClass.attendanceRecords) currentClass.attendanceRecords = {};
  if (lastState.attRecs) {
    Object.assign(currentClass.attendanceRecords, lastState.attRecs);
  }

  if (currentClass.students && lastState.studentsAtt) {
    const map = new Map(lastState.studentsAtt.map(x => [x.num, x]));
    currentClass.students.forEach(s => {
      const snap = map.get(s.num);
      if (snap) {
        if (!s.dailyAttendance) s.dailyAttendance = {};
        if (snap.dailyAttForMonth) {
          Object.assign(s.dailyAttendance, snap.dailyAttForMonth);
        }
        if (!s.monthlyAttendance) s.monthlyAttendance = {};
        if (snap.monthlyAtt) {
          s.monthlyAttendance[monthPrefix] = snap.monthlyAtt;
        }
        if (s.activeAttDate && s.activeAttDate.startsWith(monthPrefix)) {
          s.todayStatus = snap.todayStatus;
          s.todayReason = snap.todayReason;
        }
      }
    });
  }

  syncMonthlyAttendanceForClass(currentClass, `${monthPrefix}-01`);
  saveDatabase();
  renderMonthlyAttendance();
  if (state.activeTab === "attendance_daily") renderDailyAttendance();
  showAttendanceToast(`↩ បានត្រឡប់ទិន្នន័យវត្តមានប្រចាំខែ ${monthName} ឆ្នាំ ${year} មកវិញដោយជោគជ័យ!`, 'success');
}

/* ==========================================================================
   5. SCORES & GRADES MANAGEMENT (គ្រប់គ្រងពិន្ទុសិស្ស)
   តារាងស្រង់ពិន្ទុប្រចាំខែ គម្រូផ្លូវការ ១០០% តាមស្តង់ដាក្រសួងអប់រំ យុវជន និងកីឡា
   ========================================================================== */

const SCORE_SKILLS = [
  // ភាសាខ្មែរ (៤ សមត្ថភាព)
  { key: "kh_listen", name: "សមត្ថភាពស្ដាប់", group: "khmer" },
  { key: "kh_write",  name: "សមត្ថភាពសរសេរ", group: "khmer" },
  { key: "kh_read",   name: "សមត្ថភាពអាន",   group: "khmer" },
  { key: "kh_speak",  name: "សមត្ថភាពនិយាយ", group: "khmer" },
  // គណិតវិទ្យា (៥ ផ្នែក)
  { key: "ma_num",    name: "ចំនួន",         group: "math" },
  { key: "ma_meas",   name: "រង្វាស់រង្វាល់", group: "math" },
  { key: "ma_geom",   name: "ធរណីមាត្រ",     group: "math" },
  { key: "ma_alg",    name: "ពីជគណិត",       group: "math" },
  { key: "ma_stat",   name: "ស្ថិតិ",         group: "math" },
  // វិទ្យាសាស្ត្រ (១)
  { key: "science",   name: "វិទ្យាសាស្ត្រ",   group: "single" },
  // សិក្សាសង្គម (១)
  { key: "social",    name: "សិក្សាសង្គម",    group: "single" },
  // អប់រំកាយ សុខភាព សិល្បៈ (៣)
  { key: "pe_home_art", name: "គេហវិទ្យា-អប់រំសិល្បៈ", group: "pe" },
  { key: "pe_sport",    name: "អប់រំកាយ-កីឡា",     group: "pe" },
  { key: "pe_health",   name: "សុខភាព-អនាម័យ",     group: "pe" },
  // អប់រំបំណិនជីវិត (១)
  { key: "lifeskills",  name: "អប់រំបំណិនជីវិត",    group: "single" },
  // ភាសាបរទេស (១)
  { key: "foreign",     name: "ភាសាបរទេស",       group: "single" }
];


/* ==========================================================================
   MOVABLE & RESIZABLE APPROVAL SIGNATURE (បានឃើញ និង ឯកភាព នាយកសាលា)
   អនុញ្ញាតឱ្យផ្លាស់ទី (Drag to move) និងពង្រីក-បង្រួមអក្សរ (Font Resizing) បានតាមចិត្ត
   ធានាមិនបាត់ពេលបោះពុម្ព (Print) ឬទាញយកឯកសារ
   ========================================================================== */
/**
 * Format Grade Display cleanly:
 * Kindergarten -> "ថ្នាក់មត្តេយ្យ"
 * Grade 1 -> "ថ្នាក់ទី ១"
 * Grade 2 -> "ថ្នាក់ទី ២"
 * etc., avoiding duplicate "ថ្នាក់ទី" or "ថ្នាក់ទី ថ្នាក់មត្តេយ្យ"
 */
function getCleanGradeDisplay(grade = "") {
  const g = String(grade || "").trim();
  if (!g) return "ថ្នាក់ទី ១";
  if (g.includes("មត្តេយ្យ")) {
    return "ថ្នាក់មត្តេយ្យ";
  }
  const match = g.match(/([០-៩\d]+)/);
  if (match) {
    const khmerNum = toKhmerNum(match[1]);
    return `ថ្នាក់ទី ${khmerNum}`;
  }
  if (!g.startsWith("ថ្នាក់")) {
    return `ថ្នាក់ទី ${g}`;
  }
  return g;
}
window.getCleanGradeDisplay = getCleanGradeDisplay;

const approvalTransforms = {};

function getApprovalTransform(key = 'default') {
  if (!approvalTransforms[key]) {
    const isTeacher = (key === 'scoreTeacher' || key === 'rankTeacher');
    const isSchool = (key === 'semesterSchool');
    let t = { 
      x: 0, 
      y: 0, 
      scale: 1.0, 
      fontSize: isSchool ? 13.0 : (isTeacher ? 10.5 : 11.16),
      width: null,
      spaceHeight: isTeacher ? 38 : 55
    };
    try {
      const saved = localStorage.getItem('banloung_approval_transform_' + key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number') t.x = parsed.x;
        if (typeof parsed.y === 'number') t.y = parsed.y;
        if (typeof parsed.scale === 'number') t.scale = parsed.scale;
        if (typeof parsed.fontSize === 'number') t.fontSize = parsed.fontSize;
        if (typeof parsed.width === 'number') t.width = parsed.width;
        if (typeof parsed.spaceHeight === 'number') t.spaceHeight = parsed.spaceHeight;
      }
    } catch (e) {}
    approvalTransforms[key] = t;
  }
  return approvalTransforms[key];
}

function applyApprovalTransform(el, key = 'default') {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) {
    if (key === 'default') el = document.getElementById('movableApprovalBlock');
    else if (key === 'yearly') el = document.getElementById('movableApprovalBlockYearly');
    else if (key === 'monthly') el = document.getElementById('movableApprovalBlockMonthly');
    else if (key === 'rank') el = document.getElementById('movableApprovalBlockRank');
    else if (key === 'scoreTeacher') el = document.getElementById('movableTeacherBlockScore');
    else if (key === 'rankTeacher') el = document.getElementById('movableTeacherBlockRank');
    else if (key === 'semesterSchool') el = document.getElementById('movableSemesterSchoolBlock');
  }
  if (!el) return;
  const t = getApprovalTransform(key);

  // Set position and scale (អូសទៅណាក៏បាន លើ-ក្រោម ឆ្វេង-ស្ដាំ)
  el.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;

  // Apply custom width if adjusted (ពង្រីកឆ្វេង-ស្ដាំ)
  if (t.width) {
    el.style.width = `${t.width}px`;
  } else {
    el.style.width = '';
  }

  // Apply custom signature space if adjusted (ពង្រីកលើ-ក្រោម)
  const isTeacher = (key === 'scoreTeacher' || key === 'rankTeacher');
  const spaceEl = el.querySelector('.sig-space');
  if (spaceEl) {
    const baseSpace = isTeacher ? 38 : 55;
    spaceEl.style.height = `${(t.spaceHeight || baseSpace)}px`;
  }

  // Directly apply font-size to text nodes so print engine renders physical font size without clipping
  const isSchool = (key === 'semesterSchool');
  const sizePt = t.fontSize || (isSchool ? 13.0 : (isTeacher ? 10.5 : 11.16));
  const titles = el.querySelectorAll('.sig-title, .sig-role, .yearly-sign-approval, .yearly-sign-role, .monthly-reg-sig-title, .sig-name, .sig-teacher-name, .signature-lunar-date, .signature-solar-date, .rank-lunar-date, .rank-solar-date, .sem-score-school-name, .sem-score-grade-name');
  titles.forEach(node => {
    node.style.fontSize = `${sizePt}pt`;
    node.style.lineHeight = isSchool ? '1.5' : '1.35';
  });

  // Update badge display
  const badge = el.querySelector('.approval-size-badge');
  if (badge) {
    badge.innerText = `${Math.round(sizePt * 10) / 10}pt`;
  }
}

function saveApprovalTransform(key = 'default') {
  try {
    const t = getApprovalTransform(key);
    localStorage.setItem('banloung_approval_transform_' + key, JSON.stringify(t));
  } catch (e) {}
}

function changeApprovalFontSize(delta, key = 'default') {
  const t = getApprovalTransform(key);
  const isTeacher = (key === 'scoreTeacher' || key === 'rankTeacher');
  const isSchool = (key === 'semesterSchool');
  let curSize = t.fontSize || (isSchool ? 13.0 : (isTeacher ? 10.5 : 11.16));
  let newSize = curSize + delta;
  if (newSize < 7) newSize = 7;
  if (newSize > 28) newSize = 28;
  t.fontSize = Math.round(newSize * 10) / 10;

  applyApprovalTransform(null, key);
  saveApprovalTransform(key);
  if (typeof showToast === "function") {
    const label = isSchool ? 'សាលារៀន/ថ្នាក់' : (isTeacher ? 'គ្រូប្រចាំថ្នាក់' : 'នាយកសាលា');
    showToast(`ទំហំអក្សរ ${label}៖ ${t.fontSize}pt`);
  }
}

function changeApprovalWidth(delta, key = 'default') {
  const el = document.getElementById(
    key === 'default' ? 'movableApprovalBlock' :
    key === 'scoreTeacher' ? 'movableTeacherBlockScore' :
    key === 'rankTeacher' ? 'movableTeacherBlockRank' :
    key === 'rank' ? 'movableApprovalBlockRank' :
    key === 'yearly' ? 'movableApprovalBlockYearly' :
    key === 'monthly' ? 'movableApprovalBlockMonthly' :
    key === 'semesterSchool' ? 'movableSemesterSchoolBlock' : key
  );
  const isSchool = (key === 'semesterSchool');
  const curWidth = (el && el.offsetWidth) ? el.offsetWidth : (isSchool ? 260 : 280);
  const t = getApprovalTransform(key);
  let newWidth = (t.width || curWidth) + delta;
  if (newWidth < 140) newWidth = 140;
  if (newWidth > 700) newWidth = 700;
  t.width = Math.round(newWidth);
  applyApprovalTransform(el, key);
  saveApprovalTransform(key);
  if (typeof showToast === "function") {
    showToast(`ទទឹងប្រអប់៖ ${t.width}px`);
  }
}

function changeApprovalHeight(delta, key = 'default') {
  const t = getApprovalTransform(key);
  const isTeacher = (key === 'scoreTeacher' || key === 'rankTeacher');
  let newSpace = (t.spaceHeight || (isTeacher ? 38 : 55)) + delta;
  if (newSpace < 10) newSpace = 10;
  if (newSpace > 140) newSpace = 140;
  t.spaceHeight = Math.round(newSpace);
  applyApprovalTransform(null, key);
  saveApprovalTransform(key);
  if (typeof showToast === "function") {
    showToast(`គម្លាតកម្ពស់ហត្ថលេខា៖ ${t.spaceHeight}px`);
  }
}

function adjustApprovalScale(factor, key = 'default') {
  const t = getApprovalTransform(key);
  const isTeacher = (key === 'scoreTeacher' || key === 'rankTeacher');
  const isSchool = (key === 'semesterSchool');
  let newScale = t.scale * factor;
  if (newScale < 0.5) newScale = 0.5;
  if (newScale > 2.5) newScale = 2.5;
  t.scale = Math.round(newScale * 100) / 100;

  let newFontSize = (t.fontSize || (isSchool ? 13.0 : (isTeacher ? 10.5 : 11.16))) * factor;
  if (newFontSize < 7) newFontSize = 7;
  if (newFontSize > 28) newFontSize = 28;
  t.fontSize = Math.round(newFontSize * 10) / 10;

  applyApprovalTransform(null, key);
  saveApprovalTransform(key);
  if (typeof showToast === "function") {
    const label = isSchool ? 'សាលារៀន/ថ្នាក់' : (isTeacher ? 'គ្រូប្រចាំថ្នាក់' : 'នាយកសាលា');
    showToast(`ទំហំអក្សរ ${label}៖ ${t.fontSize}pt (${(t.scale * 100).toFixed(0)}%)`);
  }
}

function resetApprovalTransform(key = 'default') {
  const t = getApprovalTransform(key);
  const isTeacher = (key === 'scoreTeacher' || key === 'rankTeacher');
  const isSchool = (key === 'semesterSchool');
  t.x = 0;
  t.y = 0;
  t.scale = 1.0;
  t.fontSize = isSchool ? 13.0 : (isTeacher ? 10.5 : 11.16);
  t.width = null;
  t.spaceHeight = isTeacher ? 38 : 55;
  applyApprovalTransform(null, key);
  saveApprovalTransform(key);
  if (typeof showToast === "function") {
    const defaultSize = isSchool ? '13pt' : (isTeacher ? '10.5pt' : '11.2pt');
    const label = isSchool ? 'សាលារៀន/ថ្នាក់' : (isTeacher ? 'គ្រូប្រចាំថ្នាក់' : 'នាយកសាលា');
    showToast(`បានកំណត់ទីតាំង និងទំហំដើម (${label}: ${defaultSize})`);
  }
}

function initMovableApproval(elementId = 'movableApprovalBlock', key = 'default') {
  const el = document.getElementById(elementId);
  if (!el) return;
  applyApprovalTransform(el, key);

  let isDragging = false;
  let isResizing = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let initialX = 0;
  let initialY = 0;
  let initialScale = 1.0;
  const isTeacher = (key === 'scoreTeacher' || key === 'rankTeacher');
  const isSchool = (key === 'semesterSchool');
  let initialFontSize = isSchool ? 13.0 : (isTeacher ? 10.5 : 11.16);
  let initialWidth = 0;
  let initialSpaceHeight = isTeacher ? 38 : 55;

  el.onpointerdown = function(e) {
    if (e.target.closest('.approval-action-toolbar') || e.target.closest('[contenteditable="true"]')) return;

    if (e.target.closest('.approval-resize-handle')) {
      isResizing = true;
      startPointerX = e.clientX;
      startPointerY = e.clientY;
      const t = getApprovalTransform(key);
      initialScale = t.scale;
      initialFontSize = t.fontSize || (isSchool ? 13.0 : (isTeacher ? 10.5 : 11.16));
      initialWidth = el.offsetWidth || (isSchool ? 260 : 280);
      initialSpaceHeight = t.spaceHeight || (isTeacher ? 38 : 55);
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    isDragging = true;
    el.classList.add('is-dragging');
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    initialX = getApprovalTransform(key).x;
    initialY = getApprovalTransform(key).y;
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  };

  el.onpointermove = function(e) {
    if (isDragging) {
      const dx = e.clientX - startPointerX;
      const dy = e.clientY - startPointerY;
      const t = getApprovalTransform(key);
      t.x = Math.round(initialX + dx);
      t.y = Math.round(initialY + dy);
      applyApprovalTransform(el, key);
      e.preventDefault();
    } else if (isResizing) {
      const dx = e.clientX - startPointerX;
      const dy = e.clientY - startPointerY;
      const t = getApprovalTransform(key);

      // Adjust width (ពង្រីកឆ្វេង-ស្ដាំ)
      let newWidth = initialWidth + dx;
      if (newWidth < 140) newWidth = 140;
      if (newWidth > 700) newWidth = 700;
      t.width = Math.round(newWidth);

      // Adjust height (ពង្រីកលើ-ក្រោម)
      let newSpace = initialSpaceHeight + dy;
      if (newSpace < 10) newSpace = 10;
      if (newSpace > 140) newSpace = 140;
      t.spaceHeight = Math.round(newSpace);

      // Smooth diagonal font sizing
      const diagDelta = (dx + dy) / 2;
      let newFontSize = initialFontSize + (diagDelta / 30);
      if (newFontSize < 7) newFontSize = 7;
      if (newFontSize > 28) newFontSize = 28;
      t.fontSize = Math.round(newFontSize * 10) / 10;

      applyApprovalTransform(el, key);
      e.preventDefault();
    }
  };

  function stopAction(e) {
    if (isDragging || isResizing) {
      isDragging = false;
      isResizing = false;
      el.classList.remove('is-dragging');
      saveApprovalTransform(key);
      try { el.releasePointerCapture(e.pointerId); } catch(err) {}
    }
  }

  el.onpointerup = stopAction;
  el.onpointercancel = stopAction;
}

// Global exposes for inline onclick handlers
window.changeApprovalFontSize = changeApprovalFontSize;
window.changeApprovalWidth = changeApprovalWidth;
window.changeApprovalHeight = changeApprovalHeight;
window.adjustApprovalScale = adjustApprovalScale;
window.resetApprovalTransform = resetApprovalTransform;
window.initMovableApproval = initMovableApproval;
window.changeRankMonth = changeRankMonth;
window.renderMonthlyRanks = renderMonthlyRanks;
window.printMonthlyRanks = printMonthlyRanks;
window.exportMonthlyRanksExcel = exportMonthlyRanksExcel;

function changeScoreMonth(monthVal) {
  state.activeScoreMonth = monthVal;
  renderScores();
  const rankMonthSelect = document.getElementById("rankMonthSelect");
  if (rankMonthSelect) rankMonthSelect.value = monthVal;
}

function renderScores() {
  const currentClass = getActiveClass();
  const container = document.getElementById("scoresContentWrap");
  if (!container) return;

  if (!currentClass) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">សូមជ្រើសរើសថ្នាក់រៀន</p>`;
    return;
  }

  // Sync Month select if present
  const monthSelect = document.getElementById("scoreMonthSelect");
  if (monthSelect && state.activeScoreMonth) {
    monthSelect.value = state.activeScoreMonth;
  } else if (!state.activeScoreMonth) {
    state.activeScoreMonth = "មករា";
    if (monthSelect) monthSelect.value = "មករា";
  }

  // Mode check: if user chose other period like semester or annual summary
  if (state.activeScorePeriod && state.activeScorePeriod !== "ប្រចាំខែ") {
    renderSummaryScoresView(currentClass, container);
    return;
  }

  // 100% Exact Official MoEYS Monthly Score Sheet (តារាងស្រង់ពិន្ទុប្រចាំខែ)
  renderOfficialMonthlyScoreSheet(currentClass, container);
}

function renderOfficialMonthlyScoreSheet(currentClass, container) {
  const students = currentClass.students || [];
  const monthKey = state.activeScoreMonth || "មករា";
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";
  const totalStudents = students.length;
  const femaleCount = students.filter(s => s.gender === "ស្រី").length;
  const maleCount = totalStudents - femaleCount;

  // Initialize monthly scores data store for this class and month
  currentClass.monthlyScores = currentClass.monthlyScores || {};
  currentClass.monthlyScores[monthKey] = currentClass.monthlyScores[monthKey] || {};
  const isCleared = currentClass.clearedScores && currentClass.clearedScores[monthKey];

  // Pre-calculate total and average for ranking
  const studentComputed = [];
  students.forEach((s) => {
    let rec = currentClass.monthlyScores[monthKey][s.num];
    if (!rec) {
      rec = {};
      SCORE_SKILLS.forEach(sk => {
        if (isCleared) {
          rec[sk.key] = 0;
        } else {
          // Pre-populate with realistic compliant values based on student scores
          if (sk.group === "khmer") rec[sk.key] = s.scores?.khmer || 7;
          else if (sk.group === "math") rec[sk.key] = s.scores?.math || 7.5;
          else if (sk.key === "science") rec[sk.key] = s.scores?.science || 7;
          else if (sk.key === "social") rec[sk.key] = s.scores?.social || 7;
          else if (sk.key === "pe_home_art") rec[sk.key] = s.scores?.art || 8;
          else if (sk.key === "pe_sport" || sk.key === "pe_health") rec[sk.key] = s.scores?.pe || 8.5;
          else rec[sk.key] = 7;
        }
      });
      currentClass.monthlyScores[monthKey][s.num] = rec;
    }

    let total = 0;
    SCORE_SKILLS.forEach(sk => {
      const v = parseFloat(rec[sk.key]);
      total += isNaN(v) ? 0 : v;
    });
    total = Math.round(total * 10) / 10;
    const avg = total > 0 ? Math.round((total / 16) * 100) / 100 : 0;

    let mention = "";
    if (avg >= 8.5) mention = "A";
    else if (avg >= 8.0) mention = "B";
    else if (avg >= 7.0) mention = "C";
    else if (avg >= 6.0) mention = "D";
    else if (avg >= 5.0) mention = "E";
    else if (total > 0) mention = "F";

    studentComputed.push({
      student: s,
      rec: rec,
      total: total,
      avg: avg,
      mention: mention,
      rank: 1
    });
  });

  // Assign ranks based on avg descending
  const sorted = [...studentComputed].sort((a, b) => b.avg - a.avg);
  let curRank = 1;
  sorted.forEach((item, idx) => {
    if (idx > 0 && item.avg < sorted[idx - 1].avg) {
      curRank = idx + 1;
    }
    item.rank = item.total > 0 ? curRank : "-";
  });

  // Statistics for A, B, C, D, E, F
  const stats = {
    A: { total: 0, female: 0, pct: "0.00" },
    B: { total: 0, female: 0, pct: "0.00" },
    C: { total: 0, female: 0, pct: "0.00" },
    D: { total: 0, female: 0, pct: "0.00" },
    E: { total: 0, female: 0, pct: "0.00" },
    F: { total: 0, female: 0, pct: "0.00" }
  };

  studentComputed.forEach(item => {
    if (item.mention && stats[item.mention]) {
      stats[item.mention].total++;
      if (item.student.gender === "ស្រី") {
        stats[item.mention].female++;
      }
    }
  });

  Object.keys(stats).forEach(k => {
    if (totalStudents > 0 && stats[k].total > 0) {
      stats[k].pct = ((stats[k].total / totalStudents) * 100).toFixed(2);
    } else {
      stats[k].pct = "0.00";
    }
  });

  // Build Table Rows in natural roster order (ល.រ 1 to N)
  let tableRowsHtml = "";
  studentComputed.forEach((item, idx) => {
    const s = item.student;
    const lName = s.lastName || (s.fullName ? s.fullName.trim().split(/\s+/)[0] : "");
    const fName = s.firstName || (s.fullName ? s.fullName.trim().split(/\s+/).slice(1).join(" ") : "");
    const gender = s.gender === "ស្រី" ? "ស្រី" : "ប្រុស";

    let skillCells = "";
    SCORE_SKILLS.forEach(sk => {
      const v = item.rec[sk.key] !== undefined ? item.rec[sk.key] : 0;
      skillCells += `<td class="score-td-val" contenteditable="true" data-stunum="${s.num}" data-skill="${sk.key}" onblur="onScoreCellEdit(this, ${s.num}, '${sk.key}')" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" title="ចុចដើម្បីកែប្រែពិន្ទុ">${v}</td>`;
    });

    tableRowsHtml += `
      <tr>
        <td class="score-td-num">${s.num || (idx + 1)}</td>
        <td class="score-td-lastname border-no-r" style="border-right: hidden !important; border-right-style: hidden !important;">${escapeHtml(lName)}</td>
        <td class="score-td-firstname border-no-l" style="border-left: hidden !important; border-left-style: hidden !important;">${escapeHtml(fName)}</td>
        <td class="score-td-gender">${gender}</td>
        ${skillCells}
        <td class="score-td-total">${item.total}</td>
        <td class="score-td-avg">${item.avg.toFixed(2)}</td>
        <td class="score-td-rank">${item.rank}</td>
        <td class="score-td-mention">${item.mention || "-"}</td>
      </tr>
    `;
  });

  // Extract year for signature
  const startYear = parseInt(academicYear.split("-")[0].replace(/[^\d]/g, ""), 10) || 2026;
  const cleanGrade = getCleanGradeDisplay(currentClass.grade);

  const scoreLunar = (currentClass.scoreDates && currentClass.scoreDates[monthKey] && currentClass.scoreDates[monthKey].lunar)
    || currentClass.lunarDateScore
    || (currentClass.rankDates && currentClass.rankDates[monthKey] && currentClass.rankDates[monthKey].lunar)
    || currentClass.lunarDateRank
    || "ថ្ងៃ សៅរ៍ ២ រោច ខែ ផល្គុន ឆ្នាំឆ្លូវ ត្រីស័ក ព.ស ២៥៦៨";
  const scoreSolar = (currentClass.scoreDates && currentClass.scoreDates[monthKey] && currentClass.scoreDates[monthKey].solar)
    || currentClass.solarDateScore
    || `ធ្វើនៅ បាន្លួង ថ្ងៃទី ១៩ ខែ ${monthKey} ឆ្នាំ ${startYear}`;

  let html = `
    <div class="monthly-score-a4-page" id="printableMonthlyScores">
      <!-- Document Header -->
      <div class="score-header-wrap">
        <!-- Center Kingdom Header -->
        <div class="score-kingdom-center">
          <div class="score-kingdom-line1">ព្រះរាជាណាចក្រកម្ពុជា</div>
          <div class="score-kingdom-line2">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
          <div class="score-flourish">
            <img src="flourish.png" alt="Flourish" onerror="this.outerHTML='<span style=\'color:#0000cc; font-size:12px;\'>❖━━━━━━ ❖ ━━━━━━❖</span>'">
          </div>
        </div>

        <!-- Left Ministry / Department / School Info -->
        <div class="score-dept-left">
          <div class="score-dept-line1">មន្ទីរអប់រំ យុវជន និង កីឡា រាជធានី/ខេត្តតាកែវ</div>
          <div class="score-dept-line2">ការិយាល័យអប់រំ យុវជន និង កីឡារដ្ឋបាលក្រុង/ស្រុក/ខណ្ឌព្រៃកប្បាស</div>
          <div class="score-dept-line3">សាលាបឋមសិក្សា បាន្លួង</div>
        </div>

        <!-- Document Title -->
        <div class="score-doc-title">តារាងស្រង់ពិន្ទុប្រចាំខែ</div>

        <!-- Metadata Info Line -->
        <div class="score-meta-row">
          <div class="score-meta-item"><span class="meta-label">${cleanGrade}</span></div>
          <div class="score-meta-item"><span class="meta-label">ប្រចាំខែ៖</span> <span class="meta-val">${monthKey}</span></div>
          <div class="score-meta-item"><span class="meta-label">ឆ្នាំសិក្សា៖</span> <span class="meta-val">${academicYear}</span></div>
          <div class="score-meta-item"><span class="meta-label">សិស្សសរុប៖</span> <span class="meta-val">${totalStudents}</span> នាក់</div>
          <div class="score-meta-item"><span class="meta-label">ប្រុស៖</span> <span class="meta-val">${maleCount}</span> នាក់</div>
          <div class="score-meta-item"><span class="meta-label">ស្រី៖</span> <span class="meta-val">${femaleCount}</span> នាក់</div>
        </div>
      </div>

      <!-- 24-Column Official Table Matching MoEYS Standard 100% -->
      <table class="official-score-table">
        <thead>
          <!-- Header Row 1 -->
          <tr>
            <th rowspan="2" class="score-th-num" style="width: 30px;">ល.រ</th>
            <th colspan="2" rowspan="2" class="score-th-name" style="width: 145px;">គោត្តនាម និង នាមខ្លួន</th>
            <th rowspan="2" class="score-th-gender" style="width: 28px;">ភេទ</th>
            <th colspan="4" class="th-group-khmer">ភាសាខ្មែរ</th>
            <th colspan="5" class="th-group-math">គណិតវិទ្យា</th>
            <th rowspan="2" class="th-vertical">វិទ្យាសាស្ត្រ</th>
            <th rowspan="2" class="th-vertical">សិក្សាសង្គម</th>
            <th colspan="3" class="th-group-pe">អប់រំកាយ សុខភាព សិល្បៈ</th>
            <th rowspan="2" class="th-vertical">អប់រំបំណិនជីវិត</th>
            <th rowspan="2" class="th-vertical">ភាសាបរទេស</th>
            <th colspan="3" class="th-group-results">លទ្ធផលប្រចាំខែ</th>
            <th rowspan="2" class="th-vertical">និទ្ទេស</th>
          </tr>
          <!-- Header Row 2 (Sub-headers) -->
          <tr>
            <!-- ភាសាខ្មែរ -->
            <th class="th-vertical">សមត្ថភាពស្ដាប់</th>
            <th class="th-vertical">សមត្ថភាពសរសេរ</th>
            <th class="th-vertical">សមត្ថភាពអាន</th>
            <th class="th-vertical">សមត្ថភាពនិយាយ</th>
            <!-- គណិតវិទ្យា -->
            <th class="th-vertical">ចំនួន</th>
            <th class="th-vertical">រង្វាស់រង្វាល់</th>
            <th class="th-vertical">ធរណីមាត្រ</th>
            <th class="th-vertical">ពីជគណិត</th>
            <th class="th-vertical">ស្ថិតិ</th>
            <!-- អប់រំកាយ សុខភាព សិល្បៈ -->
            <th class="th-vertical">គេហវិទ្យា-អប់រំសិល្បៈ</th>
            <th class="th-vertical">អប់រំកាយ-កីឡា</th>
            <th class="th-vertical">សុខភាព-អនាម័យ</th>
            <!-- លទ្ធផលប្រចាំខែ -->
            <th class="th-vertical">ពិន្ទុសរុប</th>
            <th class="th-vertical">មធ្យមភាគ</th>
            <th class="th-vertical">ចំណាត់ថ្នាក់</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <!-- Footer Section: Summary of Grades A-F with Bracket & Signatures (Page 3 Standard) -->
      <div class="score-footer-wrapper">
        <!-- Left: Summary of Grades A-F with Curly Bracket -->
        <div class="score-summary-grades">
          <div class="summary-grade-title">សរុបសិស្សបាននិទ្ទេស</div>
          <div class="summary-bracket-svg">
            <svg width="22" height="135" viewBox="0 0 22 135" fill="none" xmlns="http://www.w3.org/2000/svg" style="stroke: #0000cc; stroke-width: 1.6;">
              <path d="M 20 2 C 10 2, 4 8, 4 20 L 4 56 C 4 64, 1 67.5, 1 67.5 C 1 67.5, 4 71, 4 79 L 4 115 C 4 127, 10 133, 20 133" />
            </svg>
          </div>
          <div class="summary-grade-rows">
            <div class="grade-stat-line">
              <span class="stat-grade">និទ្ទេស A</span>
              <span class="stat-has">មាន</span>
              <span class="stat-val">${stats.A.total}</span> <span class="stat-unit">នាក់</span>
              <span class="stat-female-label">ស្រី</span>
              <span class="stat-val">${stats.A.female}</span> <span class="stat-unit">នាក់</span>
              <span class="stat-eq">ត្រូវជា</span>
              <span class="stat-pct">${stats.A.pct}%</span>
            </div>
            <div class="grade-stat-line">
              <span class="stat-grade">និទ្ទេស B</span>
              <span class="stat-has">មាន</span>
              <span class="stat-val">${stats.B.total}</span> <span class="stat-unit">នាក់</span>
              <span class="stat-female-label">ស្រី</span>
              <span class="stat-val">${stats.B.female}</span> <span class="stat-unit">នាក់</span>
              <span class="stat-eq">ត្រូវជា</span>
              <span class="stat-pct">${stats.B.pct}%</span>
            </div>
            <div class="grade-stat-line">
              <span class="stat-grade">និទ្ទេស C</span>
              <span class="stat-has">មាន</span>
              <span class="stat-val">${stats.C.total}</span> <span class="stat-unit">នាក់</span>
              <span class="stat-female-label">ស្រី</span>
              <span class="stat-val">${stats.C.female}</span> <span class="stat-unit">នាក់</span>
              <span class="stat-eq">ត្រូវជា</span>
              <span class="stat-pct">${stats.C.pct}%</span>
            </div>
            <div class="grade-stat-line">
              <span class="stat-grade">និទ្ទេស D</span>
              <span class="stat-has">មាន</span>
              <span class="stat-val">${stats.D.total}</span> <span class="stat-unit">នាក់</span>
              <span class="stat-female-label">ស្រី</span>
              <span class="stat-val">${stats.D.female}</span> <span class="stat-unit">នាក់</span>
              <span class="stat-eq">ត្រូវជា</span>
              <span class="stat-pct">${stats.D.pct}%</span>
            </div>
            <div class="grade-stat-line">
              <span class="stat-grade">និទ្ទេស E</span>
              <span class="stat-has">មាន</span>
              <span class="stat-val">${stats.E.total}</span> <span class="stat-unit">នាក់</span>
              <span class="stat-female-label">ស្រី</span>
              <span class="stat-val">${stats.E.female}</span> <span class="stat-unit">នាក់</span>
              <span class="stat-eq">ត្រូវជា</span>
              <span class="stat-pct">${stats.E.pct}%</span>
            </div>
            <div class="grade-stat-line">
              <span class="stat-grade">និទ្ទេស F</span>
              <span class="stat-has">មាន</span>
              <span class="stat-val">${stats.F.total}</span> <span class="stat-unit">នាក់</span>
              <span class="stat-female-label">ស្រី</span>
              <span class="stat-val">${stats.F.female}</span> <span class="stat-unit">នាក់</span>
              <span class="stat-eq">ត្រូវជា</span>
              <span class="stat-pct">${stats.F.pct}%</span>
            </div>
          </div>
        </div>

        <!-- Right: Signatures and Dates -->
        <div class="score-signatures-block">
          <div class="signature-columns-row">
            <div class="signature-col sig-left">
              <div class="movable-approval-block" id="movableApprovalBlock" title="ចុចអូសដើម្បីផ្លាស់ទី ឬពង្រីក-បង្រួមតាមចិត្ត (Drag to move or resize)">
                <div class="approval-drag-handle no-print" title="ចុចអូសដើម្បីផ្លាស់ទី (Drag to move)">
                  <i class="fa-solid fa-arrows-up-down-left-right"></i>
                </div>
                <div class="approval-action-toolbar no-print">
                  <button type="button" class="btn-approval-action" onclick="changeApprovalFontSize(1, 'default')" title="ពង្រីកទំហំអក្សរ (Enlarge font)"><i class="fa-solid fa-plus"></i></button>
                  <span class="approval-size-badge" id="approvalSizeBadge">11.2pt</span>
                  <button type="button" class="btn-approval-action" onclick="changeApprovalFontSize(-1, 'default')" title="បង្រួមទំហំអក្សរ (Shrink font)"><i class="fa-solid fa-minus"></i></button>
                  <button type="button" class="btn-approval-action" onclick="resetApprovalTransform('default')" title="កំណត់ទីតាំង និងទំហំដើម (Reset)"><i class="fa-solid fa-rotate-left"></i></button>
                </div>
                <div class="approval-content-box">
                  <div class="sig-title">បានឃើញ និង ឯកភាព</div>
                  <div class="sig-role">នាយកសាលា</div>
                  <div class="sig-space"></div>
                  <div class="sig-name"></div>
                </div>
                <div class="approval-resize-handle no-print" title="ចុចអូសដើម្បីពង្រីក-បង្រួម (Drag to resize)">
                  <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
                </div>
              </div>
            </div>
            <div class="signature-col sig-right">
              <div class="movable-approval-block movable-teacher-block" id="movableTeacherBlockScore" title="ចុចអូសដើម្បីផ្លាស់ទី ឬពង្រីក-បង្រួមតាមចិត្ត (Drag to move or resize)">
                <div class="approval-drag-handle no-print" title="ចុចអូសដើម្បីផ្លាស់ទី (Drag to move)">
                  <i class="fa-solid fa-arrows-up-down-left-right"></i>
                </div>
                <div class="approval-action-toolbar no-print">
                  <button type="button" class="btn-approval-action" onclick="changeApprovalFontSize(1, 'scoreTeacher')" title="ពង្រីកទំហំអក្សរ"><i class="fa-solid fa-plus"></i></button>
                  <span class="approval-size-badge" id="approvalSizeBadgeScoreTeacher">10.5pt</span>
                  <button type="button" class="btn-approval-action" onclick="changeApprovalFontSize(-1, 'scoreTeacher')" title="បង្រួមទំហំអក្សរ"><i class="fa-solid fa-minus"></i></button>
                  <button type="button" class="btn-approval-action" onclick="changeApprovalWidth(20, 'scoreTeacher')" title="ពង្រីកទទឹងឆ្វេង-ស្ដាំ"><i class="fa-solid fa-arrows-left-right"></i>+</button>
                  <button type="button" class="btn-approval-action" onclick="changeApprovalWidth(-20, 'scoreTeacher')" title="បង្រួមទទឹងឆ្វេង-ស្ដាំ"><i class="fa-solid fa-arrows-left-right"></i>-</button>
                  <button type="button" class="btn-approval-action" onclick="changeApprovalHeight(10, 'scoreTeacher')" title="ពង្រីកគម្លាតលើ-ក្រោម"><i class="fa-solid fa-arrows-up-down"></i>+</button>
                  <button type="button" class="btn-approval-action" onclick="changeApprovalHeight(-10, 'scoreTeacher')" title="បង្រួមគម្លាតលើ-ក្រោម"><i class="fa-solid fa-arrows-up-down"></i>-</button>
                  <button type="button" class="btn-approval-action" onclick="resetApprovalTransform('scoreTeacher')" title="កំណត់ទីតាំង និងទំហំដើម (Reset)"><i class="fa-solid fa-rotate-left"></i></button>
                </div>
                <div class="approval-content-box teacher-approval-box">
                  <div class="signature-lunar-date editable-date" contenteditable="true" spellcheck="false" title="ចុចត្រង់នេះដើម្បីកែសម្រួលកាលបរិច្ឆេទចន្ទគតិ (ចុចក្រៅ ឬ Enter ដើម្បីរក្សាទុក)" onblur="saveScoreSheetDateDirect('${currentClass.id}', 'lunar', this.innerText)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
                    ${scoreLunar}
                  </div>
                  <div class="signature-solar-date editable-date" contenteditable="true" spellcheck="false" title="ចុចត្រង់នេះដើម្បីកែសម្រួលកាលបរិច្ឆេទសុរិយគតិ (ចុចក្រៅ ឬ Enter ដើម្បីរក្សាទុក)" onblur="saveScoreSheetDateDirect('${currentClass.id}', 'solar', this.innerText)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
                    ${scoreSolar}
                  </div>
                  <div class="sig-role" style="margin-top: 6px;">គ្រូប្រចាំថ្នាក់</div>
                  <div class="sig-space" style="height: 38px;"></div>
                  <div class="sig-name" contenteditable="true" spellcheck="false" title="ចុចត្រង់នេះដើម្បីកែសម្រួលឈ្មោះគ្រូប្រចាំថ្នាក់ (ចុចក្រៅ ឬ Enter ដើម្បីរក្សាទុក)" onblur="saveClassTeacherDirect('${currentClass.id}', this.innerText)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
                    ${escapeHtml(currentClass.teacher || "ផន ច័ន្ទតារា")}
                  </div>
                </div>
                <div class="approval-resize-handle no-print" title="ចុចអូសដើម្បីពង្រីក-បង្រួម (Drag to resize)">
                  <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  initMovableApproval('movableApprovalBlock', 'default');
  initMovableApproval('movableTeacherBlockScore', 'scoreTeacher');
}

function onScoreCellEdit(el, stuNum, skillKey) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const monthKey = state.activeScoreMonth || "មករា";

  currentClass.monthlyScores = currentClass.monthlyScores || {};
  currentClass.monthlyScores[monthKey] = currentClass.monthlyScores[monthKey] || {};
  currentClass.monthlyScores[monthKey][stuNum] = currentClass.monthlyScores[monthKey][stuNum] || {};

  let val = parseFloat(el.innerText.trim());
  if (isNaN(val) || val < 0) val = 0;
  if (val > 10) val = 10;
  val = Math.round(val * 10) / 10;
  el.innerText = val;

  currentClass.monthlyScores[monthKey][stuNum][skillKey] = val;
  if (currentClass.clearedScores) {
    currentClass.clearedScores[monthKey] = false;
  }
  if (typeof saveDatabase === "function") saveDatabase();

  // Re-render scores to refresh totals, ranks, and grade statistics
  renderScores();
}

function clearMonthlyScoresData() {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const monthKey = state.activeScoreMonth || "មករា";

  state.scoreBackup = state.scoreBackup || {};
  state.scoreBackup[currentClass.grade + "_" + monthKey] = JSON.parse(JSON.stringify(currentClass.monthlyScores?.[monthKey] || {}));

  currentClass.clearedScores = currentClass.clearedScores || {};
  currentClass.clearedScores[monthKey] = true;

  currentClass.monthlyScores = currentClass.monthlyScores || {};
  currentClass.monthlyScores[monthKey] = {};
  (currentClass.students || []).forEach(s => {
    currentClass.monthlyScores[monthKey][s.num] = {};
    SCORE_SKILLS.forEach(sk => {
      currentClass.monthlyScores[monthKey][s.num][sk.key] = 0;
    });
  });

  if (typeof saveDatabase === "function") saveDatabase();
  renderScores();
  if (typeof showToast === "function") showToast("បានសម្អាតទិន្នន័យពិន្ទុខែ " + monthKey + " រួចរាល់");
}

function undoMonthlyScoresData() {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const monthKey = state.activeScoreMonth || "មករា";
  const backupKey = currentClass.grade + "_" + monthKey;

  if (state.scoreBackup && state.scoreBackup[backupKey]) {
    currentClass.monthlyScores = currentClass.monthlyScores || {};
    currentClass.monthlyScores[monthKey] = JSON.parse(JSON.stringify(state.scoreBackup[backupKey]));
    if (currentClass.clearedScores) {
      currentClass.clearedScores[monthKey] = false;
    }
    if (typeof saveDatabase === "function") saveDatabase();
    renderScores();
    if (typeof showToast === "function") showToast("បានត្រឡប់ទិន្នន័យពិន្ទុខែ " + monthKey + " មកវិញ");
  } else {
    if (typeof showToast === "function") showToast("មិនមានទិន្នន័យសម្រាប់ Undo ឡើយ");
  }
}


const ADMIN_PRINT_CONFIG = {
  scores: { orientation: "landscape", margin: "4mm 5mm", wrapId: "scoresContentWrap" },
  monthly_ranks: { orientation: "portrait", margin: "5mm 7mm", wrapId: "monthlyRanksContentWrap" },
  honor_roll: { orientation: "portrait", margin: "5mm 7mm", wrapId: "honorRollContentWrap" },
  semester_ranks: { orientation: "portrait", margin: "5mm 7mm", wrapId: "semesterRanksContentWrap" },
  semester_scores: { orientation: "landscape", margin: "4mm 5mm", wrapId: "semesterScoresContentWrap" },
  semester_extract: { orientation: "landscape", margin: "4mm 5mm", wrapId: "semesterExtractContentWrap" },
  annual_ranks: { orientation: "portrait", margin: "5mm 7mm", wrapId: "annualRanksContentWrap" },
  study_book: { orientation: "landscape", margin: "4mm 5mm", wrapId: "studyBookContentWrap" },
  trainee: { orientation: "landscape", margin: "4mm 5mm", wrapId: "traineeContentWrap" },
  monthly_report: { orientation: "landscape", margin: "4mm 5mm", wrapId: "monthlyReportContentWrap" }
};

function prepareAdminPrint(subTabId) {
  if (!subTabId) subTabId = (state && state.activeAdminSubTab) ? state.activeAdminSubTab : "scores";
  const cfg = ADMIN_PRINT_CONFIG[subTabId] || { orientation: "portrait", margin: "5mm 7mm", wrapId: "scoresContentWrap" };
  
  if (state) {
    state.activeTab = "admin_tasks";
    state.activeAdminSubTab = subTabId;
  }

  try {
    if (subTabId === "scores" && typeof renderMonthlyScores === "function") renderMonthlyScores();
    else if (subTabId === "monthly_ranks" && typeof renderMonthlyRanks === "function") renderMonthlyRanks();
    else if (subTabId === "honor_roll" && typeof renderHonorRoll === "function") renderHonorRoll();
    else if (subTabId === "semester_ranks" && typeof renderSemesterRanks === "function") renderSemesterRanks();
    else if (subTabId === "semester_scores" && typeof renderSemesterScores === "function") renderSemesterScores();
    else if (subTabId === "semester_extract" && typeof renderSemesterExtract === "function") renderSemesterExtract();
    else if (subTabId === "annual_ranks" && typeof renderAnnualRanks === "function") renderAnnualRanks();
    else if (subTabId === "study_book" && typeof renderStudyBookCurrent === "function") renderStudyBookCurrent();
    else if (subTabId === "trainee" && typeof renderTraineeBook === "function") renderTraineeBook();
    else if (subTabId === "monthly_report" && typeof renderMonthlyReport === "function") renderMonthlyReport();
  } catch (err) {
    console.warn("Render before print error for", subTabId, err);
  }

  document.body.setAttribute("data-active-tab", subTabId);
  document.body.setAttribute("data-admin-subtab", subTabId);
  
  // Clean classes
  Object.keys(ADMIN_PRINT_CONFIG).forEach(k => {
    document.body.classList.remove("tab-" + k + "-active");
  });
  document.body.classList.remove(
    "tab-students_management-active",
    "tab-students-active",
    "tab-attendance_daily-active",
    "tab-attendance_monthly-active",
    "tab-attendance_yearly-active"
  );
  document.body.classList.add("tab-" + subTabId + "-active");
  document.body.classList.add("admin-print-active");

  // Ensure tab-admin_tasks is active and visible
  const adminTab = document.getElementById("tab-admin_tasks");
  if (adminTab) {
    adminTab.classList.add("active");
    adminTab.style.display = "block";
    adminTab.style.visibility = "visible";
  }
  
  // Hide all other main tab panes during admin print
  document.querySelectorAll(".tab-pane:not(#tab-admin_tasks)").forEach(tp => {
    tp.style.display = "none";
  });
  
  // Strictly display ONLY the active admin subpane, hide all other admin subpanes!
  const allSubpanes = document.querySelectorAll(".admin-subpane");
  allSubpanes.forEach(pane => {
    if (pane.id === "tab-" + subTabId) {
      pane.classList.add("active");
      pane.style.display = "block";
      pane.style.visibility = "visible";
    } else {
      pane.classList.remove("active");
      pane.style.display = "none";
    }
  });

  // Flatten active subtab wrappers to eliminate any scrollbars or overflow during print
  const wrappers = document.querySelectorAll(".a4-preview-wrapper, #scoresContentWrap, #monthlyRanksContentWrap, #honorRollContentWrap, #semesterRanksContentWrap, #semesterScoresContentWrap, #semesterExtractContentWrap, #annualRanksContentWrap, #studyBookContentWrap, #traineeContentWrap, #monthlyReportContentWrap, .monthly-score-a4-page, .monthly-rank-a4-page, #printableMonthlyScores, .a4-landscape-page, .a4-portrait-page, .official-score-table, .official-rank-table, .data-table");
  wrappers.forEach(w => {
    w.style.overflow = "visible";
    w.style.overflowX = "visible";
    w.style.overflowY = "visible";
    w.style.boxShadow = "none";
    w.style.border = "none";
    w.style.background = "transparent";
    w.style.scrollbarWidth = "none";
  });

  // Inject or update orientation and complete scrollbar suppression style
  let styleEl = document.getElementById("printPageOrientationStyle");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "printPageOrientationStyle";
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = `
    @page {
      size: A4 ${cfg.orientation} !important;
      margin: ${cfg.margin} !important;
    }
    @media print {
      *, *::before, *::after {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      ::-webkit-scrollbar,
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
      html, body, .app-container, .main-wrapper, .content-body, .tab-pane, .admin-subpane, .a4-preview-wrapper, #scoresContentWrap, #monthlyRanksContentWrap, #honorRollContentWrap, #semesterRanksContentWrap, #semesterScoresContentWrap, #semesterExtractContentWrap, #annualRanksContentWrap, #studyBookContentWrap, #traineeContentWrap, #monthlyReportContentWrap, #tab-scores, #tab-monthly_ranks, #tab-admin_tasks, .monthly-score-a4-page, .monthly-rank-a4-page, #printableMonthlyScores, .official-score-table, .official-rank-table, table {
        overflow: visible !important;
        overflow-x: visible !important;
        overflow-y: visible !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      body.admin-print-active #tab-admin_tasks,
      body[data-admin-subtab] #tab-admin_tasks {
        display: block !important;
        visibility: visible !important;
      }
      body.admin-print-active .tab-pane:not(#tab-admin_tasks),
      body[data-admin-subtab] .tab-pane:not(#tab-admin_tasks) {
        display: none !important;
      }
      .admin-subpane {
        display: none !important;
      }
      .admin-subpane#tab-${subTabId} {
        display: block !important;
        visibility: visible !important;
      }
    }
  `;
}

function restoreAdminPrint(subTabId) {
  const wrappers = document.querySelectorAll(".a4-preview-wrapper, #scoresContentWrap, #monthlyRanksContentWrap, #honorRollContentWrap, #semesterRanksContentWrap, #semesterScoresContentWrap, #semesterExtractContentWrap, #annualRanksContentWrap, #studyBookContentWrap, #traineeContentWrap, #monthlyReportContentWrap, .monthly-score-a4-page, .monthly-rank-a4-page, #printableMonthlyScores, .a4-landscape-page, .a4-portrait-page, .official-score-table, .official-rank-table, .data-table");
  wrappers.forEach(w => {
    w.style.overflow = "";
    w.style.overflowX = "";
    w.style.overflowY = "";
    w.style.boxShadow = "";
    w.style.border = "";
    w.style.background = "";
    w.style.scrollbarWidth = "";
  });
  const styleEl = document.getElementById("printPageOrientationStyle");
  if (styleEl) styleEl.remove();

  document.body.classList.remove("admin-print-active");
  document.body.removeAttribute("data-admin-subtab");

  // Restore tab panes inline display so normal clicking works
  document.querySelectorAll(".tab-pane").forEach(tp => {
    tp.style.display = "";
    tp.style.visibility = "";
  });
  const curSub = (state && state.activeAdminSubTab) ? state.activeAdminSubTab : (subTabId || "scores");
  document.querySelectorAll(".admin-subpane").forEach(pane => {
    pane.style.display = "";
    pane.style.visibility = "";
    pane.classList.toggle("active", pane.id === "tab-" + curSub);
  });

  if (state && state.activeTab && state.activeTab !== "admin_tasks") {
    document.body.setAttribute("data-active-tab", state.activeTab);
  }
}


function printMonthlyScores() {
  prepareAdminPrint("scores");
  window.print();
}

function prepareScoresForPrint() {
  const wrapper = document.getElementById("scoresContentWrap");
  if (wrapper) {
    wrapper.style.overflow = "visible";
    wrapper.style.overflowX = "visible";
    wrapper.style.overflowY = "visible";
    wrapper.style.display = "block";
    wrapper.style.padding = "0";
    wrapper.style.margin = "0";
    wrapper.style.background = "transparent";
    wrapper.style.boxShadow = "none";
    wrapper.style.border = "none";
  }
  const page = document.getElementById("printableMonthlyScores");
  if (page) {
    page.style.overflow = "visible";
    page.style.overflowX = "visible";
    page.style.overflowY = "visible";
    page.style.boxShadow = "none";
    page.style.padding = "0";
    page.style.margin = "0 auto";
    page.style.maxWidth = "100%";
    page.style.minHeight = "auto";
  }
}

function restoreScoresAfterPrint() {
  const wrapper = document.getElementById("scoresContentWrap");
  if (wrapper) {
    wrapper.style.overflow = "";
    wrapper.style.overflowX = "";
    wrapper.style.overflowY = "";
    wrapper.style.display = "";
    wrapper.style.padding = "";
    wrapper.style.margin = "";
    wrapper.style.background = "";
    wrapper.style.boxShadow = "";
    wrapper.style.border = "";
  }
  const page = document.getElementById("printableMonthlyScores");
  if (page) {
    page.style.overflow = "";
    page.style.overflowX = "";
    page.style.overflowY = "";
    page.style.boxShadow = "";
    page.style.padding = "";
    page.style.margin = "";
    page.style.maxWidth = "";
    page.style.minHeight = "";
  }
}

function exportMonthlyScoresExcel() {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const monthKey = state.activeScoreMonth || "មករា";
  const students = currentClass.students || [];
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";

  if (typeof XLSX === "undefined") {
    alert("សូមរង់ចាំបណ្ណាល័យ XLSX ដំណើរការពេញលេញ");
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsData = [];

  wsData.push(["ព្រះរាជាណាចក្រកម្ពុជា", "", "", "", "", "", "", "", "", "", "ជាតិ សាសនា ព្រះមហាក្សត្រ"]);
  wsData.push(["មន្ទីរអប់រំ យុវជន និង កីឡា រាជធានី/ខេត្តតាកែវ"]);
  wsData.push(["ការិយាល័យអប់រំ យុវជន និង កីឡារដ្ឋបាលក្រុង/ស្រុក/ខណ្ឌព្រៃកប្បាស"]);
  wsData.push(["សាលាបឋមសិក្សា បាន្លួង"]);
  wsData.push([""]);
  wsData.push(["តារាងស្រង់ពិន្ទុប្រចាំខែ"]);
  wsData.push([getCleanGradeDisplay(currentClass.grade), `ប្រចាំខែ៖ ${monthKey}`, `ឆ្នាំសិក្សា៖ ${academicYear}`, `សិស្សសរុប៖ ${students.length} នាក់`]);
  wsData.push([""]);

  const headerRow1 = [
    "ល.រ", "គោត្តនាម", "នាមខ្លួន", "ភេទ",
    "ភាសាខ្មែរ", "", "", "",
    "គណិតវិទ្យា", "", "", "", "",
    "វិទ្យាសាស្ត្រ", "សិក្សាសង្គម",
    "អប់រំកាយ សុខភាព សិល្បៈ", "", "",
    "អប់រំបំណិនជីវិត", "ភាសាបរទេស",
    "ពិន្ទុសរុប", "មធ្យមភាគ", "ចំណាត់ថ្នាក់", "និទ្ទេស"
  ];
  const headerRow2 = [
    "", "", "", "",
    "សមត្ថភាពស្ដាប់", "សមត្ថភាពសរសេរ", "សមត្ថភាពអាន", "សមត្ថភាពនិយាយ",
    "ចំនួន", "រង្វាស់រង្វាល់", "ធរណីមាត្រ", "ពីជគណិត", "ស្ថិតិ",
    "", "",
    "គេហវិទ្យា-អប់រំសិល្បៈ", "អប់រំកាយ-កីឡា", "សុខភាព-អនាម័យ",
    "", "",
    "", "", "", ""
  ];
  wsData.push(headerRow1);
  wsData.push(headerRow2);

  // Compute and fill student rows
  const computed = [];
  students.forEach(s => {
    const rec = currentClass.monthlyScores?.[monthKey]?.[s.num] || {};
    let total = 0;
    SCORE_SKILLS.forEach(sk => {
      const v = parseFloat(rec[sk.key]);
      total += isNaN(v) ? 0 : v;
    });
    total = Math.round(total * 10) / 10;
    const avg = total > 0 ? Math.round((total / 16) * 100) / 100 : 0;
    let mention = "";
    if (avg >= 8.5) mention = "A";
    else if (avg >= 8.0) mention = "B";
    else if (avg >= 7.0) mention = "C";
    else if (avg >= 6.0) mention = "D";
    else if (avg >= 5.0) mention = "E";
    else if (total > 0) mention = "F";

    computed.push({ student: s, rec: rec, total: total, avg: avg, mention: mention, rank: 1 });
  });

  const sorted = [...computed].sort((a, b) => b.avg - a.avg);
  let curRank = 1;
  sorted.forEach((item, idx) => {
    if (idx > 0 && item.avg < sorted[idx - 1].avg) curRank = idx + 1;
    item.rank = item.total > 0 ? curRank : "-";
  });

  computed.forEach((item, idx) => {
    const s = item.student;
    const lName = s.lastName || (s.fullName ? s.fullName.trim().split(/\s+/)[0] : "");
    const fName = s.firstName || (s.fullName ? s.fullName.trim().split(/\s+/).slice(1).join(" ") : "");
    const row = [
      s.num || (idx + 1),
      lName,
      fName,
      s.gender || "ប្រុស"
    ];
    SCORE_SKILLS.forEach(sk => {
      row.push(item.rec[sk.key] !== undefined ? item.rec[sk.key] : 0);
    });
    row.push(item.total);
    row.push(item.avg.toFixed(2));
    row.push(item.rank);
    row.push(item.mention || "-");
    wsData.push(row);
  });

  const exportSolar = (currentClass.scoreDates && currentClass.scoreDates[monthKey] && currentClass.scoreDates[monthKey].solar)
    || currentClass.solarDateScore
    || `ធ្វើនៅ បាន្លួង ថ្ងៃទី ១៩ ខែ ${monthKey} ឆ្នាំ ${academicYear.split("-")[0]}`;
  wsData.push([""]);
  wsData.push(["បានឃើញ និង ឯកភាព", "", "", "", "", "", "", "", "", exportSolar]);
  wsData.push(["នាយកសាលា", "", "", "", "", "", "", "", "", `គ្រូប្រចាំថ្នាក់៖ ${currentClass.teacher || ""}`]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "ពិន្ទុប្រចាំខែ");
  XLSX.writeFile(wb, `តារាងស្រង់ពិន្ទុប្រចាំខែ_${currentClass.grade}_${monthKey}.xlsx`);
}

/* ==========================================================================
   MONTHLY RANKINGS (តារាងចំណាត់ថ្នាក់ប្រចាំខែ) - 100% MOEYS STANDARD
   យកតាមគម្រូផ្លូវការ A4 Portrait បញ្ឈរ ចែកជាពីរជួរឈរ (១-១៩ និង ២០-៣៨)
   ========================================================================== */

function changeRankMonth(monthVal) {
  state.activeScoreMonth = monthVal;
  renderMonthlyRanks();
  const scoreMonthSelect = document.getElementById("scoreMonthSelect");
  if (scoreMonthSelect) scoreMonthSelect.value = monthVal;
}

function printMonthlyRanks() {
  prepareAdminPrint("monthly_ranks");
  window.print();
}

function renderMonthlyRanks() {
  let currentClass = getActiveClass();
  const container = document.getElementById("monthlyRanksContentWrap");
  if (!container) return;

  // Fallback to active class with students if current is empty or missing
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    const candidate = (state.db && state.db.classes ? state.db.classes : []).find(
      c => c.academicYear === (state.activeYear || "២០២៦-២០២៧") && c.students && c.students.length > 0
    );
    if (candidate) {
      currentClass = candidate;
      state.activeClassId = candidate.id;
      const rankClassSelect = document.getElementById("rankClassSelect");
      if (rankClassSelect) rankClassSelect.value = candidate.id;
    }
  }

  if (!currentClass) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">សូមជ្រើសរើសថ្នាក់រៀន</p>`;
    return;
  }

  const monthKey = state.activeScoreMonth || "មីនា";
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";
  const students = currentClass.students || [];
  const totalStudents = students.length;
  const femaleCount = students.filter(s => s.gender === "ស្រី").length;

  // Sync Month and Class selectors if present
  const rankMonthSelect = document.getElementById("rankMonthSelect");
  if (rankMonthSelect && state.activeScoreMonth) {
    rankMonthSelect.value = state.activeScoreMonth;
  }
  const rankClassSelect = document.getElementById("rankClassSelect");
  if (rankClassSelect && currentClass.id) {
    rankClassSelect.value = currentClass.id;
  }

  // Ensure monthlyScores data exists
  currentClass.monthlyScores = currentClass.monthlyScores || {};
  currentClass.monthlyScores[monthKey] = currentClass.monthlyScores[monthKey] || {};
  const isCleared = currentClass.clearedScores && currentClass.clearedScores[monthKey];

  // Pre-calculate total, average and mention for ranking
  const studentComputed = [];
  students.forEach((s) => {
    let rec = currentClass.monthlyScores[monthKey][s.num];
    if (!rec) {
      rec = {};
      SCORE_SKILLS.forEach(sk => {
        if (isCleared) {
          rec[sk.key] = 0;
        } else {
          if (sk.group === "khmer") rec[sk.key] = s.scores?.khmer || 7;
          else if (sk.group === "math") rec[sk.key] = s.scores?.math || 7.5;
          else if (sk.key === "science") rec[sk.key] = s.scores?.science || 7;
          else if (sk.key === "social") rec[sk.key] = s.scores?.social || 7;
          else if (sk.key === "pe_home_art") rec[sk.key] = s.scores?.art || 8;
          else if (sk.key === "pe_sport" || sk.key === "pe_health") rec[sk.key] = s.scores?.pe || 8.5;
          else rec[sk.key] = 7;
        }
      });
      currentClass.monthlyScores[monthKey][s.num] = rec;
    }

    let total = 0;
    SCORE_SKILLS.forEach(sk => {
      const v = parseFloat(rec[sk.key]);
      total += isNaN(v) ? 0 : v;
    });
    total = Math.round(total * 10) / 10;
    const avg = total > 0 ? Math.round((total / 16) * 100) / 100 : 0;

    let mention = "";
    if (avg >= 8.5) mention = "A";
    else if (avg >= 8.0) mention = "B";
    else if (avg >= 7.0) mention = "C";
    else if (avg >= 6.0) mention = "D";
    else if (avg >= 5.0) mention = "E";
    else if (total > 0) mention = "F";

    studentComputed.push({
      student: s,
      rec: rec,
      total: total,
      avg: avg,
      mention: mention,
      rank: "-"
    });
  });

  // Assign ranks based on avg descending (Rank 1 down to the last student)
  const sortedByAvg = [...studentComputed].sort((a, b) => {
    if (a.total > 0 && b.total === 0) return -1;
    if (a.total === 0 && b.total > 0) return 1;
    if (b.avg !== a.avg) return b.avg - a.avg;
    return (a.student.num || 0) - (b.student.num || 0);
  });
  let curRank = 1;
  sortedByAvg.forEach((item, idx) => {
    if (idx > 0 && item.avg < sortedByAvg[idx - 1].avg) {
      curRank = idx + 1;
    }
    item.rank = item.total > 0 ? curRank : "-";
  });

  // Statistics for A, B, C, D, E, F
  const stats = {
    A: { total: 0, female: 0, pct: "0.00" },
    B: { total: 0, female: 0, pct: "0.00" },
    C: { total: 0, female: 0, pct: "0.00" },
    D: { total: 0, female: 0, pct: "0.00" },
    E: { total: 0, female: 0, pct: "0.00" },
    F: { total: 0, female: 0, pct: "0.00" }
  };

  studentComputed.forEach(item => {
    if (item.mention && stats[item.mention]) {
      stats[item.mention].total++;
      if (item.student.gender === "ស្រី") {
        stats[item.mention].female++;
      }
    }
  });

  Object.keys(stats).forEach(k => {
    if (totalStudents > 0 && stats[k].total > 0) {
      stats[k].pct = ((stats[k].total / totalStudents) * 100).toFixed(2);
    } else {
      stats[k].pct = "0.00";
    }
  });

  // Sort list according to sortMode (rank vs roster)
  let displayList;
  if (state.rankSortMode === "roster") {
    displayList = [...studentComputed]; // roster order
  } else {
    // Default: Sort strictly by Rank 1 down to the last student
    displayList = sortedByAvg;
  }

  // Exact rows based on actual student count with ZERO spare empty rows
  const rowsPerSide = totalStudents > 0 ? Math.ceil(totalStudents / 2) : 0;

  // Calculate dynamic row height so table rows are larger and fill the A4 page nicely
  let rowHeight = 29;
  if (rowsPerSide <= 18) rowHeight = 31;
  else if (rowsPerSide <= 19) rowHeight = 29;
  else if (rowsPerSide <= 21) rowHeight = 27;
  else rowHeight = 25;

  let tableRowsHtml = "";

  if (totalStudents === 0) {
    tableRowsHtml = `
      <tr>
        <td colspan="16" style="text-align: center; padding: 24px; color: #64748b; font-family: var(--font-battambang);">
          មិនទាន់មានទិន្នន័យសិស្សក្នុងថ្នាក់នេះនៅឡើយទេ
        </td>
      </tr>
    `;
  } else {
    for (let i = 0; i < rowsPerSide; i++) {
      const leftNum = i + 1;
      const rightNum = i + 1 + rowsPerSide;

      const leftItem = displayList[i];
      const rightItem = displayList[i + rowsPerSide];

      // Left student name separated as គោត្តនាម & នាម matching Student List (បញ្ជីឈ្មោះសិស្ស)
      let leftLName = "";
      let leftFName = "";
      let leftGender = "";
      let leftScore = "";
      let leftAvg = "";
      let leftRank = "";
      let leftMention = "";

      if (leftItem) {
        let ln = leftItem.student.lastName || "";
        let fn = leftItem.student.firstName || "";
        if (!ln && !fn && leftItem.student.fullName) {
          const parts = leftItem.student.fullName.trim().split(/\s+/);
          ln = parts[0] || "";
          fn = parts.slice(1).join(" ") || "";
        } else if (ln && !fn && ln.includes(" ")) {
          const parts = ln.trim().split(/\s+/);
          ln = parts[0] || "";
          fn = parts.slice(1).join(" ") || "";
        }
        leftLName = escapeHtml(ln);
        leftFName = escapeHtml(fn);
        leftGender = escapeHtml(leftItem.student.gender || "-");
        leftScore = leftItem.total > 0 ? leftItem.total : 0;
        leftAvg = leftItem.total > 0 ? leftItem.avg.toFixed(2) : "0.00";
        leftRank = leftItem.total > 0 ? leftItem.rank : "-";
        leftMention = leftItem.total > 0 ? leftItem.mention : "-";
      }

      // Right student name separated as គោត្តនាម & នាម matching Student List (បញ្ជីឈ្មោះសិស្ស)
      let rightLName = "";
      let rightFName = "";
      let rightGender = "";
      let rightScore = "";
      let rightAvg = "";
      let rightRank = "";
      let rightMention = "";

      if (rightItem) {
        let rln = rightItem.student.lastName || "";
        let rfn = rightItem.student.firstName || "";
        if (!rln && !rfn && rightItem.student.fullName) {
          const parts = rightItem.student.fullName.trim().split(/\s+/);
          rln = parts[0] || "";
          rfn = parts.slice(1).join(" ") || "";
        } else if (rln && !rfn && rln.includes(" ")) {
          const parts = rln.trim().split(/\s+/);
          rln = parts[0] || "";
          rfn = parts.slice(1).join(" ") || "";
        }
        rightLName = escapeHtml(rln);
        rightFName = escapeHtml(rfn);
        rightGender = escapeHtml(rightItem.student.gender || "-");
        rightScore = rightItem.total > 0 ? rightItem.total : 0;
        rightAvg = rightItem.total > 0 ? rightItem.avg.toFixed(2) : "0.00";
        rightRank = rightItem.total > 0 ? rightItem.rank : "-";
        rightMention = rightItem.total > 0 ? rightItem.mention : "-";
      }

      tableRowsHtml += `
        <tr style="height: ${rowHeight}px;">
          <td class="rank-td-num">${leftNum}</td>
          <td class="rank-td-lastname border-no-r">${leftLName}</td>
          <td class="rank-td-firstname border-no-l">${leftFName}</td>
          <td class="rank-td-gender">${leftGender}</td>
          <td class="rank-td-score">${leftScore}</td>
          <td class="rank-td-avg">${leftAvg}</td>
          <td class="rank-td-rank">${leftRank}</td>
          <td class="rank-td-mention">${leftMention}</td>

          <td class="rank-td-num">${rightItem ? rightNum : ""}</td>
          <td class="rank-td-lastname border-no-r">${rightItem ? rightLName : ""}</td>
          <td class="rank-td-firstname border-no-l">${rightItem ? rightFName : ""}</td>
          <td class="rank-td-gender">${rightGender}</td>
          <td class="rank-td-score">${rightScore}</td>
          <td class="rank-td-avg">${rightAvg}</td>
          <td class="rank-td-rank">${rightRank}</td>
          <td class="rank-td-mention">${rightMention}</td>
        </tr>
      `;
    }
  }

  const pad2 = (n) => String(n).padStart(2, "0");
  const gradeDisplay = getCleanGradeDisplay(currentClass.grade || "ថ្នាក់ទី ៣");

  const savedLunar = (currentClass.rankDates && currentClass.rankDates[monthKey] && currentClass.rankDates[monthKey].lunar)
    || currentClass.lunarDateRank
    || "ថ្ងៃ សៅរ៍ ២ រោច ខែ ផល្គុន ឆ្នាំឆ្លូវ ត្រីស័ក ព.ស ២៥៦៨";
  const savedSolar = (currentClass.rankDates && currentClass.rankDates[monthKey] && currentClass.rankDates[monthKey].solar)
    || currentClass.solarDateRank
    || `ធ្វើនៅ បាន្លួង ថ្ងៃទី ១៩ ខែ ${monthKey} ឆ្នាំ 2026`;

  let html = `
    <div class="monthly-rank-a4-page" id="printableMonthlyRanks">
      <!-- Header -->
      <div class="rank-header-wrap">
        <div class="rank-kingdom-center">
          <div class="rank-kingdom-line1">ព្រះរាជាណាចក្រកម្ពុជា</div>
          <div class="rank-kingdom-line2">ជាតិ  សាសនា  ព្រះមហាក្សត្រ</div>
          <div class="rank-flourish">
            <img src="flourish.png" alt="Flourish" onerror="this.outerHTML='<span style=\'color:#0000cc; font-size:12px;\'>❖━━━━━━ ❖ ━━━━━━❖</span>'">
          </div>
        </div>

        <div class="rank-meta-row">
          <div class="rank-school-grade">
            <div class="rank-school-name">សាលាបឋមសិក្សា បាន្លួង</div>
            <div class="rank-grade-title">${gradeDisplay}</div>
          </div>
          <div class="rank-doc-title">តារាងចំណាត់ថ្នាក់ប្រចាំខែ « ${monthKey} »</div>
        </div>
      </div>

      <!-- Side-by-Side 16-Column Official Table Matching Student List Spacing -->
      <table class="official-rank-table">
        <thead>
          <tr style="height: 28px;">
            <th style="width: 26px; height: 28px;">ល.រ</th>
            <th colspan="2" style="width: 145px; height: 28px;">គោត្តនាម និង នាម</th>
            <th style="width: 32px; height: 28px;">ភេទ</th>
            <th style="width: 36px; height: 28px;">ពិន្ទុ</th>
            <th style="width: 42px; height: 28px;">ម.ភាគ</th>
            <th style="width: 40px; height: 28px;">ចំ.ថ្នាក់</th>
            <th style="width: 40px; height: 28px;">និទ្ទេស</th>

            <th style="width: 26px; height: 28px;">ល.រ</th>
            <th colspan="2" style="width: 145px; height: 28px;">គោត្តនាម និង នាម</th>
            <th style="width: 32px; height: 28px;">ភេទ</th>
            <th style="width: 36px; height: 28px;">ពិន្ទុ</th>
            <th style="width: 42px; height: 28px;">ម.ភាគ</th>
            <th style="width: 40px; height: 28px;">ចំ.ថ្នាក់</th>
            <th style="width: 40px; height: 28px;">និទ្ទេស</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <!-- End of Roster line -->
      <div class="rank-roster-end-line">
        បញ្ឈប់បញ្ជីត្រឹមចំនួនសិស្សសរុប <span class="rank-stat-num">${totalStudents}</span> នាក់  ស្រី <span class="rank-stat-num">${pad2(femaleCount)}</span> នាក់
      </div>

      <!-- Footer Section: 100% Exact Match to User Sample Image -->
      <div class="rank-footer-container">
        <!-- Left Column: Grade Stats on Top, Director Signature on Bottom -->
        <div class="rank-footer-left">
          <div class="rank-summary-block">
            <div class="rank-summary-label">សរុបសិស្សបាននិទ្ទេស</div>
            <div class="rank-bracket-svg">
              <svg width="18" height="96" viewBox="0 0 18 96" fill="none" style="stroke: #0000cc; stroke-width: 1.6;">
                <path d="M 16 2 C 8 2, 3 6, 3 14 L 3 41 C 3 46, 0 48, 0 48 C 0 48, 3 50, 3 55 L 3 82 C 3 90, 8 94, 16 94" />
              </svg>
            </div>
            <div class="rank-grades-list">
              <div class="rank-grade-row">
                <span class="rank-grade-name">និទ្ទេស A</span>
                <span class="rank-grade-lbl">មាន</span>
                <span class="rank-grade-val">${stats.A.total} នាក់</span>
                <span class="rank-grade-lbl">ស្រី</span>
                <span class="rank-grade-val">${stats.A.female} នាក់</span>
                <span class="rank-grade-lbl">ត្រូវជា</span>
                <span class="rank-grade-pct">${stats.A.pct}%</span>
              </div>
              <div class="rank-grade-row">
                <span class="rank-grade-name">និទ្ទេស B</span>
                <span class="rank-grade-lbl">មាន</span>
                <span class="rank-grade-val">${stats.B.total} នាក់</span>
                <span class="rank-grade-lbl">ស្រី</span>
                <span class="rank-grade-val">${stats.B.female} នាក់</span>
                <span class="rank-grade-lbl">ត្រូវជា</span>
                <span class="rank-grade-pct">${stats.B.pct}%</span>
              </div>
              <div class="rank-grade-row">
                <span class="rank-grade-name">និទ្ទេស C</span>
                <span class="rank-grade-lbl">មាន</span>
                <span class="rank-grade-val">${stats.C.total} នាក់</span>
                <span class="rank-grade-lbl">ស្រី</span>
                <span class="rank-grade-val">${stats.C.female} នាក់</span>
                <span class="rank-grade-lbl">ត្រូវជា</span>
                <span class="rank-grade-pct">${stats.C.pct}%</span>
              </div>
              <div class="rank-grade-row">
                <span class="rank-grade-name">និទ្ទេស D</span>
                <span class="rank-grade-lbl">មាន</span>
                <span class="rank-grade-val">${stats.D.total} នាក់</span>
                <span class="rank-grade-lbl">ស្រី</span>
                <span class="rank-grade-val">${stats.D.female} នាក់</span>
                <span class="rank-grade-lbl">ត្រូវជា</span>
                <span class="rank-grade-pct">${stats.D.pct}%</span>
              </div>
              <div class="rank-grade-row">
                <span class="rank-grade-name">និទ្ទេស E</span>
                <span class="rank-grade-lbl">មាន</span>
                <span class="rank-grade-val">${stats.E.total} នាក់</span>
                <span class="rank-grade-lbl">ស្រី</span>
                <span class="rank-grade-val">${stats.E.female} នាក់</span>
                <span class="rank-grade-lbl">ត្រូវជា</span>
                <span class="rank-grade-pct">${stats.E.pct}%</span>
              </div>
              <div class="rank-grade-row">
                <span class="rank-grade-name">និទ្ទេស F</span>
                <span class="rank-grade-lbl">មាន</span>
                <span class="rank-grade-val">${stats.F.total} នាក់</span>
                <span class="rank-grade-lbl">ស្រី</span>
                <span class="rank-grade-val">${stats.F.female} នាក់</span>
                <span class="rank-grade-lbl">ត្រូវជា</span>
                <span class="rank-grade-pct">${stats.F.pct}%</span>
              </div>
            </div>
          </div>

          <!-- Director Approval Block (Centered under left column) -->
          <div class="rank-director-sign-wrap">
            <div class="movable-approval-block" id="movableApprovalBlockRank" title="ចុចអូសដើម្បីផ្លាស់ទី ឬពង្រីក-បង្រួមតាមចិត្ត (Drag to move or resize)">
              <div class="approval-drag-handle no-print" title="ចុចអូសដើម្បីផ្លាស់ទី (Drag to move)">
                <i class="fa-solid fa-arrows-up-down-left-right"></i>
              </div>
              <div class="approval-action-toolbar no-print">
                <button type="button" class="btn-approval-action" onclick="changeApprovalFontSize(-1, 'rank')" title="បង្រួមទំហំអក្សរ (8pt, 9pt...)"><i class="fa-solid fa-font"></i>-</button>
                <span class="approval-size-badge" title="ទំហំអក្សរបច្ចុប្បន្ន">10.2pt</span>
                <button type="button" class="btn-approval-action" onclick="changeApprovalFontSize(1, 'rank')" title="ពង្រីកទំហំអក្សរ"><i class="fa-solid fa-font"></i>+</button>
                <button type="button" class="btn-approval-action" onclick="resetApprovalTransform('rank')" title="កំណត់ទំហំដើម"><i class="fa-solid fa-rotate-left"></i></button>
              </div>
              <div class="sig-title" style="font-family: var(--font-moul-light); color: #0000cc; font-size: 10.2pt; text-align: center;">បានឃើញ និង ឯកភាព</div>
              <div class="sig-role" style="font-family: var(--font-moul-light); color: #0000cc; font-size: 10.2pt; margin-top: 4px; text-align: center;">នាយកសាលា</div>
              <div class="approval-resize-handle no-print" title="ចុចអូសត្រង់នេះដើម្បីពង្រីក ឬបង្រួម (Drag to resize)">
                <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Dates on Top, Teacher Signature on Bottom -->
        <div class="rank-footer-right">
          <div class="movable-approval-block movable-teacher-block" id="movableTeacherBlockRank" title="ចុចអូសដើម្បីផ្លាស់ទី ឬពង្រីក-បង្រួមតាមចិត្ត (Drag to move or resize)">
            <div class="approval-drag-handle no-print" title="ចុចអូសដើម្បីផ្លាស់ទី (Drag to move)">
              <i class="fa-solid fa-arrows-up-down-left-right"></i>
            </div>
            <div class="approval-action-toolbar no-print">
              <button type="button" class="btn-approval-action" onclick="changeApprovalFontSize(1, 'rankTeacher')" title="ពង្រីកទំហំអក្សរ"><i class="fa-solid fa-plus"></i></button>
              <span class="approval-size-badge" id="approvalSizeBadgeRankTeacher">10.5pt</span>
              <button type="button" class="btn-approval-action" onclick="changeApprovalFontSize(-1, 'rankTeacher')" title="បង្រួមទំហំអក្សរ"><i class="fa-solid fa-minus"></i></button>
              <button type="button" class="btn-approval-action" onclick="changeApprovalWidth(20, 'rankTeacher')" title="ពង្រីកទទឹងឆ្វេង-ស្ដាំ"><i class="fa-solid fa-arrows-left-right"></i>+</button>
              <button type="button" class="btn-approval-action" onclick="changeApprovalWidth(-20, 'rankTeacher')" title="បង្រួមទទឹងឆ្វេង-ស្ដាំ"><i class="fa-solid fa-arrows-left-right"></i>-</button>
              <button type="button" class="btn-approval-action" onclick="changeApprovalHeight(10, 'rankTeacher')" title="ពង្រីកគម្លាតលើ-ក្រោម"><i class="fa-solid fa-arrows-up-down"></i>+</button>
              <button type="button" class="btn-approval-action" onclick="changeApprovalHeight(-10, 'rankTeacher')" title="បង្រួមគម្លាតលើ-ក្រោម"><i class="fa-solid fa-arrows-up-down"></i>-</button>
              <button type="button" class="btn-approval-action" onclick="resetApprovalTransform('rankTeacher')" title="កំណត់ទីតាំង និងទំហំដើម (Reset)"><i class="fa-solid fa-rotate-left"></i></button>
            </div>
            <div class="approval-content-box teacher-approval-box">
              <div class="rank-lunar-date editable-date" contenteditable="true" spellcheck="false" title="ចុចត្រង់នេះដើម្បីកែសម្រួលកាលបរិច្ឆេទចន្ទគតិ (ចុចក្រៅ ឬ Enter ដើម្បីរក្សាទុក)" onblur="saveRankDateDirect('${currentClass.id}', 'lunar', this.innerText)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
                ${savedLunar}
              </div>
              <div class="rank-solar-date editable-date" contenteditable="true" spellcheck="false" title="ចុចត្រង់នេះដើម្បីកែសម្រួលកាលបរិច្ឆេទសុរិយគតិ (ចុចក្រៅ ឬ Enter ដើម្បីរក្សាទុក)" onblur="saveRankDateDirect('${currentClass.id}', 'solar', this.innerText)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
                ${savedSolar}
              </div>
              <div class="sig-role" style="margin-top: 6px; font-family: var(--font-moul-light); color: #0000cc; font-size: 10.2pt; text-align: center;">គ្រូប្រចាំថ្នាក់</div>
              <div class="sig-space" style="height: 38px;"></div>
              <div class="sig-name sig-teacher-name" contenteditable="true" spellcheck="false" title="ចុចត្រង់នេះដើម្បីកែសម្រួលឈ្មោះគ្រូប្រចាំថ្នាក់ (ចុចក្រៅ ឬ Enter ដើម្បីរក្សាទុក)" onblur="saveClassTeacherDirect('${currentClass.id}', this.innerText)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" style="font-family: var(--font-moul-light); color: #0000cc; font-size: 10.2pt; text-align: center;">
                ${escapeHtml(currentClass.teacher || "លី ស្រីនូ")}
              </div>
            </div>
            <div class="approval-resize-handle no-print" title="ចុចអូសដើម្បីពង្រីក-បង្រួម (Drag to resize)">
              <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  initMovableApproval("movableApprovalBlockRank", "rank");
  initMovableApproval("movableTeacherBlockRank", "rankTeacher");
}

function exportMonthlyRanksExcel() {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const monthKey = state.activeScoreMonth || "មីនា";
  const students = currentClass.students || [];
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";

  if (typeof XLSX === "undefined") {
    alert("សូមរង់ចាំបណ្ណាល័យ XLSX ដំណើរការពេញលេញ");
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsData = [];

  wsData.push(["ព្រះរាជាណាចក្រកម្ពុជា", "", "", "", "", "", "", "", "", "", "", "ជាតិ សាសនា ព្រះមហាក្សត្រ"]);
  wsData.push(["សាលាបឋមសិក្សា បាន្លួង"]);
  wsData.push([getCleanGradeDisplay(currentClass.grade || "ថ្នាក់ទី ៣")]);
  wsData.push([""]);
  wsData.push([`តារាងចំណាត់ថ្នាក់ប្រចាំខែ “ ${monthKey} ”`]);
  wsData.push([`ឆ្នាំសិក្សា៖ ${academicYear}`, `សិស្សសរុប៖ ${students.length} នាក់`]);
  wsData.push([""]);

  const headerRow = [
    "ល.រ", "គោត្តនាម", "នាម", "ភេទ", "ពិន្ទុ", "ម.ភាគ", "ចំ.ថ្នាក់", "និទ្ទេស",
    "ល.រ", "គោត្តនាម", "នាម", "ភេទ", "ពិន្ទុ", "ម.ភាគ", "ចំ.ថ្នាក់", "និទ្ទេស"
  ];
  wsData.push(headerRow);

  // Pre-calculate
  const studentComputed = [];
  currentClass.monthlyScores = currentClass.monthlyScores || {};
  currentClass.monthlyScores[monthKey] = currentClass.monthlyScores[monthKey] || {};

  students.forEach((s) => {
    let rec = currentClass.monthlyScores[monthKey][s.num] || {};
    let total = 0;
    SCORE_SKILLS.forEach(sk => {
      const v = parseFloat(rec[sk.key]);
      total += isNaN(v) ? 0 : v;
    });
    total = Math.round(total * 10) / 10;
    const avg = total > 0 ? Math.round((total / 16) * 100) / 100 : 0;
    let mention = "";
    if (avg >= 8.5) mention = "A";
    else if (avg >= 8.0) mention = "B";
    else if (avg >= 7.0) mention = "C";
    else if (avg >= 6.0) mention = "D";
    else if (avg >= 5.0) mention = "E";
    else if (total > 0) mention = "F";
    studentComputed.push({ student: s, total, avg, rank: 1, mention });
  });

  const sortedByAvg = [...studentComputed].sort((a, b) => {
    if (a.total > 0 && b.total === 0) return -1;
    if (a.total === 0 && b.total > 0) return 1;
    if (b.avg !== a.avg) return b.avg - a.avg;
    return (a.student.num || 0) - (b.student.num || 0);
  });
  let curRank = 1;
  sortedByAvg.forEach((item, idx) => {
    if (idx > 0 && item.avg < sortedByAvg[idx - 1].avg) {
      curRank = idx + 1;
    }
    item.rank = item.total > 0 ? curRank : "-";
  });

  let displayList = state.rankSortMode === "roster" ? [...studentComputed] : sortedByAvg;

  const rowsPerSide = students.length > 0 ? Math.ceil(students.length / 2) : 0;
  for (let i = 0; i < rowsPerSide; i++) {
    const leftNum = i + 1;
    const rightNum = i + 1 + rowsPerSide;
    const leftItem = displayList[i];
    const rightItem = displayList[i + rowsPerSide];

    let lLast = "", lFirst = "";
    if (leftItem) {
      lLast = leftItem.student.lastName || "";
      lFirst = leftItem.student.firstName || "";
      if (!lLast && !lFirst && leftItem.student.fullName) {
        const parts = leftItem.student.fullName.trim().split(/\s+/);
        lLast = parts[0] || "";
        lFirst = parts.slice(1).join(" ") || "";
      }
    }

    let rLast = "", rFirst = "";
    if (rightItem) {
      rLast = rightItem.student.lastName || "";
      rFirst = rightItem.student.firstName || "";
      if (!rLast && !rFirst && rightItem.student.fullName) {
        const parts = rightItem.student.fullName.trim().split(/\s+/);
        rLast = parts[0] || "";
        rFirst = parts.slice(1).join(" ") || "";
      }
    }

    wsData.push([
      leftNum,
      lLast,
      lFirst,
      leftItem ? (leftItem.student.gender || "-") : "",
      leftItem && leftItem.total > 0 ? leftItem.total : (leftItem ? 0 : ""),
      leftItem && leftItem.total > 0 ? leftItem.avg.toFixed(2) : (leftItem ? "0.00" : ""),
      leftItem && leftItem.total > 0 ? leftItem.rank : (leftItem ? "-" : ""),
      leftItem && leftItem.total > 0 ? leftItem.mention : (leftItem ? "-" : ""),
      rightItem ? rightNum : "",
      rLast,
      rFirst,
      rightItem ? (rightItem.student.gender || "-") : "",
      rightItem && rightItem.total > 0 ? rightItem.total : (rightItem ? 0 : ""),
      rightItem && rightItem.total > 0 ? rightItem.avg.toFixed(2) : (rightItem ? "0.00" : ""),
      rightItem && rightItem.total > 0 ? rightItem.rank : (rightItem ? "-" : ""),
      rightItem && rightItem.total > 0 ? rightItem.mention : (rightItem ? "-" : "")
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "ចំណាត់ថ្នាក់");
  XLSX.writeFile(wb, `តារាងចំណាត់ថ្នាក់ប្រចាំខែ_${currentClass.grade || "ថ្នាក់"}_${monthKey}.xlsx`);
}

/* ==========================================================================
   HONOR ROLL (តារាងកិត្តិយស) - 100% ORIGINAL SAMPLE MATCH
   លទ្ធផលដកស្រង់ស្វ័យប្រវត្តិចេញពីចំណាត់ថ្នាក់ប្រចាំខែ (Top 5 សិស្សពូកែ)
   ========================================================================== */

function changeHonorMonth(monthVal) {
  state.activeHonorMonth = monthVal;
  const honorMonthSelect = document.getElementById("honorMonthSelect");
  if (honorMonthSelect) honorMonthSelect.value = monthVal;
  if (!monthVal.startsWith("ប្រចាំ")) {
    state.activeScoreMonth = monthVal;
    const scoreMonthSelect = document.getElementById("scoreMonthSelect");
    if (scoreMonthSelect) scoreMonthSelect.value = monthVal;
    const rankMonthSelect = document.getElementById("rankMonthSelect");
    if (rankMonthSelect) rankMonthSelect.value = monthVal;
  }
  renderHonorRoll();
}
window.changeHonorMonth = changeHonorMonth;

function printHonorRoll() {
  prepareAdminPrint("honor_roll");
  window.print();
}
window.printHonorRoll = printHonorRoll;

if (typeof window.changeClass !== "function") {
  window.changeClass = function(classId) {
    state.activeClassId = classId;
    try { localStorage.setItem("banloung_active_class_id", classId); } catch (e) {}
    const currentClass = getActiveClass();
    if (currentClass) {
      ensureDefaultMonthlyAttendance(currentClass, state.activeAttendanceYear, state.activeAttendanceMonth);
    }
    const selectElements = document.querySelectorAll(".class-select-input");
    selectElements.forEach(select => {
      select.value = classId;
    });
    renderActiveTab();
  };
}

function renderHonorRoll() {
  let currentClass = getActiveClass();
  const container = document.getElementById("honorRollContentWrap");
  if (!container) return;

  // Fallback to active class with students if current is empty or missing
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    const candidate = (state.db && state.db.classes ? state.db.classes : []).find(
      c => c.academicYear === (state.activeYear || "២០២៦-២០២៧") && c.students && c.students.length > 0
    );
    if (candidate) {
      currentClass = candidate;
      state.activeClassId = candidate.id;
    }
  }

  if (!currentClass) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">សូមជ្រើសរើសថ្នាក់រៀន</p>`;
    return;
  }

  const monthKey = state.activeHonorMonth || state.activeScoreMonth || "មីនា";
  const honorMonthSelect = document.getElementById("honorMonthSelect");
  if (honorMonthSelect) honorMonthSelect.value = monthKey;

  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";
  const students = currentClass.students || [];

  let studentComputed = [];
  const sem1Months = (state.semesterCustomMonths && state.semesterCustomMonths["1"]) || ["ធ្នូ", "មករា", "កុម្ភៈ", "មីនា"];
  const sem2Months = (state.semesterCustomMonths && state.semesterCustomMonths["2"]) || ["ឧសភា", "មិថុនា", "កក្កដា", "សីហា"];

  if (monthKey === "ប្រចាំឆមាសទី១") {
    studentComputed = students.map((s, idx) => {
      let semAvg = 0;
      if (currentClass.semesterRankEdits?.["1"]?.[s.num]?.semAvg !== undefined) {
        semAvg = currentClass.semesterRankEdits["1"][s.num].semAvg;
      } else {
        let sum = 0, count = 0;
        sem1Months.forEach(m => {
          const res = getStudentMonthAvg(currentClass, m, s);
          if (res.avg > 0) { sum += res.avg; count++; }
        });
        const mAvg = count > 0 ? (sum / count) : 0;
        const exAvg = getStudentSemesterExamScores(currentClass, "1", s).avg || 0;
        if (mAvg > 0 && exAvg > 0) semAvg = Math.round(((mAvg + exAvg) / 2) * 100) / 100;
        else if (mAvg > 0) semAvg = Math.round(mAvg * 100) / 100;
        else if (exAvg > 0) semAvg = Math.round(exAvg * 100) / 100;
      }
      return {
        student: s,
        avg: semAvg,
        total: semAvg,
        num: s.num || (idx + 1)
      };
    });
  } else if (monthKey === "ប្រចាំឆមាសទី២") {
    studentComputed = students.map((s, idx) => {
      let semAvg = 0;
      if (currentClass.semesterRankEdits?.["2"]?.[s.num]?.semAvg !== undefined) {
        semAvg = currentClass.semesterRankEdits["2"][s.num].semAvg;
      } else {
        let sum = 0, count = 0;
        sem2Months.forEach(m => {
          const res = getStudentMonthAvg(currentClass, m, s);
          if (res.avg > 0) { sum += res.avg; count++; }
        });
        const mAvg = count > 0 ? (sum / count) : 0;
        const exAvg = getStudentSemesterExamScores(currentClass, "2", s).avg || 0;
        if (mAvg > 0 && exAvg > 0) semAvg = Math.round(((mAvg + exAvg) / 2) * 100) / 100;
        else if (mAvg > 0) semAvg = Math.round(mAvg * 100) / 100;
        else if (exAvg > 0) semAvg = Math.round(exAvg * 100) / 100;
      }
      return {
        student: s,
        avg: semAvg,
        total: semAvg,
        num: s.num || (idx + 1)
      };
    });
  } else if (monthKey === "ប្រចាំឆ្នាំ") {
    studentComputed = students.map((s, idx) => {
      let annualAvg = 0;
      if (currentClass.annualRankEdits?.[s.num]?.annualAvg !== undefined) {
        annualAvg = currentClass.annualRankEdits[s.num].annualAvg;
      } else {
        let sem1Avg = 0;
        if (currentClass.annualRankEdits?.[s.num]?.sem1Avg !== undefined) {
          sem1Avg = currentClass.annualRankEdits[s.num].sem1Avg;
        } else if (currentClass.semesterRankEdits?.["1"]?.[s.num]?.semAvg !== undefined) {
          sem1Avg = currentClass.semesterRankEdits["1"][s.num].semAvg;
        } else {
          let sum = 0, count = 0;
          sem1Months.forEach(m => {
            const res = getStudentMonthAvg(currentClass, m, s);
            if (res.avg > 0) { sum += res.avg; count++; }
          });
          const mAvg = count > 0 ? (sum / count) : 0;
          const exAvg = getStudentSemesterExamScores(currentClass, "1", s).avg || 0;
          if (mAvg > 0 && exAvg > 0) sem1Avg = Math.round(((mAvg + exAvg) / 2) * 100) / 100;
          else if (mAvg > 0) sem1Avg = Math.round(mAvg * 100) / 100;
          else if (exAvg > 0) sem1Avg = Math.round(exAvg * 100) / 100;
        }

        let sem2Avg = 0;
        if (currentClass.annualRankEdits?.[s.num]?.sem2Avg !== undefined) {
          sem2Avg = currentClass.annualRankEdits[s.num].sem2Avg;
        } else if (currentClass.semesterRankEdits?.["2"]?.[s.num]?.semAvg !== undefined) {
          sem2Avg = currentClass.semesterRankEdits["2"][s.num].semAvg;
        } else {
          let sum = 0, count = 0;
          sem2Months.forEach(m => {
            const res = getStudentMonthAvg(currentClass, m, s);
            if (res.avg > 0) { sum += res.avg; count++; }
          });
          const mAvg = count > 0 ? (sum / count) : 0;
          const exAvg = getStudentSemesterExamScores(currentClass, "2", s).avg || 0;
          if (mAvg > 0 && exAvg > 0) sem2Avg = Math.round(((mAvg + exAvg) / 2) * 100) / 100;
          else if (mAvg > 0) sem2Avg = Math.round(mAvg * 100) / 100;
          else if (exAvg > 0) sem2Avg = Math.round(exAvg * 100) / 100;
        }

        if (sem1Avg > 0 && sem2Avg > 0) {
          annualAvg = Math.round(((sem1Avg + sem2Avg) / 2) * 100) / 100;
        } else if (sem1Avg > 0) {
          annualAvg = sem1Avg;
        } else if (sem2Avg > 0) {
          annualAvg = sem2Avg;
        }
      }
      return {
        student: s,
        avg: annualAvg,
        total: annualAvg,
        num: s.num || (idx + 1)
      };
    });
  } else {
    // Ensure monthlyScores data exists
    currentClass.monthlyScores = currentClass.monthlyScores || {};
    currentClass.monthlyScores[monthKey] = currentClass.monthlyScores[monthKey] || {};
    const isCleared = currentClass.clearedScores && currentClass.clearedScores[monthKey];

    // Pre-calculate total, average and mention for ranking exactly like monthly rankings
    students.forEach((s) => {
      let rec = currentClass.monthlyScores[monthKey][s.num];
      if (!rec) {
        rec = {};
        SCORE_SKILLS.forEach(sk => {
          if (isCleared) {
            rec[sk.key] = 0;
          } else {
            if (sk.group === "khmer") rec[sk.key] = s.scores?.khmer || 7;
            else if (sk.group === "math") rec[sk.key] = s.scores?.math || 7.5;
            else if (sk.key === "science") rec[sk.key] = s.scores?.science || 7;
            else if (sk.key === "social") rec[sk.key] = s.scores?.social || 7;
            else if (sk.key === "pe_home_art") rec[sk.key] = s.scores?.art || 8;
            else if (sk.key === "pe_sport" || sk.key === "pe_health") rec[sk.key] = s.scores?.pe || 8.5;
            else rec[sk.key] = 7;
          }
        });
        currentClass.monthlyScores[monthKey][s.num] = rec;
      }

      let total = 0;
      SCORE_SKILLS.forEach(sk => {
        const v = parseFloat(rec[sk.key]);
        total += isNaN(v) ? 0 : v;
      });
      total = Math.round(total * 10) / 10;
      const avg = total > 0 ? Math.round((total / 16) * 100) / 100 : 0;

      let mention = "";
      if (avg >= 8.5) mention = "A";
      else if (avg >= 8.0) mention = "B";
      else if (avg >= 7.0) mention = "C";
      else if (avg >= 6.0) mention = "D";
      else if (avg >= 5.0) mention = "E";
      else if (total > 0) mention = "F";

      studentComputed.push({
        student: s,
        rec: rec,
        total: total,
        avg: avg,
        mention: mention
      });
    });
  }

  // Assign ranks based on avg descending (Top 1 to 5)
  const sortedByAvg = [...studentComputed].sort((a, b) => {
    if (a.total > 0 && b.total === 0) return -1;
    if (a.total === 0 && b.total > 0) return 1;
    if (b.avg !== a.avg) return b.avg - a.avg;
    return (a.student.num || 0) - (b.student.num || 0);
  });

  function getStudentHonorName(item) {
    if (!item || !item.student) return "";
    const s = item.student;
    const last = (s.lastName || "").trim();
    const first = (s.firstName || "").trim();
    if (last && first) return `${last}  ${first}`.normalize("NFC");
    if (s.fullName) return s.fullName.trim().normalize("NFC");
    if (s.name) return s.name.trim().normalize("NFC");
    return "";
  }

  const r1Name = getStudentHonorName(sortedByAvg[0]);
  const r2Name = getStudentHonorName(sortedByAvg[1]);
  const r3Name = getStudentHonorName(sortedByAvg[2]);
  const r4Name = getStudentHonorName(sortedByAvg[3]);
  const r5Name = getStudentHonorName(sortedByAvg[4]);

  const districtVal = (state.db && state.db.schoolProfile && state.db.schoolProfile.district) ? state.db.schoolProfile.district : "ព្រៃកប្បាស";
  const clusterVal = (state.db && state.db.schoolProfile && state.db.schoolProfile.cluster) ? state.db.schoolProfile.cluster : "ព្រៃល្វា";
  const schoolVal = (state.db && state.db.schoolProfile && state.db.schoolProfile.school) ? state.db.schoolProfile.school : "បាន្លួង";
  const gradeRaw = currentClass.grade || "ថ្នាក់ទី ៣";
  const cleanGrade = getCleanGradeDisplay(gradeRaw);
  const gradeVal = cleanGrade.replace(/^ថ្នាក់ទី\s*/, "").replace(/^ថ្នាក់\s*/, "").trim() || cleanGrade;

  const teacherVal = currentClass.teacher || "លី ស្រីនូ";
  const directorVal = (state.db && state.db.schoolProfile && state.db.schoolProfile.director && state.db.schoolProfile.director !== "អ៊ិន សុខុម") ? state.db.schoolProfile.director : "";

  currentClass.honorRollDates = currentClass.honorRollDates || {};
  const dirDateLunar = currentClass.honorRollDates.dirDateLunar || "";
  const dirDateSolar = currentClass.honorRollDates.dirDateSolar || "";
  const teachDateLunar = currentClass.honorRollDates.teachDateLunar || "";
  const teachDateSolar = currentClass.honorRollDates.teachDateSolar || "";

  let html = `
    <div class="honor-bee-page" id="printableHonorRoll">
      <div class="honor-bee-canvas">
        <!-- Exact 100% template backdrop -->
        <img src="honor_bee_bg_a4.png" class="honor-bee-bg-img" alt="តារាងកិត្តិយស" />

        <!-- Left Header Fields -->
        <div class="honor-bee-field field-district" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែស្រុក" onblur="saveHonorProfileField('district', this.innerText)">${escapeHtml(districtVal)}</div>
        <div class="honor-bee-field field-cluster" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកម្រង" onblur="saveHonorProfileField('cluster', this.innerText)">${escapeHtml(clusterVal)}</div>
        <div class="honor-bee-field field-school" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែសាលា" onblur="saveHonorProfileField('school', this.innerText)">${escapeHtml(schoolVal)}</div>
        <div class="honor-bee-field field-grade" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែថ្នាក់">${escapeHtml(gradeVal)}</div>

        <!-- Month in 'ប្រឡងប្រចាំខែ' -->
        <div class="honor-bee-month-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែខែ">${escapeHtml(monthKey)}</div>

        <!-- 5 Top Student Placards -->
        <div class="honor-bee-placard placard-r1" contenteditable="true" spellcheck="false" title="ឈ្មោះសិស្សចំណាត់ថ្នាក់លេខ ១ (ចុចដើម្បីកែប្រែ)">
          <span class="honor-bee-student-text">${r1Name}</span>
        </div>
        <div class="honor-bee-placard placard-r2" contenteditable="true" spellcheck="false" title="ឈ្មោះសិស្សចំណាត់ថ្នាក់លេខ ២ (ចុចដើម្បីកែប្រែ)">
          <span class="honor-bee-student-text">${r2Name}</span>
        </div>
        <div class="honor-bee-placard placard-r3" contenteditable="true" spellcheck="false" title="ឈ្មោះសិស្សចំណាត់ថ្នាក់លេខ ៣ (ចុចដើម្បីកែប្រែ)">
          <span class="honor-bee-student-text">${r3Name}</span>
        </div>
        <div class="honor-bee-placard placard-r4" contenteditable="true" spellcheck="false" title="ឈ្មោះសិស្សចំណាត់ថ្នាក់លេខ ៤ (ចុចដើម្បីកែប្រែ)">
          <span class="honor-bee-student-text">${r4Name}</span>
        </div>
        <div class="honor-bee-placard placard-r5" contenteditable="true" spellcheck="false" title="ឈ្មោះសិស្សចំណាត់ថ្នាក់លេខ ៥ (ចុចដើម្បីកែប្រែ)">
          <span class="honor-bee-student-text">${r5Name}</span>
        </div>

        <!-- Director Date Lines (Editable) -->
        <div class="honor-bee-date dir-date-lunar" contenteditable="true" spellcheck="false" title="ចុចដើម្បីបំពេញកាលបរិច្ឆេទតាមច័ន្ទគតិ នាយកសាលា" onblur="saveHonorRollDate('dirDateLunar', this.innerText)">${escapeHtml(dirDateLunar)}</div>
        <div class="honor-bee-date dir-date-solar" contenteditable="true" spellcheck="false" title="ចុចដើម្បីបំពេញកាលបរិច្ឆេទតាមសុរិយគតិ នាយកសាលា" onblur="saveHonorRollDate('dirDateSolar', this.innerText)">${escapeHtml(dirDateSolar)}</div>

        <!-- Footers -->
        <div class="honor-bee-director-name" contenteditable="true" spellcheck="false" title="ឈ្មោះនាយកសាលា (ចុចដើម្បីបំពេញ)" onblur="saveHonorDirectorName(this.innerText)">${escapeHtml(directorVal)}</div>
        
        <!-- Teacher Date Lines (Editable) -->
        <div class="honor-bee-date teach-date-lunar" contenteditable="true" spellcheck="false" title="ចុចដើម្បីបំពេញកាលបរិច្ឆេទតាមច័ន្ទគតិ គ្រូទទួលបន្ទុកថ្នាក់" onblur="saveHonorRollDate('teachDateLunar', this.innerText)">${escapeHtml(teachDateLunar)}</div>
        <div class="honor-bee-date teach-date-solar" contenteditable="true" spellcheck="false" title="ចុចដើម្បីបំពេញកាលបរិច្ឆេទតាមសុរិយគតិ គ្រូទទួលបន្ទុកថ្នាក់" onblur="saveHonorRollDate('teachDateSolar', this.innerText)">${escapeHtml(teachDateSolar)}</div>

        <!-- Teacher Name -->
        <div class="honor-bee-teacher-name" contenteditable="true" spellcheck="false" title="ឈ្មោះគ្រូទទួលបន្ទុកថ្នាក់ (ចុចដើម្បីកែប្រែ)" onblur="saveClassTeacherDirect('${currentClass.id}', this.innerText)">${escapeHtml(teacherVal)}</div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}
window.renderHonorRoll = renderHonorRoll;

function saveHonorRollDate(field, val) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  currentClass.honorRollDates = currentClass.honorRollDates || {};
  currentClass.honorRollDates[field] = val.trim();
  saveDatabase();
}
window.saveHonorRollDate = saveHonorRollDate;

function saveHonorDirectorName(val) {
  state.db = state.db || {};
  state.db.schoolProfile = state.db.schoolProfile || {};
  state.db.schoolProfile.director = val.trim();
  saveDatabase();
}
window.saveHonorDirectorName = saveHonorDirectorName;

function saveHonorProfileField(field, val) {
  state.db = state.db || {};
  state.db.schoolProfile = state.db.schoolProfile || {};
  state.db.schoolProfile[field] = val.trim();
  saveDatabase();
}
window.saveHonorProfileField = saveHonorProfileField;

/* ==========================================================================
   SEMESTER RANKINGS (ចំណាត់ថ្នាក់ប្រចាំឆមាស) - 100% SAMPLE PDF SPEC
   គម្រូផ្លូវការ A4 Portrait តាមឯកសារគម្រូ «ចំណាត់ប្រចាំខែក្នុងឆមាសទី១.pdf»
   ========================================================================== */

function getStudentMonthAvg(currentClass, monthKey, s) {
  if (!currentClass.monthlyScores) currentClass.monthlyScores = {};
  if (!currentClass.monthlyScores[monthKey]) currentClass.monthlyScores[monthKey] = {};
  const isCleared = currentClass.clearedScores && currentClass.clearedScores[monthKey];
  let rec = currentClass.monthlyScores[monthKey][s.num];
  if (!rec) {
    rec = {};
    SCORE_SKILLS.forEach(sk => {
      if (isCleared) {
        rec[sk.key] = 0;
      } else {
        if (sk.group === "khmer") rec[sk.key] = s.scores?.khmer || 7;
        else if (sk.group === "math") rec[sk.key] = s.scores?.math || 7.5;
        else if (sk.key === "science") rec[sk.key] = s.scores?.science || 7;
        else if (sk.key === "social") rec[sk.key] = s.scores?.social || 7;
        else if (sk.key === "pe_home_art") rec[sk.key] = s.scores?.art || 8;
        else if (sk.key === "pe_sport" || sk.key === "pe_health") rec[sk.key] = s.scores?.pe || 8.5;
        else rec[sk.key] = 7;
      }
    });
    currentClass.monthlyScores[monthKey][s.num] = rec;
  }
  let total = 0;
  SCORE_SKILLS.forEach(sk => {
    const v = parseFloat(rec[sk.key]);
    total += isNaN(v) ? 0 : v;
  });
  total = Math.round(total * 10) / 10;
  const avg = total > 0 ? Math.round((total / 16) * 100) / 100 : 0;
  return { total, avg };
}

state.activeSemester = state.activeSemester || "1";
state.semesterCustomMonths = state.semesterCustomMonths || {
  "1": ["ធ្នូ", "មករា", "កុម្ភៈ", "មីនា"],
  "2": ["ឧសភា", "មិថុនា", "កក្កដា", "សីហា"]
};

function changeSemester(semVal) {
  state.activeSemester = String(semVal || "1");
  const semSelect = document.getElementById("semesterSelect");
  if (semSelect) semSelect.value = state.activeSemester;
  renderSemesterRanks();
}
window.changeSemester = changeSemester;

function setSemesterRankViewMode(mode) {
  state.semRankViewMode = mode;
  renderSemesterRanks();
}
window.setSemesterRankViewMode = setSemesterRankViewMode;

function changeSemesterColMonth(colIdx, newMonth) {
  const sem = state.activeSemester || "1";
  state.semesterCustomMonths = state.semesterCustomMonths || {
    "1": ["ធ្នូ", "មករា", "កុម្ភៈ", "មីនា"],
    "2": ["ឧសភា", "មិថុនា", "កក្កដា", "សីហា"]
  };
  state.semesterCustomMonths[sem] = state.semesterCustomMonths[sem] || (sem === "2" ? ["ឧសភា", "មិថុនា", "កក្កដា", "សីហា"] : ["ធ្នូ", "មករា", "កុម្ភៈ", "មីនា"]);
  state.semesterCustomMonths[sem][colIdx] = newMonth;
  renderSemesterRanks();
}
window.changeSemesterColMonth = changeSemesterColMonth;

function saveSemesterRankDate(field, val) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const sem = state.activeSemester || "1";
  currentClass.semesterRankDates = currentClass.semesterRankDates || {};
  currentClass.semesterRankDates[sem] = currentClass.semesterRankDates[sem] || {};
  currentClass.semesterRankDates[sem][field] = val.trim();
  saveDatabase();
}
window.saveSemesterRankDate = saveSemesterRankDate;

function onSemesterRankCellEdit(el, studentNum, field) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const sem = state.activeSemester || "1";
  currentClass.semesterRankEdits = currentClass.semesterRankEdits || { "1": {}, "2": {} };
  currentClass.semesterRankEdits[sem] = currentClass.semesterRankEdits[sem] || {};
  currentClass.semesterRankEdits[sem][studentNum] = currentClass.semesterRankEdits[sem][studentNum] || {};

  const clean = el.innerText.trim();
  const val = parseFloat(clean);
  if (!isNaN(val)) {
    currentClass.semesterRankEdits[sem][studentNum][field] = val;
  } else if (clean === "") {
    delete currentClass.semesterRankEdits[sem][studentNum][field];
  }
  saveDatabase();
  renderSemesterRanks();
}
window.onSemesterRankCellEdit = onSemesterRankCellEdit;

function printSemesterRanks() {
  prepareAdminPrint("semester_ranks");
  window.print();
}
window.printSemesterRanks = printSemesterRanks;

function exportSemesterRanksExcel() {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const sem = state.activeSemester || "1";
  const viewMode = state.semRankViewMode || "dual_table";
  const months = (state.semesterCustomMonths && state.semesterCustomMonths[sem]) || (sem === "2" ? ["ឧសភា", "មិថុនា", "កក្កដា", "សីហា"] : ["ធ្នូ", "មករា", "កុម្ភៈ", "មីនា"]);
  const students = currentClass.students || [];
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";

  if (typeof XLSX === "undefined") {
    alert("សូមរង់ចាំបណ្ណាល័យ XLSX ដំណើរការពេញលេញ");
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsData = [];

  wsData.push(["ព្រះរាជាណាចក្រកម្ពុជា", "", "", "", "", "ជាតិ សាសនា ព្រះមហាក្សត្រ"]);
  wsData.push(["សាលាបឋមសិក្សា បាន្លួង"]);
  wsData.push([getCleanGradeDisplay(currentClass.grade || "ថ្នាក់ទី ៣")]);
  wsData.push([""]);
  wsData.push([`ចំណាត់ថ្នាក់ប្រចាំឆមាសលើកទី ${toKhmerNum(sem)} ឆ្នាំសិក្សា ${academicYear}`]);
  wsData.push([`ឆ្នាំសិក្សា៖ ${academicYear}`, `សិស្សសរុប៖ ${students.length} នាក់`]);
  wsData.push([""]);

  if (viewMode === "dual_table") {
    wsData.push([
      "ល.រ", "គោត្តនាម", "នាម", "ភេទ", "ម.ធ ប្រចាំខែ", "ម.ធ ប្រឡង", "ម.ធ ប្រចាំឆមាស", "ចំណាត់ថ្នាក់", "និទ្ទេស"
    ]);

    const studentRows = students.map((s, idx) => {
      let monthAvg = 0;
      if (currentClass.semesterRankEdits?.[sem]?.[s.num]?.monthAvg !== undefined) {
        monthAvg = currentClass.semesterRankEdits[sem][s.num].monthAvg;
      } else {
        let sum = 0, count = 0;
        months.forEach(m => {
          const res = getStudentMonthAvg(currentClass, m, s);
          if (res.avg > 0) { sum += res.avg; count++; }
        });
        monthAvg = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
      }

      let examAvg = 0;
      if (currentClass.semesterRankEdits?.[sem]?.[s.num]?.examAvg !== undefined) {
        examAvg = currentClass.semesterRankEdits[sem][s.num].examAvg;
      } else {
        const examRes = getStudentSemesterExamScores(currentClass, sem, s);
        examAvg = examRes.avg || 0;
      }

      let semAvg = 0;
      if (currentClass.semesterRankEdits?.[sem]?.[s.num]?.semAvg !== undefined) {
        semAvg = currentClass.semesterRankEdits[sem][s.num].semAvg;
      } else {
        if (monthAvg > 0 && examAvg > 0) {
          semAvg = Math.round(((monthAvg + examAvg) / 2) * 100) / 100;
        } else if (monthAvg > 0) {
          semAvg = monthAvg;
        } else if (examAvg > 0) {
          semAvg = examAvg;
        }
      }

      let ln = s.lastName || "";
      let fn = s.firstName || "";
      if (!ln && !fn && s.fullName) {
        const parts = s.fullName.trim().split(/\s+/);
        ln = parts[0] || "";
        fn = parts.slice(1).join(" ") || "";
      }

      return {
        num: s.num || (idx + 1),
        lName: ln,
        fName: fn,
        gender: s.gender || "ប្រុស",
        monthAvg,
        examAvg,
        semAvg,
        hasScores: semAvg > 0,
        rank: "",
        mention: ""
      };
    });

    const sorted = [...studentRows].sort((a, b) => {
      if (a.hasScores && !b.hasScores) return -1;
      if (!a.hasScores && b.hasScores) return 1;
      if (b.semAvg !== a.semAvg) return b.semAvg - a.semAvg;
      return a.num - b.num;
    });

    let curRank = 1;
    sorted.forEach((item, idx) => {
      if (idx > 0 && item.semAvg < sorted[idx - 1].semAvg) {
        curRank = idx + 1;
      }
      item.rank = item.hasScores ? curRank : "";

      let mention = "";
      if (item.semAvg >= 8.5) mention = "A";
      else if (item.semAvg >= 8.0) mention = "B";
      else if (item.semAvg >= 7.0) mention = "C";
      else if (item.semAvg >= 6.0) mention = "D";
      else if (item.semAvg >= 5.0) mention = "E";
      else if (item.hasScores) mention = "F";
      item.mention = mention;
    });

    sorted.forEach((item, idx) => {
      wsData.push([
        idx + 1,
        item.lName,
        item.fName,
        item.gender,
        item.monthAvg > 0 ? item.monthAvg : "",
        item.examAvg > 0 ? item.examAvg : "",
        item.semAvg > 0 ? item.semAvg : "",
        item.rank,
        item.mention
      ]);
    });
  } else {
    // 4-month breakdown table
    wsData.push([
      "ល.រ", "គោត្តនាម", "នាម", "ភេទ",
      months[0], months[1], months[2], months[3],
      "ម.ប្រចាំខែ", "ចំណាត់ថ្នាក់", "និទ្ទេស"
    ]);

    const studentRows = students.map((s, idx) => {
      const r1 = getStudentMonthAvg(currentClass, months[0], s);
      const r2 = getStudentMonthAvg(currentClass, months[1], s);
      const r3 = getStudentMonthAvg(currentClass, months[2], s);
      const r4 = getStudentMonthAvg(currentClass, months[3], s);

      const m1 = r1.avg, m2 = r2.avg, m3 = r3.avg, m4 = r4.avg;
      const totalValid = (m1 + m2 + m3 + m4);
      const semAvg = totalValid > 0 ? Math.round(((m1 + m2 + m3 + m4) / 4) * 100) / 100 : 0;
      const hasScores = totalValid > 0;

      let ln = s.lastName || "";
      let fn = s.firstName || "";
      if (!ln && !fn && s.fullName) {
        const parts = s.fullName.trim().split(/\s+/);
        ln = parts[0] || "";
        fn = parts.slice(1).join(" ") || "";
      }

      return {
        num: s.num || (idx + 1),
        lName: ln,
        fName: fn,
        gender: s.gender || "ប្រុស",
        m1, m2, m3, m4,
        semAvg,
        hasScores,
        rank: "",
        mention: ""
      };
    });

    const sorted = [...studentRows].sort((a, b) => {
      if (a.hasScores && !b.hasScores) return -1;
      if (!a.hasScores && b.hasScores) return 1;
      if (b.semAvg !== a.semAvg) return b.semAvg - a.semAvg;
      return a.num - b.num;
    });

    let curRank = 1;
    sorted.forEach((item, idx) => {
      if (idx > 0 && item.semAvg < sorted[idx - 1].semAvg) {
        curRank = idx + 1;
      }
      item.rank = item.hasScores ? curRank : "";

      let mention = "";
      if (item.semAvg >= 8.5) mention = "A";
      else if (item.semAvg >= 8.0) mention = "B";
      else if (item.semAvg >= 7.0) mention = "C";
      else if (item.semAvg >= 6.0) mention = "D";
      else if (item.semAvg >= 5.0) mention = "E";
      else if (item.hasScores) mention = "F";
      item.mention = mention;
    });

    sorted.forEach((item, idx) => {
      wsData.push([
        idx + 1,
        item.lName,
        item.fName,
        item.gender,
        item.m1 > 0 ? item.m1 : "",
        item.m2 > 0 ? item.m2 : "",
        item.m3 > 0 ? item.m3 : "",
        item.m4 > 0 ? item.m4 : "",
        item.semAvg > 0 ? item.semAvg : "",
        item.rank,
        item.mention
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, `ឆមាសទី${sem}`);
  XLSX.writeFile(wb, `ចំណាត់ថ្នាក់ប្រចាំឆមាសទី${sem}_${currentClass.grade || "ថ្នាក់"}.xlsx`);
}
window.exportSemesterRanksExcel = exportSemesterRanksExcel;

function renderSemesterRanks() {
  let currentClass = getActiveClass();
  const container = document.getElementById("semesterRanksContentWrap");
  if (!container) return;

  // Fallback to active class with students if current is empty or missing
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    const candidate = (state.db && state.db.classes ? state.db.classes : []).find(
      c => c.academicYear === (state.activeYear || "២០២៦-២០២៧") && c.students && c.students.length > 0
    );
    if (candidate) {
      currentClass = candidate;
      state.activeClassId = candidate.id;
      const classSelects = document.querySelectorAll(".class-select-input");
      classSelects.forEach(sel => sel.value = candidate.id);
    }
  }

  if (!currentClass) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">សូមជ្រើសរើសថ្នាក់រៀន</p>`;
    return;
  }

  const sem = state.activeSemester || "1";
  const semSelect = document.getElementById("semesterSelect");
  if (semSelect) semSelect.value = sem;

  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";
  const students = currentClass.students || [];
  if (students.length === 0) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">មិនទាន់មានទិន្នន័យសិស្សក្នុងថ្នាក់នេះនៅឡើយទេ</p>`;
    return;
  }

  // Update view mode toggle buttons
  const viewMode = state.semRankViewMode || "dual_table";
  const btnDual = document.getElementById("btnSemViewDual");
  const btn4M = document.getElementById("btnSemView4M");
  if (btnDual && btn4M) {
    if (viewMode === "dual_table") {
      btnDual.className = "btn btn-sm btn-primary";
      btn4M.className = "btn btn-sm btn-light";
    } else {
      btnDual.className = "btn btn-sm btn-light";
      btn4M.className = "btn btn-sm btn-primary";
    }
  }

  state.semesterCustomMonths = state.semesterCustomMonths || {
    "1": ["ធ្នូ", "មករា", "កុម្ភៈ", "មីនា"],
    "2": ["ឧសភា", "មិថុនា", "កក្កដា", "សីហា"]
  };
  state.semesterCustomMonths[sem] = state.semesterCustomMonths[sem] || (sem === "2" ? ["ឧសភា", "មិថុនា", "កក្កដា", "សីហា"] : ["ធ្នូ", "មករា", "កុម្ភៈ", "មីនា"]);
  const months = state.semesterCustomMonths[sem];

  // -------------------------------------------------------------
  // VIEW MODE 1: DUAL-COLUMN SIDE-BY-SIDE (100% MINISTRY SAMPLE PDF)
  // -------------------------------------------------------------
  if (viewMode === "dual_table") {
    const studentRows = students.map((s, idx) => {
      // 1. Monthly Average (ម.ធ ប្រចាំខែ)
      let monthAvg = 0;
      if (currentClass.semesterRankEdits?.[sem]?.[s.num]?.monthAvg !== undefined) {
        monthAvg = currentClass.semesterRankEdits[sem][s.num].monthAvg;
      } else {
        let sum = 0, count = 0;
        months.forEach(m => {
          const res = getStudentMonthAvg(currentClass, m, s);
          if (res.avg > 0) { sum += res.avg; count++; }
        });
        monthAvg = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
      }

      // 2. Exam Average (ម.ធ ប្រឡង)
      let examAvg = 0;
      if (currentClass.semesterRankEdits?.[sem]?.[s.num]?.examAvg !== undefined) {
        examAvg = currentClass.semesterRankEdits[sem][s.num].examAvg;
      } else {
        const examRes = getStudentSemesterExamScores(currentClass, sem, s);
        examAvg = examRes.avg || 0;
      }

      // 3. Semester Combined Average (ម.ធ ប្រចាំឆមាស)
      let semAvg = 0;
      if (currentClass.semesterRankEdits?.[sem]?.[s.num]?.semAvg !== undefined) {
        semAvg = currentClass.semesterRankEdits[sem][s.num].semAvg;
      } else {
        if (monthAvg > 0 && examAvg > 0) {
          semAvg = Math.round(((monthAvg + examAvg) / 2) * 100) / 100;
        } else if (monthAvg > 0) {
          semAvg = monthAvg;
        } else if (examAvg > 0) {
          semAvg = examAvg;
        }
      }

      let ln = s.lastName || "";
      let fn = s.firstName || "";
      if (!ln && !fn && s.fullName) {
        const parts = s.fullName.trim().split(/\s+/);
        ln = parts[0] || "";
        fn = parts.slice(1).join(" ") || "";
      } else if (ln && !fn && ln.includes(" ")) {
        const parts = ln.trim().split(/\s+/);
        ln = parts[0] || "";
        fn = parts.slice(1).join(" ") || "";
      } else if (!ln && fn && fn.includes(" ")) {
        const parts = fn.trim().split(/\s+/);
        ln = parts[0] || "";
        fn = parts.slice(1).join(" ") || "";
      }

      return {
        student: s,
        num: s.num || (idx + 1),
        lName: ln,
        fName: fn,
        gender: s.gender || "ប្រុស",
        monthAvg,
        examAvg,
        semAvg,
        hasScores: semAvg > 0,
        rank: "",
        mention: ""
      };
    });

    // Sort descending by semAvg
    const sorted = [...studentRows].sort((a, b) => {
      if (a.hasScores && !b.hasScores) return -1;
      if (!a.hasScores && b.hasScores) return 1;
      if (b.semAvg !== a.semAvg) return b.semAvg - a.semAvg;
      return a.num - b.num;
    });

    let curRank = 1;
    sorted.forEach((item, idx) => {
      if (idx > 0 && item.semAvg < sorted[idx - 1].semAvg) {
        curRank = idx + 1;
      }
      item.rank = item.hasScores ? curRank : "";

      let mention = "";
      if (item.semAvg >= 8.5) mention = "A";
      else if (item.semAvg >= 8.0) mention = "B";
      else if (item.semAvg >= 7.0) mention = "C";
      else if (item.semAvg >= 6.0) mention = "D";
      else if (item.semAvg >= 5.0) mention = "E";
      else if (item.hasScores) mention = "F";
      item.mention = mention;
    });

    // Statistics A, B, C, D, E, F
    const stats = {
      A: { total: 0, female: 0, pct: "0.00" },
      B: { total: 0, female: 0, pct: "0.00" },
      C: { total: 0, female: 0, pct: "0.00" },
      D: { total: 0, female: 0, pct: "0.00" },
      E: { total: 0, female: 0, pct: "0.00" },
      F: { total: 0, female: 0, pct: "0.00" }
    };

    let activeStudentCount = 0;
    studentRows.forEach(item => {
      if (item.hasScores && item.mention && stats[item.mention]) {
        stats[item.mention].total++;
        if (item.gender === "ស្រី") stats[item.mention].female++;
        activeStudentCount++;
      }
    });

    const totalStudents = students.length;
    const femaleCount = students.filter(s => s.gender === "ស្រី").length;
    const baseCount = activeStudentCount > 0 ? activeStudentCount : totalStudents;
    Object.keys(stats).forEach(k => {
      stats[k].pct = baseCount > 0 ? ((stats[k].total / baseCount) * 100).toFixed(2) : "0.00";
    });

    // Saved Dates
    currentClass.semesterRankDates = currentClass.semesterRankDates || {};
    const savedDates = currentClass.semesterRankDates[sem] || {};
    const lunarDirector = savedDates.lunarDirector || "ថ្ងៃ ចន្ទ ៨ រោច ខែ បឋមាសាឍ ឆ្នាំ ថោះ បញ្ចស័ក ព.ស ២៥៦៧";
    const solarDirector = savedDates.solarDirector || "បាន្លួង ថ្ងៃទី ១០ ខែ កក្កដា ឆ្នាំ ២០២៣";
    const lunarTeacher = savedDates.lunarTeacher || "ថ្ងៃ ចន្ទ ៨ រោច ខែ បឋមាសាឍ ឆ្នាំ ថោះ បញ្ចស័ក ព.ស ២៥៦៧";
    const solarTeacher = savedDates.solarTeacher || "បាន្លួង ថ្ងៃទី ១០ ខែ កក្កដា ឆ្នាំ ២០២៣";
    const teacherVal = currentClass.teacher || "ផន ច័ន្ទតារា";

    function pad2(num) {
      return String(num).padStart(2, '0');
    }

    // Exact rows based on actual student count with ZERO spare empty rows
    const rowsPerSide = totalStudents > 0 ? Math.ceil(totalStudents / 2) : 0;

    // Dynamic row height so table rows fill the A4 page nicely
    let rowHeight = 20;
    if (rowsPerSide <= 17) rowHeight = 23;
    else if (rowsPerSide <= 19) rowHeight = 21;
    else if (rowsPerSide <= 21) rowHeight = 19;
    else rowHeight = 18;

    let tableRowsHtml = "";
    for (let i = 0; i < rowsPerSide; i++) {
      const leftStudent = sorted[i];
      const rightIndex = i + rowsPerSide;
      const rightStudent = sorted[rightIndex];
      const leftNum = i + 1;
      const rightNum = rightIndex + 1;

      let leftHtml = "";
      if (leftStudent) {
        leftHtml = `
          <td class="sem-dual-td-num">${leftNum}</td>
          <td class="sem-dual-td-lastname" style="border-right: hidden !important;">${escapeHtml(leftStudent.lName)}</td>
          <td class="sem-dual-td-firstname" style="border-left: hidden !important;">${escapeHtml(leftStudent.fName)}</td>
          <td class="sem-dual-td-gender">${escapeHtml(leftStudent.gender)}</td>
          <td class="sem-dual-td-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែ" onblur="onSemesterRankCellEdit(this, ${leftStudent.student ? leftStudent.student.num : leftStudent.num}, 'monthAvg')">${leftStudent.monthAvg > 0 ? leftStudent.monthAvg.toFixed(2) : ""}</td>
          <td class="sem-dual-td-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែ" onblur="onSemesterRankCellEdit(this, ${leftStudent.student ? leftStudent.student.num : leftStudent.num}, 'examAvg')">${leftStudent.examAvg > 0 ? leftStudent.examAvg.toFixed(2) : ""}</td>
          <td class="sem-dual-td-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែ" onblur="onSemesterRankCellEdit(this, ${leftStudent.student ? leftStudent.student.num : leftStudent.num}, 'semAvg')">${leftStudent.semAvg > 0 ? leftStudent.semAvg.toFixed(2) : ""}</td>
          <td class="sem-dual-td-rank">${leftStudent.rank}</td>
        `;
      } else {
        leftHtml = `
          <td class="sem-dual-td-num"></td>
          <td class="sem-dual-td-lastname" style="border-right: hidden !important;"></td>
          <td class="sem-dual-td-firstname" style="border-left: hidden !important;"></td>
          <td class="sem-dual-td-gender"></td>
          <td class="sem-dual-td-val"></td>
          <td class="sem-dual-td-val"></td>
          <td class="sem-dual-td-val"></td>
          <td class="sem-dual-td-rank"></td>
        `;
      }

      let rightHtml = "";
      if (rightStudent) {
        rightHtml = `
          <td class="sem-dual-td-num">${rightNum}</td>
          <td class="sem-dual-td-lastname" style="border-right: hidden !important;">${escapeHtml(rightStudent.lName)}</td>
          <td class="sem-dual-td-firstname" style="border-left: hidden !important;">${escapeHtml(rightStudent.fName)}</td>
          <td class="sem-dual-td-gender">${escapeHtml(rightStudent.gender)}</td>
          <td class="sem-dual-td-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែ" onblur="onSemesterRankCellEdit(this, ${rightStudent.student ? rightStudent.student.num : rightStudent.num}, 'monthAvg')">${rightStudent.monthAvg > 0 ? rightStudent.monthAvg.toFixed(2) : ""}</td>
          <td class="sem-dual-td-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែ" onblur="onSemesterRankCellEdit(this, ${rightStudent.student ? rightStudent.student.num : rightStudent.num}, 'examAvg')">${rightStudent.examAvg > 0 ? rightStudent.examAvg.toFixed(2) : ""}</td>
          <td class="sem-dual-td-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែ" onblur="onSemesterRankCellEdit(this, ${rightStudent.student ? rightStudent.student.num : rightStudent.num}, 'semAvg')">${rightStudent.semAvg > 0 ? rightStudent.semAvg.toFixed(2) : ""}</td>
          <td class="sem-dual-td-rank">${rightStudent.rank}</td>
        `;
      } else {
        rightHtml = `
          <td class="sem-dual-td-num"></td>
          <td class="sem-dual-td-lastname" style="border-right: hidden !important;"></td>
          <td class="sem-dual-td-firstname" style="border-left: hidden !important;"></td>
          <td class="sem-dual-td-gender"></td>
          <td class="sem-dual-td-val"></td>
          <td class="sem-dual-td-val"></td>
          <td class="sem-dual-td-val"></td>
          <td class="sem-dual-td-rank"></td>
        `;
      }

      tableRowsHtml += `<tr style="height: ${rowHeight}px;">${leftHtml}${rightHtml}</tr>`;
    }

    let dualHtml = `
      <div class="semester-dual-a4-page" id="printableSemesterRanksDualPage">
        <!-- HEADER -->
        <div class="sem-dual-header-wrap">
          <div class="sem-dual-kingdom-center">
            <div class="sem-dual-kingdom-title">ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div class="sem-dual-kingdom-motto">ជាតិ  សាសនា  ព្រះមហាក្សត្រ</div>
            <div class="sem-dual-flourish">
              <img src="flourish.png" alt="Flourish" onerror="this.outerHTML='<span style=\'color:#0000cc; font-size:12px;\'>❖━━━━━━ ❖ ━━━━━━❖</span>'">
            </div>
          </div>

          <div class="sem-dual-school-grade-left">
            <div class="sem-dual-school-name" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែឈ្មោះសាលា" onblur="saveSchoolNameDirect(this.innerText)">${escapeHtml(state.db.schoolInfo?.name || "សាលាបឋមសិក្សា បាន្លួង")}</div>
            <div class="sem-dual-grade-name" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែឈ្មោះថ្នាក់">${getCleanGradeDisplay(currentClass.grade)}</div>
          </div>

          <div class="sem-dual-main-title">ចំណាត់ថ្នាក់ប្រចាំឆមាសលើកទី ${toKhmerNum(sem)} ឆ្នាំសិក្សា ${academicYear}</div>
        </div>

        <!-- TABLE (14 COLUMNS, 19 ROWS) -->
        <table class="sem-dual-table">
          <colgroup>
            <col style="width: 27px;">
            <col style="width: 63px;">
            <col style="width: 83px;">
            <col style="width: 29px;">
            <col style="width: 38px;">
            <col style="width: 38px;">
            <col style="width: 44px;">
            <col style="width: 39px;">

            <col style="width: 27px;">
            <col style="width: 63px;">
            <col style="width: 83px;">
            <col style="width: 29px;">
            <col style="width: 38px;">
            <col style="width: 38px;">
            <col style="width: 44px;">
            <col style="width: 39px;">
          </colgroup>
          <thead>
            <tr style="height: 105px;">
              <th class="sem-dual-th sem-th-blue" style="width: 27px;">ល.រ</th>
              <th class="sem-dual-th sem-th-blue" colspan="2" style="width: 146px;">គោត្តនាម និង នាម</th>
              <th class="sem-dual-th sem-th-blue" style="width: 29px;">ភេទ</th>
              <th class="sem-dual-th-vert sem-th-blue" style="width: 38px;">ម.ធ ប្រចាំខែ</th>
              <th class="sem-dual-th-vert sem-th-blue" style="width: 38px;">ម.ធ ប្រឡង</th>
              <th class="sem-dual-th-vert sem-th-blue" style="width: 44px;">ម.ធ ប្រចាំឆមាស</th>
              <th class="sem-dual-th-vert sem-th-red" style="width: 39px;">ចំណាត់ថ្នាក់</th>

              <th class="sem-dual-th sem-th-blue" style="width: 27px;">ល.រ</th>
              <th class="sem-dual-th sem-th-blue" colspan="2" style="width: 146px;">គោត្តនាម និង នាម</th>
              <th class="sem-dual-th sem-th-blue" style="width: 29px;">ភេទ</th>
              <th class="sem-dual-th-vert sem-th-blue" style="width: 38px;">ម.ធ ប្រចាំខែ</th>
              <th class="sem-dual-th-vert sem-th-blue" style="width: 38px;">ម.ធ ប្រឡង</th>
              <th class="sem-dual-th-vert sem-th-blue" style="width: 44px;">ម.ធ ប្រចាំឆមាស</th>
              <th class="sem-dual-th-vert sem-th-red" style="width: 39px;">ចំណាត់ថ្នាក់</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <!-- FOOTER: END ROSTER + STATS BRACKET + SIGNATURES -->
        <div class="sem-dual-footer-wrap">
          <div class="sem-dual-roster-end">
            បញ្ឈប់បញ្ជីត្រឹមចំនួនសិស្ស <span class="sem-dual-stat-num">${totalStudents}</span> នាក់  ស្រី <span class="sem-dual-stat-num">${pad2(femaleCount)}</span> នាក់
          </div>

          <div class="sem-dual-stats-container">
            <div class="sem-dual-stats-title">សរុបសិស្សបាននិទ្ទេស</div>
            <div class="sem-dual-stats-bracket">
              <svg width="18" height="110" viewBox="0 0 18 110" fill="none" style="stroke: #0000cc; stroke-width: 1.6;">
                <path d="M 16 2 C 8 2, 3 6, 3 14 L 3 48 C 3 53, 0 55, 0 55 C 0 55, 3 57, 3 62 L 3 96 C 3 104, 8 108, 16 108" />
              </svg>
            </div>
            <div class="sem-dual-stats-list">
              <div class="sem-dual-stat-row">
                <span class="stat-grade">និទ្ទេស A</span>
                <span class="stat-have">មាន</span>
                <span class="stat-total">${pad2(stats.A.total)} នាក់</span>
                <span class="stat-female">ស្រី ${pad2(stats.A.female)} នាក់</span>
                <span class="stat-equal">ត្រូវជា</span>
                <span class="stat-pct">${stats.A.pct}%</span>
              </div>
              <div class="sem-dual-stat-row">
                <span class="stat-grade">និទ្ទេស B</span>
                <span class="stat-have">មាន</span>
                <span class="stat-total">${pad2(stats.B.total)} នាក់</span>
                <span class="stat-female">ស្រី ${pad2(stats.B.female)} នាក់</span>
                <span class="stat-equal">ត្រូវជា</span>
                <span class="stat-pct">${stats.B.pct}%</span>
              </div>
              <div class="sem-dual-stat-row">
                <span class="stat-grade">និទ្ទេស C</span>
                <span class="stat-have">មាន</span>
                <span class="stat-total">${pad2(stats.C.total)} នាក់</span>
                <span class="stat-female">ស្រី ${pad2(stats.C.female)} នាក់</span>
                <span class="stat-equal">ត្រូវជា</span>
                <span class="stat-pct">${stats.C.pct}%</span>
              </div>
              <div class="sem-dual-stat-row">
                <span class="stat-grade">និទ្ទេស D</span>
                <span class="stat-have">មាន</span>
                <span class="stat-total">${pad2(stats.D.total)} នាក់</span>
                <span class="stat-female">ស្រី ${pad2(stats.D.female)} នាក់</span>
                <span class="stat-equal">ត្រូវជា</span>
                <span class="stat-pct">${stats.D.pct}%</span>
              </div>
              <div class="sem-dual-stat-row">
                <span class="stat-grade">និទ្ទេស E</span>
                <span class="stat-have">មាន</span>
                <span class="stat-total">${pad2(stats.E.total)} នាក់</span>
                <span class="stat-female">ស្រី ${pad2(stats.E.female)} នាក់</span>
                <span class="stat-equal">ត្រូវជា</span>
                <span class="stat-pct">${stats.E.pct}%</span>
              </div>
              <div class="sem-dual-stat-row">
                <span class="stat-grade">និទ្ទេស F</span>
                <span class="stat-have">មាន</span>
                <span class="stat-total">${pad2(stats.F.total)} នាក់</span>
                <span class="stat-female">ស្រី ${pad2(stats.F.female)} នាក់</span>
                <span class="stat-equal">ត្រូវជា</span>
                <span class="stat-pct">${stats.F.pct}%</span>
              </div>
            </div>
          </div>

          <!-- DUAL SIGNATURES -->
          <div class="sem-dual-signatures-wrap">
            <div class="sem-dual-sig-block">
              <div class="sem-dual-sig-title">បានឃើញ និង ឯកភាព</div>
              <div class="sem-dual-sig-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទ" onblur="saveSemesterRankDate('lunarDirector', this.innerText)">${lunarDirector}</div>
              <div class="sem-dual-sig-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទ" onblur="saveSemesterRankDate('solarDirector', this.innerText)">${solarDirector}</div>
              <div class="sem-dual-sig-role">នាយកសាលា</div>
            </div>

            <div class="sem-dual-sig-block">
              <div class="sem-dual-sig-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទ" onblur="saveSemesterRankDate('lunarTeacher', this.innerText)">${lunarTeacher}</div>
              <div class="sem-dual-sig-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទ" onblur="saveSemesterRankDate('solarTeacher', this.innerText)">${solarTeacher}</div>
              <div class="sem-dual-sig-role">គ្រូប្រចាំថ្នាក់</div>
              <div class="sem-dual-sig-teacher-name" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែឈ្មោះគ្រូ" onblur="saveClassTeacherDirect('${currentClass.id}', this.innerText)">${escapeHtml(teacherVal)}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = dualHtml;
    return;
  }

  // -------------------------------------------------------------
  // VIEW MODE 2: 4-MONTH BREAKDOWN TABLE (HISTORICAL / SECONDARY)
  // -------------------------------------------------------------
  const studentRows = students.map((s, idx) => {
    const r1 = getStudentMonthAvg(currentClass, months[0], s);
    const r2 = getStudentMonthAvg(currentClass, months[1], s);
    const r3 = getStudentMonthAvg(currentClass, months[2], s);
    const r4 = getStudentMonthAvg(currentClass, months[3], s);

    const m1 = r1.avg;
    const m2 = r2.avg;
    const m3 = r3.avg;
    const m4 = r4.avg;

    const totalValid = (m1 + m2 + m3 + m4);
    const semAvg = totalValid > 0 ? Math.round(((m1 + m2 + m3 + m4) / 4) * 100) / 100 : 0;
    const hasScores = totalValid > 0;

    let ln = s.lastName || "";
    let fn = s.firstName || "";
    if (!ln && !fn && s.fullName) {
      const parts = s.fullName.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    } else if (ln && !fn && ln.includes(" ")) {
      const parts = ln.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    } else if (!ln && fn && fn.includes(" ")) {
      const parts = fn.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    }

    return {
      student: s,
      num: s.num || (idx + 1),
      lName: ln,
      fName: fn,
      gender: s.gender || "ប្រុស",
      m1, m2, m3, m4,
      semAvg,
      hasScores,
      rank: "",
      mention: ""
    };
  });

  const sorted = [...studentRows].sort((a, b) => {
    if (a.hasScores && !b.hasScores) return -1;
    if (!a.hasScores && b.hasScores) return 1;
    if (b.semAvg !== a.semAvg) return b.semAvg - a.semAvg;
    return a.num - b.num;
  });

  let curRank = 1;
  sorted.forEach((item, idx) => {
    if (idx > 0 && item.semAvg < sorted[idx - 1].semAvg) {
      curRank = idx + 1;
    }
    item.rank = item.hasScores ? curRank : "";

    let mention = "";
    if (item.semAvg >= 8.5) mention = "A";
    else if (item.semAvg >= 8.0) mention = "B";
    else if (item.semAvg >= 7.0) mention = "C";
    else if (item.semAvg >= 6.0) mention = "D";
    else if (item.semAvg >= 5.0) mention = "E";
    else if (item.hasScores) mention = "F";
    item.mention = mention;
  });

  const PAGE_SIZE_P1 = 25;
  const page1Rows = sorted.slice(0, PAGE_SIZE_P1);
  const page2Rows = sorted.slice(PAGE_SIZE_P1);

  const monthOptions = [
    "វិច្ឆិកា", "ធ្នូ", "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា"
  ];

  function buildMonthTh(colIdx) {
    const curMonth = months[colIdx];
    const opts = monthOptions.map(m => `<option value="${m}" ${m === curMonth ? "selected" : ""}>${m}</option>`).join("");
    return `
      <th style="width: 68px; padding: 2px;">
        <select class="sem-month-select no-print" onchange="changeSemesterColMonth(${colIdx}, this.value)" title="ចុចដើម្បីប្តូរខែ">
          ${opts}
        </select>
        <span class="sem-month-print-text only-print">${curMonth}</span>
      </th>
    `;
  }

  function renderTableHead(includeColGroup = true) {
    return `
      ${includeColGroup ? `
      <colgroup>
        <col style="width: 36px;">
        <col style="width: 76px;">
        <col style="width: 96px;">
        <col style="width: 40px;">
        <col style="width: 68px;">
        <col style="width: 68px;">
        <col style="width: 68px;">
        <col style="width: 68px;">
        <col style="width: 74px;">
        <col style="width: 76px;">
        <col style="width: 50px;">
      </colgroup>
      ` : ''}
      <thead>
        <tr>
          <th style="width: 36px;">ល.រ</th>
          <th colspan="2" class="sem-th-name" style="width: 172px;">គោត្តនាម និង នាម</th>
          <th style="width: 40px;">ភេទ</th>
          ${buildMonthTh(0)}
          ${buildMonthTh(1)}
          ${buildMonthTh(2)}
          ${buildMonthTh(3)}
          <th style="width: 74px;">ម.ប្រចាំខែ</th>
          <th style="width: 76px;">ចំណាត់ថ្នាក់</th>
          <th style="width: 50px;">និទ្ទេស</th>
        </tr>
      </thead>
    `;
  }

  function renderRowHtml(r, idx) {
    return `
      <tr>
        <td class="sem-td-num">${idx !== undefined ? (idx + 1) : r.num}</td>
        <td class="sem-td-lastname border-no-r" style="border-right: hidden !important; border-right-style: hidden !important;">${escapeHtml(r.lName)}</td>
        <td class="sem-td-firstname border-no-l" style="border-left: hidden !important; border-left-style: hidden !important;">${escapeHtml(r.fName)}</td>
        <td class="sem-td-gender">${escapeHtml(r.gender)}</td>
        <td class="sem-td-score">${r.m1 > 0 ? r.m1.toFixed(2) : ""}</td>
        <td class="sem-td-score">${r.m2 > 0 ? r.m2.toFixed(2) : ""}</td>
        <td class="sem-td-score">${r.m3 > 0 ? r.m3.toFixed(2) : ""}</td>
        <td class="sem-td-score">${r.m4 > 0 ? r.m4.toFixed(2) : ""}</td>
        <td class="sem-td-semavg">${r.semAvg > 0 ? r.semAvg.toFixed(2) : ""}</td>
        <td class="sem-td-rank">${r.rank}</td>
        <td class="sem-td-mention">${r.mention}</td>
      </tr>
    `;
  }

  let html = `
    <!-- PAGE 1 (1 - 25) -->
    <div class="semester-a4-page" id="printableSemesterRanksPage1">
      <div class="semester-header-wrap">
        <div class="semester-top-row">
          <div class="semester-school-box">
            <div class="sem-school-name">${escapeHtml(state.db.schoolInfo?.name || "សាលាបឋមសិក្សា បាន្លួង")}</div>
            <div class="sem-grade-name">${getCleanGradeDisplay(currentClass.grade)}</div>
          </div>
          <div class="semester-kingdom-box">
            <div class="sem-kingdom-title">ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div class="sem-kingdom-motto">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
          </div>
        </div>
        <div class="semester-main-title">
          មធ្យមភាគប្រចាំខែទាំងបួនក្នុងឆមាសទី${toKhmerNum(sem)}
        </div>
      </div>

      <table class="semester-table">
        ${renderTableHead(true)}
        <tbody>
          ${page1Rows.map((r, idx) => renderRowHtml(r, idx)).join("")}
        </tbody>
      </table>
    </div>
  `;

  if (page2Rows.length > 0) {
    html += `
      <!-- PAGE 2 (26 - ${students.length}) -->
      <div class="semester-a4-page" id="printableSemesterRanksPage2" style="margin-top: 24px;">
        <table class="semester-table">
          <colgroup>
            <col style="width: 36px;">
            <col style="width: 76px;">
            <col style="width: 96px;">
            <col style="width: 40px;">
            <col style="width: 68px;">
            <col style="width: 68px;">
            <col style="width: 68px;">
            <col style="width: 68px;">
            <col style="width: 74px;">
            <col style="width: 76px;">
            <col style="width: 50px;">
          </colgroup>
          <tbody>
            ${page2Rows.map((r, idx) => renderRowHtml(r, idx + PAGE_SIZE_P1)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  container.innerHTML = html;
}
window.renderSemesterRanks = renderSemesterRanks;


/* ==========================================================================
   SEMESTER SCORES (សម្រង់ពិន្ទុឆមាស) - 100% SAMPLE PDF SPEC
   គម្រូផ្លូវការ A4 Portrait តាមឯកសារគម្រូ «សម្រង់ពិន្ទុឆមាសទី១.pdf»
   ========================================================================== */

const SEMESTER_EXAM_SUBJECTS = [
  { key: "kh_read",       name: "អំណាន" },
  { key: "kh_dictation",  name: "តាមអាន" },
  { key: "kh_essay",      name: "តែងសេចក្ដី" },
  { key: "math",          name: "គណិត" },
  { key: "science",       name: "វិទ្យាសាស្ត្រ" },
  { key: "moral",         name: "សីលធម៌" },
  { key: "geography",     name: "ភូមិ" },
  { key: "history",       name: "ប្រវត្តិ" },
  { key: "drawing",       name: "គំនូរ" },
  { key: "sport",         name: "កីឡា" },
  { key: "craft",         name: "ហត្ថកម្ម" },
  { key: "lifeskills",    name: "បំណិនជីវិត" }
];

function getStudentSemesterExamScores(currentClass, sem, s) {
  currentClass.semesterScores = currentClass.semesterScores || { "1": {}, "2": {} };
  currentClass.semesterScores[sem] = currentClass.semesterScores[sem] || {};
  const isCleared = currentClass.clearedSemesterScores && currentClass.clearedSemesterScores[sem];
  let rec = currentClass.semesterScores[sem][s.num];
  if (!rec) {
    rec = {};
    SEMESTER_EXAM_SUBJECTS.forEach(sub => {
      if (isCleared) {
        rec[sub.key] = 0;
      } else {
        if (sub.key === "kh_read" || sub.key === "kh_dictation") rec[sub.key] = s.scores?.khmer || 7.5;
        else if (sub.key === "kh_essay") rec[sub.key] = s.scores?.khmer ? Math.max(5, Math.round((s.scores.khmer - 0.5) * 10) / 10) : 7.0;
        else if (sub.key === "math") rec[sub.key] = s.scores?.math || 8.0;
        else if (sub.key === "science") rec[sub.key] = s.scores?.science || 7.5;
        else if (sub.key === "moral") rec[sub.key] = s.scores?.social || 8.0;
        else if (sub.key === "geography" || sub.key === "history") rec[sub.key] = s.scores?.social || 7.5;
        else if (sub.key === "drawing") rec[sub.key] = s.scores?.art || 8.5;
        else if (sub.key === "sport") rec[sub.key] = s.scores?.pe || 9.0;
        else if (sub.key === "craft") rec[sub.key] = s.scores?.art || 8.0;
        else if (sub.key === "lifeskills") rec[sub.key] = 8.0;
        else rec[sub.key] = 7.5;
      }
    });
    currentClass.semesterScores[sem][s.num] = rec;
  }

  let total = 0;
  SEMESTER_EXAM_SUBJECTS.forEach(sub => {
    const v = parseFloat(rec[sub.key]);
    total += isNaN(v) ? 0 : v;
  });
  total = Math.round(total * 10) / 10;
  const avg = total > 0 ? Math.round((total / 12) * 100) / 100 : 0;
  return { rec, total, avg };
}

state.activeSemesterScore = state.activeSemesterScore || "1";

function changeSemesterScore(semVal) {
  state.activeSemesterScore = String(semVal || "1");
  const sel = document.getElementById("semesterScoreSelect");
  if (sel) sel.value = state.activeSemesterScore;
  renderSemesterScores();
}
window.changeSemesterScore = changeSemesterScore;

function onSemesterScoreCellEdit(tdEl, studentNum, subjKey) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const sem = state.activeSemesterScore || "1";
  currentClass.semesterScores = currentClass.semesterScores || { "1": {}, "2": {} };
  currentClass.semesterScores[sem] = currentClass.semesterScores[sem] || {};
  currentClass.semesterScores[sem][studentNum] = currentClass.semesterScores[sem][studentNum] || {};

  let val = parseFloat(tdEl.innerText.trim());
  if (isNaN(val) || val < 0) val = 0;
  if (val > 10) val = 10;
  currentClass.semesterScores[sem][studentNum][subjKey] = val;
  saveDatabase();
  renderSemesterScores();
}
window.onSemesterScoreCellEdit = onSemesterScoreCellEdit;

function saveSemesterScoreDate(field, val) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const sem = state.activeSemesterScore || "1";
  currentClass.semesterScoreDates = currentClass.semesterScoreDates || {};
  currentClass.semesterScoreDates[sem] = currentClass.semesterScoreDates[sem] || {};
  currentClass.semesterScoreDates[sem][field] = val.trim();
  saveDatabase();
}
window.saveSemesterScoreDate = saveSemesterScoreDate;

function printSemesterScores() {
  prepareAdminPrint("semester_scores");
  window.print();
}
window.printSemesterScores = printSemesterScores;

function exportSemesterScoresExcel() {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const sem = state.activeSemesterScore || "1";
  const students = currentClass.students || [];
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";

  if (typeof XLSX === "undefined") {
    alert("សូមរង់ចាំបណ្ណាល័យ XLSX ដំណើរការពេញលេញ");
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsData = [];

  wsData.push(["ព្រះរាជាណាចក្រកម្ពុជា", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "ជាតិ សាសនា ព្រះមហាក្សត្រ"]);
  wsData.push(["សាលាបឋមសិក្សា បាន្លួង"]);
  wsData.push([getCleanGradeDisplay(currentClass.grade || "ថ្នាក់ទី ៣")]);
  wsData.push([""]);
  wsData.push([`សម្រង់ពិន្ទុប្រឡងឆមាសលើកទី ${toKhmerNum(sem)}`]);
  wsData.push([`ឆ្នាំសិក្សា ${academicYear}`]);
  wsData.push([`សិស្សសរុប៖ ${students.length} នាក់`]);
  wsData.push([""]);

  const headerRow = [
    "ល.រ", "គោត្តនាម", "នាម", "ភេទ",
    ...SEMESTER_EXAM_SUBJECTS.map(s => s.name),
    "ពិន្ទុ", "មធ្យមភាគ", "ចំ.ថ្នាក់", "និទ្ទេស"
  ];
  wsData.push(headerRow);

  const studentRows = students.map((s, idx) => {
    const { rec, total, avg } = getStudentSemesterExamScores(currentClass, sem, s);
    let ln = s.lastName || "";
    let fn = s.firstName || "";
    if (!ln && !fn && s.fullName) {
      const parts = s.fullName.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    } else if (ln && !fn && ln.includes(" ")) {
      const parts = ln.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    } else if (!ln && fn && fn.includes(" ")) {
      const parts = fn.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    }

    return {
      student: s,
      num: s.num || (idx + 1),
      lName: ln,
      fName: fn,
      gender: s.gender || "ប្រុស",
      rec: rec,
      total: total,
      avg: avg,
      hasScores: total > 0,
      rank: "",
      mention: ""
    };
  });

  const sorted = [...studentRows].sort((a, b) => {
    if (a.hasScores && !b.hasScores) return -1;
    if (!a.hasScores && b.hasScores) return 1;
    if (b.avg !== a.avg) return b.avg - a.avg;
    return a.num - b.num;
  });

  let curRank = 1;
  sorted.forEach((item, idx) => {
    if (idx > 0 && item.avg < sorted[idx - 1].avg) {
      curRank = idx + 1;
    }
    item.rank = item.hasScores ? curRank : "";

    let mention = "";
    if (item.avg >= 8.5) mention = "A";
    else if (item.avg >= 8.0) mention = "B";
    else if (item.avg >= 7.0) mention = "C";
    else if (item.avg >= 6.0) mention = "D";
    else if (item.avg >= 5.0) mention = "E";
    else if (item.hasScores) mention = "F";
    item.mention = mention;
  });

  studentRows.forEach((item) => {
    const row = [
      item.num,
      item.lName,
      item.fName,
      item.gender
    ];
    SEMESTER_EXAM_SUBJECTS.forEach(sub => {
      const v = item.rec[sub.key];
      row.push(v !== undefined && v > 0 ? v : "");
    });
    row.push(item.total > 0 ? item.total : "");
    row.push(item.total > 0 ? item.avg.toFixed(2) : "");
    row.push(item.rank);
    row.push(item.mention);
    wsData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, `ឆមាសលើកទី${sem}`);
  XLSX.writeFile(wb, `សម្រង់ពិន្ទុប្រឡងឆមាសលើកទី${sem}_${currentClass.grade || "ថ្នាក់"}.xlsx`);
}
window.exportSemesterScoresExcel = exportSemesterScoresExcel;

function renderSemesterScores() {
  let currentClass = getActiveClass();
  const container = document.getElementById("semesterScoresContentWrap");
  if (!container) return;

  // Fallback to active class with students if current is empty or missing
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    const candidate = (state.db && state.db.classes ? state.db.classes : []).find(
      c => c.academicYear === (state.activeYear || "២០២៦-២០២៧") && c.students && c.students.length > 0
    );
    if (candidate) {
      currentClass = candidate;
      state.activeClassId = candidate.id;
      const classSelects = document.querySelectorAll(".class-select-input");
      classSelects.forEach(sel => sel.value = candidate.id);
    }
  }

  if (!currentClass) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">សូមជ្រើសរើសថ្នាក់រៀន</p>`;
    return;
  }

  const sem = state.activeSemesterScore || "1";
  const semSelect = document.getElementById("semesterScoreSelect");
  if (semSelect) semSelect.value = sem;

  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";
  const students = currentClass.students || [];
  if (students.length === 0) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">មិនទាន់មានទិន្នន័យសិស្សក្នុងថ្នាក់នេះនៅឡើយទេ</p>`;
    return;
  }

  const totalStudents = students.length;
  const femaleCount = students.filter(s => s.gender === "ស្រី").length;

  // Precompute scores and ranks
  const studentRows = students.map((s, idx) => {
    const { rec, total, avg } = getStudentSemesterExamScores(currentClass, sem, s);
    let ln = s.lastName || "";
    let fn = s.firstName || "";
    if (!ln && !fn && s.fullName) {
      const parts = s.fullName.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    } else if (ln && !fn && ln.includes(" ")) {
      const parts = ln.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    } else if (!ln && fn && fn.includes(" ")) {
      const parts = fn.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    }

    return {
      student: s,
      num: s.num || (idx + 1),
      lName: ln,
      fName: fn,
      gender: s.gender || "ប្រុស",
      rec: rec,
      total: total,
      avg: avg,
      hasScores: total > 0,
      rank: "",
      mention: ""
    };
  });

  // Assign ranks based on avg descending
  const sorted = [...studentRows].sort((a, b) => {
    if (a.hasScores && !b.hasScores) return -1;
    if (!a.hasScores && b.hasScores) return 1;
    if (b.avg !== a.avg) return b.avg - a.avg;
    return a.num - b.num;
  });

  let curRank = 1;
  sorted.forEach((item, idx) => {
    if (idx > 0 && item.avg < sorted[idx - 1].avg) {
      curRank = idx + 1;
    }
    item.rank = item.hasScores ? curRank : "";

    let mention = "";
    if (item.avg >= 8.5) mention = "A";
    else if (item.avg >= 8.0) mention = "B";
    else if (item.avg >= 7.0) mention = "C";
    else if (item.avg >= 6.0) mention = "D";
    else if (item.avg >= 5.0) mention = "E";
    else if (item.hasScores) mention = "F";
    item.mention = mention;
  });

  // Statistics for A, B, C, D, E, F
  const stats = {
    A: { total: 0, female: 0, pct: "0.00" },
    B: { total: 0, female: 0, pct: "0.00" },
    C: { total: 0, female: 0, pct: "0.00" },
    D: { total: 0, female: 0, pct: "0.00" },
    E: { total: 0, female: 0, pct: "0.00" },
    F: { total: 0, female: 0, pct: "0.00" }
  };

  let activeStudentCount = 0;
  studentRows.forEach(item => {
    if (item.hasScores && item.mention && stats[item.mention]) {
      stats[item.mention].total++;
      if (item.gender === "ស្រី") stats[item.mention].female++;
      activeStudentCount++;
    }
  });

  const baseCount = activeStudentCount > 0 ? activeStudentCount : totalStudents;
  Object.keys(stats).forEach(k => {
    stats[k].pct = baseCount > 0 ? ((stats[k].total / baseCount) * 100).toFixed(2) : "0.00";
  });

  // Dates and Signatures
  currentClass.semesterScoreDates = currentClass.semesterScoreDates || {};
  const savedDates = currentClass.semesterScoreDates[sem] || {};
  const lunarDirector = savedDates.lunarDirector || "ថ្ងៃ ចន្ទ ៨ រោច ខែ បឋមាសាឍ ឆ្នាំ ថោះ បញ្ចស័ក ព.ស ២៥៦៧";
  const solarDirector = savedDates.solarDirector || "បាន្លួង ថ្ងៃទី ១០ ខែ កក្កដា ឆ្នាំ ២០២៣";
  const lunarTeacher = savedDates.lunarTeacher || "ថ្ងៃ ចន្ទ ៨ រោច ខែ បឋមាសាឍ ឆ្នាំ ថោះ បញ្ចស័ក ព.ស ២៥៦៧";
  const solarTeacher = savedDates.solarTeacher || "បាន្លួង ថ្ងៃទី ១០ ខែ កក្កដា ឆ្នាំ ២០២៣";
  const teacherVal = currentClass.teacher || "ផន ច័ន្ទតារា";

  // Split into pages matching PDF: Page 1 holds up to 27 rows, Page 2 holds 28..N
  const PAGE_SIZE_P1 = 27;
  const page1Rows = studentRows.slice(0, PAGE_SIZE_P1);
  const page2Rows = studentRows.slice(PAGE_SIZE_P1);

  function renderTableColGroup() {
    return `
      <colgroup>
        <col style="width: 30px;">
        <col style="width: 66px;">
        <col style="width: 88px;">
        <col style="width: 30px;">
        <col style="width: 29px;">
        <col style="width: 29px;">
        <col style="width: 29px;">
        <col style="width: 29px;">
        <col style="width: 29px;">
        <col style="width: 29px;">
        <col style="width: 29px;">
        <col style="width: 29px;">
        <col style="width: 29px;">
        <col style="width: 29px;">
        <col style="width: 29px;">
        <col style="width: 29px;">
        <col style="width: 40px;">
        <col style="width: 48px;">
        <col style="width: 36px;">
        <col style="width: 36px;">
      </colgroup>
    `;
  }

  function renderTableHead() {
    return `
      ${renderTableColGroup()}
      <thead>
        <tr>
          <th class="th-h" style="width: 30px;">ល.រ</th>
          <th class="th-h" colspan="2" style="width: 154px;">គោត្តនាម និង នាម</th>
          <th class="th-h" style="width: 30px;">ភេទ</th>
          <th class="th-v" style="width: 29px;"><span class="th-v-text">អំណាន</span></th>
          <th class="th-v" style="width: 29px;"><span class="th-v-text">តាមអាន</span></th>
          <th class="th-v" style="width: 29px;"><span class="th-v-text">តែងសេចក្ដី</span></th>
          <th class="th-v" style="width: 29px;"><span class="th-v-text">គណិត</span></th>
          <th class="th-v" style="width: 29px;"><span class="th-v-text">វិទ្យាសាស្ត្រ</span></th>
          <th class="th-v" style="width: 29px;"><span class="th-v-text">សីលធម៌</span></th>
          <th class="th-v" style="width: 29px;"><span class="th-v-text">ភូមិ</span></th>
          <th class="th-v" style="width: 29px;"><span class="th-v-text">ប្រវត្តិ</span></th>
          <th class="th-v" style="width: 29px;"><span class="th-v-text">គំនូរ</span></th>
          <th class="th-v" style="width: 29px;"><span class="th-v-text">កីឡា</span></th>
          <th class="th-v" style="width: 29px;"><span class="th-v-text">ហត្ថកម្ម</span></th>
          <th class="th-v" style="width: 29px;"><span class="th-v-text">បំណិនជីវិត</span></th>
          <th class="th-v" style="width: 40px;"><span class="th-v-text">ពិន្ទុ</span></th>
          <th class="th-v" style="width: 48px;"><span class="th-v-text">មធ្យមភាគ</span></th>
          <th class="th-v" style="width: 36px;"><span class="th-v-text">ចំ.ថ្នាក់</span></th>
          <th class="th-v" style="width: 36px;"><span class="th-v-text">និទ្ទេស</span></th>
        </tr>
      </thead>
    `;
  }

  function renderRowHtml(r) {
    const skillCells = SEMESTER_EXAM_SUBJECTS.map(sub => {
      const v = r.rec[sub.key] !== undefined ? r.rec[sub.key] : 0;
      return `<td class="sem-score-td-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែពិន្ទុ" onblur="onSemesterScoreCellEdit(this, ${r.num}, '${sub.key}')" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">${v > 0 ? v : ""}</td>`;
    }).join("");

    return `
      <tr>
        <td class="sem-score-td-num">${r.num}</td>
        <td class="sem-score-td-lastname border-no-r" style="border-right: hidden !important; text-align: left; padding-left: 5px; padding-right: 1px;">${escapeHtml(r.lName)}</td>
        <td class="sem-score-td-firstname border-no-l" style="border-left: hidden !important; text-align: left; padding-left: 1px; padding-right: 3px;">${escapeHtml(r.fName)}</td>
        <td class="sem-score-td-gender">${escapeHtml(r.gender)}</td>
        ${skillCells}
        <td class="sem-score-td-total">${r.total > 0 ? r.total : ""}</td>
        <td class="sem-score-td-avg">${r.total > 0 ? r.avg.toFixed(2) : ""}</td>
        <td class="sem-score-td-rank">${r.rank}</td>
        <td class="sem-score-td-mention">${r.mention}</td>
      </tr>
    `;
  }

  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  let html = `
    <!-- PAGE 1 (1 - 27) -->
    <div class="semester-score-a4-page" id="printableSemesterScoresPage1">
      <div class="sem-score-header-wrap">
        <div class="sem-score-top-row">
          <div class="movable-approval-block sem-score-movable-school" id="movableSemesterSchoolBlock" title="ចុចអូសដើម្បីផ្លាស់ទី ឬពង្រីក-បង្រួមតាមចិត្ត (Drag to move or resize)">
            <div class="approval-drag-handle no-print" title="ចុចអូសដើម្បីផ្លាស់ទី (Drag to move)">
              <i class="fa-solid fa-arrows-up-down-left-right"></i>
            </div>
            <div class="approval-action-toolbar no-print">
              <button type="button" class="btn-approval-action" onclick="changeApprovalFontSize(1, 'semesterSchool')" title="ពង្រីកទំហំអក្សរ"><i class="fa-solid fa-plus"></i></button>
              <span class="approval-size-badge" id="approvalSizeBadgeSemesterSchool">13pt</span>
              <button type="button" class="btn-approval-action" onclick="changeApprovalFontSize(-1, 'semesterSchool')" title="បង្រួមទំហំអក្សរ"><i class="fa-solid fa-minus"></i></button>
              <button type="button" class="btn-approval-action" onclick="changeApprovalWidth(20, 'semesterSchool')" title="ពង្រីកទទឹងឆ្វេង-ស្ដាំ"><i class="fa-solid fa-arrows-left-right"></i>+</button>
              <button type="button" class="btn-approval-action" onclick="changeApprovalWidth(-20, 'semesterSchool')" title="បង្រួមទទឹងឆ្វេង-ស្ដាំ"><i class="fa-solid fa-arrows-left-right"></i>-</button>
              <button type="button" class="btn-approval-action" onclick="resetApprovalTransform('semesterSchool')" title="កំណត់ទីតាំង និងទំហំដើម (Reset)"><i class="fa-solid fa-rotate-left"></i></button>
            </div>
            <div class="approval-content-box sem-score-school-box">
              <div class="sem-score-school-name" contenteditable="true" spellcheck="false" title="ចុចត្រង់នេះដើម្បីកែសម្រួលឈ្មោះសាលា" onblur="saveSchoolNameDirect(this.innerText)">${escapeHtml(state.db.schoolInfo?.name || "សាលាបឋមសិក្សា បាន្លួង")}</div>
              <div class="sem-score-grade-name" contenteditable="true" spellcheck="false" title="ចុចត្រង់នេះដើម្បីកែសម្រួលឈ្មោះថ្នាក់">${getCleanGradeDisplay(currentClass.grade)}</div>
            </div>
            <div class="approval-resize-handle no-print" title="ចុចអូសដើម្បីពង្រីក-បង្រួម (Drag to resize)">
              <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
            </div>
          </div>
          <div class="sem-score-kingdom-box">
            <div class="sem-score-kingdom-title">ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div class="sem-score-kingdom-motto">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
          </div>
        </div>
        <div class="sem-score-main-title">
          សម្រង់ពិន្ទុប្រឡងឆមាសលើកទី ${toKhmerNum(sem)}
        </div>
        <div class="sem-score-year-title">
          ឆ្នាំសិក្សា ${academicYear}
        </div>
      </div>

      <table class="sem-score-table">
        ${renderTableHead()}
        <tbody>
          ${page1Rows.map((r, idx) => renderRowHtml(r, idx)).join("")}
        </tbody>
      </table>
    </div>
  `;

  // PAGE 2 (28 - N) + Summary & Signatures
  html += `
    <!-- PAGE 2 (28 - ${students.length}) + Statistics & Signatures -->
    <div class="semester-score-a4-page" id="printableSemesterScoresPage2" style="margin-top: 24px;">
      ${page2Rows.length > 0 ? `
      <table class="sem-score-table">
        ${renderTableHead()}
        <tbody>
          ${page2Rows.map((r, idx) => renderRowHtml(r, idx + PAGE_SIZE_P1)).join("")}
        </tbody>
      </table>
      ` : ''}

      <!-- End of Roster line -->
      <div class="sem-score-roster-end">
        បញ្ឈប់បញ្ជីត្រឹមចំនួនសិស្សសរុប <span class="sem-score-stat-num">${totalStudents}</span> នាក់  ស្រី <span class="sem-score-stat-num">${pad2(femaleCount)}</span> នាក់
      </div>

      <!-- Statistics with Official Bracket -->
      <div class="sem-score-footer-container">
        <div class="sem-score-stats-wrapper">
          <div class="sem-score-summary-label">សរុបសិស្សបាននិទ្ទេស</div>
          <div class="sem-score-bracket-svg">
            <svg width="18" height="110" viewBox="0 0 18 110" fill="none" style="stroke: #0000cc; stroke-width: 1.6;">
              <path d="M 16 2 C 8 2, 3 6, 3 14 L 3 48 C 3 53, 0 55, 0 55 C 0 55, 3 57, 3 62 L 3 96 C 3 104, 8 108, 16 108" />
            </svg>
          </div>
          <div class="sem-score-grades-list">
            <div class="sem-score-grade-row">
              <span class="sem-score-grade-name">និទ្ទេស A</span>
              <span class="sem-score-grade-lbl">មាន</span>
              <span class="sem-score-grade-val">${pad2(stats.A.total)} នាក់</span>
              <span class="sem-score-grade-lbl">ស្រី</span>
              <span class="sem-score-grade-val">${pad2(stats.A.female)} នាក់</span>
              <span class="sem-score-grade-lbl">ត្រូវជា</span>
              <span class="sem-score-grade-pct">${stats.A.pct}%</span>
            </div>
            <div class="sem-score-grade-row">
              <span class="sem-score-grade-name">និទ្ទេស B</span>
              <span class="sem-score-grade-lbl">មាន</span>
              <span class="sem-score-grade-val">${pad2(stats.B.total)} នាក់</span>
              <span class="sem-score-grade-lbl">ស្រី</span>
              <span class="sem-score-grade-val">${pad2(stats.B.female)} នាក់</span>
              <span class="sem-score-grade-lbl">ត្រូវជា</span>
              <span class="sem-score-grade-pct">${stats.B.pct}%</span>
            </div>
            <div class="sem-score-grade-row">
              <span class="sem-score-grade-name">និទ្ទេស C</span>
              <span class="sem-score-grade-lbl">មាន</span>
              <span class="sem-score-grade-val">${pad2(stats.C.total)} នាក់</span>
              <span class="sem-score-grade-lbl">ស្រី</span>
              <span class="sem-score-grade-val">${pad2(stats.C.female)} នាក់</span>
              <span class="sem-score-grade-lbl">ត្រូវជា</span>
              <span class="sem-score-grade-pct">${stats.C.pct}%</span>
            </div>
            <div class="sem-score-grade-row">
              <span class="sem-score-grade-name">និទ្ទេស D</span>
              <span class="sem-score-grade-lbl">មាន</span>
              <span class="sem-score-grade-val">${pad2(stats.D.total)} នាក់</span>
              <span class="sem-score-grade-lbl">ស្រី</span>
              <span class="sem-score-grade-val">${pad2(stats.D.female)} នាក់</span>
              <span class="sem-score-grade-lbl">ត្រូវជា</span>
              <span class="sem-score-grade-pct">${stats.D.pct}%</span>
            </div>
            <div class="sem-score-grade-row">
              <span class="sem-score-grade-name">និទ្ទេស E</span>
              <span class="sem-score-grade-lbl">មាន</span>
              <span class="sem-score-grade-val">${pad2(stats.E.total)} នាក់</span>
              <span class="sem-score-grade-lbl">ស្រី</span>
              <span class="sem-score-grade-val">${pad2(stats.E.female)} នាក់</span>
              <span class="sem-score-grade-lbl">ត្រូវជា</span>
              <span class="sem-score-grade-pct">${stats.E.pct}%</span>
            </div>
            <div class="sem-score-grade-row">
              <span class="sem-score-grade-name">និទ្ទេស F</span>
              <span class="sem-score-grade-lbl">មាន</span>
              <span class="sem-score-grade-val">${pad2(stats.F.total)} នាក់</span>
              <span class="sem-score-grade-lbl">ស្រី</span>
              <span class="sem-score-grade-val">${pad2(stats.F.female)} នាក់</span>
              <span class="sem-score-grade-lbl">ត្រូវជា</span>
              <span class="sem-score-grade-pct">${stats.F.pct}%</span>
            </div>
          </div>
        </div>

        <!-- Dual Signatures (Director & Teacher) -->
        <div class="sem-score-signatures-wrap">
          <div class="sem-score-sig-block text-center">
            <div class="sem-score-sig-title">បានឃើញ និង ឯកភាព</div>
            <div class="sem-score-sig-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទ" onblur="saveSemesterScoreDate('lunarDirector', this.innerText)">${lunarDirector}</div>
            <div class="sem-score-sig-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទ" onblur="saveSemesterScoreDate('solarDirector', this.innerText)">${solarDirector}</div>
            <div class="sem-score-sig-role">នាយកសាលា</div>
          </div>

          <div class="sem-score-sig-block text-center">
            <div class="sem-score-sig-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទ" onblur="saveSemesterScoreDate('lunarTeacher', this.innerText)">${lunarTeacher}</div>
            <div class="sem-score-sig-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទ" onblur="saveSemesterScoreDate('solarTeacher', this.innerText)">${solarTeacher}</div>
            <div class="sem-score-sig-role">គ្រូប្រចាំថ្នាក់</div>
            <div class="sem-score-sig-name" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែឈ្មោះគ្រូ" onblur="saveClassTeacherDirect('${currentClass.id}', this.innerText)">${escapeHtml(teacherVal)}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  initMovableApproval('movableSemesterSchoolBlock', 'semesterSchool');
}
window.renderSemesterScores = renderSemesterScores;

function saveSchoolNameDirect(text) {
  state.db = state.db || {};
  state.db.schoolInfo = state.db.schoolInfo || {};
  const clean = (text || "").trim();
  if (clean) {
    state.db.schoolInfo.name = clean;
    saveDatabase();
    if (typeof showToast === 'function') {
      showToast("✓ បានរក្សាទុកឈ្មោះសាលារៀនដោយជោគជ័យ!", "success");
    }
  }
}
window.saveSchoolNameDirect = saveSchoolNameDirect;

function renderSummaryScoresView(currentClass, container) {
  const students = [...(currentClass.students || [])];
  students.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
      <div>
        <h3 style="font-size: 16px; font-weight: 700; color: var(--primary);">
          តារាងពិន្ទុ និងចំណាត់ថ្នាក់សិស្ស៖ ${currentClass.grade} (សម័យប្រឡង៖ ${state.activeScorePeriod})
        </h3>
        <p style="font-size: 12px; color: #64748b;">ឆ្នាំសិក្សា៖ <strong>${currentClass.academicYear}</strong> | គ្រូប្រចាំថ្នាក់៖ <strong>${currentClass.teacher}</strong></p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-sm btn-accent" onclick="openHonorRollModal()">
          <i class="fa fa-trophy"></i> តារាងកិត្តិយស (Top 5)
        </button>
        <button class="btn btn-sm btn-primary" onclick="window.print()">
          <i class="fa fa-print"></i> បោះពុម្ពតារាងពិន្ទុ
        </button>
      </div>
    </div>

    <div style="overflow-x: auto;">
      <table class="official-table" style="font-size: 12px;">
        <thead>
          <tr>
            <th rowspan="2" style="width: 35px;">ចំណាត់ថ្នាក់</th>
            <th rowspan="2" style="width: 35px;">ល.រ</th>
            <th rowspan="2" style="width: 60px;">អត្តលេខ</th>
            <th rowspan="2">គោត្តនាម និង នាម</th>
            <th rowspan="2" style="width: 45px;">ភេទ</th>
            <th colspan="6">ពិន្ទុតាមមុខវិជ្ជា (០ ដល់ ១០)</th>
            <th rowspan="2" style="width: 55px; background: #fef3c7;">ពិន្ទុសរុប</th>
            <th rowspan="2" style="width: 55px; background: #e0f2fe;">មធ្យមភាគ</th>
            <th rowspan="2" style="width: 75px;">និទ្ទេស</th>
            <th rowspan="2" style="width: 50px;">លទ្ធផល</th>
            <th rowspan="2" class="action-col no-print" style="width: 80px;">សកម្មភាព</th>
          </tr>
          <tr>
            <th class="sub-th" style="width: 50px;">ខ្មែរ</th>
            <th class="sub-th" style="width: 50px;">គណិត</th>
            <th class="sub-th" style="width: 50px;">វិទ្យា</th>
            <th class="sub-th" style="width: 50px;">សង្គម</th>
            <th class="sub-th" style="width: 50px;">កីឡា</th>
            <th class="sub-th" style="width: 50px;">សិល្បៈ</th>
          </tr>
        </thead>
        <tbody>
  `;

  students.forEach((s, idx) => {
    const rank = idx + 1;
    s.rank = rank;
    const rankClass = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : (rank === 3 ? 'rank-3' : 'rank-normal'));
    const sc = s.scores || { khmer: 0, math: 0, science: 0, social: 0, pe: 0, art: 0 };

    let mentionClass = "mention-good";
    if (s.avgScore >= 8.5) mentionClass = "mention-excellent";
    else if (s.avgScore >= 7.5) mentionClass = "mention-verygood";
    else if (s.avgScore >= 6.5) mentionClass = "mention-good";
    else if (s.avgScore >= 5.0) mentionClass = "mention-average";
    else mentionClass = "mention-weak";

    html += `
      <tr>
        <td><span class="rank-badge ${rankClass}">${rank}</span></td>
        <td>${s.num}</td>
        <td style="font-weight: 600; color: #1e3a8a;">${s.studentId || "-"}</td>
        <td class="text-left" style="font-weight: 600;">${s.fullName}</td>
        <td>${s.gender === "ស្រី" ? '<span class="gender-badge female">ស្រី</span>' : '<span class="gender-badge male">ប្រុស</span>'}</td>
        <td>${sc.khmer}</td>
        <td>${sc.math}</td>
        <td>${sc.science}</td>
        <td>${sc.social}</td>
        <td>${sc.pe}</td>
        <td>${sc.art}</td>
        <td style="font-weight: 700; color: #b45309;">${s.totalScore}</td>
        <td style="font-weight: 700; color: #1d4ed8;">${s.avgScore}</td>
        <td><span class="score-badge ${mentionClass}">${s.mention}</span></td>
        <td style="font-weight: 700; color: ${s.result === 'ជាប់' ? '#16a34a' : '#dc2626'};">${s.result}</td>
        <td class="action-col no-print">
          <button class="btn btn-sm btn-secondary" onclick="openStudentReportCard(${s.num})" title="ព្រឹត្តិបត្រពិន្ទុផ្ទាល់ខ្លួន">
            <i class="fa fa-id-card"></i> ប័ណ្ណ
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
  initMovableApproval('movableApprovalBlockMonthly', 'monthly');
}

function openStudentReportCard(num) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const s = currentClass.students.find(st => st.num === num);
  if (!s) return;

  const modal = document.getElementById("reportCardModalOverlay");
  const body = document.getElementById("reportCardModalBody");
  if (!modal || !body) return;

  const sc = s.scores || { khmer: 0, math: 0, science: 0, social: 0, pe: 0, art: 0 };

  body.innerHTML = `
    <div style="padding: 20px; border: 2px solid #1e3a8a; border-radius: 8px; background: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="font-family: var(--font-moul); font-size: 13px; color: #1e3a8a;">${state.db.schoolInfo.country}</div>
        <div style="font-family: var(--font-moul); font-size: 12px; color: #b45309;">${state.db.schoolInfo.motto}</div>
        <div style="font-family: var(--font-moul); font-size: 15px; color: #0f172a; margin-top: 8px;">
          ព្រឹត្តិបត្រពិន្ទុសិស្សប្រចាំខែ
        </div>
        <div style="font-size: 12px; color: #64748b;">${state.db.schoolInfo.name} | ${currentClass.grade} | ឆ្នាំសិក្សា ${currentClass.academicYear}</div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; font-size: 13px;">
        <div>គោត្តនាម និងនាម៖ <strong>${s.fullName}</strong></div>
        <div>ភេទ៖ <strong>${s.gender}</strong></div>
        <div>អត្តលេខ៖ <strong>${s.studentId || "-"}</strong></div>
        <div>ថ្ងៃខែឆ្នាំកំណើត៖ <strong>${s.dobDay} ${s.dobMonth} ${s.dobYear}</strong></div>
        <div>គ្រូប្រចាំថ្នាក់៖ <strong>${currentClass.teacher}</strong></div>
        <div>ចំណាត់ថ្នាក់ក្នុងថ្នាក់៖ <strong style="color: #b45309; font-size: 16px;">លេខ ${s.rank}</strong> នៃសិស្ស ${currentClass.students.length} នាក់</div>
      </div>

      <table class="official-table" style="font-size: 12.5px; margin-bottom: 16px;">
        <thead>
          <tr>
            <th>ល.រ</th>
            <th>មុខវិជ្ជា</th>
            <th>ពិន្ទុអតិបរមា</th>
            <th>ពិន្ទុទទួលបាន</th>
            <th>និទ្ទេស</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>១</td><td class="text-left">ភាសាខ្មែរ</td><td>១០</td><td style="font-weight: 700;">${sc.khmer}</td><td>${getSubjectMention(sc.khmer)}</td></tr>
          <tr><td>២</td><td class="text-left">គណិតវិទ្យា</td><td>១០</td><td style="font-weight: 700;">${sc.math}</td><td>${getSubjectMention(sc.math)}</td></tr>
          <tr><td>៣</td><td class="text-left">វិទ្យាសាស្ត្រ</td><td>១០</td><td style="font-weight: 700;">${sc.science}</td><td>${getSubjectMention(sc.science)}</td></tr>
          <tr><td>៤</td><td class="text-left">សិក្សាសង្គម</td><td>១០</td><td style="font-weight: 700;">${sc.social}</td><td>${getSubjectMention(sc.social)}</td></tr>
          <tr><td>៥</td><td class="text-left">អប់រំកាយ និងកីឡា</td><td>១០</td><td style="font-weight: 700;">${sc.pe}</td><td>${getSubjectMention(sc.pe)}</td></tr>
          <tr><td>៦</td><td class="text-left">សិល្បៈ និងជំនាញ</td><td>១០</td><td style="font-weight: 700;">${sc.art}</td><td>${getSubjectMention(sc.art)}</td></tr>
          <tr style="background: #f1f5f9; font-weight: 700;">
            <td colspan="2" style="text-align: right;">ពិន្ទុសរុប និង មធ្យមភាគ៖</td>
            <td>៦០</td>
            <td style="color: #1d4ed8; font-size: 14px;">${s.totalScore} (មធ្យម ${s.avgScore})</td>
            <td style="color: #166534;">${s.mention}</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; margin-top: 30px; text-align: center; font-size: 12px;">
        <div style="width: 45%;">
          <div>បានឃើញ និង ឯកភាព</div>
          <div style="font-weight: 700; margin-top: 4px;">នាយកសាលា</div>
          <div style="height: 45px;"></div>
          <div style="font-weight: 700;">${state.db.schoolInfo.principal}</div>
        </div>
        <div style="width: 45%;">
          <div>${currentClass.solarDate}</div>
          <div style="font-weight: 700; margin-top: 4px;">គ្រូប្រចាំថ្នាក់</div>
          <div style="height: 45px;"></div>
          <div style="font-weight: 700;">${currentClass.teacher}</div>
        </div>
      </div>
    </div>
  `;

  modal.classList.add("active");
}

function closeReportCardModal() {
  document.getElementById("reportCardModalOverlay").classList.remove("active");
}

function getSubjectMention(score) {
  if (score >= 8.5) return "ល្អប្រសើរ";
  if (score >= 7.5) return "ល្អណាស់";
  if (score >= 6.5) return "ល្អ";
  if (score >= 5.0) return "មធ្យម";
  return "ខ្សោយ";
}

// Honor Roll Modal (តារាងកិត្តិយស)
function openHonorRollModal() {
  const currentClass = getActiveClass();
  if (!currentClass) return;

  const top5 = [...currentClass.students].sort((a,b) => b.avgScore - a.avgScore).slice(0, 5);
  const modal = document.getElementById("honorRollModalOverlay");
  const body = document.getElementById("honorRollModalBody");
  if (!modal || !body) return;

  let html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <i class="fa fa-award" style="font-size: 40px; color: #f59e0b;"></i>
      <h2 style="font-family: var(--font-moul); font-size: 16px; color: #1e3a8a; margin-top: 8px;">
        តារាងកិត្តិយសសិស្សពូកែប្រចាំថ្នាក់
      </h2>
      <p style="font-size: 13px; color: #64748b;">${currentClass.grade} | ឆ្នាំសិក្សា ${currentClass.academicYear}</p>
    </div>

    <div style="display: flex; flex-direction: column; gap: 10px;">
  `;

  top5.forEach((s, idx) => {
    const medals = ["🥇", "🥈", "🥉", "🎖️", "🎖️"];
    html += `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: ${idx === 0 ? '#fef3c7' : '#f8fafc'}; border: 1px solid ${idx === 0 ? '#fde68a' : '#e2e8f0'}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <span style="font-size: 26px;">${medals[idx]}</span>
          <div>
            <div style="font-weight: 700; font-size: 15px; color: #0f172a;">${s.fullName}</div>
            <div style="font-size: 12px; color: #64748b;">អត្តលេខ: ${s.studentId || "-"} | ភេទ: ${s.gender}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 16px; font-weight: 800; color: #1d4ed8;">មធ្យមភាគ: ${s.avgScore}</div>
          <div style="font-size: 12px; font-weight: 600; color: #166534;">និទ្ទេស: ${s.mention}</div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  body.innerHTML = html;
  modal.classList.add("active");
}

function closeHonorRollModal() {
  document.getElementById("honorRollModalOverlay").classList.remove("active");
}

/* ==========================================================================
   6. TEACHERS MANAGEMENT (គ្រប់គ្រងគ្រូបង្រៀន)
   ========================================================================== */
function renderTeachers() {
  const container = document.getElementById("teachersContentWrap");
  if (!container) return;

  const teachers = state.db.teachers || [];
  const femaleTeachers = teachers.filter(t => t.gender === "ស្រី").length;
  const maleTeachers = teachers.length - femaleTeachers;

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div>
        <h3 style="font-size: 16px; font-weight: 700; color: var(--primary);">
          បញ្ជីរាយនាមបុគ្គលិកអប់រំ និងគ្រូបង្រៀន
        </h3>
        <p style="font-size: 12px; color: #64748b;">
          ចំនួនសរុប <strong>${teachers.length}</strong> នាក់ (ស្រី <strong>${femaleTeachers}</strong> នាក់, ប្រុស <strong>${maleTeachers}</strong> នាក់)
        </p>
      </div>
      <div>
        <button class="btn btn-sm btn-primary" onclick="openAddTeacherModal()">
          <i class="fa fa-user-plus"></i> បន្ថែមគ្រូថ្មី
        </button>
      </div>
    </div>

    <table class="official-table" style="font-size: 12.5px;">
      <thead>
        <tr>
          <th style="width: 40px;">ល.រ</th>
          <th>គោត្តនាម និង នាម</th>
          <th style="width: 60px;">ភេទ</th>
          <th>តួនាទី / ភារកិច្ច</th>
          <th>ថ្នាក់ទទួលបន្ទុក</th>
          <th>លេខទូរសព្ទ</th>
          <th>អ៊ីមែល</th>
          <th class="action-col no-print" style="width: 70px;">សកម្មភាព</th>
        </tr>
      </thead>
      <tbody>
  `;

  teachers.forEach((t, idx) => {
    html += `
      <tr>
        <td>${idx + 1}</td>
        <td class="text-left" style="font-weight: 700; color: #1e3a8a;">${t.name}</td>
        <td>${t.gender === "ស្រី" ? '<span class="gender-badge female">ស្រី</span>' : '<span class="gender-badge male">ប្រុស</span>'}</td>
        <td style="font-weight: 600;">${t.position}</td>
        <td style="color: #b45309; font-weight: 600;">${t.grade || "-"}</td>
        <td>${t.phone || "-"}</td>
        <td style="font-size: 11px;">${t.email || "-"}</td>
        <td class="action-col no-print">
          <div class="action-btn-group">
            <button class="action-icon-btn" onclick="openEditTeacherModal('${t.id}')" title="កែប្រែ">
              <i class="fa fa-edit"></i>
            </button>
            <button class="action-icon-btn delete" onclick="deleteTeacher('${t.id}')" title="លុប">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
  initMovableApproval('movableApprovalBlockMonthly', 'monthly');
}

function openAddTeacherModal() {
  document.getElementById("teacherModalTitle").innerText = "បន្ថែមគ្រូបង្រៀនថ្មី";
  document.getElementById("teacherEditId").value = "";
  document.getElementById("formTeacherName").value = "";
  document.getElementById("formTeacherGender").value = "ស្រី";
  document.getElementById("formTeacherPosition").value = "គ្រូបង្រៀន";
  document.getElementById("formTeacherGrade").value = "ថ្នាក់ទី១";
  document.getElementById("formTeacherPhone").value = "";
  document.getElementById("formTeacherEmail").value = "";

  document.getElementById("teacherModalOverlay").classList.add("active");
}

function openEditTeacherModal(tId) {
  const t = (state.db.teachers || []).find(x => x.id === tId);
  if (!t) return;

  document.getElementById("teacherModalTitle").innerText = `កែប្រែព័ត៌មានគ្រូ: ${t.name}`;
  document.getElementById("teacherEditId").value = t.id;
  document.getElementById("formTeacherName").value = t.name;
  document.getElementById("formTeacherGender").value = t.gender;
  document.getElementById("formTeacherPosition").value = t.position;
  document.getElementById("formTeacherGrade").value = t.grade || "";
  document.getElementById("formTeacherPhone").value = t.phone || "";
  document.getElementById("formTeacherEmail").value = t.email || "";

  document.getElementById("teacherModalOverlay").classList.add("active");
}

function closeTeacherModal() {
  document.getElementById("teacherModalOverlay").classList.remove("active");
}

function saveTeacherForm() {
  const tId = document.getElementById("teacherEditId").value;
  const name = document.getElementById("formTeacherName").value.trim();
  if (!name) {
    alert("សូមបញ្ចូលឈ្មោះគ្រូបង្រៀន!");
    return;
  }

  const teacherObj = {
    name: name,
    gender: document.getElementById("formTeacherGender").value,
    position: document.getElementById("formTeacherPosition").value,
    grade: document.getElementById("formTeacherGrade").value,
    phone: document.getElementById("formTeacherPhone").value.trim(),
    email: document.getElementById("formTeacherEmail").value.trim()
  };

  if (tId) {
    const idx = state.db.teachers.findIndex(x => x.id === tId);
    if (idx !== -1) {
      state.db.teachers[idx] = { ...state.db.teachers[idx], ...teacherObj };
    }
  } else {
    teacherObj.id = `T${state.db.teachers.length + 1}`;
    state.db.teachers.push(teacherObj);
  }

  saveDatabase();
  closeTeacherModal();
  renderTeachers();
  renderDashboard();
  if (window.authSystem && typeof window.authSystem.syncTeachers === "function") {
    window.authSystem.syncTeachers();
  }
}

function deleteTeacher(tId) {
  const t = (state.db.teachers || []).find(x => x.id === tId);
  if (!t) return;

  if (confirm(`តើអ្នកពិតជាចង់លុបគ្រូ "${t.name}" មែនឬទេ?`)) {
    state.db.teachers = state.db.teachers.filter(x => x.id !== tId);
    saveDatabase();
    renderTeachers();
    renderDashboard();
    if (window.authSystem && typeof window.authSystem.syncTeachers === "function") {
      window.authSystem.syncTeachers();
    }
  }
}

/* ==========================================================================
   7. EXAM ROOMS & SCHEDULES (បន្ទប់ប្រឡងតេស្ដស្តង់ដា)
   ========================================================================== */
function renderExamRooms() {
  const container = document.getElementById("examRoomsContentWrap");
  if (!container) return;

  const rooms = state.db.examRooms || [];
  if (rooms.length === 0) {
    container.innerHTML = `<p style="text-align:center; padding: 30px;">មិនទាន់មានទិន្នន័យបន្ទប់ប្រឡង</p>`;
    return;
  }

  let html = `
    <div style="margin-bottom: 16px;">
      <h3 style="font-size: 16px; font-weight: 700; color: var(--primary);">
        បញ្ជីរាយនាមសិស្សប្រឡងតេស្ដស្តង់ដាប្រចាំខែ កុម្ភៈ (បន្ទប់ប្រឡង ១ ដល់ ៦)
      </h3>
      <p style="font-size: 12px; color: #64748b;">កាលបរិច្ឆេទប្រឡង៖ ថ្ងៃទី ៥-៦ ខែ មីនា ឆ្នាំ ២០២៦</p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
  `;

  rooms.forEach(r => {
    html += `
      <div style="background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 16px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px;">
          <div>
            <strong style="color: var(--primary); font-size: 14px;">${r.roomNumber} (${r.grade})</strong>
            <div style="font-size: 11px; color: #64748b;">អនុរក្ស៖ <strong>${r.proctor}</strong></div>
          </div>
          <span class="gender-badge male">${r.students.length} នាក់</span>
        </div>

        <div style="max-height: 180px; overflow-y: auto;">
          <table class="official-table" style="font-size: 11px;">
            <thead>
              <tr><th>ល.រ</th><th>ឈ្មោះសិស្ស</th><th>ភេទ</th><th>លេខតុ</th></tr>
            </thead>
            <tbody>
    `;

    r.students.forEach(st => {
      html += `
        <tr>
          <td>${st.num}</td>
          <td class="text-left" style="font-weight: 600;">${st.fullName}</td>
          <td>${st.gender}</td>
          <td style="font-weight: 700; color: #1e3a8a;">${st.deskNumber}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
  initMovableApproval('movableApprovalBlockMonthly', 'monthly');
}

/* ==========================================================================
   8. REPORTS & STATISTICS (ស្ថិតិ & របាយការណ៍)
   ========================================================================== */
function renderReports() {
  const container = document.getElementById("reportsContentWrap");
  if (!container) return;

  const hpv = state.db.hpvList || [];
  const currentClasses = getClassesForYear(state.activeYear);

  let html = `
    <div style="background: white; border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="font-size: 15px; font-weight: 700; color: var(--primary); margin-bottom: 10px;">
        បញ្ជីរាយនាមសិស្សទទួលបានការចាក់វ៉ាក់សាំងការពារមហារីកមាត់ស្បូន (HPV)
      </h3>
      <table class="official-table" style="font-size: 12px;">
        <thead>
          <tr><th>ល.រ</th><th>គោត្តនាម និងនាម</th><th>ភេទ</th><th>ថ្ងៃខែឆ្នាំកំណើត</th><th>អាស័យដ្ឋានបច្ចុប្បន្ន</th><th>ស្ថានភាព</th></tr>
        </thead>
        <tbody>
  `;

  if (hpv.length === 0) {
    html += `<tr><td colspan="6" style="padding: 16px;">គ្មានទិន្នន័យ</td></tr>`;
  } else {
    hpv.forEach((h, idx) => {
      html += `
        <tr>
          <td>${idx + 1}</td>
          <td class="text-left" style="font-weight: 600;">${h.fullName}</td>
          <td><span class="gender-badge female">${h.gender}</span></td>
          <td>${h.dob || "-"}</td>
          <td>${h.address || "រនាមពេជ្រ ចំប៉ា"}</td>
          <td><span class="score-badge mention-excellent">✓ បានចាក់រួចរាល់</span></td>
        </tr>
      `;
    });
  }

  html += `</tbody></table></div>`;
  container.innerHTML = html;
  initMovableApproval('movableApprovalBlockMonthly', 'monthly');
}


/**
 * Live Real-Time Date & Clock (កាលបរិច្ឆេទ និង ម៉ោងពិតប្រាកដនៅលើប្រព័ន្ធទាំងមូល)
 */
function updateSystemLiveDateTime() {
  const dateEl = document.getElementById("systemLiveDate");
  const timeEl = document.getElementById("systemLiveTime");
  if (!dateEl || !timeEl) return;

  const now = new Date();
  const daysOfWeek = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  const months = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];

  const dayName = daysOfWeek[now.getDay()];
  const dayNum = toKhmerNum(now.getDate());
  const monthName = months[now.getMonth()];
  const yearNum = toKhmerNum(now.getFullYear());

  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Exact 5 Khmer time periods: ព្រឹក, ថ្ងៃត្រង់, រសៀល, ល្ងាច, យប់
  let period = "ព្រឹក";
  if (hours === 12) {
    period = "ថ្ងៃត្រង់";
  } else if (hours >= 13 && hours < 17) {
    period = "រសៀល";
  } else if (hours >= 17 && hours < 20) {
    period = "ល្ងាច";
  } else if (hours >= 20 || hours < 5) {
    period = "យប់";
  } else {
    period = "ព្រឹក"; // 5 <= hours < 12
  }

  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  const hoursStr = String(displayHours).padStart(2, '0');

  const timeDigits = `${toKhmerNum(hoursStr)}:${toKhmerNum(minutes)}:${toKhmerNum(seconds)}`;

  dateEl.textContent = `ថ្ងៃ${dayName} ទី${dayNum} ខែ${monthName} ឆ្នាំ${yearNum}`;
  timeEl.innerHTML = `<span class="live-clock-digits">${timeDigits}</span> <span class="live-clock-period">${period}</span>`;
}

function initLiveClock() {
  updateSystemLiveDateTime();
  setInterval(updateSystemLiveDateTime, 1000);
}


/* ==========================================================================
   DASHBOARD ZOOM, EXPAND/COLLAPSE & FULLSCREEN (ពង្រីក និង បង្រួម Dashboard)
   ========================================================================== */
let dashboardZoomScale = 1.0;

function zoomDashboard(delta) {
  dashboardZoomScale = Math.min(1.5, Math.max(0.6, Math.round((dashboardZoomScale + delta) * 10) / 10));
  applyDashboardZoom();
}

function resetDashboardZoom() {
  dashboardZoomScale = 1.0;
  applyDashboardZoom();
}

function applyDashboardZoom() {
  const container = document.getElementById("dashboardZoomContainer");
  const badge = document.getElementById("dashZoomLevel");
  if (container) {
    container.style.transform = `scale(${dashboardZoomScale})`;
    container.style.transformOrigin = "top center";
    container.style.transition = "transform 0.2s ease";
  }
  if (badge) {
    badge.textContent = `${Math.round(dashboardZoomScale * 100)}%`;
  }
}

function toggleDashboardFullscreen() {
  const tab = document.getElementById("tab-dashboard");
  const btn = document.getElementById("btnDashFullscreen");
  if (!tab) return;
  tab.classList.toggle("dashboard-fullscreen");
  const isFull = tab.classList.contains("dashboard-fullscreen");
  if (btn) {
    btn.innerHTML = isFull
      ? `<i class="fa-solid fa-compress"></i> ថយមកវិញ`
      : `<i class="fa-solid fa-expand"></i> ពេញអេក្រង់`;
  }
}

function toggleCardCollapse(btn) {
  const card = btn.closest(".chart-card");
  if (!card) return;
  card.classList.toggle("collapsed");
  const isCollapsed = card.classList.contains("collapsed");
  const icon = btn.querySelector("i");
  if (icon) {
    icon.className = isCollapsed ? "fa fa-chevron-down" : "fa fa-chevron-up";
  }
}

/* ==========================================================================
   4.2 YEARLY ATTENDANCE REGISTER (តារាងស្រង់អវត្តមានសិស្សប្រចាំឆ្នាំ - ១០០% តាមគម្រូ)
   ========================================================================== */

/**
 * Render Yearly Attendance Register (១០០% តាមគម្រូក្រសួង A4 LANDSCAPE)
 */
function renderYearlyAttendance() {
  const currentClass = getActiveClass();
  const container = document.getElementById("yearlyAttendanceWrap");
  if (!container) return;

  if (!currentClass) {
    container.innerHTML = `<p style="text-align:center; padding: 30px;">សូមជ្រើសរើសថ្នាក់រៀន</p>`;
    return;
  }

  const students = currentClass.students || [];
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";
  const startYear = parseInt(academicYear.split("-")[0].replace(/[^\d]/g, ""), 10) || 2026;

  // 11 Academic Months in Cambodia starting from November (ខែ វិច្ឆិកា) to September (ខែ កញ្ញា)
  const monthsList = [
    { num: 11, name: "ខែ វិច្ឆិកា", yearOffset: 0 },
    { num: 12, name: "ខែ ធ្នូ",    yearOffset: 0 },
    { num: 1,  name: "ខែ មករា",   yearOffset: 1 },
    { num: 2,  name: "ខែ កុម្ភៈ",  yearOffset: 1 },
    { num: 3,  name: "ខែ មីនា",   yearOffset: 1 },
    { num: 4,  name: "ខែ មេសា",   yearOffset: 1 },
    { num: 5,  name: "ខែ ឧសភា",  yearOffset: 1 },
    { num: 6,  name: "ខែ មិថុនា",  yearOffset: 1 },
    { num: 7,  name: "ខែ កក្កដា", yearOffset: 1 },
    { num: 8,  name: "ខែ សីហា",  yearOffset: 1 },
    { num: 9,  name: "ខែ កញ្ញា",  yearOffset: 1 }
  ];

  // Column totals initialized for all 11 months
  const colTotalsL = {};
  const colTotalsA = {};
  monthsList.forEach(mObj => {
    colTotalsL[mObj.num] = 0;
    colTotalsA[mObj.num] = 0;
  });
  let grandTotalL = 0;
  let grandTotalA = 0;

  // Collect data strictly for actual students in class (no empty filler rows)
  const studentRowsData = [];
  students.forEach((s, idx) => {
    let yearL = 0;
    let yearA = 0;
    const monthlyCounts = {};

    // Equal Spacing for Family Name and Given Name (ដូចក្នុងបញ្ជីឈ្មោះសិស្ស)
    const lName = s.lastName || (s.fullName ? s.fullName.trim().split(/\s+/)[0] : "");
    const fName = s.firstName || (s.fullName ? s.fullName.trim().split(/\s+/).slice(1).join(" ") : "");

    monthsList.forEach(mObj => {
      let mL = 0;
      let mA = 0;
      const mYear = startYear + mObj.yearOffset;
      const monthPrefix = `${mYear}-${String(mObj.num).padStart(2, "0")}`;
      const daysInMonth = new Date(mYear, mObj.num, 0).getDate();

      if (!currentClass.clearedYearly) {
        // 1. Direct computation from daily records in currentClass.attendanceRecords and s.dailyAttendance
        let hasDayRecord = false;
        for (let d = 1; d <= daysInMonth; d++) {
          const dateObj = new Date(mYear, mObj.num - 1, d);
          const isSunday = dateObj.getDay() === 0;
          const holName = typeof getHolidayName === "function" ? getHolidayName(mYear, mObj.num, d) : null;
          if (isSunday || holName) continue; // Skip Sundays and Holidays

          const dateKey = `${monthPrefix}-${String(d).padStart(2, '0')}`;
          const dayRecord = currentClass.attendanceRecords?.[dateKey]?.records?.[s.num] ||
                            currentClass.attendanceRecords?.[dateKey]?.records?.[String(s.num)] ||
                            s.dailyAttendance?.[dateKey];
          if (dayRecord) {
            hasDayRecord = true;
            let status = typeof dayRecord === "object" ? dayRecord.status : dayRecord;
            if (!status && dateKey === state.activeAttendanceDate && s.activeAttDate === dateKey && s.todayStatus) {
              status = s.todayStatus;
            }
            if (status === "L") mL++;
            else if (status === "A") mA++;
          }
        }

        // 2. If no individual day records found, fallback to s.monthlyAttendance
        if (!hasDayRecord && s.monthlyAttendance && s.monthlyAttendance[monthPrefix]) {
          mL = s.monthlyAttendance[monthPrefix].excused || 0;
          mA = s.monthlyAttendance[monthPrefix].unexcused || 0;
        }
      }

      // 3. Manual override if teacher edited cell directly in Yearly Attendance
      const editKey = `${s.num}_${mObj.num}`;
      if (currentClass.yearlyEdits && currentClass.yearlyEdits[editKey]) {
        if (currentClass.yearlyEdits[editKey].L !== undefined) mL = currentClass.yearlyEdits[editKey].L;
        if (currentClass.yearlyEdits[editKey].A !== undefined) mA = currentClass.yearlyEdits[editKey].A;
      }

      monthlyCounts[mObj.num] = { L: mL, A: mA };
      yearL += mL;
      yearA += mA;

      colTotalsL[mObj.num] += mL;
      colTotalsA[mObj.num] += mA;
    });

    grandTotalL += yearL;
    grandTotalA += yearA;

    studentRowsData.push({
      num: idx + 1,
      id: s.num,
      lastName: lName,
      firstName: fName,
      gender: s.gender || "",
      monthlyCounts,
      totalL: yearL,
      totalA: yearA,
      totalSum: yearL + yearA,
      remarks: s.remarks || ""
    });
  });

  // Default dates for footer
  const defaultLunar = (currentClass.yearlyDates && currentClass.yearlyDates.lunar) || "ថ្ងៃ ចន្ទ ៩ កើត ខែ អស្សុជ ឆ្នាំ ថោះ បញ្ចស័ក ព.ស ២៥៦៧";
  const defaultSolar = (currentClass.yearlyDates && currentClass.yearlyDates.solar) || `បាន្លួង ថ្ងៃទី ២៣ ខែ តុលា ឆ្នាំ ${startYear}`;

  // Build HTML table rows strictly matching the actual student count
  let rowsHtml = "";
  if (studentRowsData.length === 0) {
    rowsHtml = `<tr><td colspan="30" style="text-align:center; padding: 25px; color: #64748b;">គ្មានទិន្នន័យសិស្សក្នុងថ្នាក់នេះទេ</td></tr>`;
  } else {
    studentRowsData.forEach((data, idx) => {
      let monthsCells = "";
      monthsList.forEach(mObj => {
        const cnt = data.monthlyCounts[mObj.num];
        const valL = cnt.L > 0 ? cnt.L : "";
        const valA = cnt.A > 0 ? cnt.A : "";
        monthsCells += `
          <td class="td-num" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែ" onblur="saveYearlyStudentAbsence('${currentClass.id}', ${data.id}, ${mObj.num}, 'L', this.innerText)">${valL}</td>
          <td class="td-num" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែ" onblur="saveYearlyStudentAbsence('${currentClass.id}', ${data.id}, ${mObj.num}, 'A', this.innerText)">${valA}</td>
        `;
      });

      rowsHtml += `
        <tr>
          <td class="td-center">${idx + 1}</td>
          <td class="td-name text-left border-no-r" style="width: 70px; padding-left: 6px; padding-right: 2px; white-space: nowrap;">${escapeHtml(data.lastName)}</td>
          <td class="td-name text-left border-no-l" style="width: 80px; padding-left: 2px; padding-right: 4px; white-space: nowrap;">${escapeHtml(data.firstName)}</td>
          <td class="td-center">${data.gender}</td>
          ${monthsCells}
          <td class="td-peach td-num">${data.totalL}</td>
          <td class="td-peach td-num">${data.totalA}</td>
          <td class="td-peach td-num">${data.totalSum}</td>
          <td class="td-center" contenteditable="true" spellcheck="false" onblur="saveYearlyStudentRemark('${currentClass.id}', ${data.id}, this.innerText)">${data.remarks}</td>
        </tr>
      `;
    });
  }

  // Header month columns starting from November (ខែ វិច្ឆិកា)
  let headerMonthsHtml = "";
  let headerSubColsHtml = "";
  monthsList.forEach(m => {
    headerMonthsHtml += `<th colspan="2" class="th-green">${m.name}</th>`;
    headerSubColsHtml += `<th class="th-green">ច្ប</th><th class="th-green">អច្ប</th>`;
  });

  // Bottom Summary Row
  let colTotalsHtml = "";
  monthsList.forEach(mObj => {
    colTotalsHtml += `
      <td class="td-blue td-num">${colTotalsL[mObj.num]}</td>
      <td class="td-blue td-num">${colTotalsA[mObj.num]}</td>
    `;
  });

  const grandTotalSum = grandTotalL + grandTotalA;

  let html = `
    <div class="yearly-a4-page" id="printableYearlyAttendance">
      <!-- Top Official MoEYS Header -->
      <div class="yearly-header">
        <div class="yearly-kingdom-center">
          <div class="yearly-kingdom">ព្រះរាជាណាចក្រកម្ពុជា</div>
          <div class="yearly-motto">ជាតិ  សាសនា  ព្រះមហាក្សត្រ</div>
          <div class="yearly-crest-wrap">
            <svg width="90" height="14" viewBox="0 0 120 18" fill="none">
              <path d="M60 9 C50 3, 40 15, 30 9 C20 3, 10 9, 0 9 M60 9 C70 3, 80 15, 90 9 C100 3, 110 9, 120 9" stroke="#b45309" stroke-width="1.6" stroke-linecap="round"/>
              <circle cx="60" cy="9" r="3.2" fill="#d97706"/>
              <circle cx="50" cy="9" r="2" fill="#b45309"/>
              <circle cx="70" cy="9" r="2" fill="#b45309"/>
            </svg>
          </div>
        </div>

        <div class="yearly-header-left">
          <div class="yearly-admin-line">មន្ទីរអប់រំ យុវជន និងកីឡា រាជធានី/ខេត្តតាកែវ</div>
          <div class="yearly-admin-line">ការិយាល័យអប់រំ យុវជន និងកីឡារដ្ឋបាលក្រុង/ស្រុក/ខណ្ឌ ព្រៃកប្បាស</div>
          <div class="yearly-admin-line">សាលាបឋមសិក្សា បាន្លួង</div>
        </div>
      </div>

      <!-- Main Title (Green - 100% match) -->
      <div class="yearly-title">
        តារាងស្រង់អវត្តមានសិស្ស ឆ្នាំសិក្សា ${academicYear}
      </div>

      <!-- Main Table -->
      <table class="official-yearly-table">
        <thead>
          <tr>
            <th rowspan="2" class="th-green" style="width: 32px;">ល.រ</th>
            <th colspan="2" rowspan="2" class="th-green" style="min-width: 155px; text-align: center;">គោត្តនាម និងនាម</th>
            <th rowspan="2" class="th-green" style="width: 38px;">ភេទ</th>
            ${headerMonthsHtml}
            <th colspan="3" class="th-peach">សរុបរួម</th>
            <th rowspan="2" class="th-green" style="width: 55px;">ផ្សេងៗ</th>
          </tr>
          <tr>
            ${headerSubColsHtml}
            <th class="th-peach">ច្ប</th><th class="th-peach">អច្ប</th><th class="th-peach">សរុប</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <!-- Bottom Total Row -->
          <tr>
            <td colspan="4" class="td-total-label">សរុបរួម</td>
            ${colTotalsHtml}
            <td class="td-yellow td-num">${grandTotalL}</td>
            <td class="td-yellow td-num">${grandTotalA}</td>
            <td class="td-yellow td-num">${grandTotalSum}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <!-- Footer & Signatures -->
      <div class="yearly-footer">
        <div class="yearly-dates-block">
          <div class="yearly-lunar-date editable-date" contenteditable="true" spellcheck="false"
               title="ចុចត្រង់នេះដើម្បីកែសម្រួលកាលបរិច្ឆេទចន្ទគតិ"
               onblur="saveYearlyDate('${currentClass.id}', 'lunar', this.innerText)">
            ${defaultLunar}
          </div>
          <div class="yearly-solar-date editable-date" contenteditable="true" spellcheck="false"
               title="ចុចត្រង់នេះដើម្បីកែសម្រួលកាលបរិច្ឆេទសុរិយគតិ"
               onblur="saveYearlyDate('${currentClass.id}', 'solar', this.innerText)">
            ${defaultSolar}
          </div>
        </div>

        <div class="yearly-signatures-row">
          <div class="yearly-sign-col left">
            <div class="movable-approval-block" id="movableApprovalBlockYearly" title="ចុចអូសដើម្បីផ្លាស់ទី ឬពង្រីក-បង្រួមតាមចិត្ត (Drag to move or resize)">
              <div class="approval-drag-handle no-print" title="ចុចអូសដើម្បីផ្លាស់ទី (Drag to move)">
                <i class="fa-solid fa-arrows-up-down-left-right"></i>
              </div>
              <div class="approval-action-toolbar no-print">
                <button type="button" class="btn-approval-action" onclick="adjustApprovalScale(1.1, 'yearly')" title="ពង្រីកទំហំ (Enlarge)"><i class="fa-solid fa-plus"></i></button>
                <button type="button" class="btn-approval-action" onclick="adjustApprovalScale(0.9, 'yearly')" title="បង្រួមទំហំ (Shrink)"><i class="fa-solid fa-minus"></i></button>
                <button type="button" class="btn-approval-action" onclick="resetApprovalTransform('yearly')" title="កំណត់ទីតាំង និងទំហំដើម (Reset)"><i class="fa-solid fa-rotate-left"></i></button>
              </div>
              <div class="approval-content-box">
                <div class="yearly-sign-approval">បានឃើញ និង ឯកភាព</div>
                <div class="yearly-sign-role">នាយកសាលា</div>
                <div class="yearly-sign-space"></div>
              </div>
              <div class="approval-resize-handle no-print" title="ចុចអូសដើម្បីពង្រីក-បង្រួម (Drag to resize)">
                <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
              </div>
            </div>
          </div>
          <div class="yearly-sign-col right">
            <div class="yearly-sign-role">គ្រូប្រចាំថ្នាក់</div>
            <div class="yearly-sign-space"></div>
            <div class="yearly-teacher-name">${currentClass.teacher || "លី មករា"}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  initMovableApproval('movableApprovalBlockYearly', 'yearly');
  initMovableApproval('movableApprovalBlockMonthly', 'monthly');
}

function saveYearlyDate(classId, type, text) {
  const currentClass = getActiveClass();
  if (!currentClass || currentClass.id !== classId) return;
  if (!currentClass.yearlyDates) currentClass.yearlyDates = {};
  currentClass.yearlyDates[type] = text.trim();
  saveDatabase();
}

function saveYearlyStudentAbsence(classId, studentId, monthNum, type, val) {
  const currentClass = getActiveClass();
  if (!currentClass || currentClass.id !== classId) return;
  if (!currentClass.yearlyEdits) currentClass.yearlyEdits = {};
  const key = `${studentId}_${monthNum}`;
  if (!currentClass.yearlyEdits[key]) currentClass.yearlyEdits[key] = {};
  const numVal = parseInt(val.trim(), 10) || 0;
  currentClass.yearlyEdits[key][type] = numVal;
  saveDatabase();
  renderYearlyAttendance();
}

function saveYearlyStudentRemark(classId, studentId, text) {
  const currentClass = getActiveClass();
  if (!currentClass || currentClass.id !== classId) return;
  const s = currentClass.students ? currentClass.students.find(st => st.num === studentId) : null;
  if (s) {
    s.remarks = text.trim();
    saveDatabase();
  }
}

function printYearlyAttendance() {
  prepareStudentSubTabForPrint("attendance_yearly");
  window.print();
}
window.printYearlyAttendance = printYearlyAttendance;

function clearYearlyAttendanceData() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }
  const ok = confirm(`តើលោកគ្រូ/អ្នកគ្រូពិតជាចង់សម្អាតទិន្នន័យស្រង់អវត្តមានប្រចាំឆ្នាំនៃ «${currentClass.grade}» មែនទេ?\n\n⚠️ សកម្មភាពនេះនឹងកំណត់ទិន្នន័យស្រង់អវត្តមានទៅជាទទេវិញ!\n(លោកគ្រូ/អ្នកគ្រូអាចចុចប៊ូតុង «ត្រឡប់មកវិញ (Undo)» ដើម្បីទាញទិន្នន័យមកវិញបាន)`);
  if (!ok) return;

  if (!window._undoHistory) window._undoHistory = { students: {}, dailyAtt: {}, monthlyAtt: {}, yearlyAtt: {} };
  if (!window._undoHistory.yearlyAtt) window._undoHistory.yearlyAtt = {};
  const key = currentClass.id;
  if (!window._undoHistory.yearlyAtt[key]) window._undoHistory.yearlyAtt[key] = [];
  window._undoHistory.yearlyAtt[key].push({
    yearlyEdits: currentClass.yearlyEdits ? JSON.parse(JSON.stringify(currentClass.yearlyEdits)) : null,
    yearlyDates: currentClass.yearlyDates ? JSON.parse(JSON.stringify(currentClass.yearlyDates)) : null,
    clearedYearly: currentClass.clearedYearly || false
  });

  currentClass.yearlyEdits = {};
  currentClass.clearedYearly = true;
  saveDatabase();
  renderYearlyAttendance();
  showAttendanceToast(`✓ បានសម្អាតទិន្នន័យស្រង់អវត្តមានប្រចាំឆ្នាំ ${currentClass.grade} ដោយជោគជ័យ! (អាចចុច Undo ដើម្បីត្រឡប់មកវិញ)`, 'info');
}

function undoYearlyAttendanceData() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }
  const key = currentClass.id;
  const history = window._undoHistory && window._undoHistory.yearlyAtt && window._undoHistory.yearlyAtt[key];
  if (!history || history.length === 0) {
    alert("គ្មានទិន្នន័យស្រង់អវត្តមានប្រចាំឆ្នាំដែលបានសម្អាតដើម្បីត្រឡប់មកវិញ (Undo) ទេ!");
    return;
  }
  const lastState = history.pop();
  currentClass.yearlyEdits = lastState.yearlyEdits || {};
  if (lastState.yearlyDates) currentClass.yearlyDates = lastState.yearlyDates;
  currentClass.clearedYearly = lastState.clearedYearly || false;
  saveDatabase();
  renderYearlyAttendance();
  showAttendanceToast(`↩ បានត្រឡប់ទិន្នន័យស្រង់អវត្តមានប្រចាំឆ្នាំមកវិញដោយជោគជ័យ!`, 'success');
}

function exportYearlyAttendanceExcel() {
  const currentClass = getActiveClass();
  if (!currentClass) return;

  const students = currentClass.students || [];
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";
  const startYear = parseInt(academicYear.split("-")[0].replace(/[^\d]/g, ""), 10) || 2026;

  const monthsList = [
    { num: 11, name: "វិច្ឆិកា", yearOffset: 0 },
    { num: 12, name: "ធ្នូ",    yearOffset: 0 },
    { num: 1,  name: "មករា",   yearOffset: 1 },
    { num: 2,  name: "កុម្ភៈ",  yearOffset: 1 },
    { num: 3,  name: "មីនា",   yearOffset: 1 },
    { num: 4,  name: "មេសា",   yearOffset: 1 },
    { num: 5,  name: "ឧសភា",  yearOffset: 1 },
    { num: 6,  name: "មិថុនា",  yearOffset: 1 },
    { num: 7,  name: "កក្កដា", yearOffset: 1 },
    { num: 8,  name: "សីហា",  yearOffset: 1 },
    { num: 9,  name: "កញ្ញា",  yearOffset: 1 }
  ];

  let csv = "\uFEFF"; // UTF-8 BOM
  csv += "មន្ទីរអប់រំ យុវជន និងកីឡា រាជធានី/ខេត្ត តាកែវ - ការិយាល័យអប់រំ យុវជន និងកីឡា ស្រុកព្រៃកប្បាស - សាលាបឋមសិក្សា បាន្លួង\n";
  csv += `តារាងស្រង់អវត្តមានសិស្ស ឆ្នាំសិក្សា ${academicYear}\n`;
  csv += `ថ្នាក់៖ ${currentClass.grade} | គ្រូប្រចាំថ្នាក់៖ ${currentClass.teacher}\n\n`;

  // Headers with separate គោត្តនាម and នាម
  let h1 = ["ល.រ", "គោត្តនាម", "នាម", "ភេទ"];
  monthsList.forEach(m => {
    h1.push(`ខែ ${m.name} (ច្ប)`);
    h1.push(`ខែ ${m.name} (អច្ប)`);
  });
  h1.push("សរុបរួម (ច្ប)", "សរុបរួម (អច្ប)", "សរុប", "ផ្សេងៗ");
  csv += h1.map(x => `"${x}"`).join(",") + "\n";

  // Rows strictly for actual students
  students.forEach((s, idx) => {
    let yearL = 0;
    let yearA = 0;
    const lName = s.lastName || (s.fullName ? s.fullName.trim().split(/\s+/)[0] : "");
    const fName = s.firstName || (s.fullName ? s.fullName.trim().split(/\s+/).slice(1).join(" ") : "");
    const row = [idx + 1, lName, fName, s.gender || ""];

    monthsList.forEach(mObj => {
      let mL = 0;
      let mA = 0;
      const mYear = startYear + mObj.yearOffset;
      const monthPrefix = `${mYear}-${String(mObj.num).padStart(2, "0")}`;
      const daysInMonth = new Date(mYear, mObj.num, 0).getDate();

      if (!currentClass.clearedYearly) {
        let hasDayRecord = false;
        for (let d = 1; d <= daysInMonth; d++) {
          const dateObj = new Date(mYear, mObj.num - 1, d);
          const isSunday = dateObj.getDay() === 0;
          const holName = typeof getHolidayName === "function" ? getHolidayName(mYear, mObj.num, d) : null;
          if (isSunday || holName) continue;

          const dateKey = `${monthPrefix}-${String(d).padStart(2, '0')}`;
          const dayRecord = currentClass.attendanceRecords?.[dateKey]?.records?.[s.num] ||
                            currentClass.attendanceRecords?.[dateKey]?.records?.[String(s.num)] ||
                            s.dailyAttendance?.[dateKey];
          if (dayRecord) {
            hasDayRecord = true;
            let status = typeof dayRecord === "object" ? dayRecord.status : dayRecord;
            if (!status && dateKey === state.activeAttendanceDate && s.activeAttDate === dateKey && s.todayStatus) {
              status = s.todayStatus;
            }
            if (status === "L") mL++;
            else if (status === "A") mA++;
          }
        }

        if (!hasDayRecord && s.monthlyAttendance && s.monthlyAttendance[monthPrefix]) {
          mL = s.monthlyAttendance[monthPrefix].excused || 0;
          mA = s.monthlyAttendance[monthPrefix].unexcused || 0;
        }
      }

      const editKey = `${s.num}_${mObj.num}`;
      if (currentClass.yearlyEdits && currentClass.yearlyEdits[editKey]) {
        if (currentClass.yearlyEdits[editKey].L !== undefined) mL = currentClass.yearlyEdits[editKey].L;
        if (currentClass.yearlyEdits[editKey].A !== undefined) mA = currentClass.yearlyEdits[editKey].A;
      }
      yearL += mL;
      yearA += mA;
      row.push(mL > 0 ? mL : 0);
      row.push(mA > 0 ? mA : 0);
    });

    row.push(yearL);
    row.push(yearA);
    row.push(yearL + yearA);
    row.push(s.remarks || "");

    csv += row.map(x => `"${x}"`).join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `តារាងស្រង់អវត្តមានសិស្ស_${currentClass.grade}_${academicYear}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


/* ==========================================================================
   ANNUAL RANKS (ចំណាត់ថ្នាក់ប្រចាំឆ្នាំ) - 100% MINISTRY SAMPLE PDF SPEC
   A4 Portrait (2 Pages: Page 1 rows 1-26, Page 2 rows 27-38 + Stats & Signatures)
   Official Blue (#0000cc), Red (#dc2626), Green (#16a34a), Crisp Solid Borders
   ========================================================================== */

function onAnnualRankCellEdit(el, studentNum, field) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  currentClass.annualRankEdits = currentClass.annualRankEdits || {};
  currentClass.annualRankEdits[studentNum] = currentClass.annualRankEdits[studentNum] || {};

  const clean = el.innerText.trim();
  if (field === "other" || field === "mention") {
    currentClass.annualRankEdits[studentNum][field] = clean;
  } else {
    const val = parseFloat(clean);
    if (!isNaN(val)) {
      currentClass.annualRankEdits[studentNum][field] = val;
    } else if (clean === "") {
      delete currentClass.annualRankEdits[studentNum][field];
    }
  }
  saveDatabase();
  renderAnnualRanks();
}
window.onAnnualRankCellEdit = onAnnualRankCellEdit;

function saveAnnualRankDate(field, val) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  currentClass.annualRankDates = currentClass.annualRankDates || {};
  currentClass.annualRankDates[field] = (val || "").trim();
  saveDatabase();
}
window.saveAnnualRankDate = saveAnnualRankDate;

function saveAnnualTeacherName(val) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const clean = (val || "").trim();
  if (clean) {
    currentClass.teacher = clean;
    saveDatabase();
    if (typeof showToast === 'function') {
      showToast("✓ បានរក្សាទុកឈ្មោះគ្រូបន្ទុកថ្នាក់ដោយជោគជ័យ!", "success");
    }
  }
}
window.saveAnnualTeacherName = saveAnnualTeacherName;

function printAnnualRanks() {
  prepareAdminPrint("annual_ranks");
  window.print();
}
window.printAnnualRanks = printAnnualRanks;

function exportAnnualRanksExcel() {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const students = currentClass.students || [];
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";

  if (typeof XLSX === "undefined") {
    alert("សូមរង់ចាំបណ្ណាល័យ XLSX ដំណើរការពេញលេញ");
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsData = [];

  wsData.push(["ព្រះរាជាណាចក្រកម្ពុជា", "", "", "", "", "", "ជាតិ សាសនា ព្រះមហាក្សត្រ"]);
  wsData.push(["សាលាបឋមសិក្សា បាន្លួង"]);
  wsData.push([getCleanGradeDisplay(currentClass.grade || "ថ្នាក់ទី ៣")]);
  wsData.push([""]);
  wsData.push([`តារាងចំណាត់ថ្នាក់ប្រចាំឆ្នាំ ( ${academicYear} )`]);
  wsData.push([`ឆ្នាំសិក្សា៖ ${academicYear}`, `សិស្សសរុប៖ ${students.length} នាក់`]);
  wsData.push([""]);

  wsData.push([
    "ល.រ", "អត្តលេខ", "គោត្តនាម", "នាម", "ភេទ", "ថ្ងៃ ខែ ឆ្នាំ កំណើត",
    "មធ្យមភាគ ឆមាសទី១", "មធ្យមភាគ ឆមាសទី២", "មធ្យមភាគ ប្រចាំឆ្នាំ", "ចំណាត់ថ្នាក់ប្រចាំឆ្នាំ", "និទ្ទេស"
  ]);

  const sem1Months = ["ធ្នូ", "មករា", "កុម្ភៈ", "មីនា"];
  const sem2Months = ["ឧសភា", "មិថុនា", "កក្កដា", "សីហា"];

  const studentRows = students.map((s, idx) => {
    // 1. Sem 1 Avg
    let sem1Avg = 0;
    if (currentClass.annualRankEdits?.[s.num]?.sem1Avg !== undefined) {
      sem1Avg = currentClass.annualRankEdits[s.num].sem1Avg;
    } else if (currentClass.semesterRankEdits?.["1"]?.[s.num]?.semAvg !== undefined) {
      sem1Avg = currentClass.semesterRankEdits["1"][s.num].semAvg;
    } else {
      let sum = 0, count = 0;
      sem1Months.forEach(m => {
        const res = getStudentMonthAvg(currentClass, m, s);
        if (res.avg > 0) { sum += res.avg; count++; }
      });
      const mAvg = count > 0 ? (sum / count) : 0;
      const exAvg = getStudentSemesterExamScores(currentClass, "1", s).avg || 0;
      if (mAvg > 0 && exAvg > 0) sem1Avg = Math.round(((mAvg + exAvg) / 2) * 100) / 100;
      else if (mAvg > 0) sem1Avg = Math.round(mAvg * 100) / 100;
      else if (exAvg > 0) sem1Avg = Math.round(exAvg * 100) / 100;
    }

    // 2. Sem 2 Avg
    let sem2Avg = 0;
    if (currentClass.annualRankEdits?.[s.num]?.sem2Avg !== undefined) {
      sem2Avg = currentClass.annualRankEdits[s.num].sem2Avg;
    } else if (currentClass.semesterRankEdits?.["2"]?.[s.num]?.semAvg !== undefined) {
      sem2Avg = currentClass.semesterRankEdits["2"][s.num].semAvg;
    } else {
      let sum = 0, count = 0;
      sem2Months.forEach(m => {
        const res = getStudentMonthAvg(currentClass, m, s);
        if (res.avg > 0) { sum += res.avg; count++; }
      });
      const mAvg = count > 0 ? (sum / count) : 0;
      const exAvg = getStudentSemesterExamScores(currentClass, "2", s).avg || 0;
      if (mAvg > 0 && exAvg > 0) sem2Avg = Math.round(((mAvg + exAvg) / 2) * 100) / 100;
      else if (mAvg > 0) sem2Avg = Math.round(mAvg * 100) / 100;
      else if (exAvg > 0) sem2Avg = Math.round(exAvg * 100) / 100;
    }

    // 3. Annual Combined Avg
    let annualAvg = 0;
    if (currentClass.annualRankEdits?.[s.num]?.annualAvg !== undefined) {
      annualAvg = currentClass.annualRankEdits[s.num].annualAvg;
    } else {
      if (sem1Avg > 0 && sem2Avg > 0) {
        annualAvg = Math.round(((sem1Avg + sem2Avg) / 2) * 100) / 100;
      } else if (sem1Avg > 0) {
        annualAvg = sem1Avg;
      } else if (sem2Avg > 0) {
        annualAvg = sem2Avg;
      }
    }

    // 4. Other
    let other = "";
    if (currentClass.annualRankEdits?.[s.num]?.other !== undefined) {
      other = currentClass.annualRankEdits[s.num].other;
    } else {
      if (annualAvg >= 5.0) other = "ឡើងថ្នាក់";
    }

    let ln = s.lastName || "";
    let fn = s.firstName || "";
    if (!ln && !fn && s.fullName) {
      const parts = s.fullName.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    } else if (ln && !fn && ln.includes(" ")) {
      const parts = ln.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    } else if (!ln && fn && fn.includes(" ")) {
      const parts = fn.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    }

    let dobFormatted = s.dob || "";
    if (!dobFormatted && (s.dobDay || s.dobMonth || s.dobYear)) {
      dobFormatted = `${s.dobDay || ""}-${s.dobMonth || ""}-${s.dobYear || ""}`;
    }

    return {
      student: s,
      num: s.num || (idx + 1),
      studentId: s.studentId || "-",
      lName: ln,
      fName: fn,
      gender: s.gender || "ប្រុស",
      dobFormatted,
      sem1Avg,
      sem2Avg,
      annualAvg,
      other,
      hasScores: annualAvg > 0,
      rank: "",
      mention: ""
    };
  });

  const sorted = [...studentRows].sort((a, b) => {
    if (a.hasScores && !b.hasScores) return -1;
    if (!a.hasScores && b.hasScores) return 1;
    if (b.annualAvg !== a.annualAvg) return b.annualAvg - a.annualAvg;
    return a.num - b.num;
  });

  let curRank = 1;
  sorted.forEach((item, idx) => {
    if (idx > 0 && item.annualAvg < sorted[idx - 1].annualAvg) {
      curRank = idx + 1;
    }
    item.rank = item.hasScores ? curRank : "";

    let mention = "";
    if (item.annualAvg >= 8.5) mention = "A";
    else if (item.annualAvg >= 8.0) mention = "B";
    else if (item.annualAvg >= 7.0) mention = "C";
    else if (item.annualAvg >= 6.0) mention = "D";
    else if (item.annualAvg >= 5.0) mention = "E";
    else if (item.hasScores) mention = "F";
    item.mention = mention;
  });

  sorted.forEach((item, idx) => {
    wsData.push([
      idx + 1,
      item.studentId,
      item.lName,
      item.fName,
      item.gender,
      item.dobFormatted,
      item.sem1Avg > 0 ? item.sem1Avg : "",
      item.sem2Avg > 0 ? item.sem2Avg : "",
      item.annualAvg > 0 ? item.annualAvg : "",
      item.rank,
      item.mention
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "ចំណាត់ថ្នាក់ប្រចាំឆ្នាំ");
  const fileName = `ចំណាត់ថ្នាក់ប្រចាំឆ្នាំ_${currentClass.grade || "ថ្នាក់"}_${academicYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
window.exportAnnualRanksExcel = exportAnnualRanksExcel;

function renderAnnualRanks() {
  const container = document.getElementById("annualRanksContentWrap");
  if (!container) return;

  const annualClassSelect = document.querySelector("#tab-annual_ranks .class-select-input");
  if (annualClassSelect && annualClassSelect.options.length === 0) {
    updateClassSelectOptions();
  }

  let currentClass = getActiveClass();

  // Fallback to active class with students if current is empty or missing
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    const candidate = (state.db && state.db.classes ? state.db.classes : []).find(
      c => c.academicYear === (state.activeYear || "២០២៦-២០២៧") && c.students && c.students.length > 0
    );
    if (candidate) {
      currentClass = candidate;
      state.activeClassId = candidate.id;
      const classSelects = document.querySelectorAll(".class-select-input");
      classSelects.forEach(sel => sel.value = candidate.id);
    }
  }

  if (currentClass && annualClassSelect && annualClassSelect.value !== currentClass.id) {
    annualClassSelect.value = currentClass.id;
  }

  if (!currentClass) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">សូមជ្រើសរើសថ្នាក់រៀន</p>`;
    return;
  }

  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";
  const yearDisplay = document.getElementById("annualYearDisplay");
  if (yearDisplay) yearDisplay.innerText = academicYear;

  const students = currentClass.students || [];
  if (students.length === 0) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">មិនទាន់មានទិន្នន័យសិស្សក្នុងថ្នាក់នេះនៅឡើយទេ</p>`;
    return;
  }

  const sem1Months = ["ធ្នូ", "មករា", "កុម្ភៈ", "មីនា"];
  const sem2Months = ["ឧសភា", "មិថុនា", "កក្កដា", "សីហា"];

  const studentRows = students.map((s, idx) => {
    // 1. Sem 1 Avg
    let sem1Avg = 0;
    if (currentClass.annualRankEdits?.[s.num]?.sem1Avg !== undefined) {
      sem1Avg = currentClass.annualRankEdits[s.num].sem1Avg;
    } else if (currentClass.semesterRankEdits?.["1"]?.[s.num]?.semAvg !== undefined) {
      sem1Avg = currentClass.semesterRankEdits["1"][s.num].semAvg;
    } else {
      let sum = 0, count = 0;
      sem1Months.forEach(m => {
        const res = getStudentMonthAvg(currentClass, m, s);
        if (res.avg > 0) { sum += res.avg; count++; }
      });
      const mAvg = count > 0 ? (sum / count) : 0;
      const exAvg = getStudentSemesterExamScores(currentClass, "1", s).avg || 0;
      if (mAvg > 0 && exAvg > 0) sem1Avg = Math.round(((mAvg + exAvg) / 2) * 100) / 100;
      else if (mAvg > 0) sem1Avg = Math.round(mAvg * 100) / 100;
      else if (exAvg > 0) sem1Avg = Math.round(exAvg * 100) / 100;
    }

    // 2. Sem 2 Avg
    let sem2Avg = 0;
    if (currentClass.annualRankEdits?.[s.num]?.sem2Avg !== undefined) {
      sem2Avg = currentClass.annualRankEdits[s.num].sem2Avg;
    } else if (currentClass.semesterRankEdits?.["2"]?.[s.num]?.semAvg !== undefined) {
      sem2Avg = currentClass.semesterRankEdits["2"][s.num].semAvg;
    } else {
      let sum = 0, count = 0;
      sem2Months.forEach(m => {
        const res = getStudentMonthAvg(currentClass, m, s);
        if (res.avg > 0) { sum += res.avg; count++; }
      });
      const mAvg = count > 0 ? (sum / count) : 0;
      const exAvg = getStudentSemesterExamScores(currentClass, "2", s).avg || 0;
      if (mAvg > 0 && exAvg > 0) sem2Avg = Math.round(((mAvg + exAvg) / 2) * 100) / 100;
      else if (mAvg > 0) sem2Avg = Math.round(mAvg * 100) / 100;
      else if (exAvg > 0) sem2Avg = Math.round(exAvg * 100) / 100;
    }

    // 3. Annual Combined Avg
    let annualAvg = 0;
    if (currentClass.annualRankEdits?.[s.num]?.annualAvg !== undefined) {
      annualAvg = currentClass.annualRankEdits[s.num].annualAvg;
    } else {
      if (sem1Avg > 0 && sem2Avg > 0) {
        annualAvg = Math.round(((sem1Avg + sem2Avg) / 2) * 100) / 100;
      } else if (sem1Avg > 0) {
        annualAvg = sem1Avg;
      } else if (sem2Avg > 0) {
        annualAvg = sem2Avg;
      }
    }

    // 4. Other
    let other = "";
    if (currentClass.annualRankEdits?.[s.num]?.other !== undefined) {
      other = currentClass.annualRankEdits[s.num].other;
    } else {
      if (annualAvg >= 5.0) other = "ឡើងថ្នាក់";
    }

    let ln = s.lastName || "";
    let fn = s.firstName || "";
    if (!ln && !fn && s.fullName) {
      const parts = s.fullName.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    } else if (ln && !fn && ln.includes(" ")) {
      const parts = ln.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    } else if (!ln && fn && fn.includes(" ")) {
      const parts = fn.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    }

    let dobFormatted = s.dob || "";
    if (!dobFormatted && (s.dobDay || s.dobMonth || s.dobYear)) {
      dobFormatted = `${s.dobDay || ""}-${s.dobMonth || ""}-${s.dobYear || ""}`;
    }

    return {
      student: s,
      num: s.num || (idx + 1),
      studentId: s.studentId || "-",
      lName: ln,
      fName: fn,
      gender: s.gender || "ប្រុស",
      dobFormatted,
      sem1Avg,
      sem2Avg,
      annualAvg,
      other,
      hasScores: annualAvg > 0,
      rank: "",
      mention: ""
    };
  });

  // Sort descending by annualAvg to get ranks 1, 2, 3...
  const sorted = [...studentRows].sort((a, b) => {
    if (a.hasScores && !b.hasScores) return -1;
    if (!a.hasScores && b.hasScores) return 1;
    if (b.annualAvg !== a.annualAvg) return b.annualAvg - a.annualAvg;
    return a.num - b.num;
  });

  let curRank = 1;
  sorted.forEach((item, idx) => {
    if (idx > 0 && item.annualAvg < sorted[idx - 1].annualAvg) {
      curRank = idx + 1;
    }
    item.rank = item.hasScores ? curRank : "";

    let mention = "";
    if (currentClass.annualRankEdits?.[item.student?.num || item.num]?.mention !== undefined) {
      mention = currentClass.annualRankEdits[item.student?.num || item.num].mention;
    } else {
      if (item.annualAvg >= 8.5) mention = "A";
      else if (item.annualAvg >= 8.0) mention = "B";
      else if (item.annualAvg >= 7.0) mention = "C";
      else if (item.annualAvg >= 6.0) mention = "D";
      else if (item.annualAvg >= 5.0) mention = "E";
      else if (item.hasScores) mention = "F";
    }
    item.mention = mention;
  });

  // Statistics A, B, C, D, E, F
  const stats = {
    A: { total: 0, female: 0, pct: "0.00" },
    B: { total: 0, female: 0, pct: "0.00" },
    C: { total: 0, female: 0, pct: "0.00" },
    D: { total: 0, female: 0, pct: "0.00" },
    E: { total: 0, female: 0, pct: "0.00" },
    F: { total: 0, female: 0, pct: "0.00" }
  };

  let activeStudentCount = 0;
  sorted.forEach(item => {
    if (item.hasScores && item.mention && stats[item.mention]) {
      stats[item.mention].total++;
      if (item.gender === "ស្រី") stats[item.mention].female++;
      activeStudentCount++;
    }
  });

  const totalStudents = students.length;
  const femaleCount = students.filter(s => s.gender === "ស្រី").length;
  const baseCount = activeStudentCount > 0 ? activeStudentCount : totalStudents;
  Object.keys(stats).forEach(k => {
    stats[k].pct = baseCount > 0 ? ((stats[k].total / baseCount) * 100).toFixed(2) : "0.00";
  });

  // Saved Dates & Teacher
  currentClass.annualRankDates = currentClass.annualRankDates || {};
  const savedDates = currentClass.annualRankDates || {};
  const lunarDirector = savedDates.lunarDirector || "ថ្ងៃ ចន្ទ ៩ កើត ខែ អស្សុជ ឆ្នាំ ថោះ បញ្ចស័ក ព.ស ២៥៦៧";
  const solarDirector = savedDates.solarDirector || "បាន្លួង ថ្ងៃទី ២៣ ខែ តុលា ឆ្នាំ ២០២៣";
  const lunarTeacher = savedDates.lunarTeacher || "ថ្ងៃ ចន្ទ ៩ កើត ខែ អស្សុជ ឆ្នាំ ថោះ បញ្ចស័ក ព.ស ២៥៦៧";
  const solarTeacher = savedDates.solarTeacher || "បាន្លួង ថ្ងៃទី ២៣ ខែ តុលា ឆ្នាំ ២០២៣";
  const teacherVal = currentClass.teacher || "ផន ច័ន្ទតារា";

  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  // Row HTML generator - strictly for actual students, NO empty filler rows
  function renderAnnualRow(item, i) {
    return `
      <tr>
        <td class="annual-td-num">${i + 1}</td>
        <td class="annual-td-id">${escapeHtml(item.studentId)}</td>
        <td class="annual-td-lastname" style="border-right: hidden !important;">${escapeHtml(item.lName)}</td>
        <td class="annual-td-firstname" style="border-left: hidden !important;">${escapeHtml(item.fName)}</td>
        <td class="annual-td-gender">${escapeHtml(item.gender)}</td>
        <td class="annual-td-dob">${escapeHtml(item.dobFormatted)}</td>
        <td class="annual-td-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែ" onblur="onAnnualRankCellEdit(this, ${item.student?.num || item.num}, 'sem1Avg')">${item.sem1Avg > 0 ? item.sem1Avg.toFixed(2) : ""}</td>
        <td class="annual-td-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែ" onblur="onAnnualRankCellEdit(this, ${item.student?.num || item.num}, 'sem2Avg')">${item.sem2Avg > 0 ? item.sem2Avg.toFixed(2) : ""}</td>
        <td class="annual-td-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែ" onblur="onAnnualRankCellEdit(this, ${item.student?.num || item.num}, 'annualAvg')">${item.annualAvg > 0 ? item.annualAvg.toFixed(2) : ""}</td>
        <td class="annual-td-rank">${item.rank}</td>
        <td class="annual-td-mention" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែនិទ្ទេស" onblur="onAnnualRankCellEdit(this, ${item.student?.num || item.num}, 'mention')">${escapeHtml(item.mention || "")}</td>
      </tr>
    `;
  }

  // Determine pagination:
  // If totalStudents <= 20: 1 single page!
  // If totalStudents > 20: exactly 2 pages! (Page 1 has up to 26 rows, Page 2 has remaining rows)
  let page1Limit = totalStudents;
  if (totalStudents > 20) {
    if (totalStudents <= 28) {
      page1Limit = Math.ceil(totalStudents * 0.6);
    } else {
      page1Limit = 26;
    }
  }

  let page1RowsHtml = "";
  for (let i = 0; i < page1Limit && i < totalStudents; i++) {
    page1RowsHtml += renderAnnualRow(sorted[i], i);
  }

  let page2RowsHtml = "";
  for (let i = page1Limit; i < totalStudents; i++) {
    page2RowsHtml += renderAnnualRow(sorted[i], i);
  }

  const colGroupHtml = `
    <colgroup>
      <col style="width: 32px;">
      <col style="width: 50px;">
      <col style="width: 70px;">
      <col style="width: 95px;">
      <col style="width: 35px;">
      <col style="width: 95px;">
      <col style="width: 68px;">
      <col style="width: 68px;">
      <col style="width: 68px;">
      <col style="width: 85px;">
      <col style="width: 56px;">
    </colgroup>
  `;

  const headerHtml = `
    <!-- HEADER -->
    <div class="annual-header-wrap">
      <div class="annual-kingdom-center">
        <div class="annual-kingdom-title">ព្រះរាជាណាចក្រកម្ពុជា</div>
        <div class="annual-kingdom-motto">ជាតិ  សាសនា  ព្រះមហាក្សត្រ</div>
        <div class="annual-flourish">
          <img src="flourish.png" alt="Flourish" onerror="this.outerHTML='<span style=\'color:#0000cc; font-size:12px;\'>❖━━━━━━ ❖ ━━━━━━❖</span>'">
        </div>
      </div>

      <div class="annual-school-grade-left">
        <div class="annual-school-name" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែឈ្មោះសាលា" onblur="saveSchoolNameDirect(this.innerText)">${escapeHtml(state.db.schoolInfo?.name || "សាលាបឋមសិក្សា បាន្លួង")}</div>
        <div class="annual-grade-name" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែឈ្មោះថ្នាក់">${getCleanGradeDisplay(currentClass.grade)}</div>
      </div>

      <div class="annual-main-title">តារាងចំណាត់ថ្នាក់ប្រចាំឆ្នាំ ( ${academicYear} )</div>
    </div>
  `;

  const footerHtml = `
    <!-- FOOTER: END ROSTER + STATS BRACKET + SIGNATURES -->
    <div class="annual-footer-wrap">
      <div class="annual-roster-end">
        បញ្ឈប់បញ្ជីត្រឹមចំនួនសិស្ស ${pad2(totalStudents)} នាក់ ស្រី ${pad2(femaleCount)} នាក់ ។
      </div>

      <!-- STATS WITH SVG BRACKET -->
      <div class="annual-stats-container">
        <div class="annual-stats-title">សរុបសិស្សបានមធ្យមភាគ</div>
        <div class="annual-stats-bracket">
          <svg width="18" height="130" viewBox="0 0 18 130" fill="none" style="stroke: #0000cc; stroke-width: 1.6;">
            <path d="M 16 2 C 8 2, 3 6, 3 14 L 3 58 C 3 63, 0 65, 0 65 C 0 65, 3 67, 3 72 L 3 116 C 3 124, 8 128, 16 128" />
          </svg>
        </div>
        <div class="annual-stats-list">
          <div class="annual-stat-row">
            <span class="annual-stat-grade">និទ្ទេស A</span>
            <span class="annual-stat-have">មាន</span>
            <span class="annual-stat-total">${pad2(stats.A.total)} នាក់</span>
            <span class="annual-stat-female">ស្រី ${pad2(stats.A.female)} នាក់</span>
            <span class="annual-stat-eq">ត្រូវជា</span>
            <span class="annual-stat-pct annual-pct-red">${stats.A.pct}%</span>
          </div>
          <div class="annual-stat-row">
            <span class="annual-stat-grade">និទ្ទេស B</span>
            <span class="annual-stat-have">មាន</span>
            <span class="annual-stat-total">${pad2(stats.B.total)} នាក់</span>
            <span class="annual-stat-female">ស្រី ${pad2(stats.B.female)} នាក់</span>
            <span class="annual-stat-eq">ត្រូវជា</span>
            <span class="annual-stat-pct annual-pct-red">${stats.B.pct}%</span>
          </div>
          <div class="annual-stat-row">
            <span class="annual-stat-grade">និទ្ទេស C</span>
            <span class="annual-stat-have">មាន</span>
            <span class="annual-stat-total">${pad2(stats.C.total)} នាក់</span>
            <span class="annual-stat-female">ស្រី ${pad2(stats.C.female)} នាក់</span>
            <span class="annual-stat-eq">ត្រូវជា</span>
            <span class="annual-stat-pct annual-pct-red">${stats.C.pct}%</span>
          </div>
          <div class="annual-stat-row">
            <span class="annual-stat-grade">និទ្ទេស D</span>
            <span class="annual-stat-have">មាន</span>
            <span class="annual-stat-total">${pad2(stats.D.total)} នាក់</span>
            <span class="annual-stat-female">ស្រី ${pad2(stats.D.female)} នាក់</span>
            <span class="annual-stat-eq">ត្រូវជា</span>
            <span class="annual-stat-pct annual-pct-red">${stats.D.pct}%</span>
          </div>
          <div class="annual-stat-row">
            <span class="annual-stat-grade">និទ្ទេស E</span>
            <span class="annual-stat-have">មាន</span>
            <span class="annual-stat-total">${pad2(stats.E.total)} នាក់</span>
            <span class="annual-stat-female">ស្រី ${pad2(stats.E.female)} នាក់</span>
            <span class="annual-stat-eq">ត្រូវជា</span>
            <span class="annual-stat-pct annual-pct-red">${stats.E.pct}%</span>
          </div>
          <div class="annual-stat-row">
            <span class="annual-stat-grade">និទ្ទេស F</span>
            <span class="annual-stat-have">មាន</span>
            <span class="annual-stat-total">${pad2(stats.F.total)} នាក់</span>
            <span class="annual-stat-female">ស្រី ${pad2(stats.F.female)} នាក់</span>
            <span class="annual-stat-eq">ត្រូវជា</span>
            <span class="annual-stat-pct annual-pct-red">${stats.F.pct}%</span>
          </div>
        </div>
      </div>

      <!-- SIGNATURES -->
      <div class="annual-signatures-wrap">
        <div class="annual-sig-block">
          <div class="annual-sig-title">បានឃើញ និង ឯកភាព</div>
          <div class="annual-sig-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទ" onblur="saveAnnualRankDate('lunarDirector', this.innerText)">${lunarDirector}</div>
          <div class="annual-sig-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទ" onblur="saveAnnualRankDate('solarDirector', this.innerText)">${solarDirector}</div>
          <div class="annual-sig-role">នាយកសាលា</div>
        </div>

        <div class="annual-sig-block">
          <div class="annual-sig-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទ" onblur="saveAnnualRankDate('lunarTeacher', this.innerText)">${lunarTeacher}</div>
          <div class="annual-sig-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែកាលបរិច្ឆេទ" onblur="saveAnnualRankDate('solarTeacher', this.innerText)">${solarTeacher}</div>
          <div class="annual-sig-role">គ្រូប្រចាំថ្នាក់</div>
          <div class="annual-sig-teacher-name" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែឈ្មោះគ្រូ" onblur="saveAnnualTeacherName(this.innerText)">${teacherVal}</div>
        </div>
      </div>
    </div>
  `;

  let html = "";
  if (totalStudents <= 20) {
    html = `
      <!-- ==================== PAGE 1 (ALL ${totalStudents} ROWS) ==================== -->
      <div class="annual-a4-page" id="printableAnnualRanksPage1">
        ${headerHtml}
        <table class="annual-table">
          ${colGroupHtml}
          <thead>
            <tr>
              <th style="width: 32px;">ល.រ</th>
              <th style="width: 50px;">អត្តលេខ</th>
              <th colspan="2" style="width: 165px;">គោត្តនាម និង នាម</th>
              <th style="width: 35px;">ភេទ</th>
              <th style="width: 95px;">ថ្ងៃ ខែ ឆ្នាំ កំណើត</th>
              <th style="width: 68px;">មធ្យមភាគ<br>ឆមាសទី១</th>
              <th style="width: 68px;">មធ្យមភាគ<br>ឆមាសទី២</th>
              <th style="width: 68px;">មធ្យមភាគ<br>ប្រចាំឆ្នាំ</th>
              <th style="width: 85px;" class="annual-th-red">ចំណាត់<br>ថ្នាក់ប្រចាំឆ្នាំ</th>
              <th style="width: 56px;">និទ្ទេស</th>
            </tr>
          </thead>
          <tbody>
            ${page1RowsHtml}
          </tbody>
        </table>
        ${footerHtml}
      </div>
    `;
  } else {
    html = `
      <!-- ==================== PAGE 1 (ROWS 1 - ${page1Limit}) ==================== -->
      <div class="annual-a4-page" id="printableAnnualRanksPage1">
        ${headerHtml}
        <table class="annual-table">
          ${colGroupHtml}
          <thead>
            <tr>
              <th style="width: 32px;">ល.រ</th>
              <th style="width: 50px;">អត្តលេខ</th>
              <th colspan="2" style="width: 165px;">គោត្តនាម និង នាម</th>
              <th style="width: 35px;">ភេទ</th>
              <th style="width: 95px;">ថ្ងៃ ខែ ឆ្នាំ កំណើត</th>
              <th style="width: 68px;">មធ្យមភាគ<br>ឆមាសទី១</th>
              <th style="width: 68px;">មធ្យមភាគ<br>ឆមាសទី២</th>
              <th style="width: 68px;">មធ្យមភាគ<br>ប្រចាំឆ្នាំ</th>
              <th style="width: 85px;" class="annual-th-red">ចំណាត់<br>ថ្នាក់ប្រចាំឆ្នាំ</th>
              <th style="width: 56px;">និទ្ទេស</th>
            </tr>
          </thead>
          <tbody>
            ${page1RowsHtml}
          </tbody>
        </table>
      </div>

      <!-- ==================== PAGE 2 (ROWS ${page1Limit + 1} - ${totalStudents} + STATS + SIGNATURES) ==================== -->
      <div class="annual-a4-page" id="printableAnnualRanksPage2">
        <table class="annual-table">
          ${colGroupHtml}
          <tbody>
            ${page2RowsHtml}
          </tbody>
        </table>
        ${footerHtml}
      </div>
    `;
  }

  container.innerHTML = html;
}
window.renderAnnualRanks = renderAnnualRanks;


/* ==========================================================================
   OFFICIAL STUDY TRACKING BOOK (សៀវភៅតាមដានការសិក្សា)
   100% True to Official Ministry of Education & Banloung Primary Standard
   ========================================================================== */

const STUDY_BOOK_SUBJECTS = [
  { key: "kh_listen",   name: "សមត្ថភាពស្ដាប់",         defaultSkill: "kh_listen" },
  { key: "kh_write",    name: "សមត្ថភាពសរសេរ",        defaultSkill: "kh_write" },
  { key: "kh_read",     name: "សមត្ថភាពអាន",          defaultSkill: "kh_read" },
  { key: "kh_speak",    name: "សមត្ថភាពនិយាយ",        defaultSkill: "kh_speak" },
  { key: "ma_num",      name: "ចំនួន",                defaultSkill: "ma_num" },
  { key: "ma_meas",     name: "រង្វាស់រង្វាល់",        defaultSkill: "ma_meas" },
  { key: "ma_geom",     name: "ធរណីមាត្រ",            defaultSkill: "ma_geom" },
  { key: "ma_stat",     name: "ស្ថិតិ",                defaultSkill: "ma_stat" },
  { key: "science",     name: "វិទ្យាសាស្ត្រ",          defaultSkill: "science" },
  { key: "social",      name: "សិក្សាសង្គម",           defaultSkill: "social" },
  { key: "pe_home_art", name: "គេហវិទ្យា-អប់រំសិល្បៈ",   defaultSkill: "pe_home_art" },
  { key: "pe_sport",    name: "អប់រំកាយ-កីឡា",        defaultSkill: "pe_sport" },
  { key: "pe_health",   name: "សុខភាព-អនាម័យ",        defaultSkill: "pe_health" },
  { key: "lifeskills",  name: "អប់រំបំណិនជីវិត",       defaultSkill: "lifeskills" },
  { key: "foreign",     name: "ភាសាបរទេស",            defaultSkill: "foreign" }
];

function getCleanStudyBookGrade(grade = "") {
  const g = String(grade || "").trim();
  if (!g) return "១";
  if (g.includes("មត្តេយ្យ")) {
    return "មត្តេយ្យ";
  }
  const match = g.match(/([០-៩\d]+)/);
  if (match) {
    return toKhmerNum(match[1]);
  }
  return g.replace(/^ថ្នាក់ទី\s*/, "").replace(/^ថ្នាក់\s*/, "").trim() || "១";
}
window.getCleanStudyBookGrade = getCleanStudyBookGrade;

/* -------------------------------------------------------------
   MOVABLE TRANSFORM MANAGER FOR STUDY BOOK TEXT BLOCKS
   ------------------------------------------------------------- */
const studyBookTransforms = {};

function getStudyBookTransform(key) {
  if (!studyBookTransforms[key]) {
    let t = { x: 0, y: 0, scale: 1.0, fontSize: null };
    try {
      const saved = localStorage.getItem('banloung_sb_transform_' + key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number') t.x = parsed.x;
        if (typeof parsed.y === 'number') t.y = parsed.y;
        if (typeof parsed.scale === 'number') t.scale = parsed.scale;
        if (typeof parsed.fontSize === 'number') t.fontSize = parsed.fontSize;
      }
    } catch (e) {}
    studyBookTransforms[key] = t;
  }
  return studyBookTransforms[key];
}

function applyStudyBookTransform(el, key) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) el = document.getElementById(key);
  if (!el) return;
  const t = getStudyBookTransform(key);
  el.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
  if (t.fontSize) {
    el.style.fontSize = `${t.fontSize}pt`;
    el.querySelectorAll('*').forEach(child => {
      if (!child.classList.contains('approval-action-toolbar') && !child.classList.contains('approval-drag-handle')) {
        child.style.fontSize = `${t.fontSize}pt`;
      }
    });
  }


}

function saveStudyBookTransform(key) {
  const t = getStudyBookTransform(key);
  try {
    localStorage.setItem('banloung_sb_transform_' + key, JSON.stringify(t));
  } catch (e) {}
}

function changeStudyBookBlockFontSize(delta, key) {
  const t = getStudyBookTransform(key);
  const el = document.getElementById(key);
  const curSize = t.fontSize || 10;
  let newSize = curSize + delta;
  if (newSize < 6) newSize = 6;
  if (newSize > 28) newSize = 28;
  t.fontSize = Math.round(newSize * 10) / 10;
  applyStudyBookTransform(el, key);
  saveStudyBookTransform(key);
}
window.changeStudyBookBlockFontSize = changeStudyBookBlockFontSize;

function resetStudyBookTransform(key) {
  const t = getStudyBookTransform(key);
  t.x = 0;
  t.y = 0;
  t.scale = 1.0;
  t.fontSize = null;
  const el = document.getElementById(key);
  if (el) {
    el.style.transform = '';
    el.style.fontSize = '';
    el.querySelectorAll('*').forEach(child => {
      if (!child.classList.contains('approval-action-toolbar')) {
        child.style.fontSize = '';
      }
    });
  }
  saveStudyBookTransform(key);
}
window.resetStudyBookTransform = resetStudyBookTransform;

function resetAllStudyBookTransforms() {
  const keys = [
    'sb_left_kingdom', 'sb_left_title', 'sb_left_school', 'sb_left_profile', 'sb_left_year',
    'sb_right_kingdom', 'sb_right_school', 'sb_right_grade_month', 'sb_right_student_info', 'sb_right_summary', 'sb_right_signatures'
  ];
  keys.forEach(k => resetStudyBookTransform(k));
  if (typeof showToast === 'function') {
    showToast("✓ បានកំណត់ទីតាំង និងទំហំអក្សរដើមឡើងវិញដោយជោគជ័យ!", "info");
  }
}
window.resetAllStudyBookTransforms = resetAllStudyBookTransforms;

function initStudyBookMovable(elementId, key) {
  const el = document.getElementById(elementId);
  if (!el) return;
  applyStudyBookTransform(el, key);

  let isDragging = false;
  let startX = 0, startY = 0;
  let initX = 0, initY = 0;

  el.onpointerdown = function(e) {
    if (e.target.closest('.approval-action-toolbar') || e.target.closest('[contenteditable="true"]')) return;
    isDragging = true;
    el.classList.add('is-dragging');
    startX = e.clientX;
    startY = e.clientY;
    const t = getStudyBookTransform(key);
    initX = t.x;
    initY = t.y;
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  el.onpointermove = function(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const t = getStudyBookTransform(key);
    t.x = Math.round(initX + dx);
    t.y = Math.round(initY + dy);
    applyStudyBookTransform(el, key);
    e.preventDefault();
  };

  el.onpointerup = function(e) {
    if (!isDragging) return;
    isDragging = false;
    el.classList.remove('is-dragging');
    try { el.releasePointerCapture(e.pointerId); } catch(err) {}
    saveStudyBookTransform(key);
  };

  el.onpointercancel = function(e) {
    if (!isDragging) return;
    isDragging = false;
    el.classList.remove('is-dragging');
    try { el.releasePointerCapture(e.pointerId); } catch(err) {}
  };
}

function renderMovableToolbar(blockKey) {
  return `
    <div class="approval-action-toolbar no-print">
      <span class="approval-drag-handle" title="ចុចសង្កត់ដើម្បីអូសផ្លាស់ទី"><i class="fa-solid fa-up-down-left-right"></i></span>
      <button type="button" class="btn-approval-action" onclick="changeStudyBookBlockFontSize(1, '${blockKey}')" title="ពង្រីកទំហំអក្សរ"><i class="fa-solid fa-plus"></i></button>
      <button type="button" class="btn-approval-action" onclick="changeStudyBookBlockFontSize(-1, '${blockKey}')" title="បង្រួមទំហំអក្សរ"><i class="fa-solid fa-minus"></i></button>
      <button type="button" class="btn-approval-action" onclick="resetStudyBookTransform('${blockKey}')" title="កំណត់ទីតាំងដើម (Reset)"><i class="fa-solid fa-rotate-left"></i></button>
    </div>
  `;
}

function buildStudyBookStudentHtml(currentClass, s, monthKey, isBatch = false) {
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";
  const cleanGrade = getCleanStudyBookGrade(currentClass.grade || "ថ្នាក់ទី ៣");

  const studentName = s.fullName || ((s.lastName || "") + " " + (s.firstName || "")).trim() || ("សិស្សទី " + s.num);
  const studentGender = s.gender || "ប្រុស";
  const studentId = s.studentId || s.id || s.num || "";

  // Date of Birth
  let dobStr = s.dobCustom;
  if (!dobStr) {
    if (s.dobDay && s.dobMonth && s.dobYear) {
      dobStr = `ថ្ងៃទី ${toKhmerNum(s.dobDay)} ខែ ${s.dobMonth} ឆ្នាំ ${toKhmerNum(s.dobYear)}`;
    } else {
      dobStr = s.dob || "";
    }
  }

  // Place of Birth
  let pobStr = s.pobCustom;
  if (!pobStr) {
    const parts = [];
    if (s.pobVillage) parts.push("ភូមិ " + s.pobVillage);
    if (s.pobCommune) parts.push("ឃុំ " + s.pobCommune);
    if (s.pobDistrict) parts.push("ស្រុក " + s.pobDistrict);
    if (s.pobProvince) parts.push("ខេត្ត " + s.pobProvince);
    pobStr = parts.length > 0 ? parts.join(" ") : (s.pob || "");
  }

  // Parents
  const fatherName = s.fatherNameCustom || [s.fatherLastName, s.fatherFirstName].filter(Boolean).join(" ") || s.fatherName || "";
  const fatherJob = s.fatherJobCustom || s.fatherJob || "";
  const motherName = s.motherNameCustom || [s.motherLastName, s.motherFirstName].filter(Boolean).join(" ") || s.motherName || "";
  const motherJob = s.motherJobCustom || s.motherJob || "";

  // Address
  let addressStr = s.addrCustom;
  if (!addressStr) {
    const addrParts = [];
    if (s.addrVillage) addrParts.push("ភូមិ " + s.addrVillage);
    if (s.addrCommune) addrParts.push("ឃុំ " + s.addrCommune);
    if (s.addrDistrict) addrParts.push("ស្រុក " + s.addrDistrict);
    if (s.addrProvince) addrParts.push("ខេត្ត " + s.addrProvince);
    addressStr = addrParts.length > 0 ? addrParts.join(" ") : (s.address || "");
  }

  // Ensure data store for study book
  currentClass.studyBookData = currentClass.studyBookData || {};
  currentClass.studyBookData[s.num] = currentClass.studyBookData[s.num] || {};
  currentClass.studyBookData[s.num][monthKey] = currentClass.studyBookData[s.num][monthKey] || {
    grades: {},
    scores: {},
    reinforce: {},
    conduct: "ល្អ"
  };
  const sbRec = currentClass.studyBookData[s.num][monthKey];
  sbRec.grades = sbRec.grades || {};
  sbRec.scores = sbRec.scores || {};
  sbRec.reinforce = sbRec.reinforce || {};

  // Monthly score calculation
  const scoreStats = getStudentMonthAvg(currentClass, monthKey, s);
  const avgVal = scoreStats.avg;
  const rawRec = currentClass.monthlyScores?.[monthKey]?.[s.num] || {};

  // Rank calculation for this month
  let rankVal = "-";
  if (currentClass.students && currentClass.students.length > 0) {
    const allStudentsStats = currentClass.students.map(st => {
      const stAvg = getStudentMonthAvg(currentClass, monthKey, st).avg;
      return { num: st.num, avg: stAvg };
    });
    allStudentsStats.sort((a, b) => b.avg - a.avg);
    let r = 1;
    for (let i = 0; i < allStudentsStats.length; i++) {
      if (i > 0 && allStudentsStats[i].avg < allStudentsStats[i - 1].avg) {
        r = i + 1;
      }
      if (allStudentsStats[i].num === s.num) {
        rankVal = r;
        break;
      }
    }
  }

  // Mention calculation
  let mentionVal = "";
  if (avgVal >= 8.5) mentionVal = "ល្អប្រសើរ";
  else if (avgVal >= 8.0) mentionVal = "ល្អណាស់";
  else if (avgVal >= 7.0) mentionVal = "ល្អ";
  else if (avgVal >= 6.0) mentionVal = "ល្អបង្គួរ";
  else if (avgVal >= 5.0) mentionVal = "មធ្យម";
  else if (avgVal > 0) mentionVal = "ខ្សោយ";
  else mentionVal = "-";

  // Attendance
  let unexcusedCount = 0;
  let excusedCount = 0;
  if (sbRec.unexcused !== undefined) {
    unexcusedCount = sbRec.unexcused;
  } else {
    if (s.attendance) {
      unexcusedCount = s.attendance.unexcused || 0;
    }
  }
  if (sbRec.excused !== undefined) {
    excusedCount = sbRec.excused;
  } else {
    if (s.attendance) {
      excusedCount = s.attendance.excused || 0;
    }
  }
  const totalAbsent = unexcusedCount + excusedCount;
  const conductVal = sbRec.conduct || "ល្អ";

  // Build 15 rows with ACTUAL SCORES in the appropriate grade column
  let tableRowsHtml = "";
  STUDY_BOOK_SUBJECTS.forEach(subj => {
    // 1. Determine actual score
    let scoreVal = sbRec.scores[subj.key];
    if (scoreVal === undefined) {
      const rawScore = parseFloat(rawRec[subj.defaultSkill]);
      if (!isNaN(rawScore) && rawScore > 0) {
        scoreVal = rawScore;
      }
    }

    // 2. Determine grade
    let activeGrade = sbRec.grades[subj.key];
    if (!activeGrade && scoreVal !== undefined) {
      if (scoreVal >= 8.5) activeGrade = "A";
      else if (scoreVal >= 8.0) activeGrade = "B";
      else if (scoreVal >= 7.0) activeGrade = "C";
      else if (scoreVal >= 6.0) activeGrade = "D";
      else if (scoreVal >= 5.0) activeGrade = "E";
      else if (scoreVal > 0) activeGrade = "F";
    }

    const displayScore = (scoreVal !== undefined && scoreVal !== null) ? scoreVal : "";
    const reinforceVal = sbRec.reinforce[subj.key] || "";

    // Build columns for A, B, C, D, E, F
    const gradesList = ['A', 'B', 'C', 'D', 'E', 'F'];
    let gradeCellsHtml = "";
    gradesList.forEach(g => {
      const isMatch = (activeGrade === g);
      const valStr = isMatch ? displayScore : "";
      gradeCellsHtml += `
        <td class="sb-td-grade ${isMatch && valStr !== "" ? 'has-score' : ''}" 
            contenteditable="true" 
            onclick="onStudyBookGradeClick(${s.num}, '${monthKey}', '${subj.key}', '${g}')"
            onblur="saveStudyBookSubjectScore(${s.num}, '${monthKey}', '${subj.key}', '${g}', this.innerText)" 
            onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
          ${valStr}
        </td>
      `;
    });

    tableRowsHtml += `
      <tr>
        <td class="sb-td-subject">${subj.name}</td>
        ${gradeCellsHtml}
        <td class="sb-td-reinforce" contenteditable="true" onblur="saveStudyBookReinforce(${s.num}, '${monthKey}', '${subj.key}', this.innerText)">${reinforceVal}</td>
      </tr>
    `;
  });

  return `
    <div class="study-book-sheet" id="studyBookSheet_${s.num}">
      <!-- ==================== LEFT HALF: COVER & PROFILE ==================== -->
      <div class="study-book-left-card">
        <!-- 1. Header (Movable) -->
        <div id="sb_left_kingdom" class="sb-movable-block" style="text-align: center;">
          ${renderMovableToolbar('sb_left_kingdom')}
          <div class="sb-heading-kingdom">ព្រះរាជាណាចក្រកម្ពុជា</div>
          <div class="sb-heading-motto">ជាតិ  សាសនា  ព្រះមហាក្សត្រ</div>
          <div class="sb-ministry-title">ក្រសួងអប់រំ យុវជន និង កីឡា</div>
        </div>

        <!-- 2. Booklet Title (Movable) -->
        <div id="sb_left_title" class="sb-movable-block" style="text-align: center;">
          ${renderMovableToolbar('sb_left_title')}
          <div class="sb-cover-title">សៀវភៅតាមដានការសិក្សា</div>
        </div>

        <!-- 3. School & Dept Subhead (Movable) -->
        <div id="sb_left_school" class="sb-movable-block">
          ${renderMovableToolbar('sb_left_school')}
          <div class="sb-general-school-title">សាលាបឋមសិក្សាចំណេះទូទៅ</div>
          <div class="sb-sub-school-dept">
            <div>សាលាបឋមសិក្សា បាន្លួង</div>
            <div>ការិយាល័យអប់រំ នៃរដ្ឋបាលស្រុក ព្រៃកប្បាស</div>
          </div>
        </div>

        <!-- 4. Profile Form (Movable) -->
        <div id="sb_left_profile" class="sb-movable-block">
          ${renderMovableToolbar('sb_left_profile')}
          <div class="sb-form-group">
            <div class="sb-form-row">
              <span class="sb-form-label">ឈ្មោះសិស្ស ៖</span>
              <span class="sb-dotted-val" style="flex: 1; font-weight: 700; font-family: var(--font-moul); color: #0000cc;" contenteditable="true" onblur="saveStudyBookProfile(${s.num}, 'fullName', this.innerText)">${studentName}</span>
              <span class="sb-form-label" style="margin-left: 14px;">ភេទ ៖</span>
              <span class="sb-dotted-val" style="width: 55px; text-align: center;" contenteditable="true" onblur="saveStudyBookProfile(${s.num}, 'gender', this.innerText)">${studentGender}</span>
            </div>

            <div class="sb-form-row">
              <span class="sb-form-label">ថ្នាក់ទី ៖</span>
              <span class="sb-dotted-val" style="flex: 1; font-weight: 600;" contenteditable="true" onblur="saveStudyBookProfile(${s.num}, 'gradeCustom', this.innerText)">${cleanGrade}</span>
              <span class="sb-form-label" style="margin-left: 14px;">អត្តលេខ ៖</span>
              <span class="sb-dotted-val" style="width: 85px; text-align: center; font-weight: 600;" contenteditable="true" onblur="saveStudyBookProfile(${s.num}, 'studentId', this.innerText)">${studentId}</span>
            </div>

            <div class="sb-form-row">
              <span class="sb-form-label">ថ្ងៃ ខែ ឆ្នាំកំណើត ៖</span>
              <span class="sb-dotted-val" style="flex: 1;" contenteditable="true" onblur="saveStudyBookProfile(${s.num}, 'dobCustom', this.innerText)">${dobStr}</span>
            </div>

            <div class="sb-form-row">
              <span class="sb-form-label">ទីកន្លែងកំណើត ៖</span>
              <span class="sb-dotted-val" style="flex: 1;" contenteditable="true" onblur="saveStudyBookProfile(${s.num}, 'pobCustom', this.innerText)">${pobStr}</span>
            </div>

            <div class="sb-form-row">
              <span class="sb-form-label">ឈ្មោះឪពុក ៖</span>
              <span class="sb-dotted-val" style="flex: 1;" contenteditable="true" onblur="saveStudyBookProfile(${s.num}, 'fatherNameCustom', this.innerText)">${fatherName}</span>
              <span class="sb-form-label" style="margin-left: 10px;">មុខរបរ ៖</span>
              <span class="sb-dotted-val" style="flex: 1;" contenteditable="true" onblur="saveStudyBookProfile(${s.num}, 'fatherJobCustom', this.innerText)">${fatherJob}</span>
            </div>

            <div class="sb-form-row">
              <span class="sb-form-label">ឈ្មោះម្ដាយ ៖</span>
              <span class="sb-dotted-val" style="flex: 1;" contenteditable="true" onblur="saveStudyBookProfile(${s.num}, 'motherNameCustom', this.innerText)">${motherName}</span>
              <span class="sb-form-label" style="margin-left: 10px;">មុខរបរ ៖</span>
              <span class="sb-dotted-val" style="flex: 1;" contenteditable="true" onblur="saveStudyBookProfile(${s.num}, 'motherJobCustom', this.innerText)">${motherJob}</span>
            </div>

            <div class="sb-form-row">
              <span class="sb-form-label">អាស័យដ្ឋានបច្ចុប្បន្ន ៖</span>
              <span class="sb-dotted-val" style="flex: 1;" contenteditable="true" onblur="saveStudyBookProfile(${s.num}, 'addrCustom', this.innerText)">${addressStr}</span>
            </div>
          </div>
        </div>

        <!-- 5. Academic Year (Movable) -->
        <div id="sb_left_year" class="sb-movable-block" style="text-align: center;">
          ${renderMovableToolbar('sb_left_year')}
          <div class="sb-cover-year">ឆ្នាំសិក្សា ${academicYear}</div>
        </div>
      </div>

      <!-- ==================== RIGHT HALF: MONTHLY EVALUATION ==================== -->
      <div class="study-book-right-card">
        <!-- 6. Right Kingdom Header (Movable) -->
        <div id="sb_right_kingdom" class="sb-movable-block" style="text-align: center;">
          ${renderMovableToolbar('sb_right_kingdom')}
          <div class="sb-right-header-wrap">
            <div class="sb-right-kingdom">ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div class="sb-right-motto">ជាតិ  សាសនា  ព្រះមហាក្សត្រ</div>
          </div>
        </div>

        <!-- 6b. Right School & Dept (Movable, left-aligned) -->
        <div id="sb_right_school" class="sb-movable-block">
          ${renderMovableToolbar('sb_right_school')}
          <div class="sb-right-dept-wrap">
            <div class="sb-right-dept">ការិយាល័យអប់រំ នៃរដ្ឋបាលស្រុក ព្រៃកប្បាស</div>
            <div class="sb-right-school">សាលាបឋមសិក្សា បាន្លួង</div>
          </div>
        </div>

        <!-- 7. Grade & Month Subhead (Movable) -->
        <div id="sb_right_grade_month" class="sb-movable-block">
          ${renderMovableToolbar('sb_right_grade_month')}
          <div class="sb-right-grade-month">
            <div class="sb-grade-tag">ថ្នាក់ទី ៖ <span style="font-family: var(--font-moul); color: #0000cc;">${cleanGrade}</span></div>
            <div class="sb-month-result-title">លទ្ធផលនៃការសិក្សារបស់សិស្សប្រចាំខែ ៖ <span style="font-family: var(--font-moul); color: #0000cc;">${monthKey}</span></div>
          </div>
        </div>

        <!-- 8. Student Meta Line (Movable) -->
        <div id="sb_right_student_info" class="sb-movable-block">
          ${renderMovableToolbar('sb_right_student_info')}
          <div class="sb-right-student-info">
            <div>លេខរៀងទី ៖ <strong>${toKhmerNum(s.num)}</strong></div>
            <div>ឈ្មោះសិស្ស ៖ <strong style="font-family: var(--font-moul); color: #0000cc;">${studentName}</strong></div>
            <div>ភេទ ៖ <strong>${studentGender}</strong></div>
            <div>អត្តលេខ ៖ <strong>${toKhmerNum(studentId)}</strong></div>
          </div>
        </div>

        <!-- Evaluation Table (Middle Fixed) -->
        <table class="sb-eval-table">
          <thead>
            <tr>
              <th rowspan="2" class="sb-th-subject" style="width: 35%;">មុខវិជ្ជា</th>
              <th colspan="6" class="sb-th-grades" style="width: 42%;">និទ្ទេស</th>
              <th rowspan="2" class="sb-th-reinforce" style="width: 23%;">ចំណុចដែលត្រូវ<br>ជួយពង្រឹងបន្ថែម</th>
            </tr>
            <tr>
              <th class="sb-th-grade-col" style="width: 7.0%;">A</th>
              <th class="sb-th-grade-col" style="width: 7.0%;">B</th>
              <th class="sb-th-grade-col" style="width: 7.0%;">C</th>
              <th class="sb-th-grade-col" style="width: 7.0%;">D</th>
              <th class="sb-th-grade-col" style="width: 7.0%;">E</th>
              <th class="sb-th-grade-col" style="width: 7.0%;">F</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <!-- 9. Summary Metrics (Movable) -->
        <div id="sb_right_summary" class="sb-movable-block">
          ${renderMovableToolbar('sb_right_summary')}
          <div class="sb-summary-wrap">
            <div class="sb-summary-row1">
              <div>មធ្យមភាគ ៖ <strong style="color: #0000cc;">${toKhmerNum(avgVal)}</strong></div>
              <div>ចំណាត់ថ្នាក់ ៖ <strong style="color: #dc2626;">${toKhmerNum(rankVal)}</strong></div>
              <div>និទ្ទេស ៖ <strong style="color: #0000cc;">${mentionVal}</strong></div>
            </div>

            <div class="sb-summary-row2" style="margin-top: 3px;">
              <div>អវត្តមាន(អ.ច្ប) ៖ <strong style="color: #000000;">${toKhmerNum(unexcusedCount)}</strong> ដង</div>
              <div>អវត្តមាន(ច្ប) ៖ <strong style="color: #000000;">${toKhmerNum(excusedCount)}</strong> ដង</div>
              <div>អវត្តមានសរុប ៖ <strong style="color: #000000;">${toKhmerNum(totalAbsent)}</strong> ដង</div>
            </div>

            <div class="sb-summary-row3" style="display: flex; align-items: baseline; gap: 6px; margin-top: 3px;">
              <span style="white-space: nowrap;">វិន័យ និង សីលធម៌ ៖</span>
              <span class="sb-dotted-val" style="flex: 1;" contenteditable="true" onblur="saveStudyBookField(${s.num}, '${monthKey}', 'conduct', this.innerText)">${conductVal}</span>
            </div>
          </div>
        </div>

        <!-- 10. Signatures (Movable) -->
        <div id="sb_right_signatures" class="sb-movable-block">
          ${renderMovableToolbar('sb_right_signatures')}
          <div class="sb-signatures-wrap">
            <div class="sb-sig-block" style="text-align: center; flex: 1;">
              <div>បានឃើញ និង ឯកភាព</div>
              <div style="font-weight: 700; margin-top: 2px;">នាយកសាលា</div>
              <div style="height: 38px;"></div>
            </div>
            <div class="sb-sig-block" style="text-align: center; flex: 1.2;">
              <div>មតិរបស់មាតាបិតាសិស្ស</div>
              <div style="height: 48px;"></div>
            </div>
            <div class="sb-sig-block" style="text-align: center; flex: 1;">
              <div>គ្រូប្រចាំថ្នាក់</div>
              <div style="height: 48px;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStudyBook() {
  const container = document.getElementById("studyBookContentWrap");
  if (!container) return;

  const classSelect = document.querySelector("#tab-study_book .class-select-input");
  if (classSelect && classSelect.options.length === 0) {
    updateClassSelectOptions();
  }

  let currentClass = getActiveClass();

  // Fallback to active class with students
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    const candidate = (state.db && state.db.classes ? state.db.classes : []).find(
      c => c.academicYear === (state.activeYear || "២០២៦-២០២៧") && c.students && c.students.length > 0
    );
    if (candidate) {
      currentClass = candidate;
      state.activeClassId = candidate.id;
      const classSelects = document.querySelectorAll(".class-select-input");
      classSelects.forEach(sel => sel.value = candidate.id);
    }
  }

  if (currentClass && classSelect && classSelect.value !== currentClass.id) {
    classSelect.value = currentClass.id;
  }

  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">មិនមានទិន្នន័យសិស្សក្នុងថ្នាក់នេះទេ</p>`;
    return;
  }

  const students = currentClass.students;
  const monthKey = state.activeStudyBookMonth || "ធ្នូ";

  // Sync Month Select
  const monthSelect = document.getElementById("studyBookMonthSelect");
  if (monthSelect) {
    monthSelect.value = monthKey;
  }

  // Ensure active student
  if (!state.activeStudyBookStudentNum || !students.some(s => s.num === state.activeStudyBookStudentNum)) {
    state.activeStudyBookStudentNum = students[0].num;
  }

  // Populate Student Dropdown
  const studentSelect = document.getElementById("studyBookStudentSelect");
  if (studentSelect) {
    studentSelect.innerHTML = "";
    students.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.num;
      const sName = s.fullName || ((s.lastName || "") + " " + (s.firstName || "")).trim();
      opt.textContent = `${toKhmerNum(s.num)}. ${sName} (${s.gender || 'ប្រុស'})`;
      if (s.num === state.activeStudyBookStudentNum) opt.selected = true;
      studentSelect.appendChild(opt);
    });
  }

  const currentStudent = students.find(s => s.num === state.activeStudyBookStudentNum) || students[0];
  container.innerHTML = buildStudyBookStudentHtml(currentClass, currentStudent, monthKey, false);

  // Initialize movable listeners for all 11 text blocks
  const movableKeys = [
    'sb_left_kingdom', 'sb_left_title', 'sb_left_school', 'sb_left_profile', 'sb_left_year',
    'sb_right_kingdom', 'sb_right_school', 'sb_right_grade_month', 'sb_right_student_info', 'sb_right_summary', 'sb_right_signatures'
  ];
  movableKeys.forEach(k => initStudyBookMovable(k, k));
}
window.renderStudyBook = renderStudyBook;

function changeStudyBookMonth(val) {
  state.activeStudyBookMonth = val;
  renderStudyBook();
}
window.changeStudyBookMonth = changeStudyBookMonth;

function changeStudyBookStudent(val) {
  state.activeStudyBookStudentNum = parseInt(val);
  renderStudyBook();
}
window.changeStudyBookStudent = changeStudyBookStudent;

function prevStudyBookStudent() {
  const currentClass = getActiveClass();
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) return;
  const students = currentClass.students;
  let idx = students.findIndex(s => s.num === state.activeStudyBookStudentNum);
  if (idx <= 0) idx = students.length - 1;
  else idx--;
  state.activeStudyBookStudentNum = students[idx].num;
  renderStudyBook();
}
window.prevStudyBookStudent = prevStudyBookStudent;

function nextStudyBookStudent() {
  const currentClass = getActiveClass();
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) return;
  const students = currentClass.students;
  let idx = students.findIndex(s => s.num === state.activeStudyBookStudentNum);
  if (idx === -1 || idx >= students.length - 1) idx = 0;
  else idx++;
  state.activeStudyBookStudentNum = students[idx].num;
  renderStudyBook();
}
window.nextStudyBookStudent = nextStudyBookStudent;

function onStudyBookGradeClick(studentNum, monthKey, subjKey, targetGrade) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  currentClass.studyBookData = currentClass.studyBookData || {};
  currentClass.studyBookData[studentNum] = currentClass.studyBookData[studentNum] || {};
  currentClass.studyBookData[studentNum][monthKey] = currentClass.studyBookData[studentNum][monthKey] || { grades: {}, scores: {}, reinforce: {}, conduct: "ល្អ" };
  const sbRec = currentClass.studyBookData[studentNum][monthKey];
  sbRec.grades = sbRec.grades || {};
  sbRec.scores = sbRec.scores || {};

  // If already this grade, allow editing inside without re-rendering
  if (sbRec.grades[subjKey] === targetGrade) return;

  const rawRec = currentClass.monthlyScores?.[monthKey]?.[studentNum] || {};
  const subjObj = STUDY_BOOK_SUBJECTS.find(s => s.key === subjKey);
  const currentScore = sbRec.scores[subjKey] !== undefined ? sbRec.scores[subjKey] : 
                       (rawRec[subjObj.defaultSkill] !== undefined ? rawRec[subjObj.defaultSkill] : 
                       (targetGrade === 'A' ? 9 : targetGrade === 'B' ? 8 : targetGrade === 'C' ? 7 : targetGrade === 'D' ? 6 : targetGrade === 'E' ? 5 : 4));

  sbRec.grades[subjKey] = targetGrade;
  sbRec.scores[subjKey] = currentScore;
  saveDatabase();
  renderStudyBook();
}
window.onStudyBookGradeClick = onStudyBookGradeClick;

function saveStudyBookSubjectScore(studentNum, monthKey, subjKey, grade, val) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  currentClass.studyBookData = currentClass.studyBookData || {};
  currentClass.studyBookData[studentNum] = currentClass.studyBookData[studentNum] || {};
  currentClass.studyBookData[studentNum][monthKey] = currentClass.studyBookData[studentNum][monthKey] || { grades: {}, scores: {}, reinforce: {}, conduct: "ល្អ" };
  const sbRec = currentClass.studyBookData[studentNum][monthKey];
  sbRec.grades = sbRec.grades || {};
  sbRec.scores = sbRec.scores || {};

  const cleanVal = (val || "").trim();
  const num = parseFloat(cleanVal);
  if (!isNaN(num)) {
    sbRec.scores[subjKey] = num;
    sbRec.grades[subjKey] = grade;

    // Sync to monthlyScores
    const subjObj = STUDY_BOOK_SUBJECTS.find(s => s.key === subjKey);
    if (subjObj && subjObj.defaultSkill) {
      currentClass.monthlyScores = currentClass.monthlyScores || {};
      currentClass.monthlyScores[monthKey] = currentClass.monthlyScores[monthKey] || {};
      currentClass.monthlyScores[monthKey][studentNum] = currentClass.monthlyScores[monthKey][studentNum] || {};
      currentClass.monthlyScores[monthKey][studentNum][subjObj.defaultSkill] = num;
    }
  } else if (!cleanVal) {
    delete sbRec.scores[subjKey];
    delete sbRec.grades[subjKey];
  }
  saveDatabase();
  renderStudyBook();
}
window.saveStudyBookSubjectScore = saveStudyBookSubjectScore;

function saveStudyBookReinforce(studentNum, monthKey, subjKey, text) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  currentClass.studyBookData = currentClass.studyBookData || {};
  currentClass.studyBookData[studentNum] = currentClass.studyBookData[studentNum] || {};
  currentClass.studyBookData[studentNum][monthKey] = currentClass.studyBookData[studentNum][monthKey] || { grades: {}, scores: {}, reinforce: {}, conduct: "ល្អ" };
  currentClass.studyBookData[studentNum][monthKey].reinforce[subjKey] = (text || "").trim();
  saveDatabase();
}
window.saveStudyBookReinforce = saveStudyBookReinforce;

function saveStudyBookField(studentNum, monthKey, field, text) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  currentClass.studyBookData = currentClass.studyBookData || {};
  currentClass.studyBookData[studentNum] = currentClass.studyBookData[studentNum] || {};
  currentClass.studyBookData[studentNum][monthKey] = currentClass.studyBookData[studentNum][monthKey] || { grades: {}, scores: {}, reinforce: {}, conduct: "ល្អ" };
  currentClass.studyBookData[studentNum][monthKey][field] = (text || "").trim();
  saveDatabase();
}
window.saveStudyBookField = saveStudyBookField;

function saveStudyBookProfile(studentNum, field, text) {
  const currentClass = getActiveClass();
  if (!currentClass || !currentClass.students) return;
  const s = currentClass.students.find(st => st.num === studentNum);
  if (!s) return;
  s[field] = (text || "").trim();
  saveDatabase();
}
window.saveStudyBookProfile = saveStudyBookProfile;

function printStudyBookCurrent() {
  prepareAdminPrint("study_book");
  window.print();
}
window.printStudyBookCurrent = printStudyBookCurrent;

function printStudyBookAll() {
  const currentClass = getActiveClass();
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    alert("គ្មានទិន្នន័យសិស្សសម្រាប់បោះពុម្ព");
    return;
  }
  const container = document.getElementById("studyBookContentWrap");
  if (!container) return;

  const monthKey = state.activeStudyBookMonth || "ធ្នូ";
  const originalStudentNum = state.activeStudyBookStudentNum;

  // Render all students' sheets
  let allHtml = "";
  currentClass.students.forEach(s => {
    allHtml += buildStudyBookStudentHtml(currentClass, s, monthKey, true);
  });
  container.innerHTML = allHtml;

  prepareAdminPrint("study_book");

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      state.activeStudyBookStudentNum = originalStudentNum;
      renderStudyBook();
    }, 1000);
  }, 300);
}
window.printStudyBookAll = printStudyBookAll;

function exportStudyBookExcel() {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const students = currentClass.students || [];
  const monthKey = state.activeStudyBookMonth || "ធ្នូ";
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";

  if (typeof XLSX === "undefined") {
    alert("សូមរង់ចាំបណ្ណាល័យ XLSX ដំណើរការពេញលេញ");
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsData = [];

  wsData.push(["ព្រះរាជាណាចក្រកម្ពុជា", "", "", "", "", "ជាតិ សាសនា ព្រះមហាក្សត្រ"]);
  wsData.push(["ការិយាល័យអប់រំ នៃរដ្ឋបាលស្រុក ព្រៃកប្បាស"]);
  wsData.push(["សាលាបឋមសិក្សា បាន្លួង"]);
  wsData.push([`ថ្នាក់ទី ៖ ${getCleanStudyBookGrade(currentClass.grade || "ថ្នាក់ទី ៣")}`, "", `លទ្ធផលនៃការសិក្សាប្រចាំខែ ៖ ${monthKey}`]);
  wsData.push([`ឆ្នាំសិក្សា ៖ ${academicYear}`, "", `សិស្សសរុប ៖ ${students.length} នាក់`]);
  wsData.push([""]);

  const headerRow = ["ល.រ", "អត្តលេខ", "គោត្តនាម និង នាម", "ភេទ", "ថ្ងៃ ខែ ឆ្នាំកំណើត"];
  STUDY_BOOK_SUBJECTS.forEach(sub => {
    headerRow.push(sub.name);
  });
  headerRow.push("មធ្យមភាគ", "ចំណាត់ថ្នាក់", "និទ្ទេស", "អវត្តមាន អ.ច្ប", "អវត្តមាន ច្ប", "អវត្តមានសរុប", "វិន័យ និង សីលធម៌");
  wsData.push(headerRow);

  students.forEach(s => {
    const sName = s.fullName || ((s.lastName || "") + " " + (s.firstName || "")).trim();
    const scoreStats = getStudentMonthAvg(currentClass, monthKey, s);
    const avgVal = scoreStats.avg;
    const rawRec = currentClass.monthlyScores?.[monthKey]?.[s.num] || {};
    const sbRec = currentClass.studyBookData?.[s.num]?.[monthKey] || { grades: {}, scores: {}, reinforce: {}, conduct: "ល្អ" };

    const row = [
      s.num,
      s.studentId || s.num,
      sName,
      s.gender || "ប្រុស",
      s.dob || (s.dobDay ? `${s.dobDay}-${s.dobMonth}-${s.dobYear}` : "")
    ];

    STUDY_BOOK_SUBJECTS.forEach(sub => {
      let scoreVal = sbRec.scores?.[sub.key];
      if (scoreVal === undefined) {
        const sc = parseFloat(rawRec[sub.defaultSkill]);
        if (!isNaN(sc) && sc > 0) scoreVal = sc;
      }
      row.push(scoreVal !== undefined ? scoreVal : "-");
    });

    row.push(avgVal);
    row.push(s.rank || "-");
    row.push(s.mention || "-");
    row.push(sbRec.unexcused !== undefined ? sbRec.unexcused : (s.attendance?.unexcused || 0));
    row.push(sbRec.excused !== undefined ? sbRec.excused : (s.attendance?.excused || 0));
    const totalAbs = (row[row.length - 2] || 0) + (row[row.length - 1] || 0);
    row.push(totalAbs);
    row.push(sbRec.conduct || "ល្អ");

    wsData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "សៀវភៅតាមដាន");
  const fileName = `សៀវភៅតាមដានការសិក្សា_ថ្នាក់${getCleanStudyBookGrade(currentClass.grade || "ថ្នាក់")}_ខែ${monthKey}_${academicYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
window.exportStudyBookExcel = exportStudyBookExcel;


/* ==========================================================================
   TRAINEE BOOK MODULE (សៀវភៅសិក្ខាគារិក)
   100% Match to Ministry Sample: Pastel Green Background (#d9ead3),
   Dark Green Borders (#274e13), Yellow Ribbon Badge, Red Accents
   ========================================================================== */

function pad2Trainee(num) {
  return String(num || 0).padStart(2, "0");
}

const TRAINEE_SUBJECTS = [
  { key: "moral",          name: "សុភាវធម៌ និង ពលរដ្ឋវិជ្ជា",    semKey: "moral" },
  { key: "kh_read",        name: "រៀនអាន និង មេសូត្រ",        semKey: "kh_read" },
  { key: "math",           name: "គណិតវិទ្យា",                semKey: "math" },
  { key: "kh_calligraphy", name: "អក្សរផ្ចង់",                semKey: "kh_dictation" },
  { key: "drawing_craft",  name: "គំនូរ និង ហត្ថកម្ម",          semKey: "drawing" },
  { key: "kh_dictation",   name: "សរសេរតាមអាន និង សំណួរ",     semKey: "kh_dictation" },
  { key: "kh_essay",       name: "តែងសេចក្ដី",                semKey: "kh_essay" },
  { key: "science",        name: "វិទ្យាសាស្ត្រអនុវត្ត",         semKey: "science" },
  { key: "geography",      name: "ភូមិវិទ្យា",                semKey: "geography" },
  { key: "history",        name: "ប្រវត្តិវិទ្យា",               semKey: "history" },
  { key: "sport",          name: "អប់រំកាយ និង កីឡា",        semKey: "sport" },
  { key: "foreign",        name: "ភាសាបរទេស",                semKey: "lifeskills" }
];

function getTraineeMention(avg) {
  const v = parseFloat(avg);
  if (isNaN(v) || v <= 0) return "";
  if (v >= 9.0) return "ល្អណាស់";
  if (v >= 8.0) return "ល្អប្រសើរ";
  if (v >= 7.0) return "ល្អ";
  if (v >= 6.0) return "ល្អបង្គួរ";
  if (v >= 5.0) return "មធ្យម";
  return "ខ្សោយ";
}
window.getTraineeMention = getTraineeMention;

function getStudentTraineeData(currentClass, studentNum) {
  currentClass.traineeData = currentClass.traineeData || {};
  if (!currentClass.traineeData[studentNum]) {
    currentClass.traineeData[studentNum] = {
      sem1Scores: {},
      sem1Ranks: {},
      sem2Scores: {},
      sem2Ranks: {},
      evalRows: ["", "", ""],
      annualPromoted: "",
      annualReexam: "",
      annualRepeat: "",
      praise: "",
      improve: "",
      dateStr: ""
    };
  }
  return currentClass.traineeData[studentNum];
}

function saveTraineeField(studentNum, fieldKey, value) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const data = getStudentTraineeData(currentClass, studentNum);
  data[fieldKey] = value;
  saveDb();
}
window.saveTraineeField = saveTraineeField;

function saveTraineeNestedField(studentNum, parentKey, subKey, value) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const data = getStudentTraineeData(currentClass, studentNum);
  data[parentKey] = data[parentKey] || {};
  data[parentKey][subKey] = value;
  saveDb();
}
window.saveTraineeNestedField = saveTraineeNestedField;

function getTraineeStudentComputed(currentClass, s) {
  const tData = getStudentTraineeData(currentClass, s.num);
  const sem1Data = getStudentSemesterExamScores(currentClass, "1", s);
  const sem2Data = getStudentSemesterExamScores(currentClass, "2", s);
  const sem1Rec = sem1Data.rec || {};
  const sem2Rec = sem2Data.rec || {};

  // Subject scores
  const sem1Scores = {};
  const sem2Scores = {};
  let calcTotal1 = 0, calcCount1 = 0;
  let calcTotal2 = 0, calcCount2 = 0;

  TRAINEE_SUBJECTS.forEach(sub => {
    let s1 = tData.sem1Scores ? tData.sem1Scores[sub.key] : undefined;
    if (s1 === undefined || s1 === null || s1 === "") {
      const r1 = parseFloat(sem1Rec[sub.semKey]);
      s1 = (!isNaN(r1) && r1 > 0) ? r1 : 0;
    } else {
      s1 = parseFloat(s1) || 0;
    }
    sem1Scores[sub.key] = s1;
    if (s1 > 0) { calcTotal1 += s1; calcCount1++; }

    let s2 = tData.sem2Scores ? tData.sem2Scores[sub.key] : undefined;
    if (s2 === undefined || s2 === null || s2 === "") {
      const r2 = parseFloat(sem2Rec[sub.semKey]);
      s2 = (!isNaN(r2) && r2 > 0) ? r2 : 0;
    } else {
      s2 = parseFloat(s2) || 0;
    }
    sem2Scores[sub.key] = s2;
    if (s2 > 0) { calcTotal2 += s2; calcCount2++; }
  });

  const s1Total = calcCount1 > 0 ? Math.round(calcTotal1 * 100) / 100 : (sem1Data.total || 0);
  const s1Avg = calcCount1 > 0 ? Math.round((calcTotal1 / calcCount1) * 100) / 100 : (sem1Data.avg || 0);
  const s2Total = calcCount2 > 0 ? Math.round(calcTotal2 * 100) / 100 : (sem2Data.total || 0);
  const s2Avg = calcCount2 > 0 ? Math.round((calcTotal2 / calcCount2) * 100) / 100 : (sem2Data.avg || 0);

  const sem1Months = ["តុលា", "វិច្ឆិកា", "ធ្នូ", "មករា", "កុម្ភៈ"];
  const sem2Months = ["មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា"];

  let mTotal1 = 0, mCount1 = 0;
  sem1Months.forEach(m => {
    const stats = getStudentMonthAvg(currentClass, m, s);
    if (stats.avg > 0) { mTotal1 += stats.avg; mCount1++; }
  });
  const monthAvg1 = mCount1 > 0 ? Math.round((mTotal1 / mCount1) * 100) / 100 : s1Avg;

  let mTotal2 = 0, mCount2 = 0;
  sem2Months.forEach(m => {
    const stats = getStudentMonthAvg(currentClass, m, s);
    if (stats.avg > 0) { mTotal2 += stats.avg; mCount2++; }
  });
  const monthAvg2 = mCount2 > 0 ? Math.round((mTotal2 / mCount2) * 100) / 100 : s2Avg;

  const semAvg1 = s1Avg > 0 ? Math.round(((monthAvg1 + s1Avg) / 2) * 100) / 100 : monthAvg1;
  const semAvg2 = s2Avg > 0 ? Math.round(((monthAvg2 + s2Avg) / 2) * 100) / 100 : monthAvg2;
  const annualAvg = (semAvg1 > 0 && semAvg2 > 0) ? Math.round(((semAvg1 + semAvg2) / 2) * 100) / 100 : (semAvg1 || semAvg2);

  return {
    num: s.num,
    sem1Scores,
    sem2Scores,
    s1Total,
    s1Avg,
    s2Total,
    s2Avg,
    monthAvg1,
    monthAvg2,
    semAvg1,
    semAvg2,
    annualAvg
  };
}

function computeTraineeClassRankMap(currentClass) {
  const students = currentClass.students || [];
  const computedList = students.map(s => getTraineeStudentComputed(currentClass, s));

  const rankMap = {
    sem1Subjects: {},
    sem2Subjects: {},
    sem1Avg: {},
    sem2Avg: {},
    annualAvg: {},
    computedByNum: {}
  };

  computedList.forEach(item => {
    rankMap.computedByNum[item.num] = item;
  });

  // 1. Rank subjects for Sem 1 & Sem 2
  TRAINEE_SUBJECTS.forEach(sub => {
    rankMap.sem1Subjects[sub.key] = {};
    rankMap.sem2Subjects[sub.key] = {};

    // Sem 1
    const s1List = [...computedList].sort((a, b) => (b.sem1Scores[sub.key] || 0) - (a.sem1Scores[sub.key] || 0));
    let curR1 = 1;
    s1List.forEach((it, idx) => {
      const score = it.sem1Scores[sub.key] || 0;
      if (idx > 0 && score < (s1List[idx - 1].sem1Scores[sub.key] || 0)) {
        curR1 = idx + 1;
      }
      rankMap.sem1Subjects[sub.key][it.num] = (score > 0) ? curR1 : "";
    });

    // Sem 2
    const s2List = [...computedList].sort((a, b) => (b.sem2Scores[sub.key] || 0) - (a.sem2Scores[sub.key] || 0));
    let curR2 = 1;
    s2List.forEach((it, idx) => {
      const score = it.sem2Scores[sub.key] || 0;
      if (idx > 0 && score < (s2List[idx - 1].sem2Scores[sub.key] || 0)) {
        curR2 = idx + 1;
      }
      rankMap.sem2Subjects[sub.key][it.num] = (score > 0) ? curR2 : "";
    });
  });

  // 2. Rank Sem 1 Overall Average
  const s1AvgList = [...computedList].sort((a, b) => b.semAvg1 - a.semAvg1);
  let curAvgR1 = 1;
  s1AvgList.forEach((it, idx) => {
    if (idx > 0 && it.semAvg1 < s1AvgList[idx - 1].semAvg1) {
      curAvgR1 = idx + 1;
    }
    rankMap.sem1Avg[it.num] = (it.semAvg1 > 0) ? curAvgR1 : "";
  });

  // 3. Rank Sem 2 Overall Average
  const s2AvgList = [...computedList].sort((a, b) => b.semAvg2 - a.semAvg2);
  let curAvgR2 = 1;
  s2AvgList.forEach((it, idx) => {
    if (idx > 0 && it.semAvg2 < s2AvgList[idx - 1].semAvg2) {
      curAvgR2 = idx + 1;
    }
    rankMap.sem2Avg[it.num] = (it.semAvg2 > 0) ? curAvgR2 : "";
  });

  // 4. Rank Annual Average
  const annAvgList = [...computedList].sort((a, b) => b.annualAvg - a.annualAvg);
  let curAnnR = 1;
  annAvgList.forEach((it, idx) => {
    if (idx > 0 && it.annualAvg < annAvgList[idx - 1].annualAvg) {
      curAnnR = idx + 1;
    }
    rankMap.annualAvg[it.num] = (it.annualAvg > 0) ? curAnnR : "";
  });

  return rankMap;
}

function buildTraineeStudentHtml(currentClass, s, isAllMode = false, classRankMap = null) {
  if (!classRankMap) {
    classRankMap = computeTraineeClassRankMap(currentClass);
  }

  const studentName = s.fullName || ((s.lastName || "") + " " + (s.firstName || "")).trim();
  const studentGender = s.gender || "ប្រុស";
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";
  const schoolName = (state.db && state.db.schoolInfo && state.db.schoolInfo.name) ? state.db.schoolInfo.name : "សាលាបឋមសិក្សា បាន្លួង";
  const teacherName = currentClass.teacher || "ផន ច័ន្ទតារា";
  const cleanGrade = getCleanStudyBookGrade(currentClass.grade || "ថ្នាក់ទី ៣");

  const numVal = parseInt(cleanGrade, 10);
  const nextGradeNum = !isNaN(numVal) ? (numVal + 1) : "";
  const promotedGradeDefault = nextGradeNum ? toKhmerNum(nextGradeNum) : cleanGrade;

  const tData = getStudentTraineeData(currentClass, s.num);
  const cData = classRankMap.computedByNum[s.num] || getTraineeStudentComputed(currentClass, s);

  // Totals & Averages from computed data
  const s1Total = cData.s1Total;
  const s1Avg = cData.s1Avg;
  const s2Total = cData.s2Total;
  const s2Avg = cData.s2Avg;
  const monthAvg1 = cData.monthAvg1;
  const monthAvg2 = cData.monthAvg2;
  const semAvg1 = cData.semAvg1;
  const semAvg2 = cData.semAvg2;
  const annualAvg = cData.annualAvg;

  // Build 12 Subject Rows
  let tableRowsHtml = "";
  TRAINEE_SUBJECTS.forEach((sub, idx) => {
    // Semester 1 score & rank
    let s1Score = tData.sem1Scores ? tData.sem1Scores[sub.key] : "";
    if (s1Score === undefined || s1Score === null || s1Score === "") {
      s1Score = cData.sem1Scores[sub.key] || "";
    }
    let autoS1Rank = classRankMap.sem1Subjects[sub.key]?.[s.num] || "";
    let s1Rank = (tData.sem1Ranks && tData.sem1Ranks[sub.key] !== undefined && tData.sem1Ranks[sub.key] !== "")
      ? tData.sem1Ranks[sub.key]
      : autoS1Rank;

    // Semester 2 score & rank
    let s2Score = tData.sem2Scores ? tData.sem2Scores[sub.key] : "";
    if (s2Score === undefined || s2Score === null || s2Score === "") {
      s2Score = cData.sem2Scores[sub.key] || "";
    }
    let autoS2Rank = classRankMap.sem2Subjects[sub.key]?.[s.num] || "";
    let s2Rank = (tData.sem2Ranks && tData.sem2Ranks[sub.key] !== undefined && tData.sem2Ranks[sub.key] !== "")
      ? tData.sem2Ranks[sub.key]
      : autoS2Rank;

    tableRowsHtml += `
      <tr>
        <td class="td-subj-name">${sub.name}</td>
        <td class="td-editable" contenteditable="true" onblur="saveTraineeNestedField(${s.num}, 'sem1Scores', '${sub.key}', this.innerText)">${s1Score !== "" && s1Score > 0 ? toKhmerNum(s1Score) : ""}</td>
        <td class="td-editable" contenteditable="true" onblur="saveTraineeNestedField(${s.num}, 'sem1Ranks', '${sub.key}', this.innerText)">${s1Rank !== "" ? toKhmerNum(s1Rank) : ""}</td>
        <td class="td-editable" contenteditable="true" onblur="saveTraineeNestedField(${s.num}, 'sem2Scores', '${sub.key}', this.innerText)">${s2Score !== "" && s2Score > 0 ? toKhmerNum(s2Score) : ""}</td>
        <td class="td-editable" contenteditable="true" onblur="saveTraineeNestedField(${s.num}, 'sem2Ranks', '${sub.key}', this.innerText)">${s2Rank !== "" ? toKhmerNum(s2Rank) : ""}</td>
      </tr>
    `;
  });

  // Overall semester ranks
  let autoSem1Rank = classRankMap.sem1Avg[s.num] || "";
  let sem1OverallRank = (tData.sem1Ranks && tData.sem1Ranks["sem_overall"] !== undefined && tData.sem1Ranks["sem_overall"] !== "")
    ? tData.sem1Ranks["sem_overall"]
    : autoSem1Rank;

  let autoSem2Rank = classRankMap.sem2Avg[s.num] || "";
  let sem2OverallRank = (tData.sem2Ranks && tData.sem2Ranks["sem_overall"] !== undefined && tData.sem2Ranks["sem_overall"] !== "")
    ? tData.sem2Ranks["sem_overall"]
    : autoSem2Rank;

  // Annual Rank
  let autoAnnualRank = classRankMap.annualAvg[s.num] || "";
  let annualRankVal = (tData.annualRank !== undefined && tData.annualRank !== "")
    ? tData.annualRank
    : (autoAnnualRank !== "" ? pad2Trainee(autoAnnualRank) : "-");

  // Absences
  const attRec = (currentClass.monthlyAttendance && currentClass.monthlyAttendance[s.num]) ? currentClass.monthlyAttendance[s.num] : {};
  let excused1 = 0, unexcused1 = 0;
  let excused2 = 0, unexcused2 = 0;

  const sem1Months = ["តុលា", "វិច្ឆិកា", "ធ្នូ", "មករា", "កុម្ភៈ"];
  const sem2Months = ["មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា"];

  sem1Months.forEach(m => {
    excused1 += parseInt(attRec[`${m}_p`] || 0, 10);
    unexcused1 += parseInt(attRec[`${m}_a`] || 0, 10);
  });
  sem2Months.forEach(m => {
    excused2 += parseInt(attRec[`${m}_p`] || 0, 10);
    unexcused2 += parseInt(attRec[`${m}_a`] || 0, 10);
  });
  const totalAbsences = excused1 + unexcused1 + excused2 + unexcused2;

  // Evaluation rows (Section C)
  const mention1 = getTraineeMention(semAvg1);
  const mention2 = getTraineeMention(semAvg2);
  const mentionYear = getTraineeMention(annualAvg);

  // Row 1: Averages
  const defaultEval0_1 = semAvg1 > 0 ? `មធ្យមភាគ ៖ ${toKhmerNum(semAvg1)}` : "";
  const defaultEval0_2 = semAvg2 > 0 ? `មធ្យមភាគ ៖ ${toKhmerNum(semAvg2)}` : "";
  const defaultEval0_3 = annualAvg > 0 ? `មធ្យមភាគ ៖ ${toKhmerNum(annualAvg)}` : "";

  const displayEval0_1 = (tData.evalRow0_1 !== undefined && tData.evalRow0_1 !== "") ? tData.evalRow0_1 : defaultEval0_1;
  const displayEval0_2 = (tData.evalRow0_2 !== undefined && tData.evalRow0_2 !== "") ? tData.evalRow0_2 : defaultEval0_2;
  const displayEval0_3 = (tData.evalRow0_3 !== undefined && tData.evalRow0_3 !== "") ? tData.evalRow0_3 : defaultEval0_3;

  // Row 2: Mentions (directly under average)
  const defaultEval1_1 = mention1 ? `និទ្ទេស ៖ ${mention1}` : "";
  const defaultEval1_2 = mention2 ? `និទ្ទេស ៖ ${mention2}` : "";
  const defaultEval1_3 = mentionYear ? `និទ្ទេស ៖ ${mentionYear}` : "";

  const displayEval1_1 = (tData.evalRow1_1 !== undefined && tData.evalRow1_1 !== "") ? tData.evalRow1_1 : defaultEval1_1;
  const displayEval1_2 = (tData.evalRow1_2 !== undefined && tData.evalRow1_2 !== "") ? tData.evalRow1_2 : defaultEval1_2;
  const displayEval1_3 = (tData.evalRow1_3 !== undefined && tData.evalRow1_3 !== "") ? tData.evalRow1_3 : defaultEval1_3;

  // Row 3: Remarks / notes
  const displayEval2_1 = tData.evalRow2_1 || "";
  const displayEval2_2 = tData.evalRow2_2 || "";
  const displayEval2_3 = tData.evalRow2_3 || "";

  // Annual Promoted strings (Section D)
  const promotedText = tData.annualPromoted || promotedGradeDefault;
  const reexamText = tData.annualReexam || "";
  const repeatText = tData.annualRepeat || "";

  // Praise and Improvement (Section E)
  const praiseText = tData.praise || "";
  const improveText = tData.improve || "";

  // Date
  const dateStr = tData.dateStr || "";

  return `
    <div class="trainee-sheet" id="traineeSheet_${s.num}">
      <!-- Top Title Ribbon Badge -->
      <div class="trainee-title-wrap">
        <div class="trainee-title-badge">សៀវភៅសិក្ខាគារិក</div>
      </div>

      <!-- Main Symmetrical Grid (Left Column & Right Column) -->
      <div class="trainee-grid">
        <!-- ==================== LEFT COLUMN ==================== -->
        <div class="trainee-col-left">
          <!-- Student Name & Gender Header Bar -->
          <div class="trainee-name-header">
            <div class="trainee-name-label">នាមត្រកូល និង នាមខ្លួនសិស្ស</div>
            <div class="trainee-name-val-box">
              <span class="trainee-name-pill" contenteditable="true" onblur="saveTraineeField(${s.num}, 'fullName', this.innerText)">${studentName}</span>
            </div>
            <div class="trainee-gender-label">ភេទ</div>
            <div class="trainee-gender-val" contenteditable="true" onblur="saveTraineeField(${s.num}, 'gender', this.innerText)">${studentGender}</div>
          </div>

          <!-- Section A Title -->
          <div class="trainee-sec-title">ក. លទ្ធផលនៃការប្រឡងឆមាស</div>

          <!-- 12-Subject Evaluation Table -->
          <table class="trainee-table-sem">
            <thead>
              <tr>
                <th rowspan="2" style="width: 40%;">មុខវិជ្ជា</th>
                <th colspan="2" style="width: 30%;">ឆមាសទី១</th>
                <th colspan="2" style="width: 30%;">ឆមាសទី២</th>
              </tr>
              <tr>
                <th style="width: 15%;">ពិន្ទុ</th>
                <th style="width: 15%;">ចំណាត់ថ្នាក់</th>
                <th style="width: 15%;">ពិន្ទុ</th>
                <th style="width: 15%;">ចំណាត់ថ្នាក់</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
              <!-- 5 Summary Rows -->
              <tr class="tr-summary">
                <td class="td-subj-name">សរុបពិន្ទុ</td>
                <td>${s1Total > 0 ? toKhmerNum(s1Total) : ""}</td>
                <td></td>
                <td>${s2Total > 0 ? toKhmerNum(s2Total) : ""}</td>
                <td></td>
              </tr>
              <tr class="tr-summary">
                <td class="td-subj-name">មធ្យមភាគ</td>
                <td>${s1Avg > 0 ? toKhmerNum(s1Avg) : ""}</td>
                <td></td>
                <td>${s2Avg > 0 ? toKhmerNum(s2Avg) : ""}</td>
                <td></td>
              </tr>
              <tr class="tr-summary">
                <td class="td-subj-name">មធ្យមភាគប្រចាំខែ</td>
                <td>${monthAvg1 > 0 ? toKhmerNum(monthAvg1) : ""}</td>
                <td></td>
                <td>${monthAvg2 > 0 ? toKhmerNum(monthAvg2) : ""}</td>
                <td></td>
              </tr>
              <tr class="tr-summary">
                <td class="td-subj-name">មធ្យមភាគប្រចាំឆមាស</td>
                <td>${semAvg1 > 0 ? toKhmerNum(semAvg1) : ""}</td>
                <td class="td-editable" contenteditable="true" onblur="saveTraineeNestedField(${s.num}, 'sem1Ranks', 'sem_overall', this.innerText)">${sem1OverallRank !== "" ? toKhmerNum(sem1OverallRank) : ""}</td>
                <td>${semAvg2 > 0 ? toKhmerNum(semAvg2) : ""}</td>
                <td class="td-editable" contenteditable="true" onblur="saveTraineeNestedField(${s.num}, 'sem2Ranks', 'sem_overall', this.innerText)">${sem2OverallRank !== "" ? toKhmerNum(sem2OverallRank) : ""}</td>
              </tr>
              <tr class="tr-year-end">
                <td colspan="5">
                  លទ្ធផលដំណាច់ឆ្នាំ ( មធ្យមភាគ ៖ <strong style="color: #c00000;">${annualAvg > 0 ? toKhmerNum(annualAvg) : "-"}</strong>  -  ចំណាត់ថ្នាក់ ៖ <strong style="color: #c00000;">${annualRankVal !== "-" ? toKhmerNum(annualRankVal) : "-"}</strong> )
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Section B Title -->
          <div class="trainee-sec-title">ខ. ចំនួនពេលអវត្តមាន</div>

          <!-- Absence Table -->
          <table class="trainee-table-att">
            <thead>
              <tr>
                <th colspan="2" style="width: 38%;">ឆមាសទី១</th>
                <th colspan="2" style="width: 38%;">ឆមាសទី២</th>
                <th rowspan="2" style="width: 24%;">សរុបអវត្តមាន</th>
              </tr>
              <tr>
                <th style="width: 19%;">មានច្បាប់</th>
                <th style="width: 19%;">គ្មានច្បាប់</th>
                <th style="width: 19%;">មានច្បាប់</th>
                <th style="width: 19%;">គ្មានច្បាប់</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="td-editable" contenteditable="true">${excused1 > 0 ? toKhmerNum(excused1) : "-"}</td>
                <td class="td-editable" contenteditable="true">${unexcused1 > 0 ? toKhmerNum(unexcused1) : "-"}</td>
                <td class="td-editable" contenteditable="true">${excused2 > 0 ? toKhmerNum(excused2) : "-"}</td>
                <td class="td-editable" contenteditable="true">${unexcused2 > 0 ? toKhmerNum(unexcused2) : "-"}</td>
                <td class="td-editable" contenteditable="true" style="font-weight: 700;">${totalAbsences > 0 ? toKhmerNum(totalAbsences) : "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ==================== RIGHT COLUMN ==================== -->
        <div class="trainee-col-right">
          <!-- School & Year Header Bar -->
          <div class="trainee-school-header">
            <div>${schoolName}</div>
            <div>ឆ្នាំសិក្សា ${academicYear}</div>
          </div>

          <!-- Section C Title -->
          <div class="trainee-sec-title">គ. វាយតម្លៃសិស្សលើការសិក្សា</div>

          <!-- Study Evaluation Table (3 Columns, 3 Rows) -->
          <table class="trainee-table-eval">
            <thead>
              <tr>
                <th style="width: 33.33%;">ឆមាសទី ១</th>
                <th style="width: 33.33%;">ឆមាសទី ២</th>
                <th style="width: 33.34%;">ប្រចាំឆ្នាំ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'evalRow0_1', this.innerText)">${displayEval0_1}</td>
                <td class="td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'evalRow0_2', this.innerText)">${displayEval0_2}</td>
                <td class="td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'evalRow0_3', this.innerText)">${displayEval0_3}</td>
              </tr>
              <tr>
                <td class="td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'evalRow1_1', this.innerText)">${displayEval1_1}</td>
                <td class="td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'evalRow1_2', this.innerText)">${displayEval1_2}</td>
                <td class="td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'evalRow1_3', this.innerText)">${displayEval1_3}</td>
              </tr>
              <tr>
                <td class="td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'evalRow2_1', this.innerText)">${displayEval2_1}</td>
                <td class="td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'evalRow2_2', this.innerText)">${displayEval2_2}</td>
                <td class="td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'evalRow2_3', this.innerText)">${displayEval2_3}</td>
              </tr>
            </tbody>
          </table>

          <!-- Section D Title -->
          <div class="trainee-sec-title">ឃ. ការសម្រេចរបស់ក្រុមប្រឹក្សាវិន័យ និង គរុកោសល្យ</div>

          <!-- Decision Box -->
          <div class="trainee-decision-box">
            <div class="trainee-decision-line">
              <span class="decision-bullet">»</span>
              <span>បានឡើងទៅថ្នាក់ទី ៖</span>
              <span class="decision-fill td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'annualPromoted', this.innerText)">${promotedText}</span>
            </div>
            <div class="trainee-decision-line">
              <span class="decision-bullet">»</span>
              <span>ត្រូវប្រឡងឡើងវិញពីថ្ងៃទី ................ ដល់ ................ ខែ ................ ឆ្នាំ២០... លើមុខវិជ្ជា ៖</span>
              <span class="decision-fill td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'annualReexam', this.innerText)">${reexamText}</span>
            </div>
            <div class="trainee-decision-line">
              <span class="decision-bullet">»</span>
              <span>ត្រូវរៀនត្រួតថ្នាក់ទី ៖</span>
              <span class="decision-fill td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'annualRepeat', this.innerText)">${repeatText}</span>
            </div>
          </div>

          <!-- Section E Title -->
          <div class="trainee-sec-title">ង. ការសរសើរ និង ការកែលម្អ</div>

          <!-- Praise & Improvement Box -->
          <div class="trainee-praise-box">
            <div class="trainee-praise-line">
              <span class="praise-bullet">»</span>
              <span>ការសរសើរ ៖</span>
              <span class="praise-fill td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'praise', this.innerText)">${praiseText}</span>
            </div>
            <div class="trainee-praise-line">
              <span class="praise-bullet">»</span>
              <span>ការកែលម្អ ៖</span>
              <span class="praise-fill td-editable" contenteditable="true" onblur="saveTraineeField(${s.num}, 'improve', this.innerText)">${improveText}</span>
            </div>
          </div>


        </div>
      </div>
    </div>
  `;
}
window.buildTraineeStudentHtml = buildTraineeStudentHtml;

function renderTraineeBook() {
  const container = document.getElementById("traineeContentWrap");
  if (!container) return;

  const classSelect = document.getElementById("traineeClassSelect");
  if (classSelect && classSelect.options.length === 0) {
    updateClassSelectOptions();
  }

  let currentClass = getActiveClass();
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    const candidate = (state.db && state.db.classes ? state.db.classes : []).find(
      c => c.academicYear === (state.activeYear || "២០២៦-២០២៧") && c.students && c.students.length > 0
    );
    if (candidate) {
      currentClass = candidate;
      state.activeClassId = candidate.id;
      const classSelects = document.querySelectorAll(".class-select-input");
      classSelects.forEach(sel => sel.value = candidate.id);
    }
  }

  if (currentClass && classSelect && classSelect.value !== currentClass.id) {
    classSelect.value = currentClass.id;
  }

  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">មិនមានទិន្នន័យសិស្សក្នុងថ្នាក់នេះទេ</p>`;
    return;
  }

  const students = currentClass.students;

  // Sync Student Select
  const studentSelect = document.getElementById("traineeStudentSelect");
  if (studentSelect) {
    studentSelect.innerHTML = "";
    students.forEach((s, idx) => {
      const opt = document.createElement("option");
      opt.value = s.num;
      const sName = s.fullName || ((s.lastName || "") + " " + (s.firstName || "")).trim();
      opt.textContent = `${toKhmerNum(s.num)}. ${sName} (${s.gender})`;
      if (s.num === state.activeTraineeStudentNum) opt.selected = true;
      studentSelect.appendChild(opt);
    });
  }

  // Ensure active student
  if (!state.activeTraineeStudentNum || !students.some(s => s.num === state.activeTraineeStudentNum)) {
    state.activeTraineeStudentNum = students[0].num;
    if (studentSelect) studentSelect.value = students[0].num;
  }

  // Compute class rank map once for efficiency
  const classRankMap = computeTraineeClassRankMap(currentClass);

  // Check print mode
  const mode = state.activeTraineePrintMode || "single";
  const modeSelect = document.getElementById("traineePrintModeSelect");
  if (modeSelect) modeSelect.value = mode;

  if (mode === "all") {
    let allHtml = "";
    students.forEach(st => {
      allHtml += buildTraineeStudentHtml(currentClass, st, true, classRankMap);
    });
    container.innerHTML = allHtml;
  } else {
    const curStudent = students.find(s => s.num === state.activeTraineeStudentNum) || students[0];
    container.innerHTML = buildTraineeStudentHtml(currentClass, curStudent, false, classRankMap);
  }
}
window.renderTraineeBook = renderTraineeBook;

function changeTraineeClass(classId) {
  state.activeClassId = classId;
  const classSelects = document.querySelectorAll(".class-select-input");
  classSelects.forEach(sel => sel.value = classId);
  state.activeTraineeStudentNum = null;
  renderApp();
}
window.changeTraineeClass = changeTraineeClass;

function changeTraineeStudent(num) {
  state.activeTraineeStudentNum = parseInt(num, 10);
  renderTraineeBook();
}
window.changeTraineeStudent = changeTraineeStudent;

function prevTraineeStudent() {
  const currentClass = getActiveClass();
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) return;
  const students = currentClass.students;
  const curIdx = students.findIndex(s => s.num === state.activeTraineeStudentNum);
  if (curIdx > 0) {
    state.activeTraineeStudentNum = students[curIdx - 1].num;
  } else {
    state.activeTraineeStudentNum = students[students.length - 1].num;
  }
  const sel = document.getElementById("traineeStudentSelect");
  if (sel) sel.value = state.activeTraineeStudentNum;
  renderTraineeBook();
}
window.prevTraineeStudent = prevTraineeStudent;

function nextTraineeStudent() {
  const currentClass = getActiveClass();
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) return;
  const students = currentClass.students;
  const curIdx = students.findIndex(s => s.num === state.activeTraineeStudentNum);
  if (curIdx >= 0 && curIdx < students.length - 1) {
    state.activeTraineeStudentNum = students[curIdx + 1].num;
  } else {
    state.activeTraineeStudentNum = students[0].num;
  }
  const sel = document.getElementById("traineeStudentSelect");
  if (sel) sel.value = state.activeTraineeStudentNum;
  renderTraineeBook();
}
window.nextTraineeStudent = nextTraineeStudent;

function changeTraineePrintMode(mode) {
  state.activeTraineePrintMode = mode;
  renderTraineeBook();
}
window.changeTraineePrintMode = changeTraineePrintMode;

function printTraineeBook() {
  prepareAdminPrint("trainee");
  window.print();
}
window.printTraineeBook = printTraineeBook;

function exportTraineeToExcel() {
  const currentClass = getActiveClass();
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    alert("មិនមានទិន្នន័យសិស្សសម្រាប់នាំចេញទេ");
    return;
  }
  if (typeof XLSX === "undefined") {
    alert("សូមរង់ចាំបណ្ណាល័យ XLSX ដំណើរការពេញលេញ");
    return;
  }

  const students = currentClass.students;
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៦-២០២៧";
  const schoolName = (state.db && state.db.schoolInfo && state.db.schoolInfo.name) ? state.db.schoolInfo.name : "សាលាបឋមសិក្សា បាន្លួង";

  const classRankMap = computeTraineeClassRankMap(currentClass);

  const wb = XLSX.utils.book_new();
  const wsData = [];

  wsData.push(["សៀវភៅសិក្ខាគារិក (Trainee Record Book)"]);
  wsData.push([schoolName, "", "", "", "", "ឆ្នាំសិក្សា ៖ " + academicYear]);
  wsData.push(["ថ្នាក់ទី ៖ " + getCleanStudyBookGrade(currentClass.grade), "", "សិស្សសរុប ៖ " + students.length + " នាក់"]);
  wsData.push([""]);

  const headerRow = ["ល.រ", "អត្តលេខ", "គោត្តនាម និង នាម", "ភេទ"];
  TRAINEE_SUBJECTS.forEach(sub => {
    headerRow.push(sub.name + " (ពិន្ទុ ឆ១)");
    headerRow.push(sub.name + " (ចំណាត់ថ្នាក់ ឆ១)");
    headerRow.push(sub.name + " (ពិន្ទុ ឆ២)");
    headerRow.push(sub.name + " (ចំណាត់ថ្នាក់ ឆ២)");
  });
  headerRow.push("មធ្យមភាគ ឆ១", "ចំណាត់ថ្នាក់ ឆ១", "មធ្យមភាគ ឆ២", "ចំណាត់ថ្នាក់ ឆ២", "មធ្យមភាគប្រចាំឆ្នាំ", "ចំណាត់ថ្នាក់ប្រចាំឆ្នាំ", "និទ្ទេស");
  wsData.push(headerRow);

  students.forEach(s => {
    const sName = s.fullName || ((s.lastName || "") + " " + (s.firstName || "")).trim();
    const cData = classRankMap.computedByNum[s.num] || getTraineeStudentComputed(currentClass, s);
    const tData = getStudentTraineeData(currentClass, s.num);

    const s1Avg = cData.semAvg1 || 0;
    const s2Avg = cData.semAvg2 || 0;
    const annAvg = cData.annualAvg || 0;

    const s1Rank = (tData.sem1Ranks && tData.sem1Ranks["sem_overall"]) || classRankMap.sem1Avg[s.num] || "";
    const s2Rank = (tData.sem2Ranks && tData.sem2Ranks["sem_overall"]) || classRankMap.sem2Avg[s.num] || "";
    const annRank = tData.annualRank || classRankMap.annualAvg[s.num] || "";
    const mention = getTraineeMention(annAvg);

    const row = [s.num, s.studentId || s.num, sName, s.gender];
    TRAINEE_SUBJECTS.forEach(sub => {
      const subS1 = (tData.sem1Scores && tData.sem1Scores[sub.key]) || cData.sem1Scores[sub.key] || "";
      const subR1 = (tData.sem1Ranks && tData.sem1Ranks[sub.key]) || classRankMap.sem1Subjects[sub.key]?.[s.num] || "";
      const subS2 = (tData.sem2Scores && tData.sem2Scores[sub.key]) || cData.sem2Scores[sub.key] || "";
      const subR2 = (tData.sem2Ranks && tData.sem2Ranks[sub.key]) || classRankMap.sem2Subjects[sub.key]?.[s.num] || "";
      row.push(subS1, subR1, subS2, subR2);
    });
    row.push(s1Avg, s1Rank, s2Avg, s2Rank, annAvg, annRank, mention);
    wsData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "សៀវភៅសិក្ខាគារិក");

  const fileName = `សៀវភៅសិក្ខាគារិក_${(currentClass.grade || "ថ្នាក់").replace(/\s+/g, "_")}_${academicYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
window.exportTraineeToExcel = exportTraineeToExcel;


// ==========================================================================
// សម្រង់ពិន្ទុ ប្រចាំឆមាស (Semester Score Extract Sheet - A4 Portrait)
// ==========================================================================
const SEMESTER_EXTRACT_SUBJECTS = [
  { key: "kh_read",         name: "អំណាន",                 semKey: "kh_read" },
  { key: "kh_listen_speak", name: "ស្ដាប់ និងនិយាយ",         semKey: "kh_read" },
  { key: "kh_dictation",    name: "សរសេរតាមអាន",            semKey: "kh_dictation" },
  { key: "kh_essay",        name: "តែងសេចក្ដី",             semKey: "kh_essay" },
  { key: "math",            name: "គណិតវិទ្យា",             semKey: "math" },
  { key: "kh_calligraphy",  name: "អក្សរផ្ចង់",             semKey: "kh_dictation" },
  { key: "science",         name: "វិទ្យាសាស្ត្រ",            semKey: "science" },
  { key: "social",          name: "សិក្សាសង្គម",            semKey: "moral" },
  { key: "home_art",        name: "គេហវិទ្យា-អប់រំសិល្បៈ",    semKey: "drawing" },
  { key: "pe_health",       name: "អប់រំកាយ-សុខភាព",       semKey: "sport" },
  { key: "lifeskills",      name: "អប់រំបំណិនជីវិត",        semKey: "lifeskills" },
  { key: "foreign",         name: "ភាសាបរទេស",             semKey: "lifeskills" }
];

function toSemesterGradeLetter(val, avg) {
  if (typeof val === "string" && val.trim()) {
    const v = val.trim().toUpperCase();
    if (["A", "B", "C", "D", "E", "F"].includes(v)) return v;
    if (v.includes("ល្អប្រសើរ")) return "A";
    if (v.includes("ល្អណាស់")) return "B";
    if (v.includes("ល្អបង្គួរ") || v === "ល្អ") return "C";
    if (v.includes("មធ្យម")) return "D";
    if (v.includes("ខ្សោយណាស់")) return "F";
    if (v.includes("ខ្សោយ")) return "E";
  }
  const a = parseFloat(avg) || 0;
  if (a >= 8.5) return "A";
  if (a >= 8.0) return "B";
  if (a >= 7.0) return "C";
  if (a >= 6.0) return "D";
  if (a >= 5.0) return "E";
  if (a > 0) return "F";
  return "C";
}
window.toSemesterGradeLetter = toSemesterGradeLetter;

function getStudentSemesterExtractData(currentClass, sem, studentNum) {
  currentClass.semesterExtractData = currentClass.semesterExtractData || {};
  currentClass.semesterExtractData[sem] = currentClass.semesterExtractData[sem] || {};
  if (!currentClass.semesterExtractData[sem][studentNum]) {
    currentClass.semesterExtractData[sem][studentNum] = {
      scores: {},
      mention: "",
      mention1: "ល្អ",
      mention2: "ល្អ",
      mention3: "ល្អ"
    };
  }
  return currentClass.semesterExtractData[sem][studentNum];
}

function saveSemesterExtractScore(studentNum, sem, subKey, value) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const data = getStudentSemesterExtractData(currentClass, sem, studentNum);
  data.scores = data.scores || {};
  data.scores[subKey] = value.trim();
  saveDb();
}
window.saveSemesterExtractScore = saveSemesterExtractScore;

function saveSemesterExtractMention(studentNum, sem, colKey, value) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const data = getStudentSemesterExtractData(currentClass, sem, studentNum);
  let v = (value || "").trim();
  if (colKey === "mention") {
    v = toSemesterGradeLetter(v, 0);
  }
  data[colKey] = v;
  saveDb();
}
window.saveSemesterExtractMention = saveSemesterExtractMention;

function saveSemesterExtractDate(sem, dateKey, value) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  currentClass.semesterExtractDates = currentClass.semesterExtractDates || {};
  currentClass.semesterExtractDates[sem] = currentClass.semesterExtractDates[sem] || {};
  currentClass.semesterExtractDates[sem][dateKey] = value.trim();
  saveDb();
}
window.saveSemesterExtractDate = saveSemesterExtractDate;

function saveSemesterExtractAnnualMention(studentNum, colKey, value) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  currentClass.semesterExtractAnnual = currentClass.semesterExtractAnnual || {};
  currentClass.semesterExtractAnnual[studentNum] = currentClass.semesterExtractAnnual[studentNum] || {};
  let v = (value || "").trim();
  if (colKey === "annualMention") {
    v = toSemesterGradeLetter(v, 0);
  }
  currentClass.semesterExtractAnnual[studentNum][colKey] = v;
  if (typeof saveDb === "function") saveDb();
  else if (typeof saveDatabase === "function") saveDatabase();
}
window.saveSemesterExtractAnnualMention = saveSemesterExtractAnnualMention;

function saveSemesterExtractOther(studentNum, value) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  currentClass.semesterExtractAnnual = currentClass.semesterExtractAnnual || {};
  currentClass.semesterExtractAnnual[studentNum] = currentClass.semesterExtractAnnual[studentNum] || {};
  currentClass.semesterExtractAnnual[studentNum].other = (value || "").trim();
  if (typeof saveDb === "function") saveDb();
  else if (typeof saveDatabase === "function") saveDatabase();
}
window.saveSemesterExtractOther = saveSemesterExtractOther;

function renderSemesterExtract() {
  const container = document.getElementById("semExtractContentWrap");
  if (!container) return;

  const classSelect = document.getElementById("semExtractClassSelect");
  if (classSelect && classSelect.options.length === 0) {
    updateClassSelectOptions();
  }

  let currentClass = getActiveClass();
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    const candidate = (state.db && state.db.classes ? state.db.classes : []).find(
      c => c.academicYear === (state.activeYear || "២០២៦-២០២៧") && c.students && c.students.length > 0
    );
    if (candidate) {
      currentClass = candidate;
      state.activeClassId = candidate.id;
      const classSelects = document.querySelectorAll(".class-select-input");
      classSelects.forEach(sel => sel.value = candidate.id);
    }
  }

  if (currentClass && classSelect && classSelect.value !== currentClass.id) {
    classSelect.value = currentClass.id;
  }

  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">មិនមានទិន្នន័យសិស្សក្នុងថ្នាក់នេះទេ</p>`;
    return;
  }

  const sem = state.activeSemesterExtractSem || "1";
  const semSelect = document.getElementById("semExtractSemesterSelect");
  if (semSelect) semSelect.value = sem;

  const academicYear = currentClass.academicYear || state.activeYear || "២០២៥-២០២៦";
  const schoolName = (state.db && state.db.schoolInfo && state.db.schoolInfo.name) ? state.db.schoolInfo.name : "សាលាបឋមសិក្សា បាន្លួង";
  const teacherName = currentClass.teacher || "ផន ច័ន្ទតារា";

  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  // Pre-calculate scores and ranks for all students
  const students = currentClass.students || [];
  currentClass.semesterExtractData = currentClass.semesterExtractData || { "1": {}, "2": {} };
  currentClass.semesterExtractData[sem] = currentClass.semesterExtractData[sem] || {};
  currentClass.semesterExtractAnnual = currentClass.semesterExtractAnnual || {};

  // Months for monthly average
  const sem1Months = ["តុលា", "វិច្ឆិកា", "ធ្នូ", "មករា", "កុម្ភៈ"];
  const sem2Months = ["មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា"];
  const semMonths = sem === "1" ? sem1Months : sem2Months;

  const studentComputed = students.map((s, idx) => {
    const sExtract = currentClass.semesterExtractData[sem][s.num] || { scores: {}, mention: "", mention1: "ល្អ", mention2: "ល្អ", mention3: "ល្អ" };
    currentClass.semesterExtractData[sem][s.num] = sExtract;

    const sAnnual = currentClass.semesterExtractAnnual[s.num] || {
      annualMention: "",
      annualMention1: "ល្អ",
      annualMention2: "ល្អ",
      annualMention3: "ល្អ",
      other: ""
    };
    currentClass.semesterExtractAnnual[s.num] = sAnnual;

    // Default semester exam fallback
    const semExamData = getStudentSemesterExamScores(currentClass, sem, s);
    const semRec = semExamData.rec || {};

    // 12 subjects
    const subScores = {};
    let subTotal = 0;
    let subCount = 0;
    SEMESTER_EXTRACT_SUBJECTS.forEach(sub => {
      let val = sExtract.scores[sub.key];
      if (val === undefined || val === null || val === "") {
        let r = parseFloat(semRec[sub.semKey]);
        if (isNaN(r) || r <= 0) {
          if (sub.key === "kh_read" || sub.key === "kh_dictation") r = s.scores?.khmer || 7.5;
          else if (sub.key === "science") r = s.scores?.science || 7.5;
          else if (sub.key === "social") r = s.scores?.social || 8.0;
          else if (sub.key === "home_art") r = s.scores?.art || 8.5;
          else if (sub.key === "pe_health") r = s.scores?.pe || 9.0;
          else if (sub.key === "lifeskills") r = 8.0;
          else if (sub.key === "foreign") r = 7.5;
          else r = 7.5;
        }
        val = r;
      } else {
        val = parseFloat(val) || 0;
      }
      subScores[sub.key] = val;
      if (val > 0) {
        subTotal += val;
        subCount++;
      }
    });

    const examAvg = subCount > 0 ? Math.round((subTotal / subCount) * 100) / 100 : 0;

    // Monthly average
    let mTotal = 0, mCount = 0;
    semMonths.forEach(m => {
      const stats = getStudentMonthAvg(currentClass, m, s);
      if (stats.avg > 0) { mTotal += stats.avg; mCount++; }
    });
    const monthAvg = mCount > 0 ? Math.round((mTotal / mCount) * 100) / 100 : examAvg;

    // Semester average
    const semAvg = examAvg > 0 ? Math.round(((monthAvg + examAvg) / 2) * 100) / 100 : monthAvg;

    // Default Semester mention (Always A, B, C, D, E, F)
    let autoMention = toSemesterGradeLetter("", semAvg);
    const displayMention = toSemesterGradeLetter(sExtract.mention, semAvg);

    // Sem 1 Average for Annual calculation
    let sem1Avg = 0;
    if (sem === "2") {
      if (currentClass.semesterExtractData["1"]?.[s.num]?.scores) {
        const s1Data = currentClass.semesterExtractData["1"][s.num];
        let s1Total = 0, s1Count = 0;
        SEMESTER_EXTRACT_SUBJECTS.forEach(sub => {
          let v = parseFloat(s1Data.scores[sub.key]);
          if (!isNaN(v) && v > 0) { s1Total += v; s1Count++; }
        });
        const s1ExamAvg = s1Count > 0 ? s1Total / s1Count : 0;
        let s1MTotal = 0, s1MCount = 0;
        sem1Months.forEach(m => {
          const stats = getStudentMonthAvg(currentClass, m, s);
          if (stats.avg > 0) { s1MTotal += stats.avg; s1MCount++; }
        });
        const s1MonthAvg = s1MCount > 0 ? s1MTotal / s1MCount : s1ExamAvg;
        sem1Avg = s1ExamAvg > 0 ? Math.round(((s1MonthAvg + s1ExamAvg) / 2) * 100) / 100 : s1MonthAvg;
      }
      if (sem1Avg <= 0) {
        sem1Avg = semAvg > 0 ? semAvg : 7.5;
      }
    }

    // Annual Average
    let annualAvg = 0;
    if (sem === "2") {
      if (sem1Avg > 0 && semAvg > 0) {
        annualAvg = Math.round(((sem1Avg + semAvg) / 2) * 100) / 100;
      } else if (semAvg > 0) {
        annualAvg = semAvg;
      } else if (sem1Avg > 0) {
        annualAvg = sem1Avg;
      }
    }

    // Default Annual Mention (Always A, B, C, D, E, F)
    let autoAnnualMention = toSemesterGradeLetter("", annualAvg);
    const displayAnnualMention = toSemesterGradeLetter(sAnnual.annualMention, annualAvg);

    let defaultOther = sAnnual.other;
    if (defaultOther === undefined || defaultOther === null || defaultOther === "") {
      defaultOther = (annualAvg >= 5.0 || semAvg >= 5.0) ? "ឡើងថ្នាក់" : "";
    }

    // Spaced student names (lastName + firstName)
    let ln = s.lastName || "";
    let fn = s.firstName || "";
    if (!ln && !fn && s.fullName) {
      const parts = s.fullName.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    } else if (ln && !fn && ln.includes(" ")) {
      const parts = ln.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    } else if (!ln && fn && fn.includes(" ")) {
      const parts = fn.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    }

    return {
      student: s,
      num: s.num || (idx + 1),
      lastName: ln,
      firstName: fn,
      fullName: s.fullName || (ln + " " + fn).trim(),
      gender: s.gender || "ប្រុស",
      subScores,
      examAvg,
      monthAvg,
      semAvg,
      semRank: "",
      semMention: displayMention,
      mention1: sExtract.mention1 || "ល្អ",
      mention2: sExtract.mention2 || "ល្អ",
      mention3: sExtract.mention3 || "ល្អ",
      sem1Avg,
      annualAvg,
      annualRank: "",
      annualMention: displayAnnualMention,
      annualMention1: sAnnual.annualMention1 || "ល្អ",
      annualMention2: sAnnual.annualMention2 || "ល្អ",
      annualMention3: sAnnual.annualMention3 || "ល្អ",
      other: defaultOther
    };
  });

  // Calculate Semester Ranks
  const sortedBySem = [...studentComputed].sort((a, b) => b.semAvg - a.semAvg);
  let rankS = 1;
  sortedBySem.forEach((item, idx) => {
    if (idx > 0 && item.semAvg < sortedBySem[idx - 1].semAvg) {
      rankS = idx + 1;
    }
    item.semRank = item.semAvg > 0 ? rankS : "";
  });

  // Calculate Annual Ranks (for Sem 2)
  if (sem === "2") {
    const sortedByAnnual = [...studentComputed].sort((a, b) => b.annualAvg - a.annualAvg);
    let rankA = 1;
    sortedByAnnual.forEach((item, idx) => {
      if (idx > 0 && item.annualAvg < sortedByAnnual[idx - 1].annualAvg) {
        rankA = idx + 1;
      }
      item.annualRank = item.annualAvg > 0 ? rankA : "";
    });
  }

  // Calculate Statistics for Semester 2 / Annual (A, B, C, D, E, F)
  const stats = {
    A: { total: 0, female: 0, pct: "0.00" },
    B: { total: 0, female: 0, pct: "0.00" },
    C: { total: 0, female: 0, pct: "0.00" },
    D: { total: 0, female: 0, pct: "0.00" },
    E: { total: 0, female: 0, pct: "0.00" },
    F: { total: 0, female: 0, pct: "0.00" }
  };

  let activeStudentCount = 0;
  studentComputed.forEach(item => {
    const targetMention = sem === "2" ? (item.annualMention || item.semMention) : item.semMention;
    if (targetMention && stats[targetMention]) {
      stats[targetMention].total++;
      if (item.gender === "ស្រី") stats[targetMention].female++;
      activeStudentCount++;
    }
  });

  const totalStudents = students.length;
  const femaleCount = students.filter(s => s.gender === "ស្រី").length;
  const baseCount = activeStudentCount > 0 ? activeStudentCount : totalStudents;
  Object.keys(stats).forEach(k => {
    stats[k].pct = baseCount > 0 ? ((stats[k].total / baseCount) * 100).toFixed(2) : "0.00";
  });

  // Dates
  currentClass.semesterExtractDates = currentClass.semesterExtractDates || {};
  currentClass.semesterExtractDates[sem] = currentClass.semesterExtractDates[sem] || {};
  const savedDates = currentClass.semesterExtractDates[sem];
  
  let lunarTeacherDefault = "ថ្ងៃ ចន្ទ ៩ កើត ខែ អស្សុជ ឆ្នាំ ថោះ បញ្ចស័ក ព.ស ២៥៦៧";
  let solarTeacherDefault = "បាន្លួង ថ្ងៃទី ២៣ ខែ តុលា ឆ្នាំ ២០២៣";
  if (sem === "2") {
    lunarTeacherDefault = "ថ្ងៃ...............................ខែ............................ឆ្នាំ.............................ស័ក ព.ស ២៥....";
    solarTeacherDefault = "បាន្លួង ថ្ងៃទី....................ខែ..................ឆ្នាំ......................";
  }

  const lunarTeacher = savedDates.lunarTeacher || lunarTeacherDefault;
  const solarTeacher = savedDates.solarTeacher || solarTeacherDefault;

  // Dynamic Multi-Page Pagination for Landscape A4:
  // Ensures 100% of rows and footer fit with ZERO truncation/overflow.
  // Page 1 (with top title header): up to 20 rows (Sem 2) or 19 rows (Sem 1)
  // Middle pages (table header only): up to 22 rows
  // Final page (with signatures / stats footer): up to 18 rows
  const maxFinalRows = 18;
  const maxPage1Rows = sem === "2" ? 20 : 19;
  const maxMidRows = 22;

  let pagesChunks = [];
  if (totalStudents <= (sem === "2" ? 14 : 16)) {
    // 1 Single Page!
    pagesChunks.push(studentComputed);
  } else if (totalStudents <= (maxPage1Rows + maxFinalRows)) {
    // Exactly 2 Pages!
    let p1Count = Math.min(maxPage1Rows, Math.ceil(totalStudents / 2));
    let p2Count = totalStudents - p1Count;
    if (p2Count > maxFinalRows) {
      p1Count = totalStudents - maxFinalRows;
      p2Count = maxFinalRows;
    }
    pagesChunks.push(studentComputed.slice(0, p1Count));
    pagesChunks.push(studentComputed.slice(p1Count));
  } else {
    // 3 or more Pages!
    let remaining = [...studentComputed];
    // Page 1
    pagesChunks.push(remaining.splice(0, maxPage1Rows));
    // Middle pages & Last page
    while (remaining.length > 0) {
      if (remaining.length <= maxFinalRows) {
        pagesChunks.push(remaining.splice(0, remaining.length));
      } else if (remaining.length <= maxMidRows + maxFinalRows) {
        let pNextCount = Math.ceil(remaining.length / 2);
        pagesChunks.push(remaining.splice(0, pNextCount));
      } else {
        pagesChunks.push(remaining.splice(0, maxMidRows));
      }
    }
  }

  // Common Top Header
  const topHeaderHtml = `
    <div class="sem-extract-header-grid">
      <div class="sem-extract-header-left">
        <div>មន្ទីរអប់រំ យុវជន និងកីឡា រាជធានី/ខេត្តតាកែវ</div>
        <div>ការិយាល័យអប់រំ យុវជន និងកីឡារដ្ឋបាលក្រុង/ស្រុក/ខណ្ឌ ព្រៃកប្បាស</div>
        <div>${schoolName}</div>
      </div>
      <div class="sem-extract-header-center">
        <div class="nat-1">ព្រះរាជាណាចក្រកម្ពុជា</div>
        <div class="nat-2">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
      </div>
    </div>

    <div class="sem-extract-main-title">
      តារាងស្រង់ពិន្ទុប្រចាំឆមាស និងឆ្នាំសិក្សា ${academicYear}
    </div>
  `;

  // BUILD TABLE HEADER FOR SEMESTER 1
  function buildTableHeaderHtmlSem1() {
    let subVertHeaders = "";
    SEMESTER_EXTRACT_SUBJECTS.forEach(sub => {
      subVertHeaders += `<th class="th-vert" style="width: 36px;"><span class="v-text">${sub.name}</span></th>`;
    });

    return `
      <thead>
        <tr>
          <th rowspan="3" style="width: 32px;" class="th-fixed-text">ល.រ</th>
          <th colspan="2" rowspan="3" style="width: 165px;" class="th-fixed-text">គោត្តនាម និងនាម</th>
          <th rowspan="3" style="width: 36px;" class="th-fixed-text">ភេទ</th>
          <th colspan="20" style="font-size: 11pt; padding: 3px 0; color: #002060;">ឆមាសទី១</th>
        </tr>
        <tr>
          <th colspan="12" style="font-size: 9.5pt; padding: 2px 0; color: #002060;">ពិន្ទុប្រឡងឆមាស</th>
          <th colspan="5" style="font-size: 9.5pt; padding: 2px 0; color: #002060;">លទ្ធផលប្រចាំឆមាស</th>
          <th colspan="3" style="font-size: 9.5pt; padding: 2px 0; color: #002060;">និទ្ទេសតាមផ្នែក</th>
        </tr>
        <tr>
          ${subVertHeaders}
          <th class="th-vert" style="width: 42px;"><span class="v-text">មធ្យមភាគប្រឡងឆមាស</span></th>
          <th class="th-vert" style="width: 42px;"><span class="v-text">មធ្យមភាគប្រចាំខែ</span></th>
          <th class="th-vert" style="width: 42px;"><span class="v-text">មធ្យមភាគប្រចាំឆមាស</span></th>
          <th class="th-vert" style="width: 38px;"><span class="v-text">ចំណាត់ថ្នាក់</span></th>
          <th class="th-vert" style="width: 38px;"><span class="v-text">និទ្ទេស</span></th>
          <th class="th-vert" style="width: 42px;"><span class="v-text">បំណិន-ចំណេះធ្វើ</span></th>
          <th class="th-vert" style="width: 42px;"><span class="v-text">តម្លៃ-សីលធម៌</span></th>
          <th class="th-vert" style="width: 42px;"><span class="v-text">សាមគ្គីភាព-ការចូលរួម</span></th>
        </tr>
      </thead>
    `;
  }

  // BUILD TABLE ROWS FOR SEMESTER 1
  function buildTableRowsHtmlSem1(items) {
    let rowsHtml = "";
    items.forEach((item, idx) => {
      let subTds = "";
      SEMESTER_EXTRACT_SUBJECTS.forEach(sub => {
        const sc = item.subScores[sub.key];
        subTds += `<td class="td-editable" contenteditable="true" onblur="saveSemesterExtractScore(${item.num}, '1', '${sub.key}', this.innerText)">${sc > 0 ? sc : ""}</td>`;
      });

      const rankColor = item.semRank > 10 ? "#dc2626" : (item.semRank <= 3 ? "#16a34a" : "#002060");

      rowsHtml += `
        <tr>
          <td style="width: 32px;">${item.num}</td>
          <td class="border-no-r td-lastname" style="width: 68px;">${item.lastName}</td>
          <td class="border-no-l td-firstname" style="width: 97px;">${item.firstName}</td>
          <td style="width: 36px;">${item.gender}</td>
          ${subTds}
          <td style="font-weight: 600;">${item.examAvg > 0 ? item.examAvg.toFixed(2) : ""}</td>
          <td style="font-weight: 600;">${item.monthAvg > 0 ? item.monthAvg.toFixed(2) : ""}</td>
          <td style="font-weight: 700; color: #16a34a;">${item.semAvg > 0 ? item.semAvg.toFixed(2) : ""}</td>
          <td style="font-weight: 700; color: ${rankColor};">${item.semRank}</td>
          <td class="td-mention td-editable" contenteditable="true" onblur="saveSemesterExtractMention(${item.num}, '1', 'mention', this.innerText)">${item.semMention}</td>
          <td class="td-mention td-editable" contenteditable="true" onblur="saveSemesterExtractMention(${item.num}, '1', 'mention1', this.innerText)">${item.mention1}</td>
          <td class="td-mention td-editable" contenteditable="true" onblur="saveSemesterExtractMention(${item.num}, '1', 'mention2', this.innerText)">${item.mention2}</td>
          <td class="td-mention td-editable" contenteditable="true" onblur="saveSemesterExtractMention(${item.num}, '1', 'mention3', this.innerText)">${item.mention3}</td>
        </tr>
      `;
    });
    return rowsHtml;
  }

  // BUILD TABLE HEADER FOR SEMESTER 2 (100% SPEC MATCHING ដំណាច់ឆ្នាំ និង ឆមាសទី២.pdf)
  function buildTableHeaderHtmlSem2() {
    let subVertHeaders = "";
    SEMESTER_EXTRACT_SUBJECTS.forEach(sub => {
      subVertHeaders += `<th class="th-vert" style="width: 27px;"><span class="v-text">${sub.name}</span></th>`;
    });

    return `
      <thead>
        <tr>
          <th rowspan="3" style="width: 28px;" class="th-fixed-text">ល.រ</th>
          <th colspan="2" rowspan="3" style="width: 140px;" class="th-fixed-text">គោត្តនាម និងនាម</th>
          <th rowspan="3" style="width: 28px;" class="th-fixed-text">ភេទ</th>
          <th colspan="20" style="font-size: 10.5pt; padding: 2px 0; color: #002060;">ឆមាសទី២</th>
          <th colspan="6" style="font-size: 10.5pt; padding: 2px 0; color: #002060;">ប្រចាំឆ្នាំ</th>
          <th rowspan="3" class="th-vert" style="width: 34px;"><span class="v-text">សេចក្ដីផ្សេងៗ</span></th>
        </tr>
        <tr>
          <th colspan="12" style="font-size: 8.5pt; padding: 2px 0; color: #002060;">ពិន្ទុប្រឡងឆមាស</th>
          <th colspan="5" style="font-size: 8.5pt; padding: 2px 0; color: #002060;">លទ្ធផលប្រចាំឆមាស</th>
          <th colspan="3" style="font-size: 8.5pt; padding: 2px 0; color: #002060;">និទ្ទេសតាមផ្នែក</th>
          <th colspan="3" style="font-size: 8.5pt; padding: 2px 0; color: #002060;">លទ្ធផល</th>
          <th colspan="3" style="font-size: 8.5pt; padding: 2px 0; color: #002060;">និទ្ទេសតាមផ្នែក</th>
        </tr>
        <tr>
          ${subVertHeaders}
          <th class="th-vert" style="width: 30px;"><span class="v-text">មធ្យមភាគប្រឡងឆមាស</span></th>
          <th class="th-vert" style="width: 30px;"><span class="v-text">មធ្យមភាគប្រចាំខែ</span></th>
          <th class="th-vert" style="width: 30px;"><span class="v-text">មធ្យមភាគប្រចាំឆមាស</span></th>
          <th class="th-vert" style="width: 28px;"><span class="v-text">ចំណាត់ថ្នាក់</span></th>
          <th class="th-vert" style="width: 28px;"><span class="v-text">និទ្ទេស</span></th>
          <th class="th-vert" style="width: 30px;"><span class="v-text">បំណិន-ចំណេះធ្វើ</span></th>
          <th class="th-vert" style="width: 30px;"><span class="v-text">តម្លៃ-សីលធម៌</span></th>
          <th class="th-vert" style="width: 30px;"><span class="v-text">សាមគ្គីភាព-ការចូលរួម</span></th>
          <th class="th-vert" style="width: 30px;"><span class="v-text">មធ្យមភាគប្រចាំឆ្នាំ</span></th>
          <th class="th-vert" style="width: 28px;"><span class="v-text">ចំណាត់ថ្នាក់</span></th>
          <th class="th-vert" style="width: 28px;"><span class="v-text">និទ្ទេស</span></th>
          <th class="th-vert" style="width: 30px;"><span class="v-text">បំណិន-ចំណេះធ្វើ</span></th>
          <th class="th-vert" style="width: 30px;"><span class="v-text">តម្លៃ-សីលធម៌</span></th>
          <th class="th-vert" style="width: 30px;"><span class="v-text">សាមគ្គីភាព-ការចូលរួម</span></th>
        </tr>
      </thead>
    `;
  }

  // BUILD TABLE ROWS FOR SEMESTER 2
  function buildTableRowsHtmlSem2(items) {
    let rowsHtml = "";
    items.forEach((item, idx) => {
      let subTds = "";
      SEMESTER_EXTRACT_SUBJECTS.forEach(sub => {
        const sc = item.subScores[sub.key];
        subTds += `<td class="td-editable" contenteditable="true" onblur="saveSemesterExtractScore(${item.num}, '2', '${sub.key}', this.innerText)">${sc > 0 ? sc : ""}</td>`;
      });

      const semRankColor = item.semRank > 10 ? "#dc2626" : (item.semRank <= 3 ? "#16a34a" : "#002060");
      const annualRankColor = item.annualRank > 10 ? "#dc2626" : (item.annualRank <= 3 ? "#16a34a" : "#002060");

      rowsHtml += `
        <tr>
          <td style="width: 28px;">${item.num}</td>
          <td class="border-no-r td-lastname" style="width: 58px;">${item.lastName}</td>
          <td class="border-no-l td-firstname" style="width: 82px;">${item.firstName}</td>
          <td style="width: 28px;">${item.gender}</td>
          ${subTds}
          <td style="font-weight: 600;">${item.examAvg > 0 ? item.examAvg.toFixed(2) : ""}</td>
          <td style="font-weight: 600;">${item.monthAvg > 0 ? item.monthAvg.toFixed(2) : ""}</td>
          <td style="font-weight: 700; color: #16a34a;">${item.semAvg > 0 ? item.semAvg.toFixed(2) : ""}</td>
          <td style="font-weight: 700; color: ${semRankColor};">${item.semRank}</td>
          <td class="td-mention td-editable" contenteditable="true" onblur="saveSemesterExtractMention(${item.num}, '2', 'mention', this.innerText)">${item.semMention}</td>
          <td class="td-mention td-editable" contenteditable="true" onblur="saveSemesterExtractMention(${item.num}, '2', 'mention1', this.innerText)">${item.mention1}</td>
          <td class="td-mention td-editable" contenteditable="true" onblur="saveSemesterExtractMention(${item.num}, '2', 'mention2', this.innerText)">${item.mention2}</td>
          <td class="td-mention td-editable" contenteditable="true" onblur="saveSemesterExtractMention(${item.num}, '2', 'mention3', this.innerText)">${item.mention3}</td>
          <td style="font-weight: 700; color: #16a34a;">${item.annualAvg > 0 ? item.annualAvg.toFixed(2) : ""}</td>
          <td style="font-weight: 700; color: ${annualRankColor};">${item.annualRank}</td>
          <td class="td-mention td-editable" contenteditable="true" onblur="saveSemesterExtractAnnualMention(${item.num}, 'annualMention', this.innerText)">${item.annualMention}</td>
          <td class="td-mention td-editable" contenteditable="true" onblur="saveSemesterExtractAnnualMention(${item.num}, 'annualMention1', this.innerText)">${item.annualMention1}</td>
          <td class="td-mention td-editable" contenteditable="true" onblur="saveSemesterExtractAnnualMention(${item.num}, 'annualMention2', this.innerText)">${item.annualMention2}</td>
          <td class="td-mention td-editable" contenteditable="true" onblur="saveSemesterExtractAnnualMention(${item.num}, 'annualMention3', this.innerText)">${item.annualMention3}</td>
          <td class="td-editable" contenteditable="true" onblur="saveSemesterExtractOther(${item.num}, this.innerText)" style="font-size: 8.5pt;">${item.other}</td>
        </tr>
      `;
    });
    return rowsHtml;
  }

  // Semester 1 Signatures HTML
  const sem1SignaturesHtml = `
    <div class="sem-extract-sig-grid">
      <div class="sem-extract-sig-left">
        <div>បានឃើញ និងឯកភាព</div>
        <div style="font-size: 10.5pt; margin-top: 3px;">នាយកសាលា</div>
        <div style="height: 25px;"></div>
      </div>
      <div class="sem-extract-sig-right">
        <div class="td-editable sig-date-lunar" contenteditable="true" onblur="saveSemesterExtractDate('1', 'lunarTeacher', this.innerText)">${lunarTeacher}</div>
        <div class="td-editable sig-date-solar" contenteditable="true" onblur="saveSemesterExtractDate('1', 'solarTeacher', this.innerText)">${solarTeacher}</div>
        <div class="sig-role">គ្រូប្រចាំថ្នាក់</div>
        <div class="sig-name">${teacherName}</div>
      </div>
    </div>
  `;

  // Semester 2 Footer HTML (End of roster, Stats bracket & Signatures matching ដំណាច់ឆ្នាំ និង ឆមាសទី២.pdf)
  const sem2FooterHtml = `
    <div class="sem2-footer-container">
      <div class="sem2-footer-left">
        <div class="sem2-roster-end">
          បញ្ឈប់បញ្ជីត្រឹមចំនួនសិស្សសរុប <span class="num-bold">${pad2(totalStudents)}</span> នាក់ ស្រី <span class="num-bold">${pad2(femaleCount)}</span> នាក់
        </div>
        <div class="sem2-director-block">
          <div class="sem2-dir-seen">បានឃើញ និង ឯកភាព</div>
          <div class="sem2-dir-role">នាយកសាលា</div>
          <div style="height: 35px;"></div>
        </div>
      </div>

      <div class="sem2-footer-middle">
        <div class="sem2-stats-container">
          <div class="sem2-stats-title">សរុបសិស្សទទួលបាននិទ្ទេស</div>
          <div class="sem2-stats-bracket">
            <svg width="18" height="124" viewBox="0 0 18 124" fill="none" style="stroke: #002060; stroke-width: 1.6;">
              <path d="M 16 2 C 8 2, 3 6, 3 14 L 3 56 C 3 61, 0 62, 0 62 C 0 62, 3 64, 3 69 L 3 110 C 3 118, 8 122, 16 122" />
            </svg>
          </div>
          <div class="sem2-stats-list">
            <div class="sem2-stat-row">
              <span class="sem2-stat-grade">និទ្ទេស A</span>
              <span class="sem2-stat-have">មាន</span>
              <span class="sem2-stat-val">${pad2(stats.A.total)} នាក់</span>
              <span class="sem2-stat-female">ស្រី ${pad2(stats.A.female)} នាក់</span>
              <span class="sem2-stat-eq">ត្រូវជា</span>
              <span class="sem2-stat-pct">${stats.A.pct}%</span>
            </div>
            <div class="sem2-stat-row">
              <span class="sem2-stat-grade">និទ្ទេស B</span>
              <span class="sem2-stat-have">មាន</span>
              <span class="sem2-stat-val">${pad2(stats.B.total)} នាក់</span>
              <span class="sem2-stat-female">ស្រី ${pad2(stats.B.female)} នាក់</span>
              <span class="sem2-stat-eq">ត្រូវជា</span>
              <span class="sem2-stat-pct">${stats.B.pct}%</span>
            </div>
            <div class="sem2-stat-row">
              <span class="sem2-stat-grade">និទ្ទេស C</span>
              <span class="sem2-stat-have">មាន</span>
              <span class="sem2-stat-val">${pad2(stats.C.total)} នាក់</span>
              <span class="sem2-stat-female">ស្រី ${pad2(stats.C.female)} នាក់</span>
              <span class="sem2-stat-eq">ត្រូវជា</span>
              <span class="sem2-stat-pct">${stats.C.pct}%</span>
            </div>
            <div class="sem2-stat-row">
              <span class="sem2-stat-grade">និទ្ទេស D</span>
              <span class="sem2-stat-have">មាន</span>
              <span class="sem2-stat-val">${pad2(stats.D.total)} នាក់</span>
              <span class="sem2-stat-female">ស្រី ${pad2(stats.D.female)} នាក់</span>
              <span class="sem2-stat-eq">ត្រូវជា</span>
              <span class="sem2-stat-pct">${stats.D.pct}%</span>
            </div>
            <div class="sem2-stat-row">
              <span class="sem2-stat-grade">និទ្ទេស E</span>
              <span class="sem2-stat-have">មាន</span>
              <span class="sem2-stat-val">${pad2(stats.E.total)} នាក់</span>
              <span class="sem2-stat-female">ស្រី ${pad2(stats.E.female)} នាក់</span>
              <span class="sem2-stat-eq">ត្រូវជា</span>
              <span class="sem2-stat-pct">${stats.E.pct}%</span>
            </div>
            <div class="sem2-stat-row">
              <span class="sem2-stat-grade">និទ្ទេស F</span>
              <span class="sem2-stat-have">មាន</span>
              <span class="sem2-stat-val">${pad2(stats.F.total)} នាក់</span>
              <span class="sem2-stat-female">ស្រី ${pad2(stats.F.female)} នាក់</span>
              <span class="sem2-stat-eq">ត្រូវជា</span>
              <span class="sem2-stat-pct">${stats.F.pct}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="sem2-footer-right">
        <div class="td-editable sem2-date-lunar" contenteditable="true" onblur="saveSemesterExtractDate('2', 'lunarTeacher', this.innerText)">${lunarTeacher}</div>
        <div class="td-editable sem2-date-solar" contenteditable="true" onblur="saveSemesterExtractDate('2', 'solarTeacher', this.innerText)">${solarTeacher}</div>
        <div class="sem2-teacher-role">គ្រូប្រចាំថ្នាក់</div>
        <div class="sem2-teacher-name">${teacherName}</div>
      </div>
    </div>
  `;

  let finalHtml = "";
  const totalPages = pagesChunks.length;

  pagesChunks.forEach((chunkItems, pIndex) => {
    const isFirstPage = pIndex === 0;
    const isLastPage = pIndex === totalPages - 1;
    const pageNum = pIndex + 1;

    let pageTableHtml = "";
    if (sem === "1") {
      pageTableHtml = `
        <table class="sem-extract-table" style="${isFirstPage ? '' : 'margin-top: 4px;'}">
          ${buildTableHeaderHtmlSem1()}
          <tbody>
            ${buildTableRowsHtmlSem1(chunkItems)}
          </tbody>
        </table>
        ${isLastPage ? sem1SignaturesHtml : ""}
      `;
    } else {
      pageTableHtml = `
        <table class="sem-extract-table sem2-table" style="${isFirstPage ? '' : 'margin-top: 4px;'}">
          ${buildTableHeaderHtmlSem2()}
          <tbody>
            ${buildTableRowsHtmlSem2(chunkItems)}
          </tbody>
        </table>
        ${isLastPage ? sem2FooterHtml : ""}
      `;
    }

    finalHtml += `
      <div class="sem-extract-page" id="semExtractPage${pageNum}">
        ${isFirstPage ? topHeaderHtml : ""}
        ${pageTableHtml}
      </div>
    `;
  });

  container.innerHTML = finalHtml;
}
window.renderSemesterExtract = renderSemesterExtract;

function changeSemesterExtractClass(classId) {
  state.activeClassId = classId;
  const classSelects = document.querySelectorAll(".class-select-input");
  classSelects.forEach(sel => sel.value = classId);
  renderSemesterExtract();
}
window.changeSemesterExtractClass = changeSemesterExtractClass;

function changeSemesterExtractSem(sem) {
  state.activeSemesterExtractSem = sem;
  renderSemesterExtract();
}
window.changeSemesterExtractSem = changeSemesterExtractSem;

function printSemesterExtract() {
  prepareAdminPrint("semester_extract");
  window.print();
}
window.printSemesterExtract = printSemesterExtract;

function exportSemesterExtractExcel() {
  const currentClass = getActiveClass();
  if (!currentClass || !currentClass.students || currentClass.students.length === 0) {
    alert("មិនមានទិន្នន័យសិស្សសម្រាប់នាំចេញទេ");
    return;
  }
  if (typeof XLSX === "undefined") {
    alert("សូមរង់ចាំបណ្ណាល័យ XLSX ដំណើរការពេញលេញ");
    return;
  }

  const sem = state.activeSemesterExtractSem || "1";
  const semKhmerText = sem === "1" ? "ឆមាសទី១" : "ឆមាសទី២";
  const academicYear = currentClass.academicYear || state.activeYear || "២០២៥-២០២៦";
  const schoolName = (state.db && state.db.schoolInfo && state.db.schoolInfo.name) ? state.db.schoolInfo.name : "សាលាបឋមសិក្សា បាន្លួង";

  const wb = XLSX.utils.book_new();
  const wsData = [];

  wsData.push(["ព្រះរាជាណាចក្រកម្ពុជា"]);
  wsData.push(["ជាតិ សាសនា ព្រះមហាក្សត្រ"]);
  wsData.push([schoolName, "", "", "", "", "ឆ្នាំសិក្សា ៖ " + academicYear]);
  wsData.push([`តារាងស្រង់ពិន្ទុប្រចាំឆមាស និងឆ្នាំសិក្សា (${semKhmerText}) - ថ្នាក់ទី ៖ ` + getCleanStudyBookGrade(currentClass.grade)]);
  wsData.push([""]);

  if (sem === "1") {
    const headerRow = ["ល.រ", "គោត្តនាម", "នាម", "ភេទ"];
    SEMESTER_EXTRACT_SUBJECTS.forEach(sub => {
      headerRow.push(sub.name);
    });
    headerRow.push("មធ្យមភាគប្រឡងឆមាស", "មធ្យមភាគប្រចាំខែ", "មធ្យមភាគប្រចាំឆមាស", "ចំណាត់ថ្នាក់", "និទ្ទេស", "បំណិន-ចំណេះធ្វើ", "តម្លៃ-សីលធម៌", "សាមគ្គីភាព-ការចូលរួម");
    wsData.push(headerRow);
  } else {
    const headerRow = ["ល.រ", "គោត្តនាម", "នាម", "ភេទ"];
    SEMESTER_EXTRACT_SUBJECTS.forEach(sub => {
      headerRow.push(sub.name);
    });
    headerRow.push(
      "មធ្យមភាគប្រឡងឆមាសទី២", "មធ្យមភាគប្រចាំខែ", "មធ្យមភាគប្រចាំឆមាសទី២", "ចំណាត់ថ្នាក់ឆមាសទី២", "និទ្ទេសឆមាសទី២",
      "បំណិន-ចំណេះធ្វើ (ឆមាស២)", "តម្លៃ-សីលធម៌ (ឆមាស២)", "សាមគ្គីភាព-ការចូលរួម (ឆមាស២)",
      "មធ្យមភាគប្រចាំឆ្នាំ", "ចំណាត់ថ្នាក់ប្រចាំឆ្នាំ", "និទ្ទេសប្រចាំឆ្នាំ",
      "បំណិន-ចំណេះធ្វើ (ប្រចាំឆ្នាំ)", "តម្លៃ-សីលធម៌ (ប្រចាំឆ្នាំ)", "សាមគ្គីភាព-ការចូលរួម (ប្រចាំឆ្នាំ)",
      "សេចក្ដីផ្សេងៗ"
    );
    wsData.push(headerRow);
  }

  const students = currentClass.students || [];
  const sem1Months = ["តុលា", "វិច្ឆិកា", "ធ្នូ", "មករា", "កុម្ភៈ"];
  const sem2Months = ["មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា"];
  const semMonths = sem === "1" ? sem1Months : sem2Months;

  students.forEach((s, idx) => {
    let ln = s.lastName || "";
    let fn = s.firstName || "";
    if (!ln && !fn && s.fullName) {
      const parts = s.fullName.trim().split(/\s+/);
      ln = parts[0] || "";
      fn = parts.slice(1).join(" ") || "";
    }

    const sExtract = (currentClass.semesterExtractData && currentClass.semesterExtractData[sem] && currentClass.semesterExtractData[sem][s.num])
      ? currentClass.semesterExtractData[sem][s.num]
      : { scores: {}, mention: "", mention1: "ល្អ", mention2: "ល្អ", mention3: "ល្អ" };

    const sAnnual = (currentClass.semesterExtractAnnual && currentClass.semesterExtractAnnual[s.num])
      ? currentClass.semesterExtractAnnual[s.num]
      : { annualMention: "", annualMention1: "ល្អ", annualMention2: "ល្អ", annualMention3: "ល្អ", other: "" };

    const semExamData = getStudentSemesterExamScores(currentClass, sem, s);
    const semRec = semExamData.rec || {};

    const row = [idx + 1, ln, fn, s.gender || "ប្រុស"];
    let subTotal = 0, subCount = 0;

    SEMESTER_EXTRACT_SUBJECTS.forEach(sub => {
      let val = sExtract.scores[sub.key];
      if (val === undefined || val === null || val === "") {
        let r = parseFloat(semRec[sub.semKey]);
        if (isNaN(r) || r <= 0) r = 7.5;
        val = r;
      } else {
        val = parseFloat(val) || 0;
      }
      row.push(val);
      if (val > 0) { subTotal += val; subCount++; }
    });

    const examAvg = subCount > 0 ? Math.round((subTotal / subCount) * 100) / 100 : 0;

    let mTotal = 0, mCount = 0;
    semMonths.forEach(m => {
      const stats = getStudentMonthAvg(currentClass, m, s);
      if (stats.avg > 0) { mTotal += stats.avg; mCount++; }
    });
    const monthAvg = mCount > 0 ? Math.round((mTotal / mCount) * 100) / 100 : examAvg;
    const semAvg = examAvg > 0 ? Math.round(((monthAvg + examAvg) / 2) * 100) / 100 : monthAvg;

    const excelSemMention = toSemesterGradeLetter(sExtract.mention, semAvg);
    row.push(examAvg, monthAvg, semAvg);
    row.push("", excelSemMention || "", sExtract.mention1 || "ល្អ", sExtract.mention2 || "ល្អ", sExtract.mention3 || "ល្អ");

    if (sem === "2") {
      let sem1Avg = 0;
      if (currentClass.semesterExtractData["1"]?.[s.num]?.scores) {
        const s1Data = currentClass.semesterExtractData["1"][s.num];
        let s1Total = 0, s1Count = 0;
        SEMESTER_EXTRACT_SUBJECTS.forEach(sub => {
          let v = parseFloat(s1Data.scores[sub.key]);
          if (!isNaN(v) && v > 0) { s1Total += v; s1Count++; }
        });
        const s1ExamAvg = s1Count > 0 ? s1Total / s1Count : 0;
        let s1MTotal = 0, s1MCount = 0;
        sem1Months.forEach(m => {
          const stats = getStudentMonthAvg(currentClass, m, s);
          if (stats.avg > 0) { s1MTotal += stats.avg; s1MCount++; }
        });
        const s1MonthAvg = s1MCount > 0 ? s1MTotal / s1MCount : s1ExamAvg;
        sem1Avg = s1ExamAvg > 0 ? Math.round(((s1MonthAvg + s1ExamAvg) / 2) * 100) / 100 : s1MonthAvg;
      }
      if (sem1Avg <= 0) sem1Avg = semAvg > 0 ? semAvg : 7.5;

      const annualAvg = (sem1Avg > 0 && semAvg > 0) ? Math.round(((sem1Avg + semAvg) / 2) * 100) / 100 : semAvg;
      const excelAnnMention = toSemesterGradeLetter(sAnnual.annualMention, annualAvg);
      row.push(annualAvg, "", excelAnnMention || "", sAnnual.annualMention1 || "ល្អ", sAnnual.annualMention2 || "ល្អ", sAnnual.annualMention3 || "ល្អ", sAnnual.other || (annualAvg >= 5 ? "ឡើងថ្នាក់" : ""));
    }

    wsData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "ស្រង់ពិន្ទុឆមាស");

  const fileName = `ស្រង់ពិន្ទុប្រចាំឆមាស_${sem}_${(currentClass.grade || "ថ្នាក់").replace(/\s+/g, "_")}_${academicYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
window.exportSemesterExtractExcel = exportSemesterExtractExcel;


// ==========================================================================
// របាយការណ៍ប្រចាំខែ (MONTHLY TEACHER'S REPORT - A4 PORTRAIT)
// 100% Exact Replica matching របាយការណ៍ប្រចាំខែថ្មី.pdf
// ==========================================================================

function getMonthlyReportSavedData(classId, monthKey) {
  const currentClass = getActiveClass();
  if (!currentClass) return {};
  currentClass.monthlyReportData = currentClass.monthlyReportData || {};
  currentClass.monthlyReportData[monthKey] = currentClass.monthlyReportData[monthKey] || {};
  return currentClass.monthlyReportData[monthKey];
}

function saveMonthlyReportData(classId, monthKey, fieldKey, value) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  currentClass.monthlyReportData = currentClass.monthlyReportData || {};
  currentClass.monthlyReportData[monthKey] = currentClass.monthlyReportData[monthKey] || {};
  currentClass.monthlyReportData[monthKey][fieldKey] = value;
  if (typeof saveStateToStorage === 'function') {
    saveStateToStorage();
  }
}

function changeMonthlyReportMonth(month) {
  state.activeMonthlyReportMonth = month;
  state.activeScoreMonth = month;
  renderMonthlyReport();
}

function printMonthlyReport() {
  prepareAdminPrint("monthly_report");
  window.print();
}

function exportMonthlyReportToExcel() {
  const currentClass = getActiveClass();
  const monthKey = state.activeMonthlyReportMonth || state.activeScoreMonth || "មករា";
  const className = currentClass ? (currentClass.sheetCode || currentClass.grade || "ថ្នាក់") : "ថ្នាក់";
  
  if (typeof XLSX === 'undefined') {
    alert("SheetJS library is loading, please try again.");
    return;
  }

  // Create workbook with report data
  const wb = XLSX.utils.book_new();
  const wsData = [
    ["ព្រះរាជាណាចក្រកម្ពុជា"],
    ["ជាតិ សាសនា ព្រះមហាក្សត្រ"],
    ["សាលាបឋមសិក្សា បាន្លួង"],
    [`របាយការណ៍ប្រចាំខែ ${monthKey} ឆ្នាំ ${currentClass ? currentClass.academicYear : '២០២៦-២០២៧'}`],
    [],
    ["១. ស្ថិតិវត្តមាន និងអវត្តមាន"],
    ["ថ្នាក់ទី", "សិស្សសរុប (សរុប)", "សិស្សសរុប (ស្រី)", "ពេលដែលសិស្សត្រូវមកពរៀន", "ពេលដែលសិស្សបានមកពរៀន", "ពេលដែលសិស្សខានមកពរៀន", "ភាគរយនៃអវត្តមាន"]
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
  XLSX.writeFile(wb, `របាយការណ៍ប្រចាំខែ_${className}_${monthKey}.xlsx`);
}

function renderMonthlyReport() {
  let currentClass = getActiveClass();
  const container = document.getElementById("monthlyReportContentWrap");
  if (!container) return;

  // Fallback if no active class is selected
  if (!currentClass) {
    const candidate = (state.db && state.db.classes ? state.db.classes : []).find(
      c => c.academicYear === (state.activeYear || "២០២៦-២០២៧")
    );
    if (candidate) {
      currentClass = candidate;
      state.activeClassId = candidate.id;
    }
  }

  // Sync Selectors
  const monthKey = state.activeMonthlyReportMonth || state.activeScoreMonth || "មករា";
  state.activeMonthlyReportMonth = monthKey;

  const monthSelect = document.getElementById("monthlyReportMonthSelect");
  if (monthSelect) monthSelect.value = monthKey;

  const classSelect = document.getElementById("monthlyReportClassSelect");
  if (classSelect && currentClass) classSelect.value = currentClass.id;

  if (!currentClass) {
    container.innerHTML = `<p style="text-align:center; padding: 40px; font-family: var(--font-battambang); color: #64748b;">សូមជ្រើសរើសថ្នាក់រៀន</p>`;
    return;
  }

  // Resolve class grade key for baseline data
  let classGradeKey = currentClass.grade || "ថ្នាក់ទី១";
  if (currentClass.id === 'CLS_មត្តេយ្យ១' || (currentClass.grade && currentClass.grade.includes("មត្តេយ្យ"))) {
    classGradeKey = "ថ្នាក់មត្តេយ្យ";
  } else if (currentClass.sheetCode && currentClass.sheetCode.startsWith("G")) {
    classGradeKey = `ថ្នាក់ទី${currentClass.sheetCode.replace("G", "")}`;
  }

  const baseData = (typeof getEffectiveClassMonthlyData === "function")
    ? getEffectiveClassMonthlyData(classGradeKey, monthKey)
    : (window.BASELINE_CLASS_REPORTS?.[classGradeKey] || null);

  const saved = getMonthlyReportSavedData(currentClass.id, monthKey);
  const students = currentClass.students || [];
  const totalStudents = students.length || (baseData ? baseData.total : 35);
  const femaleStudents = students.length ? students.filter(s => s.gender === "ស្រី").length : (baseData ? baseData.female : 18);
  const teacherName = currentClass.teacher || (baseData ? baseData.teacher : "ផន ច័ន្ទតារា");
  const classNameDisplay = classGradeKey;
  const classCodeFormatted = classNameDisplay.includes("ថ្នាក់") ? classNameDisplay : `ថ្នាក់ទី ${classNameDisplay}`;

  // 1. Calculate Attendance Stats
  // Check attendance records for this month
  let absentCount = 0;
  if (currentClass.attendanceRecords && currentClass.attendanceRecords[monthKey]) {
    const recs = currentClass.attendanceRecords[monthKey];
    Object.values(recs).forEach(dayObj => {
      if (typeof dayObj === 'object') {
        Object.values(dayObj).forEach(status => {
          if (status === 'A' || status === 'P' || status === 'អ') absentCount++;
        });
      }
    });
  }

  // Standard sessions in a month: 22 teaching days * 2 sessions = 44 sessions per student
  const sessionsPerStudent = 44;
  const totalPrescribed = totalStudents > 0 ? (totalStudents * sessionsPerStudent) : (baseData ? baseData.prescribed : 880);
  const totalAbsent = absentCount > 0 ? absentCount : (baseData ? baseData.absent : Math.round(totalStudents * 0.4) || 12);
  const totalAttended = totalPrescribed > totalAbsent ? (totalPrescribed - totalAbsent) : (baseData ? baseData.attended : totalPrescribed);
  const absencePercentVal = totalPrescribed > 0 ? ((totalAbsent / totalPrescribed) * 100).toFixed(2) + '%' : (baseData ? baseData.absentPct : '1.50%');

  // Allow saved override or fallback to authentic calculated/base data
  const t1_class = (saved.t1_class !== undefined && saved.t1_class !== "") ? saved.t1_class : classNameDisplay;
  const t1_total = (saved.t1_total !== undefined && saved.t1_total !== "") ? saved.t1_total : totalStudents;
  const t1_female = (saved.t1_female !== undefined && saved.t1_female !== "") ? saved.t1_female : femaleStudents;
  const t1_prescribed = (saved.t1_prescribed !== undefined && saved.t1_prescribed !== "") ? saved.t1_prescribed : totalPrescribed;
  const t1_attended = (saved.t1_attended !== undefined && saved.t1_attended !== "") ? saved.t1_attended : totalAttended;
  const t1_absent = (saved.t1_absent !== undefined && saved.t1_absent !== "") ? saved.t1_absent : totalAbsent;
  const t1_pct = (saved.t1_pct !== undefined && saved.t1_pct !== "") ? saved.t1_pct : absencePercentVal;

  const t1_all_total = (saved.t1_all_total !== undefined && saved.t1_all_total !== "") ? saved.t1_all_total : totalStudents;
  const t1_all_female = (saved.t1_all_female !== undefined && saved.t1_all_female !== "") ? saved.t1_all_female : femaleStudents;
  const t1_all_prescribed = (saved.t1_all_prescribed !== undefined && saved.t1_all_prescribed !== "") ? saved.t1_all_prescribed : totalPrescribed;
  const t1_all_attended = (saved.t1_all_attended !== undefined && saved.t1_all_attended !== "") ? saved.t1_all_attended : totalAttended;
  const t1_all_absent = (saved.t1_all_absent !== undefined && saved.t1_all_absent !== "") ? saved.t1_all_absent : totalAbsent;
  const t1_all_pct = (saved.t1_all_pct !== undefined && saved.t1_all_pct !== "") ? saved.t1_all_pct : absencePercentVal;

  // 2. Calculate Monthly Results (A, B, C, D, E, F)
  let countA = 0, countA_F = 0;
  let countB = 0, countB_F = 0;
  let countC = 0, countC_F = 0;
  let countD = 0, countD_F = 0;
  let countE = 0, countE_F = 0;
  let countF = 0, countF_F = 0;

  const mScores = (currentClass.monthlyScores && currentClass.monthlyScores[monthKey]) ? currentClass.monthlyScores[monthKey] : {};
  let scoredCount = 0;

  students.forEach(s => {
    let sRec = mScores[s.num];
    let avg = 0;
    if (sRec) {
      let sum = 0, cnt = 0;
      Object.keys(sRec).forEach(subj => {
        const val = parseFloat(sRec[subj]);
        if (!isNaN(val)) {
          sum += val;
          cnt++;
        }
      });
      if (cnt > 0) avg = sum / cnt;
    }
    if (!avg && s.avgScore) {
      avg = parseFloat(s.avgScore);
    } else if (!avg && s.scores) {
      let sum = 0, cnt = 0;
      Object.values(s.scores).forEach(v => {
        const val = parseFloat(v);
        if (!isNaN(val)) { sum += val; cnt++; }
      });
      if (cnt > 0) avg = sum / cnt;
    }

    if (avg > 0) {
      scoredCount++;
      const isF = s.gender === "ស្រី";
      if (avg >= 9.0) { countA++; if (isF) countA_F++; }
      else if (avg >= 8.0) { countB++; if (isF) countB_F++; }
      else if (avg >= 7.0) { countC++; if (isF) countC_F++; }
      else if (avg >= 6.0) { countD++; if (isF) countD_F++; }
      else if (avg >= 5.0) { countE++; if (isF) countE_F++; }
      else { countF++; if (isF) countF_F++; }
    }
  });

  if (scoredCount === 0 && baseData && baseData.scores) {
    countA = baseData.scores.a_all || 0; countA_F = baseData.scores.a_fem || 0;
    countB = baseData.scores.b_all || 0; countB_F = baseData.scores.b_fem || 0;
    countC = baseData.scores.c_all || 0; countC_F = baseData.scores.c_fem || 0;
    countD = baseData.scores.d_all || 0; countD_F = baseData.scores.d_fem || 0;
    countE = baseData.scores.e_all || 0; countE_F = baseData.scores.e_fem || 0;
    countF = baseData.scores.f_all || 0; countF_F = baseData.scores.f_fem || 0;
  }

  // Table 2 values (allow saved overrides or defaults)
  const t2_tot_all = (saved.t2_tot_all !== undefined && saved.t2_tot_all !== "") ? saved.t2_tot_all : totalStudents;
  const t2_tot_fem = (saved.t2_tot_fem !== undefined && saved.t2_tot_fem !== "") ? saved.t2_tot_fem : femaleStudents;
  const t2_a_all = (saved.t2_a_all !== undefined && saved.t2_a_all !== "") ? saved.t2_a_all : countA;
  const t2_a_fem = (saved.t2_a_fem !== undefined && saved.t2_a_fem !== "") ? saved.t2_a_fem : countA_F;
  const t2_b_all = (saved.t2_b_all !== undefined && saved.t2_b_all !== "") ? saved.t2_b_all : countB;
  const t2_b_fem = (saved.t2_b_fem !== undefined && saved.t2_b_fem !== "") ? saved.t2_b_fem : countB_F;
  const t2_c_all = (saved.t2_c_all !== undefined && saved.t2_c_all !== "") ? saved.t2_c_all : countC;
  const t2_c_fem = (saved.t2_c_fem !== undefined && saved.t2_c_fem !== "") ? saved.t2_c_fem : countC_F;
  const t2_d_all = (saved.t2_d_all !== undefined && saved.t2_d_all !== "") ? saved.t2_d_all : countD;
  const t2_d_fem = (saved.t2_d_fem !== undefined && saved.t2_d_fem !== "") ? saved.t2_d_fem : countD_F;
  const t2_e_all = (saved.t2_e_all !== undefined && saved.t2_e_all !== "") ? saved.t2_e_all : countE;
  const t2_e_fem = (saved.t2_e_fem !== undefined && saved.t2_e_fem !== "") ? saved.t2_e_fem : countE_F;
  const t2_f_all = (saved.t2_f_all !== undefined && saved.t2_f_all !== "") ? saved.t2_f_all : countF;
  const t2_f_fem = (saved.t2_f_fem !== undefined && saved.t2_f_fem !== "") ? saved.t2_f_fem : countF_F;

  // 3. Subjects for Table 3
  const subjects = [
    { num: "១", name: "ភាសាខ្មែរ", key: "khmer" },
    { num: "២", name: "គណិតវិទ្យា", key: "math" },
    { num: "៣", name: "សិក្សាសង្គម", key: "social" },
    { num: "៤", name: "វិទ្យាសាស្ត្រ", key: "science" }
  ];

  const baseCurriculum = (baseData && baseData.curriculum) || {
    khmer: "ការអាន និងសរសេរពាក្យគន្លឹះ",
    math: "វិធីបូក ដក គុណ ចែក និងធរណីមាត្រ",
    social: "ប្រវត្តិភូមិសាលា និងសុជីវធម៌សង្គម",
    science: "សារពាង្គកាយមានជីវិត និងបរិស្ថាន"
  };

  const baseFastRes = (baseData && baseData.fast_res) || { khmer: "70%", math: "65%", social: "75%", science: "60%" };
  const baseSlowRes = (baseData && baseData.slow_res) || { khmer: "30%", math: "35%", social: "25%", science: "40%" };

  let t3_rows_html = "";
  subjects.forEach(sub => {
    const rawLesson = saved[`t3_lesson_${sub.key}`];
    const lesson = (rawLesson !== undefined && rawLesson !== "") ? rawLesson : (baseCurriculum[sub.key] || "ការអាន និងសរសេរ");

    const defFastPctStr = (baseFastRes[sub.key] || "70%").replace('%', '');
    const defFastPctVal = parseInt(defFastPctStr) || 70;
    const defFastNum = Math.max(1, Math.round(totalStudents * (defFastPctVal / 100)));
    const defFastDen = totalStudents;
    const defFastResVal = ((defFastNum / defFastDen) * 100).toFixed(0) + "%";

    const defSlowNum = defFastDen - defFastNum;
    const defSlowDen = defFastDen;
    const defSlowResVal = ((defSlowNum / defSlowDen) * 100).toFixed(0) + "%";

    const fast_num = (saved[`t3_${sub.key}_fast_num`] !== undefined && saved[`t3_${sub.key}_fast_num`] !== "") ? saved[`t3_${sub.key}_fast_num`] : defFastNum;
    const fast_den = (saved[`t3_${sub.key}_fast_den`] !== undefined && saved[`t3_${sub.key}_fast_den`] !== "") ? saved[`t3_${sub.key}_fast_den`] : defFastDen;
    const fast_res = (saved[`t3_${sub.key}_fast_res`] !== undefined && saved[`t3_${sub.key}_fast_res`] !== "") ? saved[`t3_${sub.key}_fast_res`] : defFastResVal;
    const slow_num = (saved[`t3_${sub.key}_slow_num`] !== undefined && saved[`t3_${sub.key}_slow_num`] !== "") ? saved[`t3_${sub.key}_slow_num`] : defSlowNum;
    const slow_den = (saved[`t3_${sub.key}_slow_den`] !== undefined && saved[`t3_${sub.key}_slow_den`] !== "") ? saved[`t3_${sub.key}_slow_den`] : defSlowDen;
    const slow_res = (saved[`t3_${sub.key}_slow_res`] !== undefined && saved[`t3_${sub.key}_slow_res`] !== "") ? saved[`t3_${sub.key}_slow_res`] : defSlowResVal;

    t3_rows_html += `
      <tr>
        <td style="font-family: 'Khmer OS Content-Bold', var(--font-battambang); font-weight: bold; width: 6%;">${sub.num}</td>
        <td style="font-family: 'Khmer OS Content-Bold', var(--font-battambang); font-weight: bold; width: 14%; text-align: left; padding-left: 6px;">${sub.name}</td>
        <td style="width: 44%; text-align: left; padding-left: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span contenteditable="true" style="flex-grow: 1;" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't3_lesson_${sub.key}')">${lesson}</span>
            <button type="button" class="btn-lesson-pick no-print" onclick="openSubjectLessonPicker('${sub.key}', '${sub.name}')" title="រើសមេរៀន ${sub.name} ពីបណ្ណាល័យ">
              <i class="fa-solid fa-book-bookmark"></i>
            </button>
          </div>
        </td>
        <td style="width: 18%;">
          <div class="report-calc-box">
            <div class="report-calc-frac">
              <span class="report-calc-num" contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't3_${sub.key}_fast_num')">${fast_num}</span>
              <span class="report-calc-den" contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't3_${sub.key}_fast_den')">${fast_den}</span>
            </div>
            <span style="font-size: 8pt; margin: 0 1px;">&times; 100</span>
            <span class="report-calc-eq">=</span>
            <span class="report-calc-res" contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't3_${sub.key}_fast_res')">${fast_res}</span>
          </div>
        </td>
        <td style="width: 18%;">
          <div class="report-calc-box">
            <div class="report-calc-frac">
              <span class="report-calc-num" contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't3_${sub.key}_slow_num')">${slow_num}</span>
              <span class="report-calc-den" contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't3_${sub.key}_slow_den')">${slow_den}</span>
            </div>
            <span style="font-size: 8pt; margin: 0 1px;">&times; 100</span>
            <span class="report-calc-eq">=</span>
            <span class="report-calc-res" contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't3_${sub.key}_slow_res')">${slow_res}</span>
          </div>
        </td>
      </tr>
    `;
  });

  // 4. Middle Lesson Days Note
  const lessonGrade = saved.lessonGrade || classCodeFormatted;
  const lessonDays = saved.lessonDays || "២២ ថ្ងៃ";

  // 5. Table 4: Teaching Materials (4 rows)
  const defaultMaterials = [
    { name: "ប័ណ្ណពាក្យ និងរូបភាពបង្រៀន", qty: "៤ កញ្ចប់", other: "ប្រើប្រាស់ល្អ" },
    { name: "បន្ទាត់ ត្រីកោណ ដែកឈាន", qty: "២ ឈុត", other: "ប្រើប្រាស់ល្អ" },
    { name: "ផ្ទាំងគំនូរបំព្រួញ និងតារាងប្រមាណវិធី", qty: "៣ ផ្ទាំង", other: "ប្រើប្រាស់ល្អ" },
    { name: "វត្ថុជាក់ស្តែង និងគំរូសត្វ រុក្ខជាតិ", qty: "៥ មុខ", other: "ប្រើប្រាស់ល្អ" }
  ];

  let t4_rows_html = "";
  for (let i = 1; i <= 4; i++) {
    const khmerNum = i === 1 ? "១" : i === 2 ? "២" : i === 3 ? "៣" : "៤";
    const defM = defaultMaterials[i - 1];
    const matName = (saved[`t4_name_${i}`] !== undefined && saved[`t4_name_${i}`] !== "") ? saved[`t4_name_${i}`] : defM.name;
    const matQty = (saved[`t4_qty_${i}`] !== undefined && saved[`t4_qty_${i}`] !== "") ? saved[`t4_qty_${i}`] : defM.qty;
    const matOther = (saved[`t4_other_${i}`] !== undefined && saved[`t4_other_${i}`] !== "") ? saved[`t4_other_${i}`] : defM.other;
    t4_rows_html += `
      <tr>
        <td style="font-family: 'Khmer OS Content-Bold', var(--font-battambang); font-weight: bold; width: 6%;">${khmerNum}</td>
        <td style="width: 44%; text-align: left; padding-left: 8px;">
          <div contenteditable="true" style="min-height: 20px;" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't4_name_${i}')">${matName}</div>
        </td>
        <td style="width: 25%;">
          <div contenteditable="true" style="min-height: 20px;" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't4_qty_${i}')">${matQty}</div>
        </td>
        <td style="width: 25%;">
          <div contenteditable="true" style="min-height: 20px;" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't4_other_${i}')">${matOther}</div>
        </td>
      </tr>
    `;
  }

  // 6. Signatures & Date
  const currentYearDisplay = (currentClass.academicYear && currentClass.academicYear.split('-')[0]) || "២០២៦";
  const reportDate = saved.reportDate || `ធ្វើនៅថ្ងៃទី ២៥ ខែ ${monthKey} ឆ្នាំ ${currentYearDisplay}`;
  const teacherNameDisplay = saved.teacherName || currentClass.teacher || (baseData ? baseData.teacher : "ផន ច័ន្ទតារា");

  // Build the complete HTML
  container.innerHTML = `
    <div class="monthly-report-page" id="monthlyReportPagePrint">
      
      <!-- TOP HEADER (Motto & Flourish) -->
      <div class="report-header-center">
        <div class="report-motto-1">ព្រះរាជាណាចក្រកម្ពុជា</div>
        <div class="report-motto-2">ជាតិ  សាសនា  ព្រះមហាក្សត្រ</div>
        <img src="report_flourish.png" alt="flourish" class="report-flourish-img">
      </div>

      <!-- SCHOOL NAME & REPORT TITLE -->
      <div class="report-school-title">សាលាបឋមសិក្សា បាន្លួង</div>
      <div class="report-main-title">
        របាយការណ៍ប្រចាំខែ <span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 'titleMonth')">${saved.titleMonth || monthKey}</span> ឆ្នាំ <span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 'titleYear')">${saved.titleYear || currentYearDisplay}</span>
      </div>

      <!-- TABLE 1: ATTENDANCE & ENROLLMENT (ស្ថិតិវត្តមាន និងអវត្តមាន) -->
      <table class="report-table report-table-1">
        <thead>
          <tr>
            <th rowspan="2" style="width: 11%;">ថ្នាក់ទី</th>
            <th colspan="2" style="width: 14%;">សិស្សសរុប</th>
            <th rowspan="2" style="width: 18%;">ពេលដែលសិស្ស<br>ត្រូវមកពរៀន</th>
            <th rowspan="2" style="width: 18%;">ពេលដែលសិស្ស<br>បានមកពរៀន</th>
            <th rowspan="2" style="width: 18%;">ពេលដែលសិស្ស<br>ខានមកពរៀន</th>
            <th rowspan="2" style="width: 21%;">ភាគរយនៃអវត្តមាន</th>
          </tr>
          <tr>
            <th style="width: 7%;">សរុប</th>
            <th style="width: 7%;">ស្រី</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_class')">${t1_class}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_total')">${t1_total}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_female')">${t1_female}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_prescribed')">${t1_prescribed}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_attended')">${t1_attended}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_absent')">${t1_absent}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_pct')">${t1_pct}</span></td>
          </tr>
          <tr>
            <td style="font-family: 'Khmer OS Content-Bold', var(--font-battambang); font-weight: bold;">សរុបរួម</td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_all_total')">${t1_all_total}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_all_female')">${t1_all_female}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_all_prescribed')">${t1_all_prescribed}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_all_attended')">${t1_all_attended}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_all_absent')">${t1_all_absent}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't1_all_pct')">${t1_all_pct}</span></td>
          </tr>
        </tbody>
      </table>

      <!-- SECTION 2: MONTHLY RESULTS (➢ លទ្ធផលប្រចាំខែ) -->
      <div class="report-sec-heading underline">
        <span class="report-bullet">➢</span>
        <span class="report-sec-text">លទ្ធផលប្រចាំខែ</span>
      </div>

      <table class="report-table report-table-2">
        <thead>
          <tr>
            <th rowspan="2" style="width: 11%;">ថ្នាក់ទី</th>
            <th colspan="2" style="width: 13%;">សិស្សសរុប</th>
            <th colspan="2" style="width: 13%;">A (9-10)</th>
            <th colspan="2" style="width: 13%;">B (8.0-8.99)</th>
            <th colspan="2" style="width: 13%;">C (7-7.99)</th>
            <th colspan="2" style="width: 13%;">D (6-6.99)</th>
            <th colspan="2" style="width: 12%;">E (5-5.99)</th>
            <th colspan="2" style="width: 12%;">F (0-4.99)</th>
          </tr>
          <tr>
            <th style="width: 6.5%;">សរ</th>
            <th style="width: 6.5%;">ស</th>
            <th style="width: 6.5%;">សរ</th>
            <th style="width: 6.5%;">ស</th>
            <th style="width: 6.5%;">សរ</th>
            <th style="width: 6.5%;">ស</th>
            <th style="width: 6.5%;">សរ</th>
            <th style="width: 6.5%;">ស</th>
            <th style="width: 6.5%;">សរ</th>
            <th style="width: 6.5%;">ស</th>
            <th style="width: 6%;">សរ</th>
            <th style="width: 6%;">ស</th>
            <th style="width: 6%;">សរ</th>
            <th style="width: 6%;">ស</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_class')">${saved.t2_class || classNameDisplay}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_tot_all')">${t2_tot_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_tot_fem')">${t2_tot_fem}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_a_all')">${t2_a_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_a_fem')">${t2_a_fem}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_b_all')">${t2_b_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_b_fem')">${t2_b_fem}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_c_all')">${t2_c_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_c_fem')">${t2_c_fem}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_d_all')">${t2_d_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_d_fem')">${t2_d_fem}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_e_all')">${t2_e_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_e_fem')">${t2_e_fem}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_f_all')">${t2_f_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_f_fem')">${t2_f_fem}</span></td>
          </tr>
          <tr>
            <td style="font-family: 'Khmer OS Content-Bold', var(--font-battambang); font-weight: bold;">សរុបរួម</td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_tot_all')">${saved.t2_all_tot_all !== undefined ? saved.t2_all_tot_all : t2_tot_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_tot_fem')">${saved.t2_all_tot_fem !== undefined ? saved.t2_all_tot_fem : t2_tot_fem}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_a_all')">${saved.t2_all_a_all !== undefined ? saved.t2_all_a_all : t2_a_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_a_fem')">${saved.t2_all_a_fem !== undefined ? saved.t2_all_a_fem : t2_a_fem}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_b_all')">${saved.t2_all_b_all !== undefined ? saved.t2_all_b_all : t2_b_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_b_fem')">${saved.t2_all_b_fem !== undefined ? saved.t2_all_b_fem : t2_b_fem}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_c_all')">${saved.t2_all_c_all !== undefined ? saved.t2_all_c_all : t2_c_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_c_fem')">${saved.t2_all_c_fem !== undefined ? saved.t2_all_c_fem : t2_c_fem}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_d_all')">${saved.t2_all_d_all !== undefined ? saved.t2_all_d_all : t2_d_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_d_fem')">${saved.t2_all_d_fem !== undefined ? saved.t2_all_d_fem : t2_d_fem}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_e_all')">${saved.t2_all_e_all !== undefined ? saved.t2_all_e_all : t2_e_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_e_fem')">${saved.t2_all_e_fem !== undefined ? saved.t2_all_e_fem : t2_e_fem}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_f_all')">${saved.t2_all_f_all !== undefined ? saved.t2_all_f_all : t2_f_all}</span></td>
            <td><span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 't2_all_f_fem')">${saved.t2_all_f_fem !== undefined ? saved.t2_all_f_fem : t2_f_fem}</span></td>
          </tr>
        </tbody>
      </table>

      <!-- SECTION 3: CURRICULUM PROGRESS (➢ ឈ្មោះ និង ភាគរយនៃមេរៀនចុងក្រោយ ក្នុងខែ) -->
      <div class="report-sec-heading">
        <span class="report-bullet">➢</span>
        <span class="report-sec-text">ឈ្មោះ និង ភាគរយនៃមេរៀនចុងក្រោយ ក្នុងខែ</span>
      </div>

      <!-- SMART LIBRARY HELPER BAR (No-Print) -->
      ${(() => {
        const classGrade = currentClass ? (currentClass.grade || "") : "";
        const hasBooksForGrade = (typeof libraryState !== "undefined" && libraryState.allBooks)
          ? libraryState.allBooks.some(b => b.grade === classGrade)
          : (classGrade !== "ថ្នាក់មត្តេយ្យ");
        
        return `
          <div class="report-library-helper no-print">
            <span class="report-helper-title"><i class="fa-solid fa-wand-magic-sparkles" style="color: #0d9488;"></i> ជំនួយការមេរៀនបណ្ណាល័យ (${classGrade})៖</span>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              ${!hasBooksForGrade ? `
                <span style="font-size: 13px; color: #b45309; background: #fef3c7; padding: 4px 10px; border-radius: 6px; border: 1px solid #fde68a;">
                  <i class="fa-solid fa-folder-open"></i> កម្រិត ${classGrade} មិនទាន់មានសៀវភៅរក្សាទុក (ទទេ)
                </span>
                <button type="button" class="btn btn-sm btn-primary" onclick="switchTab('library'); if (typeof setLibraryGradeFilter === 'function') setLibraryGradeFilter('${classGrade}');" title="នាំសៀវភៅ ឬកម្មវិធីសិក្សាចូលបណ្ណាល័យ">
                  <i class="fa-solid fa-file-arrow-up"></i> នាំសៀវភៅចូលក្នុងបណ្ណាល័យ
                </button>
              ` : `
                <button type="button" class="btn btn-sm btn-outline-teal" onclick="autoFillLessonsForCurrentReportMonth()" title="ជ្រើសរើសមេរៀនដោយស្វ័យប្រវត្តិតាមខែ និងកម្រិតថ្នាក់ពីបណ្ណាល័យ">
                  <i class="fa-solid fa-bolt"></i> បំពេញមេរៀនស្វ័យប្រវត្តិតាមខែ (${monthKey})
                </button>
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="switchTab('library'); if (typeof setLibraryGradeFilter === 'function') setLibraryGradeFilter('${classGrade}');" title="បើកបណ្ណាល័យដើម្បីរើសមេរៀន ឬបើកអានសៀវភៅ">
                  <i class="fa-solid fa-book-bookmark"></i> បើកបណ្ណាល័យថ្នាក់រៀន
                </button>
              `}
            </div>
          </div>
        `;
      })()}

      <table class="report-table report-table-3">
        <thead>
          <tr>
            <th rowspan="2" style="width: 6%;">ល.រ</th>
            <th rowspan="2" style="width: 14%;">មុខវិជ្ជា</th>
            <th rowspan="2" style="width: 44%;">ឈ្មោះមេរៀនចុងក្រោយ</th>
            <th colspan="2" style="width: 36%;">ភាគរយ</th>
          </tr>
          <tr>
            <th style="width: 18%;">លឿន</th>
            <th style="width: 18%;">យឺត</th>
          </tr>
        </thead>
        <tbody>
          ${t3_rows_html}
        </tbody>
      </table>

      <!-- MIDDLE ROW: SECTION 4 TITLE + LESSON PLAN DAYS NOTE -->
      <div class="report-mid-row">
        <div class="report-sec-heading" style="margin: 0;">
          <span class="report-bullet">➢</span>
          <span class="report-sec-text">ផលិតសម្ភារៈរដ្ឋបាល</span>
        </div>
        <div class="report-lesson-note">
          ថ្នាក់ទី <span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 'lessonGrade')">${lessonGrade}</span> ធ្វើកិច្ចតែងការបង្រៀនបានចំនួន <span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 'lessonDays')">${lessonDays}</span> ថ្ងៃ  ។
        </div>
      </div>

      <!-- TABLE 4: TEACHING MATERIALS (ផលិតសម្ភារៈរដ្ឋបាល) -->
      <table class="report-table report-table-4">
        <thead>
          <tr>
            <th style="width: 6%;">ល.រ</th>
            <th style="width: 44%;">ឈ្មោះសម្ភារៈផលិតបានក្នុងខែ</th>
            <th style="width: 25%;">ចំនួន</th>
            <th style="width: 25%;">ផ្សេងៗ</th>
          </tr>
        </thead>
        <tbody>
          ${t4_rows_html}
        </tbody>
      </table>

      <!-- FOOTER ROW: NOTICE BOX & SIGNATURE -->
      <div class="report-footer-row">
        <div class="report-notice-box">
          <p>សូមយករបាយការណ៍មកទីចាត់ការរៀងរាល់ថ្ងៃទី២០រាល់ខែ ប្រសិនបើទី២០ចំថ្ងៃអាទិត្យ</p>
          <p>ត្រូវពន្យាទៅថ្ងៃទី២១វិញ (ព័ត៌មានធានាថាប្រាកដត្រឹមត្រូវទាន់ពេល )</p>
        </div>

        <div class="report-sig-box">
          <div class="report-sig-date">
            <span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 'reportDate')">${reportDate}</span>
          </div>
          <div class="report-sig-role">គ្រូប្រចាំថ្នាក់</div>
          <div class="report-sig-name">
            <span contenteditable="true" onblur="saveMonthlyReportField(this, '${currentClass.id}', '${monthKey}', 'teacherName')">${teacherNameDisplay}</span>
          </div>
        </div>
      </div>

    </div>
  `;
}

function saveMonthlyReportField(elem, classId, monthKey, fieldKey) {
  const val = elem.innerText.trim();
  saveMonthlyReportData(classId, monthKey, fieldKey, val);
}

function resetMonthlyReportDefaults() {
  const currentClass = getActiveClass();
  const monthKey = state.activeMonthlyReportMonth || state.activeScoreMonth || "មករា";
  if (currentClass && currentClass.monthlyReportData && currentClass.monthlyReportData[monthKey]) {
    delete currentClass.monthlyReportData[monthKey];
    if (typeof saveStateToStorage === 'function') {
      saveStateToStorage();
    }
    renderMonthlyReport();
  }
}


/* ==========================================================================
   STAFF INFORMATION MANAGEMENT (ព័ត៌មានបុគ្គលិក - 100% IDENTICAL TO EXCEL TEMPLATE)
   ========================================================================== */

function getStaffList() {
  if (state.db && Array.isArray(state.db.staffList) && state.db.staffList.length > 0) {
    return state.db.staffList;
  }
  if (typeof INITIAL_SCHOOL_DATA !== "undefined" && INITIAL_SCHOOL_DATA && Array.isArray(INITIAL_SCHOOL_DATA.staffList)) {
    if (state.db) {
      state.db.staffList = JSON.parse(JSON.stringify(INITIAL_SCHOOL_DATA.staffList));
      return state.db.staffList;
    }
    return INITIAL_SCHOOL_DATA.staffList;
  }
  return [];
}

let staffInfoFilterQuery = "";

function filterStaffInfoTable() {
  const input = document.getElementById("staffInfoSearch");
  staffInfoFilterQuery = input ? input.value.trim().toLowerCase() : "";
  renderStaffInfoTableBody();
}

function showStaffSaveIndicator() {
  const el = document.getElementById("staffSaveIndicator");
  if (!el) return;
  el.style.display = "inline-flex";
  if (window._staffSaveTimer) clearTimeout(window._staffSaveTimer);
  window._staffSaveTimer = setTimeout(() => {
    el.style.display = "none";
  }, 2500);
}

function handleStaffCellBlur(cell, realIdx, field) {
  if (!window.authSystem || !window.authSystem.isAdmin()) return;
  const list = getStaffList();
  if (!list || !list[realIdx]) return;

  const newVal = cell.innerText.trim();
  const staff = list[realIdx];
  if (staff[field] !== newVal) {
    staff[field] = newVal;
    if (field === "lastName" || field === "firstName") {
      staff.fullName = `${staff.lastName || ""} ${staff.firstName || ""}`.trim();
    }
    if (field === "spouseLastName" || field === "spouseFirstName") {
      staff.spouseFullName = `${staff.spouseLastName || ""} ${staff.spouseFirstName || ""}`.trim();
    }
    saveDatabase();
    showStaffSaveIndicator();
  }
}

function handleStaffCellKeydown(event, cell) {
  if (event.key === "Enter") {
    event.preventDefault();
    cell.blur();
  }
}

function addNewStaffMember() {
  if (!window.authSystem || !window.authSystem.isAdmin()) {
    alert("មុខងារនេះសម្រាប់តែអ្នកគ្រប់គ្រង (Admin) ប៉ុណ្ណោះ!");
    return;
  }
  if (!state.db) state.db = normalizeSchoolDatabase(null);
  if (!state.db.staffList || !Array.isArray(state.db.staffList)) {
    state.db.staffList = JSON.parse(JSON.stringify(getStaffList()));
  }

  const newNum = state.db.staffList.length + 1;
  const newStaff = {
    num: newNum,
    lastName: "បុគ្គលិក",
    firstName: "ថ្មី",
    fullName: "បុគ្គលិក ថ្មី",
    gender: "ប្រុស",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
    pobVillage: "",
    pobCommune: "",
    age: "",
    phone: "",
    education: "",
    entryDay: "",
    entryMonth: "",
    entryYear: "",
    role: "គ្រូបង្រៀន",
    salaryScale: "",
    frameworkType: "ក្របខណ្ឌ",
    officialId: "",
    bankAccount: "",
    spouseLastName: "",
    spouseFirstName: "",
    spouseFullName: "",
    childrenCount: "0",
    currVillage: "",
    currCommune: "",
    nationalId: "",
    appointDay: "",
    appointMonth: "",
    appointYear: ""
  };

  state.db.staffList.push(newStaff);
  saveDatabase();
  renderStaffInfo();
  showStaffSaveIndicator();
}

function deleteStaffMember(realIdx) {
  if (!window.authSystem || !window.authSystem.isAdmin()) {
    alert("មុខងារនេះសម្រាប់តែអ្នកគ្រប់គ្រង (Admin) ប៉ុណ្ណោះ!");
    return;
  }
  const list = getStaffList();
  if (!list || !list[realIdx]) return;

  const s = list[realIdx];
  const name = s.fullName || `${s.lastName || ""} ${s.firstName || ""}`.trim() || `ល.រ ${s.num}`;
  if (!confirm(`តើលោកអ្នកពិតជាចង់លុបទិន្នន័យរបស់ "${name}" ចេញពីបញ្ជីបុគ្គលិកមែនទេ?`)) {
    return;
  }

  list.splice(realIdx, 1);
  list.forEach((item, i) => { item.num = i + 1; });
  saveDatabase();
  renderStaffInfo();
  showStaffSaveIndicator();
}

function resetStaffInfoToDefault() {
  if (!window.authSystem || !window.authSystem.isAdmin()) {
    alert("មុខងារនេះសម្រាប់តែអ្នកគ្រប់គ្រង (Admin) ប៉ុណ្ណោះ!");
    return;
  }
  if (!confirm("តើលោកអ្នកចង់កំណត់ទិន្នន័យបុគ្គលិកទាំងអស់ទៅតាមច្បាប់ដើមវិញមែនទេ? (ទិន្នន័យដែលបានកែប្រែទាំងអស់នឹងត្រូវប្តូរទៅដូចដើមវិញ)")) {
    return;
  }
  if (typeof INITIAL_SCHOOL_DATA !== "undefined" && INITIAL_SCHOOL_DATA.staffList) {
    state.db.staffList = JSON.parse(JSON.stringify(INITIAL_SCHOOL_DATA.staffList));
  }
  saveDatabase();
  renderStaffInfo();
  showStaffSaveIndicator();
}

function openStaffEditModal(realIdx) {
  if (!window.authSystem || !window.authSystem.isAdmin()) {
    alert("មុខងារនេះសម្រាប់តែអ្នកគ្រប់គ្រង (Admin) ប៉ុណ្ណោះ!");
    return;
  }
  const list = getStaffList();
  if (!list || !list[realIdx]) return;
  const s = list[realIdx];

  const modal = document.getElementById("staffEditModal");
  if (!modal) return;

  document.getElementById("staffEditRealIdx").value = realIdx;
  document.getElementById("staffEditLastName").value = s.lastName || "";
  document.getElementById("staffEditFirstName").value = s.firstName || "";
  document.getElementById("staffEditGender").value = s.gender || "ប្រុស";
  document.getElementById("staffEditAge").value = s.age || "";
  document.getElementById("staffEditDobDay").value = s.dobDay || "";
  document.getElementById("staffEditDobMonth").value = s.dobMonth || "";
  document.getElementById("staffEditDobYear").value = s.dobYear || "";
  document.getElementById("staffEditPobVillage").value = s.pobVillage || "";
  document.getElementById("staffEditPobCommune").value = s.pobCommune || "";
  document.getElementById("staffEditPhone").value = s.phone || "";
  document.getElementById("staffEditRole").value = s.role || "";
  document.getElementById("staffEditEducation").value = s.education || "";
  document.getElementById("staffEditSalaryScale").value = s.salaryScale || "";
  document.getElementById("staffEditFrameworkType").value = s.frameworkType || "";
  document.getElementById("staffEditEntryDay").value = s.entryDay || "";
  document.getElementById("staffEditEntryMonth").value = s.entryMonth || "";
  document.getElementById("staffEditEntryYear").value = s.entryYear || "";
  document.getElementById("staffEditAppointDay").value = s.appointDay || "";
  document.getElementById("staffEditAppointMonth").value = s.appointMonth || "";
  document.getElementById("staffEditAppointYear").value = s.appointYear || "";
  document.getElementById("staffEditOfficialId").value = s.officialId || "";
  document.getElementById("staffEditBankAccount").value = s.bankAccount || "";
  document.getElementById("staffEditSpouseLastName").value = s.spouseLastName || "";
  document.getElementById("staffEditSpouseFirstName").value = s.spouseFirstName || "";
  document.getElementById("staffEditChildrenCount").value = s.childrenCount || "0";
  document.getElementById("staffEditCurrVillage").value = s.currVillage || "";
  document.getElementById("staffEditCurrCommune").value = s.currCommune || "";
  document.getElementById("staffEditNationalId").value = s.nationalId || "";

  modal.style.display = "flex";
}

function closeStaffEditModal() {
  const modal = document.getElementById("staffEditModal");
  if (modal) modal.style.display = "none";
}

function handleStaffEditModalSubmit(e) {
  if (e) e.preventDefault();
  const realIdx = parseInt(document.getElementById("staffEditRealIdx").value, 10);
  const list = getStaffList();
  if (isNaN(realIdx) || !list || !list[realIdx]) return;

  const s = list[realIdx];
  s.lastName = document.getElementById("staffEditLastName").value.trim();
  s.firstName = document.getElementById("staffEditFirstName").value.trim();
  s.fullName = `${s.lastName} ${s.firstName}`.trim();
  s.gender = document.getElementById("staffEditGender").value;
  s.age = document.getElementById("staffEditAge").value.trim();
  s.dobDay = document.getElementById("staffEditDobDay").value.trim();
  s.dobMonth = document.getElementById("staffEditDobMonth").value.trim();
  s.dobYear = document.getElementById("staffEditDobYear").value.trim();
  s.pobVillage = document.getElementById("staffEditPobVillage").value.trim();
  s.pobCommune = document.getElementById("staffEditPobCommune").value.trim();
  s.phone = document.getElementById("staffEditPhone").value.trim();
  s.role = document.getElementById("staffEditRole").value.trim();
  s.education = document.getElementById("staffEditEducation").value.trim();
  s.salaryScale = document.getElementById("staffEditSalaryScale").value.trim();
  s.frameworkType = document.getElementById("staffEditFrameworkType").value.trim();
  s.entryDay = document.getElementById("staffEditEntryDay").value.trim();
  s.entryMonth = document.getElementById("staffEditEntryMonth").value.trim();
  s.entryYear = document.getElementById("staffEditEntryYear").value.trim();
  s.appointDay = document.getElementById("staffEditAppointDay").value.trim();
  s.appointMonth = document.getElementById("staffEditAppointMonth").value.trim();
  s.appointYear = document.getElementById("staffEditAppointYear").value.trim();
  s.officialId = document.getElementById("staffEditOfficialId").value.trim();
  s.bankAccount = document.getElementById("staffEditBankAccount").value.trim();
  s.spouseLastName = document.getElementById("staffEditSpouseLastName").value.trim();
  s.spouseFirstName = document.getElementById("staffEditSpouseFirstName").value.trim();
  s.spouseFullName = `${s.spouseLastName} ${s.spouseFirstName}`.trim();
  s.childrenCount = document.getElementById("staffEditChildrenCount").value.trim();
  s.currVillage = document.getElementById("staffEditCurrVillage").value.trim();
  s.currCommune = document.getElementById("staffEditCurrCommune").value.trim();
  s.nationalId = document.getElementById("staffEditNationalId").value.trim();

  saveDatabase();
  closeStaffEditModal();
  renderStaffInfo();
  showStaffSaveIndicator();
}

function renderStaffInfo() {
  const container = document.getElementById("staffInfoContentWrap");
  if (!container) return;

  const staffList = getStaffList();
  const isAdmin = !!(window.authSystem && typeof window.authSystem.isAdmin === "function" && window.authSystem.isAdmin());

  container.innerHTML = `
    <div class="content-header no-print" style="margin-bottom: 16px;">
      <div class="header-title">
        <h2 class="title-with-badge" style="display: flex; align-items: center; gap: 10px; margin: 0 0 6px 0; flex-wrap: wrap;">
          <span>ព័ត៌មានបុគ្គលិក (Staff Information)</span>
          <span class="badge" style="background: #2563eb; color: #fff; font-size: 12px; padding: 3px 10px; border-radius: 9999px;">ផ្លូវការ (${staffList.length} នាក់)</span>
          ${isAdmin ? `<span class="badge" style="background: #10b981; color: #fff; font-size: 12px; padding: 4px 12px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-pen-to-square"></i> សិទ្ធិ Admin: អាចចុចលើប្រអប់ក្នុងតារាងដើម្បីកែប្រែ</span>` : ''}
        </h2>
        <p style="margin: 0; color: #64748b; font-size: 13px;">តារាងព័ត៌មានលម្អិតរបស់លោកគ្រូ អ្នកគ្រូ និងបុគ្គលិកអប់រំទាំងអស់នៃសាលាបឋមសិក្សា បាន្លួង</p>
      </div>
      <div class="header-actions" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <span id="staffSaveIndicator" style="display: none; color: #16a34a; font-size: 13px; font-weight: 600; align-items: center; gap: 4px; padding: 5px 12px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
          <i class="fa-solid fa-circle-check"></i> បានរក្សាទុក
        </span>
        <div class="search-box" style="position: relative; min-width: 220px;">
          <i class="fa fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8;"></i>
          <input type="text" id="staffInfoSearch" value="${staffInfoFilterQuery}" placeholder="ស្វែងរកតាមឈ្មោះ, មុខងារ..." oninput="filterStaffInfoTable()" style="width: 100%; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px;">
        </div>
        ${isAdmin ? `
          <button class="btn btn-primary" onclick="addNewStaffMember()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-weight: 500; cursor: pointer;">
            <i class="fa-solid fa-user-plus"></i> បន្ថែមបុគ្គលិក
          </button>
          <button class="btn btn-secondary" onclick="resetStaffInfoToDefault()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; cursor: pointer;" title="កំណត់ទិន្នន័យដើមឡើងវិញ">
            <i class="fa-solid fa-rotate-left"></i> កំណត់ដើម
          </button>
        ` : ''}
        <button class="btn btn-success" onclick="exportStaffInfoToExcel()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-weight: 500; cursor: pointer;">
          <i class="fa-solid fa-file-excel"></i> ទាញយក Excel (.xlsx)
        </button>
        <button class="btn btn-primary" onclick="printStaffInfo()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-weight: 500; cursor: pointer;">
          <i class="fa-solid fa-print"></i> បោះពុម្ព (Print A4 ផ្ដេក)
        </button>
      </div>
    </div>

    <div class="staff-info-container card">
      <div class="staff-info-table-wrap" id="staffInfoTableWrap">
        <table class="staff-info-excel-table" id="staffInfoTable">
          <thead>
            <tr class="staff-title-row">
              <th colspan="${isAdmin ? 30 : 29}" class="staff-title-cell">តារាងព័ត៌មានគ្រូបង្រៀន</th>
            </tr>
            <tr class="staff-header-row-1">
              <th rowspan="2" style="width: 45px;">ល.រ</th>
              <th colspan="2" style="min-width: 150px;">គោត្តនាម និង នាម</th>
              <th rowspan="2" style="width: 55px;">ភេទ</th>
              <th colspan="3" style="min-width: 160px;">ថ្ងៃ  ខែ  ឆ្នាំ កំណើត</th>
              <th colspan="2" style="min-width: 180px;">ទីកន្លែងកំណើត</th>
              <th rowspan="2" style="width: 50px;">អាយុ</th>
              <th rowspan="2" style="min-width: 120px;">លេខទូរស័ព្ទ</th>
              <th rowspan="2" style="min-width: 110px;">កម្រិតវប្បធម៌</th>
              <th colspan="3" style="min-width: 160px;">ថ្ងៃខែចូលបម្រើការងារ</th>
              <th rowspan="2" style="min-width: 130px;">មុខងារ</th>
              <th rowspan="2" style="width: 65px;">កាំប្រាក់</th>
              <th rowspan="2" style="min-width: 120px;">ប្រភេទក្របខណ្ឌ</th>
              <th rowspan="2" style="min-width: 110px;">អត្ដលេខមន្ដ្រី</th>
              <th rowspan="2" style="min-width: 160px;">លេខគណនីធនាគារ</th>
              <th colspan="2" style="min-width: 140px;">ឈ្មោះប្ដី/ប្រពន្ធ</th>
              <th rowspan="2" style="width: 65px;">ចំនួនកូន</th>
              <th colspan="2" style="min-width: 190px;">អាស័យដ្ឋានបច្ចុប្បន្ន</th>
              <th rowspan="2" style="min-width: 120px;">អត្ដសញ្ញាណបណ្ណ</th>
              <th colspan="3" style="min-width: 170px;">តែងតាំងស៊ុប</th>
              ${isAdmin ? `<th rowspan="2" class="no-print" style="width: 80px; background-color: #2f5597; color: #fff;">សកម្មភាព</th>` : ''}
            </tr>
            <tr class="staff-header-row-2">
              <th style="min-width: 75px;">គោត្តនាម</th>
              <th style="min-width: 75px;">នាម</th>
              <th style="width: 45px;">ថ្ងៃ</th>
              <th style="width: 65px;">ខែ</th>
              <th style="width: 50px;">ឆ្នាំ</th>
              <th style="min-width: 90px;">ភូមិ</th>
              <th style="min-width: 90px;">ឃុំ</th>
              <th style="width: 45px;">ថ្ងៃ</th>
              <th style="width: 65px;">ខែ</th>
              <th style="width: 50px;">ឆ្នាំ</th>
              <th style="min-width: 70px;">គោត្តនាម</th>
              <th style="min-width: 70px;">នាម</th>
              <th style="min-width: 95px;">ភូមិ</th>
              <th style="min-width: 95px;">ឃុំ</th>
              <th style="width: 45px;">ថ្ងៃ</th>
              <th style="width: 65px;">ខែ</th>
              <th style="width: 50px;">ឆ្នាំ</th>
            </tr>
          </thead>
          <tbody id="staffInfoTableBody">
            <!-- Dynamic rows generated by renderStaffInfoTableBody() -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderStaffInfoTableBody();
}

function renderStaffInfoTableBody() {
  const tbody = document.getElementById("staffInfoTableBody");
  if (!tbody) return;

  const staffList = getStaffList();
  const isAdmin = !!(window.authSystem && typeof window.authSystem.isAdmin === "function" && window.authSystem.isAdmin());
  const q = staffInfoFilterQuery;

  const filtered = staffList.filter(s => {
    if (!q) return true;
    const searchStr = `${s.num} ${s.lastName} ${s.firstName} ${s.fullName} ${s.gender} ${s.pobVillage} ${s.pobCommune} ${s.phone} ${s.education} ${s.role} ${s.salaryScale} ${s.frameworkType} ${s.officialId} ${s.bankAccount} ${s.spouseFullName} ${s.currVillage} ${s.currCommune} ${s.nationalId}`.toLowerCase();
    return searchStr.includes(q);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${isAdmin ? 30 : 29}" style="padding: 24px; text-align: center; color: #64748b; font-size: 14px;">
          មិនមានទិន្នន័យបុគ្គលិកដែលត្រូវនឹងពាក្យស្វែងរក "${q}" ឡើយ
        </td>
      </tr>
    `;
    return;
  }

  const editAttr = isAdmin ? 'contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែប្រែ"' : '';
  const cellClass = (extra) => `${extra} ${isAdmin ? 'staff-editable-cell' : ''}`;

  tbody.innerHTML = filtered.map((s, idx) => {
    const rowClass = idx % 2 === 0 ? "staff-row-even" : "staff-row-odd";
    const realIdx = staffList.indexOf(s);
    const blur = (field) => isAdmin ? `onblur="handleStaffCellBlur(this, ${realIdx}, '${field}')" onkeydown="handleStaffCellKeydown(event, this)"` : '';

    return `
      <tr class="${rowClass}">
        <td class="staff-cell-center font-bold">${toKhmerNum(s.num || idx + 1)}</td>
        <td class="${cellClass('staff-cell-name staff-cell-left')}" ${editAttr} ${blur('lastName')}>${s.lastName || ""}</td>
        <td class="${cellClass('staff-cell-name staff-cell-left')}" ${editAttr} ${blur('firstName')}>${s.firstName || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('gender')}>${s.gender || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('dobDay')}>${s.dobDay || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('dobMonth')}>${s.dobMonth || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('dobYear')}>${s.dobYear || ""}</td>
        <td class="${cellClass('staff-cell-left')}" ${editAttr} ${blur('pobVillage')}>${s.pobVillage || ""}</td>
        <td class="${cellClass('staff-cell-left')}" ${editAttr} ${blur('pobCommune')}>${s.pobCommune || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('age')}>${s.age || ""}</td>
        <td class="${cellClass('staff-cell-phone staff-cell-center')}" ${editAttr} ${blur('phone')}>${s.phone || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('education')}>${s.education || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('entryDay')}>${s.entryDay || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('entryMonth')}>${s.entryMonth || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('entryYear')}>${s.entryYear || ""}</td>
        <td class="${cellClass('staff-cell-role staff-cell-left')}" ${editAttr} ${blur('role')}>${s.role || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('salaryScale')}>${s.salaryScale || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('frameworkType')}>${s.frameworkType || ""}</td>
        <td class="${cellClass('staff-cell-center font-mono')}" ${editAttr} ${blur('officialId')}>${s.officialId || ""}</td>
        <td class="${cellClass('staff-cell-center font-mono')}" ${editAttr} ${blur('bankAccount')}>${s.bankAccount || ""}</td>
        <td class="${cellClass('staff-cell-left')}" ${editAttr} ${blur('spouseLastName')}>${s.spouseLastName || ""}</td>
        <td class="${cellClass('staff-cell-left')}" ${editAttr} ${blur('spouseFirstName')}>${s.spouseFirstName || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('childrenCount')}>${s.childrenCount || ""}</td>
        <td class="${cellClass('staff-cell-left')}" ${editAttr} ${blur('currVillage')}>${s.currVillage || ""}</td>
        <td class="${cellClass('staff-cell-left')}" ${editAttr} ${blur('currCommune')}>${s.currCommune || ""}</td>
        <td class="${cellClass('staff-cell-center font-mono')}" ${editAttr} ${blur('nationalId')}>${s.nationalId || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('appointDay')}>${s.appointDay || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('appointMonth')}>${s.appointMonth || ""}</td>
        <td class="${cellClass('staff-cell-center')}" ${editAttr} ${blur('appointYear')}>${s.appointYear || ""}</td>
        ${isAdmin ? `
          <td class="staff-cell-center no-print" style="white-space: nowrap; padding: 4px;">
            <button type="button" class="btn-staff-action-edit" onclick="openStaffEditModal(${realIdx})" title="កែប្រែក្នុងផ្ទាំង" style="background: #e0f2fe; border: 1px solid #7dd3fc; color: #0284c7; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 12px; margin-right: 4px;">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="btn-staff-action-del" onclick="deleteStaffMember(${realIdx})" title="លុបបុគ្គលិកនេះ" style="background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 12px;">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        ` : ''}
      </tr>
    `;
  }).join("");
}

function printStaffInfo() {
  if (state.activeTab !== "staff_info") {
    switchTab("staff_info");
  }

  let styleEl = document.getElementById("printPageOrientationStyle");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "printPageOrientationStyle";
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = `
    @page {
      size: A4 landscape !important;
      margin: 4mm 5mm !important;
    }
  `;

  setTimeout(() => {
    window.print();
  }, 100);
}

function exportStaffInfoToExcel() {
  const staffList = getStaffList();
  if (!staffList || staffList.length === 0) {
    alert("មិនមានទិន្នន័យបុគ្គលិកសម្រាប់ទាញយកឡើយ!");
    return;
  }

  if (typeof XLSX === "undefined") {
    alert("កម្មវិធីទាញយក Excel កំពុងរៀបចំ សូមព្យាយាមម្តងទៀត!");
    return;
  }

  // Build 2D array matching the template exactly
  const data = [];

  // Row 1: Title
  const r1 = new Array(29).fill("");
  r1[0] = "តារាងព័ត៌មានគ្រូបង្រៀន";
  data.push(r1);

  // Row 2: Header 1
  const r2 = new Array(29).fill("");
  r2[0] = "ល.រ";
  r2[1] = "គោត្តនាម និង នាម";
  r2[3] = "ភេទ";
  r2[4] = "ថ្ងៃ  ខែ  ឆ្នាំ កំណើត";
  r2[7] = "ទីកន្លែងកំណើត";
  r2[9] = "អាយុ";
  r2[10] = "លេខទូរស័ព្ទ";
  r2[11] = "កម្រិតវប្បធម៌";
  r2[12] = "ថ្ងៃខែចូលបម្រើការងារ";
  r2[15] = "មុខងារ";
  r2[16] = "កាំប្រាក់";
  r2[17] = "ប្រភេទក្របខណ្ឌ";
  r2[18] = "អត្ដលេខមន្ដ្រី";
  r2[19] = "លេខគណនីធនាគារ";
  r2[20] = "ឈ្មោះប្ដី/ប្រពន្ធ";
  r2[22] = "ចំនួនកូន";
  r2[23] = "អាស័យដ្ឋានបច្ចុប្បន្ន";
  r2[25] = "អត្ដសញ្ញាណបណ្ណ";
  r2[26] = "តែងតាំងស៊ុប";
  data.push(r2);

  // Data rows (3 to 11)
  staffList.forEach(s => {
    data.push([
      s.num || "",
      s.lastName || "",
      s.firstName || "",
      s.gender || "",
      s.dobDay || "",
      s.dobMonth || "",
      s.dobYear || "",
      s.pobVillage || "",
      s.pobCommune || "",
      s.age || "",
      s.phone || "",
      s.education || "",
      s.entryDay || "",
      s.entryMonth || "",
      s.entryYear || "",
      s.role || "",
      s.salaryScale || "",
      s.frameworkType || "",
      s.officialId || "",
      s.bankAccount || "",
      s.spouseLastName || "",
      s.spouseFirstName || "",
      s.childrenCount || "",
      s.currVillage || "",
      s.currCommune || "",
      s.nationalId || "",
      s.appointDay || "",
      s.appointMonth || "",
      s.appointYear || ""
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Exact Merges matching media_1795175845321_3b1c8018.xlsx:
  // ['A1:AC1', 'U2:V2', 'B2:C2', 'M2:O2', 'E2:G2', 'AA2:AC2', 'X2:Y2', 'H2:I2']
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 28 } }, // A1:AC1 (Title)
    { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } },  // B2:C2 (គោត្តនាម និង នាម)
    { s: { r: 1, c: 4 }, e: { r: 1, c: 6 } },  // E2:G2 (ថ្ងៃ ខែ ឆ្នាំ កំណើត)
    { s: { r: 1, c: 7 }, e: { r: 1, c: 8 } },  // H2:I2 (ទីកន្លែងកំណើត)
    { s: { r: 1, c: 12 }, e: { r: 1, c: 14 } }, // M2:O2 (ថ្ងៃខែចូលបម្រើការងារ)
    { s: { r: 1, c: 20 }, e: { r: 1, c: 21 } }, // U2:V2 (ឈ្មោះប្ដី/ប្រពន្ធ)
    { s: { r: 1, c: 23 }, e: { r: 1, c: 24 } }, // X2:Y2 (អាស័យដ្ឋានបច្ចុប្បន្ន)
    { s: { r: 1, c: 26 }, e: { r: 1, c: 28 } }  // AA2:AC2 (តែងតាំងស៊ុប)
  ];

  // Exact column widths from original xlsx
  ws["!cols"] = [
    { wch: 6 },   // A
    { wch: 12 },  // B
    { wch: 13 },  // C
    { wch: 8 },   // D
    { wch: 7 },   // E
    { wch: 10 },  // F
    { wch: 8 },   // G
    { wch: 15 },  // H
    { wch: 13 },  // I
    { wch: 7 },   // J
    { wch: 16 },  // K
    { wch: 16 },  // L
    { wch: 7 },   // M
    { wch: 10 },  // N
    { wch: 8 },   // O
    { wch: 19 },  // P
    { wch: 10 },  // Q
    { wch: 17 },  // R
    { wch: 15 },  // S
    { wch: 23 },  // T
    { wch: 11 },  // U
    { wch: 9.2 }, // V
    { wch: 10 },  // W
    { wch: 15 },  // X
    { wch: 14 },  // Y
    { wch: 17 },  // Z
    { wch: 8 },   // AA
    { wch: 10 },  // AB
    { wch: 8 }    // AC
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ព័ត៌មានរបស់គ្រូ");

  XLSX.writeFile(wb, "ព័ត៌មានរបស់គ្រូ_សាលាបឋមសិក្សាបាន្លួង.xlsx");
}

window.getStaffList = getStaffList;
window.renderStaffInfo = renderStaffInfo;
window.renderStaffInfoTableBody = renderStaffInfoTableBody;
window.filterStaffInfoTable = filterStaffInfoTable;
window.printStaffInfo = printStaffInfo;
window.exportStaffInfoToExcel = exportStaffInfoToExcel;
window.handleStaffCellBlur = handleStaffCellBlur;
window.handleStaffCellKeydown = handleStaffCellKeydown;
window.addNewStaffMember = addNewStaffMember;
window.deleteStaffMember = deleteStaffMember;
window.resetStaffInfoToDefault = resetStaffInfoToDefault;
window.openStaffEditModal = openStaffEditModal;
window.closeStaffEditModal = closeStaffEditModal;
window.handleStaffEditModalSubmit = handleStaffEditModalSubmit;
window.switchTab = switchTab;

/**
 * ==========================================================================
 * CLASSROOMS & HOMEROOM TEACHER QR CREDENTIALS (ផ្ទាំង ថ្នាក់រៀន)
 * ==========================================================================
 */

let classesFilterQuery = "";

function renderClasses() {
  const container = document.getElementById("tab-classes");
  if (!container) return;

  const yearSelect = document.getElementById("classesYearSelect");
  if (yearSelect && state.db && state.db.schoolInfo && state.db.schoolInfo.academicYears) {
    yearSelect.innerHTML = state.db.schoolInfo.academicYears.map(y => 
      `<option value="${y}" ${y === state.activeYear ? 'selected' : ''}>${y}</option>`
    ).join("");
    yearSelect.value = state.activeYear;
  }

  const allYearClasses = getClassesForYear(state.activeYear) || [];

  // Check role-based permission:
  // Admin sees all classes; Teacher only sees their assigned class
  const isAdmin = !!(window.authSystem && typeof window.authSystem.isAdmin === "function" && window.authSystem.isAdmin());
  const allowedGrade = (window.authSystem && typeof window.authSystem.getAllowedGrade === "function") ? window.authSystem.getAllowedGrade() : null;

  let classes = allYearClasses;
  if (!isAdmin && allowedGrade) {
    classes = allYearClasses.filter(c => {
      const g = (c.grade || c.name || "").trim();
      const target = allowedGrade.trim();
      return g === target || g.includes(target) || target.includes(g);
    });
  }
  
  // 1. Calculate Statistics for the visible classes
  const totalClasses = classes.length;
  let totalStudents = 0;
  let totalFemale = 0;

  classes.forEach(c => {
    const stList = c.students || [];
    totalStudents += stList.length;
    totalFemale += stList.filter(s => s.gender === "ស្រី").length;
  });
  const totalMale = totalStudents - totalFemale;
  const femalePercent = totalStudents > 0 ? ((totalFemale / totalStudents) * 100).toFixed(1) : 0;
  const malePercent = totalStudents > 0 ? ((totalMale / totalStudents) * 100).toFixed(1) : 0;

  // 2. Render Top Stats Banner
  const statsBanner = document.getElementById("classesStatsBanner");
  if (statsBanner) {
    if (!isAdmin && allowedGrade) {
      statsBanner.innerHTML = `
        <div class="classes-stats-grid">
          <div class="class-stat-card card-total-classes">
            <div class="stat-icon-circle"><i class="fa-solid fa-chalkboard-user"></i></div>
            <div class="stat-info-wrap">
              <div class="stat-num-val">១ <span class="stat-unit">ថ្នាក់</span></div>
              <div class="stat-label-text">ថ្នាក់របស់អ្នកទទួលបន្ទុក (${allowedGrade})</div>
            </div>
          </div>

          <div class="class-stat-card card-total-students">
            <div class="stat-icon-circle"><i class="fa-solid fa-users"></i></div>
            <div class="stat-info-wrap">
              <div class="stat-num-val">${totalStudents} <span class="stat-unit">នាក់</span></div>
              <div class="stat-label-text">សិស្សក្នុងថ្នាក់សរុប</div>
            </div>
          </div>

          <div class="class-stat-card card-female-students">
            <div class="stat-icon-circle"><i class="fa-solid fa-person-dress"></i></div>
            <div class="stat-info-wrap">
              <div class="stat-num-val">${totalFemale} <span class="stat-unit">នាក់</span> <span class="stat-badge-percent">${femalePercent}%</span></div>
              <div class="stat-label-text">សិស្សស្រីក្នុងថ្នាក់</div>
            </div>
          </div>

          <div class="class-stat-card card-male-students">
            <div class="stat-icon-circle"><i class="fa-solid fa-person"></i></div>
            <div class="stat-info-wrap">
              <div class="stat-num-val">${totalMale} <span class="stat-unit">នាក់</span> <span class="stat-badge-percent">${malePercent}%</span></div>
              <div class="stat-label-text">សិស្សប្រុសក្នុងថ្នាក់</div>
            </div>
          </div>
        </div>
      `;
    } else {
      statsBanner.innerHTML = `
        <div class="classes-stats-grid">
          <div class="class-stat-card card-total-classes">
            <div class="stat-icon-circle"><i class="fa-solid fa-chalkboard"></i></div>
            <div class="stat-info-wrap">
              <div class="stat-num-val">${totalClasses} <span class="stat-unit">ថ្នាក់</span></div>
              <div class="stat-label-text">ចំនួនថ្នាក់រៀនសរុប (${state.activeYear})</div>
            </div>
          </div>

          <div class="class-stat-card card-total-students">
            <div class="stat-icon-circle"><i class="fa-solid fa-users"></i></div>
            <div class="stat-info-wrap">
              <div class="stat-num-val">${totalStudents} <span class="stat-unit">នាក់</span></div>
              <div class="stat-label-text">សិស្សទូទាំងសាលាសរុប</div>
            </div>
          </div>

          <div class="class-stat-card card-female-students">
            <div class="stat-icon-circle"><i class="fa-solid fa-person-dress"></i></div>
            <div class="stat-info-wrap">
              <div class="stat-num-val">${totalFemale} <span class="stat-unit">នាក់</span> <span class="stat-badge-percent">${femalePercent}%</span></div>
              <div class="stat-label-text">សិស្សស្រីសរុប</div>
            </div>
          </div>

          <div class="class-stat-card card-male-students">
            <div class="stat-icon-circle"><i class="fa-solid fa-person"></i></div>
            <div class="stat-info-wrap">
              <div class="stat-num-val">${totalMale} <span class="stat-unit">នាក់</span> <span class="stat-badge-percent">${malePercent}%</span></div>
              <div class="stat-label-text">សិស្សប្រុសសរុប</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // 3. Filter classes if search query is active
  let displayClasses = classes;
  if (classesFilterQuery) {
    const q = classesFilterQuery.toLowerCase().trim();
    displayClasses = classes.filter(c => {
      const gName = (c.grade || c.name || "").toLowerCase();
      const tName = (c.teacher || "").toLowerCase();
      return gName.includes(q) || tName.includes(q);
    });
  }

  // 4. Render Classroom Cards
  const gridContainer = document.getElementById("classesGridContainer");
  if (!gridContainer) return;

  if (displayClasses.length === 0) {
    gridContainer.innerHTML = `
      <div class="no-data-alert" style="grid-column: 1 / -1; padding: 40px; text-align: center; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e1;">
        <i class="fa-solid fa-chalkboard" style="font-size: 40px; color: #94a3b8; margin-bottom: 12px;"></i>
        <div style="font-size: 16px; font-weight: 600; color: #475569;">ពុំមានទិន្នន័យថ្នាក់រៀនសម្រាប់ឆ្នាំសិក្សា ${state.activeYear} ឡើយ</div>
      </div>
    `;
    return;
  }

  // Map auth credentials to classes
  const authUsers = (window.authSystem && window.authSystem.USERS) ? window.authSystem.USERS : [];

  gridContainer.innerHTML = displayClasses.map(cls => {
    const stList = cls.students || [];
    const stTotal = stList.length;
    const stFemale = stList.filter(s => s.gender === "ស្រី").length;
    const stMale = stTotal - stFemale;
    const fRatio = stTotal > 0 ? ((stFemale / stTotal) * 100).toFixed(0) : 0;
    const mRatio = stTotal > 0 ? (100 - fRatio) : 0;

    // Teacher & credential details
    const authAcc = authUsers.find(u => u.grade === cls.grade || u.classId === cls.id);
    const teacherName = cls.teacher || (authAcc ? authAcc.teacher : "មិនទាន់កំណត់");
    const tRec = (state && state.db && Array.isArray(state.db.teachers)) ? state.db.teachers.find(t => t.name === teacherName || t.grade === cls.grade) : null;
    const isFemale = (tRec && tRec.gender === "ស្រី") || (cls.gender === "ស្រី") || (authAcc && (authAcc.gender === "ស្រី" || authAcc.title === "អ្នកគ្រូ"));
    const teacherTitle = isFemale ? "អ្នកគ្រូ" : "លោកគ្រូ";
    const password = authAcc ? authAcc.password : "";

    // Generate QR Login URL
    const baseUrl = (window.location.origin && window.location.origin !== "null")
      ? `${window.location.origin}${window.location.pathname}`
      : window.location.href.split("?")[0].split("#")[0];
    const loginUrl = `${baseUrl}?login=${encodeURIComponent(password)}&class=${encodeURIComponent(cls.id)}`;

    // Generate live SVG QR Code
    let qrSvg = "";
    if (typeof window.generateQRCodeSVG === "function" && password) {
      qrSvg = window.generateQRCodeSVG(loginUrl, 76, 2);
    }

    const isCurrentActive = (state.activeClassId === cls.id);
    const isUserClass = (window.authSystem && window.authSystem.getAllowedGrade() === cls.grade);

    return `
      <div class="classroom-card ${isCurrentActive ? 'is-active-class' : ''}">
        <div class="class-card-header">
          <div class="class-header-left">
            <span class="class-grade-pill">${cls.grade || cls.name || 'ថ្នាក់រៀន'}</span>
            <span class="class-year-pill">${cls.academicYear || state.activeYear}</span>
            ${isUserClass ? '<span class="class-user-tag"><i class="fa fa-user-check"></i> ថ្នាក់របស់អ្នក</span>' : ''}
          </div>
          <div class="class-header-actions">
            <button type="button" class="btn-print-single-badge" onclick="printClassroomBadge('${cls.id}')" title="បោះពុម្ពប័ណ្ណសម្គាល់ និង QR Code ថ្នាក់នេះ">
              <i class="fa-solid fa-print"></i> ប័ណ្ណ
            </button>
          </div>
        </div>

        <div class="class-card-body">
          <!-- Homeroom Teacher Profile -->
          <div class="teacher-profile-row">
            <div class="teacher-avatar-circle">
              <i class="fa-solid fa-chalkboard-user"></i>
            </div>
            <div class="teacher-meta-details">
              <div class="teacher-meta-title">គ្រូប្រចាំថ្នាក់ (Homeroom Teacher)</div>
              <div class="teacher-name-bold">${teacherTitle} ${teacherName}</div>
              <div class="teacher-badge-tag"><i class="fa-solid fa-door-closed"></i> បន្ទប់រៀន៖ ${cls.room || 'បន្ទប់ទី១'}</div>
            </div>
          </div>

          <!-- Student Counts Banner (Key user request) -->
          <div class="class-student-stats-box">
            <div class="stat-count-item stat-item-total">
              <span class="stat-box-num">${stTotal}</span>
              <span class="stat-box-lbl">សិស្សសរុប</span>
            </div>
            <div class="stat-count-divider"></div>
            <div class="stat-count-item stat-item-female">
              <span class="stat-box-num text-danger">${stFemale}</span>
              <span class="stat-box-lbl">សិស្សស្រី</span>
            </div>
            <div class="stat-count-divider"></div>
            <div class="stat-count-item stat-item-male">
              <span class="stat-box-num text-primary">${stMale}</span>
              <span class="stat-box-lbl">សិស្សប្រុស</span>
            </div>
          </div>

          <!-- Female/Male Proportion bar -->
          <div class="gender-bar-wrapper" title="សមាមាត្រសិស្សស្រី ${fRatio}% | សិស្សប្រុស ${mRatio}%">
            <div class="gender-bar-fill female" style="width: ${fRatio}%;"></div>
            <div class="gender-bar-fill male" style="width: ${mRatio}%;"></div>
          </div>

          <!-- Homeroom Teacher QR Code Credentials Box (Key user request) -->
          <div class="teacher-qr-credentials-box">
            <div class="qr-code-holder" id="qrContainer_${cls.id}">
              ${qrSvg}
            </div>
            <div class="qr-credentials-info">
              <div class="qr-box-heading">
                <i class="fa-solid fa-qrcode text-primary"></i> <strong>QR Code គ្រូប្រចាំថ្នាក់</strong>
              </div>
              <div class="qr-box-desc">
                ស្កេនតាមទូរសព្ទដើម្បីចូលប្រើប្រព័ន្ធដោយស្វ័យប្រវត្តិ
              </div>
              <div class="qr-password-row">
                <span class="qr-pin-label">កូដសម្ងាត់ (PIN)៖</span>
                <span class="qr-pin-code" id="pinCode_${cls.id}">●●●●</span>
                <button type="button" class="btn-toggle-pin" onclick="togglePinView('${cls.id}', '${password}')" title="បង្ហាញ/លាក់កូដ">
                  <i class="fa-solid fa-eye" id="pinIcon_${cls.id}"></i>
                </button>
              </div>
              <div class="qr-actions-row">
                <button type="button" class="btn-download-single-qr-btn" onclick="downloadClassQRCode('${cls.id}')" title="ទាញយកជារូបភាព QR Code សម្រាប់ Log In">
                  <i class="fa-solid fa-download"></i> ទាញយក QR
                </button>
                <button type="button" class="btn-change-pwd-single-btn" onclick="openChangePasswordModal('${cls.id}')" title="ផ្លាស់ប្ដូរពាក្យសម្ងាត់ និងបង្កើត QR Code ថ្មី">
                  <i class="fa-solid fa-key"></i> ប្ដូរលេខកូដ
                </button>
                <button type="button" class="btn-quick-login-card" onclick="quickLoginClassTeacher('${password}', '${cls.id}')" title="ចូលប្រើជាគ្រូថ្នាក់នេះភ្លាមៗ">
                  <i class="fa-solid fa-right-to-bracket"></i> ចូលប្រើភ្លាមៗ
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="class-card-footer">
          <button type="button" class="btn-class-nav" onclick="openClassRoster('${cls.id}')" title="បើកបញ្ជីឈ្មោះសិស្សថ្នាក់នេះ">
            <i class="fa-solid fa-user-graduate"></i> បញ្ជីសិស្ស
          </button>
          <button type="button" class="btn-class-nav" onclick="openClassScores('${cls.id}')" title="បើកតារាងពិន្ទុថ្នាក់នេះ">
            <i class="fa-solid fa-award"></i> ស្រង់ពិន្ទុ
          </button>
          <button type="button" class="btn-class-nav" onclick="openClassAttendance('${cls.id}')" title="ស្រង់វត្តមានសិស្សថ្នាក់នេះ">
            <i class="fa-solid fa-calendar-check"></i> វត្តមាន
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function changeClassesYear(year) {
  state.activeYear = year;
  try { localStorage.setItem("banloung_active_year", year); } catch(e){}
  renderClasses();
}

function filterClassesCards(query) {
  classesFilterQuery = query || "";
  renderClasses();
}

function togglePinView(clsId, realPwd) {
  const pinEl = document.getElementById(`pinCode_${clsId}`);
  const iconEl = document.getElementById(`pinIcon_${clsId}`);
  if (!pinEl || !iconEl) return;

  if (pinEl.innerText === "●●●●") {
    pinEl.innerText = realPwd || "----";
    iconEl.className = "fa-solid fa-eye-slash";
  } else {
    pinEl.innerText = "●●●●";
    iconEl.className = "fa-solid fa-eye";
  }
}

function quickLoginClassTeacher(pwd, clsId) {
  if (!pwd) {
    alert("ពុំមានពាក្យសម្ងាត់សម្រាប់ថ្នាក់នេះឡើយ!");
    return;
  }
  if (window.authSystem && typeof window.authSystem.login === "function") {
    const res = window.authSystem.login(pwd);
    if (res && res.success) {
      state.activeClassId = clsId;
      try { localStorage.setItem("banloung_active_class_id", clsId); } catch(e){}
      switchTab("students");
    } else {
      alert((res && res.error) || "ការចូលប្រើប្រព័ន្ធមិនជោគជ័យ!");
    }
  }
}

function openClassRoster(clsId) {
  state.activeClassId = clsId;
  try { localStorage.setItem("banloung_active_class_id", clsId); } catch(e){}
  switchTab("students");
}

function openClassScores(clsId) {
  state.activeClassId = clsId;
  try { localStorage.setItem("banloung_active_class_id", clsId); } catch(e){}
  switchTab("scores");
}

function openClassAttendance(clsId) {
  state.activeClassId = clsId;
  try { localStorage.setItem("banloung_active_class_id", clsId); } catch(e){}
  switchTab("attendance_monthly");
}

function buildClassroomBadgeHtml(cls) {
  const authUsers = (window.authSystem && window.authSystem.USERS) ? window.authSystem.USERS : [];
  const authAcc = authUsers.find(u => u.grade === cls.grade || u.classId === cls.id);
  const teacherName = cls.teacher || (authAcc ? authAcc.teacher : "មិនទាន់កំណត់");
  const password = authAcc ? authAcc.password : "";

  const stList = cls.students || [];
  const stTotal = stList.length;
  const stFemale = stList.filter(s => s.gender === "ស្រី").length;
  const stMale = stTotal - stFemale;

  const baseUrl = (window.location.origin && window.location.origin !== "null")
    ? `${window.location.origin}${window.location.pathname}`
    : window.location.href.split("?")[0].split("#")[0];
  const loginUrl = `${baseUrl}?login=${encodeURIComponent(password)}&class=${encodeURIComponent(cls.id)}`;

  let qrSvg = "";
  if (typeof window.generateQRCodeSVG === "function" && password) {
    qrSvg = window.generateQRCodeSVG(loginUrl, 180, 2);
  }

  return `
    <div class="class-badge-printable-sheet">
      <div class="class-badge-print-header">
        <div class="class-badge-kingdom">ព្រះរាជាណាចក្រកម្ពុជា</div>
        <div class="class-badge-motto">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
        <div class="class-badge-flourish"></div>
        <div style="font-size: 13px; color: #475569; margin-top: 4px;">មន្ទីរអប់រំ យុវជន និងកីឡា ខេត្តរតនគិរី</div>
        <div class="class-badge-school">សាលាបឋមសិក្សា បាន្លួង</div>
        <div class="class-badge-doc-title">ប័ណ្ណព័ត៌មានថ្នាក់រៀន និងកូដសម្គាល់គ្រូប្រចាំថ្នាក់</div>
        <div style="font-size: 13px; font-weight: 600; color: #1e3a8a;">ឆ្នាំសិក្សា៖ ${cls.academicYear || state.activeYear}</div>
      </div>

      <div class="class-badge-meta-row">
        <div class="class-badge-meta-box">
          <div style="font-size: 12px; color: #64748b;">កម្រិតថ្នាក់រៀន</div>
          <div style="font-family: var(--font-moul); font-size: 22px; color: #1e3a8a; margin-top: 4px;">${cls.grade || cls.name}</div>
          <div style="font-size: 13px; color: #334155; margin-top: 6px;"><i class="fa-solid fa-door-closed"></i> បន្ទប់រៀន៖ ${cls.room || 'បន្ទប់ទី១'}</div>
        </div>

        <div class="class-badge-meta-box">
          <div style="font-size: 12px; color: #64748b;">គ្រូប្រចាំថ្នាក់ (Homeroom Teacher)</div>
          <div style="font-family: var(--font-battambang); font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px;">${teacherName}</div>
          <div style="font-size: 13px; color: #15803d; margin-top: 6px;"><i class="fa-solid fa-user-tie"></i> គ្រូបង្រៀនកម្រិតបឋមសិក្សា</div>
        </div>
      </div>

      <div class="class-badge-meta-box" style="margin-bottom: 16px;">
        <div style="font-size: 13px; font-weight: 700; color: #1e3a8a; margin-bottom: 8px;"><i class="fa-solid fa-users"></i> ស្ថិតិចំនួនសិស្សក្នុងថ្នាក់</div>
        <div style="display: flex; justify-content: space-around; text-align: center; padding: 6px 0;">
          <div>
            <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${stTotal} នាក់</div>
            <div style="font-size: 12px; color: #64748b;">សិស្សសរុប</div>
          </div>
          <div style="width: 1px; height: 32px; background: #cbd5e1;"></div>
          <div>
            <div style="font-size: 20px; font-weight: 700; color: #be185d;">${stFemale} នាក់</div>
            <div style="font-size: 12px; color: #64748b;">សិស្សស្រី</div>
          </div>
          <div style="width: 1px; height: 32px; background: #cbd5e1;"></div>
          <div>
            <div style="font-size: 20px; font-weight: 700; color: #1d4ed8;">${stMale} នាក់</div>
            <div style="font-size: 12px; color: #64748b;">សិស្សប្រុស</div>
          </div>
        </div>
      </div>

      <div class="class-badge-qr-section">
        <div style="background: #fff; padding: 8px; border-radius: 12px; border: 1px solid #cbd5e1;">
          ${qrSvg}
        </div>
        <div style="text-align: left; max-width: 380px;">
          <div style="font-family: var(--font-moul); font-size: 15px; color: #1e3a8a; margin-bottom: 6px;">
            <i class="fa-solid fa-qrcode"></i> QR Code ចូលប្រើប្រព័ន្ធ
          </div>
          <div style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 10px;">
            លោកគ្រូ/អ្នកគ្រូគ្រាន់តែប្រើប្រាស់កាមេរ៉ាទូរសព្ទដៃ ឬ Tablet ស្កេនលើ QR Code នេះដើម្បីចូលប្រើប្រព័ន្ធគ្រប់គ្រងសាលា បាន្លួង ដោយស្វ័យប្រវត្តិ។
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #1e293b; background: #e2e8f0; padding: 6px 14px; border-radius: 8px; display: inline-block;">
            កូដសម្ងាត់ផ្លូវការ (PIN)៖ <span style="font-family: monospace; font-size: 16px; color: #2563eb;">${password}</span>
          </div>
        </div>
      </div>

      <div class="class-badge-print-footer">
        <div style="text-align: center; width: 220px;">
          <div style="font-size: 12px; color: #64748b;">បានឃើញ និងយល់ព្រម</div>
          <div style="font-family: var(--font-moul); font-size: 13px; color: #1e3a8a; margin-top: 4px;">នាយកសាលា</div>
        </div>
        <div style="text-align: center; width: 220px;">
          <div style="font-size: 12px; color: #64748b;">បានពិនិត្យត្រឹមត្រូវ</div>
          <div style="font-family: var(--font-moul); font-size: 13px; color: #1e3a8a; margin-top: 4px;">គ្រូប្រចាំថ្នាក់</div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 36px;">${teacherName}</div>
        </div>
      </div>
    </div>
  `;
}

function printClassroomBadge(clsId) {
  const classes = getClassesForYear(state.activeYear) || [];
  const targetCls = classes.find(c => c.id === clsId) || classes[0];
  if (!targetCls) return;

  const printContainer = document.getElementById("classesPrintContainer");
  if (!printContainer) return;

  printContainer.innerHTML = buildClassroomBadgeHtml(targetCls);
  printContainer.style.display = "block";

  window.print();

  setTimeout(() => {
    printContainer.style.display = "none";
  }, 1000);
}

function printAllClassroomBadges() {
  const classes = getClassesForYear(state.activeYear) || [];
  if (classes.length === 0) {
    alert("ពុំមានទិន្នន័យថ្នាក់រៀនសម្រាប់ឆ្នាំសិក្សានេះឡើយ!");
    return;
  }

  const printContainer = document.getElementById("classesPrintContainer");
  if (!printContainer) return;

  printContainer.innerHTML = classes.map(c => buildClassroomBadgeHtml(c)).join("");
  printContainer.style.display = "block";

  window.print();

  setTimeout(() => {
    printContainer.style.display = "none";
  }, 1000);
}

function exportClassesSummaryExcel() {
  const classes = getClassesForYear(state.activeYear) || [];
  if (classes.length === 0) {
    alert("ពុំមានទិន្នន័យថ្នាក់រៀនសម្រាប់ឆ្នាំសិក្សា " + state.activeYear + " ឡើយ!");
    return;
  }

  const authUsers = (window.authSystem && window.authSystem.USERS) ? window.authSystem.USERS : [];

  const headers = [
    "ល.រ",
    "កម្រិតថ្នាក់",
    "ឆ្នាំសិក្សា",
    "បន្ទប់រៀន",
    "ឈ្មោះគ្រូប្រចាំថ្នាក់",
    "សិស្សសរុប",
    "សិស្សស្រី",
    "សិស្សប្រុស",
    "សមាមាត្រស្រី (%)",
    "កូដសម្ងាត់ចូលប្រើ (PIN)"
  ];

  const rows = classes.map((cls, idx) => {
    const stList = cls.students || [];
    const stTotal = stList.length;
    const stFemale = stList.filter(s => s.gender === "ស្រី").length;
    const stMale = stTotal - stFemale;
    const fRatio = stTotal > 0 ? ((stFemale / stTotal) * 100).toFixed(1) + "%" : "0%";

    const authAcc = authUsers.find(u => u.grade === cls.grade || u.classId === cls.id);
    const teacherName = cls.teacher || (authAcc ? authAcc.teacher : "");
    const password = authAcc ? authAcc.password : "";

    return [
      idx + 1,
      cls.grade || cls.name || "",
      cls.academicYear || state.activeYear,
      cls.room || "បន្ទប់ទី១",
      teacherName,
      stTotal,
      stFemale,
      stMale,
      fRatio,
      password
    ];
  });

  if (typeof XLSX !== "undefined") {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 22 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ស្ថិតិថ្នាក់រៀន");
    XLSX.writeFile(wb, `ស្ថិតិថ្នាក់រៀន_សាលាបឋមសិក្សាបាន្លួង_${state.activeYear}.xlsx`);
  } else {
    // CSV fallback with UTF-8 BOM
    let csvContent = "\uFEFF" + headers.join(",") + "\n";
    rows.forEach(r => {
      csvContent += r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ស្ថិតិថ្នាក់រៀន_សាលាបឋមសិក្សាបាន្លួង_${state.activeYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function downloadClassQRCode(clsId) {
  const classes = getClassesForYear(state.activeYear) || [];
  let cls = classes.find(c => c.id === clsId || c.grade === clsId);
  const authUsers = (window.authSystem && window.authSystem.USERS) ? window.authSystem.USERS : [];
  let authAcc = authUsers.find(u => u.grade === (cls && cls.grade) || u.classId === clsId || u.id === clsId);

  if (!cls && (clsId === "admin" || clsId === "ADMIN")) {
    authAcc = authUsers.find(u => u.id === "admin");
    cls = {
      id: "admin",
      grade: "គណៈគ្រប់គ្រង Admin",
      name: "គណៈគ្រប់គ្រងសាលា",
      academicYear: state.activeYear,
      teacher: "នាយកសាលា ឬ បណ្ណារក្ស",
      room: "ការិយាល័យរដ្ឋបាល",
      students: []
    };
  }

  if (!cls) cls = classes[0];
  if (!cls) {
    alert("ពុំមានទិន្នន័យថ្នាក់នេះឡើយ!");
    return;
  }

  const isFemale = authAcc && (authAcc.gender === "ស្រី" || authAcc.title === "អ្នកគ្រូ");
  const teacherTitle = isFemale ? "អ្នកគ្រូ" : "លោកគ្រូ";
  const teacherName = cls.teacher || (authAcc ? authAcc.teacher : "គ្រូប្រចាំថ្នាក់");
  const password = authAcc ? authAcc.password : "";
  const gradeName = cls.grade || cls.name || "ថ្នាក់រៀន";

  const stList = cls.students || [];
  const stTotal = stList.length;
  const stFemale = stList.filter(s => s.gender === "ស្រី").length;
  const stMale = stTotal - stFemale;

  // Login URL
  const baseUrl = (window.location.origin && window.location.origin !== "null")
    ? `${window.location.origin}${window.location.pathname}`
    : window.location.href.split("?")[0].split("#")[0];
  const loginUrl = `${baseUrl}?login=${encodeURIComponent(password)}&class=${encodeURIComponent(cls.id)}`;

  // Create High-Res Canvas
  const canvas = document.createElement("canvas");
  const width = 800;
  const height = 980;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // 1. White Background & Decorative Double Border
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Outer border (Royal Navy)
  ctx.strokeStyle = "#1e3a8a";
  ctx.lineWidth = 8;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  // Inner border (Gold)
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  // Corner Ornaments
  ctx.fillStyle = "#1e3a8a";
  ctx.fillRect(24, 24, 16, 16);
  ctx.fillRect(width - 40, 24, 16, 16);
  ctx.fillRect(24, height - 40, 16, 16);
  ctx.fillRect(width - 40, height - 40, 16, 16);

  // 2. Official Header
  ctx.textAlign = "center";
  ctx.fillStyle = "#1e3a8a";
  ctx.font = "bold 20px 'Moul', 'Khmer OS Muol Light', serif";
  ctx.fillText("ព្រះរាជាណាចក្រកម្ពុជា", width / 2, 70);

  ctx.fillStyle = "#d97706";
  ctx.font = "bold 15px 'Moul', 'Khmer OS Muol Light', serif";
  ctx.fillText("ជាតិ សាសនា ព្រះមហាក្សត្រ", width / 2, 98);

  // Decorative wavy ornament under header
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px sans-serif";
  ctx.fillText("៚ ------------------- ៚", width / 2, 118);

  ctx.fillStyle = "#1e3a8a";
  ctx.font = "bold 24px 'Moul', 'Khmer OS Muol Light', serif";
  ctx.fillText("សាលាបឋមសិក្សា បាន្លួង", width / 2, 154);

  ctx.fillStyle = "#64748b";
  ctx.font = "14px 'Kantumruy Pro', sans-serif";
  ctx.fillText("ប្រព័ន្ធគ្រប់គ្រងទិន្នន័យ និងពិន្ទុសិស្សផ្លូវការ", width / 2, 180);

  // 3. Title Ribbon Banner
  const ribbonY = 205;
  const ribbonH = 46;
  ctx.fillStyle = "#1e3a8a";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(width / 2 - 260, ribbonY, 520, ribbonH, 23);
  } else {
    ctx.rect(width / 2 - 260, ribbonY, 520, ribbonH);
  }
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 17px 'Moul', 'Khmer OS Muol Light', serif";
  ctx.fillText("ប័ណ្ណ QR CODE សម្រាប់ចូលប្រព័ន្ធ (LOGIN)", width / 2, ribbonY + 30);

  // 4. Grade, Teacher & Stats Box
  const infoY = 275;
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(60, infoY, width - 120, 115, 14);
  } else {
    ctx.rect(60, infoY, width - 120, 115);
  }
  ctx.fill();
  ctx.stroke();

  // Class & Academic Year
  ctx.textAlign = "center";
  ctx.fillStyle = "#1e3a8a";
  ctx.font = "bold 22px 'Moul', 'Khmer OS Muol Light', serif";
  ctx.fillText(`${gradeName}  •  ឆ្នាំសិក្សា ${cls.academicYear || state.activeYear}`, width / 2, infoY + 36);

  // Teacher Name & Room
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 16px 'Battambang', 'Kantumruy Pro', sans-serif";
  const teacherLine = cls.id === "admin"
    ? `តួនាទី៖ នាយកសាលា ឬ បណ្ណារក្ស   |   បន្ទប់៖ ${cls.room || 'ការិយាល័យរដ្ឋបាល'}`
    : `គ្រូប្រចាំថ្នាក់៖ ${teacherTitle} ${teacherName}   |   បន្ទប់៖ ${cls.room || 'បន្ទប់ទី១'}`;
  ctx.fillText(teacherLine, width / 2, infoY + 70);

  // Student Counts
  ctx.fillStyle = "#475569";
  ctx.font = "14px 'Kantumruy Pro', sans-serif";
  const subLine = cls.id === "admin"
    ? "អ្នកគ្រប់គ្រងប្រព័ន្ធផ្លូវការ  (សិទ្ធិមើលគ្រប់ថ្នាក់ទាំងអស់)"
    : `សិស្សក្នុងថ្នាក់សរុប៖ ${stTotal} នាក់  (សិស្សស្រី៖ ${stFemale} នាក់  •  សិស្សប្រុស៖ ${stMale} នាក់)`;
  ctx.fillText(subLine, width / 2, infoY + 98);

  // 5. QR Code Drawing
  const qrBoxY = 415;
  const qrSize = 310;
  const qrX = (width - qrSize) / 2;

  // White framed box for QR
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#93c5fd";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(qrX - 16, qrBoxY - 16, qrSize + 32, qrSize + 32, 16);
  } else {
    ctx.rect(qrX - 16, qrBoxY - 16, qrSize + 32, qrSize + 32);
  }
  ctx.fill();
  ctx.stroke();

  // Generate QR onto temp container synchronously
  const tempDiv = document.createElement("div");
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  document.body.appendChild(tempDiv);

  if (typeof window.QRCode === "function") {
    new window.QRCode(tempDiv, {
      text: loginUrl,
      width: qrSize,
      height: qrSize,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.H : 2
    });
  }

  try {
    const qrCanvas = tempDiv.querySelector("canvas");
    const qrImg = tempDiv.querySelector("img");
    if (qrCanvas) {
      ctx.drawImage(qrCanvas, qrX, qrBoxY, qrSize, qrSize);
    } else if (qrImg && qrImg.src) {
      ctx.drawImage(qrImg, qrX, qrBoxY, qrSize, qrSize);
    }
  } catch (e) {
    console.warn("QR draw error:", e);
  } finally {
    if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);
  }

  // 6. PIN Password Box
  const pinY = 780;
  ctx.fillStyle = "#eff6ff";
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(width / 2 - 180, pinY, 360, 44, 22);
  } else {
    ctx.rect(width / 2 - 180, pinY, 360, 44);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#1e3a8a";
  ctx.font = "bold 15px 'Kantumruy Pro', sans-serif";
  ctx.fillText(`កូដសម្ងាត់ (PIN)៖ `, width / 2 - 35, pinY + 28);
  ctx.fillStyle = "#2563eb";
  ctx.font = "bold 20px monospace";
  ctx.fillText(`${password}`, width / 2 + 75, pinY + 28);

  // 7. Instructions & Footer
  ctx.fillStyle = "#334155";
  ctx.font = "14px 'Kantumruy Pro', sans-serif";
  ctx.fillText("ស្កេនតាមទូរសព្ទដៃ ឬ នាំចូលរូបភាព QR នេះក្នុងផ្ទាំង Log In ដើម្បីចូលប្រើប្រព័ន្ធ", width / 2, 856);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px 'Kantumruy Pro', sans-serif";
  ctx.fillText("សាលាបឋមសិក្សា បាន្លួង  •  រក្សាសិទ្ធិគ្រប់យ៉ាង", width / 2, 925);

  // 8. Download
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  const safeGrade = (gradeName || "ថ្នាក់រៀន").replace(/\s+/g, "_");
  link.download = `QR_Code_${safeGrade}_សាលាបាន្លួង.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return dataUrl;
}

function downloadCurrentVisibleQRCodes() {
  const isAdmin = !!(window.authSystem && typeof window.authSystem.isAdmin === "function" && window.authSystem.isAdmin());
  const allowedGrade = (window.authSystem && typeof window.authSystem.getAllowedGrade === "function") ? window.authSystem.getAllowedGrade() : null;
  const classes = getClassesForYear(state.activeYear) || [];

  let targets = classes;
  if (!isAdmin && allowedGrade) {
    targets = classes.filter(c => c.grade === allowedGrade);
  }

  if (targets.length === 0) {
    alert("ពុំមានថ្នាក់រៀនសម្រាប់ទាញយកឡើយ!");
    return;
  }

  // If single class, download directly
  if (targets.length === 1) {
    downloadClassQRCode(targets[0].id);
    return;
  }

  // If multiple classes (Admin), download one by one with a small gap
  targets.forEach((cls, idx) => {
    setTimeout(() => {
      downloadClassQRCode(cls.id);
    }, idx * 400);
  });
}

window.renderClasses = renderClasses;
window.changeClassesYear = changeClassesYear;
window.filterClassesCards = filterClassesCards;
window.togglePinView = togglePinView;
window.quickLoginClassTeacher = quickLoginClassTeacher;
window.openClassRoster = openClassRoster;
window.openClassScores = openClassScores;
window.openClassAttendance = openClassAttendance;
window.printClassroomBadge = printClassroomBadge;
window.printAllClassroomBadges = printAllClassroomBadges;
window.exportClassesSummaryExcel = exportClassesSummaryExcel;
window.downloadClassQRCode = downloadClassQRCode;
window.downloadCurrentVisibleQRCodes = downloadCurrentVisibleQRCodes;


// Universal beforeprint & afterprint hooks for both Admin Tasks and Student Management
window.addEventListener("beforeprint", () => {
  // Priority 1: Check if Admin Tasks print is active or if user is on Admin Tasks tab
  const adminKeys = Object.keys(ADMIN_PRINT_CONFIG);
  const isAdminActive = document.body.classList.contains("admin-print-active") ||
                        document.body.hasAttribute("data-admin-subtab") ||
                        (state && (state.activeTab === "admin_tasks" || adminKeys.includes(state.activeTab)));
  
  if (isAdminActive) {
    const subTab = document.body.getAttribute("data-admin-subtab") ||
                   (state && adminKeys.includes(state.activeAdminSubTab) ? state.activeAdminSubTab : null) ||
                   (state && adminKeys.includes(state.activeTab) ? state.activeTab : "scores");
    prepareAdminPrint(subTab);
    return;
  }

  // Priority 2: Check Student Management tabs ONLY if user is currently on students management
  const stuTabs = ["students", "attendance_daily", "attendance_monthly", "attendance_yearly"];
  const isStuActive = document.body.classList.contains("tab-students_management-active") ||
                      (state && (state.activeTab === "students_management" || stuTabs.includes(state.activeTab)));
  
  if (isStuActive) {
    const st = (state && stuTabs.includes(state.activeStudentSubTab)) ? state.activeStudentSubTab : (stuTabs.includes(state.activeTab) ? state.activeTab : "students");
    if (typeof prepareStudentSubTabForPrint === "function") {
      prepareStudentSubTabForPrint(st);
    }
    return;
  }
});

window.addEventListener("afterprint", () => {
  if (document.body.classList.contains("admin-print-active") || document.body.hasAttribute("data-admin-subtab")) {
    restoreAdminPrint();
  }
});