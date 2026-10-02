let liabilityUserId = null;
let liabilities = [];
let editingLiabilityId = null;
const liabilityEl = id => document.getElementById(id);
const debtNumber = value => Number(value || 0);
const debtToast = (message, color = 'success') => {
  const item = document.createElement('div');
  item.className = `toast text-bg-${color} border-0`;
  item.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="ปิด"></button></div>`;
  liabilityEl('toasts').append(item);
  new bootstrap.Toast(item).show();
};
const ensureNextDueCard = () => {
  const grid = document.querySelector('main .row.g-3.mb-4');
  if (!grid || liabilityEl('nextDebtDue')) return;
  grid.classList.add('debt-summary-grid');
  [...grid.children].forEach(column => { column.classList.remove('col-md-6'); column.classList.add('col-6','col-md-4'); });
  const column = document.createElement('div');
  column.className = 'col-12 col-md-4';
  column.innerHTML = '<section class="card p-3 debt-metric debt-metric-next"><small>กำหนดชำระถัดไป</small><strong id="nextDebtDue">—</strong><span id="nextDebtDueNote" class="debt-metric-note">ยังไม่มีวันกำหนด</span></section>';
  grid.append(column);
};
const nextDueInfo = () => {
  const dated = liabilities.filter(item => item.due_date).sort((a, b) => a.due_date.localeCompare(b.due_date));
  if (!dated.length) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const target = dated.find(item => new Date(`${item.due_date}T00:00:00`) >= now) || dated[0];
  const due = new Date(`${target.due_date}T00:00:00`);
  const days = Math.round((due - now) / 86400000);
  return { item: target, due, days };
};
const renderLiabilities = () => {
  const total = liabilities.reduce((sum, item) => sum + debtNumber(item.outstanding_balance), 0);
  const monthly = liabilities.reduce((sum, item) => sum + debtNumber(item.monthly_payment), 0);
  liabilityEl('totalDebt').textContent = money(total);
  liabilityEl('monthlyDebt').textContent = money(monthly);
  const nextDue = nextDueInfo();
  liabilityEl('nextDebtDue').textContent = nextDue ? nextDue.due.toLocaleDateString('th-TH',{day:'numeric',month:'short'}) : '—';
  liabilityEl('nextDebtDueNote').textContent = nextDue ? `${nextDue.item.name} · ${nextDue.days < 0 ? `เลยกำหนด ${Math.abs(nextDue.days)} วัน` : nextDue.days === 0 ? 'ครบกำหนดวันนี้' : `อีก ${nextDue.days} วัน`}` : 'ยังไม่มีวันกำหนด';
  liabilityEl('liabilityCount').textContent = `${liabilities.length} รายการ`;
  liabilityEl('liabilityRows').innerHTML = liabilities.map(item => `<tr><td data-label="รายการ"><b>${escapeHtml(item.name)}</b><small class="d-block text-secondary">${escapeHtml(item.source || '')}</small></td><td data-label="ประเภท">${escapeHtml(item.liability_type)}</td><td data-label="ครบกำหนด">${item.due_date ? new Date(`${item.due_date}T00:00:00`).toLocaleDateString('th-TH') : '—'}</td><td data-label="ยอดคงเหลือ" class="text-end fw-semibold text-danger">${money(item.outstanding_balance)}</td><td data-label="จ่าย/เดือน" class="text-end">${item.monthly_payment === null ? '—' : money(item.monthly_payment)}</td><td data-label="จัดการ" class="text-end text-nowrap"><button class="btn btn-sm text-primary" data-action="edit" data-id="${escapeHtml(item.id)}" aria-label="แก้ไข ${escapeHtml(item.name)}"><i class="bi bi-pencil"></i></button><button class="btn btn-sm text-danger" data-action="delete" data-id="${escapeHtml(item.id)}" aria-label="ลบ ${escapeHtml(item.name)}"><i class="bi bi-trash"></i></button></td></tr>`).join('') || '<tr><td colspan="6" class="text-center empty py-5">ยังไม่มีหนี้สินที่บันทึกไว้</td></tr>';
};
const loadLiabilities = async () => {
  const { data, error } = await db.from('liabilities').select('*').order('updated_at',{ascending:false});
  if (error) return debtToast('กรุณารัน Supabase schema เวอร์ชันล่าสุดก่อน','danger');
  liabilities = data || [];
  renderLiabilities();
  window.mintMindNative?.scheduleDebtNotifications?.(liabilities).catch(() => {});
};
const resetLiabilityForm = () => {
  editingLiabilityId = null;
  liabilityEl('liabilityForm').reset();
  liabilityEl('liabilitySubmit').textContent = 'บันทึกหนี้สิน';
  liabilityEl('cancelLiabilityEdit').classList.add('d-none');
};

liabilityEl('liabilityForm').addEventListener('submit', async event => {
  event.preventDefault();
  const submit = liabilityEl('liabilitySubmit'); submit.disabled = true;
  const row = { user_id: liabilityUserId, name: liabilityEl('liabilityName').value.trim(), liability_type: liabilityEl('liabilityType').value, outstanding_balance: debtNumber(liabilityEl('liabilityBalance').value), monthly_payment: liabilityEl('liabilityPayment').value === '' ? null : debtNumber(liabilityEl('liabilityPayment').value), due_date: liabilityEl('liabilityDue').value || null, source: liabilityEl('liabilitySource').value.trim() || null, updated_at: new Date().toISOString() };
  const result = editingLiabilityId ? await db.from('liabilities').update(row).eq('id',editingLiabilityId) : await db.from('liabilities').insert(row);
  if (result.error) debtToast(result.error.message,'danger');
  else { debtToast(editingLiabilityId ? 'อัปเดตหนี้สินแล้ว' : 'เพิ่มหนี้สินแล้ว'); resetLiabilityForm(); await loadLiabilities(); }
  submit.disabled = false;
});
liabilityEl('liabilityRows').addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const item = liabilities.find(value => value.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === 'delete') {
    if (!confirm(`ลบ ${item.name} หรือไม่?`)) return;
    const { error } = await db.from('liabilities').delete().eq('id',item.id);
    if (error) return debtToast(error.message,'danger');
    debtToast('ลบหนี้สินแล้ว'); await loadLiabilities(); return;
  }
  editingLiabilityId = item.id;
  liabilityEl('liabilityName').value = item.name;
  liabilityEl('liabilityType').value = item.liability_type;
  liabilityEl('liabilityBalance').value = item.outstanding_balance;
  liabilityEl('liabilityPayment').value = item.monthly_payment ?? '';
  liabilityEl('liabilityDue').value = item.due_date || '';
  liabilityEl('liabilitySource').value = item.source || '';
  liabilityEl('liabilitySubmit').textContent = 'บันทึกการแก้ไข';
  liabilityEl('cancelLiabilityEdit').classList.remove('d-none');
  window.scrollTo({top:0,behavior:'smooth'});
});
liabilityEl('cancelLiabilityEdit').addEventListener('click',resetLiabilityForm);
liabilityEl('logoutBtn').onclick = signOut;
(async () => {
  setupTheme();
  ensureNextDueCard();
  const user = await requireUser();
  if (!user) return;
  liabilityUserId = user.id;
  resetLiabilityForm();
  await loadLiabilities();
  setTimeout(() => {
    if (!window.mintMindNative?.isNative?.() || liabilityEl('nativeDebtNotifications')) return;
    const button = document.createElement('button');
    button.id = 'nativeDebtNotifications'; button.type = 'button'; button.className = 'btn btn-outline-light btn-sm mt-3';
    button.innerHTML = '<i class="bi bi-bell-fill me-1"></i>เปิดแจ้งเตือนในแอป';
    document.querySelector('.liability-hero > div')?.append(button);
    button.onclick = async () => {
      const granted = await window.mintMindNative.requestNotifications();
      if (!granted) return debtToast('กรุณาอนุญาตการแจ้งเตือนในการตั้งค่าแอป','warning');
      await window.mintMindNative.scheduleDebtNotifications(liabilities);
      button.innerHTML = '<i class="bi bi-check-lg me-1"></i>เปิดแจ้งเตือนแล้ว'; button.disabled = true;
      debtToast('ตั้งการแจ้งเตือนหนี้ในแอปแล้ว');
    };
  },100);
})();
