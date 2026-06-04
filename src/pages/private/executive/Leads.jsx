import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadsService from '../../../services/Leads.js';
import BusinessUnitsService from '../../../services/BusinessUnits.js';
import { getStoredSession } from '../../../lib/session.js';
import {
  LEAD_STATUSES,
  getStatusLabel,
} from '../../../lib/leadFormMappers.js';
import { exportCSV } from '../../../utils/exportCSV.js';

const STATUS_COLORS = {
  NUEVO: '#38bdf8',
  DATO_ERRADO: '#f87171',
  CONTACTADO: '#60a5fa',
  INTERESADO: '#a78bfa',
  COTIZACION_ENVIADA: '#fbbf24',
  EN_SEGUIMIENTO: '#f97316',
  CERRADO_GANADO: '#10b981',
  CLIENTE: '#059669',
  CERRADO_PERDIDO: '#ef4444',
  NO_INTERESADO: '#fb7185',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getLeadField = (lead, key) => lead?.fields?.[key] ?? lead?.[key] ?? '—';

const Leads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFuente, setFilterFuente] = useState('');
  const [filterProducto, setFilterProducto] = useState('');
  const [search, setSearch] = useState('');
  const [buSchema, setBuSchema] = useState([]);
  const [pipelineStages, setPipelineStages] = useState([]);
  const [leadStats, setLeadStats] = useState({ openCount: 0, wonCount: 0, lostCount: 0, invalidCount: 0 });
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const loadSchema = async () => {
      const session = getStoredSession();
      const buId = session?.businessUnitIds?.[0];
      if (!buId) return;
      try {
        const res = await BusinessUnitsService.getSchema(buId);
        if (res?.success && res.data) {
          setBuSchema(res.data.leadSchema || []);
          setPipelineStages(res.data.pipelineStages || []);
        }
      } catch {
        // fallback to defaults
      }
    };
    loadSchema();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const listParams = {
          status: filterStatus || undefined,
          limit: 100,
          page: 1,
        };
        const [leadsRes, statsRes] = await Promise.all([
          LeadsService.getAll(listParams),
          LeadsService.getStats({ status: filterStatus || undefined }),
        ]);

        if (leadsRes?.success) {
          setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : []);
        } else {
          setLeads([]);
          setLoadError(leadsRes?.message || 'No se pudieron cargar los leads.');
        }
        if (statsRes?.success) {
          setLeadStats({
            openCount: statsRes.data.openCount || 0,
            wonCount: statsRes.data.wonCount || 0,
            lostCount: statsRes.data.lostCount || 0,
            invalidCount: statsRes.data.invalidCount || 0,
          });
        }
      } catch (e) {
        console.error('Error loading leads:', e);
        setLeads([]);
        setLoadError(e?.response?.data?.message || e?.message || 'Error al cargar leads.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filterStatus]);

  const handleChangeStatus = async (leadId, newStatus) => {
    try {
      const res = await LeadsService.changeStatus(leadId, newStatus);
      if (res?.success) {
        setLeads((prev) =>
          prev.map((l) => (l._id === leadId ? { ...l, status: newStatus } : l))
        );
      }
    } catch (e) {
      console.error('Error changing status:', e);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (filterFuente && (l.fields?.fuenteLead ?? '') !== filterFuente) return false;
    if (filterProducto && (l.fields?.productoCotizado ?? '') !== filterProducto) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    if ((l.razonSocial || '').toLowerCase().includes(q)) return true;
    if ((l.rutEmpresa || '').toLowerCase().includes(q)) return true;
    if ((l.contactName || '').toLowerCase().includes(q)) return true;
    if (l.fields) {
      return Object.values(l.fields).some((v) =>
        String(v ?? '').toLowerCase().includes(q)
      );
    }
    return false;
  });

  // Dynamic pipeline stages — fall back to LEAD_STATUSES when BU has none
  const stages =
    pipelineStages.length > 0
      ? pipelineStages
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((s) => ({ value: s.key, label: s.label, color: s.color }))
      : LEAD_STATUSES.map((s) => ({ ...s, color: STATUS_COLORS[s.value] }));

  // Columns to show per lead in list and kanban
  const inlineFields = buSchema.filter((f) => f.type !== 'textarea');
  const listCols = inlineFields.length > 0 ? inlineFields.slice(0, 4) : null;
  const cardFields = inlineFields.length > 0 ? inlineFields.slice(0, 3) : null;

  const getLeadsByStatus = (status) => filteredLeads.filter((l) => l.status === status);

  const handleExportCSV = () => {
    const cols = inlineFields.length > 0 ? inlineFields : [
      { key: 'razonSocial',    label: 'Razón Social' },
      { key: 'rutEmpresa',     label: 'RUT' },
      { key: 'nombreContacto', label: 'Contacto' },
      { key: 'telefono',       label: 'Teléfono' },
      { key: 'correo',         label: 'Correo' },
    ];
    const csvData = filteredLeads.map((lead) => {
      const row = {};
      cols.forEach((col) => { row[col.label] = getLeadField(lead, col.key); });
      row['Estado'] = getStatusLabel(lead.status) || lead.status || '—';
      row['Ingreso'] = formatDate(lead.createdAt);
      return row;
    });
    exportCSV(csvData, `leads-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const stageKeySet = new Set(stages.map((s) => s.value));
  const unmatchedLeads = filteredLeads.filter((l) => !stageKeySet.has(l.status));

  const stageTypes = (() => {
    if (pipelineStages.length > 0 && pipelineStages.some((s) => s.stageType && s.stageType !== 'open')) {
      return {
        won:     pipelineStages.filter((s) => s.stageType === 'won').map((s) => s.key),
        lost:    pipelineStages.filter((s) => s.stageType === 'lost').map((s) => s.key),
        invalid: pipelineStages.filter((s) => s.stageType === 'invalid').map((s) => s.key),
      };
    }
    return { won: ['CERRADO_GANADO'], lost: ['CERRADO_PERDIDO'], invalid: ['DATO_ERRADO'] };
  })();
  const closedKeys = [...stageTypes.won, ...stageTypes.lost, ...stageTypes.invalid];
  const totalOpen  = leadStats.openCount ?? filteredLeads.filter((l) => !closedKeys.includes(l.status)).length;
  const wonCount   = leadStats.wonCount ?? filteredLeads.filter((l) => stageTypes.won.includes(l.status)).length;
  const lostCount  = leadStats.lostCount ?? filteredLeads.filter((l) => stageTypes.lost.includes(l.status)).length;
  const invalidCount = leadStats.invalidCount ?? filteredLeads.filter((l) => stageTypes.invalid.includes(l.status)).length;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-x-auto px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Mis Leads</h1>
            <p className="text-xs text-slate-400">Gestiona tus leads por estado.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/leads/new')}>+ Nuevo Lead</Button>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="border-l-[3px] border-l-sky-500/50 pt-4 text-center">
              <p className="text-xs uppercase text-[var(--muted-fg)]">En gestión</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--input-fg)]">
                {totalOpen}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="border-l-[3px] border-l-emerald-500/50 pt-4 text-center">
              <p className="text-xs uppercase text-[var(--muted-fg)]">Ganados</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--input-fg)]">
                {wonCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="border-l-[3px] border-l-rose-500/45 pt-4 text-center">
              <p className="text-xs uppercase text-[var(--muted-fg)]">Perdidos</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--input-fg)]">
                {lostCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex overflow-hidden rounded-lg border border-[var(--border-color)]">
            <button
              type="button"
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-emerald-500 font-medium text-slate-950'
                  : 'bg-[var(--input-bg)] text-[var(--muted-fg)] hover:bg-[var(--hover-bg)]'
              }`}
              onClick={() => setViewMode('kanban')}
            >
              Kanban
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-emerald-500 font-medium text-slate-950'
                  : 'bg-[var(--input-bg)] text-[var(--muted-fg)] hover:bg-[var(--hover-bg)]'
              }`}
              onClick={() => setViewMode('list')}
            >
              Lista
            </button>
          </div>

          {viewMode === 'list' && (
            <>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)]"
              >
                <option value="">Todos los estados</option>
                {stages.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={filteredLeads.length === 0}
              >
                📥 Exportar CSV
              </Button>
            </>
          )}

          <select
            value={filterFuente}
            onChange={(e) => setFilterFuente(e.target.value)}
            className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)]"
          >
            <option value="">Todas las fuentes</option>
            {['Ads', 'Apolo', 'Referido', 'Otro'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          <select
            value={filterProducto}
            onChange={(e) => setFilterProducto(e.target.value)}
            className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)]"
          >
            <option value="">Todos los productos</option>
            {['Mora Control', 'Reporte Interactivo'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lead…"
            className="min-w-[280px] flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)]"
          />
        </div>

        {loadError ? (
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {loadError}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-400">Cargando leads…</p>
        ) : viewMode === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((s) => {
              const statusLeads = getLeadsByStatus(s.value);
              const accent = s.color || STATUS_COLORS[s.value] || '#94a3b8';
              return (
                <div
                  key={s.value}
                  className="flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--panel-bg)]"
                >
                  <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-[var(--border-color)]"
                      style={{ backgroundColor: accent }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 text-sm font-medium text-[var(--input-fg)]">
                      <span className="truncate">{s.label}</span>{' '}
                      <span className="font-normal text-[var(--muted-fg)]">({statusLeads.length})</span>
                    </div>
                  </div>
                  <div className="min-h-[200px] space-y-2 p-2">
                    {statusLeads.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[var(--muted-fg)]">
                        Sin leads
                      </p>
                    ) : (
                      statusLeads.map((lead) => (
                        <div
                          key={lead._id}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/leads/${lead._id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') navigate(`/leads/${lead._id}`);
                          }}
                          className="cursor-pointer rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)]/60 p-3 transition-colors hover:border-emerald-500/40"
                        >
                          {cardFields ? (
                            <>
                              <p className="mb-1 truncate text-sm font-medium text-[var(--input-fg)]">
                                {getLeadField(lead, cardFields[0]?.key) || `Lead #${lead._id.slice(-6)}`}
                              </p>
                              {cardFields[1] && (
                                <p className="mb-1 truncate text-xs text-[var(--muted-fg)]">
                                  {getLeadField(lead, cardFields[1].key)}
                                </p>
                              )}
                              {cardFields[2] && (
                                <p className="mb-2 truncate text-xs text-[var(--muted-fg)]">
                                  {getLeadField(lead, cardFields[2].key)}
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="mb-1 truncate text-sm font-medium text-[var(--input-fg)]">
                                {lead.razonSocial || `Lead #${lead._id.slice(-6)}`}
                              </p>
                              <p className="mb-1 truncate text-xs text-[var(--muted-fg)]">
                                {lead.rutEmpresa || '—'}
                              </p>
                              <p className="mb-2 truncate text-xs text-[var(--muted-fg)]">
                                {lead.contactName} · {lead.contactPhone || lead.contactEmail || '—'}
                              </p>
                            </>
                          )}
                          <p className="text-[10px] text-[var(--muted-fg)]">
                            {formatDate(lead.createdAt)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {stages.filter((x) => x.value !== s.value)
                              .slice(0, 4)
                              .map((x) => (
                                <button
                                  key={x.value}
                                  type="button"
                                  className="max-w-[5rem] truncate rounded border border-[var(--border-color)] bg-[var(--hover-bg)] px-2 py-1 text-[10px] text-[var(--muted-fg-2)] hover:bg-[var(--input-bg)]"
                                  style={{ borderLeft: `3px solid ${x.color || STATUS_COLORS[x.value] || '#94a3b8'}` }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChangeStatus(lead._id, x.value);
                                  }}
                                  title={`Mover a ${x.label}`}
                                >
                                  {x.label.slice(0, 8)}
                                </button>
                              ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
            {unmatchedLeads.length > 0 ? (
              <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-amber-500/40 bg-[var(--panel-bg)]">
                <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 ring-1 ring-[var(--border-color)]"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 text-sm font-medium text-[var(--input-fg)]">
                    Otros estados{' '}
                    <span className="font-normal text-[var(--muted-fg)]">({unmatchedLeads.length})</span>
                  </div>
                </div>
                <div className="min-h-[200px] space-y-2 p-2">
                  {unmatchedLeads.map((lead) => (
                    <div
                      key={lead._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/leads/${lead._id}`)}
                      className="cursor-pointer rounded-lg border border-amber-500/30 bg-[var(--input-bg)]/60 p-3"
                    >
                      <p className="truncate text-sm font-medium text-[var(--input-fg)]">
                        {lead.razonSocial || `Lead #${lead._id.slice(-6)}`}
                      </p>
                      <p className="mt-1 text-xs text-amber-300/90">
                        Estado: {getStatusLabel(lead.status) || lead.status || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-4">
              {filteredLeads.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  No hay leads que coincidan con los filtros.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-slate-400">
                        {listCols
                          ? listCols.map((col) => (
                              <th key={col.key} className="pb-2 pr-4">{col.label}</th>
                            ))
                          : (
                            <>
                              <th className="pb-2 pr-4">Razón Social</th>
                              <th className="pb-2 pr-4">RUT</th>
                              <th className="pb-2 pr-4">Contacto</th>
                              <th className="pb-2 pr-4">Teléfono</th>
                            </>
                          )}
                        <th className="pb-2 pr-4">Estado</th>
                        <th className="pb-2 pr-4">Ingreso</th>
                        <th className="pb-2 pr-2">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr key={lead._id} className="border-b border-slate-800">
                          {listCols
                            ? listCols.map((col) => (
                                <td key={col.key} className="max-w-[160px] truncate py-2 pr-4 text-xs">
                                  {getLeadField(lead, col.key)}
                                </td>
                              ))
                            : (
                              <>
                                <td className="max-w-[160px] truncate py-2 pr-4 text-xs">{lead.razonSocial || '—'}</td>
                                <td className="py-2 pr-4 font-mono text-xs">{lead.rutEmpresa || '—'}</td>
                                <td className="py-2 pr-4 text-xs">{lead.contactName || '—'}</td>
                                <td className="py-2 pr-4 text-xs">{lead.contactPhone || '—'}</td>
                              </>
                            )}
                          <td className="py-2 pr-4">
                            <span
                              className="rounded px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: `${STATUS_COLORS[lead.status] || '#94a3b8'}22`,
                                color: STATUS_COLORS[lead.status] || '#94a3b8',
                              }}
                            >
                              {getStatusLabel(lead.status)}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-xs">{formatDate(lead.createdAt)}</td>
                          <td className="py-2 pr-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => navigate(`/leads/${lead._id}`)}
                            >
                              Abrir
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Leads;
