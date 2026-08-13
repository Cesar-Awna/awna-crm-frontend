import instance from '../apis/app.js';

class TicketsService {
  create = (payload) =>
    instance.post(
      '/api/tickets',
      payload,
      payload instanceof FormData ? { headers: { 'Content-Type': undefined } } : undefined
    );
  getMine = () => instance.get('/api/tickets/mine');
  getAll = (params = {}) => instance.get('/api/tickets', { params });
  updateStatus = (id, payload) => instance.patch(`/api/tickets/${id}/status`, payload);
}

const Tickets = new TicketsService();
export default Tickets;
