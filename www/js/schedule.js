/* =========================================================
   Tuisyen Smart - js/schedule.js
   Fasa 4: Jadual kelas dan kehadiran
   ========================================================= */
'use strict';

const CLASS_STATUS = [['dijadualkan', 'Dijadualkan'], ['selesai', 'Selesai'], ['dibatalkan', 'Dibatalkan'], ['ganti', 'Kelas ganti']];
const CLASS_MODES = [['bersemuka', 'Bersemuka'], ['dalam talian', 'Dalam talian']];
const ATT_STATUS = [['hadir', 'Hadir'], ['lewat', 'Lewat'], ['tidak hadir', 'Tidak hadir'], ['cuti', 'Cuti / dikecualikan']];

const Schedule = {
  statusBadge(s) {
    return { dijadualkan: badge('Dijadualkan'), selesai: badge('Selesai', 'success'),
      dibatalkan: badge('Dibatalkan', 'danger'), ganti: badge('Kelas ganti', 'warning') }[s] || badge(s || '—');
  },
  duration(start, end) {
    const a = U.minutesOf(start), b = U.minutesOf(end);
    return a === null || b === null ? 0 : b - a;
  },
  overlaps(a, b) {
    return a.date === b.date && U.minutesOf(a.startTime) < U.minutesOf(b.endTime) && U.minutesOf(b.startTime) < U.minutesOf(a.endTime);
  },
  weekStart(iso) {
    const d = U.parseISO(iso);
    const dow = (d.getDay() + 6) % 7; // Isnin = 0
    d.setDate(d.getDate() - dow);
    return U.toISODate(d);
  },
  async lookups() {
    const [students, subjects] = await Promise.all([DB.getAll('students'), DB.getAll('subjects')]);
    return { students, subjects, stuMap: U.mapBy(students), subjMap: U.mapBy(subjects) };
  },
  cardHTML(c, lk, detailed) {
    const subj = (lk.subjMap.get(c.subjectId) || {}).name || '—';
    const who = classWho(c, lk.stuMap);
    return `<div class="class-card ${c.status}" data-class="${U.esc(c.id)}" role="button" tabindex="0">
      ${detailed ? `<div><div class="t">${U.esc(c.startTime)}</div><div class="m">${U.esc(c.endTime)}</div></div>` : ''}
      <div class="grow">
        ${detailed ? '' : `<div class="t">${U.esc(c.startTime)}–${U.esc(c.endTime)}</div>`}
        <div class="strong">${U.esc(subj)}</div>
        <div class="m">${U.esc(who)}</div>
        ${detailed ? `<div class="m">${U.durationText(c.durationMin)} · ${U.esc(c.mode === 'dalam talian' ? 'Dalam talian' : 'Bersemuka')}${c.location ? ' · ' + U.esc(c.location) : ''}</div>` : ''}
      </div>
      ${detailed ? `<div>${Schedule.statusBadge(c.status)}</div>` : ''}
    </div>`;
  },

  /* ---------- Borang kelas ---------- */
  async classForm(existing, defaults) {
    const c = existing || Object.assign({ date: U.todayISO(), startTime: '15:00', endTime: '16:00', status: 'dijadualkan', mode: 'bersemuka', studentIds: [] }, defaults || {});
    const lk = await Schedule.lookups();
    const allClasses = await DB.getAll('classes');
    const subjects = lk.subjects.filter(s => s.status !== 'tidak aktif' || s.id === c.subjectId).sort(U.byName);
    const chosen = new Set(c.studentIds || []);
    const students = lk.students.filter(s => s.status === 'aktif' || chosen.has(s.id)).sort(U.byName);
    if (!subjects.length || !students.length) {
      await confirmDialog({ title: 'Data belum lengkap', message: 'Daftar sekurang-kurangnya satu subjek dan satu pelajar aktif sebelum menambah kelas.', confirmText: 'Faham', cancelText: 'Tutup' });
      return;
    }
    const cancelled = allClasses.filter(x => x.status === 'dibatalkan' && x.id !== c.id)
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);

    formModal({
      title: existing ? 'Kemas kini kelas' : 'Tambah kelas',
      size: 'modal-lg',
      body: `<div class="form-grid">
        ${F.date('date', 'Tarikh', c.date, { req: true })}
        ${F.time('startTime', 'Masa mula', c.startTime, { req: true })}
        ${F.time('endTime', 'Masa tamat', c.endTime, { req: true, help: 'Tempoh: —' })}
        ${F.select('subjectId', 'Subjek', subjects.map(s => [s.id, s.name]), c.subjectId, { req: true, placeholder: '— Pilih subjek —' })}
        <div class="field span-2"><label>Pelajar <span class="req">*</span> <span class="muted small" id="pickCount"></span></label>
          <div class="search-box" style="margin-bottom:6px">${icon('search')}<input type="search" id="pickFilter" placeholder="Tapis nama pelajar" style="width:100%;min-height:40px;border:1px solid var(--border);border-radius:6px;padding:8px"></div>
          <div class="pick-list" id="pickList">${students.map(s => `<label data-name="${U.esc(U.norm(s.name))}">
            <input type="checkbox" name="studentIds" data-multi value="${s.id}" ${chosen.has(s.id) ? 'checked' : ''}>
            ${U.esc(s.name)}<span class="sub">${U.esc(s.id)} · ${U.esc(s.level || '')}</span></label>`).join('')}</div>
          <div class="field-error" data-err="studentIds"></div></div>
        ${F.text('groupName', 'Nama kumpulan', c.groupName, { max: 60, help: 'Pilihan, untuk kelas berkumpulan' })}
        ${F.select('mode', 'Kaedah kelas', CLASS_MODES, c.mode)}
        ${F.text('location', 'Lokasi / pautan', c.location, { max: 120 })}
        ${F.select('status', 'Status', CLASS_STATUS, c.status)}
        <div class="field span-2" id="makeupWrap" hidden>${F.select('makeupOf', 'Ganti bagi kelas yang dibatalkan', cancelled.map(x =>
          [x.id, `${U.formatDate(x.date)} ${x.startTime} · ${(lk.subjMap.get(x.subjectId) || {}).name || ''} · ${classWho(x, lk.stuMap)}`]), c.makeupOf, { placeholder: '— Tiada / tidak berkaitan —' })}</div>
        ${existing ? '' : F.number('repeatWeeks', 'Ulang setiap minggu (bilangan minggu tambahan)', 0, { help: '0 = sekali sahaja. Maksimum 26 minggu.' })}
        ${F.textarea('notes', 'Catatan', c.notes, { cls: 'span-2' })}
      </div>`,
      onOpen(form) {
        const help = form.querySelector('[name=endTime]').closest('.field').querySelector('.field-help');
        const upd = () => { const m = Schedule.duration(form.startTime.value, form.endTime.value); help.textContent = 'Tempoh: ' + (m > 0 ? U.durationText(m) : '—'); };
        form.startTime.addEventListener('input', upd); form.endTime.addEventListener('input', upd); upd();
        const mk = form.querySelector('#makeupWrap');
        const updStatus = () => { mk.hidden = form.status.value !== 'ganti'; };
        form.status.addEventListener('change', updStatus); updStatus();
        const cnt = () => { form.querySelector('#pickCount').textContent = `(${form.querySelectorAll('[name=studentIds]:checked').length} dipilih)`; };
        form.querySelector('#pickList').addEventListener('change', cnt); cnt();
        form.querySelector('#pickFilter').addEventListener('input', e => {
          const q = U.norm(e.target.value);
          form.querySelectorAll('#pickList label').forEach(l => { l.hidden = q && !l.dataset.name.includes(q); });
        });
      },
      async onSubmit(d, form) {
        const dur = Schedule.duration(d.startTime, d.endTime);
        const reps = existing ? 0 : Math.max(0, Math.min(26, parseInt(d.repeatWeeks, 10) || 0));
        if (!showErrors(form, {
          date: U.isISODate(d.date) ? '' : 'Tarikh diperlukan.',
          startTime: d.startTime ? '' : 'Masa mula diperlukan.',
          endTime: !d.endTime ? 'Masa tamat diperlukan.' : dur <= 0 ? 'Masa tamat mesti selepas masa mula.' : '',
          subjectId: d.subjectId ? '' : 'Pilih subjek.',
          studentIds: (d.studentIds || []).length ? '' : 'Pilih sekurang-kurangnya seorang pelajar.'
        })) return false;

        const base = Object.assign({}, existing || {}, {
          startTime: d.startTime, endTime: d.endTime, durationMin: dur, subjectId: d.subjectId,
          studentIds: d.studentIds, groupName: d.groupName || '', mode: d.mode, location: d.location || '',
          status: d.status, makeupOf: d.status === 'ganti' ? (d.makeupOf || null) : null, notes: d.notes || ''
        });
        const records = [];
        for (let w = 0; w <= reps; w++) {
          records.push(Object.assign({}, base, { id: w === 0 && existing ? existing.id : DB.genId('K'), date: U.addDaysISO(d.date, w * 7) }));
        }
        // Semakan pertindihan jadual
        if (d.status !== 'dibatalkan') {
          const clashes = [];
          records.forEach(r => allClasses.forEach(x => {
            if (x.id !== r.id && x.status !== 'dibatalkan' && Schedule.overlaps(r, x)) clashes.push(x);
          }));
          if (clashes.length) {
            const list = clashes.slice(0, 4).map(x => `${U.formatDate(x.date)} ${x.startTime}–${x.endTime} (${(lk.subjMap.get(x.subjectId) || {}).name || ''})`).join('; ');
            if (!(await confirmDialog({ title: 'Jadual bertindih',
              message: `Kelas ini bertindih dengan ${clashes.length} kelas lain: ${list}${clashes.length > 4 ? '…' : ''}. Simpan juga?`,
              confirmText: 'Simpan juga' }))) return false;
          }
        }
        await DB.transaction(['classes'], 'readwrite', async st => {
          for (const r of records) await DB.req(st.classes.put(DB.stamp(r)));
        });
        toast(records.length > 1 ? `${records.length} kelas ditambah.` : 'Kelas disimpan.', 'success');
        App.refresh();
      }
    });
  },

  /* ---------- Butiran kelas ---------- */
  async showClass(id) {
    const c = await DB.get('classes', id);
    if (!c) return;
    const lk = await Schedule.lookups();
    const att = await DB.getAllByIndex('attendance', 'classId', id);
    const attMap = U.mapBy(att, 'studentId');
    const makeup = c.makeupOf ? await DB.get('classes', c.makeupOf) : null;
    const m = openModal({
      title: `${(lk.subjMap.get(c.subjectId) || {}).name || 'Kelas'} · ${U.formatDate(c.date)}`,
      body: `<dl class="kv">
        <dt>ID kelas</dt><dd>${U.esc(c.id)}</dd>
        <dt>Masa</dt><dd>${U.esc(c.startTime)}–${U.esc(c.endTime)} (${U.durationText(c.durationMin)})</dd>
        <dt>Status</dt><dd>${Schedule.statusBadge(c.status)}</dd>
        ${c.groupName ? `<dt>Kumpulan</dt><dd>${U.esc(c.groupName)}</dd>` : ''}
        <dt>Kaedah</dt><dd>${c.mode === 'dalam talian' ? 'Dalam talian' : 'Bersemuka'}${c.location ? ' · ' + U.esc(c.location) : ''}</dd>
        ${makeup ? `<dt>Ganti bagi</dt><dd>${U.formatDate(makeup.date)} ${U.esc(makeup.startTime)}</dd>` : ''}
        ${c.notes ? `<dt>Catatan</dt><dd>${U.esc(c.notes)}</dd>` : ''}
      </dl>
      <h4 style="margin:16px 0 6px">Pelajar & kehadiran</h4>
      ${(c.studentIds || []).map(sid => `<div class="att-row"><span>${U.esc((lk.stuMap.get(sid) || {}).name || sid)}</span>
        ${attMap.get(sid) ? Attendance.badge(attMap.get(sid).status) : '<span class="muted small">Belum direkod</span>'}</div>`).join('')}`,
      footer: `<button class="btn btn-outline" data-a="del">${icon('trash')}</button>
        ${c.status !== 'dibatalkan' ? `<button class="btn btn-outline" data-a="cancel">${icon('ban')} Batalkan</button>` : ''}
        <button class="btn btn-outline" data-a="edit">${icon('edit')} Edit</button>
        ${c.status !== 'dibatalkan' ? `<button class="btn btn-primary" data-a="att">${icon('kehadiran')} Kehadiran</button>` : ''}`
    });
    m.el.querySelector('.modal-foot').addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'edit') { m.close(); Schedule.classForm(c); }
      if (b.dataset.a === 'att') { m.close(); location.hash = '#/kehadiran/' + c.date; }
      if (b.dataset.a === 'cancel') {
        if (await confirmDialog({ title: 'Batalkan kelas?', message: 'Kelas dibatalkan tidak dikira sebagai kelas berlangsung dan tidak dikira dalam peratus kehadiran. Anda boleh tambah kelas ganti kemudian.', confirmText: 'Batalkan kelas', danger: true })) {
          await DB.put('classes', Object.assign({}, c, { status: 'dibatalkan' }));
          m.close(); toast('Kelas dibatalkan.', 'success'); App.refresh();
        }
      }
      if (b.dataset.a === 'del') {
        if (await confirmDialog({ title: 'Padam kelas?', message: att.length ? `Kelas dan ${att.length} rekod kehadirannya akan dipadam. Untuk menyimpan sejarah, gunakan "Batalkan".` : 'Kelas akan dipadam secara kekal.', confirmText: 'Padam', danger: true })) {
          await DB.transaction(['classes', 'attendance'], 'readwrite', async st => {
            for (const a of att) await DB.req(st.attendance.delete(a.id));
            await DB.req(st.classes.delete(c.id));
          });
          m.close(); toast('Kelas dipadam.', 'success'); App.refresh();
        }
      }
    });
  }
};

