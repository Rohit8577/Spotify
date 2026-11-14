let resetEmail = '';
let resetVerificationToken = '';
async function loginPost(path, body) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || result.error || 'Request failed');
  return result;
}
document.getElementById('loginform').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.submitter; if (button) button.disabled = true;
  try {
    await loginPost('/login', { email: document.getElementById('email').value, password: document.getElementById('password').value });
    window.location.href = '/';
  } catch (error) { alert(error.message); }
  finally { if (button) button.disabled = false; }
});
document.getElementsByTagName('svg')[2]?.addEventListener('click', () => {
  const pass = document.getElementById('password'); pass.type = pass.type === 'password' ? 'text' : 'password';
});
document.getElementById('close').addEventListener('click', () => location.reload());
function openPopup() { document.querySelector('.popup').style.display = 'flex'; }
function google() { window.location.href = '/auth/google'; }
function resetNotice(message) {
  const element = document.getElementById('otpAlert'); element.classList.remove('none'); element.textContent = message;
}
document.getElementById('forgetpass').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    resetEmail = document.getElementById('email1').value.trim();
    await loginPost('/send-otp', { email: resetEmail, purpose: 'reset' });
    document.querySelector('.forget').style.display = 'none';
    document.querySelector('.updt').style.display = 'block';
    resetNotice('Verification code sent');
  } catch (error) { alert(error.message); }
});
const inputs = document.querySelectorAll('.otp-input');
inputs.forEach((input, index) => {
  input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(-1); if (input.value && index < inputs.length - 1) inputs[index + 1].focus(); });
  input.addEventListener('keydown', (event) => { if (event.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus(); });
});
document.getElementById('getOTP').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await loginPost('/verify-otp', { email: resetEmail, otp: [...inputs].map((input) => input.value).join(''), purpose: 'reset' });
    resetVerificationToken = result.verificationToken;
    document.querySelector('.updt').style.display = 'none';
    document.querySelector('.updateNewPassword').classList.remove('none');
  } catch (error) { resetNotice(error.message); }
});
async function ResendOTP() {
  try { await loginPost('/send-otp', { email: resetEmail, purpose: 'reset' }); resetNotice('New verification code sent'); }
  catch (error) { resetNotice(error.message); }
}
document.getElementById('resetBtn').addEventListener('click', async () => {
  const newpassword = document.getElementById('newPassword').value;
  if (newpassword.length < 6) return alert('Password must contain at least 6 characters');
  if (newpassword !== document.getElementById('confirmPassword').value) return alert('Passwords do not match');
  try {
    await loginPost('/updtpass', { email: resetEmail, newpassword, verificationToken: resetVerificationToken });
    alert('Password updated. Please log in.'); location.reload();
  } catch (error) { alert(error.message); }
});
