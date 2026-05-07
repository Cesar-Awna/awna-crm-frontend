import instance from '../apis/app.js';

class AdminService {
  getStats = () => instance.get('/api/admin/stats');
}

const Admin = new AdminService();
export default Admin;
