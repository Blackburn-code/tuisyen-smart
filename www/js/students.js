/* =========================================================
   Tuisyen Smart - js/students.js
   Fasa 2: Pendaftaran & pengurusan pelajar
   ========================================================= */
'use strict';

const STUDENT_STATUS = [['aktif', 'Aktif'], ['tidak aktif', 'Tidak aktif'], ['berhenti', 'Berhenti']];
const FEE_METHODS = [['bulanan', 'Bulanan'], ['kelas', 'Setiap kelas'], ['jam', 'Mengikut jam'], ['pakej', 'Pakej']];
const LEVELS = ['Prasekolah', 'Tahun 1', 'Tahun 2', 'Tahun 3', 'Tahun 4', 'Tahun 5', 'Tahun 6',
  'Tingkatan 1', 'Tingkatan 2', 'Tingkatan 3', 'Tingkatan 4', 'Tingkatan 5', 'Tingkatan 6', 'Lain-lain'];

const Students = {
  statusBadge(s) {
    return s === 'aktif' ? badge('Aktif', 'success') : s === 'berhenti' ? badge('Berhenti', 'danger') : badge('Tidak aktif');
  },
  feeLabel(v) { const f = FEE_METHODS.find(x => x[0] === v); return f ? f[1] : '—'; },
  initials(name) {
    return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },
  async sorted(filterFn) {
    const all = await DB.getAll('students');
    return all.filter(filterFn || (() => true)).sort(U.byName);
  },

  formBody(s, schools) {
    s = s || {};
    return `
      <datalist id="dlSchools">${schools.map(x => `<option value="${U.esc(x)}">`).join('')}</datalist>
      <datalist id="dlLevels">${LEVELS.map(x => `<option value="${U.esc(x)}">`).join('')}</datalist>
      <div class="form-grid">
        ${F.text('name', 'Nama penuh', s.name, { req: true, max: 100, cls: 'span-2' })}
        ${F.text('school', 'Sekolah', s.school, { max: 100, attrs: 'list="dlSchools"' })}
        ${F.text('level', 'Tahun / Tingkatan', s.level, { max: 30, attrs: 'list="dlLevels"' })}
        ${F.text('phone', 'No. telefon pelajar', s.phone, { max: 20, attrs: 'inputmode="tel"', help: 'Jika ada' })}
        ${F.text('guardianName', 'Nama ibu bapa / penjaga', s.guardianName, { max: 100 })}
        ${F.text('guardianPhone', 'No. telefon penjaga', s.guardianPhone, { max: 20, attrs: 'inputmode="tel"' })}
        ${F.date('regDate', 'Tarikh pendaftaran', s.regDate || U.todayISO(), { req: true })}
        ${F.select('feeMethod', 'Kaedah yuran', FEE_METHODS, s.feeMethod || 'bulanan')}
        ${F.select('status', 'Status', STUDENT_STATUS, s.status || 'aktif')}
        ${F.text('address', 'Alamat', s.address, { max: 200, cls: 'span-2', help: 'Jika diperlukan' })}
        ${F.textarea('notes', 'Catatan', s.notes, { cls: 'span-2' })}
      </div>`;
  },

  validate(d) {
    const phone = v => !v || /^[0-9+\-\s()]{7,20}$/.test(v);
    return {
      name: d.name ? (d.name.length < 2 ? 'Nama terlalu pendek.' : '') : 'Nama penuh diperlukan.',
      phone: phone(d.phone) ? '' : 'Format telefon tidak sah.',
      guardianPhone: phone(d.guardianPhone) ? '' : 'Format telefon tidak sah.',
      regDate: U.isISODate(d.regDate) ? '' : 'Tarikh pendaftaran diperlukan.'
    };
  },

  async openForm(existing) {
    const all = await DB.getAll('students');
    const schools = [...new Set(all.map(s => s.school).filter(Boolean))].sort();
    formModal({
      title: existing ? `Kemas kini ${existing.name}` : 'Tambah pelajar',
      size: 'modal-lg',
      body: Students.formBody(existing, schools),
      submitText: existing ? 'Kemas kini' : 'Simpan',
      async onSubmit(d, form) {
        if (!showErrors(form, Students.validate(d))) return false;
        const fields = ['name', 'school', 'level', 'phone', 'guardianName', 'guardianPhone', 'regDate', 'feeMethod', 'status', 'address', 'notes'];
        const rec = {};
        fields.forEach(f => { rec[f] = d[f] || ''; });

        // Amaran nama berganda (bukan sekatan — nama boleh sama)
        const dup = all.find(s => U.norm(s.name) === U.norm(rec.name) && (!existing || s.id !== existing.id));
        if (dup && !(await confirmDialog({ title: 'Nama sudah wujud',
          message: `Pelajar bernama "${dup.name}" (${dup.id}) sudah berdaftar. Teruskan simpan sebagai pelajar lain?`,
          confirmText: 'Ya, simpan' }))) return false;

        if (existing) {
          await DB.put('students', Object.assign({}, existing, rec));
          toast('Maklumat pelajar dikemas kini.', 'success');
        } else {
          const id = await DB.transaction(['students', 'settings'], 'readwrite', async st => {
            const n = await nextNumber(st, 'student');
            const newId = 'P' + String(n).padStart(4, '0');
            await DB.req(st.students.add(DB.stamp(Object.assign({ id: newId }, rec))));
            return newId;
          });
          toast(`Pelajar ${id} berjaya didaftarkan.`, 'success');
          location.hash = '#/pelajar/' + id;
          return;
        }
        App.refresh();
      }
    });
  },

  async setStatus(s, status) {
    await DB.put('students', Object.assign({}, s, { status }));
    toast(`Status ${s.name} kini: ${status}.`, 'success');
    App.refresh();
  },

  async references(id) {
    const [enr, cls, att, inv, pay, res] = await Promise.all([
      DB.getAllByIndex('enrollments', 'studentId', id), DB.getAllByIndex('classes', 'studentIds', id),
      DB.getAllByIndex('attendance', 'studentId', id), DB.getAllByIndex('invoices', 'studentId', id),
      DB.getAllByIndex('payments', 'studentId', id), DB.getAllByIndex('assessmentResults', 'studentId', id)
    ]);
    return enr.length + cls.length + att.length + inv.length + pay.length + res.length;
  },

  async remove(s) {
    if (await Students.references(s.id) > 0) {
      await confirmDialog({ title: 'Tidak boleh dipadam',
        message: 'Pelajar ini mempunyai sejarah (subjek, kelas, bil, bayaran atau keputusan). Untuk menyimpan sejarah, tukar status kepada "Tidak aktif" atau "Berhenti".',
        confirmText: 'Faham', cancelText: 'Tutup' });
      return;
    }
    if (!(await confirmDialog({ title: 'Padam pelajar?', message: `${s.name} (${s.id}) akan dipadam secara kekal.`,
      confirmText: 'Padam', danger: true }))) return;
    await DB.remove('students', s.id);
    toast('Pelajar dipadam.', 'success');
    location.hash = '#/pelajar';
  }
};

