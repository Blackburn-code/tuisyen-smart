/* =========================================================
   Tuisyen Smart - js/backup.js
   Fasa 8: Sandaran (eksport JSON), pemulihan dan panduan
   ========================================================= */
'use strict';

const BACKUP_FORMAT = 1;

const Backup = {
  async exportJSON() {
    const data = await DB.exportAll();
    const counts = {};
    Object.keys(data).forEach(k => { counts[k] = data[k].length; });
    const now = new Date();
    const payload = { app: 'TuisyenSmart', format: BACKUP_FORMAT, dbVersion: DB.DB_VERSION, appVersion: APP_VERSION,
      exportedAt: now.toISOString(), centreName: (state.profile && state.profile.centreName) || '', counts, data };
    const stamp = `${U.toISODate(now)}-${U.pad(now.getHours())}${U.pad(now.getMinutes())}`;
    await saveTextFile(`tuisyen-smart-sandaran-${stamp}.json`, JSON.stringify(payload), 'application/json');
    await Settings.save('backupInfo', { lastExportAt: now.toISOString(), lastCounts: counts });
    return counts;
  },

  // Semak fail sandaran sebelum pemulihan. Pulang { ok, errors, payload, counts }
  validate(text) {
    const errors = [];
    let p;
    try { p = JSON.parse(text); } catch (e) { return { ok: false, errors: ['Fail bukan JSON yang sah.'] }; }
    if (!p || p.app !== 'TuisyenSmart') errors.push('Fail ini bukan sandaran Tuisyen Smart.');
    if (p && p.format !== BACKUP_FORMAT) errors.push(`Format sandaran tidak disokong (format ${p.format}).`);
    if (p && Number(p.dbVersion) > DB.DB_VERSION) errors.push('Sandaran dibuat oleh versi aplikasi yang lebih baharu. Kemas kini aplikasi dahulu.');
    if (!p || typeof p.data !== 'object' || p.data === null) errors.push('Kandungan data tiada.');
    const counts = {};
    if (p && p.data && typeof p.data === 'object') {
      Object.keys(p.data).forEach(k => { if (!DB.STORE_NAMES.includes(k)) errors.push(`Stor tidak dikenali: ${k}.`); });
      DB.STORE_NAMES.forEach(name => {
        const arr = p.data[name] === undefined ? [] : p.data[name];
        if (!Array.isArray(arr)) { errors.push(`Data ${name} rosak.`); return; }
        const ids = new Set();
        arr.forEach((r, i) => {
          if (!r || typeof r !== 'object' || (typeof r.id !== 'string' && typeof r.id !== 'number')) errors.push(`${name} rekod #${i + 1} tiada ID.`);
          else if (ids.has(r.id)) errors.push(`${name}: ID berganda ${r.id}.`);
          else ids.add(r.id);
        });
        counts[name] = arr.length;
        p.data[name] = arr;
      });
      // Semakan rujukan asas
      const sid = new Set((p.data.students || []).map(s => s.id));
      const bad = (p.data.invoices || []).filter(i => !sid.has(i.studentId)).length + (p.data.payments || []).filter(x => !sid.has(x.studentId)).length;
      if (bad) errors.push(`${bad} bil/bayaran merujuk pelajar yang tiada dalam fail.`);
    }
    return { ok: errors.length === 0, errors: errors.slice(0, 8), payload: p, counts };
  },

  async restore(payload) {
    await DB.replaceAll(payload.data);
    await loadProfile();
  }
};

const STORE_LABELS = {
  students: 'Pelajar', subjects: 'Subjek', enrollments: 'Pendaftaran subjek', packages: 'Pakej', packageItems: 'Item pakej',
  classes: 'Kelas', attendance: 'Kehadiran', invoices: 'Bil', invoiceItems: 'Butiran bil', payments: 'Bayaran',
  paymentAllocations: 'Peruntukan bayaran', expenses: 'Perbelanjaan', assessments: 'Ujian', assessmentResults: 'Keputusan', settings: 'Tetapan'
};

