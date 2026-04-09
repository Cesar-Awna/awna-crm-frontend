import instance from '../apis/app.js';

class AuthService {
  login = (data) => instance.post('/api/auth/login', data);
  logout = () => instance.post('/api/auth/logout');
  getMe = () => instance.get('/api/auth/me');
  updateProfile = (data) => instance.patch('/api/auth/profile', data);
  changePassword = (data) => instance.patch('/api/auth/change-password', data);
}

const Auth = new AuthService();
export default Auth;

