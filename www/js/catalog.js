/* =========================================================
   Tuisyen Smart - js/catalog.js
   Fasa 3: Subjek, pakej tuisyen dan pendaftaran subjek
   ========================================================= */
'use strict';

const RATE_TYPES = [['bulanan', 'Bulanan'], ['kelas', 'Setiap kelas'], ['jam', 'Mengikut jam']];

const Catalog = {
  rateLabel(rt) {
    return { bulanan: 'Bulanan', kelas: 'Setiap kelas', jam: 'Mengikut jam', pakej: 'Pakej (bulanan)' }[rt] || '—';
  },
  rateSuffix(rt) { return { bulanan: '/bulan', kelas: '/kelas', jam: '/jam', pakej: '/bulan' }[rt] || ''; },
  enrollName(e, subjMap, pkgMap) {
    if (e.type === 'pakej') return (pkgMap.get(e.packageId) || {}).name || 'Pakej (dipadam)';
    return (subjMap.get(e.subjectId) || {}).name || 'Subjek (dipadam)';
  },

  // Subjek yang diliputi oleh pendaftaran aktif pelajar: Map subjectId -> label sumber
  async coveredSubjects(studentId, exceptId) {
    const [enr, items, pkgs, subjects] = await Promise.all([
      DB.getAllByIndex('enrollments', 'studentId', studentId), DB.getAll('packageItems'),
      DB.getAll('packages'), DB.getAll('subjects')]);
    const pkgMap = U.mapBy(pkgs), subjMap = U.mapBy(subjects);
    const covered = new Map();
    enr.filter(e => e.status === 'aktif' && e.id !== exceptId).forEach(e => {
      if (e.type === 'pakej') {
        items.filter(it => it.packageId === e.packageId).forEach(it =>
          covered.set(it.subjectId, `pakej "${(pkgMap.get(e.packageId) || {}).name || ''}"`));
      } else covered.set(e.subjectId, `pendaftaran subjek ${(subjMap.get(e.subjectId) || {}).name || ''}`);
    });
    return { covered, enr };
  },

  /* ---------- Pendaftaran subjek / pakej ---------- */
  async enrollForm(student) {
    const [subjects, packages, items] = await Promise.all([DB.getAll('subjects'), DB.getAll('packages'), DB.getAll('packageItems')]);
    const actSubj = subjects.filter(s => s.status !== 'tidak aktif').sort(U.byName);
    const actPkg = packages.filter(p => p.status !== 'tidak aktif').sort(U.byName);
    if (!actSubj.length) {
      await confirmDialog({ title: 'Tiada subjek', message: 'Daftar sekurang-kurangnya satu subjek di menu Subjek terlebih dahulu.', confirmText: 'Faham', cancelText: 'Tutup' });
      return;
    }
    formModal({
      title: `Daftar subjek / pakej — ${student.name}`,
      body: `
        <div class="seg" role="radiogroup" style="margin-bottom:14px">
          <button type="button" class="active" data-type="subjek">Subjek</button>
          <button type="button" data-type="pakej" ${actPkg.length ? '' : 'disabled title="Tiada pakej"'}>Pakej</button>
        </div>
        <input type="hidden" name="type" value="subjek">
        <div class="form-grid">
          <div data-for="subjek">${F.select('subjectId', 'Subjek', actSubj.map(s => [s.id, `${s.name} (${U.formatRM(s.rateSen)}${Catalog.rateSuffix(s.rateType)})`]), '', { req: true, placeholder: '— Pilih subjek —' })}</div>
          <div data-for="subjek">${F.select('rateType', 'Kaedah caj', RATE_TYPES, 'bulanan')}</div>
          <div data-for="pakej" hidden>${F.select('packageId', 'Pakej', actPkg.map(p => [p.id, `${p.name} (${U.formatRM(p.priceSen)}/bulan)`]), '', { req: true, placeholder: '— Pilih pakej —' })}</div>
          ${F.money('rateSen', 'Kadar dipersetujui (RM)', null, { req: true, help: 'Kadar ini dikunci untuk pelajar ini. Perubahan harga kemudian tidak menjejaskannya.' })}
          ${F.date('startDate', 'Tarikh mula', U.todayISO(), { req: true })}
          ${F.textarea('notes', 'Catatan', '', { cls: 'span-2' })}
        </div>
        <div class="note" id="pkgInfo" hidden></div>`,
      submitText: 'Daftar',
      onOpen(form) {
        const typeInput = form.querySelector('[name=type]');
        const setType = t => {
          typeInput.value = t;
          form.closest('.modal').querySelectorAll('[data-type]').forEach(b => b.classList.toggle('active', b.dataset.type === t));
          form.querySelectorAll('[data-for]').forEach(el => { el.hidden = el.dataset.for !== t; });
          form.querySelectorAll('[data-for] select').forEach(sel => { sel.disabled = sel.closest('[data-for]').hidden; });
          form.querySelector('#pkgInfo').hidden = true;
          form.rateSen.value = '';
        };
        form.closest('.modal').querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', () => setType(b.dataset.type)));
        setType('subjek');
        form.subjectId.addEventListener('change', () => {
          const s = subjects.find(x => x.id === form.subjectId.value);
          if (s) { form.rateType.value = s.rateType; form.rateSen.value = U.senToInput(s.rateSen); }
        });
        form.packageId.addEventListener('change', () => {
          const p = packages.find(x => x.id === form.packageId.value);
          const info = form.querySelector('#pkgInfo');
          if (p) {
            form.rateSen.value = U.senToInput(p.priceSen);
            const names = items.filter(i => i.packageId === p.id).map(i => (subjects.find(s => s.id === i.subjectId) || {}).name).filter(Boolean);
            info.textContent = 'Subjek dalam pakej: ' + names.join(', ');
            info.hidden = false;
          } else info.hidden = true;
        });
      },
      async onSubmit(d, form) {
        const rateSen = U.toSen(d.rateSen);
        const errs = {
          subjectId: d.type === 'subjek' && !d.subjectId ? 'Pilih subjek.' : '',
          packageId: d.type === 'pakej' && !d.packageId ? 'Pilih pakej.' : '',
          rateSen: rateSen === null || rateSen < 0 ? 'Masukkan kadar yang sah (cth. 80.00).' : '',
          startDate: U.isISODate(d.startDate) ? '' : 'Tarikh mula diperlukan.'
        };
        if (!showErrors(form, errs)) return false;

        const { covered, enr } = await Catalog.coveredSubjects(student.id);
        if (d.type === 'subjek') {
          if (covered.has(d.subjectId)) {
            toast(`Subjek ini sudah aktif melalui ${covered.get(d.subjectId)}. Caj berganda disekat.`, 'error');
            return false;
          }
        } else {
          if (enr.some(e => e.status === 'aktif' && e.type === 'pakej' && e.packageId === d.packageId)) {
            toast('Pelajar sudah mendaftar pakej ini.', 'error'); return false;
          }
          const clash = items.filter(i => i.packageId === d.packageId && covered.has(i.subjectId))
            .map(i => `${(subjects.find(s => s.id === i.subjectId) || {}).name} (${covered.get(i.subjectId)})`);
          if (clash.length) {
            toast('Subjek berikut sudah aktif: ' + clash.join('; ') + '. Tamatkan pendaftaran tersebut dahulu supaya tiada caj berganda.', 'error');
            return false;
          }
        }
        await DB.add('enrollments', {
          id: DB.genId('ENR'), studentId: student.id, type: d.type,
          subjectId: d.type === 'subjek' ? d.subjectId : null,
          packageId: d.type === 'pakej' ? d.packageId : null,
          rateType: d.type === 'pakej' ? 'pakej' : d.rateType,
          rateSen, startDate: d.startDate, endDate: null, status: 'aktif', notes: d.notes || ''
        });
        toast('Pendaftaran berjaya.', 'success');
        App.refresh();
      }
    });
  },

  async endEnrollment(id) {
    const e = await DB.get('enrollments', id);
    if (!e) return;
    formModal({
      title: 'Tamatkan pendaftaran',
      size: 'modal-sm',
      body: `<p class="confirm-msg" style="margin-bottom:12px">Pendaftaran tidak akan dicaj lagi dalam bil bulanan selepas tarikh tamat. Sejarah bil kekal.</p>
        ${F.date('endDate', 'Tarikh tamat', U.todayISO(), { req: true })}`,
      submitText: 'Tamatkan',
      async onSubmit(d, form) {
        if (!showErrors(form, { endDate: U.isISODate(d.endDate) && d.endDate >= (e.startDate || '') ? '' : 'Tarikh tamat mesti selepas tarikh mula.' })) return false;
        await DB.put('enrollments', Object.assign({}, e, { status: 'tamat', endDate: d.endDate }));
        toast('Pendaftaran ditamatkan.', 'success');
        App.refresh();
      }
    });
  }
};

