// ==========================================================================
// បណ្ណាល័យថ្នាក់រៀនឌីជីថល (CLASSROOM DIGITAL LIBRARY)
// ផ្ទុកសៀវភៅពុម្ពសិស្សជា PDF, បើកអានតាមកម្រិតថ្នាក់ និងរើសមេរៀនស្វ័យប្រវត្តិតាមមុខវិជ្ជា
// ==========================================================================

// IndexedDB Configuration
const LIB_DB_NAME = "BanLoungClassroomLibraryDB";
const LIB_DB_VERSION = 1;
const STORE_PDFS = "textbook_pdfs";
const STORE_CUSTOM_BOOKS = "custom_books";

// In-memory cache of stored PDF IDs for instant synchronous UI checks
const storedPdfIdsCache = new Set();

// Open IndexedDB safely with fallback
function openLibraryDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    try {
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
      request.onerror = () => resolve(null);
    } catch (err) {
      resolve(null);
    }
  });
}

// Save PDF Blob in IndexedDB
async function saveBookPDF(bookId, fileBlob, fileName) {
  storedPdfIdsCache.add(bookId);
  try {
    const db = await openLibraryDB();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PDFS], "readwrite");
      const store = tx.objectStore(STORE_PDFS);
      store.put({
        id: bookId,
        blob: fileBlob,
        name: fileName,
        size: fileBlob.size,
        updatedAt: new Date().toISOString()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn("Error saving PDF:", err);
    return false;
  }
}

// Get PDF Blob from IndexedDB
async function getBookPDF(bookId) {
  try {
    const db = await openLibraryDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_PDFS], "readonly");
      const store = tx.objectStore(STORE_PDFS);
      const req = store.get(bookId);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          storedPdfIdsCache.add(bookId);
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

// Delete PDF from IndexedDB
async function deleteBookPDF(bookId) {
  storedPdfIdsCache.delete(bookId);
  try {
    const db = await openLibraryDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_PDFS], "readwrite");
      const store = tx.objectStore(STORE_PDFS);
      store.delete(bookId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

// Save Custom Book Metadata
async function saveCustomBookMeta(book) {
  try {
    const db = await openLibraryDB();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CUSTOM_BOOKS], "readwrite");
      const store = tx.objectStore(STORE_CUSTOM_BOOKS);
      store.put(book);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    return false;
  }
}

