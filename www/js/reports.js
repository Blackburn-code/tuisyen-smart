/* =========================================================
   Tuisyen Smart - js/reports.js
   Laporan: pelajar, kehadiran, jadual, bil & tunggakan,
   kutipan bulanan, perbelanjaan, prestasi, ringkasan kewangan
   ========================================================= */
'use strict';

const REPORTS = [
  ['kewangan', 'Ringkasan kewangan'], ['kutipan', 'Kutipan mengikut bulan'], ['bil', 'Bil dan tunggakan'],
  ['perbelanjaan', 'Perbelanjaan'], ['kehadiran', 'Kehadiran'], ['jadual', 'Jadual kelas'],
  ['prestasi', 'Prestasi akademik'], ['pelajar', 'Senarai pelajar']
];

const repState = (() => {
  const t = U.todayISO();
  return { type: 'kewangan', from: U.monthStart(t.slice(0, 7)), to: U.monthEnd(t.slice(0, 7)), year: t.slice(0, 4), status: '', subject: '' };
})();

const Reports = {
  rangeText() { return `${U.formatDate(repState.from)} hingga ${U.formatDate(repState.to)}`; },

  table(headers, rows, foot) {
    if (!rows.length) return '<p class="muted">Tiada rekod dalam julat ini.</p>';
    return `<div class="table-wrap"><table class="table"><thead><tr>${headers.map(h => {
      const [t, c] = Array.isArray(h) ? h : [h, '']; return `<th class="${c}">${U.esc(t)}</th>`; }).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => { const [v, cls] = Array.isArray(c) ? c : [c, '']; return `<td class="${cls}">${v}</td>`; }).join('')}</tr>`).join('')}</tbody>
      ${foot ? `<tfoot><tr>${foot.map(c => { const [v, cls] = Array.isArray(c) ? c : [c, '']; return `<td class="${cls}">${v}</td>`; }).join('')}</tr></tfoot>` : ''}
      </table></div>`;
  },

  async build() {
    const { type, from, to } = repState;
    const e = U.esc, rm = U.formatRM, num = v => [v, 'num'];
    const [students, subjects] = await Promise.all([DB.getAll('students'), DB.getAll('subjects')]);
    const stuMap = U.mapBy(students), subjMap = U.mapBy(subjects);
    const sName = id => (stuMap.get(id) || {}).name || id;

    if (type === 'pelajar') {
      const list = students.filter(s => !repState.status || s.status === repState.status).sort(U.byName);
      return { title: 'Senarai Pelajar', sub: repState.status ? `Status: ${repState.status}` : 'Semua status',
        html: Reports.table(['ID', 'Nama', 'Sekolah', 'Tahun/Ting.', 'Penjaga', 'Telefon', 'Tarikh daftar', 'Status'],
          list.map(s => [e(s.id), e(s.name), e(s.school || '—'), e(s.level || '—'), e(s.guardianName || '—'), e(s.guardianPhone || s.phone || '—'), U.formatDate(s.regDate), e(s.status)]),
          [`Jumlah: ${list.length} pelajar`, '', '', '', '', '', '', '']),
        csv: [['ID', 'Nama', 'Sekolah', 'Tahun/Tingkatan', 'Penjaga', 'Telefon Penjaga', 'Telefon Pelajar', 'Tarikh Daftar', 'Status'],
          ...list.map(s => [s.id, s.name, s.school, s.level, s.guardianName, s.guardianPhone, s.phone, U.formatDate(s.regDate), s.status])] };
    }

    if (type === 'kehadiran') {
      const list = await Attendance.summaryAll(from, to);
      return { title: 'Laporan Kehadiran', sub: Reports.rangeText(),
        html: Reports.table(['Pelajar', num('Layak dikira'), num('Hadir'), num('Lewat'), num('Tidak hadir'), num('Cuti'), num('Peratus')].map(h => Array.isArray(h) ? h : h),
          list.map(r => [e(r.student.name), num(r.eligible), num(r.hadir), num(r.lewat), num(r.tidak), num(r.cuti), num(r.eligible ? U.pct(r.percent) : '—')])),
        csv: [['ID', 'Pelajar', 'Layak Dikira', 'Hadir', 'Lewat', 'Tidak Hadir', 'Cuti', 'Peratus'],
          ...list.map(r => [r.student.id, r.student.name, r.eligible, r.hadir, r.lewat, r.tidak, r.cuti, r.eligible ? r.percent.toFixed(1) : ''])] };
    }

    if (type === 'jadual') {
      const list = (await DB.getAll('classes')).filter(c => U.inRange(c.date, from, to))
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
      const held = list.filter(c => c.status === 'selesai' || c.status === 'ganti');
      return { title: 'Laporan Jadual Kelas', sub: Reports.rangeText(),
        html: `<p class="small">Jumlah ${list.length} kelas · ${held.length} berlangsung · ${list.filter(c => c.status === 'dibatalkan').length} dibatalkan · jumlah masa berlangsung ${U.durationText(U.sum(held, c => c.durationMin))}</p>` +
          Reports.table(['Tarikh', 'Masa', 'Subjek', 'Pelajar / kumpulan', 'Tempoh', 'Status'],
            list.map(c => [U.formatDate(c.date), `${e(c.startTime)}–${e(c.endTime)}`, e((subjMap.get(c.subjectId) || {}).name || '—'),
              ['' + e(classWho(c, stuMap)), 'wrap'], U.durationText(c.durationMin), e(c.status)])),
        csv: [['Tarikh', 'Mula', 'Tamat', 'Minit', 'Subjek', 'Pelajar', 'Kumpulan', 'Kaedah', 'Lokasi', 'Status'],
          ...list.map(c => [U.formatDate(c.date), c.startTime, c.endTime, c.durationMin, (subjMap.get(c.subjectId) || {}).name,
            (c.studentIds || []).map(sName).join('; '), c.groupName, c.mode, c.location, c.status])] };
    }

    const fin = await Fin.load();

    if (type === 'bil') {
      const list = fin.invoices.filter(i => U.inRange(i.date, from, to) && (!repState.status || (repState.status === 'baki' ? fin.balance(i) > 0 : fin.status(i) === repState.status)))
        .sort((a, b) => a.date.localeCompare(b.date) || a.invoiceNo.localeCompare(b.invoiceNo));
      const valid = list.filter(i => i.status !== 'batal');
      return { title: 'Laporan Bil dan Tunggakan', sub: Reports.rangeText() + ' (mengikut tarikh bil, baki setakat hari ini)',
        html: Reports.table(['No. bil', 'Tarikh', 'Pelajar', 'Tarikh akhir', num('Jumlah'), num('Dibayar'), num('Baki'), 'Status'],
          list.map(i => [e(i.invoiceNo), U.formatDate(i.date), e(sName(i.studentId)), U.formatDate(i.dueDate), num(rm(i.totalSen)), num(rm(fin.paid(i))), num(rm(fin.balance(i))), e(fin.status(i))]),
          ['Jumlah', '', `${valid.length} bil sah`, '', num(rm(U.sum(valid, i => i.totalSen))), num(rm(U.sum(valid, i => fin.paid(i)))), num(rm(U.sum(valid, i => fin.balance(i)))), '']),
        csv: [['No. Bil', 'Tarikh', 'ID Pelajar', 'Pelajar', 'Tarikh Akhir', 'Jumlah', 'Dibayar', 'Baki', 'Status'],
          ...list.map(i => [i.invoiceNo, U.formatDate(i.date), i.studentId, sName(i.studentId), U.formatDate(i.dueDate), senCSV(i.totalSen), senCSV(fin.paid(i)), senCSV(fin.balance(i)), fin.status(i)])] };
    }

    const expenses = await DB.getAll('expenses');

    if (type === 'kutipan') {
      const y = repState.year;
      const rows = [];
      for (let m = 1; m <= 12; m++) {
        const k = `${y}-${U.pad(m)}`;
        const billed = U.sum(fin.validInvoices.filter(i => i.date.startsWith(k)), i => i.totalSen);
        const coll = U.sum(fin.validPayments.filter(p => p.date.startsWith(k)), p => p.amountSen);
        const exp = U.sum(expenses.filter(x => x.date.startsWith(k)), x => x.amountSen);
        rows.push({ k, billed, coll, exp, net: coll - exp });
      }
      const T = f => U.sum(rows, r => r[f]);
      return { title: `Kutipan Mengikut Bulan ${y}`, sub: 'Kutipan = wang sebenar diterima. Bil dikeluarkan bukan wang diterima.',
        html: Reports.table(['Bulan', num('Bil dikeluarkan'), num('Kutipan'), num('Perbelanjaan'), num('Bersih (kutipan − belanja)')],
          rows.map(r => [U.monthLabel(r.k), num(rm(r.billed)), num(rm(r.coll)), num(rm(r.exp)), [rm(r.net), 'num ' + (r.net < 0 ? 'text-danger' : '')]]),
          ['Jumlah', num(rm(T('billed'))), num(rm(T('coll'))), num(rm(T('exp'))), num(rm(T('net')))]),
        csv: [['Bulan', 'Bil Dikeluarkan', 'Kutipan', 'Perbelanjaan', 'Bersih'], ...rows.map(r => [U.monthLabel(r.k), senCSV(r.billed), senCSV(r.coll), senCSV(r.exp), senCSV(r.net)])] };
    }

    if (type === 'perbelanjaan') {
      const list = expenses.filter(x => U.inRange(x.date, from, to)).sort((a, b) => a.date.localeCompare(b.date));
      const byCat = [...U.groupBy(list, x => x.category).entries()].map(([c, l]) => [c, U.sum(l, x => x.amountSen), l.length]).sort((a, b) => b[1] - a[1]);
      const total = U.sum(list, x => x.amountSen);
      return { title: 'Laporan Perbelanjaan', sub: Reports.rangeText(),
        html: `<h4 style="margin:6px 0">Mengikut kategori</h4>` + Reports.table(['Kategori', num('Bil. rekod'), num('Jumlah'), num('Peratus')],
          byCat.map(([c, t, n]) => [e(c), num(n), num(rm(t)), num(U.pct(total ? t / total * 100 : 0))]), ['Jumlah', num(list.length), num(rm(total)), num('100%')]) +
          `<h4 style="margin:16px 0 6px">Butiran</h4>` + Reports.table(['Tarikh', 'Kategori', 'Keterangan', 'Kaedah', num('Amaun')],
          list.map(x => [U.formatDate(x.date), e(x.category), [e(x.description), 'wrap'], e(Billing.methodLabel(x.method)), num(rm(x.amountSen))])),
        csv: [['Tarikh', 'Kategori', 'Keterangan', 'Kaedah', 'Rujukan', 'Amaun'],
          ...list.map(x => [U.formatDate(x.date), x.category, x.description, Billing.methodLabel(x.method), x.reference, senCSV(x.amountSen)])] };
    }

    if (type === 'prestasi') {
      const [asm, res] = await Promise.all([DB.getAll('assessments'), DB.getAll('assessmentResults')]);
      const asmMap = U.mapBy(asm);
      const list = res.map(r => ({ r, a: asmMap.get(r.assessmentId) })).filter(x => x.a && U.inRange(x.a.date, from, to) && (!repState.subject || x.a.subjectId === repState.subject))
        .sort((x, y) => x.a.date.localeCompare(y.a.date) || sName(x.r.studentId).localeCompare(sName(y.r.studentId)));
      const pct = x => Academic.percent(x.r.marks, x.a.fullMarks);
      return { title: 'Laporan Prestasi Akademik', sub: Reports.rangeText() + (repState.subject ? ` · ${(subjMap.get(repState.subject) || {}).name}` : ''),
        html: Reports.table(['Tarikh', 'Ujian', 'Subjek', 'Pelajar', num('Markah'), num('Peratus'), 'Gred'],
          list.map(x => [U.formatDate(x.a.date), e(x.a.name), e((subjMap.get(x.a.subjectId) || {}).name || '—'), e(sName(x.r.studentId)),
            num(`${x.r.marks}/${x.a.fullMarks}`), num(U.pct(pct(x))), e(x.r.grade || '—')]),
          list.length ? ['Purata', '', '', `${list.length} keputusan`, '', num(U.pct(U.sum(list, pct) / list.length)), ''] : null),
        csv: [['Tarikh', 'Ujian', 'Subjek', 'ID Pelajar', 'Pelajar', 'Markah', 'Markah Penuh', 'Peratus', 'Gred', 'Catatan'],
          ...list.map(x => [U.formatDate(x.a.date), x.a.name, (subjMap.get(x.a.subjectId) || {}).name, x.r.studentId, sName(x.r.studentId),
            x.r.marks, x.a.fullMarks, pct(x).toFixed(1), x.r.grade, x.r.teacherNote])] };
    }

    // Ringkasan kewangan
    const inv = fin.validInvoices.filter(i => U.inRange(i.date, from, to));
    const pays = fin.validPayments.filter(p => U.inRange(p.date, from, to));
    const exps = expenses.filter(x => U.inRange(x.date, from, to));
    const billed = U.sum(inv, i => i.totalSen), coll = U.sum(pays, p => p.amountSen), spent = U.sum(exps, x => x.amountSen);
    const outRange = U.sum(inv, i => Math.max(0, fin.balance(i)));
    const outAll = U.sum(fin.validInvoices, i => Math.max(0, fin.balance(i)));
    const credit = U.sum(fin.validPayments, p => fin.unallocated(p));
    const byMethod = PAY_METHODS.map(([k, t]) => [t, U.sum(pays.filter(p => p.method === k), p => p.amountSen), pays.filter(p => p.method === k).length]).filter(x => x[2]);
    const rowsK = [
      ['Jumlah bil dikeluarkan', billed, `${inv.length} bil`],
      ['Jumlah kutipan (wang diterima)', coll, `${pays.length} bayaran`],
      ['Jumlah perbelanjaan', spent, `${exps.length} rekod`],
      ['Tunai bersih (kutipan − perbelanjaan)', coll - spent, ''],
      ['Baki tertunggak bagi bil dalam julat ini', outRange, ''],
      ['Jumlah tunggakan keseluruhan (setakat hari ini)', outAll, ''],
      ['Kredit pelajar belum diperuntukkan', credit, '']
    ];
    return { title: 'Ringkasan Kewangan', sub: Reports.rangeText(),
      html: Reports.table(['Perkara', num('Amaun'), 'Catatan'], rowsK.map(([a, b, c]) => [e(a), [rm(b), 'num strong ' + (b < 0 ? 'text-danger' : '')], e(c)])) +
        `<h4 style="margin:16px 0 6px">Kutipan mengikut kaedah</h4>` +
        Reports.table(['Kaedah', num('Bil. bayaran'), num('Jumlah')], byMethod.map(([t, s, n]) => [e(t), num(n), num(rm(s))])) +
        '<p class="small muted">Bil yang dikeluarkan tidak dianggap sebagai wang diterima. Kutipan dikira daripada bayaran sah sahaja (bayaran dibatalkan dikecualikan).</p>',
      csv: [['Perkara', 'Amaun (RM)', 'Catatan'], ...rowsK.map(([a, b, c]) => [a, senCSV(b), c]), [], ['Kaedah', 'Bil. Bayaran', 'Jumlah'],
        ...byMethod.map(([t, s, n]) => [t, n, senCSV(s)])] };
  }
};

App.view('laporan', {
  async render() {
    const subjects = (await DB.getAll('subjects')).sort(U.byName);
    const t = repState.type;
    const years = [];
    for (let y = Number(U.todayISO().slice(0, 4)) + 1; y >= 2020; y--) years.push(String(y));
    const rep = await Reports.build();
    const needsRange = !['pelajar', 'kutipan'].includes(t);
    return `${pageHead('Laporan', 'Pilih jenis laporan dan julat tarikh. Semua angka dikira daripada rekod sebenar.',
      `<button class="btn btn-outline" data-act="csv">${icon('csv')} Eksport CSV</button>
       <button class="btn btn-primary" data-act="print">${icon('print')} Cetak</button>`)}
      <section class="card">
        <div class="toolbar">
          <div class="field grow2"><label for="rt">Jenis laporan</label><select id="rt">${U.options(REPORTS, t)}</select></div>
          ${needsRange ? `<div class="field"><label for="rf">Dari</label><input type="date" id="rf" value="${repState.from}"></div>
            <div class="field"><label for="rto">Hingga</label><input type="date" id="rto" value="${repState.to}"></div>
            <div class="field"><label for="rq">Julat cepat</label><select id="rq">${U.options([['', '—'], ['bulan', 'Bulan ini'], ['bulanlepas', 'Bulan lepas'], ['tahun', 'Tahun ini'], ['semua', 'Semua tarikh']], '')}</select></div>` : ''}
          ${t === 'kutipan' ? `<div class="field"><label for="ry">Tahun</label><select id="ry">${U.options(years, repState.year)}</select></div>` : ''}
          ${t === 'pelajar' ? `<div class="field"><label for="rs">Status</label><select id="rs">${U.options(STUDENT_STATUS, repState.status, 'Semua')}</select></div>` : ''}
          ${t === 'bil' ? `<div class="field"><label for="rs">Status</label><select id="rs">${U.options(INV_STATUS_FILTER, repState.status, 'Semua')}</select></div>` : ''}
          ${t === 'prestasi' ? `<div class="field"><label for="rsb">Subjek</label><select id="rsb">${U.options(subjects.map(s => [s.id, s.name]), repState.subject, 'Semua')}</select></div>` : ''}
        </div>
        <div class="card-body"><h3>${U.esc(rep.title)}</h3><p class="small muted">${U.esc(rep.sub || '')}</p>${rep.html}</div>
      </section>`;
  },
  async after(view) {
    const set = (sel, key, ev) => { const el = view.querySelector(sel); if (el) el.addEventListener(ev || 'change', e => {
      repState[key] = e.target.value;
      if (key === 'type') { repState.status = ''; }
      if ((key === 'from' || key === 'to') && repState.from && repState.to && repState.from > repState.to) { toast('Tarikh "Dari" mesti sebelum "Hingga".', 'error'); return; }
      App.refresh(); }); };
    set('#rt', 'type'); set('#rf', 'from'); set('#rto', 'to'); set('#ry', 'year'); set('#rs', 'status'); set('#rsb', 'subject');
    const q = view.querySelector('#rq');
    if (q) q.addEventListener('change', () => {
      const t = U.todayISO(), m = t.slice(0, 7);
      if (q.value === 'bulan') { repState.from = U.monthStart(m); repState.to = U.monthEnd(m); }
      if (q.value === 'bulanlepas') { const p = U.addMonths(m, -1); repState.from = U.monthStart(p); repState.to = U.monthEnd(p); }
      if (q.value === 'tahun') { repState.from = t.slice(0, 4) + '-01-01'; repState.to = t.slice(0, 4) + '-12-31'; }
      if (q.value === 'semua') { repState.from = '2000-01-01'; repState.to = '2099-12-31'; }
      App.refresh();
    });
    view.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      const rep = await Reports.build();
      if (b.dataset.act === 'print') printDoc(rep.title, `<p class="muted">${U.esc(rep.sub || '')}</p>${rep.html}`);
      if (b.dataset.act === 'csv') exportCSV(`laporan-${repState.type}-${U.todayISO()}.csv`, rep.csv);
    });
  }
});
