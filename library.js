// ==========================================================================
// បណ្ណាល័យថ្នាក់រៀនឌីជីថល (CLASSROOM DIGITAL LIBRARY)
// ស្រង់ចំនួនមេរៀនធំៗ និងចំណងជើងមេរៀនពិតប្រាកដចេញពី File PDF គ្រប់សន្លឹក ១០០%
// ថ្នាក់ណាគ្មានសៀវភៅរក្សាទុកបង្ហាញ «ទទេ» និងមានប៊ូតុងនាំសៀវភៅចូលបណ្ណាល័យ
// ==========================================================================

// Configure PDF.js Worker if loaded
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.min.js";
}

// IndexedDB Configuration
const LIB_DB_NAME = "BanLoungClassroomLibraryDB";
const LIB_DB_VERSION = 1;
const STORE_PDFS = "textbook_pdfs";
const STORE_CUSTOM_BOOKS = "custom_books";

// In-memory cache of stored PDF IDs
const storedPdfIdsCache = new Set();

// Open IndexedDB safely
function openLibraryDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      console.warn("IndexedDB not supported in this browser.");
      resolve(null);
      return;
    }
    const request = indexedDB.open(LIB_DB_NAME, LIB_DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PDFS)) {
        db.createObjectStore(STORE_PDFS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_CUSTOM_BOOKS)) {
        db.createObjectStore(STORE_CUSTOM_BOOKS, { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => {
      console.warn("Failed to open IndexedDB", e);
      resolve(null);
    };
  });
}

// Save PDF Blob to IndexedDB
async function savePdfToStorage(bookId, blobData, filename) {
  const db = await openLibraryDB();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_PDFS, "readwrite");
    const store = tx.objectStore(STORE_PDFS);
    store.put({ id: bookId, blob: blobData, name: filename, updatedAt: new Date().toISOString() });
    tx.oncomplete = () => {
      storedPdfIdsCache.add(bookId);
      resolve(true);
    };
    tx.onerror = () => resolve(false);
  });
}

// Get PDF Blob from IndexedDB
async function getPdfFromStorage(bookId) {
  const db = await openLibraryDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_PDFS, "readonly");
    const store = tx.objectStore(STORE_PDFS);
    const req = store.get(bookId);
    req.onsuccess = (e) => resolve(e.target.result ? e.target.result.blob : null);
    req.onerror = () => resolve(null);
  });
}

// Delete PDF from IndexedDB
async function deletePdfFromStorage(bookId) {
  const db = await openLibraryDB();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_PDFS, "readwrite");
    const store = tx.objectStore(STORE_PDFS);
    store.delete(bookId);
    tx.oncomplete = () => {
      storedPdfIdsCache.delete(bookId);
      resolve(true);
    };
    tx.onerror = () => resolve(false);
  });
}

// Save Custom Book Record to IndexedDB
async function saveCustomBookRecord(book) {
  const db = await openLibraryDB();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_CUSTOM_BOOKS, "readwrite");
    const store = tx.objectStore(STORE_CUSTOM_BOOKS);
    store.put(book);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

// Get All Custom Books
async function getAllCustomBooks() {
  const db = await openLibraryDB();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_CUSTOM_BOOKS, "readonly");
    const store = tx.objectStore(STORE_CUSTOM_BOOKS);
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror = () => resolve([]);
  });
}

// Delete Custom Book
async function deleteCustomBookRecord(bookId) {
  const db = await openLibraryDB();
  if (!db) return false;
  await deletePdfFromStorage(bookId);
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_CUSTOM_BOOKS, "readwrite");
    const store = tx.objectStore(STORE_CUSTOM_BOOKS);
    store.delete(bookId);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

