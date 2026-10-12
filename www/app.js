/* =========================================================
   Tuisyen Smart - app.js (teras)
   Navigasi, utiliti, komponen UI, tetapan, kewangan asas,
   dashboard, cetakan dan simpan fail.
   Modul lain (js/*.js) mendaftar paparan melalui App.view().
   ========================================================= */
'use strict';

const APP_VERSION = '1.0.0';

/* ---------------- Ikon (SVG tempatan) ---------------- */
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  pelajar: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1"/><path d="M16 3.5a4 4 0 0 1 0 7"/><path d="M22 21v-1a5 5 0 0 0-3-4.6"/>',
  subjek: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  pakej: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  jadual: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  kehadiran: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  yuran: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  bayaran: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  perbelanjaan: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  prestasi: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  laporan: '<rect x="7" y="2" width="10" height="4" rx="1"/><path d="M8 4H5a1 1 0 0 0-1 1v16h16V5a1 1 0 0 0-1-1h-3"/><path d="M8 12h8M8 16h6"/>',
  sandaran: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  tetapan: '<path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M21 18h-1"/><circle cx="16" cy="6" r="2.2"/><circle cx="10" cy="12" r="2.2"/><circle cx="18" cy="18" r="2.2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  save: '<path d="M5 3h11l5 5v13H3V3z"/><path d="M7 3v6h8M7 21v-7h10v7"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 3h16"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  left: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 18l6-6-6-6"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  csv: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13l3 4M11 13l-3 4M14 13h3v4h-3"/>'
};

