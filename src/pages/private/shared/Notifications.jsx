import React, { useEffect, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import NotificationsService from '../../../services/Notifications.js';

const NOTIFICATION_ICONS = {
  MEETING_TODAY: '📅',
  MEETING_24H: '⏰',
  LEAD_DORMANT: '😴',
  LEAD_STAGNATION_CRITICAL: '🚨',
};

const NOTIFICATION_COLORS = {
  MEETING_TODAY: 'border-l-blue-500 bg-blue-500/10',
  MEETING_24H: 'border-l-amber-500 bg-amber-500/10',
  LEAD_DORMANT: 'border-l-orange-500 bg-orange-500/10',
  LEAD_STAGNATION_CRITICAL: 'border-l-red-500 bg-red-500/10',
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [message, setMessage] = useState(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = filter === 'unread'
        ? await NotificationsService.getUnread()
        : await NotificationsService.getAll();

      if (res?.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      } else {
        setNotifications([]);
      }
    } catch (e) {
      console.error('Error loading notifications:', e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await NotificationsService.markAsRead(id);
      if (res?.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (e) {
      console.error('Error marking as read:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await NotificationsService.markAllAsRead();
      if (res?.success) {
        setMessage(`${res.data?.modifiedCount || 0} notificaciones marcadas como leídas.`);
        await loadNotifications();
      }
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  };

  const getIcon = (type) => NOTIFICATION_ICONS[type] || '🔔';
  const getColor = (type) => NOTIFICATION_COLORS[type] || 'border-l-slate-500 bg-slate-500/10';

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notificaciones</h1>
            <p className="text-xs text-slate-400">Centro de notificaciones y alertas.</p>
          </div>
          {unreadCount > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              Marcar todas como leídas
            </Button>
          )}
        </header>

        {message && (
          <div className="mb-4 rounded-md bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-slate-100">{notifications.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Sin leer</p>
              <p className="text-2xl font-bold text-amber-400">{unreadCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
          <Button
            type="button"
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Sin leer ({unreadCount})
          </Button>
        </div>

        {/* Notifications list */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filter === 'unread' ? 'Notificaciones sin leer' : 'Todas las notificaciones'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Cargando notificaciones…</p>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-4xl mb-2">🔔</p>
                <p className="text-lg text-slate-300">No hay notificaciones</p>
                <p className="text-sm text-slate-500">
                  {filter === 'unread'
                    ? 'Todas las notificaciones han sido leídas.'
                    : 'Aún no tienes notificaciones.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`flex items-start gap-4 rounded-lg border-l-4 p-4 transition-all ${
                      getColor(notif.type)
                    } ${notif.readAt ? 'opacity-60' : ''}`}
                  >
                    {/* Icon */}
                    <div className="text-2xl">{getIcon(notif.type)}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium ${notif.readAt ? 'text-slate-400' : 'text-slate-100'}`}>
                          {notif.title || 'Notificación'}
                        </p>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(notif.createdAt)}
                        </span>
                      </div>
                      {notif.body && (
                        <p className="mt-1 text-sm text-slate-400">{notif.body}</p>
                      )}
                      {notif.type && (
                        <span className="mt-2 inline-block rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                          {notif.type.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {!notif.readAt && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkAsRead(notif._id)}
                        className="text-slate-400 hover:text-slate-100"
                      >
                        ✓
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tipos de notificación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span className="text-slate-400">Reunión hoy</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⏰</span>
                <span className="text-slate-400">Reunión en 24h</span>
              </div>
              <div className="flex items-center gap-2">
                <span>😴</span>
                <span className="text-slate-400">Lead dormido</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🚨</span>
                <span className="text-slate-400">Estancamiento crítico</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Notifications;
