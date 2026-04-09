import instance from '../apis/app.js';

class FunnelStagesService {
  getAll = (params = {}) => instance.get('/api/funnel-stages', { params });
  getById = (id, params = {}) => instance.get(`/api/funnel-stages/${id}`, { params });
  getByBusinessUnit = (businessUnitId) =>
    instance.get(`/api/funnel-stages/business-unit/${businessUnitId}`);
  create = (data) => instance.post('/api/funnel-stages', data);
  update = (id, data) => instance.put(`/api/funnel-stages/${id}`, data);
  delete = (id) => instance.delete(`/api/funnel-stages/${id}`);
}

const FunnelStages = new FunnelStagesService();
export default FunnelStages;