/* ---------------- Paparan Jadual ---------------- */
const schedState = { q: '' };

App.view('jadual', {
  async render(params) {
    const mode = ['hari', 'minggu', 'bulan'].includes(params[0]) ? params[0] : 'minggu';
    const today = U.todayISO();
    let anchor = params[1] || (mode === 'bulan' ? today.slice(0, 7) : today);
    if (mode === 'bulan' && !/^\d{4}-\d{2}$/.test(anchor)) anchor = today.slice(0, 7);
    if (mode !== 'bulan' && !U.isISODate(anchor)) anchor = today;

    const lk = await Schedule.lookups();
    const all = await DB.getAll('classes');
    const sortT = (a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime);

    let title = '', prev = '', next = '', body = '';
    if (mode === 'hari') {
      const d = U.parseISO(anchor);
      title = `${U.dayName(d)}, ${U.formatDate(anchor)}`;
      prev = `#/jadual/hari/${U.addDaysISO(anchor, -1)}`; next = `#/jadual/hari/${U.addDaysISO(anchor, 1)}`;
      const list = all.filter(c => c.date === anchor).sort(sortT);
      body = `<div class="day-list">${list.length ? list.map(c => Schedule.cardHTML(c, lk, true)).join('')
        : emptyState('jadual', 'Tiada kelas pada hari ini', 'Tekan "Tambah kelas" untuk menjadualkan kelas.')}</div>`;
    } else if (mode === 'minggu') {
      const ws = Schedule.weekStart(anchor);
      const we = U.addDaysISO(ws, 6);
      title = `${U.formatDate(ws)} – ${U.formatDate(we)}`;
      prev = `#/jadual/minggu/${U.addDaysISO(ws, -7)}`; next = `#/jadual/minggu/${U.addDaysISO(ws, 7)}`;
      body = `<div class="week-grid">${[0, 1, 2, 3, 4, 5, 6].map(i => {
        const day = U.addDaysISO(ws, i);
        const list = all.filter(c => c.date === day).sort(sortT);
        const dd = U.parseISO(day);
        return `<div class="week-col ${day === today ? 'today' : ''}">
          <h4 data-href="#/jadual/hari/${day}">${U.dayShort(dd)} ${U.pad(dd.getDate())}/${U.pad(dd.getMonth() + 1)}</h4>
          ${list.map(c => Schedule.cardHTML(c, lk, false)).join('') || '<div class="muted small" style="padding:0 8px">—</div>'}</div>`;
      }).join('')}</div>`;
    } else {
      title = U.monthLabel(anchor);
      prev = `#/jadual/bulan/${U.addMonths(anchor, -1)}`; next = `#/jadual/bulan/${U.addMonths(anchor, 1)}`;
      const first = U.monthStart(anchor);
      const gridStart = Schedule.weekStart(first);
      const cells = [];
      for (let i = 0; i < 42; i++) {
        const day = U.addDaysISO(gridStart, i);
        if (i >= 35 && day.slice(0, 7) !== anchor) break;
        const list = all.filter(c => c.date === day).sort(sortT);
        cells.push(`<div class="cal-day ${day.slice(0, 7) !== anchor ? 'other' : ''} ${day === today ? 'today' : ''}" data-href="#/jadual/hari/${day}">
          <span class="dnum">${U.parseISO(day).getDate()}</span>
          ${list.slice(0, 3).map(c => `<span class="cal-ev ${c.status}">${U.esc(c.startTime)} ${U.esc((lk.subjMap.get(c.subjectId) || {}).name || '')}</span>`).join('')}
          ${list.length > 3 ? `<span class="muted">+${list.length - 3} lagi</span>` : ''}</div>`);
      }
      body = `<div class="cal-grid">${['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Ahd'].map(x => `<div class="dow">${x}</div>`).join('')}${cells.join('')}</div>`;
    }

    return `${pageHead('Jadual Kelas', `${all.filter(c => c.status !== 'dibatalkan' && c.date >= today).length} kelas akan datang`,
      `<button class="btn btn-outline" data-act="print">${icon('print')} Cetak</button>
       <button class="btn btn-primary" data-act="add">${icon('plus')} Tambah kelas</button>`)}
      <section class="card">
        <div class="toolbar">
          <div class="seg" role="tablist">
            <button data-href="#/jadual/hari/${mode === 'bulan' ? U.monthStart(anchor) : anchor}" class="${mode === 'hari' ? 'active' : ''}">Harian</button>
            <button data-href="#/jadual/minggu/${mode === 'bulan' ? U.monthStart(anchor) : anchor}" class="${mode === 'minggu' ? 'active' : ''}">Mingguan</button>
            <button data-href="#/jadual/bulan/${anchor.slice(0, 7)}" class="${mode === 'bulan' ? 'active' : ''}">Bulanan</button>
          </div>
          <div class="cal-nav">
            <a class="icon-btn" href="${prev}" aria-label="Sebelum">${icon('left')}</a>
            <h3>${U.esc(title)}</h3>
            <a class="icon-btn" href="${next}" aria-label="Seterusnya">${icon('right')}</a>
            <a class="btn btn-sm btn-outline" href="#/jadual/${mode}/${mode === 'bulan' ? today.slice(0, 7) : today}">Hari ini</a>
          </div>
          <div class="field grow2"><div class="search-box">${icon('search')}<input type="search" id="cq" placeholder="Cari kelas: pelajar, subjek, kumpulan" value="${U.esc(schedState.q)}" aria-label="Cari kelas"></div></div>
        </div>
        <div id="searchResults"></div>
        <div id="calBody">${body}</div>
      </section>`;
  },
  async after(view, params) {
    const lk = await Schedule.lookups();
    const all = await DB.getAll('classes');
    const anchorDate = U.isISODate(params[1] || '') ? params[1] : (/^\d{4}-\d{2}$/.test(params[1] || '') ? params[1] + '-01' : U.todayISO());
    view.addEventListener('click', e => {
      const card = e.target.closest('[data-class]');
      if (card) { Schedule.showClass(card.dataset.class); return; }
      const nav = e.target.closest('button[data-href]');
      if (nav) { location.hash = nav.dataset.href; return; }
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'add') Schedule.classForm(null, { date: anchorDate });
      if (b.dataset.act === 'print') printPage('Jadual Kelas');
    });
    view.addEventListener('keydown', e => {
      const card = e.target.closest('[data-class]');
      if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); Schedule.showClass(card.dataset.class); }
    });
    const search = () => {
      const q = U.norm(schedState.q);
      const box = view.querySelector('#searchResults');
      view.querySelector('#calBody').hidden = !!q;
      if (!q) { box.innerHTML = ''; return; }
      const res = all.filter(c => U.norm((lk.subjMap.get(c.subjectId) || {}).name).includes(q) ||
        U.norm(classWho(c, lk.stuMap)).includes(q) || U.norm(c.groupName).includes(q) || U.norm(c.location).includes(q) || U.norm(c.id).includes(q))
        .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)).slice(0, 100);
      box.innerHTML = `<div class="result-count">${res.length} kelas dijumpai</div><div class="day-list">${res.map(c =>
        `<div class="muted small">${U.formatDate(c.date)}</div>${Schedule.cardHTML(c, lk, true)}`).join('') || emptyState('search', 'Tiada padanan', '')}</div>`;
    };
    view.querySelector('#cq').addEventListener('input', e => { schedState.q = e.target.value; search(); });
    search();
  }
});