App.view('sandaran', {
  async render() {
    const info = await Settings.get('backupInfo');
    const counts = await Promise.all(DB.STORE_NAMES.map(n => DB.count(n)));
    const days = info.lastExportAt ? U.daysBetween(U.toISODate(new Date(info.lastExportAt)), U.todayISO()) : null;
    return `${pageHead('Sandaran Data', 'Data disimpan dalam peranti ini sahaja. Buat sandaran secara berkala.')}
      <div class="stack">
        <section class="card"><div class="card-head"><h3>${icon('download')} Eksport sandaran</h3></div>
          <div class="card-body">
            <p class="mt0">Sandaran terakhir: <b>${info.lastExportAt ? U.formatDateTime(info.lastExportAt) : 'Belum pernah'}</b>
              ${days === null ? badge('Disyorkan buat sekarang', 'warning') : days > 7 ? badge(`${days} hari lalu`, 'warning') : badge('Terkini', 'success')}</p>
            <p class="small muted">Fail JSON mengandungi semua pelajar, kelas, bil, bayaran, perbelanjaan, keputusan dan tetapan.
              ${Native.isApp() ? 'Selepas menekan butang, pilih "Simpan ke Drive", "Fail" atau WhatsApp untuk menyimpan fail.' : 'Fail akan dimuat turun ke folder Muat Turun.'}</p>
            <button class="btn btn-primary" data-act="export">${icon('download')} Eksport sandaran sekarang</button>
          </div>
          ${tableHTML(['Jenis data', ['Bilangan rekod', 'num']], DB.STORE_NAMES.map((n, i) => `<tr><td>${STORE_LABELS[n] || n}</td><td class="num">${counts[i]}</td></tr>`))}
        </section>

        <section class="card"><div class="card-head"><h3>${icon('upload')} Pulihkan daripada sandaran</h3></div>
          <div class="card-body">
            <div class="note warn mt0">Pemulihan akan <b>menggantikan semua data sedia ada</b> dalam peranti ini dengan data dalam fail. Eksport sandaran data semasa dahulu jika perlu.</div>
            <div class="field"><label for="restoreFile">Pilih fail sandaran (.json)</label>
              <input type="file" id="restoreFile" accept=".json,application/json"></div>
            <div id="restorePreview"></div>
          </div>
        </section>

        <section class="card"><div class="card-head"><h3>${icon('refresh')} Panduan pindah data Android ↔ PC</h3></div>
          <div class="guide">
            <h4>Dari telefon Android ke PC</h4>
            <ol><li>Di telefon: Sandaran Data → <b>Eksport sandaran sekarang</b> → pilih Google Drive (atau hantar ke WhatsApp/e-mel sendiri).</li>
              <li>Di PC: muat turun fail .json tersebut.</li>
              <li>Buka Tuisyen Smart di PC → Sandaran Data → <b>Pilih fail sandaran</b> → semak ringkasan → Pulihkan.</li></ol>
            <h4>Dari PC ke telefon Android</h4>
            <ol><li>Di PC: Sandaran Data → <b>Eksport sandaran sekarang</b> (fail masuk ke folder Muat Turun).</li>
              <li>Pindahkan fail ke telefon (Google Drive, kabel USB, WhatsApp atau e-mel).</li>
              <li>Di telefon: Sandaran Data → <b>Pilih fail sandaran</b> → pilih fail → Pulihkan.</li></ol>
            <h4>Penting</h4>
            <ul><li>Gunakan satu peranti sebagai peranti utama. Data tidak diselaraskan secara automatik antara peranti — pemulihan akan menggantikan data di peranti penerima.</li>
              <li>Menyahpasang aplikasi atau "Kosongkan storan" akan memadam semua data. Sentiasa simpan sandaran terkini di tempat lain.</li>
              <li>Fail sandaran mengandungi maklumat peribadi pelajar dan ibu bapa. Simpan di tempat yang selamat. Aplikasi ini tidak menghantar data ke mana-mana pelayan.</li>
              <li>Aplikasi ini tidak mempunyai kata laluan. Gunakan kunci skrin telefon/PC untuk melindungi akses.</li></ul>
          </div>
        </section>

        <section class="card"><div class="card-head"><h3 class="text-danger">${icon('trash')} Padam semua data</h3></div>
          <div class="card-body"><p class="small muted mt0">Memadam semua rekod dalam peranti ini secara kekal. Tindakan ini tidak boleh dibatalkan.</p>
            <button class="btn btn-danger" data-act="wipe">${icon('trash')} Padam semua data</button></div></section>
      </div>`;
  },
  async after(view) {
    view.querySelector('[data-act="export"]').addEventListener('click', e => busyRun(e.currentTarget, async () => {
      const counts = await Backup.exportJSON();
      toast(`Sandaran disediakan (${U.sum(Object.values(counts))} rekod).`, 'success');
      App.refresh();
    }));

    view.querySelector('#restoreFile').addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      const box = view.querySelector('#restorePreview');
      if (!file) { box.innerHTML = ''; return; }
      if (file.size > 100 * 1024 * 1024) { box.innerHTML = '<div class="note danger">Fail terlalu besar.</div>'; return; }
      const text = await file.text();
      const res = Backup.validate(text);
      if (!res.ok) {
        box.innerHTML = `<div class="note danger"><b>Fail tidak boleh dipulihkan:</b><ul>${res.errors.map(x => `<li>${U.esc(x)}</li>`).join('')}</ul></div>`;
        return;
      }
      const p = res.payload;
      box.innerHTML = `<div class="note">Fail sah. Dieksport pada <b>${U.formatDateTime(p.exportedAt)}</b>${p.centreName ? ` daripada <b>${U.esc(p.centreName)}</b>` : ''} (versi ${U.esc(p.appVersion || '—')}).</div>
        ${tableHTML(['Jenis data', ['Dalam fail', 'num']], DB.STORE_NAMES.map(n => `<tr><td>${STORE_LABELS[n]}</td><td class="num">${res.counts[n]}</td></tr>`))}
        <label class="check" style="margin-top:10px"><input type="checkbox" id="restoreAck"> Saya faham semua data sedia ada akan diganti.</label>
        <div class="form-actions"><button class="btn btn-outline" data-act="safety">${icon('download')} Sandarkan data semasa dahulu</button>
          <button class="btn btn-danger" data-act="restore" disabled>${icon('upload')} Pulihkan data</button></div>`;
      const ack = box.querySelector('#restoreAck'), btn = box.querySelector('[data-act="restore"]');
      ack.addEventListener('change', () => { btn.disabled = !ack.checked; });
      box.querySelector('[data-act="safety"]').addEventListener('click', ev => busyRun(ev.currentTarget, async () => {
        await Backup.exportJSON(); toast('Sandaran data semasa disediakan.', 'success');
      }));
      btn.addEventListener('click', () => busyRun(btn, async () => {
        if (!(await confirmDialog({ title: 'Pulihkan data?', message: 'Semua data dalam peranti ini akan diganti dengan data daripada fail sandaran. Teruskan?', confirmText: 'Pulihkan', danger: true }))) return;
        await Backup.restore(p);
        toast('Data berjaya dipulihkan.', 'success');
        location.hash = '#/dashboard';
      }));
    });

    view.querySelector('[data-act="wipe"]').addEventListener('click', () => {
      formModal({
        title: 'Padam semua data?', size: 'modal-sm', danger: true,
        body: `<p class="confirm-msg" style="margin-bottom:12px">Semua pelajar, kelas, bil, bayaran, perbelanjaan, keputusan dan tetapan akan dipadam secara kekal.</p>
          ${F.text('confirm', 'Taip PADAM untuk mengesahkan', '', { req: true })}`,
        submitText: 'Padam semua',
        async onSubmit(d, form) {
          if (!showErrors(form, { confirm: d.confirm === 'PADAM' ? '' : 'Taip PADAM (huruf besar).' })) return false;
          await DB.replaceAll({});
          await loadProfile();
          toast('Semua data dipadam.', 'success');
          location.hash = '#/dashboard';
        }
      });
    });
  }
});