// ==========================================================================
// OFFICIAL MOEYS TEXTBOOKS DATASET (REAL LESSONS FROM OFFICIAL PDF FILES)
// ==========================================================================
const OFFICIAL_PRELOADED_BOOKS = [
  {
    "id": "BK_G6_KHMER",
    "grade": "ថ្នាក់ទី៦",
    "subject": "ភាសាខ្មែរ",
    "subjectKey": "khmer",
    "title": "ភាសាខ្មែរ ថ្នាក់ទី៦",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
    "icon": "fa-book",
    "pdfPath": "textbooks/curriculum_grade_៦.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ អ្នកមានគុណ",
        "month": "វិច្ឆិកា",
        "page": 1
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ក្ដីសង្ឃឹមរបស់កុមារ",
        "month": "ធ្នូ",
        "page": 1
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ធនធានរ៉ែនៅប្រទេសកម្ពុជា",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ ផលប្រយោជន៍នៃធម្មជាតិ",
        "month": "កុម្ភៈ",
        "page": 2
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ ធនធានជលផលនៅកម្ពុជា",
        "month": "មីនា",
        "page": 2
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ ទំនៀមទម្លាប់ប្រពៃណីខ្មែរ",
        "month": "មេសា",
        "page": 3
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ តន្ត្រី និងសិល្បៈបុរាណ",
        "month": "ឧសភា",
        "page": 3
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ ជំនឿ និងសាសនា",
        "month": "មិថុនា",
        "page": 4
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ រមណីយដ្ឋានទេសចរណ៍នៅកម្ពុជា",
        "month": "កក្កដា",
        "page": 4
      },
      {
        "num": 10,
        "title": "មេរៀនទី ១០៖ សេចក្ដីថ្លៃថ្នូរ",
        "month": "សីហា",
        "page": 5
      }
    ]
  },
  {
    "id": "BK_G6_MATH",
    "grade": "ថ្នាក់ទី៦",
    "subject": "គណិតវិទ្យា",
    "subjectKey": "math",
    "title": "គណិតវិទ្យា ថ្នាក់ទី៦",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
    "icon": "fa-calculator",
    "pdfPath": "textbooks/curriculum_grade_៦.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ចំនួន",
        "month": "វិច្ឆិកា",
        "page": 7
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ចំនួនទសភាគ",
        "month": "វិច្ឆិកា",
        "page": 7
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ វិធីបូក និងវិធីដកចំនួនទសភាគ",
        "month": "ធ្នូ",
        "page": 7
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ កន្លះបន្ទាត់ពុះមុំ និងសំណង់មុំ",
        "month": "ធ្នូ",
        "page": 7
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ ការជំនួសលេខដោយអក្សរ",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ បរិមាត្រ",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ ផ្ទៃក្រឡា",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ វិធីគុណ និងវិធីចែកចំនួនទសភាគ",
        "month": "កុម្ភៈ",
        "page": 8
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ តួចែករួមធំបំផុត និងពហុគុណរួមតូចបំផុត",
        "month": "កុម្ភៈ",
        "page": 8
      },
      {
        "num": 10,
        "title": "មេរៀនទី ១០៖ វិធីបូក និងវិធីដកប្រភាគ",
        "month": "មីនា",
        "page": 9
      },
      {
        "num": 11,
        "title": "មេរៀនទី ១១៖ វិធីគុណ និងវិធីចែកប្រភាគ",
        "month": "មីនា",
        "page": 9
      },
      {
        "num": 12,
        "title": "មេរៀនទី ១២៖ ផលធៀប",
        "month": "មេសា",
        "page": 9
      },
      {
        "num": 13,
        "title": "មេរៀនទី ១៣៖ សមាមាត្រ",
        "month": "ឧសភា",
        "page": 9
      },
      {
        "num": 14,
        "title": "មេរៀនទី ១៤៖ ល្បឿន",
        "month": "ឧសភា",
        "page": 9
      },
      {
        "num": 15,
        "title": "មេរៀនទី ១៥៖ ប្រមាណវិធីលើចំនួនចម្រុះ",
        "month": "មិថុនា",
        "page": 10
      },
      {
        "num": 16,
        "title": "មេរៀនទី ១៦៖ ភាគរយ",
        "month": "មិថុនា",
        "page": 10
      },
      {
        "num": 17,
        "title": "មេរៀនទី ១៧៖ ការបង់រំលស់ និងការប្រាក់",
        "month": "កក្កដា",
        "page": 10
      },
      {
        "num": 18,
        "title": "មេរៀនទី ១៨៖ ស្ថិតិ",
        "month": "កក្កដា",
        "page": 10
      },
      {
        "num": 19,
        "title": "មេរៀនទី ១៩៖ ប្រមាណវិធីលើរង្វាស់ពេល",
        "month": "កក្កដា",
        "page": 10
      },
      {
        "num": 20,
        "title": "មេរៀនទី ២០៖ មាឌ និងផ្ទៃក្រឡាសូលីត",
        "month": "សីហា",
        "page": 10
      }
    ]
  },
  {
    "id": "BK_G6_SCIENCE",
    "grade": "ថ្នាក់ទី៦",
    "subject": "វិទ្យាសាស្ត្រ",
    "subjectKey": "science",
    "title": "វិទ្យាសាស្ត្រ ថ្នាក់ទី៦",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
    "icon": "fa-flask",
    "pdfPath": "textbooks/curriculum_grade_៦.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ការសម្របខ្លួនរបស់រុក្ខជាតិ",
        "month": "វិច្ឆិកា",
        "page": 12
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ការដាំដំណាំ",
        "month": "វិច្ឆិកា",
        "page": 12
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ការថែរក្សាសត្វ",
        "month": "ធ្នូ",
        "page": 12
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ បរិស្ថានធម្មជាតិ",
        "month": "ធ្នូ",
        "page": 12
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ ធនធានធម្មជាតិ",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ ប្រព័ន្ធបន្តពូជមនុស្ស",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ ពេញវ័យ",
        "month": "កុម្ភៈ",
        "page": 12
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ ការការពារកុំឱ្យមានគភ៌",
        "month": "កុម្ភៈ",
        "page": 13
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ សុខភាពបន្តពូជ",
        "month": "មីនា",
        "page": 13
      },
      {
        "num": 10,
        "title": "មេរៀនទី ១០៖ ប្រព័ន្ធរំលាយអាហារ",
        "month": "មីនា",
        "page": 13
      },
      {
        "num": 11,
        "title": "មេរៀនទី ១១៖ ប្រព័ន្ធរបត់ឈាម",
        "month": "មេសា",
        "page": 13
      },
      {
        "num": 12,
        "title": "មេរៀនទី ១២៖ ការប្រែប្រួលរូបធាតុ",
        "month": "ឧសភា",
        "page": 13
      },
      {
        "num": 13,
        "title": "មេរៀនទី ១៣៖ អង្គធាតុសុទ្ធ និងល្បាយ",
        "month": "ឧសភា",
        "page": 13
      },
      {
        "num": 14,
        "title": "មេរៀនទី ១៤៖ ម៉ាស៊ីនងាយ",
        "month": "មិថុនា",
        "page": 13
      },
      {
        "num": 15,
        "title": "មេរៀនទី ១៥៖ អគ្គិសនី",
        "month": "មិថុនា",
        "page": 13
      },
      {
        "num": 16,
        "title": "មេរៀនទី ១៦៖ ពន្លឺ និងសំឡេង",
        "month": "កក្កដា",
        "page": 14
      },
      {
        "num": 17,
        "title": "មេរៀនទី ១៧៖ កម្លាំង និងចលនា",
        "month": "សីហា",
        "page": 14
      }
    ]
  },
  {
    "id": "BK_G6_SOCIAL",
    "grade": "ថ្នាក់ទី៦",
    "subject": "សិក្សាសង្គម",
    "subjectKey": "social",
    "title": "សិក្សាសង្គម ថ្នាក់ទី៦",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #c2410c 0%, #f97316 100%)",
    "icon": "fa-earth-asia",
    "pdfPath": "textbooks/curriculum_grade_៦.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ការកំណត់គោលដៅ",
        "month": "វិច្ឆិកា",
        "page": 17
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ឥរិយាបថ និងតម្លៃ",
        "month": "វិច្ឆិកា",
        "page": 17
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ សិទ្ធិ និងការទទួលខុសត្រូវ",
        "month": "ធ្នូ",
        "page": 17
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ សិល្បៈ និងការច្នៃប្រឌិត",
        "month": "ធ្នូ",
        "page": 17
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ ការចៀសវាងទង្វើដែលនាំឱ្យមានគ្រោះថ្នាក់",
        "month": "មករា",
        "page": 17
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ ផលប៉ះពាល់នៃគ្រោះថ្នាក់ចរាចរណ៍",
        "month": "កុម្ភៈ",
        "page": 18
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ ចម្រៀង និងរបាំខ្មែរ",
        "month": "មីនា",
        "page": 18
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ ពិធីបុណ្យប្រពៃណីជាតិ",
        "month": "មេសា",
        "page": 18
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ ការងារក្នុងសហគមន៍",
        "month": "ឧសភា",
        "page": 18
      },
      {
        "num": 10,
        "title": "មេរៀនទី ១០៖ វប្បធម៌ទូទៅ",
        "month": "ឧសភា",
        "page": 18
      },
      {
        "num": 11,
        "title": "មេរៀនទី ១១៖ ទីតាំងភូមិសាស្ត្រ និងប្រទេសជិតខាង",
        "month": "មិថុនា",
        "page": 18
      },
      {
        "num": 12,
        "title": "មេរៀនទី ១២៖ ឧបករណ៍ភ្លេងប្រពៃណី",
        "month": "មិថុនា",
        "page": 19
      },
      {
        "num": 13,
        "title": "មេរៀនទី ១៣៖ សម័យចតុមុខ",
        "month": "កក្កដា",
        "page": 19
      },
      {
        "num": 14,
        "title": "មេរៀនទី ១៤៖ សម័យលង្វែក",
        "month": "កក្កដា",
        "page": 19
      },
      {
        "num": 15,
        "title": "មេរៀនទី ១៥៖ ព្រះរាជវាំងឧដុង្គ និងទំនាស់ផ្ទៃក្នុង",
        "month": "សីហា",
        "page": 19
      }
    ]
  },
  {
    "id": "BK_G5_KHMER",
    "grade": "ថ្នាក់ទី៥",
    "subject": "ភាសាខ្មែរ",
    "subjectKey": "khmer",
    "title": "ភាសាខ្មែរ ថ្នាក់ទី៥",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
    "icon": "fa-book",
    "pdfPath": "textbooks/curriculum_grade_៥.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ វ ីរជនេឆីម",
        "rawTitle": "វ ីរជនេឆីម",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ សមតិអករសិល៍",
        "rawTitle": "សមតិអករសិល៍",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ កំពែខរ",
        "rawTitle": "កំពែខរ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ បេជន៍ៃនរព័ត៌ន",
        "rawTitle": "បេជន៍ៃនរព័ត៌ន",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ រតីទទួលខុសតវ",
        "rawTitle": "រតីទទួលខុសតវ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ អតីតលរបស់េយីង",
        "rawTitle": "អតីតលរបស់េយីង",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ ទូរគមន៍េកមុ",
        "rawTitle": "ទូរគមន៍េកមុ",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ ផលិតផលែខរ",
        "rawTitle": "ផលិតផលែខរ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ េពលេវសក់",
        "rawTitle": "េពលេវសក់",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ របនពូជរបស់រុកតិ",
        "rawTitle": "របនពូជរបស់រុកតិ",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ រលូតស់របស់ប់ពូជ",
        "rawTitle": "រលូតស់របស់ប់ពូជ",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ របនពូជរបស់សត",
        "rawTitle": "របនពូជរបស់សត",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ បរិនធមតិ",
        "rawTitle": "បរិនធមតិ",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ រត់បនយកងក់និងរតុបំពុលបរិន",
        "rawTitle": "រត់បនយកងក់និងរតុបំពុលបរិន",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ដី",
        "rawTitle": "ដី",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ រេដីមីសុខព",
        "rawTitle": "រេដីមីសុខព",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ របរិេគរនិងទឹកនអម័យ",
        "rawTitle": "របរិេគរនិងទឹកនអម័យ",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ រក់៉ក់ំង",
        "rawTitle": "រក់៉ក់ំង",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ រស់ រូបតុ និងកេ",
        "rawTitle": "រស់ រូបតុ និងកេ",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ កំងកកិត",
        "rawTitle": "កំងកកិត",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ អគិសនី",
        "rawTitle": "អគិសនី",
        "month": "មករា",
        "page": 15
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ពះទិត",
        "rawTitle": "ពះទិត",
        "month": "មករា",
        "page": 15
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ បព័នពះទិតនិងភពរណបេផងៗ",
        "rawTitle": "បព័នពះទិតនិងភពរណបេផងៗ",
        "month": "មករា",
        "page": 15
      }
    ]
  },
  {
    "id": "BK_G5_MATH",
    "grade": "ថ្នាក់ទី៥",
    "subject": "គណិតវិទ្យា",
    "subjectKey": "math",
    "title": "គណិតវិទ្យា ថ្នាក់ទី៥",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
    "icon": "fa-calculator",
    "pdfPath": "textbooks/curriculum_grade_៥.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ចំនួន",
        "rawTitle": "ចំនួន",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ វិធីគុណ",
        "rawTitle": "វិធីគុណ",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ វិធីែចក",
        "rawTitle": "វិធីែចក",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ បណវិធីនវង់កចក",
        "rawTitle": "បណវិធីនវង់កចក",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ ផលេធប និងគរយ",
        "rawTitle": "ផលេធប និងគរយ",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ សិតិ",
        "rawTitle": "សិតិ",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ ចំនួនចមះ",
        "rawTitle": "ចំនួនចមះ",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ ចំនួនទសគ",
        "rawTitle": "ចំនួនទសគ",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ វិធីបូក វិធីដកចំនួនទសគ",
        "rawTitle": "វិធីបូក វិធីដកចំនួនទសគ",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 10,
        "title": "មេរៀនទី ១០៖ វិធីគុណចំនួនទសគ",
        "rawTitle": "វិធីគុណចំនួនទសគ",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 11,
        "title": "មេរៀនទី ១១៖ បគ",
        "rawTitle": "បគ",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 12,
        "title": "មេរៀនទី ១២៖ រូបិយវតុ",
        "rawTitle": "រូបិយវតុ",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 13,
        "title": "មេរៀនទី ១៣៖ រស់បែវង",
        "rawTitle": "រស់បែវង",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 14,
        "title": "មេរៀនទី ១៤៖ រស់ទមន់",
        "rawTitle": "រស់ទមន់",
        "month": "មករា",
        "page": 10
      },
      {
        "num": 15,
        "title": "មេរៀនទី ១៥៖ រស់ចំណុច",
        "rawTitle": "រស់ចំណុច",
        "month": "មករា",
        "page": 10
      },
      {
        "num": 16,
        "title": "មេរៀនទី ១៦៖ រស់េពល",
        "rawTitle": "រស់េពល",
        "month": "មករា",
        "page": 10
      },
      {
        "num": 17,
        "title": "មេរៀនទី ១៧៖ ធរណីត",
        "rawTitle": "ធរណីត",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 18,
        "title": "មេរៀនទី ១៨៖ បង់ ែផនទី និងតន",
        "rawTitle": "បង់ ែផនទី និងតន",
        "month": "មករា",
        "page": 12
      }
    ]
  },
  {
    "id": "BK_G5_SOCIAL",
    "grade": "ថ្នាក់ទី៥",
    "subject": "សិក្សាសង្គម",
    "subjectKey": "social",
    "title": "សិក្សាសង្គម ថ្នាក់ទី៥",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #c2410c 0%, #f97316 100%)",
    "icon": "fa-earth-asia",
    "pdfPath": "textbooks/curriculum_grade_៥.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ រកំណត់េលេ",
        "rawTitle": "រកំណត់េលេ",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ េលេេកុងរសិក",
        "rawTitle": "េលេេកុងរសិក",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ឥរិបថ និងតៃម",
        "rawTitle": "ឥរិបថ និងតៃម",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ សិទិនិងរទទួលខុសតវ",
        "rawTitle": "សិទិនិងរទទួលខុសតវ",
        "month": "មករា",
        "page": 19
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ របេងីតថីនិងគំនិតៃចបឌិត",
        "rawTitle": "របេងីតថីនិងគំនិតៃចបឌិត",
        "month": "មករា",
        "page": 19
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ រេចសងទេងីែដលំឱនេះក់",
        "rawTitle": "រេចសងទេងីែដលំឱនេះក់",
        "month": "មករា",
        "page": 19
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ររកសុវតិពេេពលេដីរ និងេពលជិះកង់",
        "rawTitle": "ររកសុវតិពេេពលេដីរ និងេពលជិះកង់",
        "month": "មករា",
        "page": 20
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ រែថរកចេមងនិងរំែខរ",
        "rawTitle": "រែថរកចេមងនិងរំែខរ",
        "month": "មករា",
        "page": 20
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ពីធីបុណបៃពណីតិ",
        "rawTitle": "ពីធីបុណបៃពណីតិ",
        "month": "មករា",
        "page": 20
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ររបំៃថ",
        "rawTitle": "ររបំៃថ",
        "month": "មករា",
        "page": 20
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ អំចនីតិបតិ",
        "rawTitle": "អំចនីតិបតិ",
        "month": "មករា",
        "page": 20
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ រេបីស់ដីេមទីំង",
        "rawTitle": "រេបីស់ដីេមទីំង",
        "month": "មករា",
        "page": 20
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ គំនូរកច់បុណែខរ",
        "rawTitle": "គំនូរកច់បុណែខរ",
        "month": "មករា",
        "page": 21
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ រែថរកឧបករណ៍េភងបៃពណី",
        "rawTitle": "រែថរកឧបករណ៍េភងបៃពណី",
        "month": "មករា",
        "page": 21
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ សំណង់អរបុណ",
        "rawTitle": "សំណង់អរបុណ",
        "month": "មករា",
        "page": 21
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ សម័យេចន",
        "rawTitle": "សម័យេចន",
        "month": "មករា",
        "page": 21
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ សម័យអងរ",
        "rawTitle": "សម័យអងរ",
        "month": "មករា",
        "page": 21
      }
    ]
  },
  {
    "id": "BK_G4_KHMER",
    "grade": "ថ្នាក់ទី៤",
    "subject": "ភាសាខ្មែរ",
    "subjectKey": "khmer",
    "title": "ភាសាខ្មែរ ថ្នាក់ទី៤",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
    "icon": "fa-book",
    "pdfPath": "textbooks/curriculum_grade_៤.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ កី និងែលងកមន",
        "rawTitle": "កី និងែលងកមន",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ សហគមន៍េជនេលន",
        "rawTitle": "សហគមន៍េជនេលន",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ រគួរសម",
        "rawTitle": "រគួរសម",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ រុកតិបេទសេយីង",
        "rawTitle": "រុកតិបេទសេយីង",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ មិតជិតសិទិ",
        "rawTitle": "មិតជិតសិទិ",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ មេធយេធីទំក់ទំនង",
        "rawTitle": "មេធយេធីទំក់ទំនង",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ មូបរ",
        "rawTitle": "មូបរ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ សនដីបេទសេយីង",
        "rawTitle": "សនដីបេទសេយីង",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ បភពទឹកេកមុ",
        "rawTitle": "បភពទឹកេកមុ",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 10,
        "title": "មេរៀនទី ១០៖ សតេបេទសេយីង",
        "rawTitle": "សតេបេទសេយីង",
        "month": "មករា",
        "page": 5
      }
    ]
  },
  {
    "id": "BK_G4_MATH",
    "grade": "ថ្នាក់ទី៤",
    "subject": "គណិតវិទ្យា",
    "subjectKey": "math",
    "title": "គណិតវិទ្យា ថ្នាក់ទី៤",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
    "icon": "fa-calculator",
    "pdfPath": "textbooks/curriculum_grade_៤.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ចំនួន",
        "rawTitle": "ចំនួន",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ បគ",
        "rawTitle": "បគ",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ វិធីបូក",
        "rawTitle": "វិធីបូក",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ រូបធរណីត",
        "rawTitle": "រូបធរណីត",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ ទមន់",
        "rawTitle": "ទមន់",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ វិធីដក",
        "rawTitle": "វិធីដក",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ រូបិយវតុ",
        "rawTitle": "រូបិយវតុ",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ វិធីគុណ",
        "rawTitle": "វិធីគុណ",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ វិធីែចក",
        "rawTitle": "វិធីែចក",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 10,
        "title": "មេរៀនទី ១០៖ េពលេវ",
        "rawTitle": "េពលេវ",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 11,
        "title": "មេរៀនទី ១១៖ បែវង",
        "rawTitle": "បែវង",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 12,
        "title": "មេរៀនទី ១២៖ ចំនួនទសគ",
        "rawTitle": "ចំនួនទសគ",
        "month": "មករា",
        "page": 10
      },
      {
        "num": 13,
        "title": "មេរៀនទី ១៣៖ វិធីបូកចំនួនទសគ",
        "rawTitle": "វិធីបូកចំនួនទសគ",
        "month": "មករា",
        "page": 10
      },
      {
        "num": 14,
        "title": "មេរៀនទី ១៤៖ វិធីដកចំនួនទសគ",
        "rawTitle": "វិធីដកចំនួនទសគ",
        "month": "មករា",
        "page": 10
      },
      {
        "num": 15,
        "title": "មេរៀនទី ១៥៖ មុំ",
        "rawTitle": "មុំ",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 16,
        "title": "មេរៀនទី ១៦៖ បត់ែកង និងបត់សប",
        "rawTitle": "បត់ែកង និងបត់សប",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 17,
        "title": "មេរៀនទី ១៧៖ សិតិ",
        "rawTitle": "សិតិ",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ បរិនធមតិ",
        "rawTitle": "បរិនធមតិ",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ផលបេជន៍រុកតិ",
        "rawTitle": "ផលបេជន៍រុកតិ",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ វដជីវិតរបស់រុកតិ",
        "rawTitle": "វដជីវិតរបស់រុកតិ",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ ចំែណកក់សត",
        "rawTitle": "ចំែណកក់សត",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ េងឆឹងនិងច់ដុំ",
        "rawTitle": "េងឆឹងនិងច់ដុំ",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ែភក",
        "rawTitle": "ែភក",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ជំងឺគនម និងគនញ់",
        "rawTitle": "ជំងឺគនម និងគនញ់",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ លកណៈៃនរូបតុ",
        "rawTitle": "លកណៈៃនរូបតុ",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ កំងនិងមពល",
        "rawTitle": "កំងនិងមពល",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ ស់",
        "rawTitle": "ស់",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ កងក់ទឹក",
        "rawTitle": "កងក់ទឹក",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ រងិលរបស់ែផនដី",
        "rawTitle": "រងិលរបស់ែផនដី",
        "month": "មករា",
        "page": 15
      }
    ]
  },
  {
    "id": "BK_G4_SOCIAL",
    "grade": "ថ្នាក់ទី៤",
    "subject": "សិក្សាសង្គម",
    "subjectKey": "social",
    "title": "សិក្សាសង្គម ថ្នាក់ទី៤",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #c2410c 0%, #f97316 100%)",
    "icon": "fa-earth-asia",
    "pdfPath": "textbooks/curriculum_grade_៤.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១",
        "rawTitle": "",
        "month": "មករា",
        "page": 16
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២",
        "rawTitle": "",
        "month": "មករា",
        "page": 16
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ពេះតង់",
        "rawTitle": "ពេះតង់",
        "month": "មករា",
        "page": 16
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ សិទិកុរ",
        "rawTitle": "សិទិកុរ",
        "month": "មករា",
        "page": 16
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ សិលៈ និងរៃចបឌិត",
        "rawTitle": "សិលៈ និងរៃចបឌិត",
        "month": "មករា",
        "page": 17
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ របបួសរបស់មិតភកិ",
        "rawTitle": "របបួសរបស់មិតភកិ",
        "month": "មករា",
        "page": 17
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២",
        "rawTitle": "",
        "month": "មករា",
        "page": 17
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ វិធីបុណមគរ",
        "rawTitle": "វិធីបុណមគរ",
        "month": "មករា",
        "page": 17
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ បុណបៃពណីតិ",
        "rawTitle": "បុណបៃពណីតិ",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ តៃមររ",
        "rawTitle": "តៃមររ",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ អំចនីតិបតិបតិ",
        "rawTitle": "អំចនីតិបតិបតិ",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ ធរែផនដី",
        "rawTitle": "ធរែផនដី",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦",
        "rawTitle": "",
        "month": "មករា",
        "page": 19
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ សំណង់អរបុណ",
        "rawTitle": "សំណង់អរបុណ",
        "month": "មករា",
        "page": 19
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ជីវពសម័យបុណ",
        "rawTitle": "ជីវពសម័យបុណ",
        "month": "មករា",
        "page": 19
      }
    ]
  },
  {
    "id": "BK_G3_KHMER",
    "grade": "ថ្នាក់ទី៣",
    "subject": "ភាសាខ្មែរ",
    "subjectKey": "khmer",
    "title": "ភាសាខ្មែរ ថ្នាក់ទី៣",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
    "icon": "fa-book",
    "pdfPath": "textbooks/curriculum_grade_៣.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១",
        "rawTitle": "",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ េវវចនសព",
        "rawTitle": "េវវចនសព",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ /  អំន៖ សិសឧសហ៍",
        "rawTitle": "/  អំន៖ សិសឧសហ៍",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ / អំន៖ រសតក់េរន",
        "rawTitle": "/ អំន៖ រសតក់េរន",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ /  បំណិន ៖កជួន",
        "rawTitle": "/  បំណិន ៖កជួន",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ អំន៖ េពលេរពទង់តិ",
        "rawTitle": "អំន៖ េពលេរពទង់តិ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ រនិយប់ព័ត៌នល់ខួន",
        "rawTitle": "រនិយប់ព័ត៌នល់ខួន",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ េរង ទឹកចិតដ៏បៃព",
        "rawTitle": "េរង ទឹកចិតដ៏បៃព",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ /   អំន  ៖  សិសគំរូ",
        "rawTitle": "/   អំន  ៖  សិសគំរូ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 10,
        "title": "មេរៀនទី ១០៖ អំន៖ សជិកគរខុំ",
        "rawTitle": "អំន៖ សជិកគរខុំ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 11,
        "title": "មេរៀនទី ១១៖ បំណិន  ៖ បដិសព",
        "rawTitle": "បំណិន  ៖ បដិសព",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 12,
        "title": "មេរៀនទី ១២៖ អំន ៖ គុណយឪពុក",
        "rawTitle": "អំន ៖ គុណយឪពុក",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 13,
        "title": "មេរៀនទី ១៣៖ ពណ៌អំពីមនុស",
        "rawTitle": "ពណ៌អំពីមនុស",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 14,
        "title": "មេរៀនទី ១៤៖ េរងេរ កបីនេធញេលី",
        "rawTitle": "េរងេរ កបីនេធញេលី",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 16,
        "title": "មេរៀនទី ១៦៖ រប់អកនគុណ",
        "rawTitle": "រប់អកនគុណ",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 17,
        "title": "មេរៀនទី ១៧៖ 2",
        "rawTitle": "2",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 18,
        "title": "មេរៀនទី ១៨៖ អំន៖ កិចរេយីង",
        "rawTitle": "អំន៖ កិចរេយីង",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 19,
        "title": "មេរៀនទី ១៩៖ បំណិន តួអង",
        "rawTitle": "បំណិន តួអង",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 20,
        "title": "មេរៀនទី ២០៖ េមេរន កូនំ",
        "rawTitle": "េមេរន កូនំ",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 22,
        "title": "មេរៀនទី ២២៖ រប់េរង៖ កុរេចះសនំ",
        "rawTitle": "រប់េរង៖ កុរេចះសនំ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 23,
        "title": "មេរៀនទី ២៣៖ ែតងេសចកី",
        "rawTitle": "ែតងេសចកី",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 24,
        "title": "មេរៀនទី ២៤៖ អំនអកជិតងល",
        "rawTitle": "អំនអកជិតងល",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 25,
        "title": "មេរៀនទី ២៥៖ បំណិន៖ សទិសសព",
        "rawTitle": "បំណិន៖ សទិសសព",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 26,
        "title": "មេរៀនទី ២៦៖ អំន៖ ពិធីបុណនេភូមិខុំ",
        "rawTitle": "អំន៖ ពិធីបុណនេភូមិខុំ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 28,
        "title": "មេរៀនទី ២៨៖ អំន៖ ែលងេះអងញ់",
        "rawTitle": "អំន៖ ែលងេះអងញ់",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 29,
        "title": "មេរៀនទី ២៩៖ រនិយែណំរកកែនងេទសចរណ៍កុងភូមិ",
        "rawTitle": "រនិយែណំរកកែនងេទសចរណ៍កុងភូមិ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 30,
        "title": "មេរៀនទី ៣០៖ អំនបុណវិខបូ",
        "rawTitle": "អំនបុណវិខបូ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 31,
        "title": "មេរៀនទី ៣១",
        "rawTitle": "",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 32,
        "title": "មេរៀនទី ៣២",
        "rawTitle": "",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 33,
        "title": "មេរៀនទី ៣៣៖ អំន៖ មុខរបរចិឹមតី",
        "rawTitle": "អំន៖ មុខរបរចិឹមតី",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 34,
        "title": "មេរៀនទី ៣៤",
        "rawTitle": "",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 35,
        "title": "មេរៀនទី ៣៥៖ អំន រលក់ដូរ",
        "rawTitle": "អំន រលក់ដូរ",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 36,
        "title": "មេរៀនទី ៣៦៖ េវយករណ៍៖ អំពី កិរិ",
        "rawTitle": "េវយករណ៍៖ អំពី កិរិ",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 37,
        "title": "មេរៀនទី ៣៧",
        "rawTitle": "",
        "month": "មករា",
        "page": 6
      }
    ]
  },
  {
    "id": "BK_G3_MATH",
    "grade": "ថ្នាក់ទី៣",
    "subject": "គណិតវិទ្យា",
    "subjectKey": "math",
    "title": "គណិតវិទ្យា ថ្នាក់ទី៣",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
    "icon": "fa-calculator",
    "pdfPath": "textbooks/curriculum_grade_៣.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ចំនួនដល់",
        "rawTitle": "ចំនួនដល់",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ទមន់",
        "rawTitle": "ទមន់",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ វិធីបូក",
        "rawTitle": "វិធីបូក",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ រូបិយវតុ",
        "rawTitle": "រូបិយវតុ",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ បែវង",
        "rawTitle": "បែវង",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ វិធីដក",
        "rawTitle": "វិធីដក",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ ឌ និងចំណុះ",
        "rawTitle": "ឌ និងចំណុះ",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ េពលេវ",
        "rawTitle": "េពលេវ",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ វិធីគុណ",
        "rawTitle": "វិធីគុណ",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 11,
        "title": "មេរៀនទី ១១៖ 85",
        "rawTitle": "85",
        "month": "មករា",
        "page": 15
      },
      {
        "num": 12,
        "title": "មេរៀនទី ១២៖ បគ",
        "rawTitle": "បគ",
        "month": "មករា",
        "page": 16
      },
      {
        "num": 13,
        "title": "មេរៀនទី ១៣៖ បរូបព លំំគំរូ ឱស",
        "rawTitle": "បរូបព លំំគំរូ ឱស",
        "month": "មករា",
        "page": 16
      }
    ]
  },
  {
    "id": "BK_G3_SOCIAL_SCI",
    "grade": "ថ្នាក់ទី៣",
    "subject": "វិទ្យាសាស្ត្រ និងសិក្សាសង្គម",
    "subjectKey": "social_sci",
    "title": "វិទ្យាសាស្ត្រ និងសិក្សាសង្គម ថ្នាក់ទី៣",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
    "icon": "fa-flask",
    "pdfPath": "textbooks/curriculum_grade_៣.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ រសតខួនណ",
        "rawTitle": "រសតខួនណ",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ របរខួនពីជំងឺេផៗ",
        "rawTitle": "របរខួនពីជំងឺេផៗ",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ចំណីរត",
        "rawTitle": "ចំណីរត",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ រទទួលល់អំេពីល",
        "rawTitle": "រទទួលល់អំេពីល",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ សប់ប់ល",
        "rawTitle": "សប់ប់ល",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ រសញ់ប់ន",
        "rawTitle": "រសញ់ប់ន",
        "month": "មករា",
        "page": 18
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ រយកចិតទុកក់ចំេះអកេជុំវិញ",
        "rawTitle": "រយកចិតទុកក់ចំេះអកេជុំវិញ",
        "month": "មករា",
        "page": 19
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ររកសុវតិពេពលេធីដំេណីរផូវ",
        "rawTitle": "ររកសុវតិពេពលេធីដំេណីរផូវ",
        "month": "មករា",
        "page": 19
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ រកសុវតិពេកុងតំបន់នមីន",
        "rawTitle": "រកសុវតិពេកុងតំបន់នមីន",
        "month": "មករា",
        "page": 19
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ រទុកប់វតុឱនសុវតិព",
        "rawTitle": "រទុកប់វតុឱនសុវតិព",
        "month": "មករា",
        "page": 19
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ បត់េពលេវ",
        "rawTitle": "បត់េពលេវ",
        "month": "មករា",
        "page": 19
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ រុកតិែដលខុំំ",
        "rawTitle": "រុកតិែដលខុំំ",
        "month": "មករា",
        "page": 19
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ សតែដលខុំចិឹម",
        "rawTitle": "សតែដលខុំចិឹម",
        "month": "មករា",
        "page": 20
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ទីកែនងែដលខុំរស់េ",
        "rawTitle": "ទីកែនងែដលខុំរស់េ",
        "month": "មករា",
        "page": 20
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ កែនងេផងៗេភូមិខុំ",
        "rawTitle": "កែនងេផងៗេភូមិខុំ",
        "month": "មករា",
        "page": 20
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ រុកតិេភូមិខុំ",
        "rawTitle": "រុកតិេភូមិខុំ",
        "month": "មករា",
        "page": 20
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ ខុំេរនចេមងចំេរង",
        "rawTitle": "ខុំេរនចេមងចំេរង",
        "month": "មករា",
        "page": 20
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ ខុំត់ំ",
        "rawTitle": "ខុំត់ំ",
        "month": "មករា",
        "page": 20
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ ខុំេរនតញ់និងបិទរូប",
        "rawTitle": "ខុំេរនតញ់និងបិទរូប",
        "month": "មករា",
        "page": 21
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ អកដឹកំភូមិខុំ",
        "rawTitle": "អកដឹកំភូមិខុំ",
        "month": "មករា",
        "page": 21
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ទង់តិ",
        "rawTitle": "ទង់តិ",
        "month": "មករា",
        "page": 21
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ េយីងតវរកំេ និងពនឺ",
        "rawTitle": "េយីងតវរកំេ និងពនឺ",
        "month": "មករា",
        "page": 21
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ សូរសំេឡងេផងៗេមមូលន",
        "rawTitle": "សូរសំេឡងេផងៗេមមូលន",
        "month": "មករា",
        "page": 21
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ ពអរ ៃនជីវិត",
        "rawTitle": "ពអរ ៃនជីវិត",
        "month": "មករា",
        "page": 21
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ រស់បូរតុស",
        "rawTitle": "រស់បូរតុស",
        "month": "មករា",
        "page": 22
      }
    ]
  },
  {
    "id": "BK_G2_KHMER",
    "grade": "ថ្នាក់ទី២",
    "subject": "ភាសាខ្មែរ",
    "subjectKey": "khmer",
    "title": "ភាសាខ្មែរ ថ្នាក់ទី២",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
    "icon": "fa-book",
    "pdfPath": "textbooks/curriculum_grade_២.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ សៈនិស័យនិងពនៈ",
        "rawTitle": "សៈនិស័យនិងពនៈ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ រ ំឭកពនៈ ផំសៈ",
        "rawTitle": "រ ំឭកពនៈ ផំសៈ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ រ ំឭកពនៈ ផំសៈ",
        "rawTitle": "រ ំឭកពនៈ ផំសៈ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ រ ំឭក ង៉ ញ៉ ប៉ យ៉ ម៉ រ ៉ វ ៉",
        "rawTitle": "រ ំឭក ង៉ ញ៉ ប៉ យ៉ ម៉ រ ៉ វ ៉",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ រ ំឭក ប៊ ស៊ ហ៊  អ៊",
        "rawTitle": "រ ំឭក ប៊ ស៊ ហ៊  អ៊",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ រ ំឭកកបកបនឹង ក ខ គ ឃ ច ជ ត ថ ទ ព ប ស",
        "rawTitle": "រ ំឭកកបកបនឹង ក ខ គ ឃ ច ជ ត ថ ទ ព ប ស",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ រ ំឭកកបកបនឹង ន ណ ង ញ ម យ ល វ",
        "rawTitle": "រ ំឭកកបកបនឹង ន ណ ង ញ ម យ ល វ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ រ ំឭកសះេពញតួ",
        "rawTitle": "រ ំឭកសះេពញតួ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ ពនៈេផីេជីង ខ ខ ខ ឆ ឆ ឆ",
        "rawTitle": "ពនៈេផីេជីង ខ ខ ខ ឆ ឆ ឆ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 10,
        "title": "មេរៀនទី ១០៖ ពនៈេផីេជីង ត ត ត ថ ថ ថ ថ ថ ថ",
        "rawTitle": "ពនៈេផីេជីង ត ត ត ថ ថ ថ ថ ថ ថ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 11,
        "title": "មេរៀនទី ១១៖ ពនៈេផីេជីង ធ ធ ធ ផ ផ ផ ផ",
        "rawTitle": "ពនៈេផីេជីង ធ ធ ធ ផ ផ ផ ផ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 12,
        "title": "មេរៀនទី ១២៖ ពនៈេផីេជីង ផ ផ ផ ផ ផ  ផ",
        "rawTitle": "ពនៈេផីេជីង ផ ផ ផ ផ ផ  ផ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 13,
        "title": "មេរៀនទី ១៣៖ ពនៈេផីេជីង ព ព ព ភ ភ ភ ភ",
        "rawTitle": "ពនៈេផីេជីង ព ព ព ភ ភ ភ ភ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 14,
        "title": "មេរៀនទី ១៤៖ េមេរនេឡីងវ ិញ ពនៈេផីេជីង ថ ថ ធ ធ ធ ផ ផ",
        "rawTitle": "េមេរនេឡីងវ ិញ ពនៈេផីេជីង ថ ថ ធ ធ ធ ផ ផ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 15,
        "title": "មេរៀនទី ១៥៖ ពនៈេផីេជីង ម ម ម ម ម ម",
        "rawTitle": "ពនៈេផីេជីង ម ម ម ម ម ម",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 16,
        "title": "មេរៀនទី ១៦៖ ពនៈេផីេជីង ម ម ម ម ម ម",
        "rawTitle": "ពនៈេផីេជីង ម ម ម ម ម ម",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 17,
        "title": "មេរៀនទី ១៧៖ ពនៈេផីេជីង ល ល ល ល ល ល ល ល",
        "rawTitle": "ពនៈេផីេជីង ល ល ល ល ល ល ល ល",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 18,
        "title": "មេរៀនទី ១៨៖ ពនៈេផីេជីង ស ស ស  ស ស",
        "rawTitle": "ពនៈេផីេជីង ស ស ស  ស ស",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 19,
        "title": "មេរៀនទី ១៩៖ ពនៈេផីេជីង ស  ស ស ស ស",
        "rawTitle": "ពនៈេផីេជីង ស  ស ស ស ស",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 20,
        "title": "មេរៀនទី ២០៖ ពនៈេផីេជីង ស ស ស ស ស",
        "rawTitle": "ពនៈេផីេជីង ស ស ស ស ស",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 21,
        "title": "មេរៀនទី ២១៖ េមេរនេឡីងវ ិញពនៈេផីេជីង ម ម ម ល ល ល ស ស ស ស",
        "rawTitle": "េមេរនេឡីងវ ិញពនៈេផីេជីង ម ម ម ល ល ល ស ស ស ស",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 22,
        "title": "មេរៀនទី ២២៖ ពងតមត ង ង ង ង",
        "rawTitle": "ពងតមត ង ង ង ង",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 23,
        "title": "មេរៀនទី ២៣៖ ពងតមត ង ង ង ង",
        "rawTitle": "ពងតមត ង ង ង ង",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 24,
        "title": "មេរៀនទី ២៤៖ ពងតមត",
        "rawTitle": "ពងតមត",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 25,
        "title": "មេរៀនទី ២៥៖ ពងតមត ណ ណ ណ",
        "rawTitle": "ពងតមត ណ ណ ណ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 26,
        "title": "មេរៀនទី ២៦៖ េមេរនេឡីងវ ិញពងតមត ង ង ង ង ង ង     ណ",
        "rawTitle": "េមេរនេឡីងវ ិញពងតមត ង ង ង ង ង ង     ណ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 27,
        "title": "មេរៀនទី ២៧៖ ពងតមត ន ន ន ន ន ន",
        "rawTitle": "ពងតមត ន ន ន ន ន ន",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 28,
        "title": "មេរៀនទី ២៨៖ ពងតមត ម ម ម ម ម ម ម",
        "rawTitle": "ពងតមត ម ម ម ម ម ម ម",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 29,
        "title": "មេរៀនទី ២៩៖ ពងតមត ម ម ម ម ម",
        "rawTitle": "ពងតមត ម ម ម ម ម",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 30,
        "title": "មេរៀនទី ៣០៖ ពងតមត ង ង  ន ន",
        "rawTitle": "ពងតមត ង ង  ន ន",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 31,
        "title": "មេរៀនទី ៣១៖ េមេរនរេឡីងវ ិញពងតមត",
        "rawTitle": "េមេរនរេឡីងវ ិញពងតមត",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 32,
        "title": "មេរៀនទី ៣២៖ អំន \"បេវសនស\"",
        "rawTitle": "អំន \"បេវសនស\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 33,
        "title": "មេរៀនទី ៣៣៖ អំន \"េពលេចញេលង\"",
        "rawTitle": "អំន \"េពលេចញេលង\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 34,
        "title": "មេរៀនទី ៣៤៖ េមសូត ចង់េេរន",
        "rawTitle": "េមសូត ចង់េេរន",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 35,
        "title": "មេរៀនទី ៣៥៖ រែណំមិតឱល់",
        "rawTitle": "រែណំមិតឱល់",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 36,
        "title": "មេរៀនទី ៣៦៖ អំន \"សតករ\"",
        "rawTitle": "អំន \"សតករ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 37,
        "title": "មេរៀនទី ៣៧៖ អំន \"រខិតខំេរនសូត\"",
        "rawTitle": "អំន \"រខិតខំេរនសូត\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 38,
        "title": "មេរៀនទី ៣៨៖ រប់ \"េរងែកករកូន\"",
        "rawTitle": "រប់ \"េរងែកករកូន\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 39,
        "title": "មេរៀនទី ៣៩៖ ចេមង \"េរងែកករកូន\"",
        "rawTitle": "ចេមង \"េរងែកករកូន\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 40,
        "title": "មេរៀនទី ៤០៖ អំន \"រេធសបែហស\"",
        "rawTitle": "អំន \"រេធសបែហស\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 41,
        "title": "មេរៀនទី ៤១៖ េមសូត \"យឪពុកខុំ\"",
        "rawTitle": "េមសូត \"យឪពុកខុំ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 42,
        "title": "មេរៀនទី ៤២៖ អំន \"េពលេភវមកេលងផះ\"",
        "rawTitle": "អំន \"េពលេភវមកេលងផះ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 43,
        "title": "មេរៀនទី ៤៣៖ រនិយ៖រេបីករបស់ខុំ/េយីង/ឯង",
        "rawTitle": "រនិយ៖រេបីករបស់ខុំ/េយីង/ឯង",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 44,
        "title": "មេរៀនទី ៤៤៖ អំនេរង \"ឪពុក និងកូនដឹកេលក់\"",
        "rawTitle": "អំនេរង \"ឪពុក និងកូនដឹកេលក់\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 45,
        "title": "មេរៀនទី ៤៥៖ អំន៖មិតលរបស់កូនបូបូ",
        "rawTitle": "អំន៖មិតលរបស់កូនបូបូ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 46,
        "title": "មេរៀនទី ៤៦៖ អំន \"រេរនអករផង់\"",
        "rawTitle": "អំន \"រេរនអករផង់\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 47,
        "title": "មេរៀនទី ៤៧៖ រនិយ \"រេរបប់សជិកគរ\"",
        "rawTitle": "រនិយ \"រេរបប់សជិកគរ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 48,
        "title": "មេរៀនទី ៤៨៖ រប់េរង \"កូនកេង និងកូនពែព\"",
        "rawTitle": "រប់េរង \"កូនកេង និងកូនពែព\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 49,
        "title": "មេរៀនទី ៤៩៖ អំនេរង \"កូនទនយ និងកូន\"",
        "rawTitle": "អំនេរង \"កូនទនយ និងកូន\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 50,
        "title": "មេរៀនទី ៥០៖ ចេមង \"គររ ីកយ\"",
        "rawTitle": "ចេមង \"គររ ីកយ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 51,
        "title": "មេរៀនទី ៥១៖ អំន \"ចររបស់ជីខុំ\"",
        "rawTitle": "អំន \"ចររបស់ជីខុំ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 52,
        "title": "មេរៀនទី ៥២៖ អំន \"េមន់និងកូន\"",
        "rawTitle": "អំន \"េមន់និងកូន\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 53,
        "title": "មេរៀនទី ៥៣៖ រេរបប់អំពី រូប កិន ពណ៌ សំេឡង រសតិ",
        "rawTitle": "រេរបប់អំពី រូប កិន ពណ៌ សំេឡង រសតិ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 54,
        "title": "មេរៀនទី ៥៤៖ អំន \"េតេខុំ\"",
        "rawTitle": "អំន \"េតេខុំ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 55,
        "title": "មេរៀនទី ៥៥៖ រនិយ \"កបញលកណៈ វតុ សត មនុស សត រុកតិ\"",
        "rawTitle": "រនិយ \"កបញលកណៈ វតុ សត មនុស សត រុកតិ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 56,
        "title": "មេរៀនទី ៥៦៖ អំន \" េទសពលែសេរដូវវស\"",
        "rawTitle": "អំន \" េទសពលែសេរដូវវស\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 57,
        "title": "មេរៀនទី ៥៧៖ អំន \"អកលក់មួកនិងសត\"",
        "rawTitle": "អំន \"អកលក់មួកនិងសត\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 58,
        "title": "មេរៀនទី ៥៨៖ ចេមង \"ររពុកែម៉ខុំ\"",
        "rawTitle": "ចេមង \"ររពុកែម៉ខុំ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 59,
        "title": "មេរៀនទី ៥៩៖ អំន \"មុខរបរអកភូមិខុំ\"",
        "rawTitle": "អំន \"មុខរបរអកភូមិខុំ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 60,
        "title": "មេរៀនទី ៦០៖ អំន \"េដីមេត\"",
        "rawTitle": "អំន \"េដីមេត\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 61,
        "title": "មេរៀនទី ៦១៖ េមសូត \"កិចរេ\"",
        "rawTitle": "េមសូត \"កិចរេ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 62,
        "title": "មេរៀនទី ៦២៖ អំន \"ជនីភំេពញ\"",
        "rawTitle": "អំន \"ជនីភំេពញ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 63,
        "title": "មេរៀនទី ៦៣៖ អំន \"ភូមិរុងេរង\"",
        "rawTitle": "អំន \"ភូមិរុងេរង\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 64,
        "title": "មេរៀនទី ៦៤៖ អំន \"ផឹកទឹកកខក់ំឱេកីតជំងឺ\"",
        "rawTitle": "អំន \"ផឹកទឹកកខក់ំឱេកីតជំងឺ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 65,
        "title": "មេរៀនទី ៦៥៖ អំន \"សតលលកនិងសេច\"",
        "rawTitle": "អំន \"សតលលកនិងសេច\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 68,
        "title": "មេរៀនទី ៦៨៖ អំន \"េរងប់ និងដំរ ី\"",
        "rawTitle": "អំន \"េរងប់ និងដំរ ី\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 67,
        "title": "មេរៀនទី ៦៧៖ អំន \"វតុេបីស់េកុងផះ\"",
        "rawTitle": "អំន \"វតុេបីស់េកុងផះ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 68,
        "title": "មេរៀនទី ៦៨៖ រប់េរង \"ដឹងសងដឹង អំែបងសងអំែបង\"",
        "rawTitle": "រប់េរង \"ដឹងសងដឹង អំែបងសងអំែបង\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 69,
        "title": "មេរៀនទី ៦៩៖ អំន \"បឹងទេនប\"",
        "rawTitle": "អំន \"បឹងទេនប\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 70,
        "title": "មេរៀនទី ៧០៖ អំនេរង \"សមរងគីងក់ និងពហ\"",
        "rawTitle": "អំនេរង \"សមរងគីងក់ និងពហ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 71,
        "title": "មេរៀនទី ៧១៖ អំន \"េរងដងូវនិងែកក\"",
        "rawTitle": "អំន \"េរងដងូវនិងែកក\"",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 72,
        "title": "មេរៀនទី ៧២៖ េមសូត \"ចរដំំ\"",
        "rawTitle": "េមសូត \"ចរដំំ\"",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 73,
        "title": "មេរៀនទី ៧៣៖ អំន \"ផរេភូមិខុំ\"",
        "rawTitle": "អំន \"ផរេភូមិខុំ\"",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 74,
        "title": "មេរៀនទី ៧៤៖ រនិយ \"រេបបេធបទីកែនង និងវតុ\"",
        "rawTitle": "រនិយ \"រេបបេធបទីកែនង និងវតុ\"",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 75,
        "title": "មេរៀនទី ៧៥៖ អំន \"េរងេមកចនិងពស់\"",
        "rawTitle": "អំន \"េរងេមកចនិងពស់\"",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 76,
        "title": "មេរៀនទី ៧៦៖ អំន \"េកងសុចរ ិត\"",
        "rawTitle": "អំន \"េកងសុចរ ិត\"",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 77,
        "title": "មេរៀនទី ៧៧៖ អំន \"ជីដូនជី\"",
        "rawTitle": "អំន \"ជីដូនជី\"",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 78,
        "title": "មេរៀនទី ៧៨៖ អំន \"េសចកីជូនដំណឹង\"",
        "rawTitle": "អំន \"េសចកីជូនដំណឹង\"",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 79,
        "title": "មេរៀនទី ៧៩៖ អំន \"េរងសតត\"",
        "rawTitle": "អំន \"េរងសតត\"",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 80,
        "title": "មេរៀនទី ៨០៖ អំន \"ៃថបុណចូលំ\"",
        "rawTitle": "អំន \"ៃថបុណចូលំ\"",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 81,
        "title": "មេរៀនទី ៨១៖ អំន \"បុណភុំបិណ\"",
        "rawTitle": "អំន \"បុណភុំបិណ\"",
        "month": "មករា",
        "page": 3
      }
    ]
  },
  {
    "id": "BK_G2_MATH",
    "grade": "ថ្នាក់ទី២",
    "subject": "គណិតវិទ្យា",
    "subjectKey": "math",
    "title": "គណិតវិទ្យា ថ្នាក់ទី២",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
    "icon": "fa-calculator",
    "pdfPath": "textbooks/curriculum_grade_២.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ចំនួនដល់",
        "rawTitle": "ចំនួនដល់",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ រេបបេធបចំនួន",
        "rawTitle": "រេបបេធបចំនួន",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ វ ិធីបូកចំនួននេលខ ២ខង់",
        "rawTitle": "វ ិធីបូកចំនួននេលខ ២ខង់",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ វ ិធីដកចំនួននេលខ២ខង់",
        "rawTitle": "វ ិធីដកចំនួននេលខ២ខង់",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ វ ិធីគុណ",
        "rawTitle": "វ ិធីគុណ",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ បគ",
        "rawTitle": "បគ",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ វ ិធីែចក",
        "rawTitle": "វ ិធីែចក",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ បែវង",
        "rawTitle": "បែវង",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ ទមន់",
        "rawTitle": "ទមន់",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 10,
        "title": "មេរៀនទី ១០៖ ចំណុះ",
        "rawTitle": "ចំណុះ",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 11,
        "title": "មេរៀនទី ១១៖ វ ិធីបូកចំនួននេលខ៣ខង់",
        "rawTitle": "វ ិធីបូកចំនួននេលខ៣ខង់",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 12,
        "title": "មេរៀនទី ១២៖ វ ិធីដកចំនួននេលខ៣ខង់នឹង២ខង់",
        "rawTitle": "វ ិធីដកចំនួននេលខ៣ខង់នឹង២ខង់",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 13,
        "title": "មេរៀនទី ១៣៖ រូបិយវតុ",
        "rawTitle": "រូបិយវតុ",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 14,
        "title": "មេរៀនទី ១៤៖ ធរណីត",
        "rawTitle": "ធរណីត",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 15,
        "title": "មេរៀនទី ១៥៖ េពលេវ",
        "rawTitle": "េពលេវ",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 16,
        "title": "មេរៀនទី ១៦៖ ទិនន័យ",
        "rawTitle": "ទិនន័យ",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 17,
        "title": "មេរៀនទី ១៧៖ លំំគំរូ",
        "rawTitle": "លំំគំរូ",
        "month": "មករា",
        "page": 8
      }
    ]
  },
  {
    "id": "BK_G2_SOCIAL_SCI",
    "grade": "ថ្នាក់ទី២",
    "subject": "វិទ្យាសាស្ត្រ និងសិក្សាសង្គម",
    "subjectKey": "social_sci",
    "title": "វិទ្យាសាស្ត្រ និងសិក្សាសង្គម ថ្នាក់ទី២",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
    "icon": "fa-flask",
    "pdfPath": "textbooks/curriculum_grade_២.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ វិណំរបស់ខុំ",
        "rawTitle": "វិណំរបស់ខុំ",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ែសកតនិងេធញរឹងំ",
        "rawTitle": "ែសកតនិងេធញរឹងំ",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ កិចរបំៃថរបស់ខុំ",
        "rawTitle": "កិចរបំៃថរបស់ខុំ",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ ចំណីរត",
        "rawTitle": "ចំណីរត",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ ទប់លេេរន",
        "rawTitle": "ទប់លេេរន",
        "month": "មករា",
        "page": 10
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ សុវតិពខុំកុងរេធីដំេណីរ",
        "rawTitle": "សុវតិពខុំកុងរេធីដំេណីរ",
        "month": "មករា",
        "page": 10
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ សុវតិពកុងរេលងទឹក",
        "rawTitle": "សុវតិពកុងរេលងទឹក",
        "month": "មករា",
        "page": 10
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ រេជសងពីរគមកំែហង",
        "rawTitle": "រេជសងពីរគមកំែហង",
        "month": "មករា",
        "page": 10
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ រលូតស់របស់ខុំ",
        "rawTitle": "រលូតស់របស់ខុំ",
        "month": "មករា",
        "page": 10
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ បេភទចំណីរ",
        "rawTitle": "បេភទចំណីរ",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ រុកតិែដលខុំំ",
        "rawTitle": "រុកតិែដលខុំំ",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ សតែដលខុំចិឹម",
        "rawTitle": "សតែដលខុំចិឹម",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ រស់ទីរបស់សត",
        "rawTitle": "រស់ទីរបស់សត",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ទីំងេរននិងភូនិខុំ",
        "rawTitle": "ទីំងេរននិងភូនិខុំ",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ បវតិេរននិងភូមិខុំ",
        "rawTitle": "បវតិេរននិងភូមិខុំ",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ខុំជួយែថំេរន",
        "rawTitle": "ខុំជួយែថំេរន",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ ខុំត់ំ",
        "rawTitle": "ខុំត់ំ",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ ខុំេរនេចង",
        "rawTitle": "ខុំេរនេចង",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ពះមកតនិងអកដឹកំបេទស",
        "rawTitle": "ពះមកតនិងអកដឹកំបេទស",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ វតុេជុំវិញេយីង",
        "rawTitle": "វតុេជុំវិញេយីង",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ វតុេេលីេមឃ",
        "rawTitle": "វតុេេលីេមឃ",
        "month": "មករា",
        "page": 13
      }
    ]
  },
  {
    "id": "BK_G1_KHMER",
    "grade": "ថ្នាក់ទី១",
    "subject": "ភាសាខ្មែរ",
    "subjectKey": "khmer",
    "title": "ភាសាខ្មែរ ថ្នាក់ទី១",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
    "icon": "fa-book",
    "pdfPath": "textbooks/curriculum_grade_១.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ េរនគូសបត់និងែខេង",
        "rawTitle": "េរនគូសបត់និងែខេង",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ចេមងសៈ",
        "rawTitle": "ចេមងសៈ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ សៈនិស័យ",
        "rawTitle": "សៈនិស័យ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ សៈនិស័យ",
        "rawTitle": "សៈនិស័យ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ ពនៈ ៣៣តួ",
        "rawTitle": "ពនៈ ៣៣តួ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ ក",
        "rawTitle": "ក",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ ខ",
        "rawTitle": "ខ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ ច",
        "rawTitle": "ច",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ ឆ",
        "rawTitle": "ឆ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ ដ",
        "rawTitle": "ដ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 10,
        "title": "មេរៀនទី ១០៖ ឋ",
        "rawTitle": "ឋ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 11,
        "title": "មេរៀនទី ១១៖ ណ",
        "rawTitle": "ណ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 12,
        "title": "មេរៀនទី ១២៖ ត ថ",
        "rawTitle": "ត ថ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 13,
        "title": "មេរៀនទី ១៣៖ ប ផ",
        "rawTitle": "ប ផ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 14,
        "title": "មេរៀនទី ១៤៖ ស ហ",
        "rawTitle": "ស ហ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 15,
        "title": "មេរៀនទី ១៥៖ ឡ អ",
        "rawTitle": "ឡ អ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 16,
        "title": "មេរៀនទី ១៦៖ គ",
        "rawTitle": "គ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 17,
        "title": "មេរៀនទី ១៧៖ ឃ",
        "rawTitle": "ឃ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 18,
        "title": "មេរៀនទី ១៨៖ ង",
        "rawTitle": "ង",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 19,
        "title": "មេរៀនទី ១៩៖ ជ",
        "rawTitle": "ជ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 20,
        "title": "មេរៀនទី ២០៖ ឈ",
        "rawTitle": "ឈ",
        "month": "មករា",
        "page": 1
      },
      {
        "num": 21,
        "title": "មេរៀនទី ២១៖ ញ",
        "rawTitle": "ញ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 22,
        "title": "មេរៀនទី ២២៖ ឌ",
        "rawTitle": "ឌ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 23,
        "title": "មេរៀនទី ២៣៖ ឍ",
        "rawTitle": "ឍ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 24,
        "title": "មេរៀនទី ២៤៖ ទ ធ",
        "rawTitle": "ទ ធ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 25,
        "title": "មេរៀនទី ២៥៖ ន ព",
        "rawTitle": "ន ព",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 26,
        "title": "មេរៀនទី ២៦៖ ភ ម",
        "rawTitle": "ភ ម",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 27,
        "title": "មេរៀនទី ២៧៖ យ រ",
        "rawTitle": "យ រ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 28,
        "title": "មេរៀនទី ២៨៖ ល វ",
        "rawTitle": "ល វ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 29,
        "title": "មេរៀនទី ២៩៖ បទចេមង \"រិែកវេអីយ\"",
        "rawTitle": "បទចេមង \"រិែកវេអីយ\"",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 30,
        "title": "មេរៀនទី ៣០៖ ង៉",
        "rawTitle": "ង៉",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 31,
        "title": "មេរៀនទី ៣១៖ ញ៉",
        "rawTitle": "ញ៉",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 32,
        "title": "មេរៀនទី ៣២៖ ប៉",
        "rawTitle": "ប៉",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 33,
        "title": "មេរៀនទី ៣៣៖ ម៉",
        "rawTitle": "ម៉",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 34,
        "title": "មេរៀនទី ៣៤៖ យ៉",
        "rawTitle": "យ៉",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 35,
        "title": "មេរៀនទី ៣៥៖ រ ៉",
        "rawTitle": "រ ៉",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 36,
        "title": "មេរៀនទី ៣៦៖ វ ៉",
        "rawTitle": "វ ៉",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 37,
        "title": "មេរៀនទី ៣៧៖ ប៊",
        "rawTitle": "ប៊",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 38,
        "title": "មេរៀនទី ៣៨៖ ស៊",
        "rawTitle": "ស៊",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 39,
        "title": "មេរៀនទី ៣៩៖ ហ៊",
        "rawTitle": "ហ៊",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 40,
        "title": "មេរៀនទី ៤០៖ អ៊",
        "rawTitle": "អ៊",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 41,
        "title": "មេរៀនទី ៤១៖ ែម៉ឪនគុណ",
        "rawTitle": "ែម៉ឪនគុណ",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 42,
        "title": "មេរៀនទី ៤២៖ បកបនឹង ក ក់",
        "rawTitle": "បកបនឹង ក ក់",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 43,
        "title": "មេរៀនទី ៤៣៖ បកបនឹង ក ក់ (ត)",
        "rawTitle": "បកបនឹង ក ក់ (ត)",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 44,
        "title": "មេរៀនទី ៤៤៖ បកបនឹង ង ង់",
        "rawTitle": "បកបនឹង ង ង់",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 45,
        "title": "មេរៀនទី ៤៥៖ បកបនឹង ង ង់ (ត)",
        "rawTitle": "បកបនឹង ង ង់ (ត)",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 46,
        "title": "មេរៀនទី ៤៦៖ បកបនឹង ច ច់",
        "rawTitle": "បកបនឹង ច ច់",
        "month": "មករា",
        "page": 2
      },
      {
        "num": 47,
        "title": "មេរៀនទី ៤៧៖ បកបនឹង ច ច់ (ត)",
        "rawTitle": "បកបនឹង ច ច់ (ត)",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 48,
        "title": "មេរៀនទី ៤៨៖ បកបនឹង ញ ញ់",
        "rawTitle": "បកបនឹង ញ ញ់",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 49,
        "title": "មេរៀនទី ៤៩៖ បកបនឹង ញ ញ់ (ត)",
        "rawTitle": "បកបនឹង ញ ញ់ (ត)",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 50,
        "title": "មេរៀនទី ៥០៖ បកបនឹង ត ត់",
        "rawTitle": "បកបនឹង ត ត់",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 51,
        "title": "មេរៀនទី ៥១៖ បកបនឹង ត ត់ (ត)",
        "rawTitle": "បកបនឹង ត ត់ (ត)",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 52,
        "title": "មេរៀនទី ៥២៖ បកបនឹង ន ន់",
        "rawTitle": "បកបនឹង ន ន់",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 53,
        "title": "មេរៀនទី ៥៣៖ បកបនឹង ន ន់ (ត)",
        "rawTitle": "បកបនឹង ន ន់ (ត)",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 54,
        "title": "មេរៀនទី ៥៤៖ បកបនឹង ប ប់",
        "rawTitle": "បកបនឹង ប ប់",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 55,
        "title": "មេរៀនទី ៥៥៖ បកបនឹង ប ប់ (ត)",
        "rawTitle": "បកបនឹង ប ប់ (ត)",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 56,
        "title": "មេរៀនទី ៥៦៖ បកបនឹង ម",
        "rawTitle": "បកបនឹង ម",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 57,
        "title": "មេរៀនទី ៥៧៖ បកបនឹង ម (ត)",
        "rawTitle": "បកបនឹង ម (ត)",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 58,
        "title": "មេរៀនទី ៥៨៖ បកបនឹង យ",
        "rawTitle": "បកបនឹង យ",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 59,
        "title": "មេរៀនទី ៥៩៖ បកបនឹង យ (ត)",
        "rawTitle": "បកបនឹង យ (ត)",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 60,
        "title": "មេរៀនទី ៦០៖ បកបនឹង ល ល់",
        "rawTitle": "បកបនឹង ល ល់",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 61,
        "title": "មេរៀនទី ៦១៖ បកបនឹង ល ល់ (ត)",
        "rawTitle": "បកបនឹង ល ល់ (ត)",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 62,
        "title": "មេរៀនទី ៦២៖ បកបនឹង វ",
        "rawTitle": "បកបនឹង វ",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 63,
        "title": "មេរៀនទី ៦៣៖ បកបនឹង ស ស់",
        "rawTitle": "បកបនឹង ស ស់",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 64,
        "title": "មេរៀនទី ៦៤៖ បកបនឹង ស  ស់ (ត)",
        "rawTitle": "បកបនឹង ស  ស់ (ត)",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 65,
        "title": "មេរៀនទី ៦៥៖ សៈេពញតួៈ អ  ឥ  ឦ ឧ ឩ ឪ",
        "rawTitle": "សៈេពញតួៈ អ  ឥ  ឦ ឧ ឩ ឪ",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 66,
        "title": "មេរៀនទី ៦៦៖ សៈេពញតួ (ត)◌ៈ ឫ ឬ ឭ ឮ ឯ  ឰ ឱ ឳ",
        "rawTitle": "សៈេពញតួ (ត)◌ៈ ឫ ឬ ឭ ឮ ឯ  ឰ ឱ ឳ",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 67,
        "title": "មេរៀនទី ៦៧៖ ពពនៈនិងេជីងពពនៈ",
        "rawTitle": "ពពនៈនិងេជីងពពនៈ",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 68,
        "title": "មេរៀនទី ៦៨៖ េផីេជីង ក ក ក ក",
        "rawTitle": "េផីេជីង ក ក ក ក",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 69,
        "title": "មេរៀនទី ៦៩៖ េផីេជីង ក ក ក ក ក",
        "rawTitle": "េផីេជីង ក ក ក ក ក",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 70,
        "title": "មេរៀនទី ៧០៖ េផីេជីង ខ ខ ខ ខ",
        "rawTitle": "េផីេជីង ខ ខ ខ ខ",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 71,
        "title": "មេរៀនទី ៧១៖ េផីេជីង ខ ខ ខ ខ ខ",
        "rawTitle": "េផីេជីង ខ ខ ខ ខ ខ",
        "month": "មករា",
        "page": 3
      },
      {
        "num": 72,
        "title": "មេរៀនទី ៧២៖ េផីេជីង គ គ គ",
        "rawTitle": "េផីេជីង គ គ គ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 73,
        "title": "មេរៀនទី ៧៣៖ េផីេជីង ឃ ឃ ឃ ឃ ឃ",
        "rawTitle": "េផីេជីង ឃ ឃ ឃ ឃ ឃ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 74,
        "title": "មេរៀនទី ៧៤៖ ចេមង \"េពលេដីរេ\"",
        "rawTitle": "ចេមង \"េពលេដីរេ\"",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 75,
        "title": "មេរៀនទី ៧៥៖ េផីេជីង ច ច ច ច",
        "rawTitle": "េផីេជីង ច ច ច ច",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 76,
        "title": "មេរៀនទី ៧៦៖ េផីេជីង ឆ ឆ ឆ ឆ",
        "rawTitle": "េផីេជីង ឆ ឆ ឆ ឆ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 77,
        "title": "មេរៀនទី ៧៧៖ េផីេជីង ឆ ឆ ឆ ឆ",
        "rawTitle": "េផីេជីង ឆ ឆ ឆ ឆ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 78,
        "title": "មេរៀនទី ៧៨៖ េផីេជីង ជ ជ",
        "rawTitle": "េផីេជីង ជ ជ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 79,
        "title": "មេរៀនទី ៧៩៖ េផីេជីង ឈ ឈ ឈ ឈ ឈ",
        "rawTitle": "េផីេជីង ឈ ឈ ឈ ឈ ឈ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 80,
        "title": "មេរៀនទី ៨០៖ េផីេជីង ត ត ត",
        "rawTitle": "េផីេជីង ត ត ត",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 81,
        "title": "មេរៀនទី ៨១៖ េផីេជីង ថ ថ ថ ថ ថ ថ",
        "rawTitle": "េផីេជីង ថ ថ ថ ថ ថ ថ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 82,
        "title": "មេរៀនទី ៨២៖ េផីេជីង ទ ទ",
        "rawTitle": "េផីេជីង ទ ទ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 83,
        "title": "មេរៀនទី ៨៣៖ េផីេជីង ធ ធ ធ",
        "rawTitle": "េផីេជីង ធ ធ ធ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 84,
        "title": "មេរៀនទី ៨៤៖ េផីេជីង ប ប ប ប",
        "rawTitle": "េផីេជីង ប ប ប ប",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 85,
        "title": "មេរៀនទី ៨៥៖ េផីេជីង ផ ផ ផ ផ",
        "rawTitle": "េផីេជីង ផ ផ ផ ផ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 86,
        "title": "មេរៀនទី ៨៦៖ េផីេជីង ផ ផ ផ ផ ផ ផ",
        "rawTitle": "េផីេជីង ផ ផ ផ ផ ផ ផ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 87,
        "title": "មេរៀនទី ៨៧៖ េផីេជីង ព ព ព ព",
        "rawTitle": "េផីេជីង ព ព ព ព",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 88,
        "title": "មេរៀនទី ៨៨៖ េផីេជីង ភ ភ ភ ភ ភ",
        "rawTitle": "េផីេជីង ភ ភ ភ ភ ភ",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 89,
        "title": "មេរៀនទី ៨៩៖ េផីេជីង ម ម ម ម",
        "rawTitle": "េផីេជីង ម ម ម ម",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 90,
        "title": "មេរៀនទី ៩០៖ េផីេជីង ម ម ម ម",
        "rawTitle": "េផីេជីង ម ម ម ម",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 91,
        "title": "មេរៀនទី ៩១៖ េផីេជីង ម ម ម ម ម",
        "rawTitle": "េផីេជីង ម ម ម ម ម",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 92,
        "title": "មេរៀនទី ៩២៖ េផីេជីង ល ល ល ល",
        "rawTitle": "េផីេជីង ល ល ល ល",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 93,
        "title": "មេរៀនទី ៩៣៖ េផីេជីង ស ស ស ស ស",
        "rawTitle": "េផីេជីង ស ស ស ស ស",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 94,
        "title": "មេរៀនទី ៩៤៖ េផីេជីង ស ស ស ស ស  ស",
        "rawTitle": "េផីេជីង ស ស ស ស ស  ស",
        "month": "មករា",
        "page": 4
      },
      {
        "num": 95,
        "title": "មេរៀនទី ៩៥៖ ពងតមត ង ង ង ង ង ង",
        "rawTitle": "ពងតមត ង ង ង ង ង ង",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 96,
        "title": "មេរៀនទី ៩៦៖ ពងតមត ង ង ង",
        "rawTitle": "ពងតមត ង ង ង",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 97,
        "title": "មេរៀនទី ៩៧៖ ពងតមត",
        "rawTitle": "ពងតមត",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 98,
        "title": "មេរៀនទី ៩៨៖ ពងតមត ណ ណ ណ",
        "rawTitle": "ពងតមត ណ ណ ណ",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 100,
        "title": "មេរៀនទី ១០០៖ ពងតមត ម ម ម ម ម",
        "rawTitle": "ពងតមត ម ម ម ម ម",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 101,
        "title": "មេរៀនទី ១០១៖ ពងតមត ង ង",
        "rawTitle": "ពងតមត ង ង",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 102,
        "title": "មេរៀនទី ១០២៖ ពងតមត",
        "rawTitle": "ពងតមត",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 103,
        "title": "មេរៀនទី ១០៣៖ អកគខុំ",
        "rawTitle": "អកគខុំ",
        "month": "មករា",
        "page": 5
      },
      {
        "num": 104,
        "title": "មេរៀនទី ១០៤៖ េរនខុំ",
        "rawTitle": "េរនខុំ",
        "month": "មករា",
        "page": 5
      }
    ]
  },
  {
    "id": "BK_G1_MATH",
    "grade": "ថ្នាក់ទី១",
    "subject": "គណិតវិទ្យា",
    "subjectKey": "math",
    "title": "គណិតវិទ្យា ថ្នាក់ទី១",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
    "icon": "fa-calculator",
    "pdfPath": "textbooks/curriculum_grade_១.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ ទំហំ",
        "rawTitle": "ទំហំ",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ទីំង",
        "rawTitle": "ទីំង",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ចំ នួន ០ ដល់",
        "rawTitle": "ចំ នួន ០ ដល់",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ ចំនួន ១ ដល់",
        "rawTitle": "ចំនួន ១ ដល់",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ រេបបេធបចំនួន",
        "rawTitle": "រេបបេធបចំនួន",
        "month": "មករា",
        "page": 6
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ វ ិធីបូក និងវ ិធីដក",
        "rawTitle": "វ ិធីបូក និងវ ិធីដក",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 7,
        "title": "មេរៀនទី ៧៖ វ ិធីបូក និងវ ិធីដកចំនួនែដលនេលខ ១ខង់",
        "rawTitle": "វ ិធីបូក និងវ ិធីដកចំនួនែដលនេលខ ១ខង់",
        "month": "មករា",
        "page": 7
      },
      {
        "num": 8,
        "title": "មេរៀនទី ៨៖ ចំែណក",
        "rawTitle": "ចំែណក",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 9,
        "title": "មេរៀនទី ៩៖ ធរណីត",
        "rawTitle": "ធរណីត",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 10,
        "title": "មេរៀនទី ១០៖ ចំនួន ១០ ដល់",
        "rawTitle": "ចំនួន ១០ ដល់",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 11,
        "title": "មេរៀនទី ១១៖ វ ិធីដក វ ិធីបូកចំនួនដល់",
        "rawTitle": "វ ិធីដក វ ិធីបូកចំនួនដល់",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 12,
        "title": "មេរៀនទី ១២៖ បែវង",
        "rawTitle": "បែវង",
        "month": "មករា",
        "page": 8
      },
      {
        "num": 13,
        "title": "មេរៀនទី ១៣៖ ទមន់",
        "rawTitle": "ទមន់",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 14,
        "title": "មេរៀនទី ១៤៖ ចំំណុះ",
        "rawTitle": "ចំំណុះ",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 15,
        "title": "មេរៀនទី ១៥៖ េពលេវ",
        "rawTitle": "េពលេវ",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 16,
        "title": "មេរៀនទី ១៦៖ បរូបព",
        "rawTitle": "បរូបព",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 17,
        "title": "មេរៀនទី ១៧៖ ចំនួន និងតៃមេលខមខង់",
        "rawTitle": "ចំនួន និងតៃមេលខមខង់",
        "month": "មករា",
        "page": 9
      },
      {
        "num": 18,
        "title": "មេរៀនទី ១៨៖ រូបិយវតុ",
        "rawTitle": "រូបិយវតុ",
        "month": "មករា",
        "page": 10
      },
      {
        "num": 19,
        "title": "មេរៀនទី ១៩៖ លំំគំរូ",
        "rawTitle": "លំំគំរូ",
        "month": "មករា",
        "page": 10
      }
    ]
  },
  {
    "id": "BK_G1_SOCIAL_SCI",
    "grade": "ថ្នាក់ទី១",
    "subject": "វិទ្យាសាស្ត្រ និងសិក្សាសង្គម",
    "subjectKey": "social_sci",
    "title": "វិទ្យាសាស្ត្រ និងសិក្សាសង្គម ថ្នាក់ទី១",
    "publisher": "ក្រសួងអប់រំ យុវជន និងកីឡា",
    "edition": "កម្មវិធីសិក្សាផ្លូវការ",
    "coverColor": "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
    "icon": "fa-flask",
    "pdfPath": "textbooks/curriculum_grade_១.pdf",
    "lessons": [
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ សជិកគរខុំ",
        "rawTitle": "សជិកគរខុំ",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ទប់លរបស់គរខុំ",
        "rawTitle": "ទប់លរបស់គរខុំ",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ខូនណខុំ",
        "rawTitle": "ខូនណខុំ",
        "month": "មករា",
        "page": 11
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ អម័យខួនណ",
        "rawTitle": "អម័យខួនណ",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ ចំណីរ",
        "rawTitle": "ចំណីរ",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ កែនងែដលខុំរស់េ",
        "rawTitle": "កែនងែដលខុំរស់េ",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ របរេះក់េមផះ",
        "rawTitle": "របរេះក់េមផះ",
        "month": "មករា",
        "page": 12
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ វតុ សត រុកតិេផះខុំ",
        "rawTitle": "វតុ សត រុកតិេផះខុំ",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ រុកតិែដលខុំល់",
        "rawTitle": "រុកតិែដលខុំល់",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 5,
        "title": "មេរៀនទី ៥៖ សតែដលខុំល់",
        "rawTitle": "សតែដលខុំល់",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 6,
        "title": "មេរៀនទី ៦៖ វតុែដលខុំល់",
        "rawTitle": "វតុែដលខុំល់",
        "month": "មករា",
        "page": 13
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ កិចរខុំេផះនិងេេរន",
        "rawTitle": "កិចរខុំេផះនិងេេរន",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ របរេះក់មដងផូវ",
        "rawTitle": "របរេះក់មដងផូវ",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ទប់លេេរន",
        "rawTitle": "ទប់លេេរន",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 1,
        "title": "មេរៀនទី ១៖ េពលៃថ និងេពលយប់",
        "rawTitle": "េពលៃថ និងេពលយប់",
        "month": "មករា",
        "page": 14
      },
      {
        "num": 2,
        "title": "មេរៀនទី ២៖ ចលមនុស និងធមតិេភូមិខុំ",
        "rawTitle": "ចលមនុស និងធមតិេភូមិខុំ",
        "month": "មករា",
        "page": 15
      },
      {
        "num": 3,
        "title": "មេរៀនទី ៣៖ ចេមង និងរកមន",
        "rawTitle": "ចេមង និងរកមន",
        "month": "មករា",
        "page": 15
      },
      {
        "num": 4,
        "title": "មេរៀនទី ៤៖ ររហតកម",
        "rawTitle": "ររហតកម",
        "month": "មករា",
        "page": 15
      }
    ]
  }
];

