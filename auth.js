/**
 * ==========================================================================
 * BANLOUNG PRIMARY SCHOOL - AUTHENTICATION & ACCESS CONTROL SYSTEM
 * ប្រព័ន្ធគ្រប់គ្រងសិទ្ធិ និងពាក្យសម្ងាត់តាមថ្នាក់នីមួយៗ និង Admin
 * ==========================================================================
 */

(function () {
  'use strict';

  // 1. Official Credentials Configuration (តារាងកំណត់ពាក្យសម្ងាត់ផ្លូវការ)
  const AUTH_USERS = [
    {
      id: "admin",
      password: "admin",
      role: "admin",
      isAdmin: true,
      label: "អ្នកគ្រប់គ្រងទូទៅ (Admin)",
      badge: "Admin (មើលគ្រប់ថ្នាក់)",
      grade: null,
      classId: null,
      teacher: "គណៈគ្រប់គ្រងសាលា",
      description: "មានសិទ្ធិមើល និងកែប្រែទិន្នន័យគ្រប់ថ្នាក់ទាំងអស់"
    },
    {
      id: "grade_1",
      password: "1111",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់ទី១",
      badge: "គ្រូថ្នាក់ទី១",
      grade: "ថ្នាក់ទី១",
      classId: "CLS_G1",
      teacher: "ផាន ផុស",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់ទី១"
    },
    {
      id: "grade_2",
      password: "2222",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់ទី២",
      badge: "គ្រូថ្នាក់ទី២",
      grade: "ថ្នាក់ទី២",
      classId: "CLS_G2",
      teacher: "លី មករា",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់ទី២"
    },
    {
      id: "grade_3",
      password: "3333",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់ទី៣",
      badge: "គ្រូថ្នាក់ទី៣",
      grade: "ថ្នាក់ទី៣",
      classId: "CLS_G3",
      teacher: "ក្រូយ ចាន់ធារ៉ា",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់ទី៣"
    },
    {
      id: "grade_4",
      password: "4444",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់ទី៤",
      badge: "គ្រូថ្នាក់ទី៤",
      grade: "ថ្នាក់ទី៤",
      classId: "CLS_G4",
      teacher: "សុខ ស្រីនាង",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់ទី៤"
    },
    {
      id: "grade_5",
      password: "5555",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់ទី៥",
      badge: "គ្រូថ្នាក់ទី៥",
      grade: "ថ្នាក់ទី៥",
      classId: "CLS_G5",
      teacher: "ញឹម ស៊ីវថា",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់ទី៥"
    },
    {
      id: "grade_6",
      password: "6666",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់ទី៦",
      badge: "គ្រូថ្នាក់ទី៦",
      grade: "ថ្នាក់ទី៦",
      classId: "CLS_G6",
      teacher: "ង៉ែត សារុន",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់ទី៦"
    },
    {
      id: "kindergarten",
      password: "0000",
      role: "teacher",
      isAdmin: false,
      label: "ថ្នាក់មត្តេយ្យ",
      badge: "គ្រូមត្តេយ្យ",
      grade: "ថ្នាក់មត្តេយ្យ",
      classId: "CLS_មត្តេយ្យ១",
      teacher: "លី ស្រីនូ",
      description: "គ្រប់គ្រងទិន្នន័យសិស្ស និងពិន្ទុថ្នាក់មត្តេយ្យ"
    }
  ];

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
  function login(password, selectedId) {
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
    hideLoginModal();
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

    switchAuthTab("password");
    const pwdInput = document.getElementById("authPasswordInput");
    if (pwdInput) {
      pwdInput.value = "";
      setTimeout(() => pwdInput.focus(), 150);
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
        roleElem.textContent = isUserAdmin ? "Admin" : (user.badge || user.label);
        nameElem.textContent = isUserAdmin ? "អ្នកគ្រប់គ្រងទូទៅ" : (user.teacher || user.label);
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
        sbUserTitle.textContent = isUserAdmin ? "អ្នកគ្រប់គ្រងទូទៅ (Admin)" : (user.teacher || user.label);
        sbUserSub.textContent = isUserAdmin ? "មើលទិន្នន័យគ្រប់ថ្នាក់" : (user.label + " (គ្រូប្រចាំថ្នាក់)");
        if (sbUserAvatar) {
          sbUserAvatar.innerHTML = isUserAdmin ? '<i class="fa-solid fa-user-shield"></i>' : '<i class="fa-solid fa-user-tie"></i>';
        }
      } else {
        sbUserCard.style.display = "none";
      }
    }

    // 3. Mark Admin-Only Tabs in Sidebar
    const ADMIN_ONLY_TABS = ["teachers", "exams", "reports", "school_monthly_report", "staff_info"];
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
  let activeAuthTab = "password";
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

    const res = login(pin);
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

  // Initialize System
  function initAuth() {
    // Check sessionStorage hooks for testing
    try {
      const seedLogin = sessionStorage.getItem("banloung_seed_login");
      if (seedLogin) {
        sessionStorage.removeItem("banloung_seed_login");
        login(seedLogin);
      }
    } catch(e){}

    // Auto-login from QR Code / URL parameter (e.g. ?login=1111 or ?pin=1111)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const autoPin = urlParams.get("login") || urlParams.get("pin");
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
      showLoginModal();
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("auth_tab") === "qr" || sessionStorage.getItem("banloung_force_qr_tab")) {
          sessionStorage.removeItem("banloung_force_qr_tab");
          switchAuthTab("qr");
        }
      } catch(e){}
    } else {
      hideLoginModal();
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
    stopCameraScanner: stopCameraScanner
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
