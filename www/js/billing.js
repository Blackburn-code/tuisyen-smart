/* =========================================================
   Tuisyen Smart - js/billing.js
   Fasa 5: Yuran, bil, bayaran, peruntukan bayaran dan resit
   Jumlah bil = Jumlah butiran − Diskaun + Caj tambahan
   Baki bil   = Jumlah bil − Bayaran yang diperuntukkan
   ========================================================= */
'use strict';

const PAY_METHODS = [['tunai', 'Tunai'], ['pindahan bank', 'Pindahan bank'], ['duitnow', 'DuitNow'], ['lain-lain', 'Lain-lain']];
const INV_STATUS_FILTER = [['belum bayar', 'Belum bayar'], ['separa', 'Bayaran separa'], ['tertunggak', 'Tertunggak'],
  ['selesai', 'Selesai'], ['batal', 'Dibatalkan'], ['baki', 'Semua yang ada baki']];

const Billing = {
  methodLabel(m) { const x = PAY_METHODS.find(p => p[0] === m); return x ? x[1] : (m || '—'); },

  calcTotals(items, discountSen, extraSen) {
    const subtotal = U.sum(items, i => i.amountSen);
    return { subtotal, total: subtotal - (discountSen || 0) + (extraSen || 0) };
  },

  async newInvoiceNo(st, dateISO) {
    const b = (await DB.req(st.settings.get('billing'))) || {};
    const prefix = b.invoicePrefix || SETTING_DEFAULTS.billing.invoicePrefix;
    const y = dateISO.slice(0, 4);
    const n = await nextNumber(st, 'invoice-' + y);
    return `${prefix}${y}-${String(n).padStart(4, '0')}`;
  },
  async newReceiptNo(st, dateISO) {
    const b = (await DB.req(st.settings.get('billing'))) || {};
    const prefix = b.receiptPrefix || SETTING_DEFAULTS.billing.receiptPrefix;
    const y = dateISO.slice(0, 4);
    const n = await nextNumber(st, 'receipt-' + y);
    return `${prefix}${y}-${String(n).padStart(4, '0')}`;
  },

  // Pendaftaran yang aktif dalam bulan tertentu
  activeInMonth(e, monthKey) {
    const ms = U.monthStart(monthKey), me = U.monthEnd(monthKey);
    return (e.startDate || '') <= me && (!e.endDate || e.endDate >= ms) && (e.status === 'aktif' || (e.endDate && e.endDate >= ms));
  },

  // Bina butiran caj bulanan bagi seorang pelajar (tidak menyimpan)
  buildMonthlyItems(student, monthKey, ctx) {
    const items = [];
    const enr = ctx.enrollments.filter(e => e.studentId === student.id && Billing.activeInMonth(e, monthKey));
    const ms = U.monthStart(monthKey), me = U.monthEnd(monthKey);
    const held = ctx.classes.filter(c => (c.status === 'selesai' || c.status === 'ganti') && c.date >= ms && c.date <= me &&
      (c.studentIds || []).includes(student.id));
    enr.forEach(e => {
      const name = Catalog.enrollName(e, ctx.subjMap, ctx.pkgMap);
      const period = U.monthLabel(monthKey);
      if (e.rateType === 'bulanan' || e.rateType === 'pakej') {
        items.push({ description: `${e.type === 'pakej' && !/^pakej/i.test(name) ? 'Pakej ' : ''}${name} — ${period}`, qty: 1, unitSen: e.rateSen,
          amountSen: e.rateSen, chargeType: e.rateType, enrollmentId: e.id });
      } else if (e.rateType === 'kelas') {
        const n = held.filter(c => c.subjectId === e.subjectId).length;
        if (n > 0) items.push({ description: `${name} — ${n} kelas (${period})`, qty: n, unitSen: e.rateSen,
          amountSen: n * e.rateSen, chargeType: 'kelas', enrollmentId: e.id });
      } else if (e.rateType === 'jam') {
        const mins = U.sum(held.filter(c => c.subjectId === e.subjectId), c => c.durationMin);
        if (mins > 0) {
          const hours = Math.round((mins / 60) * 100) / 100;
          items.push({ description: `${name} — ${U.durationText(mins)} (${period})`, qty: hours, unitSen: e.rateSen,
            amountSen: Math.round(e.rateSen * mins / 60), chargeType: 'jam', enrollmentId: e.id });
        }
      }
    });
    return items;
  },

  /* ---------- Borang bil manual ---------- */
  async invoiceForm(existing, studentId) {
    const [students, billing, subjects, packages, enrollments] = await Promise.all([
      DB.getAll('students'), Settings.get('billing'), DB.getAll('subjects'), DB.getAll('packages'), DB.getAll('enrollments')]);
    const subjMap = U.mapBy(subjects), pkgMap = U.mapBy(packages);
    let items = [];
    if (existing) {
      const fin = await Fin.load();
      if (fin.paid(existing) > 0) {
        await confirmDialog({ title: 'Bil tidak boleh diubah', message: 'Bil ini sudah menerima bayaran. Untuk menjaga ketepatan rekod, batalkan bayaran dahulu jika perlu mengubah butiran bil.', confirmText: 'Faham', cancelText: 'Tutup' });
        return;
      }
      items = (await DB.getAllByIndex('invoiceItems', 'invoiceId', existing.id)).sort((a, b) => (a.line || 0) - (b.line || 0));
    }
    const inv = existing || { studentId: studentId || '', date: U.todayISO(), dueDate: U.addDaysISO(U.todayISO(), billing.dueDays), discountSen: 0, extraSen: 0 };
    const stuOpts = students.filter(s => s.status === 'aktif' || s.id === inv.studentId).sort(U.byName).map(s => [s.id, `${s.name} (${s.id})`]);
    if (!stuOpts.length) { toast('Daftar pelajar terlebih dahulu.', 'error'); return; }

    const rowHTML = it => `<div class="item-row">
      <input name="desc" placeholder="Keterangan caj" maxlength="120" value="${U.esc(it.description || '')}" aria-label="Keterangan">
      <input name="qty" inputmode="decimal" value="${U.esc(it.qty ?? 1)}" aria-label="Kuantiti">
      <input name="unit" inputmode="decimal" placeholder="0.00" value="${Number.isFinite(it.unitSen) ? U.senToInput(it.unitSen) : ''}" aria-label="Harga seunit">
      <button type="button" class="icon-btn" data-delrow aria-label="Buang baris">${icon('close')}</button></div>`;

    formModal({
      title: existing ? `Kemas kini bil ${existing.invoiceNo}` : 'Bil baharu',
      size: 'modal-lg',
      body: `<div class="form-grid">
          ${F.select('studentId', 'Pelajar', stuOpts, inv.studentId, { req: true, placeholder: '— Pilih pelajar —' })}
          ${F.date('date', 'Tarikh bil', inv.date, { req: true })}
          ${F.date('dueDate', 'Tarikh akhir bayaran', inv.dueDate, { req: true })}
        </div>
        <div style="margin-top:14px"><div class="item-row item-head"><span>Keterangan</span><span>Kuantiti</span><span>Harga seunit (RM)</span><span></span></div>
          <div id="itemRows">${(items.length ? items : [{}]).map(rowHTML).join('')}</div>
          <div class="field-error" data-err="items"></div>
          <div class="actions"><button type="button" class="btn btn-sm btn-outline" data-addrow>${icon('plus')} Tambah baris</button>
            <button type="button" class="btn btn-sm btn-outline" data-fromenr>${icon('subjek')} Isi daripada pendaftaran</button></div></div>
        <div class="form-grid" style="margin-top:14px">
          ${F.money('discountSen', 'Diskaun (RM)', inv.discountSen || 0)}
          ${F.money('extraSen', 'Caj tambahan (RM)', inv.extraSen || 0, { help: 'cth. yuran pendaftaran, bahan' })}
          ${F.textarea('notes', 'Catatan', inv.notes, { cls: 'span-2' })}
        </div>
        <div class="total-box" id="totBox"></div>`,
      submitText: existing ? 'Kemas kini' : 'Simpan bil',
      onOpen(form) {
        const rows = form.querySelector('#itemRows');
        const readItems = () => Array.from(rows.querySelectorAll('.item-row')).map(r => ({
          description: r.querySelector('[name=desc]').value.trim(),
          qtyRaw: r.querySelector('[name=qty]').value.trim(),
          unitRaw: r.querySelector('[name=unit]').value.trim()
        }));
        const recalc = () => {
          const its = readItems().map(i => {
            const q = Number(i.qtyRaw), u = U.toSen(i.unitRaw);
            return { amountSen: Number.isFinite(q) && u !== null ? Math.round(q * u) : 0 };
          });
          const t = Billing.calcTotals(its, U.toSen(form.discountSen.value) || 0, U.toSen(form.extraSen.value) || 0);
          form.querySelector('#totBox').innerHTML = `<div><span>Jumlah butiran</span><span>${U.formatRM(t.subtotal)}</span></div>
            <div><span>Diskaun</span><span>− ${U.formatRM(U.toSen(form.discountSen.value) || 0)}</span></div>
            <div><span>Caj tambahan</span><span>+ ${U.formatRM(U.toSen(form.extraSen.value) || 0)}</span></div>
            <div class="grand"><span>Jumlah bil</span><span>${U.formatRM(t.total)}</span></div>`;
        };
        form.readItems = readItems;
        form.addEventListener('input', recalc);
        form.date.addEventListener('change', () => {
          if (U.isISODate(form.date.value)) form.dueDate.value = U.addDaysISO(form.date.value, billing.dueDays);
        });
        form.addEventListener('click', e => {
          if (e.target.closest('[data-addrow]')) { rows.insertAdjacentHTML('beforeend', rowHTML({})); recalc(); }
          const del = e.target.closest('[data-delrow]');
          if (del) { if (rows.children.length > 1) del.closest('.item-row').remove(); else del.closest('.item-row').querySelectorAll('input').forEach(i => { i.value = ''; }); recalc(); }
          if (e.target.closest('[data-fromenr]')) {
            const sid = form.studentId.value;
            if (!sid) { toast('Pilih pelajar dahulu.', 'error'); return; }
            const act = enrollments.filter(x => x.studentId === sid && x.status === 'aktif');
            if (!act.length) { toast('Pelajar ini tiada pendaftaran subjek/pakej aktif.', 'warning'); return; }
            const empty = Array.from(rows.children).filter(r => !r.querySelector('[name=desc]').value && !r.querySelector('[name=unit]').value);
            empty.forEach(r => r.remove());
            act.forEach(x => rows.insertAdjacentHTML('beforeend', rowHTML({
              description: `${x.type === 'pakej' && !/^pakej/i.test(Catalog.enrollName(x, subjMap, pkgMap)) ? 'Pakej ' : ''}${Catalog.enrollName(x, subjMap, pkgMap)} (${Catalog.rateLabel(x.rateType)})`,
              qty: 1, unitSen: x.rateSen })));
            recalc();
          }
        });
        recalc();
      },
      async onSubmit(d, form) {
        const raw = form.readItems().filter(i => i.description || i.unitRaw);
        let itemErr = raw.length ? '' : 'Masukkan sekurang-kurangnya satu butiran caj.';
        const its = raw.map((i, idx) => {
          const qty = Number(i.qtyRaw), unitSen = U.toSen(i.unitRaw);
          if (!i.description) itemErr = itemErr || `Baris ${idx + 1}: keterangan diperlukan.`;
          if (!(qty > 0)) itemErr = itemErr || `Baris ${idx + 1}: kuantiti mesti lebih daripada 0.`;
          if (unitSen === null || unitSen < 0) itemErr = itemErr || `Baris ${idx + 1}: harga tidak sah.`;
          return { description: i.description, qty: Math.round(qty * 100) / 100, unitSen, amountSen: Math.round(qty * unitSen), chargeType: 'manual' };
        });
        const discountSen = U.toSen(d.discountSen || '0'), extraSen = U.toSen(d.extraSen || '0');
        const t = Billing.calcTotals(its, discountSen || 0, extraSen || 0);
        if (!showErrors(form, {
          studentId: d.studentId ? '' : 'Pilih pelajar.',
          date: U.isISODate(d.date) ? '' : 'Tarikh bil diperlukan.',
          dueDate: !U.isISODate(d.dueDate) ? 'Tarikh akhir diperlukan.' : d.dueDate < d.date ? 'Tarikh akhir tidak boleh sebelum tarikh bil.' : '',
          items: itemErr,
          discountSen: discountSen === null || discountSen < 0 ? 'Diskaun tidak sah.' : '',
          extraSen: extraSen === null || extraSen < 0 ? 'Caj tambahan tidak sah.' : (!itemErr && t.total < 0 ? 'Diskaun melebihi jumlah bil.' : '')
        })) return false;

        const id = existing ? existing.id : DB.genId('INV');
        const saved = await DB.transaction(['invoices', 'invoiceItems', 'settings', 'paymentAllocations'], 'readwrite', async st => {
          let invoiceNo = existing && existing.invoiceNo;
          if (existing) {
            const al = await DB.req(st.paymentAllocations.index('invoiceId').getAll(id));
            if (al.length) throw new Error('Bil ini sudah menerima bayaran dan tidak boleh diubah.');
            const old = await DB.req(st.invoiceItems.index('invoiceId').getAll(id));
            for (const o of old) await DB.req(st.invoiceItems.delete(o.id));
          } else invoiceNo = await Billing.newInvoiceNo(st, d.date);
          await DB.req(st.invoices.put(DB.stamp(Object.assign({}, existing || { kind: 'manual', periodKey: null }, {
            id, invoiceNo, studentId: d.studentId, date: d.date, dueDate: d.dueDate,
            subtotalSen: t.subtotal, discountSen, extraSen, totalSen: t.total, status: 'aktif', notes: d.notes || ''
          }))));
          let line = 0;
          for (const it of its) await DB.req(st.invoiceItems.add(DB.stamp(Object.assign({ id: `${id}|${++line}`, invoiceId: id, line }, it))));
          return invoiceNo;
        });
        toast(`Bil ${saved} disimpan.`, 'success');
        location.hash = '#/yuran/' + id;
        if (existing) App.refresh();
      }
    });
  },

  /* ---------- Jana bil bulanan ---------- */
  async monthlyForm() {
    const billing = await Settings.get('billing');
    const month = U.todayISO().slice(0, 7);
    const m = openModal({
      title: 'Jana bil bulanan',
      size: 'modal-lg',
      body: `<form novalidate id="genForm"><div class="form-grid">
          ${F.text('month', 'Bulan caj', month, { type: 'month', req: true })}
          ${F.date('date', 'Tarikh bil', U.todayISO(), { req: true })}
          ${F.date('dueDate', 'Tarikh akhir bayaran', U.addDaysISO(U.todayISO(), billing.dueDays), { req: true })}
        </div>
        <div class="note">Caj bulanan & pakej dikira penuh. Caj setiap kelas dan mengikut jam dikira daripada kelas <b>selesai</b> atau <b>kelas ganti</b> dalam bulan tersebut. Kelas dibatalkan tidak dicaj. Pelajar yang sudah mempunyai bil bulanan bagi bulan yang sama akan dilangkau.</div>
        <div id="genPreview"></div></form>`,
      footer: `<button class="btn btn-outline" data-close>Batal</button>
        <button class="btn btn-primary" data-gen disabled>${icon('check')} Jana bil dipilih</button>`
    });
    const form = m.el.querySelector('#genForm');
    const genBtn = m.el.querySelector('[data-gen]');
    let plan = [];

    const preview = async () => {
      const mk = form.month.value;
      const box = m.el.querySelector('#genPreview');
      if (!/^\d{4}-\d{2}$/.test(mk)) { box.innerHTML = ''; genBtn.disabled = true; return; }
      const [students, enrollments, classes, subjects, packages, invoices] = await Promise.all([
        DB.getAll('students'), DB.getAll('enrollments'), DB.getAll('classes'), DB.getAll('subjects'), DB.getAll('packages'), DB.getAll('invoices')]);
      const ctx = { enrollments, classes, subjMap: U.mapBy(subjects), pkgMap: U.mapBy(packages) };
      plan = students.filter(s => s.status === 'aktif').sort(U.byName).map(s => {
        const items = Billing.buildMonthlyItems(s, mk, ctx);
        const dup = invoices.find(i => i.status !== 'batal' && i.kind === 'bulanan' && i.studentId === s.id && i.periodKey === mk);
        return { student: s, items, total: U.sum(items, i => i.amountSen), dup };
      }).filter(p => p.items.length || p.dup);
      const ok = plan.filter(p => !p.dup && p.total > 0);
      box.innerHTML = plan.length ? `<div class="result-count">${ok.length} bil boleh dijana · ${plan.filter(p => p.dup).length} sudah wujud</div>
        ${tableHTML(['', 'Pelajar', 'Butiran caj', ['Jumlah', 'num']], plan.map((p, i) => `<tr>
          <td><input type="checkbox" data-pick="${i}" ${p.dup || p.total <= 0 ? 'disabled' : 'checked'} aria-label="Pilih"></td>
          <td>${U.esc(p.student.name)}<span class="sub">${U.esc(p.student.id)}</span></td>
          <td class="wrap">${p.dup ? badge(`Sudah dijana: ${p.dup.invoiceNo}`, 'warning') : p.items.map(it => U.esc(it.description)).join('<br>')}</td>
          <td class="num">${U.formatRM(p.total)}</td></tr>`))}
        <div class="total-box"><div class="grand"><span>Jumlah bil dipilih</span><span id="genTotal"></span></div></div>`
        : emptyState('yuran', 'Tiada caj untuk bulan ini', 'Tiada pelajar aktif yang mempunyai pendaftaran subjek/pakej aktif atau kelas boleh dicaj dalam bulan ini.');
      const updTotal = () => {
        const picked = Array.from(box.querySelectorAll('[data-pick]:checked')).map(x => plan[x.dataset.pick]);
        const el = box.querySelector('#genTotal'); if (el) el.textContent = `${U.formatRM(U.sum(picked, p => p.total))} (${picked.length} bil)`;
        genBtn.disabled = !picked.length;
      };
      box.addEventListener('change', updTotal); updTotal();
    };
    form.month.addEventListener('change', preview);
    form.date.addEventListener('change', () => { if (U.isISODate(form.date.value)) form.dueDate.value = U.addDaysISO(form.date.value, billing.dueDays); });
    await preview();

    genBtn.addEventListener('click', () => busyRun(genBtn, async () => {
      const mk = form.month.value, date = form.date.value, dueDate = form.dueDate.value;
      if (!U.isISODate(date) || !U.isISODate(dueDate) || dueDate < date) { toast('Semak tarikh bil dan tarikh akhir.', 'error'); return; }
      const picked = Array.from(m.el.querySelectorAll('[data-pick]:checked')).map(x => plan[x.dataset.pick]);
      if (!picked.length) return;
      if (!(await confirmDialog({ title: 'Jana bil?', message: `${picked.length} bil bulanan ${U.monthLabel(mk)} akan dijana berjumlah ${U.formatRM(U.sum(picked, p => p.total))}.`, confirmText: 'Jana' }))) return;
      const res = await DB.transaction(['invoices', 'invoiceItems', 'settings'], 'readwrite', async st => {
        let made = 0, skipped = 0;
        for (const p of picked) {
          // Semakan pendua sekali lagi dalam transaksi (elak klik berulang / tab lain)
          const existing = await DB.req(st.invoices.index('studentId').getAll(p.student.id));
          if (existing.some(i => i.status !== 'batal' && i.kind === 'bulanan' && i.periodKey === mk)) { skipped++; continue; }
          const id = DB.genId('INV');
          const invoiceNo = await Billing.newInvoiceNo(st, date);
          await DB.req(st.invoices.add(DB.stamp({ id, invoiceNo, studentId: p.student.id, date, dueDate, kind: 'bulanan', periodKey: mk,
            subtotalSen: p.total, discountSen: 0, extraSen: 0, totalSen: p.total, status: 'aktif', notes: `Yuran ${U.monthLabel(mk)}` })));
          let line = 0;
          for (const it of p.items) await DB.req(st.invoiceItems.add(DB.stamp(Object.assign({ id: `${id}|${++line}`, invoiceId: id, line, periodKey: mk }, it))));
          made++;
        }
        return { made, skipped };
      });
      m.close();
      toast(`${res.made} bil dijana${res.skipped ? `, ${res.skipped} dilangkau (sudah wujud)` : ''}.`, 'success');
      App.refresh();
    }));
  },

  /* ---------- Rekod bayaran ---------- */
  async paymentForm(studentId, invoiceId) {
    const [students, fin] = await Promise.all([DB.getAll('students'), Fin.load()]);
    const stuOpts = students.filter(s => s.status === 'aktif' || s.id === studentId || fin.outstandingOf(s.id) > 0)
      .sort(U.byName).map(s => [s.id, `${s.name} (${s.id})`]);
    if (!stuOpts.length) { toast('Daftar pelajar terlebih dahulu.', 'error'); return; }
    const payId = DB.genId('PAY'); // ID tetap untuk borang ini: klik berulang tidak menghasilkan rekod kedua

    formModal({
      title: 'Rekod bayaran',
      size: 'modal-lg',
      body: `<div class="form-grid">
          ${F.select('studentId', 'Pelajar', stuOpts, studentId || '', { req: true, placeholder: '— Pilih pelajar —' })}
          ${F.date('date', 'Tarikh bayaran', U.todayISO(), { req: true })}
          ${F.money('amountSen', 'Amaun diterima (RM)', null, { req: true })}
          ${F.select('method', 'Kaedah pembayaran', PAY_METHODS, 'tunai')}
          ${F.text('reference', 'No. rujukan', '', { max: 60, help: 'cth. no. transaksi bank / DuitNow' })}
          ${F.textarea('notes', 'Catatan', '', { cls: 'span-2' })}
        </div>
        <h4 style="margin:16px 0 4px">Peruntukan kepada bil</h4>
        <div class="field-error" data-err="alloc"></div>
        <div id="allocBox"></div>`,
      submitText: 'Simpan & jana resit',
      onOpen(form) {
        const box = form.querySelector('#allocBox');
        let open = [];
        const draw = () => {
          const sid = form.studentId.value;
          open = sid ? fin.validInvoices.filter(i => i.studentId === sid && fin.balance(i) > 0).sort((a, b) => a.date.localeCompare(b.date) || a.invoiceNo.localeCompare(b.invoiceNo)) : [];
          box.innerHTML = !sid ? '<p class="muted small">Pilih pelajar untuk melihat bil tertunggak.</p>'
            : !open.length ? '<div class="note">Tiada bil tertunggak. Bayaran akan direkod sebagai kredit (belum diperuntukkan).</div>'
            : `<div class="actions" style="margin-bottom:6px"><button type="button" class="btn btn-sm btn-outline" data-auto>Agih automatik (bil terlama dahulu)</button></div>
              ${open.map(i => `<div class="alloc-row"><div><span class="strong">${U.esc(i.invoiceNo)}</span> · ${U.formatDate(i.date)}
                <span class="sub">Baki ${U.formatRM(fin.balance(i))} · akhir ${U.formatDate(i.dueDate)}</span></div>
                <input data-inv="${U.esc(i.id)}" inputmode="decimal" placeholder="0.00" value="${i.id === invoiceId ? U.senToInput(fin.balance(i)) : ''}" aria-label="Amaun untuk ${U.esc(i.invoiceNo)}"></div>`).join('')}`;
          box.insertAdjacentHTML('beforeend', '<div class="total-box" id="allocTot"></div>');
          sum();
        };
        const sum = () => {
          const amt = U.toSen(form.amountSen.value) || 0;
          const al = U.sum(Array.from(box.querySelectorAll('[data-inv]')), x => U.toSen(x.value) || 0);
          const t = box.querySelector('#allocTot');
          if (t) t.innerHTML = `<div><span>Amaun diterima</span><span>${U.formatRM(amt)}</span></div>
            <div><span>Diperuntukkan kepada bil</span><span>${U.formatRM(al)}</span></div>
            <div class="grand"><span>${amt - al >= 0 ? 'Kredit / belum diperuntukkan' : 'Melebihi amaun diterima'}</span>
            <span class="${amt - al < 0 ? 'text-danger' : ''}">${U.formatRM(amt - al)}</span></div>`;
        };
        const auto = () => {
          let left = U.toSen(form.amountSen.value) || 0;
          box.querySelectorAll('[data-inv]').forEach(x => {
            const inv = open.find(i => i.id === x.dataset.inv);
            const take = Math.max(0, Math.min(left, fin.balance(inv)));
            x.value = take ? U.senToInput(take) : '';
            left -= take;
          });
          sum();
        };
        form.studentId.addEventListener('change', draw);
        form.amountSen.addEventListener('input', sum);
        form.amountSen.addEventListener('change', () => {
          const any = Array.from(box.querySelectorAll('[data-inv]')).some(x => x.value);
          if (!any) auto();
        });
        box.addEventListener('input', sum);
        box.addEventListener('click', e => { if (e.target.closest('[data-auto]')) auto(); });
        draw();
        if (invoiceId) {
          const inv = fin.invoices.find(i => i.id === invoiceId);
          if (inv) { form.amountSen.value = U.senToInput(fin.balance(inv)); sum(); }
        }
      },
      async onSubmit(d, form) {
        const amountSen = U.toSen(d.amountSen);
        const allocs = Array.from(form.querySelectorAll('[data-inv]')).map(x => ({ invoiceId: x.dataset.inv, amountSen: U.toSen(x.value || '0') }));
        let allocErr = '';
        allocs.forEach(a => {
          const inv = fin.invoices.find(i => i.id === a.invoiceId);
          if (a.amountSen === null || a.amountSen < 0) allocErr = allocErr || `Amaun untuk ${inv.invoiceNo} tidak sah.`;
          else if (a.amountSen > fin.balance(inv)) allocErr = allocErr || `Amaun untuk ${inv.invoiceNo} melebihi baki ${U.formatRM(fin.balance(inv))}.`;
        });
        const totalAlloc = U.sum(allocs, a => a.amountSen || 0);
        if (!allocErr && amountSen !== null && totalAlloc > amountSen) allocErr = 'Jumlah peruntukan melebihi amaun diterima.';
        if (!showErrors(form, {
          studentId: d.studentId ? '' : 'Pilih pelajar.',
          date: U.isISODate(d.date) ? '' : 'Tarikh bayaran diperlukan.',
          amountSen: amountSen === null || amountSen <= 0 ? 'Masukkan amaun lebih daripada RM0.00.' : '',
          alloc: allocErr
        })) return false;
        const credit = amountSen - totalAlloc;
        if (credit > 0 && !(await confirmDialog({ title: 'Ada baki belum diperuntukkan',
          message: `${U.formatRM(credit)} akan direkod sebagai kredit pelajar. Anda boleh mengagihkannya kepada bil kemudian. Teruskan?`, confirmText: 'Ya, simpan' }))) return false;

        const receiptNo = await Billing.savePayment({ id: payId, studentId: d.studentId, date: d.date, amountSen, method: d.method,
          reference: d.reference || '', notes: d.notes || '' }, allocs.filter(a => a.amountSen > 0));
        toast(`Bayaran direkod. Resit ${receiptNo}.`, 'success');
        location.hash = '#/bayaran/' + payId;
      }
    });
  },

  // Simpan bayaran + peruntukan secara atomik, dengan semakan baki semula
  async savePayment(p, allocs) {
    return DB.transaction(['payments', 'paymentAllocations', 'invoices', 'settings'], 'readwrite', async st => {
      const exists = await DB.req(st.payments.get(p.id));
      if (exists) throw new Error('Bayaran ini sudah direkod (klik berulang disekat).');
      for (const a of allocs) {
        const inv = await DB.req(st.invoices.get(a.invoiceId));
        if (!inv || inv.status === 'batal') throw new Error('Bil tidak sah atau telah dibatalkan.');
        const paid = await Billing.paidInTx(st, a.invoiceId);
        if (a.amountSen > inv.totalSen - paid) throw new Error(`Amaun melebihi baki bil ${inv.invoiceNo}.`);
      }
      const receiptNo = await Billing.newReceiptNo(st, p.date);
      await DB.req(st.payments.add(DB.stamp(Object.assign({}, p, { receiptNo, status: 'sah' }))));
      for (const a of allocs) {
        await DB.req(st.paymentAllocations.add(DB.stamp({ id: `${p.id}|${a.invoiceId}`, paymentId: p.id, invoiceId: a.invoiceId, amountSen: a.amountSen })));
      }
      return receiptNo;
    });
  },

  async paidInTx(st, invoiceId) {
    const al = await DB.req(st.paymentAllocations.index('invoiceId').getAll(invoiceId));
    let paid = 0;
    for (const a of al) {
      const pay = await DB.req(st.payments.get(a.paymentId));
      if (pay && pay.status !== 'batal') paid += a.amountSen;
    }
    return paid;
  },

  /* ---------- Agih kredit kepada bil ---------- */
  async allocateCredit(paymentId) {
    const fin = await Fin.load();
    const p = fin.payments.find(x => x.id === paymentId);
    const credit = fin.unallocated(p);
    const open = fin.validInvoices.filter(i => i.studentId === p.studentId && fin.balance(i) > 0).sort((a, b) => a.date.localeCompare(b.date));
    if (!open.length) { toast('Tiada bil tertunggak untuk pelajar ini.', 'warning'); return; }
    let left = credit;
    formModal({
      title: `Agih kredit ${p.receiptNo}`,
      body: `<div class="note">Kredit tersedia: <b>${U.formatRM(credit)}</b></div>
        <div class="field-error" data-err="alloc"></div>
        ${open.map(i => { const take = Math.max(0, Math.min(left, fin.balance(i))); left -= take;
          return `<div class="alloc-row"><div><span class="strong">${U.esc(i.invoiceNo)}</span><span class="sub">Baki ${U.formatRM(fin.balance(i))}</span></div>
          <input data-inv="${U.esc(i.id)}" inputmode="decimal" value="${take ? U.senToInput(take) : ''}" aria-label="Amaun"></div>`; }).join('')}`,
      submitText: 'Agih',
      async onSubmit(d, form) {
        const allocs = Array.from(form.querySelectorAll('[data-inv]')).map(x => ({ invoiceId: x.dataset.inv, amountSen: U.toSen(x.value || '0') }));
        let err = '';
        allocs.forEach(a => {
          const inv = open.find(i => i.id === a.invoiceId);
          if (a.amountSen === null || a.amountSen < 0) err = err || 'Amaun tidak sah.';
          else if (a.amountSen > fin.balance(inv)) err = err || `Melebihi baki ${inv.invoiceNo}.`;
        });
        if (!err && U.sum(allocs, a => a.amountSen) > credit) err = 'Jumlah melebihi kredit tersedia.';
        if (!err && !allocs.some(a => a.amountSen > 0)) err = 'Masukkan amaun untuk sekurang-kurangnya satu bil.';
        if (!showErrors(form, { alloc: err })) return false;
        await DB.transaction(['payments', 'paymentAllocations', 'invoices'], 'readwrite', async st => {
          const pay = await DB.req(st.payments.get(p.id));
          if (!pay || pay.status === 'batal') throw new Error('Bayaran tidak sah.');
          const all = await DB.req(st.paymentAllocations.index('paymentId').getAll(p.id));
          const availNow = pay.amountSen - U.sum(all, a => a.amountSen);
          if (U.sum(allocs, a => a.amountSen) > availNow) throw new Error('Kredit tidak mencukupi.');
          for (const a of allocs.filter(x => x.amountSen > 0)) {
            const inv = await DB.req(st.invoices.get(a.invoiceId));
            if (a.amountSen > inv.totalSen - await Billing.paidInTx(st, a.invoiceId)) throw new Error(`Melebihi baki ${inv.invoiceNo}.`);
            const id = `${p.id}|${a.invoiceId}`;
            const old = await DB.req(st.paymentAllocations.get(id));
            await DB.req(st.paymentAllocations.put(DB.stamp(Object.assign({}, old || { id, paymentId: p.id, invoiceId: a.invoiceId, amountSen: 0 },
              { amountSen: ((old && old.amountSen) || 0) + a.amountSen }))));
          }
        });
        toast('Kredit diagihkan.', 'success');
        App.refresh();
      }
    });
  },

  async cancelPayment(p) {
    formModal({
      title: `Batalkan bayaran ${p.receiptNo}?`,
      size: 'modal-sm',
      danger: true,
      body: `<p class="confirm-msg" style="margin-bottom:12px">Rekod bayaran tidak dipadam tetapi ditanda "Dibatalkan". Baki bil yang berkaitan akan dikembalikan.</p>
        ${F.text('reason', 'Sebab pembatalan', '', { req: true, max: 160 })}`,
      submitText: 'Batalkan bayaran',
      async onSubmit(d, form) {
        if (!showErrors(form, { reason: d.reason ? '' : 'Nyatakan sebab.' })) return false;
        await DB.put('payments', Object.assign({}, p, { status: 'batal', cancelReason: d.reason, cancelledAt: new Date().toISOString() }));
        toast('Bayaran dibatalkan.', 'success');
        App.refresh();
      }
    });
  },

  /* ---------- Cetakan ---------- */
  async printInvoice(inv) {
    const [items, student, fin] = await Promise.all([DB.getAllByIndex('invoiceItems', 'invoiceId', inv.id), DB.get('students', inv.studentId), Fin.load()]);
    items.sort((a, b) => (a.line || 0) - (b.line || 0));
    const s = student || {};
    await printDoc('BIL / INVOIS', `
      <div class="meta">
        <span>No. bil</span><b>${U.esc(inv.invoiceNo)}</b>
        <span>Tarikh bil</span><span>${U.formatDate(inv.date)}</span>
        <span>Tarikh akhir</span><span>${U.formatDate(inv.dueDate)}</span>
        <span>Pelajar</span><span>${U.esc(s.name || '—')} (${U.esc(inv.studentId)})</span>
        ${s.guardianName ? `<span>Penjaga</span><span>${U.esc(s.guardianName)} ${s.guardianPhone ? '· ' + U.esc(s.guardianPhone) : ''}</span>` : ''}
        <span>Status</span><span>${U.esc(({ selesai: 'Selesai', separa: 'Bayaran separa', 'belum bayar': 'Belum bayar', tertunggak: 'Tertunggak', batal: 'Dibatalkan' })[fin.status(inv)])}</span>
      </div>
      <table><thead><tr><th>#</th><th>Keterangan</th><th class="num">Kuantiti</th><th class="num">Harga seunit</th><th class="num">Amaun</th></tr></thead>
      <tbody>${items.map((it, i) => `<tr><td>${i + 1}</td><td>${U.esc(it.description)}</td><td class="num">${it.qty}</td>
        <td class="num">${U.formatRM(it.unitSen)}</td><td class="num">${U.formatRM(it.amountSen)}</td></tr>`).join('')}</tbody>
      <tfoot>
        <tr><td colspan="4" class="num">Jumlah butiran</td><td class="num">${U.formatRM(inv.subtotalSen)}</td></tr>
        ${inv.discountSen ? `<tr><td colspan="4" class="num">Diskaun</td><td class="num">− ${U.formatRM(inv.discountSen)}</td></tr>` : ''}
        ${inv.extraSen ? `<tr><td colspan="4" class="num">Caj tambahan</td><td class="num">+ ${U.formatRM(inv.extraSen)}</td></tr>` : ''}
        <tr><td colspan="4" class="num"><b>Jumlah bil</b></td><td class="num"><b>${U.formatRM(inv.totalSen)}</b></td></tr>
        <tr><td colspan="4" class="num">Telah dibayar</td><td class="num">${U.formatRM(fin.paid(inv))}</td></tr>
        <tr><td colspan="4" class="num"><b>Baki perlu dibayar</b></td><td class="num"><b>${U.formatRM(fin.balance(inv))}</b></td></tr>
      </tfoot></table>
      ${inv.notes ? `<p class="muted">Catatan: ${U.esc(inv.notes)}</p>` : ''}`);
  },

  async printReceipt(p) {
    const [student, fin] = await Promise.all([DB.get('students', p.studentId), Fin.load()]);
    const allocs = fin.validAlloc.filter(a => a.paymentId === p.id);
    const invMap = U.mapBy(fin.invoices);
    const s = student || {};
    await printDoc(p.status === 'batal' ? 'RESIT (DIBATALKAN)' : 'RESIT RASMI', `
      <div class="meta">
        <span>No. resit</span><b>${U.esc(p.receiptNo)}</b>
        <span>Tarikh</span><span>${U.formatDate(p.date)}</span>
        <span>Diterima daripada</span><span>${U.esc(s.guardianName || s.name || '—')}</span>
        <span>Pelajar</span><span>${U.esc(s.name || '—')} (${U.esc(p.studentId)})</span>
        <span>Kaedah</span><span>${U.esc(Billing.methodLabel(p.method))}${p.reference ? ' · Ruj: ' + U.esc(p.reference) : ''}</span>
      </div>
      <p class="big">Amaun diterima: ${U.formatRM(p.amountSen)}</p>
      ${p.status === 'batal' ? `<p><b>Bayaran ini telah dibatalkan.</b> Sebab: ${U.esc(p.cancelReason || '—')}</p>` : ''}
      ${allocs.length ? `<table><thead><tr><th>Bil</th><th>Tarikh bil</th><th class="num">Amaun dibayar</th><th class="num">Baki bil semasa</th></tr></thead>
        <tbody>${allocs.map(a => { const inv = invMap.get(a.invoiceId) || {};
          return `<tr><td>${U.esc(inv.invoiceNo || a.invoiceId)}</td><td>${U.formatDate(inv.date)}</td>
          <td class="num">${U.formatRM(a.amountSen)}</td><td class="num">${U.formatRM(fin.balance(inv))}</td></tr>`; }).join('')}</tbody></table>` : ''}
      ${fin.unallocated(p) > 0 ? `<p>Baki dikreditkan kepada akaun pelajar: <b>${U.formatRM(fin.unallocated(p))}</b></p>` : ''}
      ${p.notes ? `<p class="muted">Catatan: ${U.esc(p.notes)}</p>` : ''}
      <p>${U.esc((state.profile && state.profile.receiptNote) || '')}</p>
      <div class="sign"><div>Tandatangan penerima</div></div>`);
  }
};