// Get All Custom Books
async function getAllCustomBooks() {
  try {
    const db = await openLibraryDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_CUSTOM_BOOKS], "readonly");
      const store = tx.objectStore(STORE_CUSTOM_BOOKS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

// Delete Custom Book Metadata
async function deleteCustomBookMeta(bookId) {
  try {
    const db = await openLibraryDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_CUSTOM_BOOKS], "readwrite");
      const store = tx.objectStore(STORE_CUSTOM_BOOKS);
      store.delete(bookId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

// ==========================================================================
// PRELOADED TEXTBOOKS DATABASE (កម្មវិធីសិក្សាគោលក្រសួងអប់រំ យុវជន និងកីឡា)
// ==========================================================================
const PRELOADED_TEXTBOOKS = [
  // --- ថ្នាក់ទី៦ (GRADE 6) ---
  {
    id: "BK_G6_KHMER",
    grade: "ថ្នាក់ទី៦",
    subject: "ភាសាខ្មែរ",
    subjectKey: "khmer",
    title: "ភាសាខ្មែរ ថ្នាក់ទី៦",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
    icon: "fa-book",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ការអប់រំ និងការបណ្តុះបណ្តាល", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ គ្រួសារកក់ក្តៅ និងសុភមង្គល", month: "មករា" },
      { num: 3, title: "មេរៀនទី៣៖ អនាម័យ និងសុខភាពកុមារ", month: "កុម្ភៈ" },
      { num: 4, title: "មេរៀនទី៤៖ សីលធម៌ និងការរស់នៅល្អ", month: "កុម្ភៈ" },
      { num: 5, title: "មេរៀនទី៥៖ សិទ្ធិកុមារ និងកាតព្វកិច្ច", month: "មីនា" },
      { num: 6, title: "មេរៀនទី៦៖ បរិស្ថាន និងធនធានធម្មជាតិ", month: "មីនា" },
      { num: 7, title: "មេរៀនទី៧៖ ទេសចរណ៍ និងបេតិកភណ្ឌជាតិ", month: "មេសា" },
      { num: 8, title: "មេរៀនទី៨៖ វិទ្យាសាស្ត្រ និងបច្ចេកវិទ្យា", month: "មេសា" },
      { num: 9, title: "មេរៀនទី៩៖ ទំនៀមទម្លាប់ និងប្រពៃណីខ្មែរ", month: "ឧសភា" },
      { num: 10, title: "មេរៀនទី១០៖ សេដ្ឋកិច្ច និងការអភិវឌ្ឍសហគមន៍", month: "ឧសភា" },
      { num: 11, title: "មេរៀនទី១១៖ ទំនាក់ទំនង និងសហប្រតិបត្តិការ", month: "មិថុនា" },
      { num: 12, title: "មេរៀនទី១២៖ ប្រវត្តិសាស្ត្រ និងវប្បធម៌ខ្មែរ", month: "មិថុនា" },
      { num: 13, title: "មេរៀនទី១៣៖ ពិភពការងារ និងមុខរបរ", month: "កក្កដា" },
      { num: 14, title: "មេរៀនទី១៤៖ សន្តិភាព និងសាមគ្គីភាព", month: "កក្កដា" },
      { num: 15, title: "មេរៀនទី១៥៖ ការថែរក្សាការពារព្រៃឈើ", month: "សីហា" },
      { num: 16, title: "មេរៀនទី១៦៖ កំណែទម្រង់ និងការរីកចម្រើន", month: "សីហា" }
    ]
  },
  {
    id: "BK_G6_MATH",
    grade: "ថ្នាក់ទី៦",
    subject: "គណិតវិទ្យា",
    subjectKey: "math",
    title: "គណិតវិទ្យា ថ្នាក់ទី៦",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
    icon: "fa-calculator",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ចំនួនគត់ធំជាង ១ ០០០ ០០០", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ ប្រមាណវិធីបូក ដក គុណ ចែក", month: "មករា" },
      { num: 3, title: "មេរៀនទី៣៖ កត្តា ពហុគុណ និងចំនួនបឋម", month: "កុម្ភៈ" },
      { num: 4, title: "មេរៀនទី៤៖ ប្រភាគ និងប្រមាណវិធីលើប្រភាគ", month: "កុម្ភៈ" },
      { num: 5, title: "មេរៀនទី៥៖ ចំនួនទសភាគ", month: "មីនា" },
      { num: 6, title: "មេរៀនទី៦៖ ប្រមាណវិធីលើចំនួនទសភាគ", month: "មីនា" },
      { num: 7, title: "មេរៀនទី៧៖ ភាគរយ ការប្រាក់ និងចំណេញ-ខាត", month: "មេសា" },
      { num: 8, title: "មេរៀនទី៨៖ រង្វាស់ប្រវែង និងបរិមាត្រ", month: "មេសា" },
      { num: 9, title: "មេរៀនទី៩៖ ផ្ទៃក្រឡារូបធរណីមាត្រ", month: "ឧសភា" },
      { num: 10, title: "មេរៀនទី១០៖ រង្វាស់ចំណុះ និងមាឌ", month: "ឧសភា" },
      { num: 11, title: "មេរៀនទី១១៖ រង្វាស់ម៉ាស (ទម្ងន់)", month: "មិថុនា" },
      { num: 12, title: "មេរៀនទី១២៖ រង្វាស់ពេលវេលា និងល្បឿន", month: "មិថុនា" },
      { num: 13, title: "មេរៀនទី១៣៖ មុំ និងត្រីកោណ", month: "កក្កដា" },
      { num: 14, title: "មេរៀនទី១៤៖ ចតុកោណ និងរង្វង់", month: "កក្កដា" },
      { num: 15, title: "មេរៀនទី១៥៖ ស្ថិតិ និងក្រាហ្វិក", month: "សីហា" },
      { num: 16, title: "មេរៀនទី១៦៖ ប្រូបាប៊ីលីតេបឋម", month: "សីហា" }
    ]
  },
  {
    id: "BK_G6_SOCIAL",
    grade: "ថ្នាក់ទី៦",
    subject: "សិក្សាសង្គម",
    subjectKey: "social",
    title: "សិក្សាសង្គម ថ្នាក់ទី៦",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
    icon: "fa-landmark",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ភូមិសាស្ត្រ និងផែនទីប្រទេសកម្ពុជា", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ អាកាសធាតុ និងរដូវនៅកម្ពុជា", month: "មករា" },
      { num: 3, title: "មេរៀនទី៣៖ ទន្លេមេគង្គ និងបឹងទន្លេសាប", month: "កុម្ភៈ" },
      { num: 4, title: "មេរៀនទី៤៖ ប្រវត្តិសាស្ត្រសម័យមហានគរ", month: "កុម្ភៈ" },
      { num: 5, title: "មេរៀនទី៥៖ ប្រាសាទបុរាណ និងរមណីយដ្ឋានជាតិ", month: "មីនា" },
      { num: 6, title: "មេរៀនទី៦៖ រចនាសម្ព័ន្ធរដ្ឋបាលកម្ពុជា", month: "មីនា" },
      { num: 7, title: "មេរៀនទី៧៖ ច្បាប់ចរាចរណ៍ផ្លូវគោក", month: "មេសា" },
      { num: 8, title: "មេរៀនទី៨៖ សិទ្ធិមនុស្ស និងសិទ្ធិកុមារ", month: "មេសា" },
      { num: 9, title: "មេរៀនទី៩៖ ទំនៀមទម្លាប់ បុណ្យប្រពៃណីជាតិ", month: "ឧសភា" },
      { num: 10, title: "មេរៀនទី១០៖ សិល្បៈបុរាណ និងរបាំប្រជាប្រិយ", month: "ឧសភា" },
      { num: 11, title: "មេរៀនទី១១៖ វិស័យកសិកម្ម និងឧស្សាហកម្ម", month: "មិថុនា" },
      { num: 12, title: "មេរៀនទី១២៖ សមាគមប្រជាជាតិអាស៊ីអាគ្នេយ៍ (អាស៊ាន)", month: "កក្កដា" },
      { num: 13, title: "មេរៀនទី១៣៖ ការថែរក្សាបរិស្ថានសហគមន៍", month: "សីហា" },
      { num: 14, title: "មេរៀនទី១៤៖ គ្រោះធម្មជាតិ និងការការពារខ្លួន", month: "សីហា" }
    ]
  },
  {
    id: "BK_G6_SCIENCE",
    grade: "ថ្នាក់ទី៦",
    subject: "វិទ្យាសាស្ត្រ",
    subjectKey: "science",
    title: "វិទ្យាសាស្ត្រ ថ្នាក់ទី៦",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    icon: "fa-flask-vial",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ប្រព័ន្ធរំលាយអាហារ និងដង្ហើមរបស់មនុស្ស", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ ប្រព័ន្ធរបត់ឈាម និងការបញ្ចេញចោល", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ ការបន្តពូជរបស់រុក្ខជាតិ", month: "កុម្ភៈ" },
      { num: 4, title: "មេរៀនទី៤៖ ការលូតលាស់ និងការបន្តពូជរបស់សត្វ", month: "មីនា" },
      { num: 5, title: "មេរៀនទី៥៖ ច្រវាក់ចំណី និងបណ្តាញចំណី", month: "មីនា" },
      { num: 6, title: "មេរៀនទី៦៖ អេកូឡូស៊ី និងជីវចម្រុះ", month: "មេសា" },
      { num: 7, title: "មេរៀនទី៧៖ រូបធាតុ និងបម្រែបម្រួលរូបធាតុ", month: "ឧសភា" },
      { num: 8, title: "មេរៀនទី៨៖ កម្លាំង ចលនា និងម៉ាស៊ីនងាយ", month: "ឧសភា" },
      { num: 9, title: "មេរៀនទី៩៖ ថាមពល អគ្គិសនី និងសៀគ្វី", month: "មិថុនា" },
      { num: 10, title: "មេរៀនទី១០៖ មេដែក និងដែនម៉ាញេទិច", month: "កក្កដា" },
      { num: 11, title: "មេរៀនទី១១៖ ស្រទាប់ផែនដី និងរញ្ជួយដី", month: "សីហា" },
      { num: 12, title: "មេរៀនទី១២៖ ប្រព័ន្ធព្រះអាទិត្យ និងភពនានា", month: "សីហា" }
    ]
  },

  // --- ថ្នាក់ទី៥ (GRADE 5) ---
  {
    id: "BK_G5_KHMER",
    grade: "ថ្នាក់ទី៥",
    subject: "ភាសាខ្មែរ",
    subjectKey: "khmer",
    title: "ភាសាខ្មែរ ថ្នាក់ទី៥",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)",
    icon: "fa-book",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ការសិក្សា និងវិន័យសាលា", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ មិត្តភាព និងសាមគ្គីភាព", month: "មករា" },
      { num: 3, title: "មេរៀនទី៣៖ ការថែរក្សាសុខភាព និងអាហារូបត្ថម្ភ", month: "កុម្ភៈ" },
      { num: 4, title: "មេរៀនទី៤៖ ការជួយការងារគ្រួសារ", month: "កុម្ភៈ" },
      { num: 5, title: "មេរៀនទី៥៖ ភូមិឋានស្អាត និងបរិស្ថានល្អ", month: "មីនា" },
      { num: 6, title: "មេរៀនទី៦៖ ទឹក និងជីវិត", month: "មីនា" },
      { num: 7, title: "មេរៀនទី៧៖ របាំ និងល្បែងប្រជាប្រិយខ្មែរ", month: "មេសា" },
      { num: 8, title: "មេរៀនទី៨៖ មុខរបរអ្នកស្រុក", month: "ឧសភា" },
      { num: 9, title: "មេរៀនទី៩៖ គមនាគមន៍ និងការធ្វើដំណើរ", month: "ឧសភា" },
      { num: 10, title: "មេរៀនទី១០៖ សត្វព្រៃ និងព្រៃឈើ", month: "មិថុនា" },
      { num: 11, title: "មេរៀនទី១១៖ ការសន្សំសំចៃ", month: "កក្កដា" },
      { num: 12, title: "មេរៀនទី១២៖ ប្រទេសកម្ពុជាដ៏ស្រស់បំព្រង", month: "សីហា" }
    ]
  },
  {
    id: "BK_G5_MATH",
    grade: "ថ្នាក់ទី៥",
    subject: "គណិតវិទ្យា",
    subjectKey: "math",
    title: "គណិតវិទ្យា ថ្នាក់ទី៥",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #0f766e 0%, #2dd4bf 100%)",
    icon: "fa-calculator",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ចំនួនគត់ដល់ ១ ០០០ ០០០", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ វិធីបូក និងដកចំនួនគត់ធំ", month: "មករា" },
      { num: 3, title: "មេរៀនទី៣៖ វិធីគុណ និងចែកចំនួនគត់", month: "កុម្ភៈ" },
      { num: 4, title: "មេរៀនទី៤៖ ប្រភាគសមមូល និងការសម្រួល", month: "កុម្ភៈ" },
      { num: 5, title: "មេរៀនទី៥៖ វិធីបូក ដកប្រភាគ", month: "មីនា" },
      { num: 6, title: "មេរៀនទី៦៖ ចំនួនទសភាគ និងតម្លៃលេខតាមខ្ទង់", month: "មីនា" },
      { num: 7, title: "មេរៀនទី៧៖ វិធីបូក ដកទសភាគ", month: "មេសា" },
      { num: 8, title: "មេរៀនទី៨៖ រង្វាស់ប្រវែង និងផ្ទៃក្រឡា", month: "ឧសភា" },
      { num: 9, title: "មេរៀនទី៩៖ រង្វាស់ចំណុះ និងទម្ងន់", month: "មិថុនា" },
      { num: 10, title: "មេរៀនទី១០៖ រូបធរណីមាត្រ មុំ និងបន្ទាត់ស្រប", month: "កក្កដា" },
      { num: 11, title: "មេរៀនទី១១៖ ស្ថិតិ និងក្រាហ្វិកសសរ", month: "សីហា" }
    ]
  },
  {
    id: "BK_G5_SOCIAL",
    grade: "ថ្នាក់ទី៥",
    subject: "សិក្សាសង្គម",
    subjectKey: "social",
    title: "សិក្សាសង្គម ថ្នាក់ទី៥",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #b45309 0%, #fbbf24 100%)",
    icon: "fa-landmark",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ទីតាំង និងព្រំប្រទល់ប្រទេសកម្ពុជា", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ តំបន់ភូមិសាស្ត្រទាំង៤ នៅកម្ពុជា", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ ប្រវត្តិប្រាសាទព្រះវិហារ និងអង្គរវត្ត", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ ទំនៀមទម្លាប់នៃការរៀបមង្គលការ និងបុណ្យទាន", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ ការគោរពទង់ជាតិ និងភ្លេងជាតិ", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ ការការពារបរិស្ថាន និងការគ្រប់គ្រងសំរាម", month: "មិថុនា" },
      { num: 7, title: "មេរៀនទី៧៖ សុវត្ថិភាពចរាចរណ៍សម្រាប់អ្នកថ្មើរជើង និងកង់", month: "កក្កដា" },
      { num: 8, title: "មេរៀនទី៨៖ ភូមិឋានសន្តិសុខ និងការសាមគ្គីជិតខាង", month: "សីហា" }
    ]
  },
  {
    id: "BK_G5_SCIENCE",
    grade: "ថ្នាក់ទី៥",
    subject: "វិទ្យាសាស្ត្រ",
    subjectKey: "science",
    title: "វិទ្យាសាស្ត្រ ថ្នាក់ទី៥",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #047857 0%, #34d399 100%)",
    icon: "fa-flask-vial",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ សរីរាង្គវិញ្ញាណទាំងប្រាំរបស់មនុស្ស", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ គ្រោងឆ្អឹង និងសាច់ដុំ", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ ការលូតលាស់នៃគ្រាប់ធញ្ញជាតិ", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ ជម្រក និងការបន្សាំរបស់សត្វ", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ ខ្យល់ និងសម្ពាធខ្យល់", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ ទឹក និងវដ្តទឹក", month: "មិថុនា" },
      { num: 7, title: "មេរៀនទី៧៖ ពន្លឺ និងស្រមោល", month: "កក្កដា" },
      { num: 8, title: "មេរៀនទី៨៖ សំឡេង និងការឆ្លុះបញ្ចាំងសំឡេង", month: "សីហា" }
    ]
  },

  // --- ថ្នាក់ទី៤ (GRADE 4) ---
  {
    id: "BK_G4_KHMER",
    grade: "ថ្នាក់ទី៤",
    subject: "ភាសាខ្មែរ",
    subjectKey: "khmer",
    title: "ភាសាខ្មែរ ថ្នាក់ទី៤",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #4338ca 0%, #818cf8 100%)",
    icon: "fa-book",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ សាលារៀនខ្ញុំ និងមិត្តភក្តិ", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ ការជួយឪពុកម្តាយ", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ ការគោរពចាស់ទុំ និងគ្រូបង្រៀន", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ ភូមិខ្ញុំមានសន្តិសុខល្អ", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ សត្វចិញ្ចឹម និងសត្វព្រៃ", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ រុក្ខជាតិ និងផលប្រយោជន៍", month: "មិថុនា" },
      { num: 7, title: "មេរៀនទី៧៖ ទឹកស្អាត និងអនាម័យរស់នៅ", month: "កក្កដា" },
      { num: 8, title: "មេរៀនទី៨៖ ពិធីបុណ្យចូលឆ្នាំខ្មែរ", month: "សីហា" }
    ]
  },
  {
    id: "BK_G4_MATH",
    grade: "ថ្នាក់ទី៤",
    subject: "គណិតវិទ្យា",
    subjectKey: "math",
    title: "គណិតវិទ្យា ថ្នាក់ទី៤",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
    icon: "fa-calculator",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ចំនួនគត់ដល់ ១០០ ០០០", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ វិធីបូក និងដកចំនួនគត់", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ វិធីគុណនឹងចំនួនមានពីរខ្ទង់", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ វិធីចែកនឹងចំនួនមានមួយខ្ទង់ និងពីរខ្ទង់", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ ប្រភាគបឋម", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ រង្វាស់ប្រវែង និងទម្ងន់", month: "មិថុនា" },
      { num: 7, title: "មេរៀនទី៧៖ ធរណីមាត្រ ចតុកោណកែង និងការ៉េ", month: "កក្កដា" },
      { num: 8, title: "មេរៀនទី៨៖ រង្វាស់ពេលវេលា និងប្រតិទិន", month: "សីហា" }
    ]
  },
  {
    id: "BK_G4_SOCIAL",
    grade: "ថ្នាក់ទី៤",
    subject: "សិក្សាសង្គម",
    subjectKey: "social",
    title: "សិក្សាសង្គម ថ្នាក់ទី៤",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #c2410c 0%, #fb923c 100%)",
    icon: "fa-landmark",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ទីកន្លែងសំខាន់ៗក្នុងខេត្តរបស់យើង", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ ប្រវត្តិ និងរឿងនិទានប្រជាប្រិយខ្មែរ", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ សិល្បៈចម្លាក់ និងស្ថាបត្យកម្មខ្មែរ", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ របៀបរស់នៅស្អាត ផ្ទះស្អាត សាលាស្អាត", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ ការគោរពច្បាប់ចរាចរណ៍", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ ទឹកចិត្តស្រឡាញ់ជាតិ និងមាតុភូមិ", month: "សីហា" }
    ]
  },
  {
    id: "BK_G4_SCIENCE",
    grade: "ថ្នាក់ទី៤",
    subject: "វិទ្យាសាស្ត្រ",
    subjectKey: "science",
    title: "វិទ្យាសាស្ត្រ ថ្នាក់ទី៤",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #15803d 0%, #4ade80 100%)",
    icon: "fa-flask-vial",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ផ្នែកសំខាន់ៗនៃរុក្ខជាតិ (ឫស ដើម ស្លឹក)", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ សត្វស្លាប សត្វទឹក និងសត្វជើងបួន", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ ដី និងប្រភេទដីកសិកម្ម", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ ធាតុអាកាស កម្តៅ និងភ្លៀង", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ កម្លាំងទាញ និងកម្លាំងរុញ", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ មេដែក និងដែកឆក់", month: "សីហា" }
    ]
  },

  // --- ថ្នាក់ទី៣ (GRADE 3) ---
  {
    id: "BK_G3_KHMER",
    grade: "ថ្នាក់ទី៣",
    subject: "ភាសាខ្មែរ",
    subjectKey: "khmer",
    title: "ភាសាខ្មែរ ថ្នាក់ទី៣",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)",
    icon: "fa-book",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ សាលារៀន និងការអាន", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ គ្រួសារខ្ញុំ", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ ការធ្វើអនាម័យខ្លួនប្រាណ", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ ដំណាំ និងផ្កានៅជុំវិញផ្ទះ", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ សត្វចិញ្ចឹមដែលស្រឡាញ់", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ ពិធីបុណ្យភូមិ", month: "សីហា" }
    ]
  },
  {
    id: "BK_G3_MATH",
    grade: "ថ្នាក់ទី៣",
    subject: "គណិតវិទ្យា",
    subjectKey: "math",
    title: "គណិតវិទ្យា ថ្នាក់ទី៣",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #0e7490 0%, #38bdf8 100%)",
    icon: "fa-calculator",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ចំនួនដល់ ១០ ០០០", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ វិធីបូក និងដកត្រឹម ១០ ០០០", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ មេគុណ និងវិធីគុណ", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ វិធីចែក", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ រង្វាស់ប្រវែង និងម៉ាស", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ រូបធរណីមាត្របឋម", month: "សីហា" }
    ]
  },
  {
    id: "BK_G3_SOCIAL_SCI",
    grade: "ថ្នាក់ទី៣",
    subject: "វិទ្យាសាស្ត្រ និងសិក្សាសង្គម",
    subjectKey: "science",
    title: "វិទ្យាសាស្ត្រ និងសិក្សាសង្គម ថ្នាក់ទី៣",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #047857 0%, #10b981 100%)",
    icon: "fa-seedling",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ សុខភាពមាត់ធ្មេញ និងភ្នែក", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ គ្រួសារ និងការរស់នៅចុះសម្រុង", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ រុក្ខជាតិនៅជុំវិញយើង", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ សត្វ និងចំណីរបស់វា", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ ការថែរក្សាទឹកស្អាត", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ សុវត្ថិភាពតាមផ្លូវថ្នល់", month: "សីហា" }
    ]
  },

  // --- ថ្នាក់ទី២ (GRADE 2) ---
  {
    id: "BK_G2_KHMER",
    grade: "ថ្នាក់ទី២",
    subject: "ភាសាខ្មែរ",
    subjectKey: "khmer",
    title: "ភាសាខ្មែរ ថ្នាក់ទី២",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #7c3aed 0%, #c4b5fd 100%)",
    icon: "fa-book",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ការរៀនអានពាក្យផ្សំស្រៈ", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ ព្យញ្ជនៈផ្ញើជើង", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ ពាក្យមានជើងព្យញ្ជនៈ", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ ការអានអត្ថបទខ្លីៗ", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ ការសរសេរតាមអាន", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ រឿងនិទានខ្លីៗ", month: "សីហា" }
    ]
  },
  {
    id: "BK_G2_MATH",
    grade: "ថ្នាក់ទី២",
    subject: "គណិតវិទ្យា",
    subjectKey: "math",
    title: "គណិតវិទ្យា ថ្នាក់ទី២",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #0284c7 0%, #7dd3fc 100%)",
    icon: "fa-calculator",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ចំនួនដល់ ១ ០០០", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ វិធីបូក និងដកត្រឹម ១ ០០០", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ មេគុណ ២ ដល់ ៥", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ រង្វាស់ប្រវែង (ម៉ែត្រ សង់ទីម៉ែត្រ)", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ រូបរាងធរណីមាត្រ", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ ម៉ោង និងនាទី", month: "សីហា" }
    ]
  },
  {
    id: "BK_G2_SOCIAL_SCI",
    grade: "ថ្នាក់ទី២",
    subject: "វិទ្យាសាស្ត្រ និងសិក្សាសង្គម",
    subjectKey: "science",
    title: "វិទ្យាសាស្ត្រ និងសិក្សាសង្គម ថ្នាក់ទី២",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #16a34a 0%, #86efac 100%)",
    icon: "fa-seedling",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ខ្លួនប្រាណខ្ញុំ និងការថែរក្សា", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ អាហារល្អសម្រាប់សុខភាព", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ សត្វ និងរុក្ខជាតិក្នុងស្រុក", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ ការដើរតាមផ្លូវដោយសុវត្ថិភាព", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ ការស្រឡាញ់មិត្តភក្តិ និងគ្រូ", month: "សីហា" }
    ]
  },

  // --- ថ្នាក់ទី១ (GRADE 1) ---
  {
    id: "BK_G1_KHMER",
    grade: "ថ្នាក់ទី១",
    subject: "ភាសាខ្មែរ",
    subjectKey: "khmer",
    title: "ភាសាខ្មែរ ថ្នាក់ទី១",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #be185d 0%, #f472b6 100%)",
    icon: "fa-book",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ព្យញ្ជនៈ ៣៣ តួ (ក ដល់ អ)", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ ស្រៈនិស្ស័យ ២៣ តួ (ា ដល់ ោះ)", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ ការផ្សំស្រៈជាមួយព្យញ្ជនៈ", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ ព្យញ្ជនៈប្រកប", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ ការអានពាក្យងាយៗ", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ ការសរសេរអក្សរផ្ចង់បឋម", month: "សីហា" }
    ]
  },
  {
    id: "BK_G1_MATH",
    grade: "ថ្នាក់ទី១",
    subject: "គណិតវិទ្យា",
    subjectKey: "math",
    title: "គណិតវិទ្យា ថ្នាក់ទី១",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)",
    icon: "fa-calculator",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ចំនួនពី ០ ដល់ ១០", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ វិធីបូកត្រឹម ១០", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ វិធីដកត្រឹម ១០", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ ចំនួនពី ១១ ដល់ ២០", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ ចំនួនដល់ ១០០", month: "ឧសភា" },
      { num: 6, title: "មេរៀនទី៦៖ រូបរាងមូល ជ្រុង ត្រីកោណ", month: "សីហា" }
    ]
  },
  {
    id: "BK_G1_SOCIAL_SCI",
    grade: "ថ្នាក់ទី១",
    subject: "វិទ្យាសាស្ត្រ និងសិក្សាសង្គម",
    subjectKey: "science",
    title: "វិទ្យាសាស្ត្រ និងសិក្សាសង្គម ថ្នាក់ទី១",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #15803d 0%, #86efac 100%)",
    icon: "fa-seedling",
    lessons: [
      { num: 1, title: "មេរៀនទី១៖ ការស្គាល់ខ្លួនឯង និងអនាម័យផ្ទាល់ខ្លួន", month: "មករា" },
      { num: 2, title: "មេរៀនទី២៖ គ្រួសារ និងផ្ទះរបស់ខ្ញុំ", month: "កុម្ភៈ" },
      { num: 3, title: "មេរៀនទី៣៖ សាលារៀន និងថ្នាក់រៀនខ្ញុំ", month: "មីនា" },
      { num: 4, title: "មេរៀនទី៤៖ សត្វចិញ្ចឹមជុំវិញផ្ទះ", month: "មេសា" },
      { num: 5, title: "មេរៀនទី៥៖ សុវត្ថិភាពក្នុងការលេង", month: "សីហា" }
    ]
  },

  // --- ថ្នាក់មត្តេយ្យ (KINDERGARTEN) ---
  {
    id: "BK_GK_KHMER_MATH",
    grade: "ថ្នាក់មត្តេយ្យ",
    subject: "ភាសាខ្មែរ និងគណិតវិទ្យា",
    subjectKey: "khmer",
    title: "ការត្រៀមភាសា និងគណិតវិទ្យាបឋម",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #db2777 0%, #f472b6 100%)",
    icon: "fa-shapes",
    lessons: [
      { num: 1, title: "សកម្មភាពទី១៖ ការស្តាប់ និងការសង្កេតសំឡេង", month: "មករា" },
      { num: 2, title: "សកម្មភាពទី២៖ ការគូសវាស និងគំនូរបន្ទាត់", month: "កុម្ភៈ" },
      { num: 3, title: "សកម្មភាពទី៣៖ ការស្គាល់រូបរាង និងពណ៌", month: "មីនា" },
      { num: 4, title: "សកម្មភាពទី៤៖ ការរាប់ចំនួនពី ១ ដល់ ៥", month: "មេសា" },
      { num: 5, title: "សកម្មភាពទី៥៖ ការរាប់ចំនួនពី ៦ ដល់ ១០", month: "ឧសភា" },
      { num: 6, title: "សកម្មភាពទី៦៖ ការប្រៀបធៀប ធំ-តូច វែង-ខ្លី", month: "សីហា" }
    ]
  },
  {
    id: "BK_GK_LIFE_SCI",
    grade: "ថ្នាក់មត្តេយ្យ",
    subject: "បំណិនជីវិត និងវិទ្យាសាស្ត្របឋម",
    subjectKey: "science",
    title: "បំណិនជីវិត និងវិទ្យាសាស្ត្របឋម",
    publisher: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    edition: "បោះពុម្ពផ្សាយផ្លូវការ",
    coverColor: "linear-gradient(135deg, #059669 0%, #6ee7b7 100%)",
    icon: "fa-sun",
    lessons: [
      { num: 1, title: "សកម្មភាពទី១៖ ដៃស្អាត និងការលាងដៃជាមួយសាប៊ូ", month: "មករា" },
      { num: 2, title: "សកម្មភាពទី២៖ ញ៉ាំបាយស្អាត ផឹកទឹកស្អាត", month: "កុម្ភៈ" },
      { num: 3, title: "សកម្មភាពទី៣៖ សត្វស្លូត និងសត្វកាច", month: "មីនា" },
      { num: 4, title: "សកម្មភាពទី៤៖ ផ្កា ផ្លែឈើ និងស្លឹកឈើ", month: "មេសា" },
      { num: 5, title: "សកម្មភាពទី៥៖ ការចែករំលែក និងលេងជាមួយគ្នា", month: "សីហា" }
    ]
  }
];

