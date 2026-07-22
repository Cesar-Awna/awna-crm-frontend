import instance from '../apis/app.js';

class MetricsService {
  getMe = () => instance.get('/api/metrics/me');
  getExecutive = () => instance.get('/api/metrics/executive');
  getSupervisor = () => instance.get('/api/metrics/supervisor');
  getConversion = () => instance.get('/api/metrics/conversion');
  getSummary = () => instance.get('/api/metrics/summary');
  getActivity = (params = {}) => instance.get('/api/metrics/activity', { params });
  getActivityCounters = () => instance.get('/api/metrics/activity-counters');
  getExecutiveReport = (params = {}) => instance.get('/api/metrics/executive-report', { params });
}

const Metrics = new MetricsService();
export default Metrics;