// Library Component State
const libraryState = {
  activeGrade: "all",
  activeSubject: "all",
  searchKeyword: "",
  allBooks: [...OFFICIAL_PRELOADED_BOOKS],
  activeReaderBook: null,
  activeReaderBlobUrl: null
};

// Initialize Library
async function initLibraryAsync() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("libGrade")) {
      libraryState.activeGrade = urlParams.get("libGrade");
    }
    if (urlParams.get("libSubj")) {
      libraryState.activeSubject = urlParams.get("libSubj");
    }
  } catch (e) {}
  try {
    const customBooks = await getAllCustomBooks();
    libraryState.allBooks = [...OFFICIAL_PRELOADED_BOOKS, ...customBooks];

    const db = await openLibraryDB();
    if (db) {
      const tx = db.transaction(STORE_PDFS, "readonly");
      const store = tx.objectStore(STORE_PDFS);
      const req = store.getAllKeys();
      req.onsuccess = (e) => {
        storedPdfIdsCache.clear();
        (e.target.result || []).forEach(id => storedPdfIdsCache.add(id));
        updatePdfBadgesInDOM();
      };
    }
  } catch (e) {
    console.error("initLibraryAsync error:", e);
  }
}

// Update PDF availability badges
function updatePdfBadgesInDOM() {
  libraryState.allBooks.forEach(b => {
    const badgeEl = document.getElementById("pdf-badge-" + b.id);
    if (badgeEl) {
      const hasPdf = storedPdfIdsCache.has(b.id) || !!b.pdfPath;
      if (hasPdf) {
        badgeEl.innerHTML = '<span class="badge-pdf-ready"><i class="fa fa-file-pdf"></i> PDF ផ្លូវការ</span>';
      } else {
        badgeEl.innerHTML = '<span class="badge-pdf-missing"><i class="fa fa-circle-exclamation"></i> មិនទាន់មាន PDF</span>';
      }
    }
  });
}