/* ---------------- Paparan Yuran & Bil ---------------- */
const invFilter = { q: '', status: '', month: '' };

App.view('yuran', {
  async render(params) {
    if (params[0]) return InvoiceDetail.render(params[0]);
    const [fin, students] = await Promise.all([Fin.load(), DB.getAll('students')]);
    const stuMap = U.mapBy(students);
    const months = [...new Set(fin.invoices.map(i => i.date.slice(0, 7)))].sort().reverse();
    const out = U.sum(fin.validInvoices, i => Math.max(0, fin.balance(i)));
    const overdue = fin.validInvoices.filter(i => fin.status(i) === 'tertunggak');
    return `${pageHead('Yuran dan Bil', `Jumlah tunggakan ${U.formatRM(out)} · ${overdue.length} bil melepasi tarikh akhir`,
      `<button class="btn btn-outline" data-act="csv">${icon('csv')} CSV</button>
       <button class="btn btn-outline" data-act="gen">${icon('refresh')} Jana bil bulanan</button>
       <button class="btn btn-primary" data-act="new">${icon('plus')} Bil baharu</button>`)}
      <section class="card">
        <div class="toolbar">
          <div class="field grow2"><label for="iq">Cari no. bil / pelajar</label>
            <div class="search-box">${icon('search')}<input id="iq" type="search" value="${U.esc(invFilter.q)}"></div></div>
          <div class="field"><label for="ist">Status</label><select id="ist">${U.options(INV_STATUS_FILTER, invFilter.status, 'Semua')}</select></div>
          <div class="field"><label for="imo">Bulan bil</label><select id="imo">${U.options(months.map(m => [m, U.monthLabel(m)]), invFilter.month, 'Semua')}</select></div>
        </div>
        <div class="result-count" id="iCount"></div>
        <div id="iTable"></div>
      </section>`;
  },
  async after(view, params) {
    if (params[0]) return InvoiceDetail.after(view, params[0]);
    const [fin, students] = await Promise.all([Fin.load(), DB.getAll('students')]);
    const stuMap = U.mapBy(students);
    let rows = [];
    const draw = () => {
      const q = U.norm(invFilter.q);
      rows = fin.invoices.filter(i => {
        const st = fin.status(i);
        if (invFilter.status === 'baki' ? !(fin.balance(i) > 0) : invFilter.status && st !== invFilter.status) return false;
        if (invFilter.month && i.date.slice(0, 7) !== invFilter.month) return false;
        return !q || U.norm(i.invoiceNo).includes(q) || U.norm((stuMap.get(i.studentId) || {}).name).includes(q) || U.norm(i.studentId).includes(q);
      }).sort((a, b) => b.date.localeCompare(a.date) || b.invoiceNo.localeCompare(a.invoiceNo));
      view.querySelector('#iCount').textContent = `${rows.length} bil · jumlah ${U.formatRM(U.sum(rows.filter(i => i.status !== 'batal'), i => i.totalSen))} · baki ${U.formatRM(U.sum(rows, i => Math.max(0, fin.balance(i))))}`;
      view.querySelector('#iTable').innerHTML = !fin.invoices.length
        ? emptyState('yuran', 'Belum ada bil', 'Jana bil bulanan untuk semua pelajar aktif, atau cipta bil secara manual.',
          `<div class="actions center"><button class="btn btn-outline" data-act="gen">Jana bil bulanan</button><button class="btn btn-primary" data-act="new">${icon('plus')} Bil baharu</button></div>`)
        : tableHTML(['No. Bil', 'Pelajar', 'Tarikh', 'Tarikh akhir', ['Jumlah', 'num'], ['Dibayar', 'num'], ['Baki', 'num'], 'Status'],
          rows.map(i => `<tr class="click-row" data-href="#/yuran/${encodeURIComponent(i.id)}">
            <td class="strong">${U.esc(i.invoiceNo)}${i.kind === 'bulanan' ? `<span class="sub">${U.esc(U.monthLabel(i.periodKey))}</span>` : ''}</td>
            <td>${U.esc((stuMap.get(i.studentId) || {}).name || i.studentId)}</td>
            <td>${U.formatDate(i.date)}</td><td>${U.formatDate(i.dueDate)}</td>
            <td class="num">${U.formatRM(i.totalSen)}</td><td class="num">${U.formatRM(fin.paid(i))}</td>
            <td class="num strong">${U.formatRM(fin.balance(i))}</td><td>${Fin.statusBadge(fin.status(i))}</td></tr>`),
          emptyState('search', 'Tiada padanan', 'Cuba ubah carian atau penapis.'));
    };
    draw();
    const on = (sel, key) => view.querySelector(sel).addEventListener('input', e => { invFilter[key] = e.target.value; draw(); });
    on('#iq', 'q'); on('#ist', 'status'); on('#imo', 'month');
    view.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'new') Billing.invoiceForm();
      if (b.dataset.act === 'gen') Billing.monthlyForm();
      if (b.dataset.act === 'csv') exportCSV(`bil-${U.todayISO()}.csv`, [
        ['No. Bil', 'ID Pelajar', 'Pelajar', 'Tarikh', 'Tarikh Akhir', 'Jenis', 'Jumlah Butiran', 'Diskaun', 'Caj Tambahan', 'Jumlah', 'Dibayar', 'Baki', 'Status'],
        ...rows.map(i => [i.invoiceNo, i.studentId, (stuMap.get(i.studentId) || {}).name, U.formatDate(i.date), U.formatDate(i.dueDate),
          i.kind, senCSV(i.subtotalSen), senCSV(i.discountSen || 0), senCSV(i.extraSen || 0), senCSV(i.totalSen),
          senCSV(fin.paid(i)), senCSV(fin.balance(i)), fin.status(i)])]);
    });
  }
});

