import instance from '../apis/app.js';

class StatusService {
  getStatus = () => instance.get('/api/example/status');
}

const Status = new StatusService();
export default Status;

