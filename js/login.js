let signup = false;

const message = (text, type) => {
  notice.innerHTML = '<div class="alert alert-' + type + ' py-2 small">' + text + '</div>';
};

const meter = document.createElement('div');
meter.className = 'd-flex gap-1 mt-2';
meter.innerHTML = '<i class="score-dot"></i><i class="score-dot"></i><i class="score-dot"></i><i class="score-dot"></i>';
password.closest('.password-wrap').after(meter);

password.addEventListener('input', () => {
  const value = password.value;
  const score = [
    value.length >= 6,
    value.length >= 10,
    /[A-Z]/.test(value),
    /\d|[^\w]/.test(value)
  ].filter(Boolean).length;
  meter.querySelectorAll('i').forEach((dot, index) => dot.classList.toggle('on', index < score));
});

eye.onclick = () => {
  const showPassword = password.type === 'password';
  password.type = showPassword ? 'text' : 'password';
  eye.innerHTML = '<i class="bi bi-eye' + (showPassword ? '-slash' : '') + '"></i>';
};

const setMode = () => {
  signup = !signup;
  notice.innerHTML = '';
  heading.textContent = signup ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับมา';
  sub.textContent = signup
    ? 'กำหนดรหัสผ่านอย่างน้อย 6 ตัวอักษร'
    : 'เข้าสู่ระบบเพื่อดูข้อมูลการเงินของคุณ';
  submitText.textContent = signup ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
  switchText.textContent = signup ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?';
  switchBtn.textContent = signup ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก';
  forgotBtn.classList.toggle('d-none', signup);
  meter.classList.toggle('d-none', !signup);
  authForm.dataset.mode = signup ? 'signup' : 'login';
};

meter.classList.add('d-none');
authForm.dataset.mode = 'login';

const authCard = document.querySelector('.auth-card');
const transitionBlade = document.getElementById('authTransitionBlade');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let transitionBusy = false;
let modeChanged = false;
let swapTimer = 0;
let finishTimer = 0;

const changeModeUnderBlade = () => {
  if (modeChanged) return;
  setMode();
  modeChanged = true;
};

const finishModeTransition = () => {
  if (!transitionBusy) return;
  window.clearTimeout(swapTimer);
  window.clearTimeout(finishTimer);
  changeModeUnderBlade();
  authCard.classList.remove('auth-switching');
  authCard.removeAttribute('aria-busy');
  switchBtn.disabled = false;
  transitionBusy = false;
};

const switchMode = () => {
  if (transitionBusy) return;
  if (reduceMotion.matches || !authCard || !transitionBlade) {
    setMode();
    return;
  }

  transitionBusy = true;
  modeChanged = false;
  switchBtn.disabled = true;
  authCard.setAttribute('aria-busy', 'true');
  authCard.classList.remove('auth-switching');

  transitionBlade.addEventListener('animationend', event => {
    if (event.target === transitionBlade) finishModeTransition();
  }, { once: true });

  swapTimer = window.setTimeout(changeModeUnderBlade, 350);
  finishTimer = window.setTimeout(finishModeTransition, 900);
  window.requestAnimationFrame(() => authCard.classList.add('auth-switching'));
};

switchBtn.onclick = switchMode;
forgotBtn.onclick = async () => {
  const address = email.value.trim();
  if (!address) {
    message('กรุณากรอกอีเมลก่อนกดลืมรหัสผ่าน', 'warning');
    email.focus();
    return;
  }

  forgotBtn.disabled = true;
  const { error } = await db.auth.resetPasswordForEmail(address);
  forgotBtn.disabled = false;
  if (error) return message('ส่งอีเมลรีเซ็ตไม่สำเร็จ: ' + error.message, 'danger');
  message('ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว โปรดตรวจ Inbox และ Spam', 'success');
};

authForm.onsubmit = async event => {
  event.preventDefault();
  notice.innerHTML = '';
  submitBtn.disabled = true;
  spinner.classList.remove('d-none');

  const data = { email: email.value.trim(), password: password.value };
  const result = signup
    ? await db.auth.signUp(data)
    : await db.auth.signInWithPassword(data);

  submitBtn.disabled = false;
  spinner.classList.add('d-none');
  if (result.error) {
    message(
      result.error.message === 'Invalid login credentials'
        ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่'
        : 'ไม่สามารถดำเนินการได้: ' + result.error.message,
      'danger'
    );
    password.classList.add('is-invalid', 'shake');
    password.focus();
    window.setTimeout(() => password.classList.remove('is-invalid', 'shake'), 900);
    return;
  }

  if (signup && !result.data.session) {
    message('สมัครสำเร็จ โปรดยืนยันอีเมลก่อนเข้าสู่ระบบ', 'info');
    return;
  }

  loginBox.classList.add('d-none');
  successBox.classList.remove('d-none');
  window.setTimeout(() => location.replace('index.html'), 1000);
};

db.auth.getSession().then(({ data: { session } }) => {
  if (session) location.replace('index.html');
});
