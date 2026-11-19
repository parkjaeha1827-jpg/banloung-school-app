/**
 * ==========================================================================
 * BANLOUNG PRIMARY SCHOOL APP - FIREBASE REALTIME DATABASE SYNC MANAGER
 * គ្រប់គ្រងការតភ្ជាប់ និងសមកាលកម្មទិន្នន័យជាមួយ Firebase Realtime Database
 * ==========================================================================
 */

(function () {
  'use strict';

  // 1. Firebase Configuration (Provided by User)
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

  // State
  const syncState = {
    initialized: false,
    isConnected: false,
    isSyncing: false,
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

  // Initialize Firebase App & Realtime Database
  function initFirebase() {
    if (typeof firebase === 'undefined') {
      console.warn('[FirebaseSync] Firebase SDK is not loaded. Working in local offline mode.');
      updateSyncStatusUI('offline', 'ប្រើប្រាស់ក្នុងម៉ាស៊ីន (Offline)');
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
          if (!syncState.rulesRequired && !syncState.isSyncing) {
            updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Online)');
          }
        } else {
          updateSyncStatusUI('offline', 'ប្រើប្រាស់ក្នុងម៉ាស៊ីន (Offline)');
        }
      });

      return true;
    } catch (err) {
      console.error('[FirebaseSync] Error initializing Firebase:', err);
      updateSyncStatusUI('offline', 'Offline (Firebase Error)');
      return false;
    }
  }

  // Update Status Badge UI in Top Bar
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

  // Initialize Synchronization with Callbacks
  function initSync(options) {
    options = options || {};
    syncState.onInitialDataCb = options.onInitialData || null;
    syncState.onRemoteUpdateCb = options.onRemoteUpdate || null;
    syncState.getLocalDataCb = options.getLocalData || null;

    if (!initFirebase()) return;

    updateSyncStatusUI('loading', 'កំពុងទាញទិន្នន័យ...');

    // Read initial data from Firebase Realtime Database
    schoolDbRef.once('value').then((snapshot) => {
      syncState.rulesRequired = false;
      const cloudData = snapshot.val();

      // Case 1: Database is empty -> Safe Auto-import initial data
      if (!snapshot.exists() || !cloudData || !cloudData.classes || cloudData.classes.length === 0) {
        console.log('[FirebaseSync] Realtime Database is empty. Seeding initial data safely...');
        const initialToSeed = (typeof syncState.getLocalDataCb === 'function' ? syncState.getLocalDataCb() : null) || window.INITIAL_SCHOOL_DATA;

        if (initialToSeed && initialToSeed.classes && initialToSeed.classes.length > 0) {
          importLocalDatabaseToCloud(false, initialToSeed).then(() => {
            updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');
            showSyncToast('បាននាំចូលទិន្នន័យដើមទៅកាន់ Cloud ដោយជោគជ័យ!', 'success');
          }).catch(err => {
            console.error('[FirebaseSync] Seeding error:', err);
            updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់');
          });
        } else {
          updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (ទទេ)');
        }
      } else {
        // Case 2: Database has existing data -> Provide to application
        console.log('[FirebaseSync] Cloud data loaded successfully! Records:', cloudData.classes ? cloudData.classes.length : 0);
        syncState.lastSyncTime = new Date();
        updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');
        showSyncToast('ទិន្នន័យត្រូវបានទាញយកពី Cloud ដោយជោគជ័យ!', 'success');

        if (typeof syncState.onInitialDataCb === 'function') {
          syncState.onInitialDataCb(cloudData);
        }
      }

      // Start listening for real-time live updates from other computers
      attachRealtimeListener();

    }).catch((err) => {
      console.warn('[FirebaseSync] Once value error:', err);
      if (err.code === 'PERMISSION_DENIED' || (err.message && err.message.includes('permission_denied'))) {
        syncState.rulesRequired = true;
        updateSyncStatusUI('rules_required', 'Cloud: រង់ចាំបើក Rules');
        console.info('[FirebaseSync] To enable Cloud sync, please set .read: true, .write: true in Firebase Console Rules tab.');
      } else {
        updateSyncStatusUI('offline', 'ប្រើប្រាស់ក្នុងម៉ាស៊ីន (Offline)');
      }
    });
  }

  // Attach Realtime Listener (on 'value')
  function attachRealtimeListener() {
    if (!schoolDbRef) return;

    schoolDbRef.on('value', (snapshot) => {
      // If the change came from our own local saveDatabase call, ignore to avoid re-render loops
      if (syncState.isLocalChange) {
        syncState.isLocalChange = false;
        return;
      }

      const remoteData = snapshot.val();
      if (!remoteData) return;

      console.log('[FirebaseSync] Realtime update received from Cloud!');
      syncState.lastSyncTime = new Date();
      updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');

      if (typeof syncState.onRemoteUpdateCb === 'function') {
        syncState.onRemoteUpdateCb(remoteData);
      }
    }, (err) => {
      console.warn('[FirebaseSync] Realtime listener error:', err);
      if (err.code === 'PERMISSION_DENIED') {
        syncState.rulesRequired = true;
        updateSyncStatusUI('rules_required', 'Cloud: រង់ចាំបើក Rules');
      }
    });
  }

  // Save Application State to Cloud (Debounced)
  function saveToCloud(data, immediate = false) {
    if (!syncState.initialized || !schoolDbRef) return;

    if (syncState.saveDebounceTimer) {
      clearTimeout(syncState.saveDebounceTimer);
      syncState.saveDebounceTimer = null;
    }

    updateSyncStatusUI('saving', 'កំពុងរក្សាទុក...');

    const doSave = () => {
      if (!data) return;

      syncState.isSyncing = true;
      syncState.isLocalChange = true;

      // Add sync metadata
      const payload = Object.assign({}, data, {
        _syncMeta: {
          lastUpdatedAt: new Date().toISOString(),
          clientApp: "banloung-school-app",
          schoolName: "សាលាបឋមសិក្សា បាន្លួង"
        }
      });

      schoolDbRef.set(payload).then(() => {
        syncState.isSyncing = false;
        syncState.lastSyncTime = new Date();
        updateSyncStatusUI('synced', 'Cloud: បានរក្សាទុក');

        // Reset badge text back to Synced after 2 seconds
        setTimeout(() => {
          if (!syncState.isSyncing) {
            updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');
          }
        }, 2000);
      }).catch((err) => {
        syncState.isSyncing = false;
        console.error('[FirebaseSync] Error saving to Cloud:', err);
        if (err.code === 'PERMISSION_DENIED') {
          syncState.rulesRequired = true;
          updateSyncStatusUI('rules_required', 'Cloud: រង់ចាំបើក Rules');
        } else {
          updateSyncStatusUI('offline', 'Offline (Save Error)');
        }
      });
    };

    if (immediate) {
      doSave();
    } else {
      syncState.saveDebounceTimer = setTimeout(doSave, 400);
    }
  }

  // Safe Import of Initial Data (from school_database.json / INITIAL_SCHOOL_DATA)
  async function importLocalDatabaseToCloud(force = false, dataToUse = null) {
    if (!syncState.initialized || !schoolDbRef) {
      throw new Error('Firebase Database is not initialized');
    }

    updateSyncStatusUI('loading', 'កំពុងនាំចូលទិន្នន័យ...');

    if (!force) {
      const snap = await schoolDbRef.once('value');
      const existing = snap.val();
      if (snap.exists() && existing && existing.classes && existing.classes.length > 0) {
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
    syncState.lastSyncTime = new Date();
    updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');
    return true;
  }

  // Open Cloud Sync Management Dialog
  function openCloudSyncModal() {
    const isOnline = syncState.isConnected;
    const rulesReq = syncState.rulesRequired;
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
    } else if (isOnline) {
      statusHtml = `
        <div class="alert alert-success text-start" style="font-size:13px;line-height:1.5;border-radius:8px;">
          <i class="fa-solid fa-circle-check text-success me-2"></i>
          <strong>បានតភ្ជាប់ទៅកាន់ Firebase Realtime Database ដោយជោគជ័យ!</strong><br>
          គ្រប់ការកែប្រែទិន្នន័យនឹងត្រូវបានសមកាលកម្ម (Sync) ទៅកាន់គ្រប់កុំព្យូទ័រទាំងអស់ដោយស្វ័យប្រវត្តិ។
        </div>
      `;
    } else {
      statusHtml = `
        <div class="alert alert-secondary text-start" style="font-size:13px;line-height:1.5;border-radius:8px;">
          <i class="fa-solid fa-cloud-slash text-secondary me-2"></i>
          <strong>ដំណើរការក្នុងម៉ាស៊ីន (Offline Mode)៖</strong><br>
          ទិន្នន័យត្រូវបានរក្សាទុកក្នុង LocalStorage យ៉ាងមានសុវត្ថិភាព ហើយនឹងធ្វើសមកាលកម្មទៅ Cloud ពេលមានអ៊ីនធឺណិត។
        </div>
      `;
    }

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: '<i class="fa-solid fa-cloud text-primary"></i> ស្ថានភាព Cloud Realtime Database',
        html: `
          <div style="font-family:'Kantumruy Pro',sans-serif;font-size:13.5px;color:#334155;">
            ${statusHtml}
            <table class="table table-sm table-bordered text-start mt-2" style="font-size:12.5px;">
              <tr>
                <td style="width:40%;background:#f8fafc;font-weight:600;">Cloud Project ID</td>
                <td><code>${firebaseConfig.projectId}</code></td>
              </tr>
              <tr>
                <td style="background:#f8fafc;font-weight:600;">Database URL</td>
                <td style="word-break:break-all;font-size:11px;"><code>${firebaseConfig.databaseURL}</code></td>
              </tr>
              <tr>
                <td style="background:#f8fafc;font-weight:600;">ស្ថានភាពសមកាលកម្ម</td>
                <td>${isOnline ? '<span class="badge bg-success">Online & Synced</span>' : '<span class="badge bg-secondary">Offline</span>'}</td>
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
        confirmButtonText: '<i class="fa-solid fa-rotate"></i> ទាញយកពី Cloud ឡើងវិញ',
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
          // Manual sync from cloud
          updateSyncStatusUI('loading', 'កំពុងទាញទិន្នន័យ...');
          schoolDbRef.once('value').then((snap) => {
            const val = snap.val();
            if (val && window.state) {
              window.state.db = val;
              localStorage.setItem("banloung_school_db", JSON.stringify(window.state.db));
              if (typeof window.renderActiveTab === 'function') window.renderActiveTab();
              if (typeof window.renderDashboard === 'function') window.renderDashboard();
              showSyncToast('បានទាញយកទិន្នន័យចុងក្រោយពី Cloud រួចរាល់!', 'success');
              updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់ (Synced)');
            } else {
              showSyncToast('Cloud មិនទាន់មានទិន្នន័យនៅឡើយទេ', 'info');
              updateSyncStatusUI('synced', 'Cloud: បានតភ្ជាប់');
            }
          }).catch(err => {
            showSyncToast('បរាជ័យក្នុងការទាញយកទិន្នន័យពី Cloud: ' + err.message, 'error');
          });
        } else if (result.isDenied) {
          // Manual upload current data to cloud
          if (window.state && window.state.db) {
            saveToCloud(window.state.db, true);
            showSyncToast('បានបញ្ជូនទិន្នន័យបច្ចុប្បន្នទៅកាន់ Cloud រួចរាល់!', 'success');
          }
        }
      });
    } else {
      alert(`Cloud Realtime Database\nស្ថានភាព៖ ${isOnline ? 'Online' : 'Offline'}\nURL: ${firebaseConfig.databaseURL}`);
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
    importLocalDatabaseToCloud: importLocalDatabaseToCloud,
    openCloudSyncModal: openCloudSyncModal,
    triggerManualImport: triggerManualImport,
    updateSyncStatusUI: updateSyncStatusUI
  };

})();
