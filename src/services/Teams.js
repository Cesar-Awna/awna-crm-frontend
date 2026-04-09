import instance from '../apis/app.js';

class TeamsService {
  getAll = (params = {}) => instance.get('/api/teams', { params });
  getById = (id, params = {}) => instance.get(`/api/teams/${id}`, { params });
  getMembers = (id) => instance.get(`/api/teams/${id}/members`);
  create = (data) => instance.post('/api/teams', data);
  update = (id, data) => instance.put(`/api/teams/${id}`, data);
  delete = (id) => instance.delete(`/api/teams/${id}`);
}

const Teams = new TeamsService();
export default Teams;
