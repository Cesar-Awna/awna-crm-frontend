import React, { useEffect, useState } from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import TicketsService from '../../../services/Tickets.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import {
  TICKET_TYPE_LABELS,
  TICKET_STATUS_META,
} from '../../../components/TicketsSection.jsx';

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TicketsAdmin = () => {
  const [tickets, setTickets] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', type: '', businessUnitId: '' });
  const [respondingId, setRespondingId] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.businessUnitId) params.businessUnitId = filters.businessUnitId;
      const res = await TicketsService.getAll(params);
      if (res?.success && Array.isArray(res.data)) {
        setTickets(res.data);
      } else {
        setTickets([]);
      }
    } catch (e) {
      console.error('Error loading tickets:', e);
      setError('Error cargando los tickets.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [filters]);

  useEffect(() => {
    BusinessUnitsService.getAll()
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setBusinessUnits(res.data);
      })
      .catch(() => setBusinessUnits([]));
  }, []);

  const buName = (id) => {
    if (!id) return '—';
    const bu = businessUnits.find((b) => String(b._id) === String(id));
    return bu?.name || bu?.code || '—';
  };

  const handleTake = async (id) => {
    setSaving(true);
    try {
      const res = await TicketsService.updateStatus(id, { status: 'EN_REVISION' });
      if (res?.success) await loadTickets();
    } catch (e) {
      console.error('Error taking ticket:', e);
      setError('No se pudo actualizar el ticket.');
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (id) => {
    setSaving(true);
    try {
      const res = await TicketsService.updateStatus(id, {
        status: 'RESUELTO',
        response: responseText.trim(),
      });
      if (res?.success) {
        setRespondingId(null);
        setResponseText('');
        await loadTickets();
      }
    } catch (e) {
      console.error('Error resolving ticket:', e);
      setError('No se pudo resolver el ticket.');
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    total: tickets.length,
    abiertos: tickets.filter((t) => t.status === 'ABIERTO').length,
    enRevision: tickets.filter((t) => t.status === 'EN_REVISION').length,
    resueltos: tickets.filter((t) => t.status === 'RESUELTO').length,
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Tickets de soporte</h1>
          <p className="text-xs text-slate-400">
            Reportes de problemas y solicitudes de los usuarios del CRM.
          </p>
        </header>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-slate-100">{counts.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Abiertos</p>
              <p className="text-2xl font-bold text-amber-400">{counts.abiertos}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">En revisión</p>
              <p className="text-2xl font-bold text-blue-400">{counts.enRevision}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Resueltos</p>
              <p className="text-2xl font-bold text-emerald-400">{counts.resueltos}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Todos los estados</option>
            {Object.entries(TICKET_STATUS_META).map(([value, meta]) => (
              <option key={value} value={value}>{meta.label}</option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {businessUnits.length > 0 && (
            <select
              value={filters.businessUnitId}
              onChange={(e) => setFilters((f) => ({ ...f, businessUnitId: e.target.value }))}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Todas las BU</option>
              {businessUnits.map((bu) => (
                <option key={bu._id} value={bu._id}>{bu.name || bu.code}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-500/20 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Tickets list */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets ({tickets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Cargando tickets…</p>
            ) : tickets.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No hay tickets con estos filtros.
              </p>
            ) : (
              <div className="space-y-4">
                {tickets.map((t) => {
                  const statusMeta = TICKET_STATUS_META[t.status] || TICKET_STATUS_META.ABIERTO;
                  return (
                    <div
                      key={t._id}
                      className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-100">{t.title}</p>
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-medium ${statusMeta.className}`}
                            >
                              {statusMeta.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {t.userFullName || 'Usuario'} · {buName(t.businessUnitId)} ·{' '}
                            {TICKET_TYPE_LABELS[t.type] || t.type} · {formatDateTime(t.createdAt)}
                          </p>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          {t.status === 'ABIERTO' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              onClick={() => handleTake(t._id)}
                            >
                              Tomar
                            </Button>
                          )}
                          {t.status !== 'RESUELTO' && respondingId !== t._id && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={saving}
                              onClick={() => {
                                setRespondingId(t._id);
                                setResponseText('');
                              }}
                            >
                              Resolver
                            </Button>
                          )}
                        </div>
                      </div>

                      {t.description && (
                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
                          {t.description}
                        </p>
                      )}

                      {t.evidenceUrl && (
                        /\.(png|jpe?g|webp|gif)(\?|$)/i.test(t.evidenceUrl) ||
                        t.evidenceUrl.includes('res.cloudinary.com') ? (
                          <a
                            href={t.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block"
                            title="Abrir imagen completa"
                          >
                            <img
                              src={t.evidenceUrl}
                              alt="Captura adjunta"
                              className="max-h-48 rounded-md border border-slate-700 hover:opacity-80"
                            />
                          </a>
                        ) : (
                          <a
                            href={t.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm text-blue-400 underline hover:text-blue-300"
                          >
                            Ver evidencia (video)
                          </a>
                        )
                      )}

                      {t.response && (
                        <p className="mt-3 rounded bg-slate-800/80 px-3 py-2 text-sm text-slate-300">
                          <span className="text-slate-500">Respuesta: </span>
                          {t.response}
                        </p>
                      )}

                      {respondingId === t._id && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder="Escribe la respuesta/solución para el usuario…"
                            rows={3}
                            className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={saving}
                              onClick={() => handleResolve(t._id)}
                            >
                              {saving ? 'Guardando…' : 'Marcar como resuelto'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              onClick={() => {
                                setRespondingId(null);
                                setResponseText('');
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TicketsAdmin;
