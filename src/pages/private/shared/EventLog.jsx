import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import LeadEventsService from '../../../services/LeadEvents.js';
import UsersService from '../../../services/Users.js';

const EVENT_COLORS = {
  CONTACT_ATTEMPT: '#64748b',
  CONTACT_SUCCESS: '#38bdf8',
  WON: '#10b981',
  LOST: '#ef4444',
  NOTE_ADDED: '#a78bfa',
  CALL: '#60a5fa',
  FOLLOWUP: '#f97316',
  WHATSAPP_SENT: '#10b981',
  EMAIL_SENT: '#6366f1',
  QUOTE_SENT: '#fbbf24',
  RESCHEDULE: '#eab308',
};

const EVENT_LABELS = {
  CONTACT_ATTEMPT: 'Intento de contacto',
  CONTACT_SUCCESS: 'Contacto exitoso',
  WON: 'Lead ganado',
  LOST: 'Lead perdido',
  NOTE_ADDED: 'Nota añadida',
  CALL: 'Llamada',
  FOLLOWUP: 'Seguimiento',
  WHATSAPP_SENT: 'WhatsApp enviado',
  EMAIL_SENT: 'Email enviado',
  QUOTE_SENT: 'Cotización enviada',
  RESCHEDULE: 'Reprogramado',
};

const EventLog = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executives, setExecutives] = useState([]);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [eventsRes, execRes] = await Promise.all([
          LeadEventsService.getAll({ limit: 50 }),
          UsersService.getExecutives(),
        ]);
        if (eventsRes?.success) setEvents(eventsRes.data || []);
        if (execRes?.success) setExecutives(execRes.data || []);
      } catch (e) {
        console.error('Error loading event log:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Historial de eventos</h1>
          <p className="text-xs text-slate-400">Últimos 50 eventos registrados del sistema.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Cargando...</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-slate-400">No hay eventos registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="pb-2 pr-4">Fecha y hora</th>
                      <th className="pb-2 pr-4">Lead</th>
                      <th className="pb-2 pr-4">Tipo de evento</th>
                      <th className="pb-2 pr-4">Usuario</th>
                      <th className="pb-2">Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event._id} className="border-b border-slate-800 hover:bg-slate-800/30">
                        <td className="py-2 pr-4 text-xs text-slate-400">{formatDateTime(event.eventAt)}</td>
                        <td className="py-2 pr-4">
                          <button
                            onClick={() => navigate(`/leads/${event.leadId}`)}
                            className="text-xs text-sky-400 hover:underline"
                          >
                            {event.leadId?.toString().slice(-6) || '—'}
                          </button>
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className="inline-block rounded px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${EVENT_COLORS[event.eventType] || '#64748b'}33`,
                              color: EVENT_COLORS[event.eventType] || '#64748b',
                            }}
                          >
                            {EVENT_LABELS[event.eventType] || event.eventType}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-xs">
                          {executives.find((e) => e._id === event.userId)?.fullName || '—'}
                        </td>
                        <td className="py-2 text-xs text-slate-400">
                          {event.metadata?.note || event.metadata?.outcome || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EventLog;

