let task = 'coach';
const aiEl = id => document.getElementById(id);
const addMessage = (text, who) => {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-${who}`;
  bubble.textContent = text;
  aiEl('chatLog').append(bubble);
  aiEl('chatLog').scrollTop = aiEl('chatLog').scrollHeight;
  return bubble;
};
const examplesByTask = {
  coach: ['เดือนนี้ควรระวังค่าใช้จ่ายหมวดไหน?', 'ช่วยแนะนำวิธีเริ่มออมเงิน'],
  summary: ['สรุปรายรับรายจ่ายของฉัน', 'หมวดไหนใช้เงินมากที่สุด?'],
  categorize: ['กาแฟตอนเช้า 65 บาท', 'ค่าเดินทาง BTS 45 บาท']
};
const renderExamples = () => {
  let group = aiEl('aiExamples');
  if (!group) {
    group = document.createElement('div'); group.id = 'aiExamples'; group.className = 'ai-examples';
    aiEl('chatForm').before(group);
  }
  group.replaceChildren(...examplesByTask[task].map(prompt => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = prompt; button.dataset.prompt = prompt;
    button.addEventListener('click', () => { aiEl('chatInput').value = prompt; aiEl('chatInput').focus(); });
    return button;
  }));
};
const privacyNote = document.createElement('div');
privacyNote.className = 'ai-privacy-note';
privacyNote.innerHTML = '<i class="bi bi-shield-lock-fill" aria-hidden="true"></i><span><strong>โหมดฟรีและเป็นส่วนตัว</strong><br>คำตอบคำนวณด้วยกฎในแอป ไม่ส่งข้อความหรือรายการเงินให้ผู้ให้บริการ AI ภายนอก; ข้อมูลบัญชียังคงจัดเก็บใน Supabase ตามระบบหลัก</span>';
aiEl('chatLog').before(privacyNote);
aiEl('chatLog').setAttribute('role','log');
aiEl('chatLog').setAttribute('aria-live','polite');
aiEl('chatLog').setAttribute('aria-label','บทสนทนากับผู้ช่วยการเงิน');

const localAnswer = async question => {
  const { data, error } = await db.from('transactions').select('*').order('date',{ascending:false});
  if (error) throw error;
  const items = data || [];
  const expense = items.filter(item => item.type === 'expense').reduce((sum,item) => sum + Number(item.amount),0);
  const income = items.filter(item => item.type === 'income').reduce((sum,item) => sum + Number(item.amount),0);
  const categories = {};
  items.filter(item => item.type === 'expense').forEach(item => { categories[item.category] = (categories[item.category] || 0) + Number(item.amount); });
  const top = Object.entries(categories).sort((a,b) => b[1] - a[1])[0];
  if (task === 'categorize') {
    const text = question.toLowerCase();
    const category = /กาแฟ|ข้าว|อาหาร|ร้าน/.test(text) ? 'อาหาร' : /รถ|น้ำมัน|bts|mrt|taxi|แท็กซี่/.test(text) ? 'เดินทาง' : /หนัง|เกม|เพลง|netflix|spotify/.test(text) ? 'บันเทิง' : 'อื่น ๆ';
    return `ผมแนะนำหมวด: ${category}\nโหมดฟรีใช้กฎในแอป ไม่ได้เรียกโมเดล AI ภายนอก`;
  }
  if (!items.length) return 'ยังไม่มีรายการเงินให้วิเคราะห์ ลองเพิ่มรายรับหรือรายจ่ายก่อนครับ';
  if (task === 'summary') return `สรุปข้อมูลที่บันทึกไว้: รายรับ ${money(income)} รายจ่าย ${money(expense)} คงเหลือ ${money(income - expense)}${top ? `\nหมวดที่ใช้มากที่สุดคือ ${top[0]} (${money(top[1])})` : ''}`;
  return `${top ? `หมวด ${top[0]} เป็นหมวดที่ใช้มากที่สุด (${money(top[1])})\n` : ''}${income >= expense ? 'กระแสเงินสดเป็นบวก ลองกันเงินส่วนหนึ่งไว้เป็นเงินออม' : 'รายจ่ายสูงกว่ารายรับ ลองทบทวนหมวดที่ใช้จ่ายสูงสุดก่อน'}\n\nคำตอบนี้สร้างจากสถิติในแอปสำหรับคำถาม “${question}”`;
};

const options = [...document.querySelectorAll('.ai-option')];
const selectTask = selected => {
  options.forEach(option => {
    const active = option === selected;
    option.classList.toggle('selected',active);
    option.setAttribute('role','button'); option.setAttribute('tabindex','0'); option.setAttribute('aria-pressed',String(active));
  });
  task = selected.dataset.task;
  aiEl('chatInput').placeholder = task === 'categorize' ? 'เช่น ค่าอาหารกลางวัน 120 บาท' : task === 'summary' ? 'เช่น หมวดไหนใช้เงินมากที่สุด?' : 'ถาม AI ฟรีเกี่ยวกับการเงินของคุณ';
  renderExamples();
};
options.forEach(option => {
  option.addEventListener('click',() => selectTask(option));
  option.addEventListener('keydown',event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectTask(option); } });
});
if (options[0]) selectTask(options.find(option => option.dataset.task === task) || options[0]);

aiEl('chatForm').addEventListener('submit',async event => {
  event.preventDefault();
  const question = aiEl('chatInput').value.trim();
  if (!question) return;
  addMessage(question,'user'); aiEl('chatInput').value = '';
  const sendButton = aiEl('sendBtn'); sendButton.disabled = true;
  const loading = addMessage('กำลังวิเคราะห์ข้อมูลในแอป…','ai');
  try { const answer = await localAnswer(question); loading.remove(); addMessage(answer,'ai'); }
  catch { loading.remove(); addMessage('ยังวิเคราะห์ไม่ได้ในตอนนี้ ลองตรวจการเชื่อมต่อแล้วส่งอีกครั้งครับ','ai'); }
  finally { sendButton.disabled = false; aiEl('chatInput').focus(); }
});
aiEl('logoutBtn').onclick = signOut;
(async () => { setupTheme(); await requireUser(); })();
