import instance from '../apis/app.js';

class MetricsService {
  getMe = () => instance.get('/api/metrics/me');
  getExecutive = () => instance.get('/api/metrics/executive');
  getSupervisor = () => instance.get('/api/metrics/supervisor');
  getConversion = () => instance.get('/api/metrics/conversion');
  getFunnel = () => instance.get('/api/metrics/funnel');
  getSummary = () => instance.get('/api/metrics/summary');
}

const Metrics = new MetricsService();
export default Metrics;
