let uid = null;
let budgets = [];
let goals = [];
let recurring = [];
let transactions = [];

const plannerEl = id => document.getElementById(id);
const plannerToast = (message, color = 'success') => {
  const item = document.createElement('div');
  item.className = `toast text-bg-${color} border-0`;
  item.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="ปิด"></button></div>`;
  plannerEl('toasts').append(item);
  new bootstrap.Toast(item).show();
};
const plannerMonth = date => String(date || '').slice(0, 7);
const plannerMoney = value => money(Number(value || 0));

const renderPlanner = () => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`;
  const monthExpenses = transactions.filter(item => item.type === 'expense' && plannerMonth(item.date) === month);
  const budgetList = plannerEl('budgetList');
  budgetList.innerHTML = budgets.map(item => {
    const limit = Number(item.monthly_limit || 0);
    const used = monthExpenses.filter(tx => tx.category === item.category).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const percent = limit > 0 ? used / limit * 100 : 0;
    const state = percent >= 100 ? 'over' : percent >= 80 ? 'near' : 'ok';
    const label = state === 'over' ? 'เกินงบ' : state === 'near' ? 'ใกล้เต็ม' : 'อยู่ในงบ';
    const remaining = Math.max(0, limit - used);
    return `<article class="planner-budget-item is-${state}"><div class="planner-item-top"><div class="planner-item-name"><span class="planner-mini-icon"><i class="bi bi-wallet2"></i></span><div><strong>${escapeHtml(item.category)}</strong><span class="planner-state">${label}</span></div></div><button class="planner-icon-button danger" type="button" data-delete-budget="${escapeHtml(item.id)}" aria-label="ลบงบ ${escapeHtml(item.category)}"><i class="bi bi-trash3"></i></button></div><div class="planner-budget-amount"><strong>${plannerMoney(used)}</strong><span>จาก ${plannerMoney(limit)}</span></div><div class="progress planner-progress" role="progressbar" aria-label="ใช้${escapeHtml(item.category)}ไป ${Math.round(percent)} เปอร์เซ็นต์" aria-valuenow="${Math.min(100, Math.round(percent))}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${Math.min(100, percent)}%"></div></div><div class="planner-item-foot"><span>${remaining ? `เหลืองบ ${plannerMoney(remaining)}` : 'ถึงวงเงินที่ตั้งไว้'}</span><span>${Math.round(percent)}%</span></div></article>`;
  }).join('') || '<div class="planner-empty"><i class="bi bi-piggy-bank"></i><strong>ยังไม่ได้ตั้งงบ</strong><span>กำหนดวงเงินรายหมวด แล้ว MintMind จะช่วยติดตามให้</span></div>';

  const goalList = plannerEl('goalList');
  goalList.innerHTML = goals.map(item => {
    const target = Number(item.target || 0);
    const saved = Number(item.saved || 0);
    const percent = target > 0 ? Math.min(100, saved / target * 100) : 0;
    const complete = saved >= target && target > 0;
    const remaining = Math.max(0, target - saved);
    return `<article class="planner-goal-item ${complete ? 'is-complete' : ''}"><div class="planner-item-top"><div class="planner-item-name"><span class="planner-mini-icon goal"><i class="bi ${complete ? 'bi-check2-circle' : 'bi-bullseye'}"></i></span><div><strong>${escapeHtml(item.title)}</strong><span class="planner-state">${complete ? 'ถึงเป้าหมายแล้ว' : `ออมแล้ว ${Math.round(percent)}%`}</span></div></div><button class="planner-icon-button danger" type="button" data-delete-goal="${escapeHtml(item.id)}" aria-label="ลบเป้าหมาย ${escapeHtml(item.title)}"><i class="bi bi-trash3"></i></button></div><div class="planner-budget-amount"><strong>${plannerMoney(saved)}</strong><span>จาก ${plannerMoney(target)}</span></div><div class="progress planner-progress goal-progress" role="progressbar" aria-label="ความคืบหน้า ${escapeHtml(item.title)} ${Math.round(percent)} เปอร์เซ็นต์" aria-valuenow="${Math.round(percent)}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${percent}%"></div></div><div class="planner-item-foot"><span>${complete ? 'ยอดเยี่ยม ทำสำเร็จแล้ว' : `อีก ${plannerMoney(remaining)} จะถึงเป้า`}</span><button class="btn btn-sm btn-outline-success" type="button" data-goal-add="${escapeHtml(item.id)}"><i class="bi bi-plus-lg"></i> เพิ่มเงินออม</button></div></article>`;
  }).join('') || '<div class="planner-empty"><i class="bi bi-bullseye"></i><strong>ยังไม่มีเป้าหมายการออม</strong><span>เริ่มจากเป้าหมายเล็ก ๆ ที่ทำได้จริง</span></div>';

  const recurringList = plannerEl('recurringList');
  recurringList.innerHTML = recurring.map(item => `<article class="planner-recurring-item"><span class="planner-mini-icon recurring"><i class="bi bi-arrow-repeat"></i></span><div class="planner-recurring-copy"><strong>${escapeHtml(item.description)}</strong><small>${item.type === 'income' ? 'รายรับ' : 'รายจ่าย'} · ${escapeHtml(item.category)} · ทุกวันที่ ${Number(item.day_of_month)}</small></div><strong class="planner-recurring-amount">${plannerMoney(item.amount)}</strong><button class="planner-icon-button danger" type="button" data-delete-recurring="${escapeHtml(item.id)}" aria-label="ลบรายการประจำ ${escapeHtml(item.description)}"><i class="bi bi-trash3"></i></button></article>`).join('') || '<div class="planner-empty compact"><i class="bi bi-arrow-repeat"></i><strong>ยังไม่มีรายการประจำ</strong><span>เช่น ค่าเช่าหรือเงินเดือน</span></div>';
};

