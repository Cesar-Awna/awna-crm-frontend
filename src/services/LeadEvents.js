import instance from '../apis/app.js';

class LeadEventsService {
  getAll = (params = {}) => instance.get('/api/lead-events', { params });
  getByLeadId = (leadId) => instance.get(`/api/lead-events/lead/${leadId}`);
  getById = (id) => instance.get(`/api/lead-events/${id}`);
  create = (data) => instance.post('/api/lead-events', data);
}

const LeadEvents = new LeadEventsService();
export default LeadEvents;
