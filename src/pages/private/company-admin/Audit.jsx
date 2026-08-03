import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadEventsService from '../../../services/LeadEvents.js';
import UsersService from '../../../services/Users.js';
import { usePagination } from '../../../hooks/usePagination.js';
import PaginationControls from '../../../components/PaginationControls.jsx';
import { exportCSV } from '../../../utils/exportCSV.js';

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

const Audit = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [executives, setExecutives] = useState([]);
  const pagination = usePagination(1, 20);

  const [filters, setFilters] = useState({
    eventType: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
  });

  React.useEffect(() => {
    const loadExecutives = async () => {
      try {
        const res = await UsersService.getExecutives({ limit: 1000 });
        if (res?.success) setExecutives(res.data || []);
      } catch (e) {
        console.error('Error loading executives:', e);
      }
    };
    loadExecutives();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
      };
      if (filters.eventType) params.eventType = filters.eventType;
      if (filters.userId) params.userId = filters.userId;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const res = await LeadEventsService.getAll(params);
      if (res?.success && Array.isArray(res.data)) {
        setEvents(res.data);
        pagination.updatePaginationData(res.pagination);
      }
    } catch (e) {
      console.error('Error loading events:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadEvents();
  }, [pagination.currentPage, pagination.limit]);

  React.useEffect(() => {
    pagination.reset();
  }, [filters]);

  const handleExport = () => {
    const csvData = events.map((event) => ({
      'Fecha': new Date(event.eventAt).toLocaleDateString('es-CL'),
      'Hora': new Date(event.eventAt).toLocaleTimeString('es-CL'),
      'Tipo de evento': EVENT_LABELS[event.eventType] || event.eventType,
      'Lead ID': event.leadId || '—',
      'Ejecutivo': executives.find((e) => e._id === event.userId)?.fullName || '—',
      'Detalles': event.metadata?.note || event.metadata?.outcome || '—',
    }));
    exportCSV(csvData, `auditoria-${new Date().toISOString().split('T')[0]}.csv`);
  };

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
          <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
          <p className="text-xs text-slate-400">Registro completo de eventos y actividades de la empresa.</p>
        </header>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.eventType}
                onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(EVENT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
              >
                <option value="">Todos los ejecutivos</option>
                {executives.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.fullName}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
              />

              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50"
              />

              <Button
                size="sm"
                variant="outline"
                onClick={() => setFilters({ eventType: '', userId: '', dateFrom: '', dateTo: '' })}
              >
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Historial de eventos ({events.length})</CardTitle>
              <Button size="sm" onClick={handleExport} disabled={loading || !events.length}>
                📥 Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Cargando...</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-slate-400">No hay eventos con los filtros seleccionados.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-slate-400">
                        <th className="pb-2 pr-4">Fecha y hora</th>
                        <th className="pb-2 pr-4">Lead</th>
                        <th className="pb-2 pr-4">Tipo de evento</th>
                        <th className="pb-2 pr-4">Ejecutivo</th>
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
                {events.length > 0 && (
                  <PaginationControls
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    limit={pagination.limit}
                    totalDocs={pagination.totalDocs}
                    hasNextPage={pagination.hasNextPage}
                    hasPrevPage={pagination.hasPrevPage}
                    onPageChange={pagination.goToPage}
                    onLimitChange={pagination.changeLimit}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Audit;