// Active State for Library - Initialize synchronously right away!
const libraryState = {
  activeGrade: "all",
  activeSubject: "all",
  searchQuery: "",
  allBooks: [...PRELOADED_TEXTBOOKS],
  currentReaderBook: null,
  currentReaderBlobUrl: null
};

// Asynchronously load custom books and warm up cache
async function initLibraryAsync() {
  const customBooks = await getAllCustomBooks();
  if (customBooks && customBooks.length > 0) {
    // Merge without duplicates
    const existingIds = new Set(PRELOADED_TEXTBOOKS.map(b => b.id));
    const newCustom = customBooks.filter(b => !existingIds.has(b.id));
    libraryState.allBooks = [...PRELOADED_TEXTBOOKS, ...newCustom];
  }
}

// Render Library Tab (Synchronous fast render with async enhancement)
function renderLibrary() {
  renderLibraryGradePills();
  renderLibrarySubjectTabs();
  renderLibraryBooksGrid();

  // Async load custom books in background
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
    const count = g.key === "all" 
      ? libraryState.allBooks.length 
      : libraryState.allBooks.filter(b => b.grade === g.key).length;
    const isActive = libraryState.activeGrade === g.key ? "active" : "";
    html += `
      <button type="button" class="lib-grade-pill ${isActive}" onclick="filterLibraryByGrade('${g.key}')">
        <span>${g.label}</span>
        <span class="lib-pill-count">${count}</span>
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
    { key: "ភាសាខ្មែរ", label: "ភាសាខ្មែរ" },
    { key: "គណិតវិទ្យា", label: "គណិតវិទ្យា" },
    { key: "សិក្សាសង្គម", label: "សិក្សាសង្គម" },
    { key: "វិទ្យាសាស្ត្រ", label: "វិទ្យាសាស្ត្រ" },
    { key: "ភាសាអង់គ្លេស", label: "ភាសាអង់គ្លេស" }
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

// Filter Actions
function filterLibraryByGrade(gradeKey) {
  libraryState.activeGrade = gradeKey;
  renderLibraryGradePills();
  renderLibraryBooksGrid();
}

function filterLibraryBySubject(subjKey) {
  libraryState.activeSubject = subjKey;
  renderLibrarySubjectTabs();
  renderLibraryBooksGrid();
}

function handleLibrarySearch(query) {
  libraryState.searchQuery = (query || "").trim().toLowerCase();
  renderLibraryBooksGrid();
}

function clearLibrarySearch() {
  const input = document.getElementById("librarySearchInput");
  if (input) input.value = "";
  libraryState.searchQuery = "";
  renderLibraryBooksGrid();
}

// Render Books Grid (Synchronous render)
function renderLibraryBooksGrid() {
  const container = document.getElementById("libraryBooksGrid");
  if (!container) return;

  let filtered = libraryState.allBooks;

  // Grade filter
  if (libraryState.activeGrade !== "all") {
    filtered = filtered.filter(b => b.grade === libraryState.activeGrade);
  }

  // Subject filter
  if (libraryState.activeSubject !== "all") {
    filtered = filtered.filter(b => b.subject && b.subject.includes(libraryState.activeSubject));
  }

  // Search filter
  if (libraryState.searchQuery) {
    const q = libraryState.searchQuery;
    filtered = filtered.filter(b => {
      const matchTitle = b.title && b.title.toLowerCase().includes(q);
      const matchGrade = b.grade && b.grade.toLowerCase().includes(q);
      const matchSubject = b.subject && b.subject.toLowerCase().includes(q);
      const matchLessons = b.lessons && b.lessons.some(l => l.title.toLowerCase().includes(q));
      return matchTitle || matchGrade || matchSubject || matchLessons;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="library-empty-state">
        <i class="fa-solid fa-book-open-reader empty-icon"></i>
        <h3>រកមិនឃើញសៀវភៅពុម្ពដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ</h3>
        <p>សូមជ្រើសរើសកម្រិតថ្នាក់ ឬមុខវិជ្ជាផ្សេងទៀត ឬផ្ទុកសៀវភៅថ្មីជាឯកសារ PDF</p>
        <button class="btn btn-primary" onclick="openUploadBookModal()"><i class="fa fa-cloud-arrow-up"></i> ផ្ទុកសៀវភៅថ្មី (Upload PDF)</button>
      </div>
    `;
    return;
  }

  let cardsHtml = "";
  filtered.forEach(b => {
    const hasPdf = storedPdfIdsCache.has(b.id);
    const pdfBadge = hasPdf 
      ? `<span class="badge-pdf-ready"><i class="fa-solid fa-file-pdf"></i> មានឯកសារ PDF</span>` 
      : `<span class="badge-pdf-sample"><i class="fa-solid fa-book-bookmark"></i> សៀវភៅគំរូ</span>`;

    const isCustom = b.id.startsWith("CUSTOM_");
    const deleteBtn = isCustom
      ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteCustomBook('${b.id}')" title="លុបសៀវភៅ"><i class="fa fa-trash"></i></button>`
      : "";

    cardsHtml += `
      <div class="lib-book-card" id="card-${b.id}">
        <div class="lib-book-cover" style="background: ${b.coverColor || '#1e3a8a'};">
          <div class="lib-book-spine"></div>
          <div class="lib-book-cover-content">
            <div class="lib-cover-badges">
              <span class="lib-badge-grade">${b.grade}</span>
              <span class="lib-badge-subj">${b.subject}</span>
            </div>
            <div class="lib-cover-icon"><i class="fa-solid ${b.icon || 'fa-book'}"></i></div>
            <h4 class="lib-cover-title">${b.title}</h4>
            <div class="lib-cover-pub">${b.publisher || 'ក្រសួងអប់រំ យុវជន និងកីឡា'}</div>
          </div>
        </div>
        <div class="lib-book-info">
          <div class="lib-info-header">
            <h4 class="lib-info-title" title="${b.title}">${b.title}</h4>
            ${pdfBadge}
          </div>
          <div class="lib-info-meta">
            <span><i class="fa fa-layer-group"></i> ${b.grade}</span>
            <span><i class="fa fa-list-check"></i> ${b.lessons ? b.lessons.length : 0} មេរៀន</span>
          </div>
          <div class="lib-book-actions">
            <button class="btn btn-sm btn-primary lib-action-read" onclick="openBookReader('${b.id}')">
              <i class="fa fa-book-open"></i> បើកអាន (Read PDF)
            </button>
            <button class="btn btn-sm btn-outline-teal" onclick="viewBookLessonsModal('${b.id}')" title="មើលមាតិកា និងបញ្ជីមេរៀន">
              <i class="fa fa-list-ul"></i> មេរៀន
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="openUploadForExistingBook('${b.id}')" title="ផ្ទុកឯកសារ PDF ជំនួស">
              <i class="fa fa-upload"></i>
            </button>
            ${deleteBtn}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = cardsHtml;
}

// ==========================================================================
// INTERACTIVE PDF READER / VIEWER
// ==========================================================================
async function openBookReader(bookId) {
  const book = libraryState.allBooks.find(b => b.id === bookId);
  if (!book) return;

  libraryState.currentReaderBook = book;
  const modal = document.getElementById("libraryReaderModal");
  if (!modal) return;

  // Header Info
  document.getElementById("readerBookTitle").innerText = book.title;
  document.getElementById("readerGradeBadge").innerText = book.grade;
  document.getElementById("readerSubjBadge").innerText = book.subject;

  // Render Table of Contents / Lessons in Reader Sidebar
  const sidebarList = document.getElementById("readerLessonList");
  let listHtml = "";
  if (book.lessons && book.lessons.length > 0) {
    book.lessons.forEach(l => {
      listHtml += `
        <li class="reader-lesson-item" onclick="focusReaderLesson('${l.num}')">
          <div class="r-lesson-num">${l.num}</div>
          <div class="r-lesson-content">
            <div class="r-lesson-title">${l.title}</div>
            <div class="r-lesson-month"><i class="fa fa-calendar-alt"></i> ខែ${l.month || 'មករា'}</div>
          </div>
          <button type="button" class="btn btn-xs btn-action-report" onclick="event.stopPropagation(); applyLessonToMonthlyReport('${book.subjectKey || 'khmer'}', '${l.title}', '${book.grade}')" title="ជ្រើសរើសមេរៀននេះទៅរបាយការណ៍ប្រចាំខែ">
            <i class="fa fa-arrow-right"></i> រើស
          </button>
        </li>
      `;
    });
  } else {
    listHtml = `<li style="padding: 16px; color: #64748b; font-family: var(--font-battambang); text-align: center;">គ្មានបញ្ជីមេរៀន</li>`;
  }
  sidebarList.innerHTML = listHtml;

  // Check if PDF exists in IndexedDB
  const pdfBlob = await getBookPDF(bookId);
  const frameContainer = document.getElementById("readerFrameContainer");

  if (libraryState.currentReaderBlobUrl) {
    URL.revokeObjectURL(libraryState.currentReaderBlobUrl);
    libraryState.currentReaderBlobUrl = null;
  }

  if (pdfBlob) {
    const blobUrl = URL.createObjectURL(pdfBlob);
    libraryState.currentReaderBlobUrl = blobUrl;
    frameContainer.innerHTML = `
      <iframe src="${blobUrl}#toolbar=1&navpanes=1" class="reader-iframe" title="PDF Viewer"></iframe>
    `;
    document.getElementById("readerDownloadBtn").onclick = () => {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${book.title}.pdf`;
      a.click();
    };
    document.getElementById("readerDownloadBtn").style.display = "inline-flex";
  } else {
    // Generate an interactive HTML/Syllabus preview + drag-and-drop PDF upload prompt
    frameContainer.innerHTML = `
      <div class="reader-placeholder-view">
        <div class="reader-book-showcase" style="background: ${book.coverColor || '#1e3a8a'};">
          <i class="fa-solid ${book.icon || 'fa-book'} showcase-icon"></i>
          <h2>${book.title}</h2>
          <p>${book.publisher} • ${book.grade}</p>
        </div>
        
        <div class="reader-upload-prompt-card">
          <i class="fa-solid fa-cloud-arrow-up upload-card-icon"></i>
          <h3>មិនទាន់មានឯកសារ PDF ពេញលេញនៅឡើយទេ</h3>
          <p>លោកគ្រូ/អ្នកគ្រូ អាចទាញយកឯកសារ PDF របស់សៀវភៅពុម្ពនេះពីកុំព្យូទ័រមកផ្ទុកនៅទីនេះបានភ្លាមៗ</p>
          <div class="reader-quick-upload-drop" onclick="document.getElementById('quickPdfFileInput').click()">
            <input type="file" id="quickPdfFileInput" accept="application/pdf" style="display: none;" onchange="handleQuickUploadPDF(this.files[0], '${book.id}')">
            <i class="fa-solid fa-file-circle-plus"></i> ចុចទីនេះដើម្បីផ្ទុកឯកសារ PDF សម្រាប់សៀវភៅនេះ
          </div>
        </div>

        <div class="reader-syllabus-preview">
          <h3><i class="fa-solid fa-list-check"></i> មាតិកា និងកម្មវិធីសិក្សាផ្លូវការ (${book.lessons ? book.lessons.length : 0} មេរៀន)</h3>
          <div class="syllabus-grid">
            ${(book.lessons || []).map(l => `
              <div class="syllabus-card">
                <span class="syl-badge">${l.num}</span>
                <div class="syl-text">
                  <strong>${l.title}</strong>
                  <div class="syl-meta">បង្រៀនក្នុងខែ៖ <strong>${l.month}</strong></div>
                </div>
                <button class="btn btn-xs btn-outline-primary" onclick="applyLessonToMonthlyReport('${book.subjectKey || 'khmer'}', '${l.title}', '${book.grade}')">
                  <i class="fa fa-arrow-right"></i> រើសទៅរបាយការណ៍
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    document.getElementById("readerDownloadBtn").style.display = "none";
  }

  modal.classList.add("active");
}

