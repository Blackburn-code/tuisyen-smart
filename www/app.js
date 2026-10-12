/* =========================================================
   Tuisyen Smart - app.js
   Fasa 1: Rangka dashboard, navigasi, utiliti, tetapan asas
   ========================================================= */
'use strict';

const APP_VERSION = '0.1.0 · Fasa 1';

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
  flask: '<path d="M9 3h6M10 3v6L4 20a1 1 0 0 0 1 1.5h14A1 1 0 0 0 20 20L14 9V3"/><path d="M7 15h10"/>'
};

function icon(name, cls) {
  return `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* ---------------- Menu utama ---------------- */
const MENU = [
  { id: 'dashboard', label: 'Dashboard', phase: 1 },
  { id: 'pelajar', label: 'Pelajar', phase: 2,
    plan: ['Tambah, kemas kini dan cari pelajar', 'ID pelajar unik automatik', 'Tapis ikut status, sekolah dan tingkatan', 'Nyahaktif tanpa padam sejarah kewangan'] },
  { id: 'subjek', label: 'Subjek', phase: 3,
    plan: ['Daftar subjek dan kadar tersendiri', 'Caj bulanan, setiap kelas atau mengikut jam', 'Pendaftaran subjek pelajar dengan kadar dikunci'] },
  { id: 'pakej', label: 'Pakej Tuisyen', phase: 3,
    plan: ['Pakej beberapa subjek pada satu harga', 'Elak caj berulang bagi subjek dalam pakej'] },
  { id: 'jadual', label: 'Jadual Kelas', phase: 4,
    plan: ['Paparan harian, mingguan dan bulanan', 'Semakan pertindihan jadual', 'Kelas ganti dan kelas dibatalkan', 'Amaran kelas hampir bermula'] },
  { id: 'kehadiran', label: 'Kehadiran', phase: 4,
    plan: ['Status hadir, tidak hadir, lewat, cuti, dibatalkan', 'Peratus kehadiran automatik', 'Elak rekod berganda bagi kelas yang sama'] },
  { id: 'yuran', label: 'Yuran dan Bil', phase: 5,
    plan: ['Bil manual dan bil bulanan pukal', 'Diskaun dan caj tambahan', 'Semakan bil pendua', 'Status bil automatik'] },
  { id: 'bayaran', label: 'Bayaran dan Resit', phase: 5,
    plan: ['Tunai, pindahan bank, DuitNow', 'Bayaran separa dan agihan ke beberapa bil', 'Kredit lebihan bayaran', 'Cetak resit'] },
  { id: 'perbelanjaan', label: 'Perbelanjaan', phase: 6,
    plan: ['Rekod perbelanjaan dan kategori', 'Laporan bulanan dan ikut kategori'] },
  { id: 'prestasi', label: 'Prestasi Akademik', phase: 7,
    plan: ['Rekod ujian dan markah', 'Peratus dan gred automatik', 'Graf perkembangan mengikut subjek'] },
  { id: 'laporan', label: 'Laporan', phase: 6,
    plan: ['Laporan pelajar, kehadiran, bil, kutipan', 'Ringkasan kewangan', 'Cetak dan eksport CSV'] },
  { id: 'sandaran', label: 'Sandaran Data', phase: 8,
    plan: ['Eksport seluruh data ke JSON', 'Import dan pemulihan dengan semakan', 'Panduan pindah data Android ↔ PC'] },
  { id: 'tetapan', label: 'Tetapan', phase: 1 }
];

/* ---------------- Utiliti ---------------- */
const U = {
  pad(n) { return String(n).padStart(2, '0'); },

  // Tarikh tempatan dalam format YYYY-MM-DD (format simpanan)
  toISODate(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}`;
  },
  todayISO() { return U.toISODate(new Date()); },

  addDaysISO(iso, days) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d + days);
    return U.toISODate(dt);
  },

  daysBetween(fromISO, toISO) {
    const [a, b] = [fromISO, toISO].map(s => {
      const [y, m, d] = s.split('-').map(Number);
      return Date.UTC(y, m - 1, d);
    });
    return Math.round((b - a) / 86400000);
  },

  // Paparan DD/MM/YYYY
  formatDate(iso) {
    if (!iso || typeof iso !== 'string') return '—';
    const p = iso.slice(0, 10).split('-');
    if (p.length !== 3) return '—';
    return `${p[2]}/${p[1]}/${p[0]}`;
  },

  dayName(d) {
    return ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'][d.getDay()];
  },

  monthName(m) {
    return ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos',
            'September', 'Oktober', 'November', 'Disember'][m];
  },

  // Wang disimpan dalam SEN (integer). Paparan: RM1,234.50
  formatRM(sen) {
    const n = Number.isFinite(sen) ? Math.round(sen) : 0;
    const neg = n < 0;
    const abs = Math.abs(n);
    const ringgit = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const s = U.pad(abs % 100);
    return `${neg ? '-' : ''}RM${ringgit}.${s}`;
  },

  // Tukar input pengguna "12.50" / "RM 1,200" kepada sen. Pulang null jika tidak sah.
  toSen(input) {
    if (input === null || input === undefined) return null;
    const str = String(input).replace(/rm/i, '').replace(/[,\s]/g, '');
    if (!/^-?\d+(\.\d{1,2})?$/.test(str)) return null;
    const neg = str.startsWith('-');
    const [whole, frac = ''] = str.replace('-', '').split('.');
    const sen = parseInt(whole, 10) * 100 + parseInt((frac + '00').slice(0, 2), 10);
    return neg ? -sen : sen;
  },

  sum(arr, fn) { return arr.reduce((t, x) => t + (Number(fn(x)) || 0), 0); },

  minutesOf(hhmm) {
    if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  },

  nowMinutes() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); },

  esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
};

