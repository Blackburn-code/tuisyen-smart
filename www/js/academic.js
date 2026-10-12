/* =========================================================
   Tuisyen Smart - js/academic.js
   Fasa 7: Prestasi akademik
   Peratus markah = Markah diperoleh ÷ Markah penuh × 100
   ========================================================= */
'use strict';

const CHART_COLORS = ['#1e56a0', '#1f8f55', '#c93c3c', '#b9770e', '#7a4cc2', '#0e8a9a', '#c2457a', '#5a6b7d'];

const Academic = {
  percent(marks, full) {
    const m = Number(marks), f = Number(full);
    if (!Number.isFinite(m) || !Number.isFinite(f) || f <= 0) return NaN;
    return (m / f) * 100;
  },
  gradeFor(pct, scale) {
    if (!Number.isFinite(pct)) return '';
    const list = (scale.list || []).slice().sort((a, b) => b.min - a.min);
    const g = list.find(r => pct >= r.min);
    return g ? g.g : '';
  },

  // Pelajar yang mengambil subjek (terus atau melalui pakej)
  async studentsForSubject(subjectId) {
    const [enr, items, students] = await Promise.all([DB.getAll('enrollments'), DB.getAll('packageItems'), DB.getAll('students')]);
    const pkgs = new Set(items.filter(i => i.subjectId === subjectId).map(i => i.packageId));
    const ids = new Set(enr.filter(e => e.status === 'aktif' && (e.subjectId === subjectId || pkgs.has(e.packageId))).map(e => e.studentId));
    return students.filter(s => ids.has(s.id)).sort(U.byName);
  },

  form(existing) {
    DB.getAll('subjects').then(subjects => {
      const a = existing || { date: U.todayISO(), fullMarks: 100 };
      const opts = subjects.filter(s => s.status !== 'tidak aktif' || s.id === a.subjectId).sort(U.byName).map(s => [s.id, s.name]);
      if (!opts.length) { toast('Daftar subjek terlebih dahulu.', 'error'); return; }
      formModal({
        title: existing ? 'Kemas kini ujian' : 'Tambah ujian / penilaian',
        body: `<div class="form-grid">
          ${F.text('name', 'Nama ujian', a.name, { req: true, max: 80, cls: 'span-2', placeholder: 'cth. Ujian Bulanan Mac' })}
          ${F.select('subjectId', 'Subjek', opts, a.subjectId, { req: true, placeholder: '— Pilih subjek —' })}
          ${F.date('date', 'Tarikh', a.date, { req: true })}
          ${F.number('fullMarks', 'Markah penuh', a.fullMarks, { req: true })}
          ${F.textarea('notes', 'Catatan', a.notes, { cls: 'span-2' })}
        </div>`,
        async onSubmit(d, form) {
          const full = Number(d.fullMarks);
          if (!showErrors(form, {
            name: d.name ? '' : 'Nama ujian diperlukan.',
            subjectId: d.subjectId ? '' : 'Pilih subjek.',
            date: U.isISODate(d.date) ? '' : 'Tarikh diperlukan.',
            fullMarks: Number.isFinite(full) && full > 0 ? '' : 'Markah penuh mesti lebih daripada 0.'
          })) return false;
          if (existing && full !== existing.fullMarks) {
            const res = await DB.getAllByIndex('assessmentResults', 'assessmentId', existing.id);
            const g = await Settings.get('grades');
            if (!g.allowOverFull && res.some(r => r.marks > full)) { toast('Ada markah pelajar yang melebihi markah penuh baharu.', 'error'); return false; }
          }
          const id = (existing && existing.id) || DB.genId('ASM');
          await DB.put('assessments', Object.assign({}, existing || {}, { id, name: d.name, subjectId: d.subjectId, date: d.date, fullMarks: full, notes: d.notes || '' }));
          toast('Ujian disimpan.', 'success');
          if (existing) App.refresh(); else location.hash = '#/prestasi/' + id;
        }
      });
    });
  },

  // Graf garis SVG (tiada pustaka luar)
  lineChart(series) {
    const dates = [...new Set(series.flatMap(s => s.points.map(p => p.x)))].sort();
    if (!dates.length) return '';
    const W = 640, H = 260, L = 40, R = 14, T = 14, B = 36;
    const xs = d => dates.length === 1 ? L + (W - L - R) / 2 : L + (dates.indexOf(d) / (dates.length - 1)) * (W - L - R);
    const ys = v => T + (1 - Math.max(0, Math.min(110, v)) / 110) * (H - T - B);
    const grid = [0, 25, 50, 75, 100].map(v => `<line x1="${L}" x2="${W - R}" y1="${ys(v)}" y2="${ys(v)}" stroke="#e1e6ed"/>
      <text x="${L - 6}" y="${ys(v) + 4}" font-size="11" text-anchor="end" fill="#677485">${v}%</text>`).join('');
    const step = Math.ceil(dates.length / 8);
    const xl = dates.map((d, i) => i % step === 0 || i === dates.length - 1
      ? `<text x="${xs(d)}" y="${H - 12}" font-size="10.5" text-anchor="middle" fill="#677485">${U.formatDate(d).slice(0, 5)}</text>` : '').join('');
    const lines = series.map(s => {
      const pts = s.points.slice().sort((a, b) => a.x.localeCompare(b.x));
      return `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" points="${pts.map(p => `${xs(p.x)},${ys(p.y)}`).join(' ')}"/>
        ${pts.map(p => `<circle cx="${xs(p.x)}" cy="${ys(p.y)}" r="4" fill="#fff" stroke="${s.color}" stroke-width="2"><title>${U.esc(p.label)}</title></circle>`).join('')}`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Graf perkembangan markah">${grid}${xl}${lines}</svg>`;
  },

  async studentResultsHTML(studentId) {
    const [results, assessments, subjects] = await Promise.all([DB.getAllByIndex('assessmentResults', 'studentId', studentId),
      DB.getAll('assessments'), DB.getAll('subjects')]);
    const asmMap = U.mapBy(assessments), subjMap = U.mapBy(subjects);
    const rows = results.map(r => ({ r, a: asmMap.get(r.assessmentId) })).filter(x => x.a)
      .sort((x, y) => y.a.date.localeCompare(x.a.date));
    if (!rows.length) return emptyState('prestasi', 'Tiada keputusan', 'Keputusan ujian akan dipaparkan di sini selepas dimasukkan di menu Prestasi Akademik.');
    const bySubj = U.groupBy(rows, x => x.a.subjectId);
    const series = [...bySubj.entries()].map(([sid, list], i) => ({
      name: (subjMap.get(sid) || {}).name || '—', color: CHART_COLORS[i % CHART_COLORS.length],
      points: list.map(x => ({ x: x.a.date, y: Academic.percent(x.r.marks, x.a.fullMarks), label: `${x.a.name}: ${U.pct(Academic.percent(x.r.marks, x.a.fullMarks))}` }))
    }));
    const avg = list => U.sum(list, x => Academic.percent(x.r.marks, x.a.fullMarks)) / list.length;
    return `<div class="card-head"><h3>${icon('prestasi')} Graf perkembangan mengikut subjek</h3></div>
      <div class="chart-wrap">${Academic.lineChart(series)}</div>
      <div class="chart-legend">${series.map(s => `<span><i style="background:${s.color}"></i>${U.esc(s.name)} (purata ${U.pct(avg(bySubj.get([...bySubj.keys()][series.indexOf(s)])))})</span>`).join('')}</div>
      ${tableHTML(['Tarikh', 'Ujian', 'Subjek', ['Markah', 'num'], ['Peratus', 'num'], 'Gred', 'Catatan guru'],
        rows.map(({ r, a }) => `<tr class="click-row" data-href="#/prestasi/${encodeURIComponent(a.id)}"><td>${U.formatDate(a.date)}</td><td>${U.esc(a.name)}</td>
          <td>${U.esc((subjMap.get(a.subjectId) || {}).name || '—')}</td><td class="num">${r.marks} / ${a.fullMarks}</td>
          <td class="num strong">${U.pct(Academic.percent(r.marks, a.fullMarks))}</td><td>${U.esc(r.grade || '—')}</td>
          <td class="wrap">${U.esc(r.teacherNote || '')}</td></tr>`))}`;
  }
};

const asmFilter = { subject: '', q: '' };

App.view('prestasi', {
  async render(params) {
    if (params[0]) return AssessmentDetail.render(params[0]);
    const [assessments, subjects, results, students] = await Promise.all([DB.getAll('assessments'), DB.getAll('subjects'),
      DB.getAll('assessmentResults'), DB.getAll('students')]);
    const subjMap = U.mapBy(subjects);
    const resBy = U.groupBy(results, r => r.assessmentId);
    const list = assessments.filter(a => (!asmFilter.subject || a.subjectId === asmFilter.subject) &&
      (!asmFilter.q || U.norm(a.name).includes(U.norm(asmFilter.q)))).sort((a, b) => b.date.localeCompare(a.date));
    const withRes = students.filter(s => results.some(r => r.studentId === s.id)).sort(U.byName);
    return `${pageHead('Prestasi Akademik', 'Rekod ujian, markah, gred dan perkembangan pelajar.',
      `<button class="btn btn-primary" data-act="add">${icon('plus')} Tambah ujian</button>`)}
      <section class="card">
        <div class="toolbar">
          <div class="field grow2"><label for="aq">Cari ujian</label><div class="search-box">${icon('search')}<input id="aq" type="search" value="${U.esc(asmFilter.q)}"></div></div>
          <div class="field"><label for="asb">Subjek</label><select id="asb">${U.options(subjects.sort(U.byName).map(s => [s.id, s.name]), asmFilter.subject, 'Semua')}</select></div>
        </div>
        ${tableHTML(['Tarikh', 'Ujian', 'Subjek', ['Markah penuh', 'num'], ['Bil. keputusan', 'num'], ['Purata', 'num']],
          list.map(a => { const rs = resBy.get(a.id) || [];
            const avg = rs.length ? U.sum(rs, r => Academic.percent(r.marks, a.fullMarks)) / rs.length : NaN;
            return `<tr class="click-row" data-href="#/prestasi/${encodeURIComponent(a.id)}"><td>${U.formatDate(a.date)}</td>
              <td class="strong">${U.esc(a.name)}</td><td>${U.esc((subjMap.get(a.subjectId) || {}).name || '—')}</td>
              <td class="num">${a.fullMarks}</td><td class="num">${rs.length}</td><td class="num">${rs.length ? U.pct(avg) : '—'}</td></tr>`; }),
          emptyState('prestasi', assessments.length ? 'Tiada padanan' : 'Belum ada ujian', 'Tambah ujian, kemudian masukkan markah setiap pelajar.',
            assessments.length ? '' : `<button class="btn btn-primary" data-act="add">${icon('plus')} Tambah ujian</button>`))}
      </section>
      <section class="card" style="margin-top:20px">
        <div class="card-head"><h3>${icon('pelajar')} Graf perkembangan pelajar</h3></div>
        <div class="toolbar"><div class="field grow2"><label for="gst">Pilih pelajar</label>
          <select id="gst">${U.options(withRes.map(s => [s.id, `${s.name} (${s.id})`]), '', withRes.length ? '— Pilih pelajar —' : 'Tiada keputusan lagi')}</select></div></div>
        <div id="gBody"></div>
      </section>`;
  },
  async after(view, params) {
    if (params[0]) return AssessmentDetail.after(view, params[0]);
    view.querySelector('#aq').addEventListener('change', e => { asmFilter.q = e.target.value; App.refresh(); });
    view.querySelector('#asb').addEventListener('change', e => { asmFilter.subject = e.target.value; App.refresh(); });
    view.querySelector('#gst').addEventListener('change', async e => {
      view.querySelector('#gBody').innerHTML = e.target.value ? await Academic.studentResultsHTML(e.target.value) : '';
    });
    view.addEventListener('click', e => { if (e.target.closest('[data-act="add"]')) Academic.form(); });
  }
});

const AssessmentDetail = {
  async render(id) {
    const a = await DB.get('assessments', id);
    if (!a) return `<div class="card">${emptyState('alert', 'Ujian tidak dijumpai', '', '<a class="btn btn-outline" href="#/prestasi">Kembali</a>')}</div>`;
    const [subject, results, enrolled, students, grades] = await Promise.all([DB.get('subjects', a.subjectId),
      DB.getAllByIndex('assessmentResults', 'assessmentId', id), Academic.studentsForSubject(a.subjectId), DB.getAll('students'), Settings.get('grades')]);
    const resMap = U.mapBy(results, 'studentId');
    const stuMap = U.mapBy(students);
    const ids = new Set(enrolled.map(s => s.id).concat(results.map(r => r.studentId)));
    const list = [...ids].map(sid => stuMap.get(sid)).filter(Boolean).sort(U.byName);
    const others = students.filter(s => s.status === 'aktif' && !ids.has(s.id)).sort(U.byName);
    const pcts = results.map(r => Academic.percent(r.marks, a.fullMarks)).filter(Number.isFinite);

    return `<div class="page-head no-print"><div><a href="#/prestasi" class="btn btn-ghost">${icon('back')} Senarai ujian</a></div>
      <div class="actions"><button class="btn btn-outline" data-act="print">${icon('print')} Cetak</button>
        <button class="btn btn-outline" data-act="edit">${icon('edit')} Edit</button>
        <button class="btn btn-outline" data-act="del" aria-label="Padam">${icon('trash')}</button></div></div>
      <section class="card">
        <div class="detail-head"><div class="avatar">${icon('prestasi')}</div><div class="grow"><h3>${U.esc(a.name)}</h3>
          <div class="muted small">${U.esc((subject || {}).name || '—')} · ${U.formatDate(a.date)} · Markah penuh ${a.fullMarks}</div></div></div>
        <div class="mini-stats">
          <div class="mini-stat"><span>Keputusan dimasukkan</span><strong>${results.length}</strong></div>
          <div class="mini-stat"><span>Purata</span><strong>${pcts.length ? U.pct(U.sum(pcts) / pcts.length) : '—'}</strong></div>
          <div class="mini-stat"><span>Tertinggi</span><strong>${pcts.length ? U.pct(Math.max(...pcts)) : '—'}</strong></div>
          <div class="mini-stat"><span>Terendah</span><strong>${pcts.length ? U.pct(Math.min(...pcts)) : '—'}</strong></div>
        </div>
        <form id="resForm" novalidate>
          ${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Pelajar</th><th class="num">Markah / ${a.fullMarks}</th><th class="num">Peratus</th><th>Gred</th><th>Catatan guru</th></tr></thead><tbody>
            ${list.map(s => { const r = resMap.get(s.id) || {};
              return `<tr data-sid="${U.esc(s.id)}"><td>${U.esc(s.name)}<span class="sub">${U.esc(s.id)}</span></td>
                <td class="num"><input name="m_${U.esc(s.id)}" inputmode="decimal" value="${r.marks ?? ''}" style="width:90px;text-align:right" class="cell-in" aria-label="Markah ${U.esc(s.name)}"></td>
                <td class="num" data-pct>${Number.isFinite(r.marks) ? U.pct(Academic.percent(r.marks, a.fullMarks)) : '—'}</td>
                <td><input name="g_${U.esc(s.id)}" value="${U.esc(r.grade || '')}" maxlength="4" style="width:64px" class="cell-in" placeholder="auto" aria-label="Gred"></td>
                <td><input name="n_${U.esc(s.id)}" value="${U.esc(r.teacherNote || '')}" maxlength="200" style="min-width:180px;width:100%" class="cell-in" aria-label="Catatan"></td></tr>`; }).join('')}
            </tbody></table></div>` : `<div class="card-body">${emptyState('pelajar', 'Tiada pelajar untuk subjek ini', 'Tambah pelajar secara manual di bawah.')}</div>`}
          <div class="card-body">
            ${others.length ? `<div class="actions" style="margin-bottom:12px"><select id="addStu" class="cell-in" style="min-height:40px;max-width:100%">${U.options(others.map(s => [s.id, s.name]), '', '+ Tambah pelajar lain…')}</select></div>` : ''}
            <p class="small muted">Biarkan markah kosong untuk tidak merekod keputusan. Gred dikira automatik daripada skala di Tetapan jika dibiarkan kosong.${grades.allowOverFull ? ' Markah bonus melebihi markah penuh dibenarkan.' : ''}</p>
            <div class="field-error" data-err="marks"></div>
            <div class="form-actions"><button type="submit" class="btn btn-primary">${icon('save')} Simpan keputusan</button></div>
          </div>
        </form>
      </section>`;
  },
  async after(view, id) {
    const a = await DB.get('assessments', id);
    if (!a) return;
    const grades = await Settings.get('grades');
    const form = view.querySelector('#resForm');
    form.addEventListener('input', e => {
      const tr = e.target.closest('tr[data-sid]');
      if (!tr || !e.target.name.startsWith('m_')) return;
      const p = Academic.percent(e.target.value, a.fullMarks);
      tr.querySelector('[data-pct]').textContent = e.target.value !== '' && Number.isFinite(p) ? U.pct(p) : '—';
      const g = tr.querySelector('[name^="g_"]'); g.placeholder = Academic.gradeFor(p, grades) || 'auto';
    });
    const add = view.querySelector('#addStu');
    if (add) add.addEventListener('change', async () => {
      if (!add.value) return;
      const s = await DB.get('students', add.value);
      const tbody = form.querySelector('tbody');
      const html = `<tr data-sid="${U.esc(s.id)}"><td>${U.esc(s.name)}<span class="sub">${U.esc(s.id)}</span></td>
        <td class="num"><input name="m_${U.esc(s.id)}" inputmode="decimal" style="width:90px;text-align:right" class="cell-in"></td><td class="num" data-pct>—</td>
        <td><input name="g_${U.esc(s.id)}" maxlength="4" style="width:64px" class="cell-in" placeholder="auto"></td>
        <td><input name="n_${U.esc(s.id)}" maxlength="200" style="min-width:180px;width:100%" class="cell-in"></td></tr>`;
      if (tbody) tbody.insertAdjacentHTML('beforeend', html);
      else { form.querySelector('.card-body').insertAdjacentHTML('beforebegin', `<div class="table-wrap"><table class="table"><thead><tr><th>Pelajar</th><th class="num">Markah / ${a.fullMarks}</th><th class="num">Peratus</th><th>Gred</th><th>Catatan guru</th></tr></thead><tbody>${html}</tbody></table></div>`); form.querySelector('.card-body').remove(); }
      add.querySelector(`option[value="${CSS.escape(s.id)}"]`).remove(); add.value = '';
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      busyRun(form.querySelector('[type=submit]'), async () => {
        const rows = Array.from(form.querySelectorAll('tr[data-sid]')).map(tr => ({
          sid: tr.dataset.sid, raw: tr.querySelector('[name^="m_"]').value.trim(),
          grade: tr.querySelector('[name^="g_"]').value.trim(), note: tr.querySelector('[name^="n_"]').value.trim() }));
        let err = '';
        rows.forEach(r => {
          if (r.raw === '') return;
          const m = Number(r.raw);
          if (!Number.isFinite(m) || m < 0) err = err || 'Markah mesti nombor 0 atau lebih.';
          else if (m > a.fullMarks && !grades.allowOverFull) err = err || `Markah ${m} melebihi markah penuh ${a.fullMarks}.`;
        });
        if (!showErrors(form, { marks: err })) return;
        let saved = 0, removed = 0;
        await DB.transaction(['assessmentResults'], 'readwrite', async st => {
          for (const r of rows) {
            const id2 = `${a.id}|${r.sid}`;
            const old = await DB.req(st.assessmentResults.get(id2));
            if (r.raw === '') { if (old) { await DB.req(st.assessmentResults.delete(id2)); removed++; } continue; }
            const marks = Math.round(Number(r.raw) * 100) / 100;
            const grade = r.grade || Academic.gradeFor(Academic.percent(marks, a.fullMarks), grades);
            await DB.req(st.assessmentResults.put(DB.stamp(Object.assign({}, old || {}, { id: id2, assessmentId: a.id, studentId: r.sid, marks, grade, teacherNote: r.note }))));
            saved++;
          }
        });
        toast(`${saved} keputusan disimpan${removed ? `, ${removed} dibuang` : ''}.`, 'success');
        App.refresh();
      });
    });
    view.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'edit') Academic.form(a);
      if (b.dataset.act === 'print') printPage(a.name);
      if (b.dataset.act === 'del') {
        const res = await DB.getAllByIndex('assessmentResults', 'assessmentId', a.id);
        if (await confirmDialog({ title: 'Padam ujian?', message: `${a.name}${res.length ? ` dan ${res.length} keputusan` : ''} akan dipadam secara kekal.`, confirmText: 'Padam', danger: true })) {
          await DB.transaction(['assessments', 'assessmentResults'], 'readwrite', async st => {
            for (const r of res) await DB.req(st.assessmentResults.delete(r.id));
            await DB.req(st.assessments.delete(a.id));
          });
          toast('Ujian dipadam.', 'success'); location.hash = '#/prestasi';
        }
      }
    });
  }
};