/* ---------------- Senarai pelajar ---------------- */
const studentFilter = { q: '', status: 'aktif', school: '', level: '' };

App.view('pelajar', {
  async render(params) {
    if (params[0]) return StudentDetail.render(params[0], params[1] || 'profil');
    const all = await Students.sorted();
    const schools = [...new Set(all.map(s => s.school).filter(Boolean))].sort();
    const levels = [...new Set(all.map(s => s.level).filter(Boolean))].sort((a, b) => {
      const ia = LEVELS.indexOf(a), ib = LEVELS.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
    const counts = { aktif: 0, 'tidak aktif': 0, berhenti: 0 };
    all.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });

    return `${pageHead('Pelajar', `${counts.aktif} aktif · ${counts['tidak aktif']} tidak aktif · ${counts.berhenti} berhenti`,
      `<button class="btn btn-outline" data-act="csv">${icon('csv')} CSV</button>
       <button class="btn btn-primary" data-act="add">${icon('plus')} Tambah pelajar</button>`)}
      <section class="card">
        <div class="toolbar">
          <div class="field grow2"><label for="sq">Cari nama / ID / telefon</label>
            <div class="search-box">${icon('search')}<input id="sq" type="search" value="${U.esc(studentFilter.q)}" placeholder="cth. Aisyah atau P0001"></div></div>
          <div class="field"><label for="sst">Status</label>
            <select id="sst">${U.options(STUDENT_STATUS, studentFilter.status, 'Semua')}</select></div>
          <div class="field"><label for="ssc">Sekolah</label>
            <select id="ssc">${U.options(schools, studentFilter.school, 'Semua')}</select></div>
          <div class="field"><label for="slv">Tahun / Tingkatan</label>
            <select id="slv">${U.options(levels, studentFilter.level, 'Semua')}</select></div>
        </div>
        <div class="result-count" id="sCount"></div>
        <div id="sTable"></div>
      </section>`;
  },

  async after(view, params) {
    if (params[0]) return StudentDetail.after(view, params[0], params[1] || 'profil');
    const all = await Students.sorted();
    const draw = () => {
      const q = U.norm(studentFilter.q);
      const rows = all.filter(s =>
        (!studentFilter.status || s.status === studentFilter.status) &&
        (!studentFilter.school || s.school === studentFilter.school) &&
        (!studentFilter.level || s.level === studentFilter.level) &&
        (!q || U.norm(s.name).includes(q) || U.norm(s.id).includes(q) ||
          U.norm(s.phone).includes(q) || U.norm(s.guardianPhone).includes(q) || U.norm(s.guardianName).includes(q)));
      view.querySelector('#sCount').textContent = `${rows.length} pelajar dipaparkan`;
      view.querySelector('#sTable').innerHTML = all.length === 0
        ? emptyState('pelajar', 'Belum ada pelajar', 'Tekan "Tambah pelajar" untuk mendaftar pelajar pertama. ID pelajar dijana secara automatik.',
          `<button class="btn btn-primary" data-act="add">${icon('plus')} Tambah pelajar</button>`)
        : tableHTML(['ID', 'Nama', 'Sekolah', 'Tahun/Ting.', 'Penjaga', 'Status', ''],
          rows.map(s => `<tr class="click-row" data-href="#/pelajar/${encodeURIComponent(s.id)}">
            <td class="strong">${U.esc(s.id)}</td>
            <td>${U.esc(s.name)}${s.phone ? `<span class="sub">${U.esc(s.phone)}</span>` : ''}</td>
            <td>${U.esc(s.school || '—')}</td><td>${U.esc(s.level || '—')}</td>
            <td>${U.esc(s.guardianName || '—')}${s.guardianPhone ? `<span class="sub">${U.esc(s.guardianPhone)}</span>` : ''}</td>
            <td>${Students.statusBadge(s.status)}</td>
            <td class="actions-cell"><button class="btn btn-sm btn-outline" data-edit="${U.esc(s.id)}">${icon('edit')} Edit</button></td>
          </tr>`), emptyState('search', 'Tiada padanan', 'Cuba ubah carian atau penapis.'));
    };
    draw();
    const on = (sel, key) => view.querySelector(sel).addEventListener('input', e => { studentFilter[key] = e.target.value; draw(); });
    on('#sq', 'q'); on('#sst', 'status'); on('#ssc', 'school'); on('#slv', 'level');
    view.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'add') Students.openForm();
      if (b.dataset.edit) Students.openForm(all.find(s => s.id === b.dataset.edit));
      if (b.dataset.act === 'csv') exportCSV(`pelajar-${U.todayISO()}.csv`, [
        ['ID', 'Nama', 'Telefon', 'Penjaga', 'Telefon Penjaga', 'Alamat', 'Sekolah', 'Tahun/Tingkatan', 'Tarikh Daftar', 'Kaedah Yuran', 'Status', 'Catatan'],
        ...all.map(s => [s.id, s.name, s.phone, s.guardianName, s.guardianPhone, s.address, s.school, s.level,
          U.formatDate(s.regDate), Students.feeLabel(s.feeMethod), s.status, s.notes])]);
    });
  }
});

