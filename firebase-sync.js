/**
 * ==========================================================================
 * BANLOUNG PRIMARY SCHOOL APP - FIREBASE REALTIME DATABASE SYNC MANAGER
 * គ្រប់គ្រងការតភ្ជាប់ និងសមកាលកម្មទិន្នន័យជាមួយ Firebase Realtime Database
 * គាំទ្រប្រព័ន្ធ Local-First ដំណើរការភ្លាមៗ ទោះបីដាច់ Internet ឬបាត់បង់ការតភ្ជាប់
 * ==========================================================================
 */

(function () {
  'use strict';

  // 1. Firebase Configuration
  const firebaseConfig = {
    apiKey: "AIzaSyCvB9GGrmvOl6IUa5SLwoF_T6KhHA6bViQ",
    authDomain: "banloung-school-db.firebaseapp.com",
    databaseURL: "https://banloung-school-db-default-rtdb.firebaseio.com",
    projectId: "banloung-school-db",
    storageBucket: "banloung-school-db.firebasestorage.app",
    messagingSenderId: "391435229937",
    appId: "1:391435229937:web:2bb6bc1cc31393d5a91a18",
    measurementId: "G-LF3SNHMNZJ"
  };

  const QUEUE_STORAGE_KEY = "banloung_pending_sync_queue";

  // State
  const syncState = {
    initialized: false,
    isConnected: false,
    isSyncing: false,
    isFlushing: false,
    lastSyncTime: null,
    rulesRequired: false,
    isLocalChange: false,
    saveDebounceTimer: null,
    onInitialDataCb: null,
    onRemoteUpdateCb: null,
    getLocalDataCb: null
  };

  let rtdb = null;
  let schoolDbRef = null;

  // ==========================================================================
  // 2. LOCAL-FIRST PENDING SYNC QUEUE MANAGEMENT
  // ==========================================================================

  function getPendingQueue() {
    try {
      const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[FirebaseSync] Error parsing pending queue:', e);
      return [];
    }
  }

  function savePendingQueue(queue) {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('[FirebaseSync] Error saving pending queue:', e);
    }
  }

  function clearPendingQueue() {
    try {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch (e) {
      console.error('[FirebaseSync] Error clearing pending queue:', e);
    }
  }

  function hasPendingSync() {
    return getPendingQueue().length > 0;
  }

  function enqueuePendingUpdate(data) {
    if (!data) return;
    try {
      const queue = getPendingQueue();
      const now = Date.now();
      const nowIso = new Date().toISOString();

      const snapshot = JSON.parse(JSON.stringify(data));
      snapshot._syncMeta = snapshot._syncMeta || {};
      snapshot._syncMeta.lastUpdatedAt = nowIso;
      snapshot._syncMeta.clientApp = "banloung-school-app";
      snapshot._syncMeta.schoolName = "សាលាបឋមសិក្សា បាន្លួង";

      queue.push({
        id: "sync_" + now + "_" + Math.random().toString(36).substring(2, 7),
        timestamp: now,
        isoTime: nowIso,
        data: snapshot
      });

      // Keep up to 10 latest pending states to prevent localStorage quota issues
      if (queue.length > 10) {
        queue.splice(0, queue.length - 10);
      }

      savePendingQueue(queue);

      // If offline or disconnected, immediately update status UI
      if (!navigator.onLine || !syncState.isConnected) {
        updateSyncStatusUI('pending_sync', 'រក្សាទុកក្នុងម៉ាស៊ីន (រង់ចាំ Sync)');
      }
    } catch (e) {
      console.error('[FirebaseSync] Error enqueuing pending update:', e);
    }
  }

  // ==========================================================================
  // 3. INTELLIGENT CONFLICT-FREE MERGER FOR LOCAL-FIRST SYNC
  // ==========================================================================

  function mergeSchoolDatabases(localDb, cloudDb) {
    if (!localDb) return cloudDb || window.INITIAL_SCHOOL_DATA;
    if (!cloudDb) return localDb;

    const merged = JSON.parse(JSON.stringify(cloudDb));

    // Preserve local schoolInfo
    if (localDb.schoolInfo) {
      merged.schoolInfo = Object.assign({}, cloudDb.schoolInfo || {}, localDb.schoolInfo);
    }

    // Merge Classes
    merged.classes = merged.classes || [];
    const cloudClassMap = new Map();
    merged.classes.forEach(c => {
      const key = `${c.grade || ''}_${c.academicYear || ''}`;
      cloudClassMap.set(key, c);
    });

    if (Array.isArray(localDb.classes)) {
      localDb.classes.forEach(localCls => {
        const key = `${localCls.grade || ''}_${localCls.academicYear || ''}`;
        const cloudCls = cloudClassMap.get(key);

        if (!cloudCls) {
          merged.classes.push(JSON.parse(JSON.stringify(localCls)));
        } else {
          // If local has students, keep local students and student scores
          if (Array.isArray(localCls.students) && localCls.students.length > 0) {
            cloudCls.students = JSON.parse(JSON.stringify(localCls.students));
          }

          // Merge monthly scores: local overrides for months edited offline
          if (localCls.monthlyScores) {
            cloudCls.monthlyScores = cloudCls.monthlyScores || {};
            Object.keys(localCls.monthlyScores).forEach(m => {
              cloudCls.monthlyScores[m] = Object.assign({}, cloudCls.monthlyScores[m] || {}, localCls.monthlyScores[m]);
            });
          }

          // Merge attendance records
          if (localCls.attendanceRecords) {
            cloudCls.attendanceRecords = cloudCls.attendanceRecords || {};
            Object.keys(localCls.attendanceRecords).forEach(d => {
              cloudCls.attendanceRecords[d] = Object.assign({}, cloudCls.attendanceRecords[d] || {}, localCls.attendanceRecords[d]);
            });
          }

          // Dates and signatures
          if (localCls.rankDates) cloudCls.rankDates = Object.assign({}, cloudCls.rankDates || {}, localCls.rankDates);
          if (localCls.scoreDates) cloudCls.scoreDates = Object.assign({}, cloudCls.scoreDates || {}, localCls.scoreDates);
          if (localCls.monthlyDates) cloudCls.monthlyDates = Object.assign({}, cloudCls.monthlyDates || {}, localCls.monthlyDates);
          if (localCls.clearedScores) cloudCls.clearedScores = Object.assign({}, cloudCls.clearedScores || {}, localCls.clearedScores);
        }
      });
    }

    // Merge Staff
    if (Array.isArray(localDb.staffList) && localDb.staffList.length > 0) {
      merged.staffList = JSON.parse(JSON.stringify(localDb.staffList));
    }

    // Merge Custom Passwords & Settings
    if (localDb.customPasswords) {
      merged.customPasswords = Object.assign({}, cloudDb.customPasswords || {}, localDb.customPasswords);
    }
    if (localDb.studyBookProfiles) {
      merged.studyBookProfiles = Object.assign({}, cloudDb.studyBookProfiles || {}, localDb.studyBookProfiles);
    }

    // Update metadata
    merged._syncMeta = {
      lastUpdatedAt: new Date().toISOString(),
      clientApp: "banloung-school-app",
      schoolName: "សាលាបឋមសិក្សា បាន្លួង",
      mergedAt: new Date().toISOString()
    };

    return (typeof window.normalizeSchoolDatabase === 'function')
      ? window.normalizeSchoolDatabase(merged)
      : merged;
  }

  // ==========================================================================
  // 4. FLUSH PENDING QUEUE TO FIREBASE (AUTO-RETRY ON RECONNECT)
  // ==========================================================================

  async function flushPendingQueue() {
    if (syncState.isFlushing) return;
    if (!hasPendingSync()) return;

    if (!navigator.onLine) {
      updateSyncStatusUI('pending_sync', 'រក្សាទុកក្នុងម៉ាស៊ីន (រង់ចាំ Sync)');
      return;
    }

    if (!syncState.initialized || !schoolDbRef) {
      const ok = initFirebase();
      if (!ok || !schoolDbRef) return;
    }

    const queue = getPendingQueue();
    if (!queue.length) return;

    syncState.isFlushing = true;
    updateSyncStatusUI('saving', 'កំពុង Sync ទិន្នន័យរង់ចាំ...');

    try {
      const latestPending = queue[queue.length - 1];
      const localData = latestPending.data;

      let finalDataToPush = localData;

      // Conflict check with current Cloud version (lightweight check first to save ~2 MB download)
      try {
        const snap = await schoolDbRef.child('_syncMeta').once('value');
        const cloudMeta = snap.val();
        if (cloudMeta && cloudMeta.lastUpdatedAt) {
          const cloudTime = new Date(cloudMeta.lastUpdatedAt).getTime();
          const localTime = latestPending.timestamp || new Date(localData._syncMeta?.lastUpdatedAt || 0).getTime();

          if (cloudTime > localTime) {
            console.log('[FirebaseSync] Cloud has changes made during offline period. Merging conflict-free...');
            const fullSnap = await schoolDbRef.once('value');
            const cloudVal = fullSnap.val();
            if (cloudVal) {
              finalDataToPush = mergeSchoolDatabases(localData, cloudVal);
            }
          }
        }
      } catch (readErr) {
        console.warn('[FirebaseSync] Could not read cloud for conflict check, using local pending:', readErr);
      }

      finalDataToPush._syncMeta = finalDataToPush._syncMeta || {};
      finalDataToPush._syncMeta.lastUpdatedAt = new Date().toISOString();
      finalDataToPush._syncMeta.clientApp = "banloung-school-app";
      finalDataToPush._syncMeta.schoolName = "សាលាបឋមសិក្សា បាន្លួង";

      syncState.isLocalChange = true;
      await schoolDbRef.set(finalDataToPush);

      // Successfully synced!
      clearPendingQueue();
      syncState.lastSyncTime = new Date();

      if (window.state) {
        window.state.db = finalDataToPush;
        try {
          localStorage.setItem("banloung_school_db", JSON.stringify(window.state.db));
        } catch(e) {}
      }

      updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');
      showSyncToast('✓ បានធ្វើសមកាលកម្មទិន្នន័យរង់ចាំទៅកាន់ Cloud ដោយជោគជ័យ!', 'success');

      if (typeof window.renderApp === 'function') {
        window.renderApp();
      }
    } catch (err) {
      console.error('[FirebaseSync] Error flushing pending queue:', err);
      // Keep queue in localStorage - NEVER delete local data
      updateSyncStatusUI('pending_sync', 'រក្សាទុកក្នុងម៉ាស៊ីន (រង់ចាំ Sync)');
    } finally {
      syncState.isFlushing = false;
    }
  }

  // ==========================================================================
  // 5. INITIALIZE FIREBASE APP & REALTIME DATABASE
  // ==========================================================================

  function initFirebase() {
    if (typeof firebase === 'undefined') {
      console.warn('[FirebaseSync] Firebase SDK is not loaded. Working in local offline mode.');
      if (hasPendingSync()) {
        updateSyncStatusUI('pending_sync', 'រក្សាទុកក្នុងម៉ាស៊ីន (រង់ចាំ Sync)');
      } else {
        updateSyncStatusUI('offline', 'ប្រើប្រាស់ក្នុងម៉ាស៊ីន (Offline)');
      }
      return false;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      rtdb = firebase.database();
      schoolDbRef = rtdb.ref('banloung_school_db');
      syncState.initialized = true;

      // Monitor online/offline connection state via .info/connected
      const connectedRef = rtdb.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        syncState.isConnected = !!snap.val();
        if (syncState.isConnected) {
          if (syncState.rulesRequired) {
            updateSyncStatusUI('rules_required', 'Cloud: រង់ចាំបើក Rules');
          } else if (hasPendingSync()) {
            flushPendingQueue();
          } else if (syncState.isVerifiedOnline && !syncState.isSyncing && !syncState.isFlushing) {
            updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Online)');
          }
        } else {
          if (hasPendingSync()) {
            updateSyncStatusUI('pending_sync', 'រក្សាទុកក្នុងម៉ាស៊ីន (រង់ចាំ Sync)');
          } else {
            updateSyncStatusUI('offline', 'ប្រើប្រាស់ក្នុងម៉ាស៊ីន (Offline)');
          }
        }
      });

      return true;
    } catch (err) {
      console.error('[FirebaseSync] Error initializing Firebase:', err);
      if (hasPendingSync()) {
        updateSyncStatusUI('pending_sync', 'រក្សាទុកក្នុងម៉ាស៊ីន (រង់ចាំ Sync)');
      } else {
        updateSyncStatusUI('offline', 'Offline (Firebase Error)');
      }
      return false;
    }
  }

  // Window Online / Offline Events
  window.addEventListener('online', () => {
    console.log('[FirebaseSync] Window event: online. Checking pending queue...');
    if (hasPendingSync()) {
      flushPendingQueue();
    } else if (syncState.isConnected) {
      updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');
    }
  });

  window.addEventListener('offline', () => {
    console.log('[FirebaseSync] Window event: offline.');
    if (hasPendingSync()) {
      updateSyncStatusUI('pending_sync', 'រក្សាទុកក្នុងម៉ាស៊ីន (រង់ចាំ Sync)');
    } else {
      updateSyncStatusUI('offline', 'ប្រើប្រាស់ក្នុងម៉ាស៊ីន (Offline)');
    }
  });

  // ==========================================================================
  // 6. UPDATE STATUS BADGE UI IN TOP BAR
  // ==========================================================================

  function updateSyncStatusUI(status, labelText) {
    const badge = document.getElementById('cloudSyncBadge');
    const label = document.getElementById('cloudSyncText');
    const icon = document.getElementById('cloudSyncIcon');

    if (!badge || !label || !icon) return;

    badge.className = 'cloud-sync-badge ' + status;
    label.textContent = labelText || '';

    if (status === 'synced') {
      icon.className = 'fa-solid fa-cloud-check text-success';
      badge.title = 'បានតភ្ជាប់ទៅកាន់ Firebase Cloud Database (ទិន្នន័យត្រូវបានសមកាលកម្មរួចរាល់)';
    } else if (status === 'saving') {
      icon.className = 'fa-solid fa-cloud-arrow-up fa-fade text-warning';
      badge.title = 'កំពុងរក្សាទុកទិន្នន័យទៅកាន់ Firebase Cloud Database...';
    } else if (status === 'loading') {
      icon.className = 'fa-solid fa-cloud-arrow-down fa-bounce text-primary';
      badge.title = 'កំពុងទាញយកទិន្នន័យពី Firebase Cloud Database...';
    } else if (status === 'rules_required') {
      icon.className = 'fa-solid fa-triangle-exclamation text-warning';
      badge.title = 'Firebase Realtime Database ត្រូវការបើក Security Rules ក្នុង Firebase Console';
    } else if (status === 'pending_sync') {
      icon.className = 'fa-solid fa-cloud-arrow-up text-warning';
      badge.title = 'ទិន្នន័យត្រូវបានរក្សាទុកក្នុងម៉ាស៊ីន (LocalStorage) រួចរាល់។ កំពុងរង់ចាំ Sync ទៅកាន់ Cloud ពេលមាន Internet';
    } else {
      icon.className = 'fa-solid fa-cloud-slash text-secondary';
      badge.title = 'ដំណើរការក្នុងម៉ាស៊ីន LocalStorage (Offline Mode)';
    }
  }

  // Show Toast Message
  function showSyncToast(message, type = 'info') {
    if (typeof Swal !== 'undefined') {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true
      });
      Toast.fire({
        icon: type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success',
        title: message
      });
      return;
    }

    // Fallback lightweight toast
    let toastContainer = document.getElementById('schoolSyncToastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'schoolSyncToastContainer';
      toastContainer.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    const bgColor = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981';
    toast.style.cssText = `background:${bgColor};color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-family:'Kantumruy Pro',sans-serif;box-shadow:0 4px 15px rgba(0,0,0,0.15);pointer-events:auto;transition:all 0.3s ease;`;
    toast.innerHTML = `<i class="fa-solid fa-cloud"></i> ${message}`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ==========================================================================
  // 7. INITIALIZE SYNCHRONIZATION WITH CALLBACKS (LOCAL CACHE FIRST)
  // ==========================================================================

  async function fetchFullFromCloud(isInitial = false) {
    if (!schoolDbRef) return;
    syncState.isSyncing = true;
    updateSyncStatusUI('loading', 'កំពុងទាញទិន្នន័យ...');

    try {
      const snapshot = await schoolDbRef.once('value');
      syncState.rulesRequired = false;
      syncState.isVerifiedOnline = true;

      if (hasPendingSync()) {
        console.log('[FirebaseSync] Local has pending offline changes. Flushing to Cloud...');
        await flushPendingQueue();
        return;
      }

      const rawCloudData = snapshot.val();
      const cloudData = (typeof window.normalizeSchoolDatabase === 'function')
        ? window.normalizeSchoolDatabase(rawCloudData)
        : rawCloudData;

      const totalCloudStudents = (cloudData && cloudData.classes && Array.isArray(cloudData.classes))
        ? cloudData.classes.reduce((sum, c) => sum + (c.students ? c.students.length : 0), 0)
        : 0;

      // Case 1: Realtime Database is empty or has 0 students -> Safe auto-seed
      if (!snapshot.exists() || !cloudData || !cloudData.classes || totalCloudStudents === 0) {
        console.log('[FirebaseSync] Cloud Database is empty or has 0 students. Seeding initial data...');
        const initialToSeed = (typeof syncState.getLocalDataCb === 'function' ? syncState.getLocalDataCb() : null) || window.INITIAL_SCHOOL_DATA;

        if (initialToSeed && initialToSeed.classes && initialToSeed.classes.length > 0) {
          await importLocalDatabaseToCloud(true, initialToSeed);
          updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');
          showSyncToast('បាននាំចូលទិន្នន័យដើមទៅកាន់ Cloud ដោយជោគជ័យ!', 'success');
          if (typeof syncState.onInitialDataCb === 'function') {
            syncState.onInitialDataCb(initialToSeed);
          }
        } else {
          updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (ទទេ)');
        }
      } else {
        // Case 2: Cloud has active data
        console.log('[FirebaseSync] Cloud data loaded successfully! Classes:', cloudData.classes.length, 'Students:', totalCloudStudents);
        syncState.lastSyncTime = new Date();
        updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');

        const localData = (typeof syncState.getLocalDataCb === 'function' ? syncState.getLocalDataCb() : null) || (window.state && window.state.db);
        const merged = mergeSchoolDatabases(localData, cloudData);

        if (window.state) {
          window.state.db = merged;
          try {
            localStorage.setItem("banloung_school_db", JSON.stringify(window.state.db));
          } catch(e) {}
        }

        if (typeof syncState.onInitialDataCb === 'function') {
          syncState.onInitialDataCb(merged);
        } else if (typeof window.renderApp === 'function') {
          window.renderApp();
        }
      }
    } catch (err) {
      console.warn('[FirebaseSync] fetchFullFromCloud error:', err);
      if (err.code === 'PERMISSION_DENIED' || (err.message && err.message.includes('permission_denied'))) {
        syncState.rulesRequired = true;
        updateSyncStatusUI('rules_required', 'Cloud: រង់ចាំបើក Rules');
      } else {
        if (hasPendingSync()) {
          updateSyncStatusUI('pending_sync', 'រក្សាទុកក្នុងម៉ាស៊ីន (រង់ចាំ Sync)');
        } else {
          updateSyncStatusUI('offline', 'ប្រើប្រាស់ក្នុងម៉ាស៊ីន (Offline)');
        }
      }
    } finally {
      syncState.isSyncing = false;
    }
  }

  // Fetch only a single updated class node (~100 KB instead of 2 MB)
  async function fetchSingleClassFromCloud(classIndex, meta) {
    if (!schoolDbRef || typeof classIndex !== 'number' || classIndex < 0) return;
    try {
      console.log('[FirebaseSync] Fetching single class update for index:', classIndex);
      const snap = await schoolDbRef.child('classes/' + classIndex).once('value');
      const cloudClass = snap.val();
      if (!cloudClass) return;

      if (window.state && window.state.db && Array.isArray(window.state.db.classes)) {
        if (hasPendingSync()) {
          console.log('[FirebaseSync] Local has pending edits. Preserving local edits.');
          return;
        }

        window.state.db.classes[classIndex] = cloudClass;
        window.state.db._syncMeta = meta;

        try {
          localStorage.setItem("banloung_school_db", JSON.stringify(window.state.db));
        } catch (e) {}

        syncState.lastSyncTime = new Date();
        updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');

        const activeEl = document.activeElement;
        const isTyping = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
        if (!isTyping && typeof window.renderApp === 'function') {
          window.renderApp();
        }
      }
    } catch (err) {
      console.warn('[FirebaseSync] Error fetching single class update:', err);
    }
  }

  async function initSync(options) {
    options = options || {};
    syncState.onInitialDataCb = options.onInitialData || null;
    syncState.onRemoteUpdateCb = options.onRemoteUpdate || null;
    syncState.getLocalDataCb = options.getLocalData || null;

    // Check if there are un-synced edits waiting in local storage
    if (hasPendingSync()) {
      updateSyncStatusUI('pending_sync', 'រក្សាទុកក្នុងម៉ាស៊ីន (រង់ចាំ Sync)');
    }

    if (!initFirebase()) return;

    // 1. Check local cache (Local-First Guarantee)
    const localData = (typeof syncState.getLocalDataCb === 'function')
      ? syncState.getLocalDataCb()
      : (window.state && window.state.db);

    const hasLocalStudents = (localData && Array.isArray(localData.classes))
      ? localData.classes.reduce((sum, c) => sum + (c.students ? c.students.length : 0), 0) > 0
      : false;

    if (hasLocalStudents) {
      // Show Synced/Connected immediately without waiting for network!
      syncState.isVerifiedOnline = true;
      updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');

      // If local has pending offline edits on startup, flush them
      if (hasPendingSync()) {
        console.log('[FirebaseSync] Local has pending offline changes on startup. Flushing to Cloud...');
        await flushPendingQueue();
        attachMetaListener();
        return;
      }

      // Ultra-lightweight timestamp check (~50 bytes instead of 2 MB!)
      try {
        const snap = await schoolDbRef.child('_syncMeta/lastUpdatedAt').once('value');
        const cloudTimeStr = snap.val();

        if (cloudTimeStr) {
          const cloudTime = new Date(cloudTimeStr).getTime();
          const localTime = new Date(localData._syncMeta?.lastUpdatedAt || 0).getTime();

          if (cloudTime > localTime) {
            console.log('[FirebaseSync] Cloud has newer data updated at', cloudTimeStr, 'vs local', localData._syncMeta?.lastUpdatedAt, '. Syncing update...');
            await fetchFullFromCloud(false);
          } else {
            console.log('[FirebaseSync] Local cache is up to date with Cloud. Zero download required! (Saved ~2 MB)');
            syncState.lastSyncTime = new Date();
            updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');
          }
        } else {
          // Cloud has no timestamp, check if cloud has data
          const cloudMetaSnap = await schoolDbRef.child('_syncMeta').once('value');
          if (!cloudMetaSnap.exists()) {
            console.log('[FirebaseSync] Cloud meta missing. Checking and seeding initial data...');
            await fetchFullFromCloud(false);
          }
        }
      } catch (err) {
        console.warn('[FirebaseSync] Timestamp check warning:', err);
        if (err.code === 'PERMISSION_DENIED' || (err.message && err.message.includes('permission_denied'))) {
          syncState.rulesRequired = true;
          updateSyncStatusUI('rules_required', 'Cloud: រង់ចាំបើក Rules');
        }
      }

      // Attach lightweight listener for remote changes (listens ONLY to _syncMeta)
      attachMetaListener();
    } else {
      // First time launch on new device (no local cache in localStorage)
      console.log('[FirebaseSync] First time launch (no local cache). Fetching initial data from Cloud...');
      updateSyncStatusUI('loading', 'កំពុងទាញទិន្នន័យ...');
      await fetchFullFromCloud(true);
      attachMetaListener();
    }
  }

  // ==========================================================================
  // 8. ATTACH LIGHTWEIGHT METADATA LISTENER (LISTENS ONLY TO _syncMeta, NOT 2MB ROOT)
  // ==========================================================================

  function attachMetaListener() {
    if (!schoolDbRef) return;

    // Detach any previous full-root listener to stop downloading 2MB on every change!
    schoolDbRef.off('value');

    const metaRef = schoolDbRef.child('_syncMeta');
    metaRef.off('value');

    metaRef.on('value', (snap) => {
      // Ignore if change was triggered locally
      if (syncState.isLocalChange) {
        syncState.isLocalChange = false;
        return;
      }

      if (hasPendingSync()) {
        console.log('[FirebaseSync] Remote update arrived while local has un-synced edits. Preserving local edits.');
        return;
      }

      const meta = snap.val();
      if (!meta || !meta.lastUpdatedAt) return;

      const localData = (typeof syncState.getLocalDataCb === 'function')
        ? syncState.getLocalDataCb()
        : (window.state && window.state.db);
      const localTime = new Date(localData?._syncMeta?.lastUpdatedAt || 0).getTime();
      const remoteTime = new Date(meta.lastUpdatedAt).getTime();

      if (remoteTime > localTime) {
        console.log('[FirebaseSync] Remote change notification received via _syncMeta. Updated class:', meta.updatedClassId);
        syncState.lastSyncTime = new Date();
        updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');

        // Granular: fetch only the changed class if known
        if (typeof meta.updatedClassIndex === 'number' && meta.updatedClassIndex >= 0) {
          fetchSingleClassFromCloud(meta.updatedClassIndex, meta);
        } else {
          // Fallback: fetch full cloud data
          fetchFullFromCloud(false);
        }
      }
    }, (err) => {
      console.warn('[FirebaseSync] Meta listener error:', err);
      if (err.code === 'PERMISSION_DENIED') {
        syncState.rulesRequired = true;
        updateSyncStatusUI('rules_required', 'Cloud: រង់ចាំបើក Rules');
      }
    });
  }

  // Alias for backward compatibility
  function attachRealtimeListener() {
    attachMetaListener();
  }

  // ==========================================================================
  // 9. SAVE APPLICATION STATE TO CLOUD (GRANULAR & DEBOUNCED)
  // ==========================================================================

  function saveToCloud(data, immediate = false, changedClassId = null) {
    if (!data) return;

    // Enqueue to Pending Sync Queue immediately (Local-First Guarantee)
    enqueuePendingUpdate(data);

    // If offline, do NOT attempt network call - local is already safe
    if (!navigator.onLine || !syncState.isConnected || !syncState.initialized || !schoolDbRef) {
      updateSyncStatusUI('pending_sync', 'រក្សាទុកក្នុងម៉ាស៊ីន (រង់ចាំ Sync)');
      return;
    }

    if (syncState.saveDebounceTimer) {
      clearTimeout(syncState.saveDebounceTimer);
      syncState.saveDebounceTimer = null;
    }

    updateSyncStatusUI('saving', 'កំពុងរក្សាទុក...');

    const doSave = async () => {
      syncState.isSyncing = true;
      syncState.isLocalChange = true;

      const nowIso = new Date().toISOString();

      try {
        // Granular saving: If only a specific class was edited, push only that class node!
        let classIndex = -1;
        if (changedClassId && Array.isArray(data.classes)) {
          classIndex = data.classes.findIndex(c => c.id === changedClassId || c.grade === changedClassId);
        }

        if (classIndex >= 0) {
          // ULTRA-EFFICIENT GRANULAR UPDATE (~100 KB instead of 2 MB!)
          const syncMeta = {
            lastUpdatedAt: nowIso,
            clientApp: "banloung-school-app",
            schoolName: "សាលាបឋមសិក្សា បាន្លួង",
            updatedClassId: changedClassId,
            updatedClassIndex: classIndex
          };
          const updates = {};
          updates['classes/' + classIndex] = data.classes[classIndex];
          updates['_syncMeta'] = syncMeta;

          await schoolDbRef.update(updates);
          console.log('[FirebaseSync] Granular update saved successfully for class index:', classIndex);
        } else {
          // Full database update (e.g. settings, import, all classes)
          const payload = Object.assign({}, data, {
            _syncMeta: {
              lastUpdatedAt: nowIso,
              clientApp: "banloung-school-app",
              schoolName: "សាលាបឋមសិក្សា បាន្លួង"
            }
          });
          await schoolDbRef.set(payload);
          console.log('[FirebaseSync] Full database saved to Cloud.');
        }

        syncState.isSyncing = false;
        syncState.lastSyncTime = new Date();
        clearPendingQueue(); // Successfully sent to cloud!
        updateSyncStatusUI('synced', 'Cloud: បានរក្សាទុក (Synced)');

        // Reset badge text back to Synced after 2 seconds
        setTimeout(() => {
          if (!syncState.isSyncing && !hasPendingSync()) {
            updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');
          }
        }, 2000);
      } catch (err) {
        syncState.isSyncing = false;
        console.warn('[FirebaseSync] Error saving to Cloud, keeping in local pending queue:', err);
        if (err.code === 'PERMISSION_DENIED') {
          syncState.rulesRequired = true;
          updateSyncStatusUI('rules_required', 'Cloud: រង់ចាំបើក Rules');
        } else {
          updateSyncStatusUI('pending_sync', 'រក្សាទុកក្នុងម៉ាស៊ីន (រង់ចាំ Sync)');
        }
      }
    };

    if (immediate) {
      doSave();
    } else {
      syncState.saveDebounceTimer = setTimeout(doSave, 400);
    }
  }

  // ==========================================================================
  // 10. SAFE IMPORT OF INITIAL DATA
  // ==========================================================================

  async function importLocalDatabaseToCloud(force = false, dataToUse = null) {
    if (!syncState.initialized || !schoolDbRef) {
      throw new Error('Firebase Database is not initialized');
    }

    updateSyncStatusUI('loading', 'កំពុងនាំចូលទិន្នន័យ...');

    if (!force) {
      const snap = await schoolDbRef.child('classes/0').once('value');
      const existing = snap.val();
      if (snap.exists() && existing) {
        console.log('[FirebaseSync] Cloud already contains active database. Skipping duplicate import.');
        updateSyncStatusUI('synced', 'Cloud: មានទិន្នន័យស្រាប់');
        return false;
      }
    }

    const data = dataToUse || (typeof syncState.getLocalDataCb === 'function' ? syncState.getLocalDataCb() : null) || window.INITIAL_SCHOOL_DATA;
    if (!data) {
      throw new Error('No local data available to import');
    }

    const payload = Object.assign({}, data, {
      _syncMeta: {
        lastUpdatedAt: new Date().toISOString(),
        importedAt: new Date().toISOString(),
        clientApp: "banloung-school-app",
        schoolName: "សាលាបឋមសិក្សា បាន្លួង"
      }
    });

    syncState.isLocalChange = true;
    await schoolDbRef.set(payload);
    clearPendingQueue();
    syncState.lastSyncTime = new Date();
    updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');
    return true;
  }

  // ==========================================================================
  // 10.1 MANUAL REFRESH FROM CLOUD (FOR MANUAL REFRESH BUTTON)
  // ==========================================================================

  async function refreshFromCloud(manualTrigger = true) {
    const refreshBtn = document.getElementById('btnManualCloudRefresh');
    const refreshIcon = document.getElementById('cloudRefreshIcon');

    if (refreshIcon) refreshIcon.classList.add('fa-spin');
    if (refreshBtn) refreshBtn.classList.add('is-refreshing');

    if (!navigator.onLine || !syncState.isConnected || !schoolDbRef) {
      if (refreshIcon) refreshIcon.classList.remove('fa-spin');
      if (refreshBtn) refreshBtn.classList.remove('is-refreshing');
      showSyncToast('មិនអាចទាញទិន្នន័យបានទេ ដោយសារគ្មានអ៊ីនធឺណិត (Offline)', 'warning');
      return;
    }

    updateSyncStatusUI('loading', 'កំពុងទាញទិន្នន័យ...');

    try {
      // 1. Flush any pending offline edits first
      if (hasPendingSync()) {
        await flushPendingQueue();
      }

      // 2. Fetch latest snapshot from Cloud
      const snap = await schoolDbRef.once('value');
      const rawCloudData = snap.val();

      if (!rawCloudData) {
        showSyncToast('Cloud មិនទាន់មានទិន្នន័យនៅឡើយទេ', 'info');
        updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់');
        return;
      }

      const cloudData = (typeof window.normalizeSchoolDatabase === 'function')
        ? window.normalizeSchoolDatabase(rawCloudData)
        : rawCloudData;

      const localData = (typeof syncState.getLocalDataCb === 'function')
        ? syncState.getLocalDataCb()
        : (window.state && window.state.db);

      const merged = mergeSchoolDatabases(localData, cloudData);

      if (window.state) {
        window.state.db = merged;
        try {
          localStorage.setItem("banloung_school_db", JSON.stringify(window.state.db));
        } catch (e) {}
      }

      syncState.lastSyncTime = new Date();
      updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');

      if (typeof window.renderApp === 'function') {
        window.renderApp();
      }

      if (manualTrigger) {
        showSyncToast('✓ បានទាញយក និងធ្វើបច្ចុប្បន្នភាពទិន្នន័យថ្មីពី Cloud រួចរាល់!', 'success');
      }
    } catch (err) {
      console.error('[FirebaseSync] Manual refresh error:', err);
      showSyncToast('បរាជ័យក្នុងការទាញទិន្នន័យពី Cloud: ' + err.message, 'error');
      updateSyncStatusUI('offline', 'ទាញទិន្នន័យបរាជ័យ');
    } finally {
      if (refreshIcon) refreshIcon.classList.remove('fa-spin');
      if (refreshBtn) refreshBtn.classList.remove('is-refreshing');
    }
  }

  // ==========================================================================
  // 11. OPEN CLOUD SYNC MANAGEMENT DIALOG
  // ==========================================================================

  function openCloudSyncModal() {
    const isOnline = navigator.onLine && syncState.isConnected;
    const rulesReq = syncState.rulesRequired;
    const pendingQueue = getPendingQueue();
    const pendingCount = pendingQueue.length;
    const hasPending = pendingCount > 0;

    const lastSyncStr = syncState.lastSyncTime
      ? syncState.lastSyncTime.toLocaleTimeString('km-KH')
      : 'មិនទាន់មាន';

    const currentClassesCount = (window.state && window.state.db && window.state.db.classes)
      ? window.state.db.classes.length
      : (window.INITIAL_SCHOOL_DATA && window.INITIAL_SCHOOL_DATA.classes ? window.INITIAL_SCHOOL_DATA.classes.length : 0);

    const totalStudentsCount = (window.state && window.state.db && window.state.db.classes)
      ? window.state.db.classes.reduce((sum, c) => sum + (c.students ? c.students.length : 0), 0)
      : 230;

    let statusHtml = '';
    if (rulesReq) {
      statusHtml = `
        <div class="alert alert-warning text-start" style="font-size:13px;line-height:1.6;border-radius:8px;">
          <i class="fa-solid fa-triangle-exclamation text-warning me-2"></i>
          <strong>Firebase Realtime Database ត្រូវការបើកសិទ្ធិ (Rules)៖</strong><br>
          សូមចូលទៅកាន់ <strong>Firebase Console</strong> &gt; <strong>Realtime Database</strong> &gt; ផ្ទាំង <strong>Rules</strong> ហើយកំណត់៖<br>
          <pre style="background:#1e293b;color:#f8fafc;padding:8px;border-radius:6px;margin:6px 0;font-size:12px;">{
  "rules": {
    ".read": true,
    ".write": true
  }
}</pre>
          រួចចុច <strong>Publish</strong>។ បន្ទាប់មកចុចប៊ូតុង <strong>«ទាញយកទិន្នន័យពី Cloud ឡើងវិញ»</strong> ខាងក្រោម។
        </div>
      `;
    } else if (hasPending) {
      statusHtml = `
        <div class="alert alert-warning text-start" style="font-size:13px;line-height:1.5;border-radius:8px;">
          <i class="fa-solid fa-cloud-arrow-up text-warning me-2"></i>
          <strong>ទិន្នន័យមានសុវត្ថិភាពក្នុងម៉ាស៊ីន (រង់ចាំ Sync ៖ ${pendingCount} កំណែ)</strong><br>
          រាល់ការបញ្ចូល ឬកែប្រែទិន្នន័យត្រូវបានរក្សាទុកក្នុង LocalStorage ភ្លាមៗ (Local-First)។<br>
          ${isOnline ? 'ប្រព័ន្ធកំពុងព្យាយាម Sync ទៅកាន់ Cloud...' : 'ប្រព័ន្ធនឹងធ្វើសមកាលកម្មទៅកាន់ Firebase Cloud ដោយស្វ័យប្រវត្តិភ្លាមៗពេលមាន Internet ឡើងវិញ។'}
        </div>
      `;
    } else if (isOnline) {
      statusHtml = `
        <div class="alert alert-success text-start" style="font-size:13px;line-height:1.5;border-radius:8px;">
          <i class="fa-solid fa-circle-check text-success me-2"></i>
          <strong>បានតភ្ជាប់ទៅកាន់ Firebase Realtime Database ដោយជោគជ័យ!</strong><br>
          ទិន្នន័យក្នុងម៉ាស៊ីន និង Cloud Realtime Database ត្រូវបានសមកាលកម្ម (Sync) រួចរាល់ ១០០%។
        </div>
      `;
    } else {
      statusHtml = `
        <div class="alert alert-secondary text-start" style="font-size:13px;line-height:1.5;border-radius:8px;">
          <i class="fa-solid fa-cloud-slash text-secondary me-2"></i>
          <strong>ដំណើរការក្នុងម៉ាស៊ីន (Offline Mode)៖</strong><br>
          ទិន្នន័យត្រូវបានរក្សាទុកក្នុង LocalStorage យ៉ាងមានសុវត្ថិភាព។ គ្រប់ការកែប្រែពេលគ្មាន Internet នឹងត្រូវបញ្ចូលទៅក្នុង Pending Queue ដោយស្វ័យប្រវត្តិ។
        </div>
      `;
    }

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: '<i class="fa-solid fa-cloud text-primary"></i> ស្ថានភាព Cloud Realtime Database (Local-First)',
        html: `
          <div style="font-family:'Kantumruy Pro',sans-serif;font-size:13.5px;color:#334155;">
            ${statusHtml}
            <table class="table table-sm table-bordered text-start mt-2" style="font-size:12.5px;">
              <tr>
                <td style="width:40%;background:#f8fafc;font-weight:600;">Cloud Project ID</td>
                <td><code>${firebaseConfig.projectId}</code></td>
              </tr>
              <tr>
                <td style="background:#f8fafc;font-weight:600;">ស្ថានភាពសមកាលកម្ម</td>
                <td>${hasPending ? '<span class="badge bg-warning text-dark">រង់ចាំ Sync (' + pendingCount + ')</span>' : (isOnline ? '<span class="badge bg-success">Online & Synced</span>' : '<span class="badge bg-secondary">Offline (Local-First)</span>')}</td>
              </tr>
              <tr>
                <td style="background:#f8fafc;font-weight:600;">សមកាលកម្មចុងក្រោយ</td>
                <td>${lastSyncStr}</td>
              </tr>
              <tr>
                <td style="background:#f8fafc;font-weight:600;">ទិន្នន័យសាលា</td>
                <td><strong>${currentClassesCount}</strong> ថ្នាក់រៀន (សិស្សសរុប <strong>${totalStudentsCount}</strong> នាក់)</td>
              </tr>
            </table>
          </div>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: hasPending ? '<i class="fa-solid fa-rotate"></i> Sync ទិន្នន័យរង់ចាំឥឡូវនេះ' : '<i class="fa-solid fa-rotate"></i> ទាញយកពី Cloud ឡើងវិញ',
        denyButtonText: '<i class="fa-solid fa-upload"></i> រក្សាទុកទិន្នន័យបច្ចុប្បន្នទៅ Cloud',
        cancelButtonText: 'បិទ',
        confirmButtonColor: '#2563eb',
        denyButtonColor: '#059669',
        footer: `
          <div class="text-center w-100">
            <button type="button" class="btn btn-outline-warning btn-sm" onclick="window.firebaseSync.triggerManualImport()" style="font-size:12px;">
              <i class="fa-solid fa-file-import"></i> នាំចូលទិន្នន័យដើម school_database.json ទៅកាន់ Cloud
            </button>
          </div>
        `
      }).then((result) => {
        if (result.isConfirmed) {
          if (hasPending) {
            flushPendingQueue();
          } else {
            // Manual sync from cloud
            refreshFromCloud(true);
          }
        } else if (result.isDenied) {
          // Manual upload current data to cloud
          if (window.state && window.state.db) {
            saveToCloud(window.state.db, true);
            showSyncToast('បានបញ្ជូនទិន្នន័យបច្ចុប្បន្នទៅកាន់ Cloud រួចរាល់!', 'success');
          }
        }
      });
    } else {
      alert(`Cloud Realtime Database (Local-First)\nស្ថានភាព៖ ${isOnline ? 'Online' : 'Offline'}\nURL: ${firebaseConfig.databaseURL}`);
    }
  }

  // Trigger Manual Import from school_database.json
  function triggerManualImport() {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'នាំចូលទិន្នន័យដើមទៅកាន់ Cloud?',
        text: 'តើលោកអ្នកពិតជាចង់នាំចូលទិន្នន័យដើម (school_database.json) ទៅកាន់ Firebase Realtime Database មែនទេ?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'យល់ព្រមនាំចូល',
        cancelButtonText: 'បោះបង់',
        confirmButtonColor: '#d97706'
      }).then((res) => {
        if (res.isConfirmed) {
          const initialData = window.INITIAL_SCHOOL_DATA || (window.state && window.state.db);
          importLocalDatabaseToCloud(true, initialData).then(() => {
            if (window.state && initialData) {
              window.state.db = initialData;
              localStorage.setItem("banloung_school_db", JSON.stringify(window.state.db));
              if (typeof window.renderActiveTab === 'function') window.renderActiveTab();
              if (typeof window.renderDashboard === 'function') window.renderDashboard();
            }
            Swal.fire({
              icon: 'success',
              title: 'ជោគជ័យ!',
              text: 'ទិន្នន័យដើមត្រូវបាននាំចូលទៅកាន់ Firebase Realtime Database រួចរាល់។'
            });
          }).catch(err => {
            Swal.fire({
              icon: 'error',
              title: 'មានបញ្ហា',
              text: 'មិនអាចនាំចូលទិន្នន័យបានទេ៖ ' + err.message
            });
          });
        }
      });
    }
  }

  // Expose to window
  window.firebaseSync = {
    config: firebaseConfig,
    state: syncState,
    initSync: initSync,
    saveToCloud: saveToCloud,
    enqueuePendingUpdate: enqueuePendingUpdate,
    getPendingQueue: getPendingQueue,
    clearPendingQueue: clearPendingQueue,
    hasPendingSync: hasPendingSync,
    flushPendingQueue: flushPendingQueue,
    mergeSchoolDatabases: mergeSchoolDatabases,
    importLocalDatabaseToCloud: importLocalDatabaseToCloud,
    refreshFromCloud: refreshFromCloud,
    openCloudSyncModal: openCloudSyncModal,
    triggerManualImport: triggerManualImport,
    updateSyncStatusUI: updateSyncStatusUI
  };

  // Immediate check on script load
  if (hasPendingSync()) {
    updateSyncStatusUI('pending_sync', 'រក្សាទុកក្នុងម៉ាស៊ីន (រង់ចាំ Sync)');
  }

})();