function closeBookReaderModal() {
  const modal = document.getElementById("libraryReaderModal");
  if (modal) modal.classList.remove("active");
  if (libraryState.currentReaderBlobUrl) {
    URL.revokeObjectURL(libraryState.currentReaderBlobUrl);
    libraryState.currentReaderBlobUrl = null;
  }
}

async function handleQuickUploadPDF(file, bookId) {
  if (!file || file.type !== "application/pdf") {
    alert("សូមជ្រើសរើសឯកសារជា PDF!");
    return;
  }
  await saveBookPDF(bookId, file, file.name);
  alert("បានផ្ទុកឯកសារ PDF ជោគជ័យ!");
  openBookReader(bookId);
  renderLibraryBooksGrid();
}

function toggleReaderSidebar() {
  const sidebar = document.getElementById("readerSidebar");
  if (sidebar) sidebar.classList.toggle("collapsed");
}

function focusReaderLesson(num) {
  console.log("Focused lesson:", num);
}

// ==========================================================================
// UPLOAD / CUSTOM BOOK MODAL
// ==========================================================================
function openUploadBookModal(existingBookId = null) {
  const modal = document.getElementById("uploadBookModal");
  if (!modal) return;

  const titleEl = document.getElementById("uploadModalTitle");
  const form = document.getElementById("uploadBookForm");
  form.reset();

  if (existingBookId) {
    const book = libraryState.allBooks.find(b => b.id === existingBookId);
    if (book) {
      titleEl.innerText = `ផ្ទុកឯកសារ PDF ជំនួស ៖ ${book.title}`;
      document.getElementById("uploadBookId").value = book.id;
      document.getElementById("uploadBookTitle").value = book.title;
      document.getElementById("uploadBookGrade").value = book.grade;
      document.getElementById("uploadBookSubject").value = book.subject;
      document.getElementById("uploadBookPublisher").value = book.publisher || "ក្រសួងអប់រំ យុវជន និងកីឡា";
      document.getElementById("uploadCustomLessons").value = (book.lessons || []).map(l => l.title).join("\n");
    }
  } else {
    titleEl.innerText = "ផ្ទុកសៀវភៅពុម្ព PDF ថ្មី (Upload New Textbook)";
    document.getElementById("uploadBookId").value = "CUSTOM_" + Date.now();
    document.getElementById("uploadBookPublisher").value = "ក្រសួងអប់រំ យុវជន និងកីឡា";
  }

  modal.classList.add("active");
}