// Primary Render function called on tab switch
function renderLibrary() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("libGrade")) {
      libraryState.activeGrade = urlParams.get("libGrade");
    }
    if (urlParams.get("libSubj")) {
      libraryState.activeSubject = urlParams.get("libSubj");
    }
  } catch (e) {}

  renderLibraryGradePills();
  renderLibrarySubjectTabs();
  renderLibraryBooksGrid();

  // Async load custom books & badges in background
  initLibraryAsync().then(() => {
    renderLibraryGradePills();
    renderLibraryBooksGrid();
  });
}
window.renderLibrary = renderLibrary;

// Render Grade Pills
function renderLibraryGradePills() {
  const container = document.getElementById("libraryGradePills");
  if (!container) return;

  const grades = [
    { key: "all", label: "ទាំងអស់" },
    { key: "ថ្នាក់មត្តេយ្យ", label: "ថ្នាក់មត្តេយ្យ" },
    { key: "ថ្នាក់ទី១", label: "ថ្នាក់ទី១" },
    { key: "ថ្នាក់ទី២", label: "ថ្នាក់ទី២" },
    { key: "ថ្នាក់ទី៣", label: "ថ្នាក់ទី៣" },
    { key: "ថ្នាក់ទី៤", label: "ថ្នាក់ទី៤" },
    { key: "ថ្នាក់ទី៥", label: "ថ្នាក់ទី៥" },
    { key: "ថ្នាក់ទី៦", label: "ថ្នាក់ទី៦" }
  ];

  let html = "";
  grades.forEach(g => {
    let countBadge = "";
    if (g.key === "all") {
      countBadge = '<span class="pill-count">' + libraryState.allBooks.length + '</span>';
    } else {
      const count = libraryState.allBooks.filter(b => b.grade === g.key).length;
      if (count === 0) {
        countBadge = '<span class="pill-count pill-count-empty">ទទេ</span>';
      } else {
        countBadge = '<span class="pill-count">' + count + '</span>';
      }
    }
    const isActive = libraryState.activeGrade === g.key ? "active" : "";
    html += `
      <button type="button" class="lib-grade-pill ${isActive}" onclick="filterLibraryByGrade('${g.key}')">
        <span>${g.label}</span>
        ${countBadge}
      </button>
    `;
  });

  container.innerHTML = html;
}

