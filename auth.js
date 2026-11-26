/**
 * ==========================================================================
 * BANLOUNG PRIMARY SCHOOL - AUTHENTICATION & ACCESS CONTROL SYSTEM
 * ប្រព័ន្ធគ្រប់គ្រងសិទ្ធិ និងពាក្យសម្ងាត់តាមថ្នាក់នីមួយៗ និង Admin
 * ==========================================================================
 */

(function () {
  'use strict';

  // 1. Official Credentials Configuration (តារាងកំណត់ពាក្យសម្ងាត់ផ្លូវការ)
  const CUSTOM_PASSWORDS_STORAGE_KEY = "banloung_custom_passwords";

  function getCustomPasswords() {
    try {
      const raw = localStorage.getItem(CUSTOM_PASSWORDS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("[Auth] getCustomPasswords error:", e);
      return {};
    }
  }

  const AUTH_USERS = [
    {
      id: "admin",
      password: "admin",
      role: "admin",
      isAdmin: true,
      label: "គណៈគ្រប់គ្រង Admin (នាយកសាលា ឬ បណ្ណារក្ស)",
      badge: "Admin (នាយក / បណ្ណារក្ស)",
      grade: null,
      classId: null,
      teacher: "នាយកសាលា ឬ បណ្ណារក្ស",
      gender: "ប្រុស",
      title: "លោក",
      roleKh: "នាយក ឬ បណ្ណារក្ស",
      description: "តួនាទីជានាយក ឬបណ្ណារក្ស ដែលមានសិទ្ធិប្រើពាក្យសម្ងាត់ Admin ចូលគ្រប់គ្រងគ្រប់ថ្នាក់"
    },
    {
      id: "grade_1",
      password: "1111",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់ទី១ (លោកគ្រូ ផាន ផុស)",
      badge: "លោកគ្រូ ផាន ផុស",
      grade: "ថ្នាក់ទី១",
      classId: "CLS_G1",
      teacher: "ផាន ផុស",
      gender: "ប្រុស",
      title: "លោកគ្រូ",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់ទី១"
    },
    {
      id: "grade_2",
      password: "2222",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់ទី២ (អ្នកគ្រូ លី មករា)",
      badge: "អ្នកគ្រូ លី មករា",
      grade: "ថ្នាក់ទី២",
      classId: "CLS_G2",
      teacher: "លី មករា",
      gender: "ស្រី",
      title: "អ្នកគ្រូ",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់ទី២"
    },
    {
      id: "grade_3",
      password: "3333",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់ទី៣ (អ្នកគ្រូ ព្រួយ ចាន់ដារ៉ា)",
      badge: "អ្នកគ្រូ ព្រួយ ចាន់ដារ៉ា",
      grade: "ថ្នាក់ទី៣",
      classId: "CLS_G3",
      teacher: "ព្រួយ ចាន់ដារ៉ា",
      gender: "ស្រី",
      title: "អ្នកគ្រូ",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់ទី៣"
    },
    {
      id: "grade_4",
      password: "4444",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់ទី៤ (អ្នកគ្រូ សុខ ស្រីនាង)",
      badge: "អ្នកគ្រូ សុខ ស្រីនាង",
      grade: "ថ្នាក់ទី៤",
      classId: "CLS_G4",
      teacher: "សុខ ស្រីនាង",
      gender: "ស្រី",
      title: "អ្នកគ្រូ",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់ទី៤"
    },
    {
      id: "grade_5",
      password: "5555",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់ទី៥ (លោកគ្រូ ញឹម ស៊ីវថា)",
      badge: "លោកគ្រូ ញឹម ស៊ីវថា",
      grade: "ថ្នាក់ទី៥",
      classId: "CLS_G5",
      teacher: "ញឹម ស៊ីវថា",
      gender: "ប្រុស",
      title: "លោកគ្រូ",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់ទី៥"
    },
    {
      id: "grade_6",
      password: "6666",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់ទី៦ (លោកគ្រូ ផែត សារុន)",
      badge: "លោកគ្រូ ផែត សារុន",
      grade: "ថ្នាក់ទី៦",
      classId: "CLS_G6",
      teacher: "ផែត សារុន",
      gender: "ប្រុស",
      title: "លោកគ្រូ",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់ទី៦"
    },
    {
      id: "kindergarten",
      password: "0000",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់មត្តេយ្យ (អ្នកគ្រូ លី ស្រីនូ)",
      badge: "អ្នកគ្រូ លី ស្រីនូ",
      grade: "ថ្នាក់មត្តេយ្យ",
      classId: "CLS_មត្តេយ្យ១",
      teacher: "លី ស្រីនូ",
      gender: "ស្រី",
      title: "អ្នកគ្រូ",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់មត្តេយ្យ"
    }
  ];

  // Apply custom passwords stored by users
  function loadCustomPasswords() {
    const customPwds = getCustomPasswords();
    AUTH_USERS.forEach(u => {
      if (customPwds[u.id]) {
        u.password = String(customPwds[u.id]).trim();
      }
    });
  }

  // Load custom passwords right away
  loadCustomPasswords();

  // Synchronize auth users with teachers from Teacher Management (ផ្ទាំងគ្រប់គ្រងគ្រូបង្រៀន)
  function syncTeachersWithAuth() {
    let teachers = [];
    if (window.state && window.state.db && Array.isArray(window.state.db.teachers)) {
      teachers = window.state.db.teachers;
    } else if (typeof window.INITIAL_SCHOOL_DATA !== "undefined" && window.INITIAL_SCHOOL_DATA && Array.isArray(window.INITIAL_SCHOOL_DATA.teachers)) {
      teachers = window.INITIAL_SCHOOL_DATA.teachers;
    }

    loadCustomPasswords();

    if (teachers && teachers.length > 0) {
      AUTH_USERS.forEach(user => {
        if (user.isAdmin) {
          user.teacher = "នាយកសាលា ឬ បណ្ណារក្ស";
          user.roleKh = "នាយក ឬ បណ្ណារក្ស";
          user.badge = "Admin (នាយក / បណ្ណារក្ស)";
          user.label = "គណៈគ្រប់គ្រង Admin (នាយកសាលា ឬ បណ្ណារក្ស)";
          return;
        }

        // Find teacher in teachers database
        const found = teachers.find(t => {
          if (!t.grade) return false;
          const tg = t.grade.trim();
          const ug = (user.grade || "").trim();
          return tg === ug || tg.includes(ug) || ug.includes(tg);
        });

        if (found) {
          const isFemale = found.gender === "ស្រី";
          const title = isFemale ? "អ្នកគ្រូ" : "លោកគ្រូ";
          user.teacher = found.name;
          user.gender = found.gender || (isFemale ? "ស្រី" : "ប្រុស");
          user.title = title;
          user.label = `${user.grade} (${title} ${found.name})`;
          user.badge = `${title} ${found.name}`;
        }
      });
    }

    updateLoginSelectOptions();
  }

  function updateLoginSelectOptions() {
    const select = document.getElementById("authClassSelect");
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = "";

    AUTH_USERS.forEach(u => {
      const opt = document.createElement("option");
      opt.value = u.id;
      if (u.isAdmin) {
        opt.textContent = "🔑 គណៈគ្រប់គ្រង Admin (នាយកសាលា ឬ បណ្ណារក្ស) - មើលគ្រប់ថ្នាក់";
      } else {
        const title = (u.gender === "ស្រី" || u.title === "អ្នកគ្រូ") ? "អ្នកគ្រូ" : "លោកគ្រូ";
        opt.textContent = `🏫 ${u.grade} (${title} ${u.teacher})`;
      }
      select.appendChild(opt);
    });

    if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
      select.value = currentVal;
    }
  }

  const STORAGE_KEY = "banloung_auth_user";
  let currentUser = null;
  let adminPromptCallback = null;

  // Find User by Password directly (Smart PIN Match)
  function findUserByPassword(pwd) {
    if (!pwd) return null;
    const cleanPwd = pwd.trim().toLowerCase();
    return AUTH_USERS.find(u => u.password.toLowerCase() === cleanPwd) || null;
  }

  // Find User by selected ID
  function findUserById(id) {
    if (!id) return null;
    return AUTH_USERS.find(u => u.id === id) || null;
  }

  // Get Current User
  function getCurrentUser() {
    if (currentUser) return currentUser;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        currentUser = JSON.parse(saved);
        return currentUser;
      }
    } catch (e) {
      console.error("[Auth] Error reading storage:", e);
    }
    return null;
  }

  // Check login state
  function isLoggedIn() {
    return !!getCurrentUser();
  }

  // Check if Admin
  function isAdmin() {
    const user = getCurrentUser();
    return !!(user && (user.isAdmin === true || user.role === "admin"));
  }

  // Get Allowed Grade (e.g. "ថ្នាក់ទី១", or null for Admin)
  function getAllowedGrade() {
    const user = getCurrentUser();
    if (!user) return null;
    if (user.isAdmin === true || user.role === "admin") return null;
    return user.grade || null;
  }

  // Save Session
  function saveSession(user) {
    currentUser = Object.assign({}, user, { isAdmin: user.role === "admin" });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    } catch (e) {
      console.error("[Auth] Save session error:", e);
    }
  }

  // Clear Session
  function clearSession() {
    currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("[Auth] Clear session error:", e);
    }
  }

  // Perform Login
  function login(password, selectedId, skipHideModal = false) {
    if (!password) {
      return { success: false, error: "សូមបញ្ចូលពាក្យសម្ងាត់!" };
    }

    const cleanPwd = password.trim();

    // 1. Direct password match check
    let matchedUser = findUserByPassword(cleanPwd);

    // 2. If user also selected an account in the dropdown, verify consistency
    if (selectedId) {
      const selectedUser = findUserById(selectedId);
      if (selectedUser) {
        if (selectedUser.password.toLowerCase() === cleanPwd.toLowerCase()) {
          matchedUser = selectedUser;
        } else if (!matchedUser) {
          return {
            success: false,
            error: `ពាក្យសម្ងាត់មិនត្រឹមត្រូវសម្រាប់ ${selectedUser.label} ទេ!`
          };
        }
      }
    }

    if (!matchedUser) {
      return {
        success: false,
        error: "ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ! សូមពិនិត្យមើល និងបញ្ចូលឡើងវិញ។"
      };
    }

    // Success: Save user & update application
    saveSession(matchedUser);
    if (!skipHideModal) {
      hideLoginModal();
    }
    updateAuthUI();

    // Align application active class with teacher's class
    if (window.state) {
      if (!matchedUser.isAdmin && matchedUser.grade) {
        const classes = (window.state.db && window.state.db.classes) ? window.state.db.classes : [];
        const found = classes.find(c => c.grade === matchedUser.grade && c.academicYear === (window.state.activeYear || "២០២៦-២០២៧"))
          || classes.find(c => c.grade === matchedUser.grade);
        if (found) {
          window.state.activeClassId = found.id;
        } else if (matchedUser.classId) {
          window.state.activeClassId = matchedUser.classId;
        }
      }
      if (typeof window.renderApp === "function") {
        window.renderApp();
      }
    }

    return { success: true, user: matchedUser };
  }

  // Perform Logout
  function logout() {
    clearSession();
    updateAuthUI();
    showLoginModal();
  }

  // Show Login Modal
  function showLoginModal() {
    const overlay = document.getElementById("authModalOverlay");
    if (!overlay) return;
    overlay.style.display = "flex";
    document.body.classList.add("auth-modal-open");
    document.body.classList.add("auth-locked");

    syncTeachersWithAuth();
    switchAuthTab("qr");
    const pwdInput = document.getElementById("authPasswordInput");
    if (pwdInput) {
      pwdInput.value = "";
    }
    const errBox = document.getElementById("authErrorMessage");
    if (errBox) {
      errBox.style.display = "none";
      errBox.textContent = "";
    }
    showQRStatus("", "");
  }

  // Hide Login Modal
  function hideLoginModal() {
    stopCameraScanner();
    const overlay = document.getElementById("authModalOverlay");
    if (!overlay) return;
    overlay.style.display = "none";
    document.body.classList.remove("auth-modal-open");
    document.body.classList.remove("auth-locked");
  }

  // Toggle Password Visibility
  function toggleAuthPasswordVisibility() {
    const input = document.getElementById("authPasswordInput");
    const icon = document.getElementById("authPasswordEyeIcon");
    if (!input || !icon) return;

    if (input.type === "password") {
      input.type = "text";
      icon.className = "fa-solid fa-eye-slash";
    } else {
      input.type = "password";
      icon.className = "fa-solid fa-eye";
    }
  }

  // Handle Form Submit
  function handleAuthSubmit(e) {
    if (e) e.preventDefault();
    const select = document.getElementById("authClassSelect");
    const pwdInput = document.getElementById("authPasswordInput");
    const errBox = document.getElementById("authErrorMessage");

    const selectedId = select ? select.value : null;
    const password = pwdInput ? pwdInput.value : "";

    const res = login(password, selectedId);
    if (!res.success) {
      if (errBox) {
        errBox.textContent = res.error;
        errBox.style.display = "block";
        errBox.classList.remove("shake");
        void errBox.offsetWidth; // Trigger reflow for animation
        errBox.classList.add("shake");
      }
    } else {
      if (errBox) errBox.style.display = "none";
    }
  }

  // Quick fill helper
  function quickFillAuth(classId, pwd) {
    const select = document.getElementById("authClassSelect");
    const input = document.getElementById("authPasswordInput");
    const errBox = document.getElementById("authErrorMessage");

    if (select) select.value = classId;
    if (input) {
      input.value = pwd;
      input.focus();
    }
    if (errBox) errBox.style.display = "none";
  }

  // Update UI Elements based on Authentication State
  function updateAuthUI() {
    const user = getCurrentUser();
    const isUserAdmin = isAdmin();

    // 1. Update Top Bar User Badge
    const badge = document.getElementById("userAuthBadge");
    const roleElem = document.getElementById("userAuthRole");
    const nameElem = document.getElementById("userAuthName");
    const iconElem = document.getElementById("userAuthIcon");

    if (badge && roleElem && nameElem) {
      if (user) {
        badge.style.display = "flex";
        badge.className = "user-auth-badge " + (isUserAdmin ? "admin" : "teacher");
        roleElem.textContent = isUserAdmin ? "Admin (នាយក / បណ្ណារក្ស)" : (user.badge || user.label);
        nameElem.textContent = isUserAdmin ? "គណៈគ្រប់គ្រង (Admin)" : (user.teacher || user.label);
        if (iconElem) {
          iconElem.className = isUserAdmin ? "fa-solid fa-crown text-warning" : "fa-solid fa-chalkboard-user text-primary";
        }
      } else {
        badge.style.display = "none";
      }
    }

    // 2. Update Sidebar User Card
    const sbUserCard = document.getElementById("sidebarUserCard");
    const sbUserTitle = document.getElementById("sidebarUserTitle");
    const sbUserSub = document.getElementById("sidebarUserSub");
    const sbUserAvatar = document.getElementById("sidebarUserAvatar");

    if (sbUserCard && sbUserTitle && sbUserSub) {
      if (user) {
        sbUserCard.style.display = "flex";
        sbUserTitle.textContent = isUserAdmin ? "គណៈគ្រប់គ្រង Admin" : (user.teacher || user.label);
        sbUserSub.textContent = isUserAdmin ? "តួនាទីជានាយក ឬបណ្ណារក្ស" : (user.label + " (គ្រូប្រចាំថ្នាក់)");
        if (sbUserAvatar) {
          sbUserAvatar.innerHTML = isUserAdmin ? '<i class="fa-solid fa-user-shield"></i>' : '<i class="fa-solid fa-user-tie"></i>';
        }
      } else {
        sbUserCard.style.display = "none";
      }
    }

    // 3. Mark Admin-Only Tabs in Sidebar
    const ADMIN_ONLY_TABS = ["teachers", "school_monthly_report", "staff_info"];
    ADMIN_ONLY_TABS.forEach(tabId => {
      const link = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
      if (link) {
        let lockBadge = link.querySelector(".admin-tab-lock-badge");
        if (user && !isUserAdmin) {
          if (!lockBadge) {
            lockBadge = document.createElement("span");
            lockBadge.className = "admin-tab-lock-badge";
            lockBadge.innerHTML = '<i class="fa-solid fa-lock" title="សម្រាប់តែ Admin"></i>';
            link.appendChild(lockBadge);
          }
          link.classList.add("admin-restricted-tab");
        } else {
          if (lockBadge) lockBadge.remove();
          link.classList.remove("admin-restricted-tab");
        }
      }
    });

    // 4. Update class options in dropdowns if available
    if (typeof window.updateClassSelectOptions === "function") {
      window.updateClassSelectOptions();
    }
  }

  // Prompt Admin Access Modal
  function promptAdminAccess(targetTab, onSuccess) {
    adminPromptCallback = onSuccess;
    const modal = document.getElementById("adminPromptModalOverlay");
    const pwdInput = document.getElementById("adminPromptPassword");
    const errBox = document.getElementById("adminPromptError");

    if (modal) {
      modal.style.display = "flex";
      if (pwdInput) {
        pwdInput.value = "";
        setTimeout(() => pwdInput.focus(), 150);
      }
      if (errBox) errBox.style.display = "none";
    }
  }

  function closeAdminPromptModal() {
    const modal = document.getElementById("adminPromptModalOverlay");
    if (modal) modal.style.display = "none";
    adminPromptCallback = null;
  }

  function confirmAdminPrompt() {
    const pwdInput = document.getElementById("adminPromptPassword");
    const errBox = document.getElementById("adminPromptError");
    const pwd = pwdInput ? pwdInput.value.trim() : "";

    if (pwd.toLowerCase() === "admin") {
      // Elevate session to Admin
      const adminUser = findUserById("admin");
      saveSession(adminUser);
      updateAuthUI();
      closeAdminPromptModal();

      if (typeof adminPromptCallback === "function") {
        adminPromptCallback();
      } else if (typeof window.renderApp === "function") {
        window.renderApp();
      }
    } else {
      if (errBox) {
        errBox.textContent = "ពាក្យសម្ងាត់ Admin មិនត្រឹមត្រូវទេ! (ពាក្យសម្ងាត់គឺ admin)";
        errBox.style.display = "block";
      }
    }
  }

  // -------------------------------------------------------------------------
  // QR CODE IMPORT, SCANNING & LOGIN (ការនាំចូល និងស្កេន QR Code)
  // -------------------------------------------------------------------------
  let activeAuthTab = "qr";
  let cameraStream = null;
  let cameraScanReqId = null;

  function switchAuthTab(tab) {
    activeAuthTab = tab;
    const btnPwd = document.getElementById("authTabBtnPassword");
    const btnQR = document.getElementById("authTabBtnQR");
    const panePwd = document.getElementById("authPanePassword");
    const paneQR = document.getElementById("authPaneQR");

    if (tab === "qr") {
      if (btnPwd) btnPwd.classList.remove("active");
      if (btnQR) btnQR.classList.add("active");
      if (panePwd) panePwd.style.display = "none";
      if (paneQR) paneQR.style.display = "block";
      showQRStatus("", "");
    } else {
      if (btnQR) btnQR.classList.remove("active");
      if (btnPwd) btnPwd.classList.add("active");
      if (paneQR) paneQR.style.display = "none";
      if (panePwd) panePwd.style.display = "block";
      stopCameraScanner();
      const pwdInput = document.getElementById("authPasswordInput");
      if (pwdInput) setTimeout(() => pwdInput.focus(), 100);
    }
  }

  function triggerQRFileInput() {
    const input = document.getElementById("authQRFileInput");
    if (input) {
      input.value = "";
      input.click();
    }
  }

  function handleQRDragOver(e) {
    if (e) e.preventDefault();
    const zone = document.getElementById("authQRDropzone");
    if (zone) zone.classList.add("is-dragover");
  }

  function handleQRDragLeave(e) {
    if (e) e.preventDefault();
    const zone = document.getElementById("authQRDropzone");
    if (zone) zone.classList.remove("is-dragover");
  }

  function handleQRDrop(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const zone = document.getElementById("authQRDropzone");
    if (zone) zone.classList.remove("is-dragover");

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      decodeQRFromFile(file);
    }
  }

  function handleQRFileChange(e) {
    if (e && e.target && e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      decodeQRFromFile(file);
    }
  }

  // Support Ctrl+V paste of QR screenshot while modal is open
  window.addEventListener("paste", function(e) {
    const overlay = document.getElementById("authModalOverlay");
    if (!overlay || overlay.style.display === "none") return;
    if (e.clipboardData && e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            switchAuthTab("qr");
            decodeQRFromFile(file);
            break;
          }
        }
      }
    }
  });

  function showQRStatus(message, type) {
    const statusBox = document.getElementById("authQRStatus");
    if (!statusBox) return;
    if (!message) {
      statusBox.style.display = "none";
      statusBox.className = "auth-qr-status";
      statusBox.innerHTML = "";
      return;
    }
    statusBox.style.display = "flex";
    statusBox.className = "auth-qr-status " + (type || "info");
    const icon = (type === "success")
      ? '<i class="fa-solid fa-circle-check text-success"></i>'
      : (type === "error")
      ? '<i class="fa-solid fa-circle-exclamation text-danger"></i>'
      : '<i class="fa-solid fa-spinner fa-spin text-primary"></i>';
    statusBox.innerHTML = `${icon} <span>${message}</span>`;
  }

  // Parse QR content to extract PIN or account
  function parseQRData(raw) {
    if (!raw) return null;
    const str = String(raw).trim();

    // 1. Check if contains URL query params: ?login=... or &login=... or ?pin=...
    if (str.includes("login=") || str.includes("pin=")) {
      try {
        let qs = str;
        if (str.includes("?")) {
          qs = str.split("?")[1];
        }
        const params = new URLSearchParams(qs);
        const pin = params.get("login") || params.get("pin");
        if (pin) return pin.trim();
      } catch (e) {
        console.error("URL search params parse error", e);
      }
    }

    // 2. Check JSON
    if (str.startsWith("{") && str.endsWith("}")) {
      try {
        const obj = JSON.parse(str);
        if (obj.pin) return String(obj.pin).trim();
        if (obj.password) return String(obj.password).trim();
        if (obj.login) return String(obj.login).trim();
      } catch (e){}
    }

    // 3. Direct match with any password in AUTH_USERS
    const matched = AUTH_USERS.find(u => u.password.toLowerCase() === str.toLowerCase());
    if (matched) return matched.password;

    // 4. Return trimmed string directly
    return str;
  }

  function handleDecodedQRText(decodedText) {
    const pin = parseQRData(decodedText);
    if (!pin) {
      showQRStatus("ទិន្នន័យ QR Code មិនត្រឹមត្រូវសម្រាប់ប្រព័ន្ធនេះឡើយ!", "error");
      return;
    }

    const res = login(pin, null, true);
    if (res && res.success) {
      const u = res.user;
      showQRStatus(`ស្កេនជោគជ័យ! ស្វាគមន៍ ${u.label} (${u.teacher || u.role})`, "success");
      stopCameraScanner();
      setTimeout(() => {
        hideLoginModal();
      }, 700);
    } else {
      showQRStatus((res && res.error) || "ការចូលប្រើប្រព័ន្ធមិនត្រឹមត្រូវ!", "error");
    }
  }

  function decodeQRFromFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showQRStatus("សូមជ្រើសរើសឯកសាររូបភាព QR Code (PNG, JPG, WebP)!", "error");
      return;
    }

    showQRStatus("កំពុងដំណើរការពិនិត្យ និងស្កេនរូបភាព QR Code...", "loading");

    const reader = new FileReader();
    reader.onload = function(evt) {
      const img = new Image();
      img.onload = function() {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);

          if (typeof window.jsQR === "function") {
            // First attempt normal
            let code = window.jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert"
            });
            // Fallback attempt both
            if (!code) {
              code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth"
              });
            }

            if (code && code.data) {
              handleDecodedQRText(code.data);
            } else {
              showQRStatus("មិនអាចរកឃើញ QR Code ក្នុងរូបភាពនេះទេ! សូមជ្រើសរើសរូបភាពដែលច្បាស់។", "error");
            }
          } else {
            showQRStatus("បណ្ណាល័យស្កេន QR (jsQR) មិនទាន់ដំណើរការ!", "error");
          }
        } catch (err) {
          console.error("QR decode error:", err);
          showQRStatus("មានបញ្ហាក្នុងការស្កេនរូបភាព៖ " + err.message, "error");
        }
      };
      img.onerror = function() {
        showQRStatus("មិនអាចបើករូបភាពនេះបានឡើយ!", "error");
      };
      img.src = evt.target.result;
    };
    reader.onerror = function() {
      showQRStatus("មិនអាចអានឯកសាររូបភាពបានឡើយ!", "error");
    };
    reader.readAsDataURL(file);
  }

  // Camera Scanner
  function toggleCameraScanner() {
    const container = document.getElementById("qrCameraContainer");
    if (!container) return;
    if (container.style.display === "none" || !cameraStream) {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }
  }

  function startCameraScanner() {
    const container = document.getElementById("qrCameraContainer");
    const video = document.getElementById("qrCameraVideo");
    const btn = document.getElementById("btnToggleCameraScan");
    if (!container || !video) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showQRStatus("ឧបករណ៍ ឬកម្មវិធីរុករកនេះមិនគាំទ្រការបើកកាមេរ៉ាទេ! សូមប្រើការនាំចូលរូបភាពជំនួសវិញ។", "error");
      return;
    }

    showQRStatus("កំពុងបើកកាមេរ៉ា...", "loading");

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    }).then(function(stream) {
      cameraStream = stream;
      video.srcObject = stream;
      video.setAttribute("playsinline", true);
      video.play();
      container.style.display = "block";
      if (btn) btn.innerHTML = '<i class="fa-solid fa-video-slash"></i> បិទកាមេរ៉ាស្កេន';
      showQRStatus("សូមដាក់ QR Code ឱ្យចំប្រអប់កាមេរ៉ា...", "info");
      cameraScanReqId = requestAnimationFrame(scanCameraTick);
    }).catch(function(err) {
      console.warn("Camera access denied or failed:", err);
      showQRStatus("មិនអាចបើកកាមេរ៉ាបានទេ (សូមអនុញ្ញាត Camera Permission ឬប្រើការនាំចូលរូបភាព)!", "error");
      stopCameraScanner();
    });
  }

  function stopCameraScanner() {
    if (cameraScanReqId) {
      cancelAnimationFrame(cameraScanReqId);
      cameraScanReqId = null;
    }
    if (cameraStream) {
      try {
        cameraStream.getTracks().forEach(t => t.stop());
      } catch(e){}
      cameraStream = null;
    }
    const container = document.getElementById("qrCameraContainer");
    const video = document.getElementById("qrCameraVideo");
    const btn = document.getElementById("btnToggleCameraScan");
    if (container) container.style.display = "none";
    if (video) video.srcObject = null;
    if (btn) btn.innerHTML = '<i class="fa-solid fa-camera"></i> បើកកាមេរ៉ាស្កេនផ្ទាល់ (Scan Camera)';
  }

  function scanCameraTick() {
    const video = document.getElementById("qrCameraVideo");
    if (!video || !cameraStream) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (typeof window.jsQR === "function") {
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });
        if (code && code.data) {
          handleDecodedQRText(code.data);
          return;
        }
      }
    }
    cameraScanReqId = requestAnimationFrame(scanCameraTick);
  }

  // -------------------------------------------------------------------------
  // CHANGE PASSWORD & QR CODE LOGIC (ផ្លាស់ប្ដូរពាក្យសម្ងាត់ និង QR Code)
  // -------------------------------------------------------------------------
  function changePassword(accountId, currentPassword, newPassword) {
    if (!accountId) {
      return { success: false, error: "សូមជ្រើសរើសគណនីដែលត្រូវប្តូរពាក្យសម្ងាត់!" };
    }
    const user = AUTH_USERS.find(u => u.id === accountId);
    if (!user) {
      return { success: false, error: "រកមិនឃើញគណនីនេះក្នុងប្រព័ន្ធឡើយ!" };
    }

    const cur = getCurrentUser();
    const isSelf = cur && cur.id === accountId;
    const isSysAdmin = cur && cur.isAdmin;

    if (!isSysAdmin || isSelf) {
      if (!currentPassword) {
        return { success: false, error: "សូមបញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្ន (ចាស់)!" };
      }
      if (currentPassword.trim().toLowerCase() !== user.password.toLowerCase()) {
        return { success: false, error: "ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវឡើយ!" };
      }
    }

    if (!newPassword || newPassword.trim().length < 3) {
      return { success: false, error: "ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងហោចណាស់ ៣ តួអក្សរ ឬលេខ!" };
    }

    const cleanNew = newPassword.trim();
    const customPwds = getCustomPasswords();
    customPwds[user.id] = cleanNew;
    try {
      localStorage.setItem(CUSTOM_PASSWORDS_STORAGE_KEY, JSON.stringify(customPwds));
    } catch (e) {
      console.error("[Auth] save custom password error:", e);
    }

    user.password = cleanNew;

    // If currently logged in user is this user, update session
    if (cur && cur.id === user.id) {
      cur.password = cleanNew;
      saveSession(cur);
    }

    // If on classes tab, re-render it so the QR code and PIN are updated
    if (typeof window.renderClasses === "function" && window.state && window.state.activeTab === "classes") {
      window.renderClasses();
    }

    return {
      success: true,
      user: user,
      newPassword: cleanNew,
      message: `បានផ្លាស់ប្ដូរពាក្យសម្ងាត់ និងបង្កើត QR Code ថ្មីសម្រាប់ ${user.label} ដោយជោគជ័យ!`
    };
  }

  let activeChangePwdTargetId = null;

  function openChangePasswordModal(targetId) {
    const cur = getCurrentUser();
    if (!cur) {
      showLoginModal();
      return;
    }

    syncTeachersWithAuth();

    let target = null;
    if (targetId) {
      target = AUTH_USERS.find(u => u.id === targetId || u.classId === targetId || u.grade === targetId);
    }

    if (!target) {
      target = AUTH_USERS.find(u => u.id === cur.id) || cur;
    }

    // Permission check: If not admin, can ONLY change own class password
    if (!cur.isAdmin && target.id !== cur.id && target.grade !== cur.grade) {
      alert("លោកគ្រូ/អ្នកគ្រូ អាចផ្លាស់ប្ដូរពាក្យសម្ងាត់បានតែថ្នាក់របស់ខ្លួនប៉ុណ្ណោះ!");
      target = AUTH_USERS.find(u => u.id === cur.id) || cur;
    }

    activeChangePwdTargetId = target.id;

    const overlay = document.getElementById("changePasswordModalOverlay");
    if (!overlay) return;

    // Populate Account Subtitle
    const sub = document.getElementById("changePwdAccountSubtitle");
    if (sub) {
      sub.innerHTML = `សម្រាប់៖ <strong>${target.label}</strong>`;
    }

    // Admin Account Selector
    const selGroup = document.getElementById("changePwdAccountSelectGroup");
    const sel = document.getElementById("changePwdAccountSelect");
    if (selGroup && sel) {
      if (cur.isAdmin) {
        selGroup.style.display = "block";
        sel.innerHTML = "";
        AUTH_USERS.forEach(u => {
          const opt = document.createElement("option");
          opt.value = u.id;
          opt.textContent = u.label;
          if (u.id === target.id) opt.selected = true;
          sel.appendChild(opt);
        });
      } else {
        selGroup.style.display = "none";
      }
    }

    // Reset fields
    const curGroup = document.getElementById("changePwdCurrentGroup");
    const curInput = document.getElementById("changePwdCurrent");
    if (curInput) curInput.value = "";
    if (curGroup) {
      // If admin changing for someone else, current password is optional/hidden
      curGroup.style.display = (cur.isAdmin && target.id !== "admin") ? "none" : "block";
    }

    const newInput = document.getElementById("changePwdNew");
    if (newInput) newInput.value = "";

    const confInput = document.getElementById("changePwdConfirm");
    if (confInput) confInput.value = "";

    const alertBox = document.getElementById("changePwdAlert");
    if (alertBox) {
      alertBox.style.display = "none";
      alertBox.textContent = "";
    }

    // Show form body, hide success pane
    const formBody = document.getElementById("changePwdFormBody");
    const successPane = document.getElementById("changePwdSuccessPane");
    if (formBody) formBody.style.display = "block";
    if (successPane) successPane.style.display = "none";

    overlay.style.display = "flex";
    setTimeout(() => {
      if (curGroup && curGroup.style.display !== "none" && curInput) {
        curInput.focus();
      } else if (newInput) {
        newInput.focus();
      }
    }, 150);
  }

  function closeChangePasswordModal() {
    const overlay = document.getElementById("changePasswordModalOverlay");
    if (overlay) overlay.style.display = "none";
  }

  function handleChangePwdTargetChange() {
    const sel = document.getElementById("changePwdAccountSelect");
    if (!sel) return;
    const targetId = sel.value;
    const target = AUTH_USERS.find(u => u.id === targetId);
    if (!target) return;

    activeChangePwdTargetId = target.id;
    const sub = document.getElementById("changePwdAccountSubtitle");
    if (sub) {
      sub.innerHTML = `សម្រាប់៖ <strong>${target.label}</strong>`;
    }

    const cur = getCurrentUser();
    const curGroup = document.getElementById("changePwdCurrentGroup");
    if (curGroup) {
      curGroup.style.display = (cur && cur.isAdmin && target.id !== "admin") ? "none" : "block";
    }
  }

  function handleChangePasswordSubmit(e) {
    if (e) e.preventDefault();

    const targetId = activeChangePwdTargetId;
    const curInput = document.getElementById("changePwdCurrent");
    const newInput = document.getElementById("changePwdNew");
    const confInput = document.getElementById("changePwdConfirm");
    const alertBox = document.getElementById("changePwdAlert");

    const currentPwd = curInput ? curInput.value : "";
    const newPwd = newInput ? newInput.value : "";
    const confPwd = confInput ? confInput.value : "";

    function showAlert(msg, isErr = true) {
      if (!alertBox) return;
      alertBox.textContent = msg;
      alertBox.className = "change-pwd-alert " + (isErr ? "error" : "success");
      alertBox.style.display = "block";
      alertBox.classList.remove("shake");
      void alertBox.offsetWidth;
      alertBox.classList.add("shake");
    }

    if (newPwd !== confPwd) {
      showAlert("ពាក្យសម្ងាត់ថ្មី និងការបញ្ជាក់ពាក្យសម្ងាត់មិនត្រូវគ្នាឡើយ!");
      if (confInput) confInput.focus();
      return;
    }

    const res = changePassword(targetId, currentPwd, newPwd);
    if (!res.success) {
      showAlert(res.error, true);
      return;
    }

    // Success! Show success pane and live generated QR Code
    const formBody = document.getElementById("changePwdFormBody");
    const successPane = document.getElementById("changePwdSuccessPane");
    if (formBody) formBody.style.display = "none";
    if (successPane) successPane.style.display = "block";

    const accNameEl = document.getElementById("changePwdSuccessAccount");
    if (accNameEl) accNameEl.textContent = res.user.label;

    const pinEl = document.getElementById("changePwdNewPinText");
    if (pinEl) pinEl.textContent = res.newPassword;

    // Generate live QR code into container
    const qrHolder = document.getElementById("changePwdQRHolder");
    if (qrHolder) {
      qrHolder.innerHTML = "";

      const baseUrl = (window.location.origin && window.location.origin !== "null")
        ? `${window.location.origin}${window.location.pathname}`
        : window.location.href.split("?")[0].split("#")[0];
      const loginUrl = `${baseUrl}?login=${encodeURIComponent(res.newPassword)}&class=${encodeURIComponent(res.user.classId || res.user.id)}`;

      if (typeof window.generateQRCodeSVG === "function") {
        qrHolder.innerHTML = window.generateQRCodeSVG(loginUrl, 180, 2);
      } else if (typeof window.QRCode === "function") {
        new window.QRCode(qrHolder, {
          text: loginUrl,
          width: 180,
          height: 180,
          colorDark: "#0f172a",
          colorLight: "#ffffff"
        });
      }
    }

    // Wire up download button
    const btnDownload = document.getElementById("btnDownloadNewQR");
    if (btnDownload) {
      btnDownload.onclick = function () {
        if (typeof window.downloadClassQRCode === "function") {
          window.downloadClassQRCode(res.user.classId || res.user.id);
        }
      };
    }
  }

  function toggleInputEye(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn ? btn.querySelector("i") : null;
    if (input.type === "password") {
      input.type = "text";
      if (icon) icon.className = "fa-solid fa-eye-slash";
    } else {
      input.type = "password";
      if (icon) icon.className = "fa-solid fa-eye";
    }
  }

  // Initialize System
  function initAuth() {
    syncTeachersWithAuth();

    // Check sessionStorage hooks for testing
    try {
      const seedLogin = sessionStorage.getItem("banloung_seed_login");
      if (seedLogin) {
        sessionStorage.removeItem("banloung_seed_login");
        login(seedLogin);
      }
    } catch(e){}

    // Auto-login from QR Code / URL parameter (e.g. ?login=1111 or ?pin=1111 or ?auth_qr=1111)
    let urlParams = null;
    try {
      urlParams = new URLSearchParams(window.location.search);
      const autoPin = urlParams.get("login") || urlParams.get("pin") || urlParams.get("auth_qr");
      if (autoPin) {
        const loginRes = login(autoPin);
        if (loginRes && loginRes.success) {
          console.log("[Auth] Logged in via QR Code / URL param:", loginRes.user.label);
        }
      }
    } catch (e) {
      console.error("[Auth] QR auto-login error:", e);
    }

    const user = getCurrentUser();
    if (!user) {
      document.body.classList.add("auth-locked");
      showLoginModal();
      if (sessionStorage.getItem("banloung_force_tab_password") || (urlParams && urlParams.get("auth_tab") === "password")) {
        sessionStorage.removeItem("banloung_force_tab_password");
        switchAuthTab("password");
      } else {
        switchAuthTab("qr");
      }
    } else {
      hideLoginModal();
      if (sessionStorage.getItem("banloung_auto_open_change_pwd")) {
        sessionStorage.removeItem("banloung_auto_open_change_pwd");
        setTimeout(() => openChangePasswordModal(), 200);
      }
    }
    updateAuthUI();
  }

  // Expose to window
  window.authSystem = {
    USERS: AUTH_USERS,
    init: initAuth,
    login: login,
    logout: logout,
    getCurrentUser: getCurrentUser,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,
    getAllowedGrade: getAllowedGrade,
    promptAdminAccess: promptAdminAccess,
    closeAdminPromptModal: closeAdminPromptModal,
    confirmAdminPrompt: confirmAdminPrompt,
    showLoginModal: showLoginModal,
    hideLoginModal: hideLoginModal,
    updateAuthUI: updateAuthUI,
    handleAuthSubmit: handleAuthSubmit,
    toggleAuthPasswordVisibility: toggleAuthPasswordVisibility,
    quickFillAuth: quickFillAuth,
    switchAuthTab: switchAuthTab,
    triggerQRFileInput: triggerQRFileInput,
    handleQRDragOver: handleQRDragOver,
    handleQRDragLeave: handleQRDragLeave,
    handleQRDrop: handleQRDrop,
    handleQRFileChange: handleQRFileChange,
    decodeQRFromFile: decodeQRFromFile,
    handleDecodedQRText: handleDecodedQRText,
    parseQRData: parseQRData,
    toggleCameraScanner: toggleCameraScanner,
    stopCameraScanner: stopCameraScanner,
    syncTeachers: syncTeachersWithAuth,
    changePassword: changePassword,
    openChangePasswordModal: openChangePasswordModal,
    closeChangePasswordModal: closeChangePasswordModal,
    handleChangePasswordSubmit: handleChangePasswordSubmit,
    handleChangePwdTargetChange: handleChangePwdTargetChange,
    toggleInputEye: toggleInputEye
  };

  // Expose global helpers for inline HTML event attributes
  window.handleAuthSubmit = handleAuthSubmit;
  window.quickFillAuth = quickFillAuth;
  window.toggleAuthPasswordVisibility = toggleAuthPasswordVisibility;
  window.closeAdminPromptModal = closeAdminPromptModal;
  window.confirmAdminPrompt = confirmAdminPrompt;
  window.switchAuthTab = switchAuthTab;
  window.triggerQRFileInput = triggerQRFileInput;
  window.handleQRDragOver = handleQRDragOver;
  window.handleQRDragLeave = handleQRDragLeave;
  window.handleQRDrop = handleQRDrop;
  window.handleQRFileChange = handleQRFileChange;
  window.decodeQRFromFile = decodeQRFromFile;
  window.handleDecodedQRText = handleDecodedQRText;
  window.parseQRData = parseQRData;
  window.toggleCameraScanner = toggleCameraScanner;
  window.stopCameraScanner = stopCameraScanner;
  window.openChangePasswordModal = openChangePasswordModal;
  window.closeChangePasswordModal = closeChangePasswordModal;
  window.handleChangePasswordSubmit = handleChangePasswordSubmit;
  window.handleChangePwdTargetChange = handleChangePwdTargetChange;
  window.toggleInputEye = toggleInputEye;
  window.handleAuthClassChange = function () {
    const pwdInput = document.getElementById("authPasswordInput");
    if (pwdInput) {
      pwdInput.value = "";
      pwdInput.focus();
    }
  };

  // Auto initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }

})();
