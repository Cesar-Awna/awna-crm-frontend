import instance from '../apis/app.js';

class CompaniesService {
  getAll = () => instance.get('/api/companies');
  getById = (id) => instance.get(`/api/companies/${id}`);
  getCurrent = () => instance.get('/api/companies/me');
  create = (data) => instance.post('/api/companies', data);
  update = (id, data) => instance.put(`/api/companies/${id}`, data);
  delete = (id) => instance.delete(`/api/companies/${id}`);
}

const Companies = new CompaniesService();
export default Companies;
