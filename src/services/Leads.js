import instance from '../apis/app.js';

class LeadsService {
  getAll = (params = {}) => instance.get('/api/leads', { params });
  getById = (id, params = {}) => instance.get(`/api/leads/${id}`, { params });
  getStats = () => instance.get('/api/leads/stats');
  getDormant = () => instance.get('/api/leads/dormant');
  getStagnant = (params = {}) => instance.get('/api/leads/stagnant', { params });
  getWorkload = () => instance.get('/api/leads/workload');
  getUnassigned = () => instance.get('/api/leads/unassigned');
  getMyDaySummary = () => instance.get('/api/leads/my-day/summary');
  search = (params = {}) => instance.get('/api/leads/search', { params });
  create = (data) => instance.post('/api/leads', data);
  update = (id, data) => instance.put(`/api/leads/${id}`, data);
  assign = (id, data) => instance.post(`/api/leads/${id}/assign`, data);
  bulkAssign = (data) => instance.post('/api/leads/bulk-assign', data);
  changeStage = (id, data) => instance.post(`/api/leads/${id}/change-stage`, data);
  markWon = (id, data) => instance.patch(`/api/leads/${id}/mark-won`, data);
  markLost = (id, data) => instance.patch(`/api/leads/${id}/mark-lost`, data);
}

const Leads = new LeadsService();
export default Leads;