/* ---------------- Kehadiran ---------------- */
const Attendance = {
  badge(s) {
    return { hadir: badge('Hadir', 'success'), lewat: badge('Lewat', 'warning'), 'tidak hadir': badge('Tidak hadir', 'danger'),
      cuti: badge('Cuti / dikecualikan', 'info'), dibatalkan: badge('Kelas dibatalkan') }[s] || badge(s || '—');
  },

  // Kira peratus kehadiran mengikut polisi
  compute(records, policy) {
    const r = { eligible: 0, attended: 0, hadir: 0, lewat: 0, tidak: 0, cuti: 0, batal: 0, percent: NaN };
    records.forEach(({ cls, status }) => {
      if (!cls || cls.status === 'dibatalkan' || status === 'dibatalkan') { r.batal++; return; }
      if (status === 'cuti') { r.cuti++; return; }
      if (cls.status === 'ganti' && !policy.includeMakeup) return;
      r.eligible++;
      if (status === 'hadir') { r.hadir++; r.attended++; }
      else if (status === 'lewat') { r.lewat++; if (policy.lateCountsPresent) r.attended++; }
      else if (status === 'tidak hadir') r.tidak++;
    });
    r.percent = r.eligible ? (r.attended / r.eligible) * 100 : NaN;
    return r;
  },

  async studentSummary(studentId, from, to) {
    const [att, policy] = await Promise.all([DB.getAllByIndex('attendance', 'studentId', studentId), Settings.get('attendance')]);
    const classes = await Promise.all(att.map(a => DB.get('classes', a.classId)));
    const records = att.map((a, i) => ({ cls: classes[i], status: a.status }))
      .filter(r => r.cls && U.inRange(r.cls.date, from, to));
    return Object.assign(Attendance.compute(records, policy), { records });
  },

  // Ringkasan semua pelajar dalam julat tarikh
  async summaryAll(from, to) {
    const [att, classes, students, policy] = await Promise.all([DB.getAll('attendance'), DB.getAll('classes'),
      DB.getAll('students'), Settings.get('attendance')]);
    const clsMap = U.mapBy(classes);
    const byStudent = U.groupBy(att.map(a => ({ studentId: a.studentId, cls: clsMap.get(a.classId), status: a.status }))
      .filter(r => r.cls && U.inRange(r.cls.date, from, to)), r => r.studentId);
    return students.sort(U.byName).filter(s => byStudent.has(s.id))
      .map(s => Object.assign({ student: s }, Attendance.compute(byStudent.get(s.id), policy)));
  }
};

