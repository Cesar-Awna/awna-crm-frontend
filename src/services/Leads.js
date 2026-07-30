import instance from '../apis/app.js';

class LeadsService {
  getAll = (params = {}) => instance.get('/api/leads', { params });
  getById = (id, params = {}) => instance.get(`/api/leads/${id}`, { params });
  getStats = (params = {}) => instance.get('/api/leads/stats', { params });
  getUnassigned = () => instance.get('/api/leads/unassigned');
  getMyDaySummary = () => instance.get('/api/leads/my-day/summary');
  getUpcomingFollowups = () => instance.get('/api/leads/my-day/followups');
  search = (params = {}) => instance.get('/api/leads/search', { params });
  create = (data) => instance.post('/api/leads', data);
  update = (id, data) => instance.put(`/api/leads/${id}`, data);
  assign = (id, data) => instance.post(`/api/leads/${id}/assign`, data);
  bulkAssign = (data) => instance.post('/api/leads/bulk-assign', data);
  bulkImport = (data) => instance.post('/api/leads/bulk-import', data);
  changeStatus = (id, status) => instance.post(`/api/leads/${id}/change-status`, { status });
  addNote = (id, note) => instance.post(`/api/leads/${id}/add-note`, { note });
  registerContact = (id, data) => instance.post(`/api/leads/${id}/register-contact`, data);
  logActivity = (id, data) => instance.post(`/api/leads/${id}/log-activity`, data);
  logActivityWithFile = (id, formData) => instance.post(`/api/leads/${id}/log-activity-with-file`, formData, {
    headers: { 'Content-Type': undefined },
  });
  dismissFollowup = (id) => instance.patch(`/api/leads/${id}/dismiss-followup`);
  getEvents = (id) => instance.get(`/api/leads/${id}/events`);
  deleteLead = (id) => instance.delete(`/api/leads/${id}`);
}

const Leads = new LeadsService();
export default Leads;