const deletePlannerItem = async (table, id) => {
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) return plannerToast(error.message, 'danger');
  plannerToast('ลบรายการแล้ว');
  await loadPlanner();
};
const loadPlanner = async () => {
  const [budgetResult, goalResult, recurringResult, txResult] = await Promise.all([
    db.from('budgets').select('*'),
    db.from('saving_goals').select('*'),
    db.from('recurring_transactions').select('*'),
    db.from('transactions').select('type,category,amount,date')
  ]);
  if (budgetResult.error || goalResult.error || recurringResult.error) {
    plannerToast('โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบ Supabase schema', 'danger');
    return;
  }
  budgets = budgetResult.data || [];
  goals = goalResult.data || [];
  recurring = recurringResult.data || [];
  transactions = txResult.error ? [] : txResult.data || [];
  renderPlanner();
};

plannerEl('budgetList').addEventListener('click', event => {
  const button = event.target.closest('[data-delete-budget]');
  if (button) deletePlannerItem('budgets', button.dataset.deleteBudget);
});
plannerEl('goalList').addEventListener('click', async event => {
  const deleteButton = event.target.closest('[data-delete-goal]');
  if (deleteButton) return deletePlannerItem('saving_goals', deleteButton.dataset.deleteGoal);
  const addButton = event.target.closest('[data-goal-add]');
  if (!addButton) return;
  const amount = Number(prompt('เพิ่มเงินออมจำนวน (บาท)'));
  if (!Number.isFinite(amount) || amount <= 0) return;
  const goal = goals.find(item => item.id === addButton.dataset.goalAdd);
  if (!goal) return;
  const { error } = await db.from('saving_goals').update({ saved: Number(goal.saved || 0) + amount }).eq('id', goal.id);
  if (error) return plannerToast(error.message, 'danger');
  plannerToast('เพิ่มเงินออมแล้ว');
  await loadPlanner();
});
plannerEl('recurringList').addEventListener('click', event => {
  const button = event.target.closest('[data-delete-recurring]');
  if (button) deletePlannerItem('recurring_transactions', button.dataset.deleteRecurring);
});

plannerEl('budgetForm').addEventListener('submit', async event => {
  event.preventDefault();
  const { error } = await db.from('budgets').upsert({ user_id: uid, category: plannerEl('budgetCategory').value, monthly_limit: Number(plannerEl('budgetLimit').value) }, { onConflict: 'user_id,category' });
  if (error) return plannerToast(error.message, 'danger');
  event.currentTarget.reset();
  plannerToast('บันทึกงบแล้ว');
  await loadPlanner();
});
plannerEl('goalForm').addEventListener('submit', async event => {
  event.preventDefault();
  const { error } = await db.from('saving_goals').insert({ user_id: uid, title: plannerEl('goalTitle').value.trim(), target: Number(plannerEl('goalTarget').value), saved: Number(plannerEl('goalSaved').value) || 0 });
  if (error) return plannerToast(error.message, 'danger');
  event.currentTarget.reset();
  plannerToast('เพิ่มเป้าหมายแล้ว');
  await loadPlanner();
});
plannerEl('recurringForm').addEventListener('submit', async event => {
  event.preventDefault();
  const row = { user_id: uid, type: plannerEl('recurringType').value, description: plannerEl('recurringDescription').value.trim(), amount: Number(plannerEl('recurringAmount').value), category: plannerEl('recurringCategory').value.trim(), day_of_month: Number(plannerEl('recurringDay').value) };
  const { error } = await db.from('recurring_transactions').insert(row);
  if (error) return plannerToast(error.message, 'danger');
  event.currentTarget.reset();
  plannerToast('เพิ่มรายการประจำแล้ว');
  await loadPlanner();
});

plannerEl('logoutBtn').onclick = signOut;
(async () => {
  setupTheme();
  const user = await requireUser();
  if (!user) return;
  uid = user.id;
  await loadPlanner();
})();