/* ---------------- Paparan Subjek ---------------- */
App.view('subjek', {
  async render() {
    const [subjects, enr, classes] = await Promise.all([DB.getAll('subjects'), DB.getAll('enrollments'), DB.getAll('classes')]);
    subjects.sort(U.byName);
    const actCount = id => enr.filter(e => e.status === 'aktif' && e.subjectId === id).length;
    const clsCount = id => classes.filter(c => c.subjectId === id).length;
    return `${pageHead('Subjek', 'Setiap subjek mempunyai kadar tersendiri. Kadar dikunci pada pendaftaran pelajar.',
      `<button class="btn btn-primary" data-act="add">${icon('plus')} Tambah subjek</button>`)}
      <section class="card">${tableHTML(['Subjek', 'Kaedah caj', ['Kadar asas', 'num'], ['Pelajar aktif', 'num'], ['Kelas', 'num'], 'Status', ''],
        subjects.map(s => `<tr>
          <td class="strong">${U.esc(s.name)}${s.notes ? `<span class="sub">${U.esc(s.notes)}</span>` : ''}</td>
          <td>${Catalog.rateLabel(s.rateType)}</td><td class="num">${U.formatRM(s.rateSen)}${Catalog.rateSuffix(s.rateType)}</td>
          <td class="num">${actCount(s.id)}</td><td class="num">${clsCount(s.id)}</td>
          <td>${s.status === 'tidak aktif' ? badge('Tidak aktif') : badge('Aktif', 'success')}</td>
          <td class="actions-cell"><button class="btn btn-sm btn-outline" data-edit="${s.id}">${icon('edit')} Edit</button>
            <button class="btn btn-sm btn-outline" data-del="${s.id}" aria-label="Padam">${icon('trash')}</button></td></tr>`),
        emptyState('subjek', 'Belum ada subjek', 'Tambah subjek seperti Matematik, Bahasa Melayu, Bahasa Inggeris dan Sains.',
          `<button class="btn btn-primary" data-act="add">${icon('plus')} Tambah subjek</button>`))}</section>`;
  },
  async after(view) {
    const subjects = await DB.getAll('subjects');
    const form = s => {
      s = s || {};
      formModal({
        title: s.id ? 'Kemas kini subjek' : 'Tambah subjek',
        body: `<div class="form-grid">
          ${F.text('name', 'Nama subjek', s.name, { req: true, max: 60, cls: 'span-2' })}
          ${F.select('rateType', 'Kaedah caj asas', RATE_TYPES, s.rateType || 'bulanan')}
          ${F.money('rateSen', 'Kadar asas (RM)', Number.isFinite(s.rateSen) ? s.rateSen : null, { req: true, help: 'cth. 80.00 sebulan, 25.00 sekelas atau 20.00 sejam' })}
          ${F.select('status', 'Status', [['aktif', 'Aktif'], ['tidak aktif', 'Tidak aktif']], s.status || 'aktif')}
          ${F.textarea('notes', 'Catatan', s.notes, { cls: 'span-2' })}
        </div>${s.id ? '<div class="note">Perubahan kadar hanya digunakan untuk pendaftaran baharu. Pendaftaran dan bil sedia ada tidak berubah.</div>' : ''}`,
        async onSubmit(d, f) {
          const rateSen = U.toSen(d.rateSen);
          const dup = subjects.find(x => U.norm(x.name) === U.norm(d.name) && x.id !== s.id);
          if (!showErrors(f, {
            name: !d.name ? 'Nama subjek diperlukan.' : dup ? 'Subjek dengan nama ini sudah wujud.' : '',
            rateSen: rateSen === null || rateSen < 0 ? 'Masukkan kadar yang sah.' : ''
          })) return false;
          await DB.put('subjects', Object.assign({}, s, { id: s.id || DB.genId('SUB'), name: d.name,
            rateType: d.rateType, rateSen, status: d.status, notes: d.notes || '' }));
          toast('Subjek disimpan.', 'success');
          App.refresh();
        }
      });
    };
    view.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'add') form();
      if (b.dataset.edit) form(subjects.find(s => s.id === b.dataset.edit));
      if (b.dataset.del) {
        const id = b.dataset.del;
        const [enr, items, classes, asm] = await Promise.all([DB.getAllByIndex('enrollments', 'subjectId', id),
          DB.getAllByIndex('packageItems', 'subjectId', id), DB.getAll('classes'), DB.getAllByIndex('assessments', 'subjectId', id)]);
        if (enr.length || items.length || asm.length || classes.some(c => c.subjectId === id)) {
          await confirmDialog({ title: 'Tidak boleh dipadam', message: 'Subjek ini digunakan dalam pendaftaran, pakej, kelas atau ujian. Tukar status kepada "Tidak aktif" untuk menyembunyikannya.', confirmText: 'Faham', cancelText: 'Tutup' });
          return;
        }
        if (await confirmDialog({ title: 'Padam subjek?', message: 'Subjek akan dipadam secara kekal.', confirmText: 'Padam', danger: true })) {
          await DB.remove('subjects', id); toast('Subjek dipadam.', 'success'); App.refresh();
        }
      }
    });
  }
});