// Render Subject Tabs
function renderLibrarySubjectTabs() {
  const container = document.getElementById("librarySubjectTabs");
  if (!container) return;

  const subjects = [
    { key: "all", label: "មុខវិជ្ជាទាំងអស់" },
    { key: "khmer", label: "ភាសាខ្មែរ" },
    { key: "math", label: "គណិតវិទ្យា" },
    { key: "social", label: "សិក្សាសង្គម" },
    { key: "science", label: "វិទ្យាសាស្ត្រ" },
    { key: "english", label: "ភាសាអង់គ្លេស" }
  ];

  let html = "";
  subjects.forEach(s => {
    const isActive = libraryState.activeSubject === s.key ? "active" : "";
    html += `
      <button type="button" class="lib-subj-btn ${isActive}" onclick="filterLibraryBySubject('${s.key}')">
        ${s.label}
      </button>
    `;
  });

  container.innerHTML = html;
}

// Filter Grade
function filterLibraryByGrade(grade) {
  libraryState.activeGrade = grade;
  renderLibraryGradePills();
  renderLibraryBooksGrid();
}
window.filterLibraryByGrade = filterLibraryByGrade;

// Filter Subject
function filterLibraryBySubject(subj) {
  libraryState.activeSubject = subj;
  renderLibrarySubjectTabs();
  renderLibraryBooksGrid();
}
window.filterLibraryBySubject = filterLibraryBySubject;

