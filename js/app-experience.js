(() => {
  const nav = document.querySelector('.bottom-nav');
  if (nav) {
    nav.setAttribute('aria-label', 'เมนูหลัก');
    nav.querySelectorAll('a.active').forEach((link) => link.setAttribute('aria-current', 'page'));

    const addLink = nav.querySelector('a.add');
    if (addLink) {
      addLink.setAttribute('aria-label', 'เพิ่มรายการเงิน');
      addLink.title = 'เพิ่มรายการเงิน';
    }
  }

  const quickAdd = document.querySelector('.quick-add');
  if (quickAdd) quickAdd.setAttribute('aria-label', 'เพิ่มรายการเงิน');

  const emptyStateContent = {
    bars: {
      icon: 'bi-pie-chart',
      title: 'เริ่มดูภาพรวมรายจ่าย',
      description: 'เพิ่มรายการรายจ่าย แล้ว MintMind จะช่วยสรุปให้ว่าคุณใช้เงินกับอะไรบ้าง',
      action: 'เพิ่มรายการแรก',
      href: 'transactions.html#transactionForm',
    },
    budgetStatus: {
      icon: 'bi-bullseye',
      title: 'เริ่มวางแผนงบของคุณ',
      description: 'ตั้งงบรายเดือนตามหมวด เพื่อดูความคืบหน้าและคุมการใช้จ่ายได้ง่ายขึ้น',
      action: 'ตั้งงบรายเดือน',
      href: 'planner.html',
    },
  };

  function enhanceEmptyStates() {
    document.querySelectorAll('.empty-rich').forEach((box) => {
      const content = emptyStateContent[box.id];
      if (!content || box.dataset.appExperience === 'ready') return;

      box.dataset.appExperience = 'ready';
      box.replaceChildren();

      const icon = document.createElement('i');
      icon.className = `bi ${content.icon}`;
      icon.setAttribute('aria-hidden', 'true');

      const title = document.createElement('strong');
      title.textContent = content.title;

      const description = document.createElement('span');
      description.textContent = content.description;

      const action = document.createElement('a');
      action.className = 'btn btn-sm btn-outline-success empty-cta';
      action.href = content.href;
      action.innerHTML = '<i class="bi bi-arrow-right" aria-hidden="true"></i>';
      const actionText = document.createElement('span');
      actionText.textContent = content.action;
      action.append(actionText);

      box.append(icon, title, description, action);
    });
  }

  enhanceEmptyStates();
  const observer = new MutationObserver(enhanceEmptyStates);
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => {
    enhanceEmptyStates();
    observer.disconnect();
  }, 5000);
})();

