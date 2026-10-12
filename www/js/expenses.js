/* =========================================================
   Tuisyen Smart - js/expenses.js
   Fasa 6: Perbelanjaan dan kategori
   ========================================================= */
'use strict';

const expFilter = { q: '', month: '', category: '' };

const Expenses = {
  async form(existing) {
    const cats = (await Settings.get('expenseCategories')).list;
    const e = existing || { date: U.todayISO(), method: 'tunai' };
    const catList = cats.includes(e.category) || !e.category ? cats : cats.concat([e.category]);
    formModal({
      title: existing ? 'Kemas kini perbelanjaan' : 'Tambah perbelanjaan',
      body: `<div class="form-grid">
        ${F.date('date', 'Tarikh', e.date, { req: true })}
        ${F.select('category', 'Kategori', catList, e.category, { req: true, placeholder: '— Pilih kategori —' })}
        ${F.text('description', 'Keterangan', e.description, { req: true, max: 120, cls: 'span-2' })}
        ${F.money('amountSen', 'Amaun (RM)', Number.isFinite(e.amountSen) ? e.amountSen : null, { req: true })}
        ${F.select('method', 'Kaedah pembayaran', PAY_METHODS, e.method)}
        ${F.text('reference', 'No. rujukan', e.reference, { max: 60 })}
        ${F.textarea('notes', 'Catatan', e.notes, { cls: 'span-2' })}
      </div>`,
      async onSubmit(d, form) {
        const amountSen = U.toSen(d.amountSen);
        if (!showErrors(form, {
          date: U.isISODate(d.date) ? '' : 'Tarikh diperlukan.',
          category: d.category ? '' : 'Pilih kategori.',
          description: d.description ? '' : 'Keterangan diperlukan.',
          amountSen: amountSen === null || amountSen <= 0 ? 'Masukkan amaun lebih daripada RM0.00.' : ''
        })) return false;
        await DB.put('expenses', Object.assign({}, existing || {}, { id: (existing && existing.id) || DB.genId('EXP'),
          date: d.date, category: d.category, description: d.description, amountSen, method: d.method,
          reference: d.reference || '', notes: d.notes || '' }));
        toast('Perbelanjaan disimpan.', 'success');
        App.refresh();
      }
    });
  },

  async categoriesForm() {
    const cats = (await Settings.get('expenseCategories')).list;
    const expenses = await DB.getAll('expenses');
    formModal({
      title: 'Urus kategori perbelanjaan',
      body: `<p class="small muted mt0">Satu kategori setiap baris. Menukar nama di sini tidak mengubah rekod lama; gunakan pilihan "kemas kini rekod" di bawah jika perlu.</p>
        ${F.textarea('list', 'Kategori', cats.join('\n'), { rows: 9 })}
        <label class="check"><input type="checkbox" name="renameOld"> Kemas kini rekod lama apabila nama kategori ditukar (mengikut kedudukan baris)</label>`,
      async onSubmit(d, form) {
        const list = [...new Set(d.list.split('\n').map(x => x.trim()).filter(Boolean))];
        if (!showErrors(form, { list: list.length ? '' : 'Sekurang-kurangnya satu kategori diperlukan.' })) return false;
        const renames = [];
        if (d.renameOld) cats.forEach((old, i) => { if (list[i] && list[i] !== old) renames.push([old, list[i]]); });
        await DB.transaction(['settings', 'expenses'], 'readwrite', async st => {
          const cur = (await DB.req(st.settings.get('expenseCategories'))) || { id: 'expenseCategories' };
          await DB.req(st.settings.put(DB.stamp(Object.assign({}, cur, { list }))));
          for (const [from, to] of renames) {
            for (const ex of expenses.filter(x => x.category === from)) await DB.req(st.expenses.put(DB.stamp(Object.assign({}, ex, { category: to }))));
          }
        });
        toast('Kategori dikemas kini.', 'success');
        App.refresh();
      }
    });
  }
};

