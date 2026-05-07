import instance from '../apis/app.js';

class UsersService {
  getAll = (params = {}) => instance.get('/api/users', { params });
  getExecutives = (params = {}) => instance.get('/api/users/executives', { params });
  getById = (id, params = {}) => instance.get(`/api/users/${id}`, { params });
  create = (data) => instance.post('/api/users', data);
  update = (id, data, params = {}) => instance.put(`/api/users/${id}`, data, { params });
  delete = (id, params = {}) => instance.delete(`/api/users/${id}`, { params });
  assignBusinessUnits = (id, payload) =>
    instance.patch(`/api/users/${id}/assign-business-units`, payload);
  changePassword = (payload) => instance.patch('/api/users/me/change-password', payload);
}

const Users = new UsersService();
export default Users;
