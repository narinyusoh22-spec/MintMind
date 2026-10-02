(()=>{
  const hero=document.querySelector('.hero');if(!hero)return;
  const amountButton=document.createElement('button');
  amountButton.id='hideAmounts';
  amountButton.type='button';
  amountButton.className='amount-visibility-toggle';
  amountButton.setAttribute('aria-pressed','false');
  const setHidden=hidden=>{
    document.querySelectorAll('#incomeTotal,#expenseTotal,#balanceTotal').forEach(el=>{
      el.classList.toggle('money-hidden',hidden);
      if(hidden)el.setAttribute('aria-label','ยอดเงินถูกซ่อน');
      else el.removeAttribute('aria-label');
    });
    localStorage.setItem('mmHideAmounts',hidden?'1':'0');
    amountButton.innerHTML=hidden?'<i class="bi bi-eye"></i><span>แสดงยอดเงิน</span>':'<i class="bi bi-eye-slash"></i><span>ซ่อนยอดเงิน</span>';
    amountButton.setAttribute('aria-label',hidden?'แสดงยอดเงิน':'ซ่อนยอดเงิน');
    amountButton.setAttribute('aria-pressed',String(hidden));
  };
  const account=document.createElement('div');
  account.className='bank-account-chip';
  account.innerHTML='<span><i class="bi bi-shield-check"></i> บัญชีการเงินส่วนตัว</span>';
  account.append(amountButton);
  hero.querySelector('p')?.after(account);

  const quick=document.createElement('section');
  quick.className='bank-quick-actions';
  quick.setAttribute('aria-label','ทางลัด');
  quick.innerHTML='<a href="transactions.html#transactionForm"><i class="bi bi-plus-circle-fill"></i><span>เพิ่มรายการ</span></a><a href="planner.html"><i class="bi bi-bullseye"></i><span>วางแผนงบ</span></a><a href="liabilities.html"><i class="bi bi-credit-card-fill"></i><span>หนี้สิน</span></a><a href="calendar.html"><i class="bi bi-calendar3"></i><span>ปฏิทิน</span></a>';
  document.querySelector('main .row.g-3.mb-4')?.before(quick);

  setHidden(localStorage.getItem('mmHideAmounts')==='1');
  amountButton.addEventListener('click',()=>setHidden(!document.getElementById('balanceTotal').classList.contains('money-hidden')));
  const dayDiff=date=>Math.ceil((new Date(`${date}T00:00:00`).getTime()-new Date(new Date().toDateString()).getTime())/86400000);
  (async()=>{const {data:liabilities,error}=await db.from('liabilities').select('id,name,outstanding_balance,monthly_payment,due_date').not('due_date','is',null).order('due_date');if(error)return;const upcoming=(liabilities||[]).filter(item=>dayDiff(item.due_date)>=0&&dayDiff(item.due_date)<=7);if(!upcoming.length)return;const card=document.createElement('section');card.className='debt-reminder-card mb-4';card.innerHTML=`<div class="debt-reminder-heading"><div><span><i class="bi bi-bell-fill"></i> การชำระหนี้ใกล้ถึงกำหนด</span><small>${upcoming.length} รายการภายใน 7 วัน</small></div><a href="liabilities.html">ดูทั้งหมด <i class="bi bi-arrow-right"></i></a></div><div class="debt-reminder-list">${upcoming.map(item=>{const days=dayDiff(item.due_date),amount=Number(item.monthly_payment||item.outstanding_balance);return `<div><i class="bi bi-credit-card-2-front"></i><span><b>${escapeHtml(item.name)}</b><small>${days===0?'ครบกำหนดวันนี้':days===1?'ครบกำหนดพรุ่งนี้':`ครบกำหนดใน ${days} วัน`}</small></span><strong>${money(amount)}</strong></div>`}).join('')}</div>`;document.querySelector('main .row.g-3.mb-4')?.after(card);if(Notification.permission==='granted')upcoming.forEach(item=>{const days=dayDiff(item.due_date),key=`mmDebtNotice:${item.id}:${item.due_date}`;if(!localStorage.getItem(key)){new Notification('MintMind: แจ้งเตือนหนี้',{body:`${item.name} ${days===0?'ครบกำหนดวันนี้':`ครบกำหนดใน ${days} วัน`}`});localStorage.setItem(key,'1')}})})();
})();
