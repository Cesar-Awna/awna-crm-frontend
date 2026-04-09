import instance from '../apis/app.js';

class NotificationsService {
  getAll = () => instance.get('/api/notifications');
  getUnread = () => instance.get('/api/notifications/unread');
  markAsRead = (id) => instance.patch(`/api/notifications/${id}/read`);
  markAllAsRead = () => instance.patch('/api/notifications/read-all');
}

const Notifications = new NotificationsService();
export default Notifications;
