import instance from '../apis/app.js';

class BusinessUnitsService {
  getAll = (params = {}) => instance.get('/api/business-units', { params });
  getById = (id, params = {}) => instance.get(`/api/business-units/${id}`, { params });
  create = (data) => instance.post('/api/business-units', data);
  update = (id, data, params = {}) => instance.put(`/api/business-units/${id}`, data, { params });
  delete = (id, params = {}) => instance.delete(`/api/business-units/${id}`, { params });
  getSchema = (id) => instance.get(`/api/business-units/${id}/schema`);
  updateSchema = (id, data) => instance.put(`/api/business-units/${id}/schema`, data);
}

const BusinessUnits = new BusinessUnitsService();
export default BusinessUnits;