App.view('kehadiran', {
  async render(params) {
    const date = U.isISODate(params[0] || '') ? params[0] : U.todayISO();
    const lk = await Schedule.lookups();
    const classes = (await DB.getAllByIndex('classes', 'date', date)).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const atts = await Promise.all(classes.map(c => DB.getAllByIndex('attendance', 'classId', c.id)));
    const d = U.parseISO(date);
    const monthKey = date.slice(0, 7);
    const summary = await Attendance.summaryAll(U.monthStart(monthKey), U.monthEnd(monthKey));

    const classCards = classes.map((c, i) => {
      const attMap = U.mapBy(atts[i], 'studentId');
      const subj = (lk.subjMap.get(c.subjectId) || {}).name || '—';
      if (c.status === 'dibatalkan') {
        return `<section class="card"><div class="card-head"><h3>${U.esc(c.startTime)}–${U.esc(c.endTime)} · ${U.esc(subj)}</h3>${Schedule.statusBadge(c.status)}</div>
          <div class="card-body muted small">Kelas dibatalkan oleh tutor — tidak dikira dalam kehadiran.</div></section>`;
      }
      return `<section class="card"><form data-att="${U.esc(c.id)}">
        <div class="card-head"><h3>${U.esc(c.startTime)}–${U.esc(c.endTime)} · ${U.esc(subj)}</h3>${Schedule.statusBadge(c.status)}</div>
        <div class="card-body">
          ${(c.studentIds || []).map(sid => {
            const cur = (attMap.get(sid) || {}).status || '';
            return `<div class="att-row"><span class="strong">${U.esc((lk.stuMap.get(sid) || {}).name || sid)}</span>
              <div class="att-opts" role="radiogroup">${ATT_STATUS.map(([v, t]) => `<label>
                <input type="radio" name="s_${U.esc(sid)}" value="${v}" ${cur === v ? 'checked' : ''}>
                <span class="o-${v.split(' ')[0]}">${t}</span></label>`).join('')}</div></div>`;
          }).join('')}
          ${c.status === 'dijadualkan' ? '<label class="check" style="margin-top:8px"><input type="checkbox" name="markDone" checked> Tandakan kelas sebagai selesai</label>' : ''}
          <div class="form-actions">
            <button type="button" class="btn btn-outline btn-sm" data-allhadir>Semua hadir</button>
            <button type="submit" class="btn btn-primary">${icon('save')} Simpan kehadiran</button>
          </div>
        </div></form></section>`;
    }).join('');

    return `${pageHead('Kehadiran', 'Rekod kehadiran mengikut kelas. Satu pelajar hanya satu rekod bagi setiap kelas.')}
      <section class="card"><div class="toolbar">
        <div class="cal-nav">
          <a class="icon-btn" href="#/kehadiran/${U.addDaysISO(date, -1)}" aria-label="Hari sebelum">${icon('left')}</a>
          <h3>${U.dayName(d)}, ${U.formatDate(date)}</h3>
          <a class="icon-btn" href="#/kehadiran/${U.addDaysISO(date, 1)}" aria-label="Hari seterusnya">${icon('right')}</a>
        </div>
        <div class="field"><label for="attDate">Pilih tarikh</label><input type="date" id="attDate" value="${date}"></div>
        <a class="btn btn-sm btn-outline" href="#/kehadiran/${U.todayISO()}">Hari ini</a>
      </div></section>
      <div class="stack" style="margin-top:20px">
        ${classCards || `<section class="card">${emptyState('kehadiran', 'Tiada kelas pada tarikh ini', 'Tambah kelas di Jadual Kelas, kemudian rekod kehadiran di sini.',
          '<a class="btn btn-outline" href="#/jadual">Buka Jadual Kelas</a>')}</section>`}
        <section class="card"><div class="card-head"><h3>${icon('prestasi')} Ringkasan kehadiran ${U.esc(U.monthLabel(monthKey))}</h3></div>
          ${tableHTML(['Pelajar', ['Layak dikira', 'num'], ['Hadir', 'num'], ['Lewat', 'num'], ['Tidak hadir', 'num'], ['Cuti', 'num'], ['Peratus', 'num']],
            summary.map(r => `<tr class="click-row" data-href="#/pelajar/${encodeURIComponent(r.student.id)}/kehadiran">
              <td>${U.esc(r.student.name)}</td><td class="num">${r.eligible}</td><td class="num">${r.hadir}</td><td class="num">${r.lewat}</td>
              <td class="num">${r.tidak}</td><td class="num">${r.cuti}</td>
              <td class="num strong ${r.percent < 75 ? 'text-danger' : ''}">${r.eligible ? U.pct(r.percent) : '—'}</td></tr>`),
            emptyState('kehadiran', 'Tiada rekod bulan ini', ''))}
        </section>
      </div>`;
  },
  async after(view) {
    view.querySelector('#attDate').addEventListener('change', e => { if (e.target.value) location.hash = '#/kehadiran/' + e.target.value; });
    view.querySelectorAll('form[data-att]').forEach(form => {
      form.querySelector('[data-allhadir]').addEventListener('click', () => {
        form.querySelectorAll('input[type=radio][value="hadir"]').forEach(r => { r.checked = true; });
      });
      form.addEventListener('submit', e => {
        e.preventDefault();
        busyRun(form.querySelector('[type=submit]'), async () => {
          const c = await DB.get('classes', form.dataset.att);
          const d = formData(form);
          const entries = (c.studentIds || []).map(sid => [sid, d['s_' + sid]]).filter(([, v]) => v);
          if (!entries.length) { toast('Pilih status kehadiran sekurang-kurangnya seorang pelajar.', 'error'); return; }
          await DB.transaction(['attendance', 'classes'], 'readwrite', async st => {
            for (const [sid, status] of entries) {
              const id = `${c.id}|${sid}`;
              const old = await DB.req(st.attendance.get(id));
              await DB.req(st.attendance.put(DB.stamp(Object.assign({}, old || {}, { id, classId: c.id, studentId: sid, status }))));
            }
            if (d.markDone && c.status === 'dijadualkan') await DB.req(st.classes.put(DB.stamp(Object.assign({}, c, { status: 'selesai' }))));
          });
          toast(`Kehadiran ${entries.length} pelajar disimpan.`, 'success');
          App.refresh();
        });
      });
    });
  }
});
