/* =========================================================
   Tuisyen Smart - db.js
   Lapisan pangkalan data tempatan (IndexedDB)
   ========================================================= */
'use strict';

const DB = (() => {
  const DB_NAME = 'tuisyenSmartDB';
  const DB_VERSION = 2;

  // keyPath sentiasa 'id'. Indeks: [nama, keyPath, pilihan]
  const SCHEMA = {
    students:           [['status', 'status'], ['name', 'name'], ['school', 'school'], ['level', 'level']],
    subjects:           [['name', 'name']],
    enrollments:        [['studentId', 'studentId'], ['subjectId', 'subjectId'], ['packageId', 'packageId']],
    packages:           [['name', 'name']],
    packageItems:       [['packageId', 'packageId'], ['subjectId', 'subjectId']],
    classes:            [['date', 'date'], ['studentId', 'studentId'], ['status', 'status'],
                         ['studentIds', 'studentIds', { multiEntry: true }]],
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

  function req(r) {
    return new Promise((resolve, reject) => {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!isSupported()) { reject(new Error('IndexedDB tidak disokong oleh pelayar ini.')); return; }
      const r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        const tx = r.transaction;
        STORE_NAMES.forEach(name => {
          const store = db.objectStoreNames.contains(name)
            ? tx.objectStore(name)
            : db.createObjectStore(name, { keyPath: 'id' });
          SCHEMA[name].forEach(([idxName, keyPath, opts]) => {
            if (!store.indexNames.contains(idxName)) store.createIndex(idxName, keyPath, opts || {});
          });
        });
      };
      r.onsuccess = () => {
        const db = r.result;
        db.onversionchange = () => {
          db.close();
          alert('Pangkalan data dikemas kini di tetingkap lain. Sila muat semula halaman ini.');
        };
        resolve(db);
      };
      r.onerror = () => { dbPromise = null; reject(r.error); };
      r.onblocked = () => console.warn('Peningkatan pangkalan data disekat oleh tab lain.');
    });
    return dbPromise;
  }

  function nowISO() { return new Date().toISOString(); }

  function stamp(record) {
    const now = nowISO();
    return Object.assign({}, record, { createdAt: record.createdAt || now, updatedAt: now });
  }

  function genId(prefix) {
    const t = Date.now().toString(36).toUpperCase();
    let r = '';
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const a = new Uint32Array(2); crypto.getRandomValues(a);
      r = (a[0].toString(36) + a[1].toString(36)).toUpperCase().slice(0, 7);
    } else {
      r = Math.random().toString(36).slice(2, 9).toUpperCase();
    }
    return (prefix ? prefix + '-' : '') + t + r;
  }

  async function store(name, mode) {
    const db = await open();
    return db.transaction(name, mode).objectStore(name);
  }

  async function getAll(name) { return req((await store(name, 'readonly')).getAll()); }

  async function get(name, id) {
    if (id === undefined || id === null || id === '') return null;
    const r = await req((await store(name, 'readonly')).get(id));
    return r === undefined ? null : r;
  }

  async function getAllByIndex(name, indexName, value) {
    const s = await store(name, 'readonly');
    return req(s.index(indexName).getAll(value));
  }

  async function count(name) { return req((await store(name, 'readonly')).count()); }

  // add: gagal jika ID sudah wujud (elak rekod berganda)
  async function add(name, record) {
    const rec = stamp(record);
    await req((await store(name, 'readwrite')).add(rec));
    return rec;
  }

  async function put(name, record) {
    const rec = stamp(record);
    await req((await store(name, 'readwrite')).put(rec));
    return rec;
  }

  async function remove(name, id) { return req((await store(name, 'readwrite')).delete(id)); }

  /**
   * Transaksi atomik merentas beberapa stor.
   * fn(stores) boleh async, tetapi hanya boleh menunggu (await) permintaan IndexedDB
   * melalui DB.req(...). Jika fn gagal, semua perubahan dibatalkan.
   */
  async function transaction(storeNames, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode);
      const stores = {};
      storeNames.forEach(n => { stores[n] = tx.objectStore(n); });
      let result;
      let settled = false;
      const fail = err => {
        if (settled) return;
        settled = true;
        try { tx.abort(); } catch (e) { /* sudah tamat */ }
        reject(err);
      };
      tx.oncomplete = () => { if (!settled) { settled = true; resolve(result); } };
      tx.onerror = () => fail(tx.error);
      tx.onabort = () => fail(tx.error || new Error('Transaksi dibatalkan.'));
      Promise.resolve()
        .then(() => fn(stores, tx))
        .then(r => { result = r; }, err => fail(err));
    });
  }

  // Eksport semua stor (untuk sandaran)
  async function exportAll() {
    const out = {};
    for (const name of STORE_NAMES) out[name] = await getAll(name);
    return out;
  }

  // Ganti semua data (untuk pemulihan) dalam SATU transaksi
  async function replaceAll(data) {
    return transaction(STORE_NAMES, 'readwrite', async st => {
      for (const name of STORE_NAMES) await req(st[name].clear());
      for (const name of STORE_NAMES) {
        for (const rec of (data[name] || [])) await req(st[name].add(rec));
      }
    });
  }

  return {
    DB_NAME, DB_VERSION, STORE_NAMES,
    isSupported, open, genId, stamp, req,
    getAll, get, getAllByIndex, count, add, put, remove, transaction,
    exportAll, replaceAll
  };
})();
