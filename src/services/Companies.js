import instance from '../apis/app.js';

class CompaniesService {
  getAll = (params = {}) => instance.get('/api/companies', { params });
  getById = (id) => instance.get(`/api/companies/${id}`);
  getCurrent = () => instance.get('/api/companies/me');
  create = (data) => instance.post('/api/companies', data);
  createWithAdmin = (data) => instance.post('/api/companies/create-with-admin', data);
  update = (id, data) => instance.put(`/api/companies/${id}`, data);
  suspend = (id) => instance.patch(`/api/companies/${id}/suspend`);
  reactivate = (id) => instance.patch(`/api/companies/${id}/reactivate`);
  delete = (id) => instance.delete(`/api/companies/${id}`);
}

const Companies = new CompaniesService();
export default Companies;
