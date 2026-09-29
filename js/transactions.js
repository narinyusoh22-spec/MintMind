let tx = [], uid, editingId = null;
const el = id => document.getElementById(id);
const toast = (message, color = 'success') => {
  const item = document.createElement('div');
  item.className = `toast text-bg-${color} border-0`;
  item.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  el('toasts').append(item);
  new bootstrap.Toast(item).show();
};
const visible = () => tx.filter(item =>
  (!el('filterType').value || item.type === el('filterType').value) &&
  (!el('filterMonth').value || String(item.date).startsWith(el('filterMonth').value)) &&
  (`${item.description} ${item.category}`).toLowerCase().includes(el('searchInput').value.toLowerCase())
);
const categoryStyle = category => {
  const value = String(category || '').toLowerCase();
  if (/อาหาร|กาแฟ|ร้าน/.test(value)) return { icon: 'bi-cup-hot-fill', color: 'food' };
  if (/เดินทาง|รถ|น้ำมัน|ขนส่ง/.test(value)) return { icon: 'bi-bus-front-fill', color: 'travel' };
  if (/ช้อป|ซื้อ|สินค้า/.test(value)) return { icon: 'bi-bag-fill', color: 'shop' };
  if (/บิล|บ้าน|ที่อยู่|ไฟฟ้า|น้ำประปา/.test(value)) return { icon: 'bi-house-fill', color: 'home' };
  if (/สุขภาพ|ยา|หมอ/.test(value)) return { icon: 'bi-heart-pulse-fill', color: 'health' };
  if (/บันเทิง|เกม|หนัง/.test(value)) return { icon: 'bi-controller', color: 'fun' };
  if (/เงินเดือน|รายรับ|โบนัส/.test(value)) return { icon: 'bi-cash-coin', color: 'income' };
  if (/ศึกษา|เรียน|หนังสือ/.test(value)) return { icon: 'bi-book-half', color: 'learn' };
  return { icon: 'bi-three-dots', color: 'other' };
};
const dateLabel = date => {
  const value = new Date(`${date}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (value.getTime() === today.getTime()) return 'วันนี้';
  if (value.getTime() === yesterday.getTime()) return 'เมื่อวาน';
  return value.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
const render = () => {
  const entries = visible();
  const groups = new Map();
  entries.forEach(item => {
    const date = String(item.date).slice(0, 10);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(item);
  });
  const rows = [];
  groups.forEach((items, date) => {
    const expenses = items.filter(item => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
    const income = items.filter(item => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
    rows.push(`<tr class="tx-date-group"><th colspan="5"><div class="tx-date-heading"><span><i class="bi bi-calendar3"></i>${dateLabel(date)}</span><small>${items.length} รายการ${expenses ? ` · <b class="tx-day-expense">−${money(expenses)}</b>` : ''}${income ? ` · <b class="tx-day-income">+${money(income)}</b>` : ''}</small></div></th></tr>`);
    items.forEach(item => {
      const category = categoryStyle(item.category);
      const isIncome = item.type === 'income';
      const iconCategory = isIncome ? 'income' : category.color;
      const iconAsset = iconCategory === 'health' ? 'health.svg' : `${iconCategory}.jpg`;
      rows.push(`<tr class="tx-entry ${isIncome ? 'is-income' : 'is-expense'}"><td><div class="tx-main"><span class="tx-category-icon ${iconCategory}"><img class="tx-category-art" src="assets/categories/${iconAsset}" alt="" aria-hidden="true" loading="lazy" decoding="async"></span><div class="tx-copy"><strong class="tx-description">${escapeHtml(item.description)}</strong><div class="tx-meta"><span class="tx-category-tag ${isIncome ? 'income' : category.color}"><i class="bi ${isIncome ? 'bi-cash-coin' : category.icon}"></i>${escapeHtml(item.category)}</span><span class="tx-type-label">${isIncome ? 'รายรับ' : 'รายจ่าย'}</span>${item.receipt_url ? `<button class="tx-receipt" data-action="receipt" data-path="${escapeHtml(item.receipt_url)}" title="ดูสลิป" aria-label="ดูสลิป"><i class="bi bi-paperclip"></i></button>` : ''}</div></div></div></td><td class="tx-legacy-cell">${escapeHtml(item.category)}</td><td class="tx-legacy-cell">${escapeHtml(item.date)}</td><td class="text-end"><strong class="tx-amount ${isIncome ? 'income' : 'expense'}">${isIncome ? '+' : '−'}${money(item.amount)}</strong></td><td class="text-nowrap text-end"><button class="btn btn-sm tx-action edit" data-action="edit" data-id="${escapeHtml(item.id)}" title="แก้ไข" aria-label="แก้ไข"><i class="bi bi-pencil"></i></button><button class="btn btn-sm tx-action delete" data-action="delete" data-id="${escapeHtml(item.id)}" title="ลบ" aria-label="ลบ"><i class="bi bi-trash"></i></button></td></tr>`);
    });
  });
  el('rows').innerHTML = rows.join('') || '<tr><td colspan="5" class="text-center empty py-5"><i class="bi bi-search d-block fs-3 mb-2"></i>ไม่พบรายการ ลองเปลี่ยนคำค้นหาหรือตัวกรอง</td></tr>';
};
[el('searchInput'), el('filterType'), el('filterMonth')].forEach(input => input.oninput = render);
const submitBtn = el('transactionForm').querySelector('.btn-success');
const resetForm = () => {
  editingId = null;
  el('transactionForm').reset();
  el('category').value = 'อาหาร';
  el('transactionDate').valueAsDate = new Date();
  submitBtn.textContent = 'บันทึกรายการ';
  el('cancelEdit')?.remove();
};
const uploadReceipt = async () => {
  const file = el('receiptFile').files[0];
  if (!file) return null;
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('สลิปต้องเป็น JPG, PNG, WEBP หรือ PDF ขนาดไม่เกิน 5 MB');
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from('receipts').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
};
el('rows').onclick = async event => {
  const button = event.target.closest('button'), action = button?.dataset.action;
  if (!action) return;
  if (action === 'receipt') {
    const path = button.dataset.path;
    if (path.startsWith('http')) return toast('สลิปเก่าต้องอัปโหลดใหม่เพื่อเปิดแบบ private', 'warning');
    const { data, error } = await db.storage.from('receipts').createSignedUrl(path, 300);
    if (error) return toast(error.message, 'danger');
    window.open(data.signedUrl, '_blank');
    return;
  }
  const id = button.dataset.id, record = tx.find(item => item.id === id);
  if (action === 'delete') {
    const { error } = await db.from('transactions').delete().eq('id', id);
    if (error) return toast(error.message, 'danger');
    tx = tx.filter(item => item.id !== id); render(); toast('ลบรายการแล้ว'); return;
  }
  editingId = id;
  el('type').value = record.type; el('description').value = record.description; el('amount').value = record.amount;
  el('category').value = record.category; el('transactionDate').value = record.date;
  submitBtn.textContent = 'อัปเดตรายการ';
  if (!el('cancelEdit')) {
    const cancel = document.createElement('button'); cancel.id = 'cancelEdit'; cancel.type = 'button';
    cancel.className = 'btn btn-outline-secondary w-100 mt-2'; cancel.textContent = 'ยกเลิกการแก้ไข';
    cancel.onclick = resetForm; submitBtn.after(cancel);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
el('transactionForm').onsubmit = async event => {
  event.preventDefault(); submitBtn.disabled = true;
  try {
    const original = tx.find(item => item.id === editingId), newReceipt = await uploadReceipt();
    const payload = { type: el('type').value, description: el('description').value, amount: +el('amount').value, category: el('category').value, date: el('transactionDate').value, receipt_url: newReceipt || original?.receipt_url || null };
    let data, error;
    if (editingId) ({ data, error } = await db.from('transactions').update(payload).eq('id', editingId).select().single());
    else ({ data, error } = await db.from('transactions').insert({ ...payload, user_id: uid }).select().single());
    if (error) throw error;
    if (editingId) tx = tx.map(item => item.id === data.id ? data : item); else tx.unshift(data);
    render(); toast(editingId ? 'อัปเดตรายการแล้ว' : 'บันทึกรายการแล้ว'); resetForm();
  } catch (error) { toast(error.message || 'บันทึกรายการไม่สำเร็จ', 'danger'); }
  finally { submitBtn.disabled = false; }
};
el('clearTx').onclick = async () => {
  if (!confirm('ลบรายการทั้งหมดหรือไม่?')) return;
  const { error } = await db.from('transactions').delete().eq('user_id', uid);
  if (error) return toast(error.message, 'danger');
  tx = []; render(); toast('ลบรายการทั้งหมดแล้ว');
};
el('exportCsv').onclick = () => {
  const data = visible(), csv = ['ประเภท,รายละเอียด,หมวดหมู่,วันที่,จำนวนเงิน', ...data.map(item => [item.type, item.description, item.category, item.date, item.amount].map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n');
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); link.download = 'mintmind-transactions.csv'; link.click(); URL.revokeObjectURL(link.href);
};
el('printPdf').onclick = () => window.print();
el('logoutBtn').onclick = signOut;
(async () => {
  setupTheme(); const user = await requireUser(); if (!user) return; uid = user.id; resetForm();
  const { data, error } = await db.from('transactions').select('*').order('date', { ascending: false });
  if (error) return toast('กรุณารัน supabase-schema.sql ก่อน', 'danger');
  tx = data || []; render();
})();