App.view('perbelanjaan', {
  async render() {
    const expenses = await DB.getAll('expenses');
    const cats = (await Settings.get('expenseCategories')).list;
    const allCats = [...new Set(cats.concat(expenses.map(e => e.category)))];
    const months = [...new Set(expenses.map(e => e.date.slice(0, 7)).concat([U.todayISO().slice(0, 7)]))].sort().reverse();
    const thisMonth = U.todayISO().slice(0, 7);
    return `${pageHead('Perbelanjaan', `Perbelanjaan ${U.monthLabel(thisMonth)}: ${U.formatRM(U.sum(expenses.filter(e => e.date.startsWith(thisMonth)), e => e.amountSen))}`,
      `<button class="btn btn-outline" data-act="cats">${icon('tetapan')} Kategori</button>
       <button class="btn btn-outline" data-act="csv">${icon('csv')} CSV</button>
       <button class="btn btn-primary" data-act="add">${icon('plus')} Tambah</button>`)}
      <section class="card">
        <div class="toolbar">
          <div class="field grow2"><label for="eq">Cari keterangan / rujukan</label>
            <div class="search-box">${icon('search')}<input id="eq" type="search" value="${U.esc(expFilter.q)}"></div></div>
          <div class="field"><label for="emo">Bulan</label><select id="emo">${U.options(months.map(m => [m, U.monthLabel(m)]), expFilter.month, 'Semua')}</select></div>
          <div class="field"><label for="eca">Kategori</label><select id="eca">${U.options(allCats, expFilter.category, 'Semua')}</select></div>
        </div>
        <div class="result-count" id="eCount"></div>
        <div id="eTable"></div>
      </section>
      <section class="card" style="margin-top:20px"><div class="card-head"><h3>${icon('prestasi')} Mengikut kategori</h3><span class="card-note" id="catNote"></span></div>
        <div id="eCats"></div></section>`;
  },
  async after(view) {
    const expenses = await DB.getAll('expenses');
    let rows = [];
    const draw = () => {
      const q = U.norm(expFilter.q);
      rows = expenses.filter(e => (!expFilter.month || e.date.startsWith(expFilter.month)) &&
        (!expFilter.category || e.category === expFilter.category) &&
        (!q || U.norm(e.description).includes(q) || U.norm(e.reference).includes(q) || U.norm(e.notes).includes(q)))
        .sort((a, b) => b.date.localeCompare(a.date));
      view.querySelector('#eCount').textContent = `${rows.length} rekod · jumlah ${U.formatRM(U.sum(rows, e => e.amountSen))}`;
      view.querySelector('#eTable').innerHTML = !expenses.length
        ? emptyState('perbelanjaan', 'Belum ada perbelanjaan', 'Rekod kos seperti sewa, alat tulis dan bahan rujukan untuk melihat untung bersih.',
          `<button class="btn btn-primary" data-act="add">${icon('plus')} Tambah perbelanjaan</button>`)
        : tableHTML(['Tarikh', 'Kategori', 'Keterangan', 'Kaedah', ['Amaun', 'num'], ''],
          rows.map(e => `<tr><td>${U.formatDate(e.date)}</td><td>${U.esc(e.category)}</td>
            <td class="wrap">${U.esc(e.description)}${e.reference ? `<span class="sub">Ruj: ${U.esc(e.reference)}</span>` : ''}</td>
            <td>${U.esc(Billing.methodLabel(e.method))}</td><td class="num">${U.formatRM(e.amountSen)}</td>
            <td class="actions-cell"><button class="btn btn-sm btn-outline" data-edit="${e.id}">${icon('edit')}</button>
              <button class="btn btn-sm btn-outline" data-del="${e.id}" aria-label="Padam">${icon('trash')}</button></td></tr>`),
          emptyState('search', 'Tiada padanan', ''));
      const byCat = U.groupBy(rows, e => e.category);
      const total = U.sum(rows, e => e.amountSen);
      view.querySelector('#catNote').textContent = expFilter.month ? U.monthLabel(expFilter.month) : 'Semua bulan';
      view.querySelector('#eCats').innerHTML = tableHTML(['Kategori', ['Bil. rekod', 'num'], ['Jumlah', 'num'], ['Peratus', 'num']],
        [...byCat.entries()].sort((a, b) => U.sum(b[1], e => e.amountSen) - U.sum(a[1], e => e.amountSen)).map(([c, list]) => {
          const t = U.sum(list, e => e.amountSen);
          return `<tr><td>${U.esc(c)}</td><td class="num">${list.length}</td><td class="num">${U.formatRM(t)}</td><td class="num">${U.pct(total ? t / total * 100 : 0)}</td></tr>`;
        }), emptyState('perbelanjaan', 'Tiada data', ''));
    };
    draw();
    const on = (sel, key) => view.querySelector(sel).addEventListener('input', e => { expFilter[key] = e.target.value; draw(); });
    on('#eq', 'q'); on('#emo', 'month'); on('#eca', 'category');
    view.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'add') Expenses.form();
      if (b.dataset.act === 'cats') Expenses.categoriesForm();
      if (b.dataset.edit) Expenses.form(expenses.find(x => x.id === b.dataset.edit));
      if (b.dataset.del) {
        const ex = expenses.find(x => x.id === b.dataset.del);
        if (await confirmDialog({ title: 'Padam perbelanjaan?', message: `${ex.description} (${U.formatRM(ex.amountSen)}) akan dipadam.`, confirmText: 'Padam', danger: true })) {
          await DB.remove('expenses', ex.id); toast('Perbelanjaan dipadam.', 'success'); App.refresh();
        }
      }
      if (b.dataset.act === 'csv') exportCSV(`perbelanjaan-${U.todayISO()}.csv`, [
        ['Tarikh', 'Kategori', 'Keterangan', 'Kaedah', 'Rujukan', 'Amaun', 'Catatan'],
        ...rows.map(x => [U.formatDate(x.date), x.category, x.description, Billing.methodLabel(x.method), x.reference, senCSV(x.amountSen), x.notes])]);
    });
  }
});