// Handle Search
function handleLibrarySearch(kw) {
  libraryState.searchKeyword = kw;
  renderLibraryBooksGrid();
}
window.handleLibrarySearch = handleLibrarySearch;

function clearLibrarySearch() {
  libraryState.searchKeyword = "";
  const input = document.getElementById("librarySearchInput");
  if (input) input.value = "";
  renderLibraryBooksGrid();
}
window.clearLibrarySearch = clearLibrarySearch;

// Export Catalog to Excel
function exportLibraryCatalog() {
  if (typeof XLSX === 'undefined') {
    alert("សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងដំណើរការ...");
    return;
  }
  const rows = [
    ["ល.រ", "កម្រិតថ្នាក់", "មុខវិជ្ជា", "ចំណងជើងសៀវភៅ", "ចំនួនមេរៀនធំៗ", "ស្ថានភាព PDF", "អ្នកបោះពុម្ព"]
  ];
  libraryState.allBooks.forEach((b, idx) => {
    const hasPdf = storedPdfIdsCache.has(b.id) || !!b.pdfPath;
    rows.push([
      idx + 1,
      b.grade,
      b.subject,
      b.title,
      (b.lessons || []).length,
      hasPdf ? "មាន PDF ផ្លូវការ" : "មិនទាន់មាន PDF",
      b.publisher || "ក្រសួងអប់រំ យុវជន និងកីឡា"
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "បញ្ជីសៀវភៅបណ្ណាល័យ");
  XLSX.writeFile(wb, "បញ្ជីសៀវភៅពុម្ព_បណ្ណាល័យសាលាបឋមសិក្សាបាន្លួង.xlsx");
}
window.exportLibraryCatalog = exportLibraryCatalog;

// Render Books Grid (or Empty State)
function renderLibraryBooksGrid() {
  const grid = document.getElementById("libraryBooksGrid");
  if (!grid) return;

  let filtered = libraryState.allBooks;

  // Grade filter
  if (libraryState.activeGrade !== "all") {
    filtered = filtered.filter(b => b.grade === libraryState.activeGrade);
  }

  // Check if grade has 0 books -> EMPTY STATE
  if (filtered.length === 0) {
    const gradeName = libraryState.activeGrade === "all" ? "ទាំងអស់" : libraryState.activeGrade;
    grid.innerHTML = `
      <div class="library-empty-state">
        <div class="empty-icon"><i class="fa-solid fa-folder-open"></i></div>
        <h3 class="empty-title">ទទេ — មិនទាន់មានសៀវភៅរក្សាទុកក្នុងថ្នាក់នេះទេ</h3>
        <p class="empty-desc">កម្រិត <strong>${gradeName}</strong> មិនទាន់មានសៀវភៅពុម្ព ឬកម្មវិធីសិក្សាជាឯកសារ PDF រក្សាទុកក្នុងប្រព័ន្ធនៅឡើយទេ។</p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary btn-lg" onclick="openUploadBookModal('${libraryState.activeGrade !== 'all' ? libraryState.activeGrade : 'ថ្នាក់មត្តេយ្យ'}')">
            <i class="fa-solid fa-file-arrow-up"></i> នាំសៀវភៅចូលក្នុងបណ្ណាល័យ (Upload PDF)
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Subject filter
  if (libraryState.activeSubject !== "all") {
    filtered = filtered.filter(b => {
      if (libraryState.activeSubject === "khmer") return b.subjectKey === "khmer" || b.subject.includes("ភាសាខ្មែរ");
      if (libraryState.activeSubject === "math") return b.subjectKey === "math" || b.subject.includes("គណិត");
      if (libraryState.activeSubject === "social") return b.subjectKey === "social" || b.subjectKey === "social_sci" || b.subject.includes("សង្គម");
      if (libraryState.activeSubject === "science") return b.subjectKey === "science" || b.subjectKey === "social_sci" || b.subject.includes("វិទ្យា");
      if (libraryState.activeSubject === "english") return b.subjectKey === "english" || b.subject.includes("អង់គ្លេស");
      return true;
    });
  }

  // Search keyword
  if (libraryState.searchKeyword.trim()) {
    const kw = libraryState.searchKeyword.toLowerCase().trim();
    filtered = filtered.filter(b => {
      const matchTitle = (b.title || "").toLowerCase().includes(kw);
      const matchSub = (b.subject || "").toLowerCase().includes(kw);
      const matchGrade = (b.grade || "").toLowerCase().includes(kw);
      const matchLessons = b.lessons && b.lessons.some(l => (l.title || "").toLowerCase().includes(kw));
      return matchTitle || matchSub || matchGrade || matchLessons;
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="library-empty-state">
        <div class="empty-icon"><i class="fa fa-search"></i></div>
        <h3 class="empty-title">មិនមានលទ្ធផលស្វែងរក</h3>
        <p class="empty-desc">មិនមានសៀវភៅដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរក «${libraryState.searchKeyword}» ឡើយ</p>
        <button type="button" class="btn btn-secondary" onclick="clearLibrarySearch()">សម្អាតការស្វែងរក</button>
      </div>
    `;
    return;
  }

  let html = "";
  filtered.forEach(book => {
    const hasPdf = storedPdfIdsCache.has(book.id) || !!book.pdfPath;
    const lessonCount = (book.lessons || []).length;
    const coverGradient = book.coverColor || "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";
    const bookIcon = book.icon || "fa-book";

    html += `
      <div class="lib-book-card" id="book-card-${book.id}">
        <div class="lib-book-cover" style="background: ${coverGradient};">
          <div class="lib-cover-badges">
            <span class="lib-badge-grade">${book.grade}</span>
            <span class="lib-badge-sub">${book.subject}</span>
          </div>
          <div class="lib-cover-center">
            <i class="fa-solid ${bookIcon} lib-cover-icon"></i>
            <h4 class="lib-cover-title">${book.title}</h4>
            <div class="lib-cover-pub">${book.publisher || "ក្រសួងអប់រំ យុវជន និងកីឡា"}</div>
          </div>
          <div class="lib-cover-spine"></div>
        </div>
        <div class="lib-book-info">
          <div class="lib-book-meta">
            <div class="lib-meta-title" title="${book.title}">${book.title}</div>
            <div class="lib-meta-status" id="pdf-badge-${book.id}">
              ${hasPdf 
                ? '<span class="badge-pdf-ready"><i class="fa fa-file-pdf"></i> PDF ផ្លូវការ</span>' 
                : '<span class="badge-pdf-missing"><i class="fa fa-circle-exclamation"></i> មិនទាន់មាន PDF</span>'}
            </div>
          </div>
          <div class="lib-book-details">
            <span class="lib-detail-grade"><i class="fa fa-layer-group"></i> ${book.grade}</span>
            <span class="lib-detail-lessons"><i class="fa fa-list-check"></i> <strong>${lessonCount}</strong> មេរៀនធំៗ</span>
          </div>
          <div class="lib-book-actions">
            <button type="button" class="btn btn-sm btn-primary flex-1" onclick="openBookReader('${book.id}')">
              <i class="fa-solid fa-book-open"></i> បើកអាន (Read PDF)
            </button>
            <button type="button" class="btn btn-sm btn-action-outline" onclick="openBookLessonsModal('${book.id}')" title="មើលបញ្ជីមេរៀន">
              <i class="fa-solid fa-list-ul"></i> មេរៀន
            </button>
            ${book.isCustom ? `
              <button type="button" class="btn btn-sm btn-danger-ghost" onclick="deleteCustomBook('${book.id}')" title="លុបសៀវភៅ">
                <i class="fa fa-trash"></i>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

// ==========================================================================
// REAL-TIME PDF PARSER / INSPECTOR FOR UPLOADED BOOKS (PDF.js)
// ==========================================================================
async function inspectPdfFileForLessons(file) {
  const statusEl = document.getElementById("pdfScanStatus");
  const lessonsInput = document.getElementById("uploadBookLessons");
  const countBadge = document.getElementById("pdfLessonCountBadge");

  if (!statusEl) return;
  statusEl.style.display = "block";
  statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុងពិនិត្យមើលគ្រប់សន្លឹកនៃឯកសារ PDF...';

  try {
    if (!window.pdfjsLib) {
      statusEl.innerHTML = '<span class="text-amber"><i class="fa-solid fa-info-circle"></i> ឯកសារ PDF ត្រៀមរួចរាល់ (អាចបញ្ចូលមេរៀនដោយដៃ ឬប្រើទម្រង់ស្វ័យប្រវត្តិ)</span>';
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const detectedLessons = [];
    const lessonRegex = new RegExp('(?:េមេរ\\s*នទី|មេរៀនទី|ជំពូកទី|Unit|Lesson)\\s*([\\d០-៩]+)\\s*[:៖\\-]?\\s*([^\\n\\r]+)?', 'gi');

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ").replace(/\x00/g, "");

      let match;
      while ((match = lessonRegex.exec(pageText)) !== null) {
        const lNum = match[1];
        let lTitle = (match[2] || "").trim();
        // Remove trailing numbers or artifacts
        lTitle = lTitle.replace(/\s+\d+(\s+\d+)*$/, "").trim();
        
        if (!detectedLessons.some(l => String(l.num) === String(lNum))) {
          detectedLessons.push({
            num: lNum,
            title: lTitle ? "មេរៀនទី " + lNum + "៖ " + lTitle : "មេរៀនទី " + lNum,
            page: pageNum
          });
        }
      }
    }

    if (detectedLessons.length > 0) {
      statusEl.innerHTML = '<span class="text-success"><i class="fa-solid fa-circle-check"></i> ពិនិត្យឃើញសរុប <strong>' + numPages + '</strong> ទំព័រ • រកឃើញមេរៀនធំៗចំនួន <strong>' + detectedLessons.length + '</strong> មេរៀន!</span>';
      if (lessonsInput && (!lessonsInput.value || lessonsInput.value.trim() === "")) {
        lessonsInput.value = detectedLessons.map(l => l.title).join("\n");
      }
      if (countBadge) {
        countBadge.innerText = detectedLessons.length + " មេរៀន";
      }
    } else {
      statusEl.innerHTML = '<span class="text-primary"><i class="fa-solid fa-file-pdf"></i> ពិនិត្យឃើញសរុប <strong>' + numPages + '</strong> ទំព័រ (មិនឃើញស្លាកមេរៀនស្វ័យប្រវត្តិទេ លោកគ្រូអាចវាយបញ្ចូលខាងក្រោមបាន)</span>';
    }
  } catch (err) {
    console.warn("PDF inspection error:", err);
    statusEl.innerHTML = '<span class="text-muted"><i class="fa-solid fa-file-pdf"></i> ឯកសារ PDF ត្រូវបានផ្ទុក (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)</span>';
  }
}
window.inspectPdfFileForLessons = inspectPdfFileForLessons;

// Handle file input selection in Upload Modal
function handleBookPdfFileChosen(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    inspectPdfFileForLessons(file);
  }
}
window.handleBookPdfFileChosen = handleBookPdfFileChosen;

// ==========================================================================
// UPLOAD / IMPORT BOOK MODAL
// ==========================================================================
function openUploadBookModal(presetGrade) {
  const modal = document.getElementById("uploadBookModal");
  if (!modal) return;

  const gradeSelect = document.getElementById("uploadBookGrade");
  if (gradeSelect) {
    if (presetGrade && presetGrade !== "all") {
      gradeSelect.value = presetGrade;
    } else if (libraryState.activeGrade !== "all") {
      gradeSelect.value = libraryState.activeGrade;
    } else {
      gradeSelect.value = "ថ្នាក់មត្តេយ្យ";
    }
  }

  document.getElementById("uploadBookTitle").value = "";
  document.getElementById("uploadBookSubject").value = "ភាសាខ្មែរ";
  const lessonsInput = document.getElementById("uploadBookLessons");
  if (lessonsInput) lessonsInput.value = "";
  const fileInput = document.getElementById("uploadBookPdfFile");
  if (fileInput) fileInput.value = "";
  
  const statusEl = document.getElementById("pdfScanStatus");
  if (statusEl) {
    statusEl.style.display = "none";
    statusEl.innerHTML = "";
  }
  const badge = document.getElementById("pdfLessonCountBadge");
  if (badge) badge.innerText = "0 មេរៀន";

  modal.classList.add("active");
}
window.openUploadBookModal = openUploadBookModal;

function closeUploadBookModal() {
  const modal = document.getElementById("uploadBookModal");
  if (modal) modal.classList.remove("active");
}
window.closeUploadBookModal = closeUploadBookModal;

// Submit custom book upload
async function handleUploadBookSubmit(event) {
  event.preventDefault();

  const title = document.getElementById("uploadBookTitle").value.trim();
  const grade = document.getElementById("uploadBookGrade").value;
  const subject = document.getElementById("uploadBookSubject").value;
  const lessonsInput = document.getElementById("uploadBookLessons");
  const rawLessons = lessonsInput ? lessonsInput.value.trim() : "";
  const fileInput = document.getElementById("uploadBookPdfFile");

  if (!title) {
    alert("សូមបញ្ចូលចំណងជើងសៀវភៅ!");
    return;
  }

  const monthOrder = ["វិច្ឆិកា", "ធ្នូ", "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា"];
  let lessons = [];
  if (rawLessons) {
    const lines = rawLessons.split("\n").map(l => l.trim()).filter(l => l);
    lessons = lines.map((line, idx) => {
      const mIdx = idx % monthOrder.length;
      return {
        num: idx + 1,
        title: line.startsWith("មេរៀន") || line.startsWith("ជំពូក") ? line : "មេរៀនទី " + (idx + 1) + "៖ " + line,
        month: monthOrder[mIdx]
      };
    });
  }

  const bookId = "CUSTOM_" + Date.now();
  let subjectKey = "khmer";
  let coverColor = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";
  let icon = "fa-book";

  if (subject.includes("គណិត")) {
    subjectKey = "math";
    coverColor = "linear-gradient(135deg, #065f46 0%, #10b981 100%)";
    icon = "fa-calculator";
  } else if (subject.includes("វិទ្យា")) {
    subjectKey = "science";
    coverColor = "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)";
    icon = "fa-flask";
  } else if (subject.includes("សង្គម")) {
    subjectKey = "social";
    coverColor = "linear-gradient(135deg, #c2410c 0%, #f97316 100%)";
    icon = "fa-earth-asia";
  } else if (subject.includes("អង់គ្លេស")) {
    subjectKey = "english";
    coverColor = "linear-gradient(135deg, #701a75 0%, #a21caf 100%)";
    icon = "fa-language";
  }

  const newBook = {
    id: bookId,
    grade: grade,
    subject: subject,
    subjectKey: subjectKey,
    title: title,
    publisher: "សាលាបឋមសិក្សា បាន្លួង",
    edition: "សៀវភៅរក្សាទុកក្នុងបណ្ណាល័យ",
    coverColor: coverColor,
    icon: icon,
    isCustom: true,
    lessons: lessons
  };

  // Save PDF if selected
  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    await savePdfToStorage(bookId, file, file.name);
  }

  await saveCustomBookRecord(newBook);
  libraryState.allBooks.push(newBook);

  closeUploadBookModal();
  filterLibraryByGrade(grade);
  alert("បាននាំសៀវភៅ «" + title + "» ចូលក្នុងបណ្ណាល័យសម្រាប់ " + grade + " រួចរាល់ដោយជោគជ័យ!");
}
window.handleUploadBookSubmit = handleUploadBookSubmit;

// Delete Custom Book
async function deleteCustomBook(bookId) {
  if (!confirm("តើអ្នកពិតជាចង់លុបសៀវភៅនេះចេញពីបណ្ណាល័យមែនទេ?")) return;
  await deleteCustomBookRecord(bookId);
  libraryState.allBooks = libraryState.allBooks.filter(b => b.id !== bookId);
  renderLibrary();
}
window.deleteCustomBook = deleteCustomBook;

// ==========================================================================
// INTERACTIVE PDF READER MODAL
// ==========================================================================
async function openBookReader(bookId) {
  const book = libraryState.allBooks.find(b => b.id === bookId);
  if (!book) return;

  libraryState.activeReaderBook = book;
  const modal = document.getElementById("libraryReaderModal");
  if (!modal) return;

  document.getElementById("readerBookTitle").innerText = book.title;
  document.getElementById("readerBookGrade").innerText = book.grade;
  document.getElementById("readerBookSubject").innerText = book.subject;
  document.getElementById("readerTotalLessons").innerText = ((book.lessons || []).length) + " មេរៀនធំៗ";

  const tocContainer = document.getElementById("readerTocList");
  if (tocContainer) {
    let tocHtml = "";
    (book.lessons || []).forEach(l => {
      tocHtml += `
        <div class="toc-item">
          <div class="toc-item-header">
            <span class="toc-num">${l.num}</span>
            <span class="toc-title">${l.title}</span>
          </div>
          <div class="toc-item-meta">
            <span><i class="fa fa-calendar-alt"></i> ខែបង្រៀន៖ ${l.month || 'មករា'}</span>
            ${l.page ? '<span><i class="fa fa-file-lines"></i> ទំព័រ ' + l.page + '</span>' : ''}
          </div>
        </div>
      `;
    });
    tocContainer.innerHTML = tocHtml || '<p style="padding: 16px; color: #64748b;">មិនមានបញ្ជីមេរៀន</p>';
  }

  const frameContainer = document.getElementById("readerFrameContainer");
  frameContainer.innerHTML = '<div class="reader-loading"><i class="fa-solid fa-spinner fa-spin"></i> កំពុងបើកសៀវភៅ PDF...</div>';

  if (libraryState.activeReaderBlobUrl) {
    URL.revokeObjectURL(libraryState.activeReaderBlobUrl);
    libraryState.activeReaderBlobUrl = null;
  }

  let pdfUrl = null;
  const storedBlob = await getPdfFromStorage(book.id);
  if (storedBlob) {
    pdfUrl = URL.createObjectURL(storedBlob);
    libraryState.activeReaderBlobUrl = pdfUrl;
  } else if (book.pdfPath) {
    pdfUrl = book.pdfPath;
  }

  if (pdfUrl) {
    frameContainer.innerHTML = `
      <iframe src="${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1" class="reader-iframe" title="${book.title}"></iframe>
    `;
    const dlBtn = document.getElementById("readerDownloadBtn");
    if (dlBtn) {
      dlBtn.style.display = "inline-flex";
      dlBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = pdfUrl;
        a.download = book.title + ".pdf";
        a.click();
      };
    }
  } else {
    frameContainer.innerHTML = `
      <div class="reader-placeholder-view">
        <i class="fa-solid fa-file-circle-question" style="font-size: 54px; color: #94a3b8; margin-bottom: 16px;"></i>
        <h3>មិនទាន់មានឯកសារ PDF សម្រាប់សៀវភៅនេះទេ</h3>
        <p>លោកគ្រូអ្នកគ្រូអាចផ្ទុកឯកសារ PDF ចូលបានគ្រប់ពេល</p>
        <button class="btn btn-primary" onclick="promptUploadPdfForBook('${book.id}')">
          <i class="fa fa-upload"></i> ផ្ទុកឯកសារ PDF ចូល
        </button>
      </div>
    `;
    const dlBtn = document.getElementById("readerDownloadBtn");
    if (dlBtn) dlBtn.style.display = "none";
  }

  modal.classList.add("active");
}
window.openBookReader = openBookReader;

function closeBookReaderModal() {
  const modal = document.getElementById("libraryReaderModal");
  if (modal) modal.classList.remove("active");
  if (libraryState.activeReaderBlobUrl) {
    URL.revokeObjectURL(libraryState.activeReaderBlobUrl);
    libraryState.activeReaderBlobUrl = null;
  }
}
window.closeBookReaderModal = closeBookReaderModal;

// Prompt upload PDF for an existing book
function promptUploadPdfForBook(bookId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/pdf";
  input.onchange = async () => {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      await savePdfToStorage(bookId, file, file.name);
      alert("បានបញ្ចូលឯកសារ PDF ជោគជ័យ!");
      openBookReader(bookId);
      updatePdfBadgesInDOM();
    }
  };
  input.click();
}
window.promptUploadPdfForBook = promptUploadPdfForBook;

// ==========================================================================
// VIEW LESSONS MODAL
// ==========================================================================
function openBookLessonsModal(bookId) {
  const book = libraryState.allBooks.find(b => b.id === bookId);
  if (!book) return;

  const modal = document.getElementById("bookLessonsModal");
  if (!modal) return;

  document.getElementById("lessonsModalTitle").innerText = book.title;
  document.getElementById("lessonsModalGrade").innerText = book.grade + " • " + book.subject + " • " + ((book.lessons || []).length) + " មេរៀនធំៗ";

  const container = document.getElementById("lessonsListContainer");
  let html = "";
  (book.lessons || []).forEach(l => {
    html += `
      <div class="lesson-row-card">
        <div class="lesson-row-num">${l.num}</div>
        <div class="lesson-row-info">
          <div class="lesson-row-title">${l.title}</div>
          <div class="lesson-row-meta">
            <span><i class="fa fa-calendar-alt"></i> ខែបង្រៀន៖ <strong>${l.month || 'មករា'}</strong></span>
            ${l.page ? '<span><i class="fa fa-file-lines"></i> ទំព័រ ' + l.page + '</span>' : ''}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html || '<p style="text-align: center; color: #64748b; padding: 24px;">មិនមានបញ្ជីមេរៀន</p>';
  modal.classList.add("active");
}
window.openBookLessonsModal = openBookLessonsModal;

function closeBookLessonsModal() {
  const modal = document.getElementById("bookLessonsModal");
  if (modal) modal.classList.remove("active");
}
window.closeBookLessonsModal = closeBookLessonsModal;

// ==========================================================================
// MONTHLY REPORT INTEGRATION (របាយការណ៍ប្រចាំខែ)
// ==========================================================================
function autoFillLessonsForCurrentReportMonth() {
  const currentClass = getActiveClass();
  if (!currentClass) {
    alert("សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន!");
    return;
  }

  const monthKey = state.activeMonthlyReportMonth || state.activeScoreMonth || "មករា";
  const classGrade = currentClass.grade || "ថ្នាក់ទី៦";

  // Match books of this grade
  const gradeBooks = libraryState.allBooks.filter(b => b.grade === classGrade);

  // If grade has 0 books saved -> Notice empty and do NOT fill arbitrary fake lessons!
  if (gradeBooks.length === 0) {
    alert("កម្រិត «" + classGrade + "» មិនទាន់មានសៀវភៅរក្សាទុកក្នុងបណ្ណាល័យនៅឡើយទេ (ទទេ)!\n\nសូមចូលទៅកាន់ «បណ្ណាល័យថ្នាក់រៀន» ដើម្បីនាំចូលសៀវភៅពុម្ព ឬកម្មវិធីសិក្សាជា PDF សម្រាប់ថ្នាក់នេះ។");
    switchTab("library");
    filterLibraryByGrade(classGrade);
    return;
  }

  const subjects = [
    { key: "khmer", name: "ភាសាខ្មែរ" },
    { key: "math", name: "គណិតវិទ្យា" },
    { key: "social", name: "សិក្សាសង្គម" },
    { key: "science", name: "វិទ្យាសាស្ត្រ" }
  ];

  let filledCount = 0;
  subjects.forEach(sub => {
    const book = gradeBooks.find(b => 
      (b.subjectKey === sub.key) || 
      (b.subject && b.subject.includes(sub.name)) ||
      (sub.key === "social" && b.subject && (b.subject.includes("សង្គម") || b.subject.includes("បំណិនជីវិត"))) ||
      (sub.key === "science" && b.subject && (b.subject.includes("វិទ្យា") || b.subject.includes("បំណិនជីវិត")))
    );

    if (book && book.lessons && book.lessons.length > 0) {
      let targetLesson = book.lessons.find(l => l.month === monthKey);
      if (!targetLesson) {
        const monthOrder = ["វិច្ឆិកា", "ធ្នូ", "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា"];
        const mIdx = Math.max(0, monthOrder.indexOf(monthKey));
        const lIdx = Math.min(book.lessons.length - 1, Math.round((mIdx / monthOrder.length) * book.lessons.length));
        targetLesson = book.lessons[lIdx];
      }

      if (targetLesson) {
        saveMonthlyReportData(currentClass.id, monthKey, "t3_lesson_" + sub.key, targetLesson.title);

        const totalL = book.lessons.length;
        const currentL = targetLesson.num;
        const fastPace = Math.min(100, Math.round((currentL / totalL) * 100));
        const slowPace = Math.max(0, Math.round(((currentL - 1) / totalL) * 100));

        saveMonthlyReportData(currentClass.id, monthKey, "t3_" + sub.key + "_fast_num", String(currentL));
        saveMonthlyReportData(currentClass.id, monthKey, "t3_" + sub.key + "_fast_den", String(totalL));
        saveMonthlyReportData(currentClass.id, monthKey, "t3_" + sub.key + "_fast_res", fastPace + "%");

        saveMonthlyReportData(currentClass.id, monthKey, "t3_" + sub.key + "_slow_num", String(currentL - 1));
        saveMonthlyReportData(currentClass.id, monthKey, "t3_" + sub.key + "_slow_den", String(totalL));
        saveMonthlyReportData(currentClass.id, monthKey, "t3_" + sub.key + "_slow_res", slowPace + "%");

        filledCount++;
      }
    }
  });

  renderMonthlyReport();
  alert("បានជ្រើសរើស និងបំពេញមេរៀនស្វ័យប្រវត្តិចំនួន " + filledCount + " មុខវិជ្ជាពីបណ្ណាល័យសម្រាប់ខែ «" + monthKey + "» (" + classGrade + ") ជោគជ័យ!");
}
window.autoFillLessonsForCurrentReportMonth = autoFillLessonsForCurrentReportMonth;

// 2. Open Picker Modal for a single subject in Monthly Report
function openSubjectLessonPicker(subKey, subName) {
  const currentClass = getActiveClass();
  const classGrade = currentClass ? (currentClass.grade || "ថ្នាក់ទី៦") : "ថ្នាក់ទី៦";
  const monthKey = state.activeMonthlyReportMonth || state.activeScoreMonth || "មករា";

  const book = libraryState.allBooks.find(b => 
    b.grade === classGrade && (
      b.subjectKey === subKey || 
      (b.subject && b.subject.includes(subName)) ||
      (subKey === "social" && b.subject && b.subject.includes("បំណិនជីវិត"))
    )
  );

  const modal = document.getElementById("lessonPickerModal");
  if (!modal) return;

  document.getElementById("pickerModalTitle").innerText = "ជ្រើសរើសមេរៀន ៖ " + subName + " (" + classGrade + ")";
  document.getElementById("pickerModalSub").innerText = book 
    ? "សៀវភៅពុម្ព៖ " + book.title + " • " + (book.lessons ? book.lessons.length : 0) + " មេរៀនធំៗ • ប្រចាំខែ " + monthKey
    : "មិនទាន់មានសៀវភៅរក្សាទុកសម្រាប់ " + classGrade + " ទេ";

  const container = document.getElementById("pickerLessonsContainer");
  if (!book || !book.lessons || book.lessons.length === 0) {
    container.innerHTML = `
      <div style="padding: 32px 16px; text-align: center;">
        <i class="fa-solid fa-folder-open" style="font-size: 40px; color: #94a3b8; margin-bottom: 12px;"></i>
        <h4 style="color: #475569; margin-bottom: 8px;">ទទេ — មិនទាន់មានសៀវភៅរក្សាទុក</h4>
        <p style="color: #64748b; font-size: 13px; margin-bottom: 16px;">សូមនាំសៀវភៅចូលក្នុងបណ្ណាល័យសម្រាប់កម្រិតថ្នាក់នេះជាមុនសិន</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="closeLessonPickerModal(); switchTab('library'); filterLibraryByGrade('${classGrade}');">
          <i class="fa fa-arrow-right"></i> ទៅកាន់បណ្ណាល័យថ្នាក់រៀន
        </button>
      </div>
    `;
  } else {
    let html = "";
    book.lessons.forEach(l => {
      const isCurrentMonth = l.month === monthKey;
      const highlightClass = isCurrentMonth ? "highlight-month" : "";
      html += `
        <div class="lesson-picker-item ${highlightClass}" onclick="selectLessonForReport('${subKey}', '${l.title}', ${l.num}, ${book.lessons.length})">
          <div class="p-num">${l.num}</div>
          <div class="p-title-wrap">
            <div class="p-title">${l.title}</div>
            <div class="p-month"><i class="fa fa-calendar-alt"></i> ខែបង្រៀន៖ <strong>${l.month || 'មករា'}</strong> ${isCurrentMonth ? '(ខែបច្ចុប្បន្ន)' : ''}</div>
          </div>
          <button type="button" class="btn btn-sm btn-primary">ជ្រើសរើស</button>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  modal.classList.add("active");
}
window.openSubjectLessonPicker = openSubjectLessonPicker;

function closeLessonPickerModal() {
  const modal = document.getElementById("lessonPickerModal");
  if (modal) modal.classList.remove("active");
}
window.closeLessonPickerModal = closeLessonPickerModal;

function selectLessonForReport(subKey, lessonTitle, lessonNum, totalLessons) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const monthKey = state.activeMonthlyReportMonth || state.activeScoreMonth || "មករា";

  saveMonthlyReportData(currentClass.id, monthKey, "t3_lesson_" + subKey, lessonTitle);

  // Auto calculate pace formula
  const fastPace = Math.min(100, Math.round((lessonNum / totalLessons) * 100));
  const slowPace = Math.max(0, Math.round(((lessonNum - 1) / totalLessons) * 100));

  saveMonthlyReportData(currentClass.id, monthKey, "t3_" + subKey + "_fast_num", String(lessonNum));
  saveMonthlyReportData(currentClass.id, monthKey, "t3_" + subKey + "_fast_den", String(totalLessons));
  saveMonthlyReportData(currentClass.id, monthKey, "t3_" + subKey + "_fast_res", fastPace + "%");

  saveMonthlyReportData(currentClass.id, monthKey, "t3_" + subKey + "_slow_num", String(lessonNum - 1));
  saveMonthlyReportData(currentClass.id, monthKey, "t3_" + subKey + "_slow_den", String(totalLessons));
  saveMonthlyReportData(currentClass.id, monthKey, "t3_" + subKey + "_slow_res", slowPace + "%");

  closeLessonPickerModal();
  renderMonthlyReport();
}
window.selectLessonForReport = selectLessonForReport;

// Initialize on DOMContentLoaded or immediately
document.addEventListener("DOMContentLoaded", () => {
  initLibraryAsync().then(() => {
    const libTab = document.getElementById("tab-library");
    if (libTab && libTab.classList.contains("active")) {
      renderLibrary();
    }
  });
});
