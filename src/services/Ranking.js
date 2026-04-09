import instance from '../apis/app.js';

class RankingService {
  getWeekly = () => instance.get('/api/ranking/weekly');
  getMonthly = () => instance.get('/api/ranking/monthly');
  getMe = (params = {}) => instance.get('/api/ranking/me', { params });
  getByUser = (userId, params = {}) => instance.get(`/api/ranking/user/${userId}`, { params });
}

const Ranking = new RankingService();
export default Ranking;
