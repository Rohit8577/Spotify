let globalEmail = '';
async function signupPost(path, body) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || result.error || result.msg || 'Request failed');
  return result;
}
function google() { window.location.href = '/auth/google'; }
function otpNotice(message) {
  const element = document.getElementById('otpAlert');
  element.classList.remove('none'); element.textContent = message;
}
document.getElementById('signup').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.submitter; if (button) button.disabled = true;
  try {
    const email = document.getElementById('email').value.trim();
    await signupPost('/emailCheck', { email });
    await signupPost('/send-otp', { email, purpose: 'signup' });
    globalEmail = email;
    document.querySelector('.container').style.display = 'none';
    document.querySelector('.OTP').style.display = 'block';
    otpNotice('Verification code sent');
  } catch (error) { alert(error.message); }
  finally { if (button) button.disabled = false; }
});
const inputs = document.querySelectorAll('.otp-input');
inputs.forEach((input, index) => {
  input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(-1); if (input.value && index < inputs.length - 1) inputs[index + 1].focus(); });
  input.addEventListener('keydown', (event) => { if (event.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus(); });
});
document.getElementById('getOTP').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.submitter; if (button) button.disabled = true;
  try {
    const otp = [...inputs].map((input) => input.value).join('');
    const result = await signupPost('/verify-otp', { email: globalEmail, otp, purpose: 'signup' });
    const response = await fetch('/pass', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: globalEmail, verificationToken: result.verificationToken }) });
    if (!response.ok) throw new Error('Could not open signup form');
    const html = await response.text();
    document.open(); document.write(html); document.close();
  } catch (error) { otpNotice(error.message); }
  finally { if (button) button.disabled = false; }
});
async function ResendOTP() {
  try { await signupPost('/send-otp', { email: globalEmail, purpose: 'signup' }); otpNotice('New verification code sent'); }
  catch (error) { otpNotice(error.message); }
}
function back() {
  document.querySelector('.container').style.display = 'flex';
  document.querySelector('.OTP').style.display = 'none';
}