const InvoiceDetail = {
  async render(id) {
    const inv = await DB.get('invoices', id);
    if (!inv) return `<div class="card">${emptyState('alert', 'Bil tidak dijumpai', '', '<a class="btn btn-outline" href="#/yuran">Kembali</a>')}</div>`;
    const [items, student, fin] = await Promise.all([DB.getAllByIndex('invoiceItems', 'invoiceId', id), DB.get('students', inv.studentId), Fin.load()]);
    items.sort((a, b) => (a.line || 0) - (b.line || 0));
    const allocs = fin.allocations.filter(a => a.invoiceId === id);
    const payMap = U.mapBy(fin.payments);
    const paid = fin.paid(inv);
    const st = fin.status(inv);
    return `<div class="page-head no-print"><div><a href="#/yuran" class="btn btn-ghost">${icon('back')} Senarai bil</a></div>
      <div class="actions">
        <button class="btn btn-outline" data-act="print">${icon('print')} Cetak bil</button>
        ${st !== 'batal' && paid === 0 ? `<button class="btn btn-outline" data-act="edit">${icon('edit')} Edit</button>
          <button class="btn btn-outline" data-act="cancel">${icon('ban')} Batalkan</button>` : ''}
        ${st !== 'batal' && fin.balance(inv) > 0 ? `<button class="btn btn-primary" data-act="pay">${icon('bayaran')} Rekod bayaran</button>` : ''}
      </div></div>
      <section class="card">
        <div class="detail-head"><div class="avatar">${icon('yuran')}</div>
          <div class="grow"><h3>${U.esc(inv.invoiceNo)}</h3>
            <div class="muted small"><a href="#/pelajar/${encodeURIComponent(inv.studentId)}/bil">${U.esc((student || {}).name || inv.studentId)}</a> · Tarikh ${U.formatDate(inv.date)} · Akhir ${U.formatDate(inv.dueDate)}
              ${inv.kind === 'bulanan' ? ' · Bil bulanan ' + U.esc(U.monthLabel(inv.periodKey)) : ''}</div>
            <div style="margin-top:4px">${Fin.statusBadge(st)}</div></div></div>
        <div class="mini-stats">
          <div class="mini-stat"><span>Jumlah bil</span><strong>${U.formatRM(inv.totalSen)}</strong></div>
          <div class="mini-stat"><span>Telah dibayar</span><strong class="text-success">${U.formatRM(paid)}</strong></div>
          <div class="mini-stat"><span>Baki</span><strong class="${fin.balance(inv) > 0 ? 'text-danger' : ''}">${U.formatRM(fin.balance(inv))}</strong></div>
        </div>
        ${tableHTML(['#', 'Keterangan', ['Kuantiti', 'num'], ['Harga seunit', 'num'], ['Amaun', 'num']],
          items.map((it, i) => `<tr><td>${i + 1}</td><td class="wrap">${U.esc(it.description)}</td><td class="num">${it.qty}</td>
            <td class="num">${U.formatRM(it.unitSen)}</td><td class="num">${U.formatRM(it.amountSen)}</td></tr>`)
            .concat([`<tr><td></td><td colspan="3" class="right">Jumlah butiran</td><td class="num">${U.formatRM(inv.subtotalSen)}</td></tr>`,
              `<tr><td></td><td colspan="3" class="right">Diskaun</td><td class="num">− ${U.formatRM(inv.discountSen || 0)}</td></tr>`,
              `<tr><td></td><td colspan="3" class="right">Caj tambahan</td><td class="num">+ ${U.formatRM(inv.extraSen || 0)}</td></tr>`,
              `<tr><td></td><td colspan="3" class="right strong">Jumlah bil</td><td class="num strong">${U.formatRM(inv.totalSen)}</td></tr>`]))}
        ${inv.notes ? `<div class="card-body small"><b>Catatan:</b> ${U.esc(inv.notes)}</div>` : ''}
      </section>
      <section class="card" style="margin-top:20px"><div class="card-head"><h3>${icon('bayaran')} Bayaran untuk bil ini</h3></div>
        ${tableHTML(['No. Resit', 'Tarikh', 'Kaedah', ['Amaun diperuntukkan', 'num'], 'Status'],
          allocs.map(a => { const p = payMap.get(a.paymentId) || {};
            return `<tr class="click-row" data-href="#/bayaran/${encodeURIComponent(a.paymentId)}"><td class="strong">${U.esc(p.receiptNo || '—')}</td>
            <td>${U.formatDate(p.date)}</td><td>${U.esc(Billing.methodLabel(p.method))}</td><td class="num">${U.formatRM(a.amountSen)}</td>
            <td>${p.status === 'batal' ? badge('Dibatalkan') : badge('Sah', 'success')}</td></tr>`; }),
          emptyState('bayaran', 'Belum ada bayaran', ''))}
      </section>`;
  },
  async after(view, id) {
    const inv = await DB.get('invoices', id);
    if (!inv) return;
    view.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'print') Billing.printInvoice(inv);
      if (b.dataset.act === 'edit') Billing.invoiceForm(inv);
      if (b.dataset.act === 'pay') Billing.paymentForm(inv.studentId, inv.id);
      if (b.dataset.act === 'cancel') {
        const fin = await Fin.load();
        if (fin.paid(inv) > 0) { toast('Bil yang sudah dibayar tidak boleh dibatalkan.', 'error'); return; }
        if (await confirmDialog({ title: 'Batalkan bil?', message: `Bil ${inv.invoiceNo} akan ditanda "Dibatalkan" dan tidak lagi dikira dalam tunggakan. Rekod tidak dipadam.`, confirmText: 'Batalkan bil', danger: true })) {
          await DB.transaction(['invoices', 'paymentAllocations'], 'readwrite', async st => {
            const al = await DB.req(st.paymentAllocations.index('invoiceId').getAll(inv.id));
            if (al.length) throw new Error('Bil ini mempunyai rekod bayaran.');
            await DB.req(st.invoices.put(DB.stamp(Object.assign({}, inv, { status: 'batal', cancelledAt: new Date().toISOString() }))));
          });
          toast('Bil dibatalkan.', 'success'); App.refresh();
        }
      }
    });
  }
};