/* ---------------- Notifikasi (toast) ---------------- */
function toast(message, type) {
  const area = document.getElementById('toastArea');
  const el = document.createElement('div');
  el.className = `toast ${type || 'info'}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.textContent = message;
  area.appendChild(el);
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 250);
  }, type === 'error' ? 5000 : 3000);
}

/* ---------------- Dialog pengesahan ---------------- */
function confirmDialog({ title, message, confirmText, cancelText, danger }) {
  return new Promise(resolve => {
    const root = document.getElementById('modalRoot');
    const prevFocus = document.activeElement;
    root.innerHTML = `
      <div class="modal-backdrop" role="presentation">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="mdTitle">
          <div class="modal-head"><h3 id="mdTitle">${U.esc(title || 'Sahkan tindakan')}</h3></div>
          <div class="modal-body">${U.esc(message || '')}</div>
          <div class="modal-foot">
            <button class="btn btn-outline" data-act="no">${U.esc(cancelText || 'Batal')}</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="yes">${U.esc(confirmText || 'Ya, teruskan')}</button>
          </div>
        </div>
      </div>`;
    const backdrop = root.firstElementChild;
    const close = val => {
      document.removeEventListener('keydown', onKey);
      root.innerHTML = '';
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      resolve(val);
    };
    const onKey = e => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) close(false);
      const act = e.target.closest('[data-act]');
      if (act) close(act.dataset.act === 'yes');
    });
    root.querySelector('[data-act="no"]').focus();
  });
}

/* ---------------- Keadaan aplikasi ---------------- */
const state = {
  profile: null,
  renderToken: 0
};

/* ---------------- Navigasi ---------------- */
function buildNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = MENU.map(m => `
    <a href="#/${m.id}" class="nav-link" data-id="${m.id}">
      ${icon(m.id)}<span>${U.esc(m.label)}</span>
      ${m.phase > 1 ? `<small class="nav-phase" title="Akan dibina dalam Fasa ${m.phase}">F${m.phase}</small>` : ''}
    </a>`).join('');
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

const VIEWS = {
  dashboard: renderDashboard,
  tetapan: renderSettings
};

async function route() {
  const id = (location.hash || '').replace(/^#\/?/, '') || 'dashboard';
  const item = MENU.find(m => m.id === id);
  if (!item) { location.hash = '#/dashboard'; return; }

  document.querySelectorAll('.nav-link').forEach(a => {
    const active = a.dataset.id === id;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.getElementById('pageTitle').textContent = item.label;
  document.title = `${item.label} · Tuisyen Smart`;
  closeSidebar();

  const view = document.getElementById('view');
  const token = ++state.renderToken;
  view.innerHTML = '<div class="loading">Memuatkan…</div>';

  try {
    const html = await (VIEWS[id] ? VIEWS[id]() : renderPlaceholder(item));
    if (token !== state.renderToken) return; // pengguna sudah beralih halaman
    view.innerHTML = html;
    if (VIEWS[id] && VIEWS[id].afterRender) VIEWS[id].afterRender(view);
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    if (token !== state.renderToken) return;
    view.innerHTML = `
      <div class="card"><div class="empty">
        <div class="empty-ico">${icon('alert')}</div>
        <h4>Halaman gagal dimuatkan</h4>
        <p>${U.esc(err && err.message ? err.message : 'Ralat tidak diketahui.')}</p>
        <button class="btn btn-primary" onclick="route()">Cuba lagi</button>
      </div></div>`;
    toast('Gagal memuatkan halaman.', 'error');
  }
}

/* ---------------- Halaman modul belum dibina ---------------- */
function renderPlaceholder(item) {
  return `
    <div class="page-head">
      <div><h2>${U.esc(item.label)}</h2>
      <p>Modul ini akan dibina dalam Fasa ${item.phase}.</p></div>
    </div>
    <div class="card"><div class="empty">
      <div class="empty-ico">${icon(item.id)}</div>
      <h4>Belum tersedia</h4>
      <p>Struktur pangkalan data untuk modul ini sudah disediakan. Fungsi penuh akan ditambah dalam Fasa ${item.phase}.</p>
      ${item.plan ? `<ul class="plan-list">${item.plan.map(p => `<li>${U.esc(p)}</li>`).join('')}</ul>` : ''}
      <a class="btn btn-outline" href="#/dashboard">Kembali ke Dashboard</a>
    </div></div>`;
}

/* ---------------- Dashboard ---------------- */
function statCard(iconName, label, value, note, tone) {
  return `
    <div class="stat ${tone ? 'tone-' + tone : ''}">
      <div class="stat-ico">${icon(iconName)}</div>
      <div>
        <div class="stat-label">${U.esc(label)}</div>
        <div class="stat-value">${U.esc(value)}</div>
        ${note ? `<div class="stat-note">${U.esc(note)}</div>` : ''}
      </div>
    </div>`;
}

// Kira semua angka dashboard daripada rekod sebenar
async function computeDashboard() {
  const [students, subjects, classes, invoices, payments, allocations, expenses] = await Promise.all([
    DB.getAll('students'), DB.getAll('subjects'), DB.getAll('classes'),
    DB.getAll('invoices'), DB.getAll('payments'), DB.getAll('paymentAllocations'),
    DB.getAll('expenses')
  ]);

  const today = U.todayISO();
  const monthKey = today.slice(0, 7);
  const inMonth = r => typeof r.date === 'string' && r.date.slice(0, 7) === monthKey;
  const validInvoice = inv => inv.status !== 'batal';

  const studentMap = new Map(students.map(s => [s.id, s]));
  const subjectMap = new Map(subjects.map(s => [s.id, s]));

  // Jumlah diperuntukkan kepada setiap bil
  const paidByInvoice = new Map();
  allocations.forEach(a => {
    paidByInvoice.set(a.invoiceId, (paidByInvoice.get(a.invoiceId) || 0) + (Number(a.amountSen) || 0));
  });
  const balanceOf = inv => (Number(inv.totalSen) || 0) - (paidByInvoice.get(inv.id) || 0);

  const activeStudents = students.filter(s => s.status === 'aktif').length;
  const classesToday = classes.filter(c => c.date === today && c.status !== 'dibatalkan');
  const collectionMonth = U.sum(payments.filter(inMonth), p => p.amountSen);
  const billedMonth = U.sum(invoices.filter(i => validInvoice(i) && inMonth(i)), i => i.totalSen);
  const outstanding = U.sum(invoices.filter(validInvoice), i => Math.max(0, balanceOf(i)));
  const expensesMonth = U.sum(expenses.filter(inMonth), e => e.amountSen);

  // Bil tertunggak dan bil hampir tamat tempoh (7 hari)
  const soonLimit = U.addDaysISO(today, 7);
  const dueBills = invoices
    .filter(i => validInvoice(i) && balanceOf(i) > 0 && i.dueDate && i.dueDate <= soonLimit)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8)
    .map(i => ({
      inv: i,
      balance: balanceOf(i),
      studentName: (studentMap.get(i.studentId) || {}).name || '—',
      daysLeft: U.daysBetween(today, i.dueDate)
    }));

  // Kelas akan datang (belum bermula)
  const nowMin = U.nowMinutes();
  const upcoming = classes
    .filter(c => (c.status === 'dijadualkan' || c.status === 'ganti') && c.date &&
      (c.date > today || (c.date === today && (U.minutesOf(c.startTime) ?? 0) >= nowMin)))
    .sort((a, b) => (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || '')))
    .slice(0, 8)
    .map(c => ({
      cls: c,
      studentName: (studentMap.get(c.studentId) || {}).name || c.groupName || '—',
      subjectName: (subjectMap.get(c.subjectId) || {}).name || c.subjectName || '—',
      startsIn: c.date === today ? (U.minutesOf(c.startTime) - nowMin) : null
    }));

  return {
    totalStudents: students.length, activeStudents,
    classesToday: classesToday.length,
    collectionMonth, billedMonth, outstanding, expensesMonth,
    dueBills, upcoming, monthKey
  };
}

async function renderDashboard() {
  const d = await computeDashboard();
  const now = new Date();
  const monthLabel = `${U.monthName(now.getMonth())} ${now.getFullYear()}`;
  const centre = state.profile && state.profile.centreName ? state.profile.centreName : 'Tuisyen Smart';

  const stats = `
    <div class="stats">
      ${statCard('pelajar', 'Pelajar aktif', String(d.activeStudents), `Daripada ${d.totalStudents} pelajar berdaftar`)}
      ${statCard('jadual', 'Kelas hari ini', String(d.classesToday), 'Tidak termasuk kelas dibatalkan')}
      ${statCard('bayaran', 'Kutipan bulan ini', U.formatRM(d.collectionMonth), 'Wang sebenar diterima', 'success')}
      ${statCard('yuran', 'Bil bulan ini', U.formatRM(d.billedMonth), 'Jumlah bil dikeluarkan')}
      ${statCard('alert', 'Jumlah tunggakan', U.formatRM(d.outstanding), 'Baki semua bil belum selesai', d.outstanding > 0 ? 'danger' : '')}
      ${statCard('perbelanjaan', 'Perbelanjaan bulan ini', U.formatRM(d.expensesMonth), monthLabel, 'warning')}
    </div>`;

  const billsBody = d.dueBills.length ? `
    <div class="table-wrap"><table class="table">
      <thead><tr><th>No. Bil</th><th>Pelajar</th><th>Tarikh Akhir</th><th class="num">Baki</th><th>Status</th></tr></thead>
      <tbody>${d.dueBills.map(b => {
        const badge = b.daysLeft < 0
          ? `<span class="badge badge-danger">Tertunggak ${Math.abs(b.daysLeft)} hari</span>`
          : b.daysLeft === 0
            ? '<span class="badge badge-warning">Tamat hari ini</span>'
            : `<span class="badge badge-warning">${b.daysLeft} hari lagi</span>`;
        return `<tr>
          <td>${U.esc(b.inv.invoiceNo || b.inv.id)}</td>
          <td>${U.esc(b.studentName)}</td>
          <td>${U.formatDate(b.inv.dueDate)}</td>
          <td class="num">${U.formatRM(b.balance)}</td>
          <td>${badge}</td></tr>`;
      }).join('')}</tbody></table></div>` : `
    <div class="empty">
      <div class="empty-ico">${icon('yuran')}</div>
      <h4>Tiada bil perlu diberi perhatian</h4>
      <p>Bil yang tertunggak atau tamat tempoh dalam 7 hari akan dipaparkan di sini. Modul bil akan dibina dalam Fasa 5.</p>
    </div>`;

  const classesBody = d.upcoming.length ? `
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Tarikh</th><th>Masa</th><th>Pelajar / Kumpulan</th><th>Subjek</th><th>Status</th></tr></thead>
      <tbody>${d.upcoming.map(u => {
        let badge = u.cls.status === 'ganti'
          ? '<span class="badge badge-info">Kelas ganti</span>'
          : '<span class="badge">Dijadualkan</span>';
        if (u.startsIn !== null && u.startsIn >= 0 && u.startsIn <= 60) {
          badge = `<span class="badge badge-warning">Bermula dalam ${u.startsIn} minit</span>`;
        }
        return `<tr>
          <td>${U.formatDate(u.cls.date)}</td>
          <td>${U.esc(u.cls.startTime || '—')}${u.cls.endTime ? '–' + U.esc(u.cls.endTime) : ''}</td>
          <td>${U.esc(u.studentName)}</td>
          <td>${U.esc(u.subjectName)}</td>
          <td>${badge}</td></tr>`;
      }).join('')}</tbody></table></div>` : `
    <div class="empty">
      <div class="empty-ico">${icon('jadual')}</div>
      <h4>Tiada kelas akan datang</h4>
      <p>Kelas yang dijadualkan akan dipaparkan di sini. Modul jadual kelas akan dibina dalam Fasa 4.</p>
    </div>`;

  const firstSteps = d.totalStudents === 0 ? `
    <div class="card"><div class="empty">
      <div class="empty-ico">${icon('pelajar')}</div>
      <h4>Selamat datang ke Tuisyen Smart</h4>
      <p>Belum ada pelajar didaftarkan. Langkah pertama: lengkapkan maklumat pusat tuisyen di Tetapan. Pendaftaran pelajar akan tersedia dalam Fasa 2.</p>
      <a class="btn btn-primary" href="#/tetapan">${icon('tetapan')} Buka Tetapan</a>
    </div></div>` : '';

  return `
    <div class="page-head">
      <div>
        <h2>${U.esc(centre)}</h2>
        <p>Ringkasan ${U.esc(monthLabel)} · dikira daripada rekod sebenar</p>
      </div>
      <div class="actions no-print">
        <button class="btn btn-outline" data-act="refresh">${icon('refresh')} Muat semula</button>
        <button class="btn btn-outline" data-act="print">${icon('print')} Cetak</button>
      </div>
    </div>
    ${stats}
    <div class="stack">
      ${firstSteps}
      <div class="grid-2">
        <section class="card">
          <div class="card-head"><h3>${icon('alert')} Peringatan bil</h3>
            <span class="card-note">Tertunggak & 7 hari akan datang</span></div>
          ${billsBody}
        </section>
        <section class="card">
          <div class="card-head"><h3>${icon('clock')} Kelas akan datang</h3>
            <span class="card-note">8 kelas terdekat</span></div>
          ${classesBody}
        </section>
      </div>
    </div>`;
}

renderDashboard.afterRender = view => {
  view.querySelector('[data-act="refresh"]').addEventListener('click', async () => {
    await route();
    toast('Dashboard dikemas kini.', 'success');
  });
  view.querySelector('[data-act="print"]').addEventListener('click', () => window.print());
};

/* ---------------- Tetapan (asas) ---------------- */
async function loadProfile() {
  state.profile = await DB.get('settings', 'profile');
  const sub = document.getElementById('brandSub');
  sub.textContent = state.profile && state.profile.centreName ? state.profile.centreName : 'Pengurusan Tuisyen';
}

async function renderSettings() {
  const p = state.profile || {};
  const demoExists = !!(await DB.get('students', 'DEMO-P001'));
  const counts = await Promise.all(DB.STORE_NAMES.map(n => DB.count(n)));
  const totalRecords = counts.reduce((a, b) => a + b, 0);

  return `
    <div class="page-head">
      <div><h2>Tetapan</h2><p>Maklumat asas pusat tuisyen dan alat ujian Fasa 1.</p></div>
    </div>
    <div class="stack">
      <section class="card">
        <div class="card-head"><h3>${icon('tetapan')} Maklumat pusat tuisyen</h3></div>
        <div class="card-body">
          <form id="profileForm" novalidate>
            <div class="form-grid">
              <div class="field">
                <label for="centreName">Nama pusat / tutor <span class="req">*</span></label>
                <input id="centreName" name="centreName" maxlength="80" value="${U.esc(p.centreName || '')}" placeholder="cth. Tuisyen Cikgu Hanif">
                <div class="field-error" id="centreNameErr"></div>
              </div>
              <div class="field">
                <label for="phone">No. telefon</label>
                <input id="phone" name="phone" inputmode="tel" maxlength="20" value="${U.esc(p.phone || '')}" placeholder="cth. 012-3456789">
                <div class="field-error" id="phoneErr"></div>
              </div>
              <div class="field">
                <label for="address">Alamat (untuk resit)</label>
                <input id="address" name="address" maxlength="160" value="${U.esc(p.address || '')}" placeholder="Pilihan">
              </div>
            </div>
            <div class="form-actions">
              <button type="reset" class="btn btn-outline">Batal</button>
              <button type="submit" class="btn btn-primary" id="saveProfileBtn">${icon('save')} Simpan</button>
            </div>
          </form>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h3>${icon('sandaran')} Status sistem</h3></div>
        <div class="card-body">
          <dl class="kv">
            <dt>Versi aplikasi</dt><dd>${U.esc(APP_VERSION)}</dd>
            <dt>Pangkalan data</dt><dd>${U.esc(DB.DB_NAME)} (v${DB.DB_VERSION}) · ${DB.STORE_NAMES.length} stor</dd>
            <dt>Jumlah rekod</dt><dd>${totalRecords}</dd>
            <dt>Mod operasi</dt><dd>${isNativeApp() ? 'Aplikasi Android (APK) – fail dibungkus dalam aplikasi' : location.protocol === 'file:' ? 'Fail terus (file://) – PWA tidak aktif' : ('serviceWorker' in navigator ? 'Pelayan web – sokongan offline aktif' : 'Pelayan web – pelayar tidak menyokong Service Worker')}</dd>
            <dt>Storan kekal</dt><dd id="persistInfo">Menyemak…</dd>
          </dl>
        </div>
      </section>

      <section class="card no-print">
        <div class="card-head"><h3>${icon('flask')} Alat ujian Fasa 1</h3></div>
        <div class="card-body">
          <p class="small muted" style="margin-top:0">Masukkan data contoh untuk menguji pengiraan dashboard. Data contoh ditanda khas dan boleh dipadam tanpa menjejaskan data sebenar.</p>
          <div class="actions">
            <button class="btn btn-outline" id="demoAddBtn" ${demoExists ? 'disabled' : ''}>${icon('flask')} Masukkan data contoh</button>
            <button class="btn btn-danger" id="demoDelBtn" ${demoExists ? '' : 'disabled'}>${icon('trash')} Padam data contoh</button>
          </div>
        </div>
      </section>
    </div>`;
}

renderSettings.afterRender = view => {
  const form = view.querySelector('#profileForm');
  const saveBtn = view.querySelector('#saveProfileBtn');

  form.addEventListener('reset', () => {
    setTimeout(() => {
      view.querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
      view.querySelectorAll('.field-error').forEach(e => { e.textContent = ''; });
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (saveBtn.disabled) return; // elak klik berulang
    const name = form.centreName.value.trim();
    const phone = form.phone.value.trim();
    let ok = true;

    const setErr = (id, msg) => {
      view.querySelector('#' + id + 'Err').textContent = msg;
      view.querySelector('#' + id).closest('.field').classList.toggle('invalid', !!msg);
      if (msg) ok = false;
    };
    setErr('centreName', name ? '' : 'Nama pusat / tutor diperlukan.');
    setErr('phone', !phone || /^[0-9+\-\s]{7,20}$/.test(phone) ? '' : 'Format telefon tidak sah.');
    if (!ok) { toast('Sila semak borang.', 'error'); return; }

    saveBtn.disabled = true;
    try {
      const rec = Object.assign({}, state.profile || {}, {
        id: 'profile', centreName: name, phone, address: form.address.value.trim()
      });
      await DB.put('settings', rec);
      await loadProfile();
      toast('Tetapan berjaya disimpan.', 'success');
    } catch (err) {
      console.error(err);
      toast('Gagal menyimpan tetapan.', 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  view.querySelector('#demoAddBtn').addEventListener('click', async ev => {
    ev.currentTarget.disabled = true;
    try {
      await insertDemoData();
      toast('Data contoh dimasukkan. Semak Dashboard.', 'success');
    } catch (err) {
      console.error(err);
      toast(err.message || 'Gagal memasukkan data contoh.', 'error');
    }
    route();
  });

  view.querySelector('#demoDelBtn').addEventListener('click', async ev => {
    const ok = await confirmDialog({
      title: 'Padam data contoh?',
      message: 'Semua rekod bertanda data contoh akan dipadam. Data sebenar tidak terjejas.',
      confirmText: 'Padam', danger: true
    });
    if (!ok) return;
    try {
      const n = await deleteDemoData();
      toast(`${n} rekod contoh dipadam.`, 'success');
    } catch (err) {
      console.error(err);
      toast('Gagal memadam data contoh.', 'error');
    }
    route();
  });

  const info = view.querySelector('#persistInfo');
  if (navigator.storage && navigator.storage.persisted) {
    navigator.storage.persisted().then(p => {
      info.textContent = p ? 'Ya – pelayar tidak akan memadam data secara automatik'
                           : 'Tidak dijamin – buat sandaran berkala (Fasa 8)';
    }).catch(() => { info.textContent = 'Tidak dapat disemak'; });
  } else {
    info.textContent = 'Tidak disokong oleh pelayar ini';
  }
};

/* ---------------- Data contoh (ujian dashboard) ---------------- */
async function insertDemoData() {
  if (await DB.get('students', 'DEMO-P001')) throw new Error('Data contoh sudah wujud.');
  const today = U.todayISO();
  const tomorrow = U.addDaysISO(today, 1);
  const demo = { _demo: true };
  const S = r => DB.stamp(Object.assign({}, r, demo));

  // Satu transaksi: semua masuk atau tiada yang masuk
  await DB.transaction(
    ['students', 'subjects', 'classes', 'invoices', 'payments', 'paymentAllocations', 'expenses'],
    'readwrite',
    st => {
      st.subjects.add(S({ id: 'DEMO-SUB1', name: 'Matematik (contoh)' }));
      st.subjects.add(S({ id: 'DEMO-SUB2', name: 'Sains (contoh)' }));
      st.students.add(S({ id: 'DEMO-P001', name: 'Aisyah (contoh)', status: 'aktif', school: 'SK Contoh', level: 'Tahun 5' }));
      st.students.add(S({ id: 'DEMO-P002', name: 'Danish (contoh)', status: 'aktif', school: 'SMK Contoh', level: 'Tingkatan 2' }));
      st.students.add(S({ id: 'DEMO-P003', name: 'Irfan (contoh)', status: 'tidak aktif', school: 'SMK Contoh', level: 'Tingkatan 3' }));

      st.classes.add(S({ id: 'DEMO-C1', date: today, startTime: '23:00', endTime: '23:59', studentId: 'DEMO-P001', subjectId: 'DEMO-SUB1', status: 'dijadualkan' }));
      st.classes.add(S({ id: 'DEMO-C2', date: today, startTime: '08:00', endTime: '09:00', studentId: 'DEMO-P002', subjectId: 'DEMO-SUB2', status: 'dibatalkan' }));
      st.classes.add(S({ id: 'DEMO-C3', date: tomorrow, startTime: '15:00', endTime: '16:30', studentId: 'DEMO-P002', subjectId: 'DEMO-SUB1', status: 'dijadualkan' }));

      st.invoices.add(S({ id: 'DEMO-INV1', invoiceNo: 'DEMO-B0001', studentId: 'DEMO-P001', date: today, dueDate: U.addDaysISO(today, 3), totalSen: 8000, status: 'separa' }));
      st.invoices.add(S({ id: 'DEMO-INV2', invoiceNo: 'DEMO-B0002', studentId: 'DEMO-P002', date: today, dueDate: U.addDaysISO(today, -2), totalSen: 18000, status: 'tertunggak' }));

      st.payments.add(S({ id: 'DEMO-PAY1', receiptNo: 'DEMO-R0001', studentId: 'DEMO-P001', date: today, amountSen: 5000, method: 'tunai' }));
      st.paymentAllocations.add(S({ id: 'DEMO-AL1', paymentId: 'DEMO-PAY1', invoiceId: 'DEMO-INV1', amountSen: 5000 }));

      st.expenses.add(S({ id: 'DEMO-EXP1', date: today, category: 'Alat tulis', description: 'Kertas latihan (contoh)', amountSen: 3550, method: 'tunai' }));
    }
  );
}

async function deleteDemoData() {
  const names = ['students', 'subjects', 'classes', 'invoices', 'payments', 'paymentAllocations', 'expenses'];
  const all = await Promise.all(names.map(n => DB.getAll(n)));
  let n = 0;
  await DB.transaction(names, 'readwrite', st => {
    names.forEach((name, i) => {
      all[i].filter(r => r._demo === true).forEach(r => { st[name].delete(r.id); n++; });
    });
  });
  return n;
}

/* ---------------- Status rangkaian & tarikh ---------------- */
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

/* ---------------- Banner mod fail terus ---------------- */
function showFileBanner() {
  if (location.protocol !== 'file:') return;
  let dismissed = false;
  try { dismissed = localStorage.getItem('ts_hideFileBanner') === '1'; } catch (e) { /* abaikan */ }
  if (dismissed) return;
  const el = document.getElementById('banner');
  el.innerHTML = `
    <div class="banner">
      ${icon('alert')}
      <div class="grow">Anda membuka fail secara terus (file://). Fungsi PWA (pasang & offline cache) tidak aktif, dan sesetengah pelayar mungkin tidak menyimpan data secara konsisten. Gunakan pelayan tempatan – lihat README.md.</div>
      <button class="btn btn-sm btn-outline" id="hideBanner">Faham</button>
    </div>`;
  el.querySelector('#hideBanner').addEventListener('click', () => {
    try { localStorage.setItem('ts_hideFileBanner', '1'); } catch (e) { /* abaikan */ }
    el.innerHTML = '';
  });
}

/* ---------------- Service Worker ---------------- */
function isNativeApp() {
  return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform());
}

function registerServiceWorker() {
  if (isNativeApp()) return; // Dalam APK, semua fail sudah ada dalam aplikasi
  if (!('serviceWorker' in navigator)) return;
  const secure = location.protocol === 'https:' ||
    ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (!secure) return;
  navigator.serviceWorker.register('service-worker.js').catch(err => {
    console.warn('Service Worker gagal didaftarkan:', err);
  });
}

/* ---------------- Permulaan ---------------- */
async function init() {
  document.getElementById('appVersion').textContent = `Versi ${APP_VERSION}`;
  updateToday();
  updateNetBadge();
  setInterval(updateToday, 60000);
  window.addEventListener('online', updateNetBadge);
  window.addEventListener('offline', updateNetBadge);

  document.getElementById('menuBtn').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('overlay').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });

  buildNav();
  showFileBanner();

  if (!DB.isSupported()) {
    document.getElementById('view').innerHTML = `
      <div class="card"><div class="empty">
        <div class="empty-ico">${icon('alert')}</div>
        <h4>Pelayar tidak disokong</h4>
        <p>Pelayar ini tidak menyokong IndexedDB. Sila gunakan Google Chrome, Microsoft Edge atau Firefox versi terkini.</p>
      </div></div>`;
    return;
  }

  try {
    await DB.open();
    await loadProfile();
  } catch (err) {
    console.error(err);
    document.getElementById('view').innerHTML = `
      <div class="card"><div class="empty">
        <div class="empty-ico">${icon('alert')}</div>
        <h4>Pangkalan data gagal dibuka</h4>
        <p>${U.esc(err.message || 'Ralat tidak diketahui.')} Pastikan anda tidak menggunakan mod inkognito / peribadi.</p>
      </div></div>`;
    return;
  }

  // Minta pelayar simpan data secara kekal (jika disokong)
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  window.addEventListener('hashchange', route);
  if (!location.hash) history.replaceState(null, '', '#/dashboard');
  route();
  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', init);
