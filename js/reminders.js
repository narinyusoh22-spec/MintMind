let reminders = [];
let uid = null;
const reminderEl = id => document.getElementById(id);
const toast = (message, color = 'primary') => {
  const item = document.createElement('div');
  item.className = `toast text-bg-${color} border-0`;
  item.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="ปิด"></button></div>`;
  reminderEl('toasts').append(item);
  new bootstrap.Toast(item).show();
};
const notificationStatus = document.createElement('div');
notificationStatus.id = 'notificationStatus';
notificationStatus.setAttribute('role', 'status');
notificationStatus.setAttribute('aria-live', 'polite');
reminderEl('notificationBtn').before(notificationStatus);
const remaining = when => {
  const minutes = Math.ceil((new Date(when).getTime() - Date.now()) / 60000);
  if (minutes <= 0) return 'ถึงกำหนดแล้ว';
  if (minutes < 60) return `อีก ${minutes} นาที`;
  if (minutes < 1440) return `อีก ${Math.ceil(minutes / 60)} ชั่วโมง`;
  return `อีก ${Math.ceil(minutes / 1440)} วัน`;
};
const permissionStatus = () => {
  let message = 'การแจ้งเตือน: ยังไม่ได้อนุญาต';
  let status = 'is-pending';
  if (!('Notification' in window)) { message = 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน'; status = 'is-denied'; }
  else if (Notification.permission === 'granted') { message = 'การแจ้งเตือนเปิดอยู่'; status = 'is-enabled'; }
  else if (Notification.permission === 'denied') { message = 'การแจ้งเตือนถูกปิดในเบราว์เซอร์'; status = 'is-denied'; }
  const target = reminderEl('notificationStatus');
  target.textContent = message;
  target.className = `notification-status ${status}`;
  const supported = 'Notification' in window;
  reminderEl('notificationBtn').disabled = !supported || Notification.permission === 'granted';
  reminderEl('notificationBtn').textContent = !supported ? 'เบราว์เซอร์ไม่รองรับ' : Notification.permission === 'granted' ? 'การแจ้งเตือนเปิดแล้ว' : 'เปิดการแจ้งเตือนบนเบราว์เซอร์';
};
const render = () => {
  const now = Date.now();
  const ordered = [...reminders].sort((a, b) => new Date(a.when) - new Date(b.when));
  reminderEl('reminderCount').textContent = `${ordered.length} รายการ`;
  reminderEl('reminderList').innerHTML = ordered.map(item => {
    const due = new Date(item.when).getTime() <= now;
    const label = due ? (item.notified ? 'ถึงกำหนดแล้ว' : 'ถึงเวลาแล้ว') : remaining(item.when);
    return `<article class="reminder-timeline-item ${due ? 'is-due' : ''}"><span class="reminder-timeline-icon"><i class="bi ${due ? 'bi-bell-fill' : 'bi-bell'}"></i></span><div class="reminder-timeline-copy"><strong>${escapeHtml(item.title)} ${item.repeat_monthly ? '<span class="tag ms-1">รายเดือน</span>' : ''}</strong><small>${new Date(item.when).toLocaleString('th-TH',{weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</small><span class="reminder-status">${label}</span></div><button class="btn btn-sm btn-outline-danger" data-id="${escapeHtml(item.id)}" aria-label="ลบการเตือน ${escapeHtml(item.title)}"><i class="bi bi-trash3"></i></button></article>`;
  }).join('') || '<div class="planner-empty"><i class="bi bi-bell-slash"></i><strong>ยังไม่มีการเตือน</strong><span>เพิ่มการเตือนเพื่อไม่พลาดกำหนดสำคัญ</span></div>';
};
const refresh = async () => {
  const { data, error } = await db.from('reminders').select('*').order('when');
  if (error) return toast('กรุณารัน supabase-schema.sql ก่อน', 'danger');
  reminders = data || [];
  render();
};
const checkDue = async () => {
  const due = reminders.filter(item => !item.notified && new Date(item.when) <= new Date());
  for (const item of due) {
    toast(`ถึงเวลา: ${item.title}`, 'warning');
    if ('Notification' in window && Notification.permission === 'granted') new Notification('MintMind', { body: item.title });
    if (item.repeat_monthly) {
      const next = new Date(item.when);
      next.setMonth(next.getMonth() + 1);
      await db.from('reminders').update({ when: next.toISOString(), notified: false }).eq('id', item.id);
    } else {
      await db.from('reminders').update({ notified: true }).eq('id', item.id);
    }
  }
  if (due.length) await refresh();
};

reminderEl('reminderList').addEventListener('click', async event => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  const { error } = await db.from('reminders').delete().eq('id', button.dataset.id);
  if (error) return toast(error.message, 'danger');
  reminders = reminders.filter(item => item.id !== button.dataset.id);
  render();
  toast('ลบการเตือนแล้ว');
});
reminderEl('reminderForm').addEventListener('submit', async event => {
  event.preventDefault();
  const row = { user_id: uid, title: reminderEl('reminderTitle').value.trim(), when: reminderEl('reminderDate').value, repeat_monthly: reminderEl('repeatMonthly')?.checked || false, notified: false };
  const { data, error } = await db.from('reminders').insert(row).select().single();
  if (error) return toast(error.message, 'danger');
  reminders.push(data);
  event.currentTarget.reset();
  render();
  toast('เพิ่มการเตือนแล้ว');
});
reminderEl('notificationBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) return toast('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน', 'danger');
  const permission = await Notification.requestPermission();
  permissionStatus();
  toast(permission === 'granted' ? 'เปิดการแจ้งเตือนแล้ว' : 'ยังไม่ได้อนุญาตการแจ้งเตือน', permission === 'granted' ? 'success' : 'warning');
});
reminderEl('logoutBtn').onclick = signOut;
(async () => {
  setupTheme();
  permissionStatus();
  const user = await requireUser();
  if (!user) return;
  uid = user.id;
  await refresh();
  await checkDue();
  setInterval(() => { render(); checkDue(); }, 30000);
})();