/* ---------------- Butiran pelajar ---------------- */
const StudentDetail = {
  tabs: [['profil', 'Profil'], ['subjek', 'Subjek & Pakej'], ['kelas', 'Kelas'], ['kehadiran', 'Kehadiran'],
    ['bil', 'Bil'], ['bayaran', 'Bayaran'], ['keputusan', 'Keputusan']],

  async render(id, tab) {
    const s = await DB.get('students', id);
    if (!s) return `<div class="card">${emptyState('alert', 'Pelajar tidak dijumpai', `Tiada pelajar dengan ID ${id}.`,
      '<a class="btn btn-outline" href="#/pelajar">Kembali ke senarai</a>')}</div>`;
    const fin = await Fin.load();
    const outstanding = fin.outstandingOf(id);
    const credit = fin.creditOf(id);
    const enr = (await DB.getAllByIndex('enrollments', 'studentId', id)).filter(e => e.status === 'aktif');
    const att = await Attendance.studentSummary(id);

    const body = await StudentDetail.tabBody(s, tab, fin);
    return `
      <div class="page-head no-print"><div><a href="#/pelajar" class="btn btn-ghost">${icon('back')} Senarai pelajar</a></div></div>
      <section class="card">
        <div class="detail-head">
          <div class="avatar">${U.esc(Students.initials(s.name))}</div>
          <div class="grow"><h3>${U.esc(s.name)}</h3>
            <div class="muted small">${U.esc(s.id)} · ${U.esc(s.school || 'Sekolah tidak dinyatakan')} · ${U.esc(s.level || '—')}</div>
            <div style="margin-top:4px">${Students.statusBadge(s.status)}</div></div>
          <div class="actions no-print">
            <button class="btn btn-outline" data-act="edit">${icon('edit')} Edit</button>
            ${s.status === 'aktif'
              ? `<button class="btn btn-outline" data-act="deactivate">${icon('ban')} Nyahaktif</button>`
              : `<button class="btn btn-outline" data-act="activate">${icon('check')} Aktifkan</button>`}
            <button class="btn btn-outline" data-act="delete" aria-label="Padam">${icon('trash')}</button>
          </div>
        </div>
        <div class="mini-stats">
          <div class="mini-stat"><span>Subjek/pakej aktif</span><strong>${enr.length}</strong></div>
          <div class="mini-stat"><span>Kehadiran</span><strong>${att.eligible ? U.pct(att.percent) : '—'}</strong></div>
          <div class="mini-stat"><span>Baki tertunggak</span><strong class="${outstanding > 0 ? 'text-danger' : ''}">${U.formatRM(outstanding)}</strong></div>
          <div class="mini-stat"><span>Kredit</span><strong class="${credit > 0 ? 'text-success' : ''}">${U.formatRM(credit)}</strong></div>
        </div>
        <div class="tabs no-print">${StudentDetail.tabs.map(([k, t]) =>
          `<a class="tab ${k === tab ? 'active' : ''}" href="#/pelajar/${encodeURIComponent(id)}/${k}">${t}</a>`).join('')}</div>
        <div id="tabBody">${body}</div>
      </section>`;
  },

  async tabBody(s, tab, fin) {
    const [subjects, packages] = await Promise.all([DB.getAll('subjects'), DB.getAll('packages')]);
    const subjMap = U.mapBy(subjects), pkgMap = U.mapBy(packages);

    if (tab === 'profil') {
      return `<div class="card-body"><dl class="kv">
        <dt>ID pelajar</dt><dd>${U.esc(s.id)}</dd>
        <dt>Nama penuh</dt><dd>${U.esc(s.name)}</dd>
        <dt>Telefon pelajar</dt><dd>${U.esc(s.phone || '—')}</dd>
        <dt>Ibu bapa / penjaga</dt><dd>${U.esc(s.guardianName || '—')}</dd>
        <dt>Telefon penjaga</dt><dd>${s.guardianPhone ? `<a href="tel:${U.esc(s.guardianPhone)}">${U.esc(s.guardianPhone)}</a>` : '—'}</dd>
        <dt>Alamat</dt><dd>${U.esc(s.address || '—')}</dd>
        <dt>Sekolah</dt><dd>${U.esc(s.school || '—')}</dd>
        <dt>Tahun / tingkatan</dt><dd>${U.esc(s.level || '—')}</dd>
        <dt>Tarikh pendaftaran</dt><dd>${U.formatDate(s.regDate)}</dd>
        <dt>Kaedah yuran</dt><dd>${Students.feeLabel(s.feeMethod)}</dd>
        <dt>Catatan</dt><dd>${U.esc(s.notes || '—')}</dd>
        <dt>Dicipta</dt><dd>${U.formatDateTime(s.createdAt)}</dd>
        <dt>Dikemas kini</dt><dd>${U.formatDateTime(s.updatedAt)}</dd>
      </dl></div>`;
    }

    if (tab === 'subjek') {
      const enr = await DB.getAllByIndex('enrollments', 'studentId', s.id);
      enr.sort((a, b) => (a.status === 'aktif' ? 0 : 1) - (b.status === 'aktif' ? 0 : 1) || (b.startDate || '').localeCompare(a.startDate || ''));
      return `<div class="card-body"><div class="actions">
          <button class="btn btn-primary" data-act="enroll" ${s.status !== 'aktif' ? 'disabled title="Aktifkan pelajar dahulu"' : ''}>${icon('plus')} Daftar subjek / pakej</button></div></div>
        ${tableHTML(['Subjek / Pakej', 'Kaedah caj', ['Kadar dipersetujui', 'num'], 'Mula', 'Tamat', 'Status', ''],
          enr.map(e => `<tr>
            <td>${U.esc(Catalog.enrollName(e, subjMap, pkgMap))}${e.type === 'pakej' ? ' ' + badge('Pakej', 'info') : ''}</td>
            <td>${U.esc(Catalog.rateLabel(e.rateType))}</td><td class="num">${U.formatRM(e.rateSen)}</td>
            <td>${U.formatDate(e.startDate)}</td><td>${U.formatDate(e.endDate)}</td>
            <td>${e.status === 'aktif' ? badge('Aktif', 'success') : badge('Tamat')}</td>
            <td class="actions-cell">${e.status === 'aktif' ? `<button class="btn btn-sm btn-outline" data-end="${U.esc(e.id)}">Tamatkan</button>` : ''}</td>
          </tr>`),
          emptyState('subjek', 'Belum mendaftar subjek', 'Daftar subjek atau pakej. Kadar yang dipersetujui disimpan pada pendaftaran supaya perubahan harga kemudian tidak menjejaskan pelajar ini.'))}`;
    }

    if (tab === 'kelas') {
      const cls = (await DB.getAllByIndex('classes', 'studentIds', s.id)).sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
      return tableHTML(['Tarikh', 'Masa', 'Subjek', 'Tempoh', 'Status'],
        cls.map(c => `<tr class="click-row" data-href="#/jadual/hari/${c.date}">
          <td>${U.formatDate(c.date)}</td><td>${U.esc(c.startTime)}–${U.esc(c.endTime)}</td>
          <td>${U.esc((subjMap.get(c.subjectId) || {}).name || '—')}</td><td>${U.durationText(c.durationMin)}</td>
          <td>${Schedule.statusBadge(c.status)}</td></tr>`),
        emptyState('jadual', 'Tiada kelas', 'Kelas pelajar ini akan disenaraikan di sini.'));
    }

    if (tab === 'kehadiran') {
      const sum = await Attendance.studentSummary(s.id);
      const rows = sum.records.sort((a, b) => (b.cls.date + b.cls.startTime).localeCompare(a.cls.date + a.cls.startTime));
      return `<div class="mini-stats" style="padding-top:18px">
          <div class="mini-stat"><span>Peratus kehadiran</span><strong>${sum.eligible ? U.pct(sum.percent) : '—'}</strong></div>
          <div class="mini-stat"><span>Kelas layak dikira</span><strong>${sum.eligible}</strong></div>
          <div class="mini-stat"><span>Hadir / lewat</span><strong>${sum.hadir} / ${sum.lewat}</strong></div>
          <div class="mini-stat"><span>Tidak hadir / cuti</span><strong>${sum.tidak} / ${sum.cuti}</strong></div>
        </div>
        ${tableHTML(['Tarikh', 'Subjek', 'Kelas', 'Kehadiran'], rows.map(r => `<tr>
          <td>${U.formatDate(r.cls.date)} ${U.esc(r.cls.startTime)}</td><td>${U.esc((subjMap.get(r.cls.subjectId) || {}).name || '—')}</td>
          <td>${Schedule.statusBadge(r.cls.status)}</td><td>${Attendance.badge(r.status)}</td></tr>`),
          emptyState('kehadiran', 'Tiada rekod kehadiran', 'Rekod kehadiran di menu Kehadiran.'))}`;
    }

    if (tab === 'bil') {
      const inv = fin.invoices.filter(i => i.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date));
      return `<div class="card-body"><div class="actions">
          <button class="btn btn-primary" data-act="newInvoice">${icon('plus')} Bil baharu</button></div></div>
        ${tableHTML(['No. Bil', 'Tarikh', 'Tarikh akhir', ['Jumlah', 'num'], ['Baki', 'num'], 'Status'],
          inv.map(i => `<tr class="click-row" data-href="#/yuran/${encodeURIComponent(i.id)}">
            <td class="strong">${U.esc(i.invoiceNo)}</td><td>${U.formatDate(i.date)}</td><td>${U.formatDate(i.dueDate)}</td>
            <td class="num">${U.formatRM(i.totalSen)}</td><td class="num">${U.formatRM(fin.balance(i))}</td>
            <td>${Fin.statusBadge(fin.status(i))}</td></tr>`),
          emptyState('yuran', 'Tiada bil', 'Bil pelajar ini akan disenaraikan di sini.'))}`;
    }

    if (tab === 'bayaran') {
      const pays = fin.payments.filter(p => p.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date));
      return `<div class="card-body"><div class="actions">
          <button class="btn btn-primary" data-act="newPayment">${icon('plus')} Rekod bayaran</button></div></div>
        ${tableHTML(['No. Resit', 'Tarikh', 'Kaedah', ['Amaun', 'num'], ['Belum diagih', 'num'], 'Status'],
          pays.map(p => `<tr class="click-row" data-href="#/bayaran/${encodeURIComponent(p.id)}">
            <td class="strong">${U.esc(p.receiptNo)}</td><td>${U.formatDate(p.date)}</td><td>${U.esc(Billing.methodLabel(p.method))}</td>
            <td class="num">${U.formatRM(p.amountSen)}</td><td class="num">${U.formatRM(fin.unallocated(p))}</td>
            <td>${p.status === 'batal' ? badge('Dibatalkan') : badge('Sah', 'success')}</td></tr>`),
          emptyState('bayaran', 'Tiada bayaran', 'Bayaran pelajar ini akan disenaraikan di sini.'))}`;
    }

    if (tab === 'keputusan') {
      return Academic.studentResultsHTML(s.id);
    }
    return '';
  },

  async after(view, id, tab) {
    const s = await DB.get('students', id);
    if (!s) return;
    if (tab === 'keputusan') Academic.bindStudentChart && Academic.bindStudentChart(view, id);
    view.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'edit') Students.openForm(s);
      if (act === 'deactivate') {
        if (await confirmDialog({ title: 'Nyahaktifkan pelajar?',
          message: 'Pelajar tidak akan dimasukkan dalam penjanaan bil bulanan. Sejarah kelas, bil dan bayaran kekal disimpan.',
          confirmText: 'Nyahaktif' })) Students.setStatus(s, 'tidak aktif');
      }
      if (act === 'activate') Students.setStatus(s, 'aktif');
      if (act === 'delete') Students.remove(s);
      if (act === 'enroll') Catalog.enrollForm(s);
      if (act === 'newInvoice') Billing.invoiceForm(null, s.id);
      if (act === 'newPayment') Billing.paymentForm(s.id);
      if (b.dataset.end) Catalog.endEnrollment(b.dataset.end);
    });
  }
};