/* ---------------- Paparan Bayaran & Resit ---------------- */
const payFilter = { q: '', method: '', month: '' };

App.view('bayaran', {
  async render(params) {
    if (params[0]) return PaymentDetail.render(params[0]);
    const fin = await Fin.load();
    const months = [...new Set(fin.payments.map(p => p.date.slice(0, 7)))].sort().reverse();
    const thisMonth = U.todayISO().slice(0, 7);
    return `${pageHead('Bayaran dan Resit', `Kutipan ${U.monthLabel(thisMonth)}: ${U.formatRM(U.sum(fin.validPayments.filter(p => p.date.startsWith(thisMonth)), p => p.amountSen))}`,
      `<button class="btn btn-outline" data-act="csv">${icon('csv')} CSV</button>
       <button class="btn btn-primary" data-act="new">${icon('plus')} Rekod bayaran</button>`)}
      <section class="card">
        <div class="toolbar">
          <div class="field grow2"><label for="pq">Cari no. resit / pelajar / rujukan</label>
            <div class="search-box">${icon('search')}<input id="pq" type="search" value="${U.esc(payFilter.q)}"></div></div>
          <div class="field"><label for="pm">Kaedah</label><select id="pm">${U.options(PAY_METHODS, payFilter.method, 'Semua')}</select></div>
          <div class="field"><label for="pmo">Bulan</label><select id="pmo">${U.options(months.map(m => [m, U.monthLabel(m)]), payFilter.month, 'Semua')}</select></div>
        </div>
        <div class="result-count" id="pCount"></div>
        <div id="pTable"></div>
      </section>`;
  },
  async after(view, params) {
    if (params[0]) return PaymentDetail.after(view, params[0]);
    const [fin, students] = await Promise.all([Fin.load(), DB.getAll('students')]);
    const stuMap = U.mapBy(students);
    let rows = [];
    const draw = () => {
      const q = U.norm(payFilter.q);
      rows = fin.payments.filter(p => (!payFilter.method || p.method === payFilter.method) &&
        (!payFilter.month || p.date.startsWith(payFilter.month)) &&
        (!q || U.norm(p.receiptNo).includes(q) || U.norm(p.reference).includes(q) || U.norm((stuMap.get(p.studentId) || {}).name).includes(q) || U.norm(p.studentId).includes(q)))
        .sort((a, b) => b.date.localeCompare(a.date) || b.receiptNo.localeCompare(a.receiptNo));
      view.querySelector('#pCount').textContent = `${rows.length} bayaran · jumlah sah ${U.formatRM(U.sum(rows.filter(p => p.status !== 'batal'), p => p.amountSen))}`;
      view.querySelector('#pTable').innerHTML = !fin.payments.length
        ? emptyState('bayaran', 'Belum ada bayaran', 'Rekod bayaran tunai, pindahan bank atau DuitNow. Resit dijana secara automatik.',
          `<button class="btn btn-primary" data-act="new">${icon('plus')} Rekod bayaran</button>`)
        : tableHTML(['No. Resit', 'Tarikh', 'Pelajar', 'Kaedah', ['Amaun', 'num'], ['Kredit', 'num'], 'Status'],
          rows.map(p => `<tr class="click-row" data-href="#/bayaran/${encodeURIComponent(p.id)}">
            <td class="strong">${U.esc(p.receiptNo)}</td><td>${U.formatDate(p.date)}</td>
            <td>${U.esc((stuMap.get(p.studentId) || {}).name || p.studentId)}</td>
            <td>${U.esc(Billing.methodLabel(p.method))}${p.reference ? `<span class="sub">${U.esc(p.reference)}</span>` : ''}</td>
            <td class="num">${U.formatRM(p.amountSen)}</td><td class="num">${U.formatRM(fin.unallocated(p))}</td>
            <td>${p.status === 'batal' ? badge('Dibatalkan') : badge('Sah', 'success')}</td></tr>`),
          emptyState('search', 'Tiada padanan', ''));
    };
    draw();
    const on = (sel, key) => view.querySelector(sel).addEventListener('input', e => { payFilter[key] = e.target.value; draw(); });
    on('#pq', 'q'); on('#pm', 'method'); on('#pmo', 'month');
    view.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'new') Billing.paymentForm();
      if (b.dataset.act === 'csv') exportCSV(`bayaran-${U.todayISO()}.csv`, [
        ['No. Resit', 'Tarikh', 'ID Pelajar', 'Pelajar', 'Kaedah', 'Rujukan', 'Amaun', 'Belum Diperuntukkan', 'Status', 'Catatan'],
        ...rows.map(p => [p.receiptNo, U.formatDate(p.date), p.studentId, (stuMap.get(p.studentId) || {}).name, Billing.methodLabel(p.method),
          p.reference, senCSV(p.amountSen), senCSV(fin.unallocated(p)), p.status, p.notes])]);
    });
  }
});