/* ---------------- Paparan Pakej ---------------- */
App.view('pakej', {
  async render() {
    const [packages, items, subjects, enr] = await Promise.all([DB.getAll('packages'), DB.getAll('packageItems'), DB.getAll('subjects'), DB.getAll('enrollments')]);
    const subjMap = U.mapBy(subjects);
    packages.sort(U.byName);
    return `${pageHead('Pakej Tuisyen', 'Beberapa subjek pada satu harga bulanan. Subjek dalam pakej tidak dicaj berasingan.',
      `<button class="btn btn-primary" data-act="add" ${subjects.length ? '' : 'disabled'}>${icon('plus')} Tambah pakej</button>`)}
      <section class="card">${tableHTML(['Pakej', 'Subjek', ['Harga sebulan', 'num'], ['Pelajar aktif', 'num'], 'Status', ''],
        packages.map(p => `<tr>
          <td class="strong">${U.esc(p.name)}</td>
          <td class="wrap">${U.esc(items.filter(i => i.packageId === p.id).map(i => (subjMap.get(i.subjectId) || {}).name).filter(Boolean).join(', ') || '—')}</td>
          <td class="num">${U.formatRM(p.priceSen)}</td>
          <td class="num">${enr.filter(e => e.status === 'aktif' && e.packageId === p.id).length}</td>
          <td>${p.status === 'tidak aktif' ? badge('Tidak aktif') : badge('Aktif', 'success')}</td>
          <td class="actions-cell"><button class="btn btn-sm btn-outline" data-edit="${p.id}">${icon('edit')} Edit</button>
            <button class="btn btn-sm btn-outline" data-del="${p.id}" aria-label="Padam">${icon('trash')}</button></td></tr>`),
        emptyState('pakej', 'Belum ada pakej', subjects.length ? 'Contoh: 3 subjek pada harga RM180 sebulan.' : 'Daftar subjek terlebih dahulu di menu Subjek.',
          subjects.length ? `<button class="btn btn-primary" data-act="add">${icon('plus')} Tambah pakej</button>` : '<a class="btn btn-outline" href="#/subjek">Buka Subjek</a>'))}</section>`;
  },
  async after(view) {
    const [packages, items, subjects] = await Promise.all([DB.getAll('packages'), DB.getAll('packageItems'), DB.getAll('subjects')]);
    const form = p => {
      p = p || {};
      const chosen = new Set(items.filter(i => i.packageId === p.id).map(i => i.subjectId));
      const opts = subjects.filter(s => s.status !== 'tidak aktif' || chosen.has(s.id)).sort(U.byName);
      formModal({
        title: p.id ? 'Kemas kini pakej' : 'Tambah pakej',
        body: `<div class="form-grid">
          ${F.text('name', 'Nama pakej', p.name, { req: true, max: 60, placeholder: 'cth. Pakej UPSR 3 Subjek' })}
          ${F.money('priceSen', 'Harga sebulan (RM)', Number.isFinite(p.priceSen) ? p.priceSen : null, { req: true })}
          ${F.select('status', 'Status', [['aktif', 'Aktif'], ['tidak aktif', 'Tidak aktif']], p.status || 'aktif')}
          <div class="field span-2"><label>Subjek dalam pakej <span class="req">*</span></label>
            <div class="pick-list">${opts.map(s => `<label><input type="checkbox" name="subjectIds" data-multi value="${s.id}" ${chosen.has(s.id) ? 'checked' : ''}>
              ${U.esc(s.name)}<span class="sub">${U.formatRM(s.rateSen)}${Catalog.rateSuffix(s.rateType)}</span></label>`).join('')}</div>
            <div class="field-error" data-err="subjectIds"></div></div>
          ${F.textarea('notes', 'Catatan', p.notes, { cls: 'span-2' })}
        </div>${p.id ? '<div class="note">Perubahan harga hanya untuk pendaftaran baharu. Pelajar sedia ada kekal pada kadar asal.</div>' : ''}`,
        async onSubmit(d, f) {
          const priceSen = U.toSen(d.priceSen);
          const ids = d.subjectIds || [];
          const dup = packages.find(x => U.norm(x.name) === U.norm(d.name) && x.id !== p.id);
          if (!showErrors(f, {
            name: !d.name ? 'Nama pakej diperlukan.' : dup ? 'Pakej dengan nama ini sudah wujud.' : '',
            priceSen: priceSen === null || priceSen < 0 ? 'Masukkan harga yang sah.' : '',
            subjectIds: ids.length < 1 ? 'Pilih sekurang-kurangnya satu subjek.' : ''
          })) return false;
          const id = p.id || DB.genId('PKG');
          await DB.transaction(['packages', 'packageItems'], 'readwrite', async st => {
            await DB.req(st.packages.put(DB.stamp(Object.assign({}, p, { id, name: d.name, priceSen, status: d.status, notes: d.notes || '' }))));
            const old = await DB.req(st.packageItems.index('packageId').getAll(id));
            for (const it of old) await DB.req(st.packageItems.delete(it.id));
            for (const sid of ids) await DB.req(st.packageItems.add(DB.stamp({ id: `${id}|${sid}`, packageId: id, subjectId: sid })));
          });
          toast('Pakej disimpan.', 'success');
          App.refresh();
        }
      });
    };
    view.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'add') form();
      if (b.dataset.edit) form(packages.find(p => p.id === b.dataset.edit));
      if (b.dataset.del) {
        const id = b.dataset.del;
        const enr = await DB.getAllByIndex('enrollments', 'packageId', id);
        if (enr.length) {
          await confirmDialog({ title: 'Tidak boleh dipadam', message: 'Pakej ini pernah didaftarkan oleh pelajar. Tukar status kepada "Tidak aktif".', confirmText: 'Faham', cancelText: 'Tutup' });
          return;
        }
        if (await confirmDialog({ title: 'Padam pakej?', message: 'Pakej akan dipadam secara kekal.', confirmText: 'Padam', danger: true })) {
          await DB.transaction(['packages', 'packageItems'], 'readwrite', async st => {
            const old = await DB.req(st.packageItems.index('packageId').getAll(id));
            for (const it of old) await DB.req(st.packageItems.delete(it.id));
            await DB.req(st.packages.delete(id));
          });
          toast('Pakej dipadam.', 'success'); App.refresh();
        }
      }
    });
  }
});
