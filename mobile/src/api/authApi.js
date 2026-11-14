import { api } from './config';

export const authApi = {
  async logout() {
    const res = await api.post('/logout', {});
    return res.data;
  },
  async login(email, password) {
    const res = await api.post('/login', { email, password });
    return res.data;
  },

  async signup(email, userdata, password, verificationToken) {
    const res = await api.post('/signup', {
      email,
      userdata,
      globalPassword: password,
      verificationToken,
    });
    return res.data;
  },

  async checkEmail(email) {
    const res = await api.post('/emailCheck', { email });
    return res.data;
  },

  async sendOtp(email, purpose = 'signup') {
    const res = await api.post('/send-otp', { email, purpose });
    return res.data;
  },

  async verifyOtp(email, otp, purpose = 'signup') {
    const res = await api.post('/verify-otp', { email, otp, purpose });
    return res.data;
  },

  async forgotPassword(forgetemail) {
    const res = await api.post('/forgetpass', { forgetemail });
    return res.data;
  },

  async updatePassword(email, newpassword, verificationToken) {
    const res = await api.post('/updtpass', { email, newpassword, verificationToken });
    return res.data;
  },

  async googleLogin(token) {
    const res = await api.post('/google-login', { token });
    return res.data;
  },

  async getProfile() {
    const res = await api.get('/userprofile');
    return res.data;
  },
};