function openUploadForExistingBook(bookId) {
  openUploadBookModal(bookId);
}

function closeUploadBookModal() {
  const modal = document.getElementById("uploadBookModal");
  if (modal) modal.classList.remove("active");
}

async function handleUploadBookSubmit(event) {
  event.preventDefault();
  const bookId = document.getElementById("uploadBookId").value;
  const title = document.getElementById("uploadBookTitle").value.trim();
  const grade = document.getElementById("uploadBookGrade").value;
  const subject = document.getElementById("uploadBookSubject").value;
  const publisher = document.getElementById("uploadBookPublisher").value.trim();
  const lessonsText = document.getElementById("uploadCustomLessons").value.trim();
  const pdfInput = document.getElementById("uploadBookPdfFile");
  const file = pdfInput.files[0];

  if (!title) {
    alert("សូមបញ្ចូលឈ្មោះសៀវភៅ!");
    return;
  }

  // Parse lessons
  let lessons = [];
  if (lessonsText) {
    const lines = lessonsText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const months = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា"];
    lessons = lines.map((line, idx) => ({
      num: idx + 1,
      title: line.startsWith("មេរៀន") || line.startsWith("សកម្មភាព") ? line : `មេរៀនទី${idx+1}៖ ${line}`,
      month: months[Math.min(Math.floor(idx / 2), months.length - 1)]
    }));
  } else {
    const months = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា"];
    for (let i = 1; i <= 10; i++) {
      lessons.push({
        num: i,
        title: `មេរៀនទី${i}៖ មេរៀនទី ${i}`,
        month: months[Math.min(Math.floor((i-1)/2), months.length - 1)]
      });
    }
  }

  // Map subject to subjectKey
  let subjectKey = "khmer";
  if (subject.includes("គណិត")) subjectKey = "math";
  else if (subject.includes("សង្គម")) subjectKey = "social";
  else if (subject.includes("វិទ្យាសាស្ត្រ")) subjectKey = "science";
  else if (subject.includes("អង់គ្លេស")) subjectKey = "english";

  // Check if updating existing preloaded book or custom book
  const isPreloaded = PRELOADED_TEXTBOOKS.some(b => b.id === bookId);
  if (!isPreloaded) {
    const customBook = {
      id: bookId,
      grade,
      subject,
      subjectKey,
      title,
      publisher: publisher || "ក្រសួងអប់រំ យុវជន និងកីឡា",
      edition: "សៀវភៅបន្ថែម",
      coverColor: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
      icon: "fa-book-bookmark",
      lessons
    };
    await saveCustomBookMeta(customBook);
    libraryState.allBooks.push(customBook);
  }

  // Save PDF if selected
  if (file) {
    if (file.type !== "application/pdf") {
      alert("ឯកសារត្រូវតែជា PDF!");
      return;
    }
    await saveBookPDF(bookId, file, file.name);
  }

  closeUploadBookModal();
  renderLibrary();
  alert(`បានរក្សាទុកសៀវភៅ «${title}» ជោគជ័យ!`);
}