function icon(name, cls) {
  return `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* ---------------- Menu utama ---------------- */
const MENU = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'pelajar', label: 'Pelajar' },
  { id: 'subjek', label: 'Subjek' },
  { id: 'pakej', label: 'Pakej Tuisyen' },
  { id: 'jadual', label: 'Jadual Kelas' },
  { id: 'kehadiran', label: 'Kehadiran' },
  { id: 'yuran', label: 'Yuran dan Bil' },
  { id: 'bayaran', label: 'Bayaran dan Resit' },
  { id: 'perbelanjaan', label: 'Perbelanjaan' },
  { id: 'prestasi', label: 'Prestasi Akademik' },
  { id: 'laporan', label: 'Laporan' },
  { id: 'sandaran', label: 'Sandaran Data' },
  { id: 'tetapan', label: 'Tetapan' }
];

/* ---------------- Utiliti ---------------- */
const U = {
  pad(n) { return String(n).padStart(2, '0'); },

  toISODate(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}`;
  },
  todayISO() { return U.toISODate(new Date()); },
  parseISO(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); },
  addDaysISO(iso, days) { const d = U.parseISO(iso); d.setDate(d.getDate() + days); return U.toISODate(d); },
  daysBetween(fromISO, toISO) {
    const f = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
    return Math.round((f(toISO) - f(fromISO)) / 86400000);
  },
  monthStart(key) { return key + '-01'; },
  monthEnd(key) {
    const [y, m] = key.split('-').map(Number);
    return U.toISODate(new Date(y, m, 0));
  },
  addMonths(key, n) {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}`;
  },
  isISODate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(U.parseISO(s)); },
  inRange(iso, from, to) { return !!iso && (!from || iso >= from) && (!to || iso <= to); },

  formatDate(iso) {
    if (!iso || typeof iso !== 'string') return '—';
    const p = iso.slice(0, 10).split('-');
    if (p.length !== 3) return '—';
    return `${p[2]}/${p[1]}/${p[0]}`;
  },
  formatDateTime(isoTs) {
    if (!isoTs) return '—';
    const d = new Date(isoTs);
    if (isNaN(d)) return '—';
    return `${U.formatDate(U.toISODate(d))} ${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`;
  },
  dayName(d) { return ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'][d.getDay()]; },
  dayShort(d) { return ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'][d.getDay()]; },
  monthName(m) {
    return ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos',
      'September', 'Oktober', 'November', 'Disember'][m];
  },
  monthLabel(key) { const [y, m] = key.split('-').map(Number); return `${U.monthName(m - 1)} ${y}`; },

  // Wang disimpan dalam SEN (integer)
  formatRM(sen) {
    const n = Number.isFinite(sen) ? Math.round(sen) : 0;
    const neg = n < 0;
    const abs = Math.abs(n);
    const ringgit = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${neg ? '-' : ''}RM${ringgit}.${U.pad(abs % 100)}`;
  },
  senToInput(sen) {
    if (!Number.isFinite(sen)) return '';
    const neg = sen < 0; const a = Math.abs(Math.round(sen));
    return `${neg ? '-' : ''}${Math.floor(a / 100)}.${U.pad(a % 100)}`;
  },
  toSen(input) {
    if (input === null || input === undefined) return null;
    const str = String(input).replace(/rm/i, '').replace(/[,\s]/g, '');
    if (!/^-?\d+(\.\d{1,2})?$/.test(str)) return null;
    const neg = str.startsWith('-');
    const [whole, frac = ''] = str.replace('-', '').split('.');
    const sen = parseInt(whole, 10) * 100 + parseInt((frac + '00').slice(0, 2), 10);
    return neg ? -sen : sen;
  },

  sum(arr, fn) { return arr.reduce((t, x) => t + (Number(fn ? fn(x) : x) || 0), 0); },
  minutesOf(hhmm) {
    if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  },
  nowMinutes() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); },
  durationText(min) {
    if (!Number.isFinite(min) || min <= 0) return '—';
    const h = Math.floor(min / 60), m = min % 60;
    return (h ? h + ' jam ' : '') + (m ? m + ' minit' : '').trim() || '0 minit';
  },
  pct(n) { return Number.isFinite(n) ? (Math.round(n * 10) / 10).toFixed(1) + '%' : '—'; },

  esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  norm(s) { return String(s || '').toLowerCase().trim(); },
  byName(a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'ms'); },
  mapBy(arr, key) { return new Map(arr.map(x => [x[key || 'id'], x])); },
  groupBy(arr, fn) {
    const m = new Map();
    arr.forEach(x => { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
    return m;
  },
  options(list, value, placeholder) {
    const ph = placeholder !== undefined ? `<option value="">${U.esc(placeholder)}</option>` : '';
    return ph + list.map(o => {
      const [v, t] = Array.isArray(o) ? o : [o, o];
      return `<option value="${U.esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${U.esc(t)}</option>`;
    }).join('');
  }
};

/* ---------------- Notifikasi ---------------- */
function toast(message, type) {
  const area = document.getElementById('toastArea');
  const el = document.createElement('div');
  el.className = `toast ${type || 'info'}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.textContent = message;
  area.appendChild(el);
  while (area.children.length > 4) area.firstElementChild.remove();
  setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 250); },
    type === 'error' ? 5000 : 3000);
}

/* ---------------- Modal ---------------- */
const modalStack = [];

function openModal({ title, body, footer, size }) {
  const root = document.getElementById('modalRoot');
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal ${size || ''}" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>${U.esc(title || '')}</h3>
        <button type="button" class="icon-btn modal-x" data-close aria-label="Tutup">${icon('close')}</button>
      </div>
      <div class="modal-body">${body || ''}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  root.appendChild(wrap);
  document.body.classList.add('modal-open');
  const prevFocus = document.activeElement;
  const m = {
    el: wrap.querySelector('.modal'),
    wrap,
    onClose: null,
    close() {
      const i = modalStack.indexOf(m);
      if (i >= 0) modalStack.splice(i, 1);
      wrap.remove();
      if (!modalStack.length) document.body.classList.remove('modal-open');
      if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { /* abaikan */ }
      if (m.onClose) m.onClose();
    }
  };
  wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => m.close()));
  modalStack.push(m);
  return m;
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalStack.length) { e.stopPropagation(); modalStack[modalStack.length - 1].close(); }
}, true);

function confirmDialog({ title, message, confirmText, cancelText, danger }) {
  return new Promise(resolve => {
    let answered = false;
    const m = openModal({
      title: title || 'Sahkan tindakan',
      body: `<p class="confirm-msg">${U.esc(message || '')}</p>`,
      footer: `<button class="btn btn-outline" data-act="no">${U.esc(cancelText || 'Batal')}</button>
               <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="yes">${U.esc(confirmText || 'Ya, teruskan')}</button>`,
      size: 'modal-sm'
    });
    m.onClose = () => { if (!answered) resolve(false); };
    m.el.querySelector('[data-act="no"]').addEventListener('click', () => m.close());
    m.el.querySelector('[data-act="yes"]').addEventListener('click', () => { answered = true; m.close(); resolve(true); });
    m.el.querySelector('[data-act="no"]').focus();
  });
}

/* ---------------- Borang ---------------- */
const F = {
  wrap(name, label, input, o) {
    o = o || {};
    return `<div class="field ${o.cls || ''}">
      ${label ? `<label for="f_${name}">${U.esc(label)}${o.req ? ' <span class="req">*</span>' : ''}</label>` : ''}
      ${input}
      ${o.help ? `<div class="field-help">${U.esc(o.help)}</div>` : ''}
      <div class="field-error" data-err="${name}"></div>
    </div>`;
  },
  text(name, label, value, o) {
    o = o || {};
    return F.wrap(name, label, `<input id="f_${name}" name="${name}" type="${o.type || 'text'}"
      value="${U.esc(value === undefined || value === null ? '' : value)}"
      ${o.placeholder ? `placeholder="${U.esc(o.placeholder)}"` : ''}
      ${o.max ? `maxlength="${o.max}"` : ''} ${o.attrs || ''}>`, o);
  },
  money(name, label, sen, o) {
    return F.text(name, label, Number.isFinite(sen) ? U.senToInput(sen) : '',
      Object.assign({ placeholder: '0.00', attrs: 'inputmode="decimal" autocomplete="off"' }, o || {}));
  },
  date(name, label, iso, o) { return F.text(name, label, iso || '', Object.assign({ type: 'date' }, o || {})); },
  time(name, label, v, o) { return F.text(name, label, v || '', Object.assign({ type: 'time' }, o || {})); },
  number(name, label, v, o) {
    return F.text(name, label, v, Object.assign({ type: 'number', attrs: 'inputmode="decimal" step="any"' }, o || {}));
  },
  select(name, label, list, value, o) {
    o = o || {};
    return F.wrap(name, label, `<select id="f_${name}" name="${name}" ${o.attrs || ''}>${U.options(list, value, o.placeholder)}</select>`, o);
  },
  textarea(name, label, value, o) {
    return F.wrap(name, label, `<textarea id="f_${name}" name="${name}" rows="${(o && o.rows) || 2}" maxlength="1000">${U.esc(value || '')}</textarea>`, o);
  }
};

function formData(form) {
  const out = {};
  Array.from(form.elements).forEach(el => {
    if (!el.name || el.disabled) return;
    if (el.type === 'checkbox') {
      if (el.dataset.multi !== undefined) {
        out[el.name] = out[el.name] || [];
        if (el.checked) out[el.name].push(el.value);
      } else out[el.name] = el.checked;
    } else if (el.type === 'radio') {
      if (el.checked) out[el.name] = el.value;
    } else out[el.name] = typeof el.value === 'string' ? el.value.trim() : el.value;
  });
  return out;
}

// errs: { namaMedan: 'mesej' } — pulang true jika tiada ralat
function showErrors(form, errs) {
  form.querySelectorAll('[data-err]').forEach(e => { e.textContent = ''; });
  form.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
  const keys = Object.keys(errs || {}).filter(k => errs[k]);
  keys.forEach(k => {
    const box = form.querySelector(`[data-err="${k}"]`);
    if (box) { box.textContent = errs[k]; const f = box.closest('.field'); if (f) f.classList.add('invalid'); }
  });
  if (keys.length) {
    const first = form.querySelector('.field.invalid input, .field.invalid select, .field.invalid textarea');
    if (first) first.focus();
    const unshown = keys.filter(k => !form.querySelector(`[data-err="${k}"]`));
    toast(unshown.length ? errs[unshown[0]] : 'Sila semak maklumat yang ditanda.', 'error');
  }
  return keys.length === 0;
}

/**
 * Modal borang dengan butang Simpan yang dilindungi daripada klik berulang.
 * onSubmit(data, form, modal) — pulangkan false untuk kekalkan modal terbuka.
 */
function formModal({ title, body, submitText, size, onOpen, onSubmit, danger }) {
  const m = openModal({
    title, size,
    body: `<form class="modal-form" novalidate>${body}<button type="submit" hidden></button></form>`,
    footer: `<button type="button" class="btn btn-outline" data-close>Batal</button>
             <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-submit>${icon('save')} ${U.esc(submitText || 'Simpan')}</button>`
  });
  const form = m.el.querySelector('form');
  const btn = m.el.querySelector('[data-submit]');
  let busy = false;
  const submit = async () => {
    if (busy) return;
    busy = true; btn.disabled = true;
    try {
      const res = await onSubmit(formData(form), form, m);
      if (res !== false) m.close();
    } catch (err) {
      console.error(err);
      toast(errorText(err), 'error');
    } finally {
      busy = false; btn.disabled = false;
    }
  };
  btn.addEventListener('click', submit);
  form.addEventListener('submit', e => { e.preventDefault(); submit(); });
  if (onOpen) onOpen(form, m);
  const first = form.querySelector('input:not([type=hidden]):not([type=checkbox]), select, textarea');
  if (first && window.innerWidth > 900) first.focus();
  return m;
}

function errorText(err) {
  if (!err) return 'Ralat tidak diketahui.';
  if (err.name === 'ConstraintError') return 'Rekod yang sama sudah wujud (rekod pendua disekat).';
  if (err.name === 'QuotaExceededError') return 'Ruang storan peranti penuh.';
  return err.message || String(err);
}

// Jalankan tindakan async pada butang tanpa membenarkan klik berulang
async function busyRun(btn, fn) {
  if (btn && btn.dataset.busy === '1') return;
  if (btn) { btn.dataset.busy = '1'; btn.disabled = true; }
  try { return await fn(); }
  catch (err) { console.error(err); toast(errorText(err), 'error'); }
  finally { if (btn) { btn.dataset.busy = ''; btn.disabled = false; } }
}

/* ---------------- Jadual & paparan ---------------- */
function tableHTML(headers, rows, empty) {
  if (!rows.length) return empty || emptyState('search', 'Tiada rekod', 'Tiada rekod yang sepadan.');
  return `<div class="table-wrap"><table class="table">
    <thead><tr>${headers.map(h => {
      const [t, cls] = Array.isArray(h) ? h : [h, ''];
      return `<th class="${cls}">${U.esc(t)}</th>`;
    }).join('')}</tr></thead>
    <tbody>${rows.join('')}</tbody></table></div>`;
}

function emptyState(ic, title, text, actionHtml) {
  return `<div class="empty">
    <div class="empty-ico">${icon(ic)}</div>
    <h4>${U.esc(title)}</h4>
    ${text ? `<p>${U.esc(text)}</p>` : ''}
    ${actionHtml || ''}
  </div>`;
}

function badge(text, tone) { return `<span class="badge ${tone ? 'badge-' + tone : ''}">${U.esc(text)}</span>`; }

function pageHead(title, sub, actions) {
  return `<div class="page-head">
    <div><h2>${U.esc(title)}</h2>${sub ? `<p>${U.esc(sub)}</p>` : ''}</div>
    ${actions ? `<div class="actions no-print">${actions}</div>` : ''}
  </div>`;
}

function statCard(iconName, label, value, note, tone) {
  return `<div class="stat ${tone ? 'tone-' + tone : ''}">
    <div class="stat-ico">${icon(iconName)}</div>
    <div>
      <div class="stat-label">${U.esc(label)}</div>
      <div class="stat-value">${U.esc(value)}</div>
      ${note ? `<div class="stat-note">${U.esc(note)}</div>` : ''}
    </div>
  </div>`;
}

/* ---------------- Platform asli (APK) ---------------- */
const Native = {
  isApp() {
    return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform());
  },
  call(method, opts) {
    const C = window.Capacitor;
    if (C && C.Plugins && C.Plugins.TSNative && typeof C.Plugins.TSNative[method] === 'function') {
      return C.Plugins.TSNative[method](opts || {});
    }
    if (C && typeof C.nativePromise === 'function') return C.nativePromise('TSNative', method, opts || {});
    return Promise.reject(new Error('Fungsi peranti tidak tersedia.'));
  }
};

// Simpan fail teks: muat turun (pelayar) atau menu kongsi/simpan (APK)
async function saveTextFile(filename, text, mime) {
  if (Native.isApp()) {
    await Native.call('shareFile', { filename, data: text, mimeType: mime || 'text/plain' });
    return;
  }
  const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function toCSV(rows) {
  const cell = v => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n');
}

async function exportCSV(filename, rows) {
  try {
    await saveTextFile(filename, toCSV(rows), 'text/csv');
    toast('Fail CSV disediakan.', 'success');
  } catch (err) { toast(errorText(err), 'error'); }
}

const senCSV = sen => (Math.round(sen) / 100).toFixed(2);

// Cetak dokumen khusus (resit, bil, laporan)
async function printDoc(title, html) {
  const area = document.getElementById('printArea');
  const p = state.profile || {};
  area.innerHTML = `<div class="print-doc">
    <div class="print-head">
      <div><strong>${U.esc(p.centreName || 'Tuisyen Smart')}</strong>
      ${p.address ? `<div>${U.esc(p.address)}</div>` : ''}
      ${p.phone ? `<div>Tel: ${U.esc(p.phone)}</div>` : ''}</div>
      <div class="print-title">${U.esc(title)}</div>
    </div>
    ${html}
    <div class="print-foot">Dijana oleh Tuisyen Smart pada ${U.formatDateTime(new Date().toISOString())}</div>
  </div>`;
  document.body.classList.add('print-mode');
  await printPage(title);
}

async function printPage(title) {
  try {
    if (Native.isApp()) await Native.call('print', { name: title || 'Tuisyen Smart' });
    else window.print();
  } catch (err) {
    toast(errorText(err), 'error');
  }
}

window.addEventListener('afterprint', () => {
  if (!Native.isApp()) document.body.classList.remove('print-mode');
});

/* ---------------- Tetapan ---------------- */
const SETTING_DEFAULTS = {
  profile: { centreName: '', phone: '', address: '', receiptNote: 'Terima kasih atas bayaran anda.' },
  billing: { dueDays: 7, invoicePrefix: 'B', receiptPrefix: 'R' },
  attendance: { lateCountsPresent: true, includeMakeup: true },
  grades: {
    allowOverFull: false,
    list: [{ min: 80, g: 'A' }, { min: 65, g: 'B' }, { min: 50, g: 'C' }, { min: 40, g: 'D' }, { min: 0, g: 'E' }]
  },
  expenseCategories: { list: ['Sewa', 'Utiliti', 'Alat tulis', 'Bahan rujukan', 'Pengangkutan', 'Internet & telefon', 'Lain-lain'] },
  backupInfo: { lastExportAt: null },
  counters: {}
};

const Settings = {
  async get(id) {
    const rec = await DB.get('settings', id);
    return Object.assign({ id }, JSON.parse(JSON.stringify(SETTING_DEFAULTS[id] || {})), rec || {});
  },
  async save(id, obj) {
    const cur = await DB.get('settings', id);
    return DB.put('settings', Object.assign({}, cur || {}, obj, { id }));
  }
};

// Nombor berjujukan dalam transaksi (stor 'settings' mesti termasuk)
async function nextNumber(st, key) {
  const rec = (await DB.req(st.settings.get('counters'))) || { id: 'counters' };
  const n = (Number(rec[key]) || 0) + 1;
  rec[key] = n;
  await DB.req(st.settings.put(DB.stamp(rec)));
  return n;
}

/* ---------------- Kewangan (dikongsi semua modul) ---------------- */
const Fin = {
  // Muat semua data kewangan dan kira baki secara dinamik
  async load() {
    const [invoices, payments, allocations] = await Promise.all([
      DB.getAll('invoices'), DB.getAll('payments'), DB.getAll('paymentAllocations')
    ]);
    const payMap = U.mapBy(payments);
    const validAlloc = allocations.filter(a => { const p = payMap.get(a.paymentId); return p && p.status !== 'batal'; });
    const paidByInvoice = new Map();
    const allocByPayment = new Map();
    validAlloc.forEach(a => {
      paidByInvoice.set(a.invoiceId, (paidByInvoice.get(a.invoiceId) || 0) + a.amountSen);
      allocByPayment.set(a.paymentId, (allocByPayment.get(a.paymentId) || 0) + a.amountSen);
    });
    const today = U.todayISO();
    const f = {
      invoices, payments, allocations, validAlloc, paidByInvoice, allocByPayment, today,
      paid: inv => paidByInvoice.get(inv.id) || 0,
      balance: inv => inv.status === 'batal' ? 0 : (inv.totalSen || 0) - (paidByInvoice.get(inv.id) || 0),
      status: inv => Fin.status(inv, paidByInvoice.get(inv.id) || 0, today),
      unallocated: p => p.status === 'batal' ? 0 : p.amountSen - (allocByPayment.get(p.id) || 0),
      validInvoices: invoices.filter(i => i.status !== 'batal'),
      validPayments: payments.filter(p => p.status !== 'batal')
    };
    f.creditOf = studentId => U.sum(f.validPayments.filter(p => p.studentId === studentId), p => f.unallocated(p));
    f.outstandingOf = studentId => U.sum(f.validInvoices.filter(i => i.studentId === studentId), i => Math.max(0, f.balance(i)));
    return f;
  },
  status(inv, paid, today) {
    if (inv.status === 'batal') return 'batal';
    const total = inv.totalSen || 0;
    if (paid >= total) return 'selesai';
    const overdue = inv.dueDate && inv.dueDate < (today || U.todayISO());
    if (overdue) return 'tertunggak';
    return paid > 0 ? 'separa' : 'belum bayar';
  },
  statusBadge(s) {
    const map = { 'selesai': ['Selesai', 'success'], 'separa': ['Bayaran separa', 'warning'],
      'belum bayar': ['Belum bayar', 'info'], 'tertunggak': ['Tertunggak', 'danger'], 'batal': ['Dibatalkan', ''] };
    const [t, tone] = map[s] || [s, ''];
    return badge(t, tone);
  }
};

/* ---------------- Keadaan & penghala ---------------- */
const state = { profile: null, renderToken: 0, params: [] };
const VIEWS = {};

const App = {
  view(id, def) { VIEWS[id] = def; },
  go(hash) { if (location.hash === hash) route(); else location.hash = hash; },
  refresh() { return route(); }
};

function buildNav() {
  document.getElementById('nav').innerHTML = MENU.map(m => `
    <a href="#/${m.id}" class="nav-link" data-id="${m.id}">${icon(m.id)}<span>${U.esc(m.label)}</span></a>`).join('');
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').hidden = false;
  document.getElementById('menuBtn').setAttribute('aria-expanded', 'true');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').hidden = true;
  document.getElementById('menuBtn').setAttribute('aria-expanded', 'false');
}

async function route() {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
  const id = parts[0] || 'dashboard';
  const item = MENU.find(m => m.id === id);
  const def = VIEWS[id];
  if (!item || !def) { location.hash = '#/dashboard'; return; }
  state.params = parts.slice(1);

  document.querySelectorAll('.nav-link').forEach(a => {
    const active = a.dataset.id === id;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.getElementById('pageTitle').textContent = item.label;
  document.title = `${item.label} · Tuisyen Smart`;
  document.body.classList.remove('print-mode');
  closeSidebar();
  while (modalStack.length) modalStack[modalStack.length - 1].close();

  const view = document.getElementById('view');
  const token = ++state.renderToken;
  if (!view.innerHTML.trim()) view.innerHTML = '<div class="loading">Memuatkan…</div>';

  try {
    const html = await def.render(state.params);
    if (token !== state.renderToken) return;
    const y = view.dataset.route === raw ? window.scrollY : 0;
    // Bekas baharu setiap kali supaya pendengar acara lama dibuang
    const page = document.createElement('div');
    page.className = 'page';
    page.innerHTML = html;
    view.replaceChildren(page);
    view.dataset.route = raw;
    if (def.after) await def.after(page, state.params);
    window.scrollTo(0, y);
  } catch (err) {
    console.error(err);
    if (token !== state.renderToken) return;
    view.innerHTML = `<div class="card">${emptyState('alert', 'Halaman gagal dimuatkan', errorText(err),
      '<button class="btn btn-primary" onclick="App.refresh()">Cuba lagi</button>')}</div>`;
  }
}

/* ---------------- Dashboard ---------------- */
async function computeDashboard() {
  const [students, subjects, classes, expenses, fin] = await Promise.all([
    DB.getAll('students'), DB.getAll('subjects'), DB.getAll('classes'), DB.getAll('expenses'), Fin.load()
  ]);
  const today = U.todayISO();
  const monthKey = today.slice(0, 7);
  const inMonth = r => typeof r.date === 'string' && r.date.slice(0, 7) === monthKey;
  const studentMap = U.mapBy(students);
  const subjectMap = U.mapBy(subjects);

  const soonLimit = U.addDaysISO(today, 7);
  const dueBills = fin.validInvoices
    .filter(i => fin.balance(i) > 0 && i.dueDate && i.dueDate <= soonLimit)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8)
    .map(i => ({ inv: i, balance: fin.balance(i), studentName: (studentMap.get(i.studentId) || {}).name || '—',
      daysLeft: U.daysBetween(today, i.dueDate) }));

  const nowMin = U.nowMinutes();
  const upcoming = classes
    .filter(c => (c.status === 'dijadualkan' || c.status === 'ganti') && c.date &&
      (c.date > today || (c.date === today && (U.minutesOf(c.startTime) ?? 0) >= nowMin)))
    .sort((a, b) => (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || '')))
    .slice(0, 8);

  return {
    totalStudents: students.length,
    activeStudents: students.filter(s => s.status === 'aktif').length,
    classesToday: classes.filter(c => c.date === today && c.status !== 'dibatalkan').length,
    collectionMonth: U.sum(fin.validPayments.filter(inMonth), p => p.amountSen),
    billedMonth: U.sum(fin.validInvoices.filter(inMonth), i => i.totalSen),
    outstanding: U.sum(fin.validInvoices, i => Math.max(0, fin.balance(i))),
    expensesMonth: U.sum(expenses.filter(inMonth), e => e.amountSen),
    dueBills, upcoming, studentMap, subjectMap, today, nowMin
  };
}

function classWho(c, studentMap) {
  const names = (c.studentIds || []).map(id => (studentMap.get(id) || {}).name).filter(Boolean);
  if (c.groupName) return c.groupName + (names.length ? ` (${names.length} pelajar)` : '');
  return names.join(', ') || '—';
}

App.view('dashboard', {
  async render() {
    const d = await computeDashboard();
    const now = new Date();
    const monthLabel = `${U.monthName(now.getMonth())} ${now.getFullYear()}`;
    const centre = state.profile && state.profile.centreName ? state.profile.centreName : 'Tuisyen Smart';

    const stats = `<div class="stats">
      ${statCard('pelajar', 'Pelajar aktif', String(d.activeStudents), `Daripada ${d.totalStudents} pelajar berdaftar`)}
      ${statCard('jadual', 'Kelas hari ini', String(d.classesToday), 'Tidak termasuk kelas dibatalkan')}
      ${statCard('bayaran', 'Kutipan bulan ini', U.formatRM(d.collectionMonth), 'Wang sebenar diterima', 'success')}
      ${statCard('yuran', 'Bil bulan ini', U.formatRM(d.billedMonth), 'Jumlah bil dikeluarkan')}
      ${statCard('alert', 'Jumlah tunggakan', U.formatRM(d.outstanding), 'Baki semua bil belum selesai', d.outstanding > 0 ? 'danger' : '')}
      ${statCard('perbelanjaan', 'Perbelanjaan bulan ini', U.formatRM(d.expensesMonth), monthLabel, 'warning')}
    </div>`;

    const bills = d.dueBills.length ? tableHTML(['No. Bil', 'Pelajar', 'Tarikh Akhir', ['Baki', 'num'], 'Status'],
      d.dueBills.map(b => {
        const st = b.daysLeft < 0 ? badge(`Tertunggak ${Math.abs(b.daysLeft)} hari`, 'danger')
          : b.daysLeft === 0 ? badge('Tamat hari ini', 'warning') : badge(`${b.daysLeft} hari lagi`, 'warning');
        return `<tr class="click-row" data-href="#/yuran/${encodeURIComponent(b.inv.id)}">
          <td>${U.esc(b.inv.invoiceNo)}</td><td>${U.esc(b.studentName)}</td>
          <td>${U.formatDate(b.inv.dueDate)}</td><td class="num">${U.formatRM(b.balance)}</td><td>${st}</td></tr>`;
      })) : emptyState('yuran', 'Tiada bil perlu diberi perhatian', 'Bil yang tertunggak atau tamat tempoh dalam 7 hari akan dipaparkan di sini.');

    const classes = d.upcoming.length ? tableHTML(['Tarikh', 'Masa', 'Pelajar / Kumpulan', 'Subjek', 'Status'],
      d.upcoming.map(c => {
        let st = c.status === 'ganti' ? badge('Kelas ganti', 'info') : badge('Dijadualkan');
        const startsIn = c.date === d.today ? U.minutesOf(c.startTime) - d.nowMin : null;
        if (startsIn !== null && startsIn >= 0 && startsIn <= 60) st = badge(`Bermula dalam ${startsIn} minit`, 'warning');
        return `<tr class="click-row" data-href="#/jadual/hari/${c.date}">
          <td>${U.formatDate(c.date)}</td><td>${U.esc(c.startTime || '—')}–${U.esc(c.endTime || '')}</td>
          <td>${U.esc(classWho(c, d.studentMap))}</td><td>${U.esc((d.subjectMap.get(c.subjectId) || {}).name || '—')}</td>
          <td>${st}</td></tr>`;
      })) : emptyState('jadual', 'Tiada kelas akan datang', 'Tambah kelas di menu Jadual Kelas.',
      '<a class="btn btn-outline" href="#/jadual">Buka Jadual Kelas</a>');

    const firstSteps = d.totalStudents === 0 ? `<div class="card">${emptyState('pelajar', 'Selamat datang ke Tuisyen Smart',
      'Mulakan dengan: 1) isi maklumat pusat di Tetapan, 2) daftar subjek, 3) daftar pelajar.',
      `<div class="actions center"><a class="btn btn-outline" href="#/tetapan">Tetapan</a>
       <a class="btn btn-outline" href="#/subjek">Daftar subjek</a>
       <a class="btn btn-primary" href="#/pelajar">${icon('plus')} Daftar pelajar</a></div>`)}</div>` : '';

    return `${pageHead(centre, `Ringkasan ${monthLabel} · dikira daripada rekod sebenar`,
      `<button class="btn btn-outline" data-act="refresh">${icon('refresh')} Muat semula</button>
       <button class="btn btn-outline" data-act="print">${icon('print')} Cetak</button>`)}
      ${stats}
      <div class="stack">
        ${firstSteps}
        <div class="grid-2">
          <section class="card"><div class="card-head"><h3>${icon('alert')} Peringatan bil</h3>
            <span class="card-note">Tertunggak & 7 hari akan datang</span></div>${bills}</section>
          <section class="card"><div class="card-head"><h3>${icon('clock')} Kelas akan datang</h3>
            <span class="card-note">8 kelas terdekat</span></div>${classes}</section>
        </div>
      </div>`;
  },
  after(view) {
    view.querySelector('[data-act="refresh"]').addEventListener('click', async () => {
      await App.refresh(); toast('Dashboard dikemas kini.', 'success');
    });
    view.querySelector('[data-act="print"]').addEventListener('click', () => printPage('Dashboard'));
  }
});

/* ---------------- Tetapan ---------------- */
async function loadProfile() {
  state.profile = await Settings.get('profile');
  document.getElementById('brandSub').textContent = state.profile.centreName || 'Pengurusan Tuisyen';
}

App.view('tetapan', {
  async render() {
    const [p, b, a, g] = await Promise.all([Settings.get('profile'), Settings.get('billing'),
      Settings.get('attendance'), Settings.get('grades')]);
    const counts = await Promise.all(DB.STORE_NAMES.map(n => DB.count(n)));
    const totalRecords = counts.reduce((x, y) => x + y, 0);
    const gradeRows = g.list.map((r, i) => `<div class="grade-row">
        <input name="g_min_${i}" type="number" min="0" max="100" value="${r.min}" aria-label="Peratus minimum">
        <span>% ke atas =</span>
        <input name="g_g_${i}" maxlength="4" value="${U.esc(r.g)}" aria-label="Gred"></div>`).join('');

    return `${pageHead('Tetapan', 'Maklumat pusat, bil, kehadiran dan gred.')}
    <div class="stack">
      <section class="card"><div class="card-head"><h3>${icon('tetapan')} Maklumat pusat tuisyen</h3></div>
        <div class="card-body"><form id="profileForm" novalidate>
          <div class="form-grid">
            ${F.text('centreName', 'Nama pusat / tutor', p.centreName, { req: true, max: 80, placeholder: 'cth. Tuisyen Cikgu Hanif' })}
            ${F.text('phone', 'No. telefon', p.phone, { max: 20, attrs: 'inputmode="tel"' })}
            ${F.text('address', 'Alamat (untuk resit)', p.address, { max: 160 })}
            ${F.text('receiptNote', 'Nota kaki resit', p.receiptNote, { max: 160 })}
          </div>
          <div class="form-actions"><button class="btn btn-primary" type="submit">${icon('save')} Simpan</button></div>
        </form></div></section>

      <section class="card"><div class="card-head"><h3>${icon('yuran')} Bil dan resit</h3></div>
        <div class="card-body"><form id="billingForm" novalidate>
          <div class="form-grid">
            ${F.number('dueDays', 'Tempoh bayar (hari selepas tarikh bil)', b.dueDays, { req: true })}
            ${F.text('invoicePrefix', 'Awalan no. bil', b.invoicePrefix, { max: 5, help: 'cth. B → B2026-0001' })}
            ${F.text('receiptPrefix', 'Awalan no. resit', b.receiptPrefix, { max: 5, help: 'cth. R → R2026-0001' })}
          </div>
          <div class="form-actions"><button class="btn btn-primary" type="submit">${icon('save')} Simpan</button></div>
        </form></div></section>

      <section class="card"><div class="card-head"><h3>${icon('kehadiran')} Polisi kehadiran</h3></div>
        <div class="card-body"><form id="attForm" novalidate>
          <p class="small muted mt0">Peratus kehadiran = kelas dihadiri ÷ kelas layak dikira × 100. Kelas yang dibatalkan dan cuti/dikecualikan tidak dikira dalam penyebut.</p>
          <label class="check"><input type="checkbox" name="lateCountsPresent" ${a.lateCountsPresent ? 'checked' : ''}> Lewat dikira sebagai hadir</label>
          <label class="check"><input type="checkbox" name="includeMakeup" ${a.includeMakeup ? 'checked' : ''}> Kelas ganti dikira dalam peratus kehadiran</label>
          <div class="form-actions"><button class="btn btn-primary" type="submit">${icon('save')} Simpan</button></div>
        </form></div></section>

      <section class="card"><div class="card-head"><h3>${icon('prestasi')} Skala gred</h3></div>
        <div class="card-body"><form id="gradeForm" novalidate>
          <p class="small muted mt0">Gred diisi automatik berdasarkan peratus jika tidak dimasukkan secara manual.</p>
          <div class="grade-list">${gradeRows}</div>
          <label class="check"><input type="checkbox" name="allowOverFull" ${g.allowOverFull ? 'checked' : ''}> Benarkan markah melebihi markah penuh (markah bonus)</label>
          <div class="form-actions"><button class="btn btn-primary" type="submit">${icon('save')} Simpan</button></div>
        </form></div></section>

      <section class="card"><div class="card-head"><h3>${icon('sandaran')} Status sistem</h3></div>
        <div class="card-body"><dl class="kv">
          <dt>Versi aplikasi</dt><dd>${U.esc(APP_VERSION)}</dd>
          <dt>Pangkalan data</dt><dd>${U.esc(DB.DB_NAME)} (v${DB.DB_VERSION}) · ${DB.STORE_NAMES.length} stor</dd>
          <dt>Jumlah rekod</dt><dd>${totalRecords}</dd>
          <dt>Mod operasi</dt><dd>${Native.isApp() ? 'Aplikasi Android (APK)' : location.protocol === 'file:' ? 'Fail terus (file://)' : 'Pelayar web'}</dd>
          <dt>Storan kekal</dt><dd id="persistInfo">Menyemak…</dd>
        </dl></div></section>
    </div>`;
  },
  after(view) {
    const bind = (id, fn) => {
      const form = view.querySelector('#' + id);
      const btn = form.querySelector('[type=submit]');
      form.addEventListener('submit', e => { e.preventDefault(); busyRun(btn, () => fn(form, formData(form))); });
    };
    bind('profileForm', async (form, d) => {
      if (!showErrors(form, {
        centreName: d.centreName ? '' : 'Nama pusat / tutor diperlukan.',
        phone: !d.phone || /^[0-9+\-\s]{7,20}$/.test(d.phone) ? '' : 'Format telefon tidak sah.'
      })) return;
      await Settings.save('profile', d);
      await loadProfile();
      toast('Maklumat pusat disimpan.', 'success');
    });
    bind('billingForm', async (form, d) => {
      const days = parseInt(d.dueDays, 10);
      if (!showErrors(form, { dueDays: days >= 0 && days <= 365 ? '' : 'Masukkan 0 hingga 365 hari.' })) return;
      await Settings.save('billing', { dueDays: days, invoicePrefix: d.invoicePrefix || 'B', receiptPrefix: d.receiptPrefix || 'R' });
      toast('Tetapan bil disimpan.', 'success');
    });
    bind('attForm', async (form, d) => {
      await Settings.save('attendance', { lateCountsPresent: !!d.lateCountsPresent, includeMakeup: !!d.includeMakeup });
      toast('Polisi kehadiran disimpan.', 'success');
    });
    bind('gradeForm', async (form, d) => {
      const list = [];
      for (let i = 0; d['g_min_' + i] !== undefined; i++) {
        const min = Number(d['g_min_' + i]);
        const g = d['g_g_' + i];
        if (!g) continue;
        if (!(min >= 0 && min <= 100)) { toast('Peratus minimum mesti 0 hingga 100.', 'error'); return; }
        list.push({ min, g });
      }
      list.sort((x, y) => y.min - x.min);
      await Settings.save('grades', { list, allowOverFull: !!d.allowOverFull });
      toast('Skala gred disimpan.', 'success');
      App.refresh();
    });
    const info = view.querySelector('#persistInfo');
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(p => {
        info.textContent = p || Native.isApp() ? 'Ya – data kekal dalam peranti' : 'Tidak dijamin – buat sandaran berkala';
      }).catch(() => { info.textContent = 'Tidak dapat disemak'; });
    } else info.textContent = Native.isApp() ? 'Ya – data kekal dalam aplikasi' : 'Tidak disokong';
  }
});

/* ---------------- Status rangkaian, tarikh, banner ---------------- */
function updateNetBadge() {
  const b = document.getElementById('netBadge');
  const on = navigator.onLine;
  b.textContent = on ? 'Dalam talian' : 'Luar talian';
  b.classList.toggle('offline', !on);
  b.title = 'Aplikasi berfungsi tanpa internet. Status ini hanya makluman.';
}
function updateToday() {
  const d = new Date();
  document.getElementById('todayLabel').textContent = `${U.dayName(d)}, ${U.formatDate(U.toISODate(d))}`;
}

function showFileBanner() {
  if (location.protocol !== 'file:') return;
  let dismissed = false;
  try { dismissed = localStorage.getItem('ts_hideFileBanner') === '1'; } catch (e) { /* abaikan */ }
  if (dismissed) return;
  const el = document.getElementById('banner');
  el.innerHTML = `<div class="banner">${icon('alert')}
    <div class="grow">Anda membuka fail secara terus (file://). PWA tidak aktif dan sesetengah pelayar tidak menyimpan data secara konsisten. Gunakan APK atau pelayan tempatan.</div>
    <button class="btn btn-sm btn-outline" id="hideBanner">Faham</button></div>`;
  el.querySelector('#hideBanner').addEventListener('click', () => {
    try { localStorage.setItem('ts_hideFileBanner', '1'); } catch (e) { /* abaikan */ }
    el.innerHTML = '';
  });
}

function registerServiceWorker() {
  if (Native.isApp() || !('serviceWorker' in navigator)) return;
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (!secure) return;
  navigator.serviceWorker.register('service-worker.js').catch(err => console.warn('Service Worker gagal:', err));
}

// Amaran kelas yang akan bermula dalam 30 minit (sekali bagi setiap kelas)
const notifiedClasses = new Set();
async function checkUpcomingClasses() {
  try {
    const today = U.todayISO();
    const list = await DB.getAllByIndex('classes', 'date', today);
    const now = U.nowMinutes();
    const soon = list.filter(c => (c.status === 'dijadualkan' || c.status === 'ganti') &&
      !notifiedClasses.has(c.id) && U.minutesOf(c.startTime) - now >= 0 && U.minutesOf(c.startTime) - now <= 30);
    soon.forEach(c => notifiedClasses.add(c.id));
    soon.forEach(c => toast(`Kelas bermula pada ${c.startTime} (${U.minutesOf(c.startTime) - now} minit lagi).`, 'warning'));
  } catch (e) { /* abaikan */ }
}

/* ---------------- Permulaan ---------------- */
async function init() {
  document.getElementById('appVersion').textContent = `Versi ${APP_VERSION}`;
  updateToday(); updateNetBadge();
  setInterval(updateToday, 60000);
  window.addEventListener('online', updateNetBadge);
  window.addEventListener('offline', updateNetBadge);

  document.getElementById('menuBtn').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('overlay').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modalStack.length) closeSidebar(); });
  document.getElementById('view').addEventListener('click', e => {
    const row = e.target.closest('[data-href]');
    if (row && !e.target.closest('button, a, input, select, label')) location.hash = row.dataset.href;
  });

  buildNav();
  showFileBanner();

  const view = document.getElementById('view');
  if (!DB.isSupported()) {
    view.innerHTML = `<div class="card">${emptyState('alert', 'Pelayar tidak disokong',
      'Pelayar ini tidak menyokong IndexedDB. Gunakan Google Chrome, Microsoft Edge atau Firefox terkini.')}</div>`;
    return;
  }
  try {
    await DB.open();
    await loadProfile();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="card">${emptyState('alert', 'Pangkalan data gagal dibuka',
      errorText(err) + ' Pastikan anda tidak menggunakan mod inkognito.')}</div>`;
    return;
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  window.addEventListener('hashchange', route);
  if (!location.hash) history.replaceState(null, '', '#/dashboard');
  await route();
  registerServiceWorker();
  checkUpcomingClasses();
  setInterval(checkUpcomingClasses, 5 * 60000);
}

document.addEventListener('DOMContentLoaded', init);