const PaymentDetail = {
  async render(id) {
    const fin = await Fin.load();
    const p = fin.payments.find(x => x.id === id);
    if (!p) return `<div class="card">${emptyState('alert', 'Bayaran tidak dijumpai', '', '<a class="btn btn-outline" href="#/bayaran">Kembali</a>')}</div>`;
    const student = await DB.get('students', p.studentId);
    const invMap = U.mapBy(fin.invoices);
    const allocs = fin.allocations.filter(a => a.paymentId === id);
    const credit = fin.unallocated(p);
    return `<div class="page-head no-print"><div><a href="#/bayaran" class="btn btn-ghost">${icon('back')} Senarai bayaran</a></div>
      <div class="actions">
        <button class="btn btn-primary" data-act="print">${icon('print')} Cetak resit</button>
        ${p.status !== 'batal' && credit > 0 ? `<button class="btn btn-outline" data-act="alloc">Agih kredit</button>` : ''}
        ${p.status !== 'batal' ? `<button class="btn btn-outline" data-act="cancel">${icon('ban')} Batalkan</button>` : ''}
      </div></div>
      <section class="card">
        <div class="detail-head"><div class="avatar">${icon('bayaran')}</div>
          <div class="grow"><h3>Resit ${U.esc(p.receiptNo)}</h3>
            <div class="muted small"><a href="#/pelajar/${encodeURIComponent(p.studentId)}/bayaran">${U.esc((student || {}).name || p.studentId)}</a> · ${U.formatDate(p.date)} · ${U.esc(Billing.methodLabel(p.method))}${p.reference ? ' · Ruj: ' + U.esc(p.reference) : ''}</div>
            <div style="margin-top:4px">${p.status === 'batal' ? badge('Dibatalkan', 'danger') : badge('Sah', 'success')}</div></div></div>
        <div class="mini-stats">
          <div class="mini-stat"><span>Amaun diterima</span><strong>${U.formatRM(p.amountSen)}</strong></div>
          <div class="mini-stat"><span>Diperuntukkan</span><strong>${U.formatRM(p.status === 'batal' ? 0 : p.amountSen - credit)}</strong></div>
          <div class="mini-stat"><span>Kredit belum diperuntukkan</span><strong class="${credit > 0 ? 'text-success' : ''}">${U.formatRM(credit)}</strong></div>
        </div>
        ${p.status === 'batal' ? `<div class="card-body"><div class="note danger">Dibatalkan pada ${U.formatDateTime(p.cancelledAt)}. Sebab: ${U.esc(p.cancelReason || '—')}</div></div>` : ''}
        ${p.notes ? `<div class="card-body small"><b>Catatan:</b> ${U.esc(p.notes)}</div>` : ''}
        ${tableHTML(['Bil', 'Tarikh bil', ['Amaun diperuntukkan', 'num'], ['Baki bil semasa', 'num'], 'Status bil'],
          allocs.map(a => { const inv = invMap.get(a.invoiceId) || {};
            return `<tr class="click-row" data-href="#/yuran/${encodeURIComponent(a.invoiceId)}"><td class="strong">${U.esc(inv.invoiceNo || '—')}</td>
            <td>${U.formatDate(inv.date)}</td><td class="num">${U.formatRM(a.amountSen)}</td><td class="num">${U.formatRM(fin.balance(inv))}</td>
            <td>${Fin.statusBadge(fin.status(inv))}</td></tr>`; }),
          emptyState('yuran', 'Tiada peruntukan', 'Keseluruhan bayaran ini direkod sebagai kredit.'))}
      </section>`;
  },
  async after(view, id) {
    const p = await DB.get('payments', id);
    if (!p) return;
    view.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'print') Billing.printReceipt(p);
      if (b.dataset.act === 'alloc') Billing.allocateCredit(p.id);
      if (b.dataset.act === 'cancel') Billing.cancelPayment(p);
    });
  }
};