async function deleteCustomBook(bookId) {
  if (!confirm("តើអ្នកពិតជាចង់លុបសៀវភៅនេះចេញពីបណ្ណាល័យមែនទេ?")) return;
  await deleteCustomBookMeta(bookId);
  await deleteBookPDF(bookId);
  libraryState.allBooks = libraryState.allBooks.filter(b => b.id !== bookId);
  renderLibrary();
  alert("បានលុបសៀវភៅជោគជ័យ!");
}

// View Book Lessons Modal
function viewBookLessonsModal(bookId) {
  const book = libraryState.allBooks.find(b => b.id === bookId);
  if (!book) return;

  const modal = document.getElementById("bookLessonsModal");
  if (!modal) return;

  document.getElementById("lessonsModalBookTitle").innerText = book.title;
  document.getElementById("lessonsModalBookGrade").innerText = `${book.grade} • ${book.subject}`;

  const container = document.getElementById("lessonsModalList");
  let html = "";
  (book.lessons || []).forEach(l => {
    html += `
      <div class="lesson-picker-row">
        <span class="l-picker-num">${l.num}</span>
        <div class="l-picker-content">
          <div class="l-picker-title">${l.title}</div>
          <div class="l-picker-month"><i class="fa fa-calendar-alt"></i> ខែរៀន៖ <strong>${l.month}</strong></div>
        </div>
        <button type="button" class="btn btn-sm btn-action-report" onclick="applyLessonToMonthlyReport('${book.subjectKey || 'khmer'}', '${l.title}', '${book.grade}')">
          <i class="fa fa-arrow-right"></i> រើសទៅរបាយការណ៍
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
  modal.classList.add("active");
}

function closeBookLessonsModal() {
  const modal = document.getElementById("bookLessonsModal");
  if (modal) modal.classList.remove("active");
}

// Export Library Catalog to Excel
function exportLibraryCatalog() {
  if (typeof XLSX === 'undefined') {
    alert("កំពុងដំណើរការ សូមព្យាយាមម្តងទៀត!");
    return;
  }
  const rows = [
    ["បញ្ជីសៀវភៅពុម្ព និងឯកសារបណ្ណាល័យថ្នាក់រៀន - សាលាបឋមសិក្សា បាន្លួង"],
    [],
    ["ល.រ", "កម្រិតថ្នាក់", "មុខវិជ្ជា", "ឈ្មោះសៀវភៅពុម្ព", "ចំនួនមេរៀន", "អ្នកបោះពុម្ព"]
  ];

  libraryState.allBooks.forEach((b, idx) => {
    rows.push([
      idx + 1,
      b.grade,
      b.subject,
      b.title,
      b.lessons ? b.lessons.length : 0,
      b.publisher || "ក្រសួងអប់រំ យុវជន និងកីឡា"
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Library Catalog");
  XLSX.writeFile(wb, "បញ្ជីសៀវភៅបណ្ណាល័យថ្នាក់រៀន.xlsx");
}

// ==========================================================================
// INTEGRATION WITH MONTHLY REPORT (របាយការណ៍ប្រចាំខែ)
// បម្រើដល់ការធ្វើរបាយការណ៍ក្នុងប្រព័ន្ធអាចរើសមេរៀនតាមមុខវិជ្ជាគ្រប់កម្រិតថ្នាក់បានដោយស្វ័យប្រវត្តិ
// ==========================================================================

// 1. Auto-fill all lessons in Monthly Report for the selected month & grade
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

  const subjects = [
    { key: "khmer", name: "ភាសាខ្មែរ" },
    { key: "math", name: "គណិតវិទ្យា" },
    { key: "social", name: "សិក្សាសង្គម" },
    { key: "science", name: "វិទ្យាសាស្ត្រ" }
  ];

  let filledCount = 0;
  subjects.forEach(sub => {
    // Find book matching subject (handles multi-subject books like វិទ្យាសាស្ត្រ និងសិក្សាសង្គម and Kindergarten បំណិនជីវិត)
    const book = gradeBooks.find(b => 
      (b.subjectKey === sub.key) || 
      (b.subject && b.subject.includes(sub.name)) ||
      (sub.key === "social" && b.subject && b.subject.includes("បំណិនជីវិត"))
    );
    if (book && book.lessons && book.lessons.length > 0) {
      // Find lesson matching month
      let targetLesson = book.lessons.find(l => l.month === monthKey);
      if (!targetLesson) {
        // Fallback to estimated lesson based on month index
        const monthOrder = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
        const mIdx = Math.max(0, monthOrder.indexOf(monthKey));
        const lIdx = Math.min(book.lessons.length - 1, mIdx * 2);
        targetLesson = book.lessons[lIdx];
      }

      if (targetLesson) {
        // Save into currentClass.monthlyReportData
        saveMonthlyReportData(currentClass.id, monthKey, `t3_lesson_${sub.key}`, targetLesson.title);

        // Calculate pace formula
        const totalL = book.lessons.length;
        const currentL = targetLesson.num;
        const fastPace = Math.min(100, Math.round((currentL / totalL) * 100));
        const slowPace = Math.max(0, Math.round(((currentL - 1) / totalL) * 100));

        saveMonthlyReportData(currentClass.id, monthKey, `t3_${sub.key}_fast_num`, `${currentL}`);
        saveMonthlyReportData(currentClass.id, monthKey, `t3_${sub.key}_fast_den`, `${totalL}`);
        saveMonthlyReportData(currentClass.id, monthKey, `t3_${sub.key}_fast_res`, `${fastPace}%`);

        saveMonthlyReportData(currentClass.id, monthKey, `t3_${sub.key}_slow_num`, `${currentL - 1}`);
        saveMonthlyReportData(currentClass.id, monthKey, `t3_${sub.key}_slow_den`, `${totalL}`);
        saveMonthlyReportData(currentClass.id, monthKey, `t3_${sub.key}_slow_res`, `${slowPace}%`);

        filledCount++;
      }
    }
  });

  // Re-render Monthly Report
  renderMonthlyReport();
  alert(`បានជ្រើសរើស និងបំពេញមេរៀនស្វ័យប្រវត្តិចំនួន ${filledCount} មុខវិជ្ជាពីបណ្ណាល័យសម្រាប់ខែ «${monthKey}» (${classGrade}) ជោគជ័យ!`);
}

// 2. Open Picker Modal for a single subject in Monthly Report
function openSubjectLessonPicker(subKey, subName) {
  const currentClass = getActiveClass();
  const classGrade = currentClass ? (currentClass.grade || "ថ្នាក់ទី៦") : "ថ្នាក់ទី៦";
  const monthKey = state.activeMonthlyReportMonth || state.activeScoreMonth || "មករា";

  // Find matching book
  const book = libraryState.allBooks.find(b => 
    b.grade === classGrade && (
      b.subjectKey === subKey || 
      (b.subject && b.subject.includes(subName)) ||
      (subKey === "social" && b.subject && b.subject.includes("បំណិនជីវិត"))
    )
  ) || libraryState.allBooks.find(b => 
    b.subjectKey === subKey || 
    (b.subject && b.subject.includes(subName)) ||
    (subKey === "social" && b.subject && b.subject.includes("បំណិនជីវិត"))
  );

  const modal = document.getElementById("lessonPickerModal");
  if (!modal) return;

  document.getElementById("pickerModalTitle").innerText = `ជ្រើសរើសមេរៀន ៖ ${subName} (${classGrade})`;
  document.getElementById("pickerModalSub").innerText = `សៀវភៅពុម្ព៖ ${book ? book.title : subName} • ប្រចាំខែ ${monthKey}`;

  const container = document.getElementById("pickerLessonsContainer");
  if (!book || !book.lessons || book.lessons.length === 0) {
    container.innerHTML = `<p style="padding: 24px; text-align: center; color: #64748b;">មិនមានបញ្ជីមេរៀនសម្រាប់មុខវិជ្ជានេះទេ</p>`;
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
            <div class="p-month"><i class="fa fa-calendar-alt"></i> ខែបង្រៀន៖ <strong>${l.month}</strong> ${isCurrentMonth ? '(ខែបច្ចុប្បន្ន)' : ''}</div>
          </div>
          <button type="button" class="btn btn-sm btn-primary">ជ្រើសរើស</button>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  modal.classList.add("active");
}

function closeLessonPickerModal() {
  const modal = document.getElementById("lessonPickerModal");
  if (modal) modal.classList.remove("active");
}

function selectLessonForReport(subKey, lessonTitle, lessonNum, totalLessons) {
  const currentClass = getActiveClass();
  if (!currentClass) return;
  const monthKey = state.activeMonthlyReportMonth || state.activeScoreMonth || "មករា";

  saveMonthlyReportData(currentClass.id, monthKey, `t3_lesson_${subKey}`, lessonTitle);

  // Auto calculate pace formula
  const fastPace = Math.min(100, Math.round((lessonNum / totalLessons) * 100));
  const slowPace = Math.max(0, Math.round(((lessonNum - 1) / totalLessons) * 100));

  saveMonthlyReportData(currentClass.id, monthKey, `t3_${subKey}_fast_num`, `${lessonNum}`);
  saveMonthlyReportData(currentClass.id, monthKey, `t3_${subKey}_fast_den`, `${totalLessons}`);
  saveMonthlyReportData(currentClass.id, monthKey, `t3_${subKey}_fast_res`, `${fastPace}%`);

  saveMonthlyReportData(currentClass.id, monthKey, `t3_${subKey}_slow_num`, `${lessonNum - 1}`);
  saveMonthlyReportData(currentClass.id, monthKey, `t3_${subKey}_slow_den`, `${totalLessons}`);
  saveMonthlyReportData(currentClass.id, monthKey, `t3_${subKey}_slow_res`, `${slowPace}%`);

  closeLessonPickerModal();
  renderMonthlyReport();
}

// Apply Lesson directly from Reader / Book modal into Report
function applyLessonToMonthlyReport(subjectKey, lessonTitle, grade) {
  const currentClass = getActiveClass();
  const monthKey = state.activeMonthlyReportMonth || state.activeScoreMonth || "មករា";

  if (currentClass) {
    saveMonthlyReportData(currentClass.id, monthKey, `t3_lesson_${subjectKey}`, lessonTitle);
  }

  closeBookReaderModal();
  closeBookLessonsModal();

  // Switch to Monthly Report Tab
  switchTab("admin_tasks");
  switchAdminSubTab("monthly_report");

  setTimeout(() => {
    renderMonthlyReport();
    alert(`បានជ្រើសរើសមេរៀន «${lessonTitle}» បញ្ចូលទៅក្នុងរបាយការណ៍ប្រចាំខែ (${monthKey}) ដោយជោគជ័យ!`);
  }, 200);
}

// Auto-run if library tab is already active on script load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof state !== "undefined" && state.activeTab === "library") {
      renderLibrary();
    }
  });
} else {
  if (typeof state !== "undefined" && state.activeTab === "library") {
    renderLibrary();
  }
}
