import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import LeadsService from '../../../services/Leads.js';
import FunnelStagesService from '../../../services/FunnelStages.js';

const Leads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban');
  const [filterStatus, setFilterStatus] = useState('OPEN');
  const [filterStage, setFilterStage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [leadsRes, stagesRes] = await Promise.all([
          LeadsService.getAll({ status: filterStatus || undefined, stageId: filterStage || undefined }),
          FunnelStagesService.getAll(),
        ]);

        if (leadsRes?.success) {
          setLeads(leadsRes.data || []);
        }
        if (stagesRes?.success) {
          setStages(stagesRes.data || []);
        }
      } catch (e) {
        console.error('Error loading leads:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filterStatus, filterStage]);

  const getStageName = (stageId) => {
    const stage = stages.find((s) => s._id === stageId);
    return stage?.name || '—';
  };

  const getStageColor = (stageId) => {
    const stage = stages.find((s) => s._id === stageId);
    return stage?.color || '#64748b';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getLeadsByStage = (stageId) => {
    return leads.filter((l) => l.currentStageId === stageId);
  };

  const handleChangeStage = async (leadId, newStageId) => {
    try {
      const res = await LeadsService.changeStage(leadId, { stageId: newStageId });
      if (res?.success) {
        setLeads((prev) =>
          prev.map((l) => (l._id === leadId ? { ...l, currentStageId: newStageId } : l))
        );
      }
    } catch (e) {
      console.error('Error changing stage:', e);
    }
  };

  const handleMarkWon = async (leadId) => {
    try {
      const res = await LeadsService.markWon(leadId, {});
      if (res?.success) {
        setLeads((prev) => prev.map((l) => (l._id === leadId ? { ...l, status: 'WON' } : l)));
      }
    } catch (e) {
      console.error('Error marking won:', e);
    }
  };

  const handleMarkLost = async (leadId) => {
    try {
      const res = await LeadsService.markLost(leadId, {});
      if (res?.success) {
        setLeads((prev) => prev.map((l) => (l._id === leadId ? { ...l, status: 'LOST' } : l)));
      }
    } catch (e) {
      console.error('Error marking lost:', e);
    }
  };

  const openLeads = leads.filter((l) => l.status === 'OPEN').length;
  const wonLeads = leads.filter((l) => l.status === 'WON').length;
  const lostLeads = leads.filter((l) => l.status === 'LOST').length;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8 overflow-x-auto">
        <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Mis Leads</h1>
            <p className="text-xs text-slate-400">Gestiona tus oportunidades de venta.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/leads/new')}>+ Nuevo Lead</Button>
          </div>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="border-l-[3px] border-l-sky-500/50 pt-4 text-center">
              <p className="text-xs uppercase text-[var(--muted-fg)]">Abiertos</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--input-fg)]">
                {openLeads}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="border-l-[3px] border-l-emerald-500/50 pt-4 text-center">
              <p className="text-xs uppercase text-[var(--muted-fg)]">Ganados</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--input-fg)]">
                {wonLeads}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="border-l-[3px] border-l-rose-500/45 pt-4 text-center">
              <p className="text-xs uppercase text-[var(--muted-fg)]">Perdidos</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--input-fg)]">
                {lostLeads}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
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

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)]"
          >
            <option value="">Todos los estados</option>
            <option value="OPEN">Abiertos</option>
            <option value="WON">Ganados</option>
            <option value="LOST">Perdidos</option>
          </select>

          {viewMode === 'list' && (
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-fg)]"
            >
              <option value="">Todas las etapas</option>
              {stages.map((stage) => (
                <option key={stage._id} value={stage._id}>
                  {stage.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando leads…</p>
        ) : viewMode === 'kanban' ? (
          /* Kanban View */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const stageLeads = getLeadsByStage(stage._id);
              const accent = stage.color || '#64748b';
              return (
                <div
                  key={stage._id}
                  className="flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--panel-bg)]"
                >
                  <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-[var(--border-color)]"
                      style={{ backgroundColor: accent }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 text-sm font-medium text-[var(--input-fg)]">
                      <span className="truncate">{stage.name}</span>{' '}
                      <span className="font-normal text-[var(--muted-fg)]">({stageLeads.length})</span>
                    </div>
                  </div>
                  <div className="min-h-[200px] space-y-2 p-2">
                    {stageLeads.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[var(--muted-fg)]">
                        Sin leads en esta etapa
                      </p>
                    ) : (
                      stageLeads.map((lead) => (
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
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <p className="flex-1 truncate text-sm font-medium text-[var(--input-fg)]">
                              {lead.clientName?.trim() || `Lead #${lead._id.slice(-6)}`}
                            </p>
                            {lead.estimatedAmount && (
                              <span className="shrink-0 font-mono text-xs text-emerald-400/85">
                                ${lead.estimatedAmount.toLocaleString('es-CL')}
                              </span>
                            )}
                          </div>
                          <p className="mb-2 text-xs text-[var(--muted-fg)]">
                            {lead.nextActionType || 'Sin acción'} •{' '}
                            {formatDate(lead.nextActionAt)}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {stages.map((s) =>
                              s._id !== stage._id ? (
                                <button
                                  key={s._id}
                                  type="button"
                                  className="max-w-[4.5rem] truncate rounded border border-[var(--border-color)] bg-[var(--hover-bg)] px-2 py-1 text-xs text-[var(--muted-fg-2)] hover:bg-[var(--input-bg)]"
                                  style={{ borderLeft: `3px solid ${s.color || '#64748b'}` }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChangeStage(lead._id, s._id);
                                  }}
                                  title={`Mover a ${s.name}`}
                                >
                                  {s.name.slice(0, 6)}
                                </button>
                              ) : null
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {/* Won / Lost columns */}
            <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--panel-bg)]">
              <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500/75 ring-1 ring-[var(--border-color)]"
                  aria-hidden
                />
                <div className="text-sm font-medium text-[var(--input-fg)]">
                  Ganados{' '}
                  <span className="font-normal text-[var(--muted-fg)]">({wonLeads})</span>
                </div>
              </div>
              <div className="min-h-[200px] space-y-2 p-2">
                {leads
                  .filter((l) => l.status === 'WON')
                  .slice(0, 5)
                  .map((lead) => (
                    <div
                      key={lead._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/leads/${lead._id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') navigate(`/leads/${lead._id}`);
                      }}
                      className="cursor-pointer rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)]/60 p-3 transition-colors hover:border-emerald-500/45"
                    >
                      <p className="text-sm font-medium text-[var(--input-fg)]">
                        {lead.clientName?.trim() || `Lead #${lead._id.slice(-6)}`}
                      </p>
                      {lead.estimatedAmount && (
                        <p className="mt-1 font-mono text-xs text-emerald-400/85">
                          ${lead.estimatedAmount.toLocaleString('es-CL')}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--panel-bg)]">
              <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500/70 ring-1 ring-[var(--border-color)]"
                  aria-hidden
                />
                <div className="text-sm font-medium text-[var(--input-fg)]">
                  Perdidos{' '}
                  <span className="font-normal text-[var(--muted-fg)]">({lostLeads})</span>
                </div>
              </div>
              <div className="min-h-[200px] space-y-2 p-2">
                {leads
                  .filter((l) => l.status === 'LOST')
                  .slice(0, 5)
                  .map((lead) => (
                    <div
                      key={lead._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/leads/${lead._id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') navigate(`/leads/${lead._id}`);
                      }}
                      className="cursor-pointer rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)]/60 p-3 transition-colors hover:border-rose-500/40"
                    >
                      <p className="text-sm font-medium text-[var(--input-fg)]">
                        {lead.clientName?.trim() || `Lead #${lead._id.slice(-6)}`}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-fg)]">{lead.lostReason || '—'}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <Card>
            <CardContent className="pt-4">
              {leads.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  No tienes leads que coincidan con los filtros.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-slate-400">
                        <th className="pb-2 pr-4">Cliente</th>
                        <th className="pb-2 pr-4">ID</th>
                        <th className="pb-2 pr-4">Etapa</th>
                        <th className="pb-2 pr-4">Estado</th>
                        <th className="pb-2 pr-4">Próx. acción</th>
                        <th className="pb-2 pr-4">Monto est.</th>
                        <th className="pb-2 pr-2">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead._id} className="border-b border-slate-800">
                          <td className="py-2 pr-4 text-xs max-w-[140px] truncate">
                            {lead.clientName?.trim() || '—'}
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs">
                            #{lead._id.slice(-6)}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: getStageColor(lead.currentStageId) }}
                            />
                            {getStageName(lead.currentStageId)}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-medium ${
                                lead.status === 'WON'
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : lead.status === 'LOST'
                                  ? 'bg-rose-500/15 text-rose-300'
                                  : 'bg-sky-500/15 text-sky-300'
                              }`}
                            >
                              {lead.status}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-xs">
                            <span className="rounded bg-slate-700 px-2 py-0.5 mr-1">
                              {lead.nextActionType || '—'}
                            </span>
                            {formatDate(lead.nextActionAt)}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {lead.estimatedAmount
                              ? `$${lead.estimatedAmount.toLocaleString('es-CL')}`
                              : '—'}
                          </td>
                          <td className="py-2 pr-2">
                            <div className="flex flex-wrap gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => navigate(`/leads/${lead._id}`)}
                              >
                                Abrir
                              </Button>
                              {lead.status === 'OPEN' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() => handleMarkWon(lead._id)}
                                  >
                                    Ganado
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs text-red-400"
                                    onClick={() => handleMarkLost(lead._id)}
                                  >
                                    Perdido
                                  </Button>
                                </>
                              )}
                            </div>
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
