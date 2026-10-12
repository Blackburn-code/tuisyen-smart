/* =========================================================
   Tuisyen Smart - db.js
   Lapisan pangkalan data tempatan (IndexedDB)
   Semua stor dicipta sejak Fasa 1 supaya struktur stabil.
   ========================================================= */
'use strict';

const DB = (() => {
  const DB_NAME = 'tuisyenSmartDB';
  const DB_VERSION = 1;

  // Definisi stor: keyPath sentiasa 'id'. Indeks: [nama, keyPath, {unique}]
  const SCHEMA = {
    students:           [['status', 'status'], ['name', 'name'], ['school', 'school'], ['level', 'level']],
    subjects:           [['name', 'name']],
    enrollments:        [['studentId', 'studentId'], ['subjectId', 'subjectId']],
    packages:           [['name', 'name']],
    packageItems:       [['packageId', 'packageId'], ['subjectId', 'subjectId']],
    classes:            [['date', 'date'], ['studentId', 'studentId'], ['status', 'status']],
    attendance:         [['classId', 'classId'], ['studentId', 'studentId'],
                         ['classStudent', ['classId', 'studentId'], { unique: true }]],
    invoices:           [['studentId', 'studentId'], ['date', 'date'], ['status', 'status'],
                         ['invoiceNo', 'invoiceNo', { unique: true }]],
    invoiceItems:       [['invoiceId', 'invoiceId']],
    payments:           [['studentId', 'studentId'], ['date', 'date'],
                         ['receiptNo', 'receiptNo', { unique: true }]],
    paymentAllocations: [['paymentId', 'paymentId'], ['invoiceId', 'invoiceId']],
    expenses:           [['date', 'date'], ['category', 'category']],
    assessments:        [['subjectId', 'subjectId'], ['date', 'date']],
    assessmentResults:  [['assessmentId', 'assessmentId'], ['studentId', 'studentId']],
    settings:           []
  };

  const STORE_NAMES = Object.keys(SCHEMA);
  let dbPromise = null;

  function isSupported() {
    try { return typeof indexedDB !== 'undefined' && indexedDB !== null; }
    catch (e) { return false; }
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!isSupported()) {
        reject(new Error('IndexedDB tidak disokong oleh pelayar ini.'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        const tx = req.transaction;
        STORE_NAMES.forEach(name => {
          const store = db.objectStoreNames.contains(name)
            ? tx.objectStore(name)
            : db.createObjectStore(name, { keyPath: 'id' });
          SCHEMA[name].forEach(([idxName, keyPath, opts]) => {
            if (!store.indexNames.contains(idxName)) {
              store.createIndex(idxName, keyPath, opts || {});
            }
          });
        });
      };

      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          alert('Versi pangkalan data telah dikemas kini di tab lain. Sila muat semula halaman ini.');
        };
        resolve(db);
      };
      req.onerror = () => { dbPromise = null; reject(req.error); };
      req.onblocked = () => {
        console.warn('Peningkatan pangkalan data disekat oleh tab lain yang masih terbuka.');
      };
    });
    return dbPromise;
  }

  function nowISO() { return new Date().toISOString(); }

  // Tambah cap masa createdAt / updatedAt
  function stamp(record) {
    const now = nowISO();
    return Object.assign({}, record, {
      createdAt: record.createdAt || now,
      updatedAt: now
    });
  }

  // ID unik umum: PREFIX-<masa base36>-<rawak>
  function genId(prefix) {
    const t = Date.now().toString(36).toUpperCase();
    let r = '';
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const a = new Uint32Array(1); crypto.getRandomValues(a);
      r = a[0].toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
    } else {
      r = Math.random().toString(36).slice(2, 8).toUpperCase();
    }
    return (prefix ? prefix + '-' : '') + t + r;
  }

  async function store(name, mode) {
    const db = await open();
    return db.transaction(name, mode).objectStore(name);
  }

  async function getAll(name) {
    return reqToPromise((await store(name, 'readonly')).getAll());
  }

  async function get(name, id) {
    const r = await reqToPromise((await store(name, 'readonly')).get(id));
    return r === undefined ? null : r;
  }

  async function getAllByIndex(name, indexName, value) {
    const s = await store(name, 'readonly');
    return reqToPromise(s.index(indexName).getAll(value));
  }

  async function count(name) {
    return reqToPromise((await store(name, 'readonly')).count());
  }

  // add: gagal jika ID sudah wujud (elak rekod berganda)
  async function add(name, record) {
    const rec = stamp(record);
    await reqToPromise((await store(name, 'readwrite')).add(rec));
    return rec;
  }

  // put: cipta atau kemas kini
  async function put(name, record) {
    const rec = stamp(record);
    await reqToPromise((await store(name, 'readwrite')).put(rec));
    return rec;
  }

  async function remove(name, id) {
    return reqToPromise((await store(name, 'readwrite')).delete(id));
  }

  /**
   * Transaksi atomik merentas beberapa stor.
   * fn(stores, tx) menerima objek { namaStor: objectStore }.
   * Semua perubahan berjaya bersama atau dibatalkan bersama.
   */
  async function transaction(storeNames, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode);
      const stores = {};
      storeNames.forEach(n => { stores[n] = tx.objectStore(n); });
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaksi dibatalkan.'));
      try {
        result = fn(stores, tx);
      } catch (err) {
        try { tx.abort(); } catch (e) { /* abaikan */ }
        reject(err);
      }
    });
  }

  return {
    DB_NAME, DB_VERSION, STORE_NAMES,
    isSupported, open, genId, stamp,
    getAll, get, getAllByIndex, count, add, put, remove, transaction
  };
})();
